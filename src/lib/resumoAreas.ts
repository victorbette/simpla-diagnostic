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
    const tipoDeclaracao  = fiscalSalvo.tipoDeclaracao ?? '';
    const tetoPGBL        = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;

    let pontos = 0;

    if (tipoDeclaracao === 'completa') {
      pontos += 20;
      if (tetoPGBL > 0) {
        if (aporteAnualPGBL > 0) {
          pontos += Math.round(Math.min(1, aporteAnualPGBL / tetoPGBL) * 80);
        }
        // aporteAnualPGBL === 0: sem pontos de aproveitamento
      } else {
        pontos += 40; // completa mas sem teto calculado (renda muito baixa)
      }
    } else if (tipoDeclaracao === 'simplificada') {
      pontos += 30;
    }
    // tipoDeclaracao vazio ou 'nao_sei': 0 pts

    return Math.min(100, Math.max(0, pontos));
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
      `A jornada rumo à liberdade financeira ainda precisa ser mapeada com mais detalhes. Para ter uma visão completa de onde você está e para onde pode chegar, precisamos consolidar os dados da sua situação atual.`
    );
    if (s <= 30) return (
      `O resultado desta análise exige atenção imediata. Com a trajetória atual, chegar à aposentadoria com o padrão de vida desejado vai exigir mudanças significativas na estratégia.\n\n` +
      `Cada mês que passa sem um plano estruturado representa uma diferença real no resultado final. O tempo é o ativo mais poderoso nos investimentos — e ele não para.`
    );
    if (s <= 50) return (
      `A projeção atual mostra que há um caminho sendo construído, mas ainda existe uma lacuna importante a ser preenchida para garantir a aposentadoria no padrão desejado.\n\n` +
      `A boa notícia é que ainda há tempo e margem para ajustar a rota. Pequenas mudanças consistentes ao longo dos próximos anos podem transformar completamente esse cenário.`
    );
    if (s <= 90) return (
      `Você está claramente no caminho certo. A disciplina e a consistência nos investimentos já produziram resultados concretos — e isso é motivo de reconhecimento.\n\n` +
      `O próximo passo é otimizar: garantir que a carteira está posicionada da forma mais eficiente possível, que os aportes seguem uma estratégia clara e que nenhum imprevisto coloque em risco o que foi construído.`
    );
    return (
      `Parabéns — você chegou a um nível de planejamento que a maioria das pessoas nunca alcança. A projeção indica que, mantendo a consistência atual, a aposentadoria no padrão desejado é uma realidade concreta.\n\n` +
      `O desafio agora muda de natureza: não se trata mais de acumular, mas de proteger, otimizar e garantir que o que foi construído se mantenha independente do que aconteça.`
    );
  })();

  // ── AA ────────────────────────────────────────────────────────────────────
  const aa = (() => {
    const s = scores.aa;
    const dc = plan.dadosCliente;
    const perfil = dc.suitabilityPerfil ?? '';

    const descricaoPerfil: Record<string, string> = {
      conservador:
        'seu perfil conservador indica preferência por segurança e previsibilidade — o que é totalmente válido, especialmente para a base da carteira',
      conservador_moderado:
        'seu perfil conservador moderado busca equilíbrio entre segurança e crescimento — uma postura madura e estratégica',
      moderado:
        'seu perfil moderado demonstra disposição para equilibrar proteção e crescimento — o que abre espaço para uma carteira mais diversificada',
      arrojado:
        'seu perfil arrojado indica disposição para assumir mais risco em busca de crescimento acelerado do patrimônio no longo prazo',
    };
    const dp = descricaoPerfil[perfil] ?? 'seu perfil de investidor já foi identificado';

    if (s < 0) return (
      `A composição da carteira ainda não foi avaliada em detalhes.${
        perfil ? ` Já sabemos que ${dp} — isso será` : ' Esse ponto será'
      } fundamental para estruturar a alocação adequada.\n\n` +
      `Para ter uma visão completa de como o patrimônio está posicionado e se está crescendo da forma mais eficiente possível, precisamos analisar cada classe de ativo com cuidado.`
    );

    if (s === 0) return (
      `Começar do zero é, na verdade, uma vantagem enorme — e poucos percebem isso. Você tem a oportunidade de construir uma carteira já estruturada desde o início, sem precisar desfazer alocações equivocadas do passado ou conviver com produtos inadequados que travam o crescimento do patrimônio.\n\n` +
      `Investir de forma consistente e estratégica desde cedo é o que separa quem constrói riqueza de quem sempre parece "quase chegando lá". Os juros compostos trabalham para quem começa bem — e o impacto de cada decisão acertada hoje se multiplica de forma surpreendente ao longo dos anos.`
    );

    if (s <= 50) return (
      `A análise da carteira revelou oportunidades importantes que merecem atenção.${
        perfil ? ` Considerando que ${dp},` : ''
      } a alocação atual pode estar limitando o crescimento do patrimônio de forma silenciosa — seja por excesso de concentração em uma única classe, por produtos com custo elevado ou por falta de diversificação adequada.\n\n` +
      `Uma carteira mal estruturada não gera perdas visíveis no dia a dia — mas ao longo de anos, o custo de oportunidade é enorme. É o patrimônio que poderia ter crescido mais, e não cresceu.`
    );

    if (s <= 90) return (
      `A carteira apresenta bons fundamentos${
        perfil ? ` e está alinhada com ${dp}` : ''
      }. Há claramente uma estratégia em curso — e isso é um diferencial importante.\n\n` +
      `O próximo nível é a otimização: garantir que os percentuais de cada classe estão corretos para o momento atual, que os produtos escolhidos são os mais eficientes disponíveis e que a carteira está preparada para diferentes cenários de mercado sem comprometer os objetivos de longo prazo.`
    );

    return (
      `A carteira demonstra uma qualidade e diversificação que coloca você em um patamar diferenciado${
        perfil ? `, alinhado com ${dp}` : ''
      }. A combinação de classes de ativos está bem estruturada e posicionada para o longo prazo.\n\n` +
      `Esse nível de organização é resultado de boas decisões consistentes — e é exatamente o que permite que o patrimônio trabalhe de forma mais eficiente, independente das oscilações do mercado.\n\n` +
      `O trabalho agora é de manutenção e refinamento: rebalanceamento periódico, acompanhamento dos ativos e ajustes pontuais conforme os objetivos evoluem.`
    );
  })();

  // ── PS ────────────────────────────────────────────────────────────────────
  const ps = (() => {
    const s = scores.ps;
    if (s < 0) return (
      `A análise de proteção ainda não foi realizada. Esse é um dos pilares mais importantes do planejamento financeiro — e frequentemente o mais negligenciado.`
    );
    if (s === 0) return (
      `Este é o ponto mais crítico do diagnóstico. Não há cobertura de proteção identificada — o que significa que, em caso de falecimento ou invalidez, a família ficaria exposta a uma crise financeira simultânea à dor emocional.\n\n` +
      `Nenhum plano financeiro está completo sem a certeza de que o patrimônio e os dependentes estão protegidos. Essa é uma decisão que precisa ser tomada com urgência.`
    );
    if (s <= 50) return (
      `A análise indica que existe alguma cobertura em vigor, mas ainda há lacunas significativas na proteção patrimonial. Em caso de imprevistos, a família poderia enfrentar dificuldades financeiras que o seguro atual não conseguiria cobrir completamente.\n\n` +
      `Proteção não é um luxo — é a fundação que sustenta tudo o que está sendo construído. Sem ela, anos de acumulação podem ser comprometidos em um único evento inesperado.`
    );
    if (s <= 90) return (
      `A proteção patrimonial está parcialmente estruturada — há consciência sobre a importância do tema e alguma cobertura em vigor. Isso já coloca você à frente da maioria das pessoas.\n\n` +
      `O próximo passo é garantir que a cobertura está adequada para a realidade atual: família, patrimônio e padrão de vida tendem a crescer, e a proteção precisa acompanhar esse crescimento.`
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
      `O Planejamento Tributário ainda não foi analisado.`
    );

    const fiscalSalvo = resultados.fiscal;
    const tipoDeclaracao  = fiscalSalvo?.tipoDeclaracao ?? '';
    const aporteAnualPGBL = Number(fiscalSalvo?.aporteAnual) || 0;

    // Declaração completa mas sem nenhum aporte em PGBL
    if (tipoDeclaracao === 'completa' && aporteAnualPGBL === 0) return (
      `Identificamos uma oportunidade fiscal significativa que ainda não está sendo aproveitada. Você declara pelo modelo completo, o que permite deduzir contribuições à previdência privada diretamente na base de cálculo do Imposto de Renda.\n\n` +
      `Não aproveitar esse benefício é, na prática, pagar mais imposto do que o necessário — e deixar de acumular patrimônio com o dinheiro que ficaria no fisco.\n\n` +
      `Existe uma oportunidade real de redução legal da carga tributária que precisa ser estruturada.`
    );

    // Declaração simplificada
    if (tipoDeclaracao === 'simplificada') return (
      `Você utiliza a declaração simplificada, que aplica um desconto padrão no cálculo do imposto. Nesse modelo, contribuições à previdência privada do tipo PGBL não geram benefício fiscal adicional.\n\n` +
      `Dependendo da evolução da sua renda e despesas dedutíveis, pode valer a pena avaliar periodicamente se o modelo de declaração mais vantajoso ainda é o mesmo.`
    );

    // Completa com PGBL mas aproveitamento parcial baixo (score ≤ 50)
    if (s <= 50) return (
      `Você está utilizando a declaração completa e já tem alguma contribuição em previdência privada — o que é positivo. No entanto, o potencial de redução fiscal disponível ainda não está sendo aproveitado em sua totalidade.\n\n` +
      `Cada real que poderia ser deduzido e não é representa um custo real: imposto pago desnecessariamente que poderia estar sendo reinvestido e acumulando patrimônio ao longo dos anos.`
    );

    // Bom aproveitamento (score ≤ 80)
    if (s <= 80) return (
      `O planejamento tributário está em um bom caminho — você utiliza a declaração completa e aproveita parte do benefício disponível com a previdência privada.\n\n` +
      `Ainda há espaço para otimização: aumentar a contribuição dentro do limite permitido pode reduzir ainda mais a carga tributária e acelerar a construção de patrimônio de forma estratégica.`
    );

    // Aproveitamento excelente (score > 80)
    return (
      `Excelente gestão tributária. Você está aproveitando de forma consistente o benefício fiscal disponível — o que significa pagar menos imposto de forma legal e direcionar mais recursos para a construção do seu patrimônio.\n\n` +
      `Essa estratégia, mantida ao longo dos anos, representa uma diferença significativa no resultado final acumulado.`
    );
  })();

  return { lf, aa, ps, fiscal };
}
