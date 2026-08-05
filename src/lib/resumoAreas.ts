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

    const tipoDeclaracao = fiscalSalvo.tipoDeclaracao ?? '';

    // Não sabe / não definido → não penaliza, não avalia
    if (!tipoDeclaracao || tipoDeclaracao === 'nao_sei') return -1;

    // Simplificada → máximo (está fazendo o correto para a situação)
    if (tipoDeclaracao === 'simplificada') return 100;

    if (tipoDeclaracao === 'completa') {
      const rendaAnualBruta = Number(fiscalSalvo.rendaAnual) || 0;
      const tetoPGBL = rendaAnualBruta * 0.12;

      if (tetoPGBL <= 0) return 10;

      const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;
      const aproveitamento = Math.min(1, aporteAnualPGBL / tetoPGBL);

      return Math.round(aproveitamento * 100);
    }

    return -1;
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

  // Dados contextuais para personalização dos textos
  const dc = plan.dadosCliente;
  const objetivos = resultados.if?.objetivos ?? [];
  const temObjetivos = objetivos.length > 0;
  const nomeObjetivos = objetivos.map(o => o.label).filter(Boolean);
  const temFilhos = (dc.filhos?.length ?? 0) > 0;
  const temConjuge = ['casado', 'uniao_estavel'].includes(dc.estadoCivil ?? '');

  // ── LF ────────────────────────────────────────────────────────────────────
  const lf = (() => {
    const s = scores.lf;
    if (s < 0) return (
      `A análise da Liberdade Financeira ainda não pôde ser concluída — faltam informações essenciais para projetar o futuro com precisão. Sem esses dados, é impossível saber se você está no caminho certo ou acumulando um déficit silencioso que só vai aparecer quando for mais difícil corrigir.`
    );
    if (s <= 30) {
      let texto =
        `O resultado é claro: com o ritmo atual, a aposentadoria que você imagina não vai acontecer como planejado. Isso não é pessimismo — é a realidade que os números mostram. E a diferença entre agir agora ou daqui a dois anos pode significar anos a mais de trabalho obrigatório.\n\n` +
        `O tempo é o único recurso que não pode ser recuperado. Cada mês sem uma estratégia é um mês em que os juros compostos não estão trabalhando do seu lado — e em que a lacuna entre onde você está e onde precisa chegar aumenta de forma silenciosa e constante.`;
      if (temObjetivos) {
        texto += `\n\n` + (nomeObjetivos.length === 1
          ? `Você definiu um objetivo importante — ${nomeObjetivos[0]}. Com a trajetória atual, esse sonho corre risco real de não ser realizado.`
          : `Você definiu objetivos importantes — ${nomeObjetivos.join(', ')}. Com a trajetória atual, esses planos correm risco real de não se concretizarem.`
        );
      }
      if (temFilhos) {
        texto += `\n\nSeus filhos contam com você para construir a base do futuro deles. Cada decisão adiada hoje tem um custo que eles também vão sentir.`;
      }
      texto += `\n\nAgir agora não é opcional. É a única forma de ainda ter tempo suficiente para mudar o resultado.`;
      return texto;
    }
    if (s <= 50) {
      let texto =
        `Você está construindo — e isso já é mais do que a maioria das pessoas faz. Mas o ritmo atual não é suficiente para chegar onde você quer. Existe uma lacuna real entre a aposentadoria que você projeta e a que você deseja — e essa diferença só cresce com o tempo se nada mudar.\n\n` +
        `A boa notícia é que ainda há tempo. Ajustes feitos hoje têm um impacto desproporcional no resultado final — porque os juros compostos amplificam cada decisão certa ao longo dos anos. O mesmo ajuste feito daqui a cinco anos custará muito mais para atingir o mesmo resultado.`;
      if (temObjetivos) {
        texto += `\n\n` + (nomeObjetivos.length === 1
          ? `Você tem um objetivo claro em mente — ${nomeObjetivos[0]}. Sem corrigir a rota agora, esse objetivo pode ficar apenas no papel.`
          : `Você tem objetivos claros em mente — ${nomeObjetivos.join(', ')}. Sem corrigir a rota agora, esses planos podem ficar apenas no papel.`
        );
      }
      if (temConjuge) {
        texto += `\n\nEssa jornada impacta não só você — impacta o futuro que você e seu cônjuge estão construindo juntos. Cada decisão adiada é uma decisão que ambos vão sentir no futuro.`;
      }
      texto += `\n\nO momento de ajustar a rota é agora — enquanto o tempo ainda está trabalhando a seu favor.`;
      return texto;
    }
    if (s <= 90) {
      let texto =
        `Você está no caminho certo — e isso é resultado de disciplina e boas decisões ao longo do tempo. Mas estar no caminho certo não significa que não há mais nada a fazer. Significa que a base está sólida e que agora é hora de otimizar cada detalhe para garantir que a chegada aconteça exatamente como planejado.\n\n` +
        `Uma pequena melhoria na eficiência da carteira, no valor dos aportes ou na estratégia de alocação pode representar anos a mais de liberdade — ou a mesma liberdade chegando muito mais cedo.`;
      if (temObjetivos) {
        texto += `\n\nVocê definiu objetivos que fazem parte do futuro que está construindo — ${nomeObjetivos.join(', ')}. Garantir que a projeção está bem calibrada é o que separa um plano que parece bom de um plano que realmente entrega o que promete.`;
      }
      texto += `\n\nA otimização não é um luxo — é o que transforma uma boa trajetória em um resultado excelente.`;
      return texto;
    }
    // s > 90
    let texto =
      `Você chegou a um nível de planejamento que a maioria das pessoas nunca alcança. A projeção indica que, mantendo a consistência atual, a aposentadoria no padrão que você deseja é uma realidade concreta — não uma esperança.\n\n` +
      `Mas chegar lá é uma coisa. Chegar com segurança, protegido de imprevistos, com o patrimônio estruturado para durar e crescer, é outra. O risco muda de natureza nessa fase — e a estratégia precisa evoluir junto com ele.`;
    if (temObjetivos) {
      texto += `\n\nOs objetivos que você planejou — ${nomeObjetivos.join(', ')} — merecem a mesma precisão e cuidado que chegaram até aqui. Preservar o que foi construído é tão importante quanto construir.`;
    }
    texto += `\n\nO próximo passo é proteger, preservar e continuar crescendo com eficiência.`;
    return texto;
  })();

  // ── AA ────────────────────────────────────────────────────────────────────
  const aa = (() => {
    const s = scores.aa;

    if (s < 0) return (
      `A composição da sua carteira ainda não foi avaliada. Sem saber como o patrimônio está alocado, é impossível dizer se ele está crescendo no ritmo que deveria — ou sendo corroído por taxas, produtos inadequados e falta de diversificação.`
    );

    if (s === 0) return (
      `Você tem a oportunidade que poucos percebem: começar do zero com a estratégia certa desde o primeiro dia. Quem começa bem não precisa depois desfazer anos de decisões erradas.\n\n` +
      `Os juros compostos são mais poderosos quanto mais cedo começam — e cada mês de atraso tem um custo real que não aparece em nenhum extrato, mas se acumula de forma surpreendente.`
    );

    if (s <= 50) {
      let texto =
        `A análise da carteira revelou pontos que precisam de atenção. Produtos inadequados, falta de diversificação ou taxas que corroem o rendimento podem estar consumindo parte do seu patrimônio de forma completamente silenciosa — sem que você perceba no dia a dia, mas com impacto enorme no longo prazo.\n\n` +
        `Uma carteira mal estruturada não gera perdas visíveis imediatas. Ela simplesmente cresce menos do que poderia — e essa diferença, ao longo de anos, pode significar menos patrimônio, menos renda e menos liberdade na hora em que você mais vai precisar.`;
      if (temObjetivos) {
        texto += `\n\nVocê tem planos concretos — ${nomeObjetivos.join(', ')}. Esses objetivos dependem de um patrimônio que cresce com eficiência. Uma carteira desorganizada compromete não só o futuro, mas os sonhos que você quer realizar ao longo do caminho.`;
      }
      texto += `\n\nReorganizar a alocação agora — antes que o tempo faça essa diferença crescer ainda mais — é uma das decisões mais impactantes que você pode tomar.`;
      return texto;
    }

    if (s <= 90) {
      let texto =
        `Sua carteira tem bons fundamentos — você tomou decisões que estão produzindo resultados. Mas existe uma diferença real entre uma carteira que funciona e uma carteira verdadeiramente otimizada para os seus objetivos específicos.\n\n` +
        `Pequenos ajustes de alocação, rebalanceamento e troca de produtos inadequados por alternativas mais eficientes podem representar uma diferença significativa no resultado final — sem precisar assumir mais risco, apenas alocando melhor o que já existe.`;
      if (temObjetivos) {
        texto += `\n\nCom objetivos definidos — ${nomeObjetivos.join(', ')} — cada ponto percentual a mais de retorno importa. A diferença entre uma carteira boa e uma carteira excelente pode ser exatamente o que torna esses planos viáveis ou não.`;
      }
      return texto;
    }

    // s > 90
    let texto =
      `Sua carteira está bem estruturada e diversificada — isso coloca você em um patamar que a maioria dos investidores nunca alcança. O resultado é fruto de boas decisões consistentes ao longo do tempo.\n\n` +
      `Manter esse nível exige atenção contínua: rebalanceamento periódico, atualização conforme o cenário econômico evolui e garantia de que cada ativo continua cumprindo seu papel.`;
    if (temObjetivos) {
      texto += `\n\nOs objetivos que você planeja — ${nomeObjetivos.join(', ')} — merecem uma carteira que continue performando com a mesma qualidade. Consistência não é acidente — é resultado de gestão ativa e contínua.`;
    }
    return texto;
  })();

  // ── PS ────────────────────────────────────────────────────────────────────
  const ps = (() => {
    const s = scores.ps;
    if (s < 0) return (
      `A proteção patrimonial ainda não foi analisada. Esse é o pilar mais negligenciado do planejamento financeiro — e o que pode causar mais dano em menos tempo. Um único evento inesperado, sem a proteção adequada, pode comprometer anos de construção de patrimônio.`
    );
    if (s === 0) {
      let texto =
        `Esse é o ponto mais crítico do diagnóstico. Sem proteção de vida ou invalidez, um único evento inesperado pode transformar anos de esforço em uma crise financeira devastadora — no pior momento possível, para as pessoas que você mais ama.\n\n` +
        `Nenhum plano financeiro está completo sem a certeza de que o que foi construído está protegido. A ausência de cobertura não é um risco futuro e hipotético — é uma exposição presente, que existe todos os dias, sem você perceber.`;
      if (temFilhos) {
        texto += `\n\nSeus filhos dependem de você agora. Se algo acontecer sem que haja proteção adequada, não é só o patrimônio que está em risco — é o futuro deles. A educação, os planos, a segurança que você construiu para eles.`;
      }
      if (temConjuge) {
        texto += `\n\nSeu cônjuge também está exposto. Em caso de invalidez ou falecimento sem cobertura adequada, a crise financeira chegaria junto com a dor emocional — um peso que ninguém deveria carregar nesse momento.`;
      }
      texto += `\n\nEstruturar a proteção não é pessimismo — é o ato mais responsável que um planejador financeiro pode recomendar.`;
      return texto;
    }
    if (s <= 50) {
      let texto =
        `Existe alguma proteção em vigor — mas não é suficiente. Em caso de imprevistos, a cobertura atual não seria capaz de manter o padrão de vida da família pelo tempo necessário. Essa lacuna não aparece no extrato, mas pode ser a diferença entre a família atravessar um momento difícil com estabilidade ou enfrentar uma crise financeira simultânea à crise emocional.`;
      if (temFilhos) {
        texto += `\n\nSeus filhos têm planos que dependem de você. Se a proteção não for suficiente para cobrir o período necessário, são eles que vão sentir as consequências de decisões que você ainda pode tomar hoje.`;
      }
      texto += `\n\nProteger o que você construiu é tão importante quanto construir. Fechar essa lacuna agora custa muito menos do que arcar com as consequências de não ter feito.`;
      return texto;
    }
    if (s <= 90) return (
      `A proteção está parcialmente estruturada — você tem consciência da importância do tema e já tomou alguns passos nessa direção. Mas parcialmente protegido significa que ainda há exposição real a riscos que poderiam ser evitados.`
    );
    // s > 90
    let texto =
      `Sua proteção patrimonial está bem estruturada — você tem a tranquilidade de saber que, independente do que aconteça, a família estará financeiramente protegida.`;
    if (temFilhos || temConjuge) {
      const quem = temFilhos && temConjuge
        ? 'Seus filhos e cônjuge têm a segurança'
        : temFilhos
          ? 'Seus filhos têm a segurança'
          : 'Seu cônjuge tem a segurança';
      texto += `\n\n${quem} de que, mesmo diante de imprevistos, a vida que você construiu para eles continuará protegida. Isso tem um valor que vai muito além dos números.`;
    }
    texto += `\n\nRevisões periódicas garantem que a cobertura continue adequada à medida que o patrimônio e a família crescem.`;
    return texto;
  })();

  // ── Fiscal ────────────────────────────────────────────────────────────────
  const fiscal = (() => {
    const s = scores.fiscal;
    if (s < 0) {
      let texto =
        `O planejamento tributário ainda não foi avaliado. Pagar menos imposto de forma legal e estratégica é uma das alavancas mais subestimadas na construção de patrimônio — e ignorá-la é, na prática, escolher pagar mais do que o necessário todos os anos, de forma permanente.`;
      if (temObjetivos) {
        const objRef = nomeObjetivos[0] ?? 'os que você definiu';
        texto += `\n\nCom objetivos como ${objRef}, cada real que deixa de ir para o fisco é um real que pode ser reinvestido e acumulado. Pequenas diferenças na carga tributária têm impacto desproporcional no longo prazo.`;
      }
      return texto;
    }

    const fiscalSalvo = resultados.fiscal;
    const tipoDeclaracao = fiscalSalvo?.tipoDeclaracao ?? '';

    if (tipoDeclaracao === 'simplificada') return (
      `Você está no modelo correto para o seu perfil. A declaração simplificada é a escolha mais vantajosa quando o desconto padrão supera as deduções individuais — e é exatamente o seu caso. Você está pagando o mínimo legal possível.\n\n` +
      `À medida que a renda cresce, vale revisar periodicamente se esse modelo ainda é o mais vantajoso — porque o que é correto hoje pode mudar com o tempo.`
    );

    // Completa — baseado no score de aproveitamento do PGBL
    if (s <= 20) {
      let texto =
        `Você está no modelo de declaração que permite as maiores deduções legais — mas o principal benefício disponível ainda não está sendo aproveitado. Cada ano sem essa otimização é um ano pagando mais imposto do que o necessário.\n\n` +
        `O dinheiro que poderia estar sendo deduzido e reinvestido está indo para o fisco de forma desnecessária — todos os anos, de forma permanente, com impacto real no patrimônio acumulado ao longo do tempo.`;
      if (temObjetivos) {
        const objRef = nomeObjetivos[0] ?? 'os que você definiu';
        texto += `\n\nCom objetivos concretos como ${objRef}, cada real otimizado tributariamente é um real a mais no caminho para realizá-los. A eficiência fiscal não é um detalhe — é uma alavanca.`;
      }
      return texto;
    }

    if (s < 100) {
      let texto =
        `Você já está aproveitando parte do benefício fiscal disponível — o que é um passo importante. Mas ainda há espaço para reduzir ainda mais a carga tributária dentro do que a lei permite.\n\n` +
        `Cada real a mais de dedução é um real a menos de imposto — que permanece investido e acumulando patrimônio em vez de ir para o fisco. Ao longo de anos, essa diferença é significativa.`;
      if (temObjetivos) {
        const objRef = nomeObjetivos[0] ?? 'os que você definiu';
        texto += `\n\nCom planos como ${objRef}, maximizar a eficiência fiscal é uma das formas mais diretas de acelerar o caminho.`;
      }
      return texto;
    }

    // s === 100
    return (
      `Você está no nível máximo de eficiência tributária — aproveitando integralmente o benefício legal disponível e pagando o mínimo de imposto possível para o seu perfil.\n\n` +
      `Isso representa um impacto real no patrimônio acumulado ao longo do tempo: cada real que não vai ao fisco é um real que continua investido e crescendo.\n\n` +
      `Manter essa eficiência requer atenção anual — renda, aportes e legislação mudam, e a estratégia precisa acompanhar.`
    );
  })();

  return { lf, aa, ps, fiscal };
}
