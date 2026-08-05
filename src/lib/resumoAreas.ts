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

  // ── LF ────────────────────────────────────────────────────────────────────
  const lf = (() => {
    const s = scores.lf;
    if (s < 0) return (
      `A análise da Liberdade Financeira ainda não pôde ser concluída — faltam informações essenciais para projetar o futuro com precisão. Sem esses dados, é impossível saber se você está no caminho certo ou acumulando um déficit silencioso que só vai aparecer quando for mais difícil corrigir.\n\n` +
      `O primeiro passo é mapear onde você está hoje. O Financial Planning foi criado exatamente para isso.`
    );
    if (s <= 30) return (
      `O resultado é claro: com o ritmo atual, a aposentadoria que você imagina não vai acontecer como planejado. Isso não é pessimismo — é a realidade que os números mostram. E a diferença entre agir agora ou daqui a dois anos pode significar anos a mais de trabalho obrigatório.\n\n` +
      `O tempo é o único recurso que não pode ser recuperado. Cada mês sem uma estratégia é um mês que os juros compostos não estão trabalhando do seu lado — e que a lacuna entre onde você está e onde precisa chegar aumenta silenciosamente.\n\n` +
      `O Financial Planning vai traçar o caminho exato para reverter esse cenário. O momento de agir é agora.`
    );
    if (s <= 50) return (
      `Você está construindo, mas o ritmo atual não é suficiente para chegar onde você quer. Existe uma lacuna real entre a aposentadoria que você projeta e a que deseja — e essa diferença só cresce com o tempo se nada mudar.\n\n` +
      `A boa notícia é que ainda há tempo. Ajustes feitos hoje têm um impacto desproporcional no resultado final — porque os juros compostos amplificam cada decisão certa ao longo dos anos. O mesmo ajuste feito daqui a cinco anos custará muito mais para atingir o mesmo resultado.\n\n` +
      `O Financial Planning vai identificar exatamente onde atuar para fechar essa lacuna no menor tempo possível.`
    );
    if (s <= 90) return (
      `Você está no caminho certo — e isso é resultado de disciplina e boas decisões ao longo do tempo. Mas estar no caminho certo não significa que não há mais nada a fazer. Significa que a base está sólida e que agora é hora de otimizar cada detalhe.\n\n` +
      `Uma pequena melhoria na eficiência da carteira, no valor dos aportes ou na estratégia de alocação pode representar anos a mais de liberdade no futuro — ou a mesma liberdade chegando mais cedo.\n\n` +
      `O Financial Planning vai refinar essa estratégia para que você chegue exatamente onde planejou, no tempo que planejou.`
    );
    return (
      `Você chegou a um ponto que poucas pessoas alcançam: a projeção indica que, mantendo a consistência atual, a aposentadoria no padrão que você deseja é uma realidade concreta.\n\n` +
      `Mas chegar lá é uma coisa. Chegar com segurança, protegido de imprevistos e com o patrimônio estruturado para durar é outra. O risco muda de natureza — e a estratégia precisa evoluir junto com ele.\n\n` +
      `O Financial Planning vai garantir que o que você construiu permaneça intacto e continue crescendo da forma mais eficiente possível.`
    );
  })();

  // ── AA ────────────────────────────────────────────────────────────────────
  const aa = (() => {
    const s = scores.aa;

    if (s < 0) return (
      `A composição da sua carteira ainda não foi avaliada. Sem saber como o patrimônio está alocado, é impossível dizer se ele está crescendo no ritmo que deveria — ou sendo corroído por taxas, produtos inadequados e falta de diversificação.\n\n` +
      `O Financial Planning começa exatamente por aqui.`
    );

    if (s === 0) return (
      `Você tem a oportunidade que poucos percebem: começar do zero com a estratégia certa desde o primeiro dia. Quem começa bem não precisa depois desfazer anos de decisões erradas.\n\n` +
      `Os juros compostos são mais poderosos quanto mais cedo começam — e cada mês de atraso tem um custo real que não aparece em nenhum extrato, mas se acumula de forma surpreendente.\n\n` +
      `O Financial Planning vai estruturar sua carteira do zero, com cada real trabalhando da forma mais eficiente possível desde o início.`
    );

    if (s <= 50) return (
      `A análise da carteira revelou pontos que precisam de atenção. Produtos inadequados, falta de diversificação ou taxas elevadas podem estar consumindo parte do seu patrimônio de forma silenciosa — sem que você perceba no dia a dia, mas com impacto enorme no longo prazo.\n\n` +
      `Uma carteira mal estruturada não gera perdas visíveis imediatas. Ela simplesmente cresce menos do que poderia — e essa diferença, ao longo de anos, pode significar menos patrimônio, menos renda e menos liberdade.\n\n` +
      `O Financial Planning vai reestruturar sua alocação de forma estratégica, eliminando o que não funciona e potencializando o que já está certo.`
    );

    if (s <= 90) return (
      `Sua carteira tem bons fundamentos — você tomou decisões acertadas que estão produzindo resultados. Mas existe uma diferença entre uma carteira que funciona e uma carteira verdadeiramente otimizada para os seus objetivos.\n\n` +
      `Pequenos ajustes de alocação, troca de produtos e rebalanceamento estratégico podem representar uma diferença significativa no resultado final sem precisar assumir mais risco.\n\n` +
      `O Financial Planning vai fazer essa calibragem com precisão.`
    );

    return (
      `Sua carteira está bem estruturada e diversificada — isso coloca você em um patamar que a maioria dos investidores nunca alcança. O resultado é fruto de boas decisões consistentes.\n\n` +
      `Manter esse nível exige atenção contínua: rebalanceamento periódico, atualização da estratégia conforme o mercado evolui e garantia de que cada ativo continua cumprindo seu papel.\n\n` +
      `O Financial Planning vai cuidar dessa manutenção com a precisão que o seu patrimônio merece.`
    );
  })();

  // ── PS ────────────────────────────────────────────────────────────────────
  const ps = (() => {
    const s = scores.ps;
    if (s < 0) return (
      `A proteção patrimonial ainda não foi analisada. Esse é o pilar mais negligenciado do planejamento financeiro — e o que pode causar mais dano em menos tempo. Um único evento inesperado, sem a proteção adequada, pode comprometer anos de construção de patrimônio.\n\n` +
      `O Financial Planning vai mapear essa lacuna com a atenção que ela merece.`
    );
    if (s === 0) return (
      `Esse é o ponto mais crítico do diagnóstico. Sem proteção de vida ou invalidez, um único evento inesperado pode transformar anos de esforço em uma crise financeira devastadora para a família — no pior momento possível.\n\n` +
      `Nenhum plano financeiro está completo sem a certeza de que o que foi construído está protegido. A ausência de cobertura não é um risco futuro — é uma exposição presente, que existe todos os dias.\n\n` +
      `O Financial Planning vai calcular a cobertura exata necessária e estruturar um plano de proteção adequado para a sua realidade.`
    );
    if (s <= 50) return (
      `Existe alguma proteção em vigor, mas a análise mostra que ela não seria suficiente para cobrir as reais necessidades da família em caso de imprevistos. Essa lacuna não aparece no extrato, mas pode ser a diferença entre a família manter o padrão de vida ou enfrentar uma crise financeira no momento mais difícil.\n\n` +
      `O Financial Planning vai identificar exatamente o que está faltando e propor os ajustes necessários para uma proteção verdadeiramente adequada.`
    );
    if (s <= 90) return (
      `A proteção está parcialmente estruturada — você tem consciência da importância do tema e já tomou alguns passos nessa direção. Mas parcialmente protegido significa que ainda há exposição real a riscos que poderiam ser evitados.\n\n` +
      `O Financial Planning vai garantir que a cobertura reflita a sua realidade atual: família, patrimônio e padrão de vida — e que nenhuma lacuna importante permaneça em aberto.`
    );
    return (
      `Sua proteção patrimonial está bem estruturada — você tem a tranquilidade de saber que, independente do que aconteça, a família estará financeiramente protegida.\n\n` +
      `O trabalho agora é de revisão periódica: à medida que o patrimônio cresce e a família evolui, as coberturas precisam acompanhar esse crescimento. O Financial Planning vai garantir que essa atualização aconteça no momento certo.`
    );
  })();

  // ── Fiscal ────────────────────────────────────────────────────────────────
  const fiscal = (() => {
    const s = scores.fiscal;
    if (s < 0) return (
      `O planejamento tributário ainda não foi avaliado. Pagar menos imposto de forma legal e estratégica é uma das alavancas mais subestimadas na construção de patrimônio — e ignorá-la é, na prática, escolher pagar mais do que o necessário todos os anos.\n\n` +
      `O Financial Planning vai identificar as oportunidades disponíveis para a sua situação.`
    );

    const fiscalSalvo = resultados.fiscal;
    const tipoDeclaracao = fiscalSalvo?.tipoDeclaracao ?? '';

    if (tipoDeclaracao === 'simplificada') return (
      `Você está no modelo correto para o seu perfil. A declaração simplificada é a escolha mais vantajosa quando o desconto padrão supera as deduções individuais — e é exatamente o seu caso.\n\n` +
      `Do ponto de vista tributário, você está pagando o mínimo legal possível para a sua situação atual. O Financial Planning vai garantir que isso continue sendo verdade à medida que a renda e o patrimônio evoluem.`
    );

    // Completa — baseado no score de aproveitamento do PGBL
    if (s <= 20) return (
      `Você está no modelo de declaração que permite as maiores deduções legais — mas ainda não está aproveitando o principal benefício disponível: a dedução de contribuições à previdência privada na base do IR.\n\n` +
      `Não aproveitar esse mecanismo é pagar mais imposto do que o necessário — todos os anos, de forma permanente. O que poderia estar sendo deduzido e reinvestido está indo para o fisco sem necessidade.\n\n` +
      `O Financial Planning vai estruturar a estratégia fiscal ideal para maximizar esse benefício.`
    );

    if (s <= 70) return (
      `Você já está aproveitando parte do benefício fiscal disponível — o que é um passo importante na direção certa. Mas ainda há espaço para reduzir ainda mais a carga tributária dentro do que a lei permite.\n\n` +
      `Cada real a mais de dedução é um real a menos de imposto — que permanece investido e acumulando patrimônio para você, em vez de ir para o fisco.\n\n` +
      `O Financial Planning vai identificar o ponto exato de otimização para maximizar esse benefício.`
    );

    if (s < 100) return (
      `Você está próximo da otimização máxima — aproveitando uma parcela significativa do benefício fiscal disponível. Com um pequeno ajuste, é possível atingir o limite ideal e pagar o mínimo de IR legalmente permitido.\n\n` +
      `O Financial Planning vai mapear esse ponto de ajuste com precisão.`
    );

    return (
      `Você está no nível máximo de eficiência tributária — aproveitando integralmente o benefício legal disponível e pagando o mínimo de imposto possível para o seu perfil.\n\n` +
      `Manter essa eficiência requer atenção anual: renda, aportes e legislação mudam, e a estratégia precisa acompanhar essas mudanças. O Financial Planning vai garantir que isso aconteça.`
    );
  })();

  return { lf, aa, ps, fiscal };
}
