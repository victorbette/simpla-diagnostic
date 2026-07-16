import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GaugeSemiCircular, nivelScoreGauge } from "@/components/shared/GaugeSemiCircular";
import { calcularScoresAreas, gerarTextosAreas } from "@/lib/resumoAreas";

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

// ─ Main Component ────────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  resultados,
}: FinancialPlanDashboardProps) {
  const dc = plan.dadosCliente;

  const scores = calcularScoresAreas(plan, resultados);
  const textos = gerarTextosAreas(plan, resultados);

  const scoreGeral = scores.geral;
  const nivelGeral = nivelScoreGauge(scoreGeral ?? -1);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const perfil = dc.suitabilityPerfil;

  // ── Gauges ─────────────────────────────────────────────────────────────────
  const gauges = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",  score: scores.lf     },
    { icone: "ti-chart-pie", nome: "Asset Allocation",      score: scores.aa     },
    { icone: "ti-shield",    nome: "Proteção e Sucessório", score: scores.ps     },
    { icone: "ti-receipt",   nome: "Tributário",            score: scores.fiscal },
  ];

  const textCards = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",      texto: textos.lf,     score: scores.lf     },
    { icone: "ti-chart-pie", nome: "Asset Allocation",          texto: textos.aa,     score: scores.aa     },
    { icone: "ti-shield",    nome: "Proteção e Sucessório",     texto: textos.ps,     score: scores.ps     },
    { icone: "ti-receipt",   nome: "Planejamento Tributário",   texto: textos.fiscal, score: scores.fiscal },
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
          const n = nivelScoreGauge(score);
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
        const n = nivelScoreGauge(score);
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
