import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

// ─ Props ─────────────────────────────────────────────────────────────────────

interface FinancialPlanDashboardProps {
  plan: FinancialPlan;
  clientName: string;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onPrint: (type: "advisor" | "client") => void;
  onAvancarEstrategia: () => void;
  allStepsDone?: boolean;
  ultimoSalvo?: Date | null;
  resultados: ResultadosEstrategia;
}

// ─ Nível por score ─────────────────────────────────────────────────────────

function nivelScore(score: number): { label: string; cor: string; bg: string } {
  if (score < 0)   return { label: "Não analisado", cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 40)  return { label: "Em risco",      cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 60)  return { label: "Atenção",       cor: "#B45309", bg: "#FEF3C7" };
  if (score <= 80)  return { label: "Adequado",      cor: "#2563EB", bg: "#DBEAFE" };
  return              { label: "Excelente",     cor: "#15803D", bg: "#DCFCE7" };
}

// ─ Gauge Semicircular SVG ─────────────────────────────────────────────────────

interface GaugeProps {
  score: number;
  label: string;
  icone: string;
  nivel: { label: string; cor: string; bg: string };
}

function GaugeSemiCircular({ score, label, icone, nivel }: GaugeProps) {
  const W = 160;
  const H = 90;
  const CX = W / 2;
  const CY = H;
  const R_EXT = 72;
  const R_INT = 52;

  // Clamp para cálculos SVG (score=-1 = "não analisado", não afeta geometria)
  const scoreClamped = Math.max(0, Math.min(100, score));
  const graus = 180 - (scoreClamped / 100) * 180;
  const rad = (graus * Math.PI) / 180;

  const xFimExt = CX + R_EXT * Math.cos(rad);
  const yFimExt = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);

  // largeArc sempre 0: o arco preenchido nunca ultrapassa 180°
  const pathFundo = [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY}`,
    `L ${CX + R_INT} ${CY}`,
    `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ");

  const pathPreenchido = scoreClamped > 0
    ? [
        `M ${CX - R_EXT} ${CY}`,
        `A ${R_EXT} ${R_EXT} 0 0 1 ${xFimExt} ${yFimExt}`,
        `L ${xFimInt} ${yFimInt}`,
        `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`,
        "Z",
      ].join(" ")
    : "";

  // Ponteiro no centro da espessura do anel
  const rMid = (R_INT + R_EXT) / 2;
  const pxFim = CX + rMid * Math.cos(rad);
  const pyFim = CY - rMid * Math.sin(rad);

  return (
    <div style={{
      background: "white",
      border: "0.5px solid #E5E7EB",
      borderRadius: 12,
      padding: "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{ position: "relative" }}>
        <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} style={{ overflow: "visible" }}>
          <path d={pathFundo} fill="#F3F4F6" />
          {score >= 0 && scoreClamped > 0 && (
            <path d={pathPreenchido} fill={nivel.cor} opacity={0.9} />
          )}
          {score >= 0 && scoreClamped > 0 && (
            <line
              x1={CX}
              y1={CY}
              x2={pxFim}
              y2={pyFim}
              stroke="white"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}
          <text
            x={CX}
            y={CY - 10}
            textAnchor="middle"
            fontSize={22}
            fontWeight={800}
            fill={score < 0 ? "#9CA3AF" : nivel.cor}
          >
            {score < 0 ? "—" : scoreClamped}
          </text>
          <text x={CX} y={CY + 6} textAnchor="middle" fontSize={10} fill="#9CA3AF">
            /100
          </text>
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 13, color: nivel.cor }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "center" }}>
          {label}
        </span>
      </div>

      <span style={{
        fontSize: 10, fontWeight: 600, color: nivel.cor, background: nivel.bg,
        padding: "2px 10px", borderRadius: 99, marginTop: 6,
      }}>
        {nivel.label}
      </span>
    </div>
  );
}

