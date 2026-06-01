import { formatCurrency } from "@/lib/format";
import { calcularFiscal } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { nivelScore } from "@/lib/estrategiaScores";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  score: number;
  comentario: string;
  onComentarioChange: (v: string) => void;
}

const TIPO_DECLARACAO_LABELS: Record<string, string> = {
  completa: "Completa",
  simplificada: "Simplificada",
  nao_sei: "Não definido",
};

function Metrica({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 20px" }}>
      <p style={{ margin: "0 0 6px", fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: color ?? "#111827" }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9CA3AF" }}>{sub}</p>}
    </div>
  );
}

export function DocPlanejamentoFiscal({ plan, resultados, score, comentario, onComentarioChange }: Props) {
  const pf = plan.fiscal;
  const nv = nivelScore(score);
  const rf = resultados.fiscal;
  const simplesF = !rf ? calcularFiscal(pf) : null;

  const rendaAnual = rf?.rendaAnual ?? pf.rendaBrutaAnual;
  const tetoPGBL = rf?.tetoPGBLAnual ?? simplesF?.tetoPGBL ?? 0;
  const economiaAnual = rf?.economiaAnual ?? simplesF?.economiaEstimadaPGBL ?? 0;
  const espacoMensal = rf?.espacoDisponivelMensal ?? ((simplesF?.espacoPGBL ?? 0) / 12);
  const aproveitandoTeto = rf?.aproveitandoTeto ?? (simplesF?.pgblAtingidoTeto ?? false);
  const tipoDeclaracaoLabel = TIPO_DECLARACAO_LABELS[pf.tipoDeclaracao] ?? "—";

  const aproveitamentoPct = tetoPGBL > 0
    ? Math.min(100, Math.round(((rf?.aporteAnual ?? simplesF?.pgblAtual ?? 0) / tetoPGBL) * 100))
    : 0;

  return (
    <div className="doc-page" style={{ background: "white", minHeight: "297mm" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, background: "#2563EB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🧾</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Planejamento Fiscal</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
      </div>

      {/* Intro */}
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 28 }}>
        O planejamento fiscal busca maximizar sua eficiência tributária de forma legal, garantindo
        que você pague apenas o imposto devido e aproveite todos os benefícios disponíveis na
        legislação brasileira.
      </p>

      {/* Situação atual */}
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Situação Fiscal Atual</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <Metrica label="Renda Anual Bruta" value={formatCurrency(rendaAnual)} />
        <Metrica label="Tipo de Declaração" value={tipoDeclaracaoLabel} color={pf.tipoDeclaracao === "nao_sei" ? "#B45309" : "#111827"} />
        <Metrica label="Teto PGBL (12%)" value={formatCurrency(tetoPGBL)} sub="Ao ano" />
        <Metrica
          label="Aproveitamento"
          value={aproveitandoTeto ? "100%" : `${aproveitamentoPct}%`}
          color={aproveitamentoPct >= 80 ? "#15803D" : aproveitamentoPct >= 50 ? "#B45309" : "#B91C1C"}
          sub={aproveitandoTeto ? "PGBL maximizado" : "do teto utilizado"}
        />
      </div>

      {/* PGBL opportunity */}
      {espacoMensal > 0 && pf.tipoDeclaracao === "completa" && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🐷</span>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#2563EB" }}>Oportunidade de Diferimento Fiscal</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div style={{ background: "white", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Espaço disponível</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2563EB" }}>{formatCurrency(espacoMensal)}<span style={{ fontSize: 13, fontWeight: 400 }}>/mês</span></p>
            </div>
            <div style={{ background: "white", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Economia anual estimada</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#15803D" }}>{formatCurrency(economiaAnual)}</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#1E40AF", lineHeight: 1.5 }}>
            Aplicando <strong>{formatCurrency(espacoMensal)}/mês</strong> em PGBL, você pode reduzir
            o Imposto de Renda em até <strong>{formatCurrency(economiaAnual)}</strong> por ano.
          </p>
        </div>
      )}

      {aproveitandoTeto && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: "#DCFCE7", border: "1px solid #86EFAC", marginBottom: 20 }}>
          <span style={{ fontSize: 15 }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#15803D" }}>PGBL maximizado — aproveitando 100% do benefício fiscal</span>
        </div>
      )}

      {/* Rendimentos isentos */}
      {pf.temRendimentosIsentos && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Rendimentos Isentos
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pf.tiposRendimentosIsentos.map((tipo) => (
              <span key={tipo} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "#DCFCE7", color: "#15803D", fontWeight: 600 }}>
                ✓ {tipo}
              </span>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
            Os rendimentos isentos não compõem a base de cálculo do IR, reduzindo sua carga tributária total.
          </p>
        </div>
      )}

      {/* IR comparison bars */}
      {rf && rf.irSemPGBL > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Comparativo IR
          </p>
          {[
            { label: "IR sem PGBL", value: rf.irSemPGBL, color: "#9CA3AF" },
            { label: "IR com PGBL", value: rf.irComPGBL, color: "#15803D" },
            { label: "Economia", value: rf.economiaAnual, color: "#2563EB" },
          ].map((bar) => (
            <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#6B7280", width: 90, flexShrink: 0, textAlign: "right" }}>{bar.label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#F0F7FF", overflow: "hidden" }}>
                <div style={{ width: `${rf.irSemPGBL > 0 ? Math.min(100, (bar.value / rf.irSemPGBL) * 100) : 0}%`, height: "100%", borderRadius: 4, background: bar.color }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111827", width: 100, flexShrink: 0 }}>{formatCurrency(bar.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Consultant comment */}
      <ConsultorBox label="Comentários do Consultor — Planejamento Fiscal" value={comentario} onChange={onComentarioChange} />
    </div>
  );
}

function ConsultorBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "14px 18px", marginTop: 8 }}>
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#B45309", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Adicione comentários personalizados para o cliente..."
        style={{ width: "100%", minHeight: 100, padding: "8px 10px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 13, color: "#000", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}
