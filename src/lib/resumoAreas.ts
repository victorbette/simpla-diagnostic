/* Scores por área e frases-resumo do diagnóstico — lógica compartilhada entre
 * o FinancialPlanDashboard (tela) e o documento "Estratégia Pronta" (página
 * Ponto de Partida). Área sem análise recebe score -1 ("Não analisado") e é
 * excluída da média do score geral. */
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalAtualSeguro(seguroSalvo: NonNullable<ResultadosEstrategia["seguro"]>): number {
  const direto = Number(seguroSalvo.capitalAtual) || Number(seguroSalvo.totalCoverage) || 0;
  if (direto) return direto;
  const df = seguroSalvo.dadosFormulario;
  return df
    ? (Number(df.seguroVidaAtual) || 0) +
      (Number(df.seguroInvalidezAtual) || 0) +
      (Number(df.outrosSeguroAtual) || 0)
    : 0;
}

// Variáveis de Liberdade Financeira: APENAS coleta, perpetuidade IPCA+4%
function varsLF(plan: FinancialPlan) {
  const dc = plan.dadosCliente;
  const patrimonioAtual = Number(dc.patrimonioFinanceiroEstimado) || 0;
  const aporteMensal    = Number(dc.aportesMensalMedio) || 0;
  const rendaDesejada   = Number(dc.rendaDesejadaAposentadoria) || 0;
  const idadeMeta       = Number(dc.idadeMeta) || 60;
  const idadeAtual      = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  const TAXA_ANUAL  = 0.04;
  const TAXA_MENSAL = Math.pow(1 + TAXA_ANUAL, 1 / 12) - 1;

  const patrimonioNecessario = rendaDesejada > 0 ? (rendaDesejada * 12) / TAXA_ANUAL : 0;
  const nMeses = Math.max(0, Math.round((idadeMeta - idadeAtual) * 12));

  const projecao = (() => {
    if (nMeses === 0 || !isFinite(nMeses)) return patrimonioAtual;
    const f = Math.pow(1 + TAXA_MENSAL, nMeses);
    if (!isFinite(f)) return patrimonioAtual;
    return patrimonioAtual * f + aporteMensal * (f - 1) / TAXA_MENSAL;
  })();

  const temDados = patrimonioNecessario > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;
  return { patrimonioAtual, aporteMensal, rendaDesejada, idadeMeta, idadeAtual, patrimonioNecessario, projecao, temDados };
}

// ── Scores ────────────────────────────────────────────────────────────────────

export interface ScoresAreas {
  lf: number;
  aa: number;
  ps: number;
  fiscal: number;
  /** null quando nenhuma área foi analisada */
  geral: number | null;
}