// ─ Main Component ────────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  resultados,
}: FinancialPlanDashboardProps) {
  const dc = plan.dadosCliente;

  // ── Dados salvos das ferramentas ─────────────────────────────────────────
  const ifSalvo       = resultados.if;
  const seguroSalvo   = resultados.seguro;
  const fiscalSalvo   = resultados.fiscal;
  const carteiraSalva = resultados.carteira;

  // ── Liberdade Financeira — variáveis compartilhadas para score e texto ───
  const patrimonioAtual    = Number(dc.patrimonioFinanceiroEstimado) || 0;
  const aporteMensalColeta = Number(dc.aportesMensalMedio) || 0;
  const idadeAtualLF = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;
  const idadeMeta     = Number(ifSalvo?.idadeMeta)           || plan.planejamentoIF.idadeMeta || 60;
  const rendaDesejada = Number(ifSalvo?.rendaMensalDesejada) || plan.planejamentoIF.rendaMensalDesejada || 0;
  const taxaScoreMensal = Math.pow(1.045, 1 / 12) - 1;
  const nMesesScore     = Math.max(0, (idadeMeta - idadeAtualLF) * 12);
  const projecaoScore   = nMesesScore > 0
    ? patrimonioAtual * Math.pow(1 + taxaScoreMensal, nMesesScore) +
      aporteMensalColeta * (Math.pow(1 + taxaScoreMensal, nMesesScore) - 1) / taxaScoreMensal
    : patrimonioAtual;
  const taxaRetMensal = Math.pow(1.04, 1 / 12) - 1;
  const mesesRetirada = Math.max(0, (90 - idadeMeta) * 12);
  const patrimonioNecessarioScore = rendaDesejada > 0
    ? rendaDesejada * (1 - Math.pow(1 + taxaRetMensal, -mesesRetirada)) / taxaRetMensal
    : 0;
  const lfTemDados = patrimonioNecessarioScore > 0 && idadeAtualLF > 0 && idadeMeta > idadeAtualLF;

  // ── Score Aposentadoria (-1 = não analisado) ─────────────────────────────
  const scoreAposentadoria = !lfTemDados
    ? -1
    : Math.min(100, Math.round((projecaoScore / patrimonioNecessarioScore) * 100));

  // ── Score Proteção (-1 = não analisado, 0 = 0% de cobertura) ────────────
  const scoreProtecao = (() => {
    if (!seguroSalvo) return -1;
    const capitalNecessario =
      Number(seguroSalvo.capitalNecessario) ||
      Number(seguroSalvo.totalNeed)         ||
      0;
    const capitalAtual =
      Number(seguroSalvo.capitalAtual)  ||
      Number(seguroSalvo.totalCoverage) ||
      0;
    if (capitalNecessario > 0) {
      return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
    }
    return seguroSalvo.scoreProtecao ?? 0;
  })();

  // ── Tributário — variáveis compartilhadas para score e texto ─────────────
  const tipoDeclaracaoFiscal: string   = fiscalSalvo?.tipoDeclaracao ?? plan.fiscal.tipoDeclaracao;
  const rendaAnualFiscal               = Number(fiscalSalvo?.rendaAnual)           || 0;
  const tetoPGBLFiscal                 = Number(fiscalSalvo?.tetoPGBLAnual)        || 0;
  const aporteAnualFiscal              = Number(fiscalSalvo?.aporteAnual)          || 0;
  const economiaAnualFiscal            = Number(fiscalSalvo?.economiaAnual)        || 0;
  const numDepsFiscal                  = Number(fiscalSalvo?.inputDependentes)     || 0;
  const aporteMensalPGBLFiscal         = Number(fiscalSalvo?.inputAporteMensalPGBL) || 0;

  // ── Score Tributário (-1 = não analisado) ────────────────────────────────
  const scoreTributario = (() => {
    if (!fiscalSalvo) return -1;
    let pts = 0;
    // Critério 1: tipo de declaração definido (20pts)
    if (tipoDeclaracaoFiscal !== "nao_sei") pts += 20;
    // Critério 2: adequação do modelo (30pts)
    if (tipoDeclaracaoFiscal === "completa") {
      pts += (rendaAnualFiscal > 40000 || numDepsFiscal > 0) ? 30 : 10;
    } else if (tipoDeclaracaoFiscal === "simplificada") {
      pts += (rendaAnualFiscal <= 40000 && numDepsFiscal === 0) ? 30 : 15;
    }
    // Critério 3: aproveitamento PGBL (50pts)
    if (tipoDeclaracaoFiscal === "completa") {
      const aprovPct = tetoPGBLFiscal > 0
        ? Math.min(100, Math.round((aporteAnualFiscal / tetoPGBLFiscal) * 100))
        : 0;
      pts += Math.round(aprovPct * 0.5);
    } else if (tipoDeclaracaoFiscal === "simplificada") {
      pts += 25;
    }
    return Math.min(100, pts);
  })();

  // ── Score Asset Allocation (-1 = não analisado) ───────────────────────────
  const scoreAA = (() => {
    if (!carteiraSalva) return -1;
    const macroAtual = carteiraSalva.macroAtual ?? {};
    const macroMeta  = carteiraSalva.macroMeta  ?? {};
    const ids = Object.keys(macroMeta);
    if (!ids.length || !Object.keys(macroAtual).length) return -1;
    const desvios = ids.map(id =>
      Math.abs((Number(macroAtual[id]) || 0) - (Number(macroMeta[id]) || 0))
    );
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    return Math.max(0, Math.round(100 - desvioMedio * 3));
  })();

  // ── Score Geral (ignora áreas não analisadas) ─────────────────────────────
  const scoresAtivos = [scoreAposentadoria, scoreAA, scoreProtecao, scoreTributario]
    .filter(s => s >= 0);

  const scoreGeral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  const nivelGeral = nivelScore(scoreGeral ?? -1);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const perfil = dc.suitabilityPerfil;

  // ── Gauges ─────────────────────────────────────────────────────────────────
  const gauges = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",  score: scoreAposentadoria },
    { icone: "ti-chart-pie", nome: "Asset Allocation",      score: scoreAA            },
    { icone: "ti-shield",    nome: "Proteção e Sucessório", score: scoreProtecao      },
    { icone: "ti-receipt",   nome: "Tributário",            score: scoreTributario    },
  ];

  // ── Textos analíticos por área ─────────────────────────────────────────────

  const textoAposentadoria = (() => {
    if (!ifSalvo) {
      return "Simulação de liberdade financeira ainda não realizada. Acesse a aba Liberdade Financeira para configurar sua projeção e descobrir em quanto tempo você pode atingir a independência financeira com os aportes atuais.";
    }
    const anosRestantes = Math.max(0, idadeMeta - idadeAtualLF);
    const pct = patrimonioNecessarioScore > 0
      ? Math.round((projecaoScore / patrimonioNecessarioScore) * 100)
      : 0;
    const gap = Math.max(0, patrimonioNecessarioScore - projecaoScore);
    if (patrimonioNecessarioScore > 0 && projecaoScore >= patrimonioNecessarioScore) {
      return `Com patrimônio atual de ${formatCurrency(patrimonioAtual)} e aportes mensais de ${formatCurrency(aporteMensalColeta)}, o patrimônio projetado aos ${idadeMeta} anos (em ${anosRestantes} anos) é de ${formatCurrency(projecaoScore)} — ${pct}% da meta de ${formatCurrency(patrimonioNecessarioScore)} para sustentar ${formatCurrency(rendaDesejada)}/mês. A liberdade financeira está no caminho certo.`;
    }
    if (patrimonioNecessarioScore > 0) {
      return `Com patrimônio atual de ${formatCurrency(patrimonioAtual)} e aportes de ${formatCurrency(aporteMensalColeta)}/mês, a projeção aos ${idadeMeta} anos é de ${formatCurrency(projecaoScore)} — ${pct}% dos ${formatCurrency(patrimonioNecessarioScore)} necessários para ${formatCurrency(rendaDesejada)}/mês. Há um gap de ${formatCurrency(gap)}: considere aumentar aportes, postergar a meta de idade ou redimensionar a renda desejada.`;
    }
    const projecao = ifSalvo.patrimonioAposentadoria;
    const meta     = ifSalvo.patrimonioNecessario;
    const renda    = ifSalvo.rendaMensalDesejada;
    const idadeAlvo = ifSalvo.idadeMeta;
    if (projecao >= meta) {
      return `Projeção de ${formatCurrency(projecao)} aos ${idadeAlvo} anos supera a meta de ${formatCurrency(meta)} para renda de ${formatCurrency(renda)}/mês. Liberdade financeira no caminho certo.`;
    }
    return `Projeção de ${formatCurrency(projecao)} aos ${idadeAlvo} anos é inferior à meta de ${formatCurrency(meta)} para renda de ${formatCurrency(renda)}/mês. Revise aportes ou estratégia de investimentos.`;
  })();

  const textoAA = (() => {
    if (!carteiraSalva) {
      return "Análise de carteira ainda não realizada. Acesse a aba Asset Allocation para registrar seus investimentos, definir a alocação ideal para seu perfil e receber um plano de ação personalizado de rebalanceamento.";
    }
    const { patrimonio, macroAtual, macroMeta } = carteiraSalva;
    const ids = Object.keys(macroMeta ?? {});
    const desvioMedio = ids.length
      ? ids.map(id => Math.abs((Number(macroAtual[id]) || 0) - (Number(macroMeta[id]) || 0)))
          .reduce((s, d) => s + d, 0) / ids.length
      : 0;
    const alinhado = desvioMedio < 5;
    const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
    if (alinhado) {
      return `Patrimônio financeiro de ${formatCurrency(patrimonio)} com perfil ${perfilLabel}. A alocação atual está alinhada com a meta — desvio médio entre segmentos inferior a 5%. A carteira segue as diretrizes do diagnóstico Simpla Invest para este perfil, com boa diversificação entre as classes de ativos.`;
    }
    return `Patrimônio financeiro de ${formatCurrency(patrimonio)} com perfil ${perfilLabel}. O desvio médio entre alocação atual e meta é de ${desvioMedio.toFixed(1)}%, indicando oportunidade de rebalanceamento. O plano de ação detalha os movimentos necessários para otimizar a carteira conforme o perfil ${perfilLabel} e os objetivos definidos.`;
  })();

  const textoProtecao = (() => {
    if (!seguroSalvo) {
      return "Análise de proteção ainda não realizada. Acesse a aba Proteção e Sucessório para mapear sua necessidade de cobertura de vida, invalidez e doenças graves e identificar eventuais gaps.";
    }
    const capitalNecessario = seguroSalvo.capitalNecessario ?? seguroSalvo.totalNeed ?? 0;
    const capitalAtual = seguroSalvo.capitalAtual ?? seguroSalvo.totalCoverage ?? 0;
    const gap = seguroSalvo.gap ?? Math.max(0, capitalNecessario - capitalAtual);
    const scoreP = seguroSalvo.scoreProtecao;
    if (capitalAtual >= capitalNecessario) {
      return `Cobertura atual de ${formatCurrency(capitalAtual)} é adequada para o capital necessário estimado de ${formatCurrency(capitalNecessario)}. A proteção cobre risco de morte, invalidez e doenças graves conforme o perfil familiar. Score de proteção: ${scoreP}/100. Revise as apólices periodicamente para manter a cobertura alinhada com mudanças patrimoniais e familiares.`;
    }
    return `Gap de proteção identificado: cobertura atual de ${formatCurrency(capitalAtual)} é inferior ao capital necessário de ${formatCurrency(capitalNecessario)} — déficit de ${formatCurrency(gap)}. Em caso de sinistro, a família ficaria exposta a uma insuficiência de recursos. Avalie a contratação ou revisão de seguros de vida, invalidez e/ou doenças graves para fechar esse gap.`;
  })();

  const textoTributario = (() => {
    if (!fiscalSalvo) {
      return "Análise tributária ainda não realizada. Acesse a aba Planejamento Tributário para simular o diferimento fiscal via PGBL e identificar oportunidades de redução de IR.";
    }
    if (tipoDeclaracaoFiscal === "simplificada") {
      return "Declaração no modelo simplificado (desconto padrão de R$ 16.754,34/ano). Nesse modelo, aportes em PGBL não geram dedução adicional de IR. Avalie periodicamente se o modelo completo seria mais vantajoso — especialmente se despesas dedutíveis (saúde, educação, dependentes, INSS) superarem o desconto fixo.";
    }
    if (tipoDeclaracaoFiscal === "nao_sei") {
      return "Tipo de declaração não identificado. Para otimizar a estratégia tributária, defina se declara pelo modelo completo ou simplificado. No modelo completo, aportes em PGBL de até 12% da renda bruta anual são dedutíveis da base de cálculo do IR, podendo gerar economia significativa.";
    }
    if (economiaAnualFiscal > 0) {
      const pctAproveitamento = tetoPGBLFiscal > 0
        ? Math.round((aporteAnualFiscal / tetoPGBLFiscal) * 100)
        : 0;
      if (aporteMensalPGBLFiscal > 0) {
        return `Declaração completa. Aportando ${formatCurrency(aporteMensalPGBLFiscal)}/mês em PGBL (${formatCurrency(aporteAnualFiscal)}/ano), aproveitando ${pctAproveitamento}% do teto de ${formatCurrency(tetoPGBLFiscal)}/ano (12% da renda bruta de ${formatCurrency(rendaAnualFiscal)}), a economia fiscal estimada é de ${formatCurrency(economiaAnualFiscal)}/ano — ${formatCurrency(economiaAnualFiscal / 12)}/mês. Reinvestindo a restituição no próprio PGBL, o efeito composto amplifica ainda mais o benefício ao longo do tempo.`;
      }
      return `Declaração completa. Com aporte de ${formatCurrency(aporteAnualFiscal)}/ano no PGBL (${formatCurrency(aporteAnualFiscal / 12)}/mês), aproveitando ${pctAproveitamento}% do teto de ${formatCurrency(tetoPGBLFiscal)}/ano (12% da renda bruta de ${formatCurrency(rendaAnualFiscal)}), a economia fiscal estimada é de ${formatCurrency(economiaAnualFiscal)}/ano — ${formatCurrency(economiaAnualFiscal / 12)}/mês. Ao reinvestir a restituição no próprio PGBL, o efeito composto amplifica ainda mais o benefício ao longo do tempo.`;
    }
    if (aporteMensalPGBLFiscal === 0 && tetoPGBLFiscal > 0) {
      return `Declaração completa identificada. Nenhum aporte em PGBL informado. Há espaço para deduzir até ${formatCurrency(tetoPGBLFiscal / 12)}/mês (${formatCurrency(tetoPGBLFiscal)}/ano) e potencialmente economizar no IR.`;
    }
    return `Declaração completa identificada. Não foi apurada economia fiscal com os dados informados — verifique se o aporte no PGBL foi preenchido e se a renda bruta anual de ${formatCurrency(rendaAnualFiscal)} está correta na calculadora tributária.`;
  })();

  const textCards = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",      texto: textoAposentadoria, score: scoreAposentadoria },
    { icone: "ti-chart-pie", nome: "Asset Allocation",          texto: textoAA,            score: scoreAA            },
    { icone: "ti-shield",    nome: "Proteção e Sucessório",     texto: textoProtecao,      score: scoreProtecao      },
    { icone: "ti-receipt",   nome: "Planejamento Tributário",   texto: textoTributario,    score: scoreTributario    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", padding: "24px 32px", boxSizing: "border-box" }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{clientName}</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 10px" }}>Diagnóstico · {hoje}</p>
            {perfil && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF" }}>
                Perfil: {PERFIL_LABELS[perfil]}
              </span>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>
              Score Geral
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "center" }}>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#111827", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {scoreGeral !== null ? scoreGeral : "—"}
              </span>
              {scoreGeral !== null && <span style={{ fontSize: 16, color: "#9CA3AF" }}>/100</span>}
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: nivelGeral.bg, color: nivelGeral.cor }}>
                {scoreGeral !== null ? nivelGeral.label : "Sem análise"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 GAUGES SEMICIRCULARES ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {gauges.map(({ icone, nome, score }) => {
          const n = nivelScore(score);
          return (
            <GaugeSemiCircular
              key={nome}
              score={score}
              label={nome}
              icone={icone}
              nivel={n}
            />
          );
        })}
      </div>

      {/* ── CARDS ANALÍTICOS POR ÁREA ─────────────────────────────────────────── */}
      {textCards.map(({ icone, nome, texto, score }) => {
        const n = nivelScore(score);
        return (
          <div
            key={nome}
            style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${icone}`} style={{ fontSize: 18, color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{nome}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: n.cor, background: n.bg, padding: "3px 10px", borderRadius: 99 }}>
                {n.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0 }}>
              {texto}
            </p>
          </div>
        );
      })}

    </div>
  );
}
