import { formatCurrency, calcularIdade } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import type { EstrategiaScores } from "@/lib/estrategiaScores";
import { nivelScore } from "@/lib/estrategiaScores";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  scores: EstrategiaScores;
}

function CircleGauge({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
  const sw = 6;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, score)) / 100);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={sw}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cx}px` }}
      />
      <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="700" fill={color}>
        {score}
      </text>
    </svg>
  );
}

const AREAS = [
  { id: "aa",     label: "Asset Allocation",     color: "#1E40AF" },
  { id: "lf",     label: "Liberdade Financeira",  color: "#15803D" },
  { id: "ps",     label: "Proteção",              color: "#B91C1C" },
  { id: "fiscal", label: "Fiscal",                color: "#2563EB" },
] as const;

export function DocCapa({ plan, resultados: _resultados, clientName, scores }: Props) {
  const dc = plan.dadosCliente;
  const perfil = dc.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "Não definido";
  const idade = dc.dataNascimento ? calcularIdade(dc.dataNascimento) : plan.planejamentoIF.idadeAtual;
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const areaScores: Record<string, number> = {
    aa: scores.aaScore,
    lf: scores.lfScore,
    ps: scores.psScore,
    fiscal: scores.fiscalScore,
  };

  return (
    <div
      className="doc-page"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 0,
        background: "white",
        borderRadius: 0,
        boxShadow: "none",
        minHeight: "297mm",
      }}
    >
      {/* Top band */}
      <div style={{ background: "#1E3A8A", padding: "40px 56px 36px" }}>
        <img src="/logo-si.svg" alt="Simpla Invest" style={{ height: 56, width: 56, objectFit: "contain" }} />
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#93C5FD", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Financial Planning
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, background: "white", padding: "48px 56px" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 12 }}>
          Estratégia Inicial
        </p>

        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, color: "#1E3A8A", lineHeight: 1.1 }}>
          {clientName}
        </h1>

        <div style={{ width: 60, height: 4, background: "#2563EB", margin: "20px 0" }} />

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 32px", marginBottom: 36 }}>
          <InfoCell label="Data" value={data} />
          <InfoCell label="Perfil" value={perfilLabel} highlight={perfil ? "#1E3A8A" : undefined} />
          <InfoCell label="Elaborado por" value="Simpla Invest" />
          <InfoCell label="Idade" value={idade ? `${idade} anos` : "—"} />
          <InfoCell label="Patrimônio total" value={formatCurrency(dc.patrimonioTotalEstimado ?? 0)} />
          <InfoCell label="Validade" value="12 meses" />
        </div>

        <div style={{ height: 1, background: "#E5E7EB", marginBottom: 32 }} />

        {/* Area summary */}
        <p style={{ margin: "0 0 16px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Diagnóstico por área
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {AREAS.map((area) => {
            const s = areaScores[area.id];
            const nv = nivelScore(s);
            return (
              <div key={area.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px", background: "#F8FAFF", borderRadius: 10, border: "0.5px solid #BFDBFE" }}>
                <CircleGauge score={s} color={area.color} />
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#111827", textAlign: "center" }}>{area.label}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: nv.bg, color: nv.color }}>
                  {nv.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#F0F7FF", padding: "18px 56px" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>
          Documento confidencial elaborado exclusivamente para{" "}
          <strong style={{ color: "#1E3A8A" }}>{clientName}</strong>.
          Válido por 12 meses a partir de {data}.
        </p>
      </div>
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: highlight ?? "#111827" }}>{value}</p>
    </div>
  );
}