export function calcularScoresAreas(plan: FinancialPlan, resultados: ResultadosEstrategia): ScoresAreas {
  const dc          = plan.dadosCliente;
  const seguroSalvo = resultados.seguro;
  const fiscalSalvo = resultados.fiscal;

  // ── Liberdade Financeira ──────────────────────────────────────────────────
  const vlf = varsLF(plan);
  const lf = !vlf.temDados
    ? -1
    : Math.min(100, Math.round((vlf.projecao / vlf.patrimonioNecessario) * 100));

  // ── Gestão de Ativos ──────────────────────────────────────────────────────
  const aa = (() => {
    const temRendaFixa = Number(plan.ativosAtuais?.rendaFixa) > 0;
    const temAcoes     = Number(plan.ativosAtuais?.acoes) > 0;
    const temFIIs      = Number(plan.ativosAtuais?.fiis) > 0;
    const temExterior  = Number(plan.ativosAtuais?.rvGlobal) > 0 || Number(plan.ativosAtuais?.rfGlobal) > 0;
    const temCripto    = Number(plan.ativosAtuais?.cripto) > 0;

    const aaTemDados = temRendaFixa || temAcoes || temFIIs || temExterior || temCripto;
    const comecandoDoZero = dc.comecandoDoZero === true;
    if (comecandoDoZero) return 0;
    if (!aaTemDados) return -1;

    const perfil = dc.suitabilityPerfil ?? '';

    let pontos = 0;
    if (temRendaFixa) pontos += 25;
    if (temAcoes)     pontos += 25;
    if (temFIIs)      pontos += 25;
    if (temExterior)  pontos += 20;

    // Conservador sem RV não é penalizado
    if (perfil === 'conservador' && !temAcoes && !temFIIs) {
      pontos = Math.min(pontos + 20, 70);
    }

    return Math.min(100, pontos);
  })();

  // ── Proteção ──────────────────────────────────────────────────────────────
  const ps = (() => {
    if (!seguroSalvo) return -1;
    if (!seguroSalvo.dataUltimoSalvamento) return -1;
    const capitalNecessario = Number(seguroSalvo.capitalNecessario) || Number(seguroSalvo.totalNeed) || 0;
    const capitalAtual = capitalAtualSeguro(seguroSalvo);
    if (capitalNecessario > 0) {
      return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
    }
    return capitalAtual > 0 ? 50 : (seguroSalvo.scoreProtecao ?? 0);
  })();

  // ── Tributário ────────────────────────────────────────────────────────────
  const fiscal = (() => {
    if (!fiscalSalvo || fiscalSalvo.analisado !== true) return -1;
    const tipoDeclaracao  = fiscalSalvo.tipoDeclaracao ?? 'nao_sei';
    const rendaAnual      = Number(fiscalSalvo.rendaAnual) || 0;
    const tetoPGBL        = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;
    const economia        = Number(fiscalSalvo.economiaAnual) || 0;
    const temDados        = rendaAnual > 0;

    let pontos = 0;

    // 1. Tipo de declaração definido (30 pts completa / 20 pts simplificada)
    if (tipoDeclaracao === 'completa')          pontos += 30;
    else if (tipoDeclaracao === 'simplificada') pontos += 20;

    // 2. Aproveitamento PGBL (50 pts) ou bônus neutro simplificada (20 pts só com dados)
    if (tipoDeclaracao === 'completa') {
      if (aporteAnualPGBL > 0) {
        const aproveitamento = tetoPGBL > 0 ? Math.min(1, aporteAnualPGBL / tetoPGBL) : 0;
        pontos += Math.round(aproveitamento * 50);
      }
    } else if (tipoDeclaracao === 'simplificada' && temDados) {
      pontos += 20;
    }

    // 3. Diferimento gerado (30 pts) ou bônus neutro simplificada (15 pts só com dados)
    if (economia > 0 && tetoPGBL > 0) {
      const economiaPct = Math.min(1, economia / (tetoPGBL * 0.275));
      pontos += Math.round(economiaPct * 30);
    } else if (tipoDeclaracao === 'simplificada' && temDados) {
      pontos += 15;
    }

    return Math.min(100, pontos);
  })();

  // ── Score Geral ───────────────────────────────────────────────────────────
  const scoresAtivos = [lf, aa, ps, fiscal].filter((s) => s >= 0);
  const geral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  return { lf, aa, ps, fiscal, geral };
}

// ── Textos analíticos por área ────────────────────────────────────────────────

export interface TextosAreas {
  lf: string;
  aa: string;
  ps: string;
  fiscal: string;
}

