import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Pencil } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularProtecao, calcularSucessorio } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaSeguro } from "@/components/ferramentas/FerramentaSeguro";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
}

const AVAILABLE_TAGS = ["Seguro de Vida", "Invalidez", "Holding", "ITCMD", "Testamento"];

const CARD: React.CSSProperties = {
  backgroundColor: "white", borderRadius: 12, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

function Gauge({ score, color }: { score: number; color: string }) {
  const r = 32, cx = 42, cy = 40;
  const circ = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <svg width="84" height="48" viewBox="0 0 84 48">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="7" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{Math.round(score)}</text>
    </svg>
  );
}

export function SecaoProtecaoSucessorio({ plan, comentario, onComentarioChange, tags, onTagsChange }: Props) {
  const [lastEdit, setLastEdit] = useState("");
  const [seguroModal, setSeguroModal] = useState(false);

  const prot = calcularProtecao(plan.protecao);
  const suc = calcularSucessorio(plan.sucessorio);
  const scoreProtecao = Math.round(prot.percentualCoberto);
  const scoreSuc = (() => {
    let pts = 0;
    if (plan.sucessorio.possuiTestamento) pts += 35;
    if (plan.sucessorio.possuiHolding) pts += 35;
    if (plan.sucessorio.possuiSeguroVidaSucessao) pts += 30;
    return pts;
  })();

  const protColor = scoreProtecao >= 70 ? "#22C55E" : scoreProtecao >= 40 ? "#F59E0B" : "#EF4444";
  const sucColor = scoreSuc >= 70 ? "#22C55E" : scoreSuc >= 40 ? "#F59E0B" : "#EF4444";

  const patrimonioFora = plan.sucessorio.possuiSeguroVidaSucessao ? plan.sucessorio.capitalSeguroVidaSucessao : 0;
  const patrimonioInv = Math.max(0, plan.sucessorio.patrimonioTotal - patrimonioFora);
  const sucPie = [
    { name: "No inventário", value: patrimonioInv, color: "#EF4444" },
    { name: "Protegido", value: patrimonioFora, color: "#22C55E" },
  ].filter((d) => d.value > 0);

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        {/* Coluna esquerda */}
        <div>
          {/* Proteção */}
          <div style={{ ...CARD, borderTop: "3px solid #F87171" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Diagnóstico Proteção
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Capital necessário", value: formatCurrency(prot.capitalNecessario) },
                { label: "Capital segurado", value: formatCurrency(prot.capitalAtual) },
                { label: "Gap de cobertura", value: formatCurrency(prot.gap), color: prot.gap > 0 ? "#DC2626" : "#16A34A" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: color ?? "#041A20", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {[
                { label: "Seguro de vida adequado", ok: plan.protecao.possuiSeguroVida && prot.percentualCoberto >= 80 },
                { label: "Seguro de invalidez", ok: plan.protecao.possuiSeguroInvalidez },
                { label: "Plano de saúde", ok: plan.protecao.possuiPlanoSaude },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: ok ? "#16A34A" : "#EF4444" }}>{ok ? "✓" : "✗"}</span>
                  <span style={{ color: ok ? "#374151" : "#9CA3AF" }}>{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSeguroModal(true)} style={{ width: "100%", padding: "9px 0", border: "1px solid #F87171", borderRadius: 6, backgroundColor: "transparent", color: "#F87171", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              Análise completa de seguros →
            </button>
          </div>

          {/* Divider */}
          <div style={{ position: "relative", margin: "16px 0", textAlign: "center" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: "#E5E7EB" }} />
            <span style={{ position: "relative", backgroundColor: "#F8F9FA", padding: "0 12px", fontSize: 12, color: "#9CA3AF" }}>
              Planejamento Sucessório
            </span>
          </div>

          {/* Sucessório */}
          <div style={{ ...CARD, borderTop: "3px solid #3B82F6" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Diagnóstico Sucessório
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "ITCMD estimado", value: formatCurrency(suc.itcmdEstimado), color: "#DC2626" },
                { label: "Custo inventário", value: formatCurrency(suc.custoInventarioEstimado), color: "#DC2626" },
                { label: "% do custo", value: `${formatNumber(suc.percentualCusto, 1)}%` },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: color ?? "#041A20", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Testamento", ok: plan.sucessorio.possuiTestamento },
                { label: "Holding familiar", ok: plan.sucessorio.possuiHolding },
                { label: "Seguro para sucessão", ok: plan.sucessorio.possuiSeguroVidaSucessao },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: ok ? "#16A34A" : "#EF4444" }}>{ok ? "✓" : "✗"}</span>
                  <span style={{ color: ok ? "#374151" : "#9CA3AF" }}>{label}</span>
                </div>
              ))}
            </div>
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
                placeholder="Ex: Identificamos lacuna de cobertura de R$ 800k em seguro de vida. Além disso, com ITCMD estimado de R$ 45k, recomendamos..."
                style={{ width: "100%", minHeight: 180, padding: "10px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
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
          <div style={{ ...CARD, borderTop: "3px solid #F87171" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Resumo Proteção</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <Gauge score={scoreProtecao} color={protColor} />
            </div>
            {[
              { label: "Capital necessário", value: formatCurrency(prot.capitalNecessario) },
              { label: "Capital segurado", value: formatCurrency(prot.capitalAtual) },
              { label: "Gap", value: formatCurrency(prot.gap), color: prot.gap > 0 ? "#DC2626" : "#16A34A" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{label}</span>
                <span style={{ fontWeight: 600, color: color ?? "#041A20" }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, borderTop: "3px solid #3B82F6", marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Resumo Sucessório</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <Gauge score={scoreSuc} color={sucColor} />
            </div>
            {sucPie.length > 0 && plan.sucessorio.patrimonioTotal > 0 && (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={sucPie} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                    {sucPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {[
              { label: "ITCMD estimado", value: formatCurrency(suc.itcmdEstimado), color: "#DC2626" },
              { label: "Custo inventário", value: formatCurrency(suc.custoInventarioEstimado), color: "#DC2626" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{label}</span>
                <span style={{ fontWeight: 600, color }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, marginTop: 16, border: "1px solid #E5E7EB" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase" }}>Status da Seção</p>
            {[
              { label: "Diagnóstico revisado", ok: true },
              { label: "Análise de seguros feita", ok: prot.capitalAtual > 0 },
              { label: "Estratégia redigida", ok: comentario.length > 50 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: ok ? "#F0FDF4" : "#F3F4F6", color: ok ? "#16A34A" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {ok ? "✓" : "○"}
                </span>
                <span style={{ color: ok ? "#374151" : "#9CA3AF" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FerramentaModal open={seguroModal} onClose={() => setSeguroModal(false)} title="Análise Completa de Seguros">
        <FerramentaSeguro protecao={plan.protecao} onSave={() => setSeguroModal(false)} />
      </FerramentaModal>
    </>
  );
}
