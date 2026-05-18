import { useState } from "react";
import { Pencil } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularFiscal } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaPGBL } from "@/components/ferramentas/FerramentaPGBL";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
}

const AVAILABLE_TAGS = ["PGBL", "VGBL", "IR", "Dedução", "Previdência"];

const CARD: React.CSSProperties = {
  backgroundColor: "white", borderRadius: 12, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const DECL_LABELS: Record<string, string> = {
  completa: "Declaração completa",
  simplificada: "Declaração simplificada",
  nao_sei: "Não informado",
};

export function SecaoFiscal({ plan, comentario, onComentarioChange, tags, onTagsChange }: Props) {
  const [lastEdit, setLastEdit] = useState("");
  const [pgblModal, setPgblModal] = useState(false);

  const r = calcularFiscal(plan.fiscal);
  const oportunidadePerdida = r.economiaFiscalPotencial - r.economiaFiscalAtual;

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }

  const maxBar = Math.max(r.rendaAnualBruta * 0.3, 1);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        {/* Coluna esquerda */}
        <div>
          {/* Diagnóstico */}
          <div style={{ ...CARD, borderTop: "3px solid #F59E0B" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Diagnóstico Fiscal
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {[
                { label: "Renda anual bruta", value: formatCurrency(plan.fiscal.rendaBrutaAnual) },
                { label: "Tipo declaração IR", value: DECL_LABELS[plan.fiscal.tipoDeclaracao] ?? plan.fiscal.tipoDeclaracao },
                { label: "Teto PGBL (12%)", value: formatCurrency(r.tetoPGBL) },
                { label: "PGBL atual", value: formatCurrency(r.pgblAtual) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#041A20", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>Economia potencial</span>
                <span style={{ fontWeight: 600, color: "#16A34A" }}>{formatCurrency(r.economiaFiscalPotencial)}/ano</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>Economia aproveitada</span>
                <span style={{ fontWeight: 600, color: "#041A20" }}>{formatCurrency(r.economiaFiscalAtual)}/ano</span>
              </div>
              {oportunidadePerdida > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6B7280" }}>Oportunidade perdida</span>
                  <span style={{ fontWeight: 600, color: "#DC2626" }}>{formatCurrency(oportunidadePerdida)}/ano</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 999, backgroundColor: r.recomendaPGBL ? "#F0FDF4" : "#EFF6FF", color: r.recomendaPGBL ? "#16A34A" : "#2563EB" }}>
                {r.recomendaPGBL ? "PGBL recomendado" : "VGBL recomendado"}
              </span>
            </div>

            <button onClick={() => setPgblModal(true)} style={{ width: "100%", padding: "9px 0", border: "1px solid #F59E0B", borderRadius: 6, backgroundColor: "transparent", color: "#F59E0B", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              Calculadora PGBL completa →
            </button>
          </div>

          {/* Estratégia */}
          <div style={{ ...CARD, borderTop: "3px solid #041A20", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Pencil style={{ width: 14, height: 14, color: "#6B7280" }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: 0 }}>Estratégia e Recomendações</p>
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={comentario}
                onChange={(e) => handleComentario(e.target.value)}
                placeholder="Ex: Ao maximizar o aporte no PGBL até o teto de 12% da renda bruta, o cliente economizará R$ 8.400/ano em IR..."
                style={{ width: "100%", minHeight: 200, padding: "10px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>{comentario.length} caracteres</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
              {AVAILABLE_TAGS.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", border: "1px solid #E5E7EB", backgroundColor: tags.includes(t) ? "#041A20" : "transparent", color: tags.includes(t) ? "white" : "#374151" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>{lastEdit ? `Última edição: ${lastEdit}` : "Não editado"}</span>
              <button style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, backgroundColor: "#041A20", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>Salvar</button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div>
          <div style={{ ...CARD, borderTop: "3px solid #F59E0B" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Oportunidade Fiscal</p>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase" }}>Economia potencial anual</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#16A34A", margin: 0 }}>{formatCurrency(r.economiaFiscalPotencial)}</p>
            </div>

            {/* Barras comparativas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                { label: "IR sem PGBL", value: r.economiaFiscalPotencial, color: "#EF4444" },
                { label: "IR com PGBL", value: r.economiaFiscalAtual, color: "#22C55E" },
                { label: "Economia", value: oportunidadePerdida, color: "#BBA866" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 3 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 600, color }}>{formatCurrency(value)}</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (value / maxBar) * 100)}%`, backgroundColor: color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela */}
            <div style={{ backgroundColor: "#FFFBEB", borderRadius: 8, padding: "12px 14px", border: "1px solid #FDE68A" }}>
              {[
                { label: "Renda anual bruta", value: formatCurrency(plan.fiscal.rendaBrutaAnual) },
                { label: "Teto PGBL (12%)", value: formatCurrency(r.tetoPGBL) },
                { label: "PGBL atual", value: formatCurrency(r.pgblAtual) },
                { label: "Espaço disponível", value: formatCurrency(r.espacoPGBL), amber: r.espacoPGBL > 0 },
              ].map(({ label, value, amber }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingBottom: 4, marginBottom: 4, borderBottom: "1px solid #FEF3C7" }}>
                  <span style={{ color: "#6B7280" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: amber ? "#B45309" : "#041A20" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, marginTop: 16, border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase" }}>Status da Seção</p>
            {[
              { label: "Diagnóstico revisado", ok: true },
              { label: "Oportunidade identificada", ok: r.economiaFiscalPotencial > 0 },
              { label: "Estratégia redigida", ok: comentario.length > 50 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: ok ? "#F0FDF4" : "#F3F4F6", color: ok ? "#16A34A" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {ok ? "✓" : "○"}
                </span>
                <span style={{ color: ok ? "#374151" : "#9CA3AF" }}>{label}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "8px 0 0" }}>
              Taxa aproveitada: {formatNumber(r.tetoPGBL > 0 ? (r.pgblAtual / r.tetoPGBL) * 100 : 0, 0)}%
            </p>
          </div>
        </div>
      </div>

      <FerramentaModal open={pgblModal} onClose={() => setPgblModal(false)} title="Calculadora PGBL Completa">
        <FerramentaPGBL fiscal={plan.fiscal} onSave={() => setPgblModal(false)} />
      </FerramentaModal>
    </>
  );
}
