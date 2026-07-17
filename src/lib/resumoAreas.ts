/* Scores por área e frases-resumo do diagnóstico — lógica compartilhada entre
 * o FinancialPlanDashboard (tela) e o documento "Estratégia Pronta" (página
 * Ponto de Partida). Área sem análise recebe score -1 ("Não analisado") e é
 * excluída da média do score geral. */
import { formatCurrency } from "@/lib/format";
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
  const idadeMeta       = Number(plan.planejamentoIF.idadeMeta) || 60;
  const idadeAtual      = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  const patrimonioNecessario = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const TAXA_MENSAL = Math.pow(1.04, 1 / 12) - 1;
  const nMeses = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const projecao = nMeses > 0
    ? patrimonioAtual * Math.pow(1 + TAXA_MENSAL, nMeses) +
      aporteMensal * (Math.pow(1 + TAXA_MENSAL, nMeses) - 1) / TAXA_MENSAL
    : patrimonioAtual;

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

  // ── Asset Allocation ──────────────────────────────────────────────────────
  const aa = (() => {
    const aaTemDados = Number(dc.patrimonioFinanceiroEstimado) > 0;
    if (!aaTemDados) return -1;

    const perfil      = dc.suitabilityPerfil ?? '';
    const temRendaFixa = true; // patrimônio > 0 implica ao menos renda fixa
    const temAcoes    = Number(plan.ativosAtuais.acoes) > 0;
    const temFIIs     = Number(plan.ativosAtuais.fiis) > 0;
    const temExterior = Number(plan.ativosAtuais.rvGlobal) > 0 || Number(plan.ativosAtuais.rfGlobal) > 0;

    let pontos = 0;
    if (temRendaFixa) pontos += 30;
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
    const capitalNecessario = Number(seguroSalvo.capitalNecessario) || Number(seguroSalvo.totalNeed) || 0;
    const capitalAtual = capitalAtualSeguro(seguroSalvo);
    if (capitalNecessario > 0) {
      return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
    }
    return capitalAtual > 0 ? 50 : (seguroSalvo.scoreProtecao ?? 0);
  })();

  // ── Tributário ────────────────────────────────────────────────────────────
  const fiscal = (() => {
    if (!fiscalSalvo) return -1;
    const tipoDeclaracao  = fiscalSalvo.tipoDeclaracao ?? 'nao_sei';
    const tetoPGBL        = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;
    const economia        = Number(fiscalSalvo.economiaAnual) || 0;

    let pontos = 0;

    // 1. Tipo de declaração definido (30 pts completa / 20 pts simplificada)
    if (tipoDeclaracao === 'completa')     pontos += 30;
    else if (tipoDeclaracao === 'simplificada') pontos += 20;

    // 2. Aproveitamento PGBL (40 pts) ou identificação do modelo (20 pts)
    if (tipoDeclaracao === 'completa') {
      if (aporteAnualPGBL > 0) {
        const aproveitamento = tetoPGBL > 0 ? Math.min(1, aporteAnualPGBL / tetoPGBL) : 0;
        pontos += Math.round(aproveitamento * 40);
      }
    } else if (tipoDeclaracao === 'simplificada') {
      pontos += 20;
    }

    // 3. Diferimento gerado (30 pts) ou neutro para simplificada (15 pts)
    if (economia > 0 && tetoPGBL > 0) {
      const economiaPct = Math.min(1, economia / (tetoPGBL * 0.275));
      pontos += Math.round(economiaPct * 30);
    } else if (tipoDeclaracao === 'simplificada') {
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
  clientName?: string,
): TextosAreas {
  const dc          = plan.dadosCliente;
  const seguroSalvo = resultados.seguro;
  const fiscalSalvo = resultados.fiscal;
  const nome        = clientName?.split(' ')[0] ?? 'Cliente';

  // ── LF ────────────────────────────────────────────────────────────────────
  const lf = (() => {
    const v = varsLF(plan);

    if (!v.temDados) {
      return `Para analisarmos sua jornada rumo à liberdade financeira, precisamos de algumas informações básicas ainda não preenchidas: patrimônio atual, valor que você investe por mês, renda desejada na aposentadoria e a idade em que deseja se aposentar.\n\nPreencha esses dados na Coleta de Dados e voltamos aqui com a análise completa.`;
    }

    if (v.projecao >= v.patrimonioNecessario) {
      let texto = `${nome}, sua situação em relação à liberdade financeira é muito positiva. `;
      if (v.patrimonioAtual > 0) {
        texto += `Você já construiu um patrimônio de ${formatCurrency(v.patrimonioAtual)}, o que representa um ótimo ponto de partida para a sua jornada. `;
      }
      if (v.aporteMensal > 0) {
        texto += `Além disso, você está investindo ${formatCurrency(v.aporteMensal)} por mês — um hábito fundamental para quem quer conquistar a independência financeira. `;
      }
      texto += `\n\nCom a sua estratégia atual, a projeção indica que você chegará à aposentadoria aos ${v.idadeMeta} anos com um patrimônio estimado de ${formatCurrency(v.projecao)}, suficiente para gerar uma renda mensal de ${formatCurrency(v.rendaDesejada)} para sempre, sem precisar consumir o que acumulou. `;
      texto += `\n\nContinue nessa direção! O mais importante agora é manter a consistência nos aportes e garantir que seu patrimônio esteja bem alocado para render ao longo dos anos.`;
      return texto;
    }

    const pct          = Math.round((v.projecao / v.patrimonioNecessario) * 100);
    const anosRestantes = Math.max(0, v.idadeMeta - v.idadeAtual);
    let texto = '';

    if (v.patrimonioAtual > 0 || v.aporteMensal > 0) {
      texto += `${nome}, você já está no caminho certo `;
      if (v.patrimonioAtual > 0) texto += `— tem ${formatCurrency(v.patrimonioAtual)} acumulados `;
      if (v.aporteMensal > 0)   texto += `e investe ${formatCurrency(v.aporteMensal)}/mês, `;
      texto += `o que é muito positivo. `;
    } else {
      texto += `${nome}, sua jornada de acumulação ainda está no início. `;
    }

    texto += `\n\nPara conquistar a renda de ${formatCurrency(v.rendaDesejada)}/mês na aposentadoria aos ${v.idadeMeta} anos, você precisará de um patrimônio de ${formatCurrency(v.patrimonioNecessario)}. Com o ritmo atual, a projeção aponta para ${formatCurrency(v.projecao)} — equivalente a ${pct}% da meta. `;
    texto += `\n\nA boa notícia é que você ainda tem ${anosRestantes} anos pela frente, tempo suficiente para ajustar a estratégia e chegar lá. As principais alavancas disponíveis são: aumentar o valor investido por mês, otimizar a rentabilidade da sua carteira e eventualmente ajustar a data ou a renda desejada na aposentadoria. Veja no Simulador de Liberdade Financeira como pequenos ajustes fazem uma diferença enorme ao longo do tempo.`;
    return texto;
  })();

  // ── AA ────────────────────────────────────────────────────────────────────
  const aa = (() => {
    const aaTemDados = Number(dc.patrimonioFinanceiroEstimado) > 0;
    if (!aaTemDados) {
      return `Para analisarmos a composição dos seus investimentos, precisamos que você informe o patrimônio financeiro atual e os tipos de ativos que já possui na Coleta de Dados.\n\nEssa análise nos ajuda a entender se sua carteira está preparada para gerar patrimônio e renda passiva no longo prazo.`;
    }

    const temAcoes    = Number(plan.ativosAtuais.acoes) > 0;
    const temFIIs     = Number(plan.ativosAtuais.fiis) > 0;
    const temExterior = Number(plan.ativosAtuais.rvGlobal) > 0 || Number(plan.ativosAtuais.rfGlobal) > 0;

    let texto = `${nome}, analisamos a composição dos seus investimentos atuais. `;

    const positivos: string[] = [
      'você possui uma base em renda fixa, que garante segurança e liquidez para momentos de necessidade',
    ];
    const melhorias: string[] = [];

    if (temAcoes) {
      positivos.push('sua carteira inclui ações, um componente fundamental para o crescimento do patrimônio no longo prazo');
    } else {
      melhorias.push('incluir ações na carteira para potencializar o crescimento patrimonial no longo prazo');
    }
    if (temFIIs) {
      positivos.push('os Fundos de Investimento Imobiliário (FIIs) já fazem parte da sua carteira, gerando renda passiva mensal');
    } else {
      melhorias.push('considerar Fundos Imobiliários como fonte de renda passiva mensal');
    }
    if (temExterior) {
      positivos.push('você já tem investimentos no exterior, o que protege parte do seu patrimônio contra variações do mercado brasileiro');
    } else {
      melhorias.push('diversificar parte dos investimentos para o exterior, reduzindo a dependência exclusiva do mercado brasileiro');
    }

    texto += '\n\nPontos positivos: ';
    positivos.forEach((p, i) => {
      texto += i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : '; ' + p;
    });
    texto += '. ';

    if (melhorias.length > 0) {
      texto += '\n\nOportunidades de melhoria: Para fortalecer ainda mais sua carteira, recomendamos ';
      melhorias.forEach((m, i) => {
        if (i === 0) texto += m;
        else if (i === melhorias.length - 1) texto += ' e ' + m;
        else texto += ', ' + m;
      });
      texto += '. ';
    } else {
      texto += '\n\nSua carteira demonstra uma boa diversificação entre as principais classes de ativos. Continue monitorando e rebalanceando periodicamente para manter esse equilíbrio.';
    }

    return texto;
  })();

  // ── PS ────────────────────────────────────────────────────────────────────
  const ps = (() => {
    if (!seguroSalvo) {
      return `A análise de proteção ainda não foi realizada. Acesse a aba Proteção e Sucessório para mapear as necessidades da sua família em caso de imprevistos.\n\nEssa etapa é fundamental para garantir que, independente do que aconteça com você, sua família esteja financeiramente protegida.`;
    }

    const capitalNecessario = Number(seguroSalvo.capitalNecessario) || Number(seguroSalvo.totalNeed) || 0;
    const capitalAtual      = capitalAtualSeguro(seguroSalvo);
    const gap               = Math.max(0, capitalNecessario - capitalAtual);
    const coberturaPct      = capitalNecessario > 0 ? Math.round((capitalAtual / capitalNecessario) * 100) : 0;

    let texto = `${nome}, realizamos a análise das necessidades de proteção da sua família. `;

    if (capitalAtual === 0) {
      texto += `\n\nNo momento, não identificamos nenhuma apólice de seguro de vida ou invalidez em vigor. Isso representa um risco importante: em caso de falecimento ou incapacidade, sua família precisaria de aproximadamente ${formatCurrency(capitalNecessario)} para cobrir as despesas imediatas e manter o padrão de vida pelos próximos anos. `;
      texto += `\n\nContratar um seguro de vida é uma das medidas mais importantes e acessíveis que você pode tomar hoje para proteger quem você ama.`;
    } else if (gap <= 0) {
      texto += `\n\nBoa notícia: sua cobertura atual de ${formatCurrency(capitalAtual)} é suficiente para proteger sua família. Isso inclui a cobertura das despesas imediatas, a manutenção da renda familiar pelo período necessário e as coberturas em vida. `;
      texto += `\n\nMantenha suas apólices em dia e revise anualmente para garantir que a cobertura acompanhe as mudanças na sua situação familiar.`;
    } else {
      texto += `\n\nVocê já deu um passo importante ao contratar uma cobertura de ${formatCurrency(capitalAtual)}. No entanto, a análise indica que seria ideal ter uma cobertura total de ${formatCurrency(capitalNecessario)} para garantir a proteção completa da sua família em qualquer cenário. `;
      texto += `\n\nA cobertura atual representa ${coberturaPct}% do recomendado. Avaliar um reforço na apólice de seguro seria uma medida prudente para dar mais tranquilidade para você e sua família.`;
    }

    return texto;
  })();

  // ── Fiscal ────────────────────────────────────────────────────────────────
  const fiscal = (() => {
    if (!fiscalSalvo) {
      return `O planejamento tributário ainda não foi analisado. Acesse a aba Planejamento Tributário para simular o impacto do seu Imposto de Renda e identificar oportunidades de redução legal da carga fiscal.\n\nEsse é um dos ajustes que pode gerar mais resultado com menos esforço.`;
    }

    const tipoDeclaracao  = fiscalSalvo.tipoDeclaracao ?? 'nao_sei';
    const tetoPGBL        = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const aporteAnualPGBL = Number(fiscalSalvo.aporteAnual) || 0;
    const economia        = Number(fiscalSalvo.economiaAnual) || 0;

    let texto = `${nome}, analisamos sua situação em relação ao Imposto de Renda. `;

    if (tipoDeclaracao === 'nao_sei') {
      texto += `\n\nO primeiro passo é definir qual o modelo de declaração mais vantajoso para o seu caso — completo ou simplificado. Essa escolha impacta diretamente quanto você pode economizar no IR e se vale a pena utilizar a previdência privada como estratégia de redução de imposto. Nossa equipe pode ajudar a definir o melhor caminho para você.`;
    } else if (tipoDeclaracao === 'simplificada') {
      texto += `\n\nVocê utiliza a declaração simplificada, que aplica um desconto padrão no cálculo do imposto. Nesse modelo, o aporte em previdência privada do tipo PGBL não gera dedução adicional no IR. `;
      texto += `\n\nSe seus rendimentos crescerem ou você passar a ter mais despesas dedutíveis, pode valer a pena reavaliar o modelo de declaração. Mantenha esse ponto em revisão anualmente.`;
    } else if (tipoDeclaracao === 'completa') {
      if (aporteAnualPGBL > 0 && economia > 0) {
        const aproveitamentoPct = tetoPGBL > 0 ? Math.round((aporteAnualPGBL / tetoPGBL) * 100) : 0;
        const espacoMensal      = tetoPGBL > 0 ? Math.max(0, (tetoPGBL - aporteAnualPGBL) / 12) : 0;
        texto += `\n\nÓtima notícia: você utiliza a declaração completa e já contribui com ${formatCurrency(aporteAnualPGBL / 12)}/mês em previdência privada, o que reduz legalmente o valor do seu Imposto de Renda em ${formatCurrency(economia)} por ano — isso equivale a ${formatCurrency(economia / 12)}/mês que ficam no seu bolso em vez de ir para o fisco. `;
        if (aproveitamentoPct < 100 && espacoMensal > 0) {
          texto += `\n\nVocê está aproveitando ${aproveitamentoPct}% do benefício disponível. Aumentando a contribuição em ${formatCurrency(espacoMensal)}/mês, seria possível maximizar ainda mais a redução do imposto e fortalecer o patrimônio para a aposentadoria ao mesmo tempo.`;
        } else {
          texto += `\n\nVocê está aproveitando ao máximo o benefício fiscal disponível — parabéns pela estratégia tributária bem estruturada!`;
        }
      } else if (aporteAnualPGBL === 0 && tetoPGBL > 0) {
        texto += `\n\nVocê utiliza a declaração completa, o que é muito positivo. No entanto, identificamos uma oportunidade ainda não aproveitada: contribuindo com ${formatCurrency(tetoPGBL / 12)}/mês em previdência privada do tipo PGBL, você poderia reduzir legalmente seu Imposto de Renda de forma significativa. Além disso, esse valor ficaria investido e rendendo para a sua aposentadoria. É uma estratégia que ganha nos dois lados.`;
      } else {
        texto += `\n\nDeclaração completa identificada. Verifique se o aporte no PGBL foi preenchido e se a renda bruta está correta na calculadora tributária para apurar a economia fiscal potencial.`;
      }
    }

    return texto;
  })();

  return { lf, aa, ps, fiscal };
}