export function gerarTextosAreas(
  plan: FinancialPlan,
  resultados: ResultadosEstrategia,
  _clientName?: string,
): TextosAreas {
  const scores = calcularScoresAreas(plan, resultados);

  // ── LF ────────────────────────────────────────────────────────────────────
  const lf = (() => {
    const s = scores.lf;
    if (s < 0) return (
      `A jornada rumo à liberdade financeira ainda precisa ser mapeada com mais detalhes. Para ter uma visão completa de onde você está e para onde pode chegar, precisamos consolidar os dados da sua situação atual.\n\n` +
      `Na aba de Liberdade Financeira, vamos juntos simular diferentes cenários, definir metas claras e traçar o caminho mais eficiente para a aposentadoria que você deseja — com clareza sobre o que precisa acontecer a partir de agora.`
    );
    if (s <= 30) return (
      `O resultado desta análise exige atenção imediata. Com a trajetória atual, chegar à aposentadoria com o padrão de vida desejado vai exigir mudanças significativas na estratégia.\n\n` +
      `Cada mês que passa sem um plano estruturado representa uma diferença real no resultado final. O tempo é o ativo mais poderoso nos investimentos — e ele não para.\n\n` +
      `No Financial Planning, vamos estruturar um plano concreto para reverter esse cenário: ajustes nos aportes, otimização da carteira e metas claras para cada etapa da jornada.`
    );
    if (s <= 50) return (
      `A projeção atual mostra que há um caminho sendo construído, mas ainda existe uma lacuna importante a ser preenchida para garantir a aposentadoria no padrão desejado.\n\n` +
      `A boa notícia é que ainda há tempo e margem para ajustar a rota. Pequenas mudanças consistentes ao longo dos próximos anos podem transformar completamente esse cenário.\n\n` +
      `O Financial Planning vai mapear exatamente quais alavancas precisam ser acionadas — seja no valor investido, na rentabilidade da carteira ou no prazo — para que a meta se torne alcançável dentro do tempo planejado.`
    );
    if (s <= 90) return (
      `Você está claramente no caminho certo. A disciplina e a consistência nos investimentos já produziram resultados concretos — e isso é motivo de reconhecimento.\n\n` +
      `O próximo passo é otimizar: garantir que a carteira está posicionada da forma mais eficiente possível, que os aportes seguem uma estratégia clara e que nenhum imprevisto coloque em risco o que foi construído.\n\n` +
      `No Financial Planning, vamos refinar essa estratégia para que a chegada aconteça exatamente no tempo e no padrão planejado.`
    );
    return (
      `Parabéns — você chegou a um nível de planejamento que a maioria das pessoas nunca alcança. A projeção indica que, mantendo a consistência atual, a aposentadoria no padrão desejado é uma realidade concreta.\n\n` +
      `O desafio agora muda de natureza: não se trata mais de acumular, mas de proteger, otimizar e garantir que o que foi construído se mantenha independente do que aconteça.\n\n` +
      `O Financial Planning vai estruturar essa próxima fase com foco em preservação, eficiência fiscal e proteção do patrimônio.`
    );
  })();

  // ── AA ────────────────────────────────────────────────────────────────────
  const aa = (() => {
    const s = scores.aa;
    if (s < 0) return (
      `A composição da carteira ainda não foi avaliada em detalhes. Para ter uma visão completa de como o patrimônio está alocado e se está bem posicionado para crescer, precisamos analisar cada classe de ativo.\n\n` +
      `Na aba de Gestão de Ativos, vamos estruturar uma alocação personalizada para o seu perfil — com foco em eficiência, diversificação e alinhamento com os seus objetivos de longo prazo.`
    );
    if (s === 0) return (
      `Identificamos que os investimentos ainda estão no início da jornada. Esse é um ponto de partida valioso: começar com a estratégia certa desde o início é o que faz toda a diferença no resultado de longo prazo.\n\n` +
      `Na aba de Gestão de Ativos, vamos montar uma carteira estruturada do zero — com diversificação adequada ao seu perfil e os melhores produtos disponíveis para cada objetivo.`
    );
    if (s <= 50) return (
      `A análise da carteira revelou pontos importantes que precisam ser endereçados. Produtos inadequados, falta de diversificação ou concentração excessiva em uma única classe de ativo podem estar limitando o crescimento do patrimônio de forma silenciosa.\n\n` +
      `Uma revisão estratégica da carteira pode representar uma diferença significativa no resultado ao longo dos anos — sem precisar assumir mais risco, apenas alocando melhor o que já existe.\n\n` +
      `No Financial Planning, vamos reestruturar a alocação de forma personalizada, com cada ativo cumprindo um papel específico na estratégia.`
    );
    if (s <= 90) return (
      `A carteira apresenta bons fundamentos e demonstra que você já entende a importância da diversificação. Há claramente uma estratégia em curso — e isso é um diferencial importante.\n\n` +
      `O próximo nível é a otimização: garantir que os percentuais de cada classe estão corretos para o momento atual, que os produtos escolhidos são os mais eficientes e que a carteira está preparada para diferentes cenários de mercado.`
    );
    return (
      `A carteira demonstra uma diversificação e qualidade de ativos que coloca você em um patamar diferenciado. A combinação de classes de ativos está bem estruturada e alinhada com uma estratégia de longo prazo.\n\n` +
      `O trabalho agora é de manutenção e refinamento: rebalanceamento periódico, acompanhamento dos ativos e ajustes pontuais conforme o cenário econômico evolui.`
    );
  })();

  // ── PS ────────────────────────────────────────────────────────────────────
  const ps = (() => {
    const s = scores.ps;
    if (s < 0) return (
      `A análise de proteção ainda não foi realizada. Esse é um dos pilares mais importantes do planejamento financeiro — e frequentemente o mais negligenciado.\n\n` +
      `Na aba de Proteção e Sucessório, vamos mapear as necessidades reais de cobertura para garantir que, independente do que aconteça, a família continuará protegida e o patrimônio preservado.`
    );
    if (s === 0) return (
      `Este é o ponto mais crítico do diagnóstico. Não há cobertura de proteção identificada — o que significa que, em caso de falecimento ou invalidez, a família ficaria exposta a uma crise financeira simultânea à dor emocional.\n\n` +
      `Nenhum plano financeiro está completo sem a certeza de que o patrimônio e os dependentes estão protegidos. Essa é uma decisão que precisa ser tomada com urgência.\n\n` +
      `No Financial Planning, vamos calcular a cobertura ideal para cada situação e estruturar o plano de proteção adequado para a sua realidade.`
    );
    if (s <= 50) return (
      `A análise indica que existe alguma cobertura em vigor, mas ainda há lacunas significativas na proteção patrimonial. Em caso de imprevistos, a família poderia enfrentar dificuldades financeiras que o seguro atual não conseguiria cobrir completamente.\n\n` +
      `Proteção não é um luxo — é a fundação que sustenta tudo o que está sendo construído. Sem ela, anos de acumulação podem ser comprometidos em um único evento inesperado.\n\n` +
      `No Financial Planning, vamos mapear as necessidades reais e estruturar uma cobertura que proteja de forma completa.`
    );
    if (s <= 90) return (
      `A proteção patrimonial está parcialmente estruturada — há consciência sobre a importância do tema e alguma cobertura em vigor. Isso já coloca você à frente da maioria das pessoas.\n\n` +
      `O próximo passo é garantir que a cobertura está adequada para a realidade atual: família, patrimônio e padrão de vida tendem a crescer, e a proteção precisa acompanhar esse crescimento.\n\n` +
      `No Financial Planning, vamos revisar e ajustar a estratégia de proteção.`
    );
    return (
      `A proteção patrimonial está bem estruturada — você tem a tranquilidade de saber que, independente do que aconteça, a família estará financeiramente protegida.\n\n` +
      `O trabalho agora é de revisão periódica: garantir que a cobertura acompanha as mudanças na situação familiar e patrimonial ao longo dos anos.`
    );
  })();

  // ── Fiscal ────────────────────────────────────────────────────────────────
  const fiscal = (() => {
    const s = scores.fiscal;
    if (s < 0) return (
      `O Planejamento Tributário ainda não foi analisado. Acesse a aba de Planejamento Tributário para registrar as informações e obter a análise completa desta área.`
    );
    if (s <= 50) return (
      `A análise tributária revelou oportunidades importantes que ainda não estão sendo aproveitadas. Isso significa que parte do que poderia estar sendo reinvestido e acumulando patrimônio está sendo destinado ao fisco desnecessariamente.\n\n` +
      `Uma estratégia fiscal bem estruturada não é apenas para grandes fortunas — é uma ferramenta acessível que pode acelerar significativamente a construção de patrimônio para qualquer investidor.\n\n` +
      `No Financial Planning, vamos identificar e implementar as estratégias mais adequadas para a sua situação.`
    );
    if (s <= 90) return (
      `Há boas práticas fiscais em curso, o que demonstra consciência sobre a importância do planejamento tributário. Ainda assim, existem oportunidades que podem ser melhor aproveitadas para aumentar a eficiência fiscal e liberar mais recursos para investimento.\n\n` +
      `No Financial Planning, vamos refinar a estratégia e garantir que cada oportunidade disponível esteja sendo utilizada de forma otimizada.`
    );
    return (
      `O planejamento tributário está bem estruturado e eficiente. As estratégias em uso demonstram uma gestão fiscal cuidadosa — o que significa que mais recursos estão disponíveis para investimento e construção de patrimônio.\n\n` +
      `O trabalho agora é de manutenção e atualização: a legislação fiscal muda, e a estratégia precisa acompanhar essas mudanças para manter a eficiência atual.`
    );
  })();

  return { lf, aa, ps, fiscal };
}
