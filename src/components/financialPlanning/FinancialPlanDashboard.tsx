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
  if (score === 0)  return { label: "Não analisado", cor: "#9CA3AF", bg: "#F3F4F6" };
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

  const graus = 180 - (score / 100) * 180;
  const rad = (graus * Math.PI) / 180;

  const xFim    = CX + R_EXT * Math.cos(rad);
  const yFim    = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);

  const largeArc = score > 50 ? 1 : 0;

  const pathFundo =
    `M ${CX - R_EXT} ${CY} A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY} ` +
    `L ${CX + R_INT} ${CY} A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY} Z`;

  const pathPreenchido = score > 0
    ? `M ${CX - R_EXT} ${CY} A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFim} ${yFim} ` +
      `L ${xFimInt} ${yFimInt} A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY} Z`
    : "";

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
        <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`}>
          <path d={pathFundo} fill="#F3F4F6" />
          {score > 0 && <path d={pathPreenchido} fill={nivel.cor} opacity={0.9} />}
          <line
            x1={CX}
            y1={CY}
            x2={CX + (R_EXT - 2) * Math.cos(rad)}
            y2={CY - (R_EXT - 2) * Math.sin(rad)}
            stroke="white"
            strokeWidth={2}
            opacity={score > 0 ? 1 : 0}
          />
          <text
            x={CX}
            y={CY - 8}
            textAnchor="middle"
            fontSize={24}
            fontWeight={800}
            fill={score > 0 ? nivel.cor : "#9CA3AF"}
          >
            {score > 0 ? score : "—"}
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={10} fill="#9CA3AF">
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

  // ── Score Aposentadoria ──────────────────────────────────────────────────
  const scoreAposentadoria = (() => {
    if (!ifSalvo) return 0;
    const patrimonioNecessario  = Number(ifSalvo.patrimonioNecessario)  || 0;
    const patrimonioAposentadoria = Number(ifSalvo.patrimonioAposentadoria) || 0;
    if (!patrimonioNecessario) return 0;
    return Math.min(100, Math.round((patrimonioAposentadoria / patrimonioNecessario) * 100));
  })();

  // ── Score Proteção (recomputa de capitalNecessario/capitalAtual) ──────────
  const scoreProtecao = (() => {
    if (!seguroSalvo) return 0;
    const capitalNecessario =
      Number(seguroSalvo.capitalNecessario) ||
      Number(seguroSalvo.totalNeed)         ||
      0;
    const capitalAtual =
      Number(seguroSalvo.capitalAtual)   ||
      Number(seguroSalvo.totalCoverage)  ||
      0;
    if (capitalNecessario > 0) {
      return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
    }
    return seguroSalvo.scoreProtecao ?? 0;
  })();

  // ── Score Tributário ──────────────────────────────────────────────────────
  const scoreTributario = (() => {
    if (!fiscalSalvo) return 0;
    const tetoPGBLAnual = Number(fiscalSalvo.tetoPGBLAnual) || 0;
    const economiaAnual = Number(fiscalSalvo.economiaAnual) || 0;
    const aporteAnual   = Number(fiscalSalvo.aporteAnual)   || 0;
    if (tetoPGBLAnual > 0) {
      return Math.min(100, Math.round((aporteAnual / tetoPGBLAnual) * 100));
    }
    return economiaAnual > 0 ? 50 : 0;
  })();

  // ── Score Asset Allocation ────────────────────────────────────────────────
  const scoreAA = (() => {
    if (!carteiraSalva) return 0;
    const macroAtual = carteiraSalva.macroAtual ?? {};
    const macroMeta  = carteiraSalva.macroMeta  ?? {};
    const ids = Object.keys(macroMeta);
    if (!ids.length || !Object.keys(macroAtual).length) return 0;
    const desvios = ids.map(id =>
      Math.abs((Number(macroAtual[id]) || 0) - (Number(macroMeta[id]) || 0))
    );
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    return Math.max(0, Math.round(100 - desvioMedio * 3));
  })();

  // ── Debug temporário ─────────────────────────────────────────────────────
  console.log('[Resultado] resultados completo:', JSON.stringify(resultados, null, 2));
  console.log('[Resultado] seguro:', seguroSalvo);
  console.log('[Resultado] scoreProtecao:', scoreProtecao);
  console.log('[Resultado] scoreAposentadoria:', scoreAposentadoria, '| scoreAA:', scoreAA, '| scoreTributario:', scoreTributario);

  // ── Score Geral ───────────────────────────────────────────────────────────
  const scoresAtivos = [
    ifSalvo       ? scoreAposentadoria : null,
    carteiraSalva ? scoreAA            : null,
    seguroSalvo   ? scoreProtecao      : null,
    fiscalSalvo   ? scoreTributario    : null,
  ].filter((s): s is number => s !== null);

  const scoreGeral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  const nivelGeral = nivelScore(scoreGeral ?? 0);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const perfil = dc.suitabilityPerfil;

  // ── Gauges ─────────────────────────────────────────────────────────────────
  const gauges = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",  score: scoreAposentadoria, temDados: !!ifSalvo },
    { icone: "ti-chart-pie", nome: "Asset Allocation",      score: scoreAA,            temDados: !!carteiraSalva },
    { icone: "ti-shield",    nome: "Proteção e Sucessório", score: scoreProtecao,      temDados: !!seguroSalvo },
    { icone: "ti-receipt",   nome: "Tributário",            score: scoreTributario,    temDados: !!fiscalSalvo },
  ];

  // ── Textos analíticos por área ─────────────────────────────────────────────

  const textoAposentadoria = (() => {
    if (!ifSalvo) {
      return "Simulação de liberdade financeira ainda não realizada. Acesse a aba Liberdade Financeira para configurar sua projeção patrimonial.";
    }
    const { patrimonioAposentadoria: projecao, patrimonioNecessario: meta, rendaMensalDesejada: renda, idadeMeta: idadeAlvo } = ifSalvo;
    if (projecao >= meta) {
      return `Com o aporte atual, sua projeção de patrimônio aos ${idadeAlvo} anos é de ${formatCurrency(projecao)}, superando o patrimônio necessário de ${formatCurrency(meta)} para sustentar uma renda de ${formatCurrency(renda)}/mês. Sua meta de liberdade financeira está no caminho certo.`;
    }
    return `Sua projeção de patrimônio aos ${idadeAlvo} anos é de ${formatCurrency(projecao)}, abaixo do necessário ${formatCurrency(meta)} para uma renda mensal de ${formatCurrency(renda)}. Para alcançar a meta de liberdade financeira, é necessário aumentar aportes ou ajustar a estratégia de investimentos.`;
  })();

  const textoAA = (() => {
    if (!carteiraSalva) {
      return "Análise de carteira ainda não realizada. Acesse a aba Asset Allocation para registrar seus investimentos e definir a alocação ideal.";
    }
    const { patrimonio, macroAtual, macroMeta } = carteiraSalva;
    const ids = Object.keys(macroMeta ?? {});
    const desvioMedio = ids.length
      ? ids.map(id => Math.abs((Number(macroAtual[id]) || 0) - (Number(macroMeta[id]) || 0)))
          .reduce((s, d) => s + d, 0) / ids.length
      : 0;
    const alinhado = desvioMedio < 5;
    const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
    return `Patrimônio financeiro atual de ${formatCurrency(patrimonio)}, com perfil ${perfilLabel}. A alocação proposta segue o padrão Simpla Invest para o seu perfil. ${alinhado ? "Carteira alinhada com a meta." : "Há desvios na alocação atual que podem ser corrigidos com o plano de ação definido."}`;
  })();

  const textoProtecao = (() => {
    if (!seguroSalvo) {
      return "Análise de proteção ainda não realizada. Acesse a aba Proteção e Sucessório para mapear suas necessidades de cobertura.";
    }
    const capitalNecessario = seguroSalvo.capitalNecessario ?? seguroSalvo.totalNeed ?? 0;
    const capitalAtual = seguroSalvo.capitalAtual ?? seguroSalvo.totalCoverage ?? 0;
    const gap = seguroSalvo.gap ?? Math.max(0, capitalNecessario - capitalAtual);
    if (capitalAtual >= capitalNecessario) {
      return `Sua cobertura de ${formatCurrency(capitalAtual)} é adequada para proteger sua família. O capital necessário estimado é de ${formatCurrency(capitalNecessario)}.`;
    }
    return `Foi identificado um gap de proteção de ${formatCurrency(gap)}. Sua cobertura atual de ${formatCurrency(capitalAtual)} é inferior ao capital necessário de ${formatCurrency(capitalNecessario)} para proteger sua família.`;
  })();

  const textoTributario = (() => {
    if (!fiscalSalvo) {
      return "Análise tributária ainda não realizada. Acesse a aba Planejamento Tributário para simular o diferimento fiscal via PGBL.";
    }
    const { economiaAnual, tetoPGBLAnual } = fiscalSalvo;
    if (economiaAnual > 0) {
      return `Com a estratégia PGBL simulada, a economia fiscal estimada é de ${formatCurrency(economiaAnual)}/ano (${formatCurrency(economiaAnual / 12)}/mês). O teto disponível para dedução é de ${formatCurrency(tetoPGBLAnual)}/ano.`;
    }
    return "Não foi identificada oportunidade de diferimento fiscal com os dados informados. Verifique o tipo de declaração e a renda na calculadora tributária.";
  })();

  const textCards = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",      texto: textoAposentadoria, score: scoreAposentadoria, temDados: !!ifSalvo },
    { icone: "ti-chart-pie", nome: "Asset Allocation",          texto: textoAA,            score: scoreAA,            temDados: !!carteiraSalva },
    { icone: "ti-shield",    nome: "Proteção e Sucessório",     texto: textoProtecao,      score: scoreProtecao,      temDados: !!seguroSalvo },
    { icone: "ti-receipt",   nome: "Planejamento Tributário",   texto: textoTributario,    score: scoreTributario,    temDados: !!fiscalSalvo },
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
        {gauges.map(({ icone, nome, score, temDados }) => {
          const n = nivelScore(temDados ? score : 0);
          return (
            <GaugeSemiCircular
              key={nome}
              score={temDados ? score : 0}
              label={nome}
              icone={icone}
              nivel={n}
            />
          );
        })}
      </div>

      {/* ── CARDS ANALÍTICOS POR ÁREA ─────────────────────────────────────────── */}
      {textCards.map(({ icone, nome, texto, score, temDados }) => {
        const n = nivelScore(temDados ? score : 0);
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
