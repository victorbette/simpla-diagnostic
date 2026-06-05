import { useState } from "react";
import type { ResultadoCarteira, PlanoAcaoItem } from "@/types/estrategiaResultados";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { Rebalanceamento } from "./Rebalanceamento";

interface Props {
  carteira: ResultadoCarteira | null;
}

type SubTab = "atual" | "rebalanceamento";

const ACAO_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  manter:           { bg: "#F3F4F6", color: "#6B7280", label: "→ Manter" },
  aportar:          { bg: "#DCFCE7", color: "#15803D", label: "↑ Aportar" },
  resgatar_parcial: { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar" },
  resgatar_total:   { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar tudo" },
  novo:             { bg: "#DBEAFE", color: "#1E40AF", label: "✦ Novo" },
};

export function GestaoInvestimentos({ carteira }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("atual");

  if (!carteira) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
        <i className="ti ti-chart-pie-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
        Dados de carteira não disponíveis.<br />
        Salve a carteira no Financial Planning primeiro.
      </div>
    );
  }

  const savedAt = carteira.savedAt ? new Date(carteira.savedAt).toLocaleDateString("pt-BR") : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #BFDBFE" }}>
        {([
          ["atual", "Carteira Atual"],
          ["rebalanceamento", "Rebalanceamento"],
        ] as [SubTab, string][]).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setSubTab(s)}
            style={{
              padding: "10px 24px",
              fontSize: 13, fontWeight: 500,
              border: "none", cursor: "pointer",
              backgroundColor: "transparent",
              color: subTab === s ? "#1E3A8A" : "#6B7280",
              borderBottom: `2px solid ${subTab === s ? "#1E3A8A" : "transparent"}`,
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "atual" && <CarteiraAtual carteira={carteira} savedAt={savedAt} />}
      {subTab === "rebalanceamento" && <Rebalanceamento carteira={carteira} />}
    </div>
  );
}

function CarteiraAtual({ carteira, savedAt }: { carteira: ResultadoCarteira; savedAt: string }) {
  const planoFiltrado = carteira.planoAcao.filter(
    (i) => (i.acao || i.tipo) !== "manter"
  );

  const cardsComItens = CARD_ORDER.filter((k) =>
    carteira.planoAcao.some((p) => p.card === k)
  );

  const COLS = "2fr 1fr 1fr 1fr 1fr";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Patrimônio",     value: formatBRL(carteira.patrimonio),  color: "#1E3A8A", top: "#1E3A8A" },
          { label: "Total Aportes",  value: formatBRL(carteira.totalAportes), color: "#15803D", top: "#15803D" },
          { label: "Total Resgates", value: formatBRL(carteira.totalResgates), color: "#B91C1C", top: "#B91C1C" },
          { label: "Movimentações",  value: String(planoFiltrado.length),     color: "#111827", top: "#6B7280" },
        ].map(({ label, value, color, top }) => (
          <div key={label} style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderTop: `3px solid ${top}`, borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 17, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Allocation comparison */}
      <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Alocação por Categoria</span>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>Salvo em {savedAt}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CARD_ORDER.map((cardId) => {
            const meta = CARD_META[cardId];
            const atualPct = carteira.macroAtual[cardId] ?? 0;
            const metaPct = carteira.macroMeta[cardId] ?? 0;
            const diff = atualPct - metaPct;
            return (
              <div key={cardId}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Atual: <strong>{atualPct.toFixed(1)}%</strong></span>
                  <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>Meta: {metaPct.toFixed(1)}%</span>
                  {Math.abs(diff) > 0.5 && (
                    <span style={{
                      fontSize: 11, padding: "1px 6px", borderRadius: 4,
                      backgroundColor: diff > 0 ? "#FEF3C7" : "#DBEAFE",
                      color: diff > 0 ? "#B45309" : "#1E40AF",
                    }}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(metaPct, 100)}%`, background: "#E5E7EB", borderRadius: 99 }} />
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(atualPct, 100)}%`, background: meta.cor, borderRadius: 99, opacity: 0.85 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plano de ação (read-only) */}
      {cardsComItens.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Plano de Ação Salvo</span>

          {cardsComItens.map((cardId) => {
            const meta = CARD_META[cardId];
            const items: PlanoAcaoItem[] = carteira.planoAcao.filter((p) => p.card === cardId);
            const groupTotal = items.reduce((s, p) => s + p.movimentacaoBRL, 0);

            return (
              <div key={cardId} style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 8, overflow: "hidden" }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "#F8FAFC", padding: "8px 16px", borderBottom: "1px solid #BFDBFE",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block" }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{meta.label}</span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6,
                    backgroundColor: groupTotal > 0 ? "#DCFCE7" : groupTotal < 0 ? "#FEE2E2" : "#F0F7FF",
                    color: groupTotal > 0 ? "#15803D" : groupTotal < 0 ? "#B91C1C" : "#9CA3AF",
                  }}>
                    {groupTotal === 0 ? "—" : `${groupTotal > 0 ? "+" : ""}${formatBRL(groupTotal)}`}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "6px 14px", backgroundColor: "#1E3A8A" }}>
                  {["Ativo", "Ação", "Atual R$", "Meta R$", "Movimentação"].map((h) => (
                    <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
                  ))}
                </div>

                {items.map((item) => {
                  const acaoEfetiva = item.acao || item.tipo || "manter";
                  const cfg = ACAO_CONFIG[acaoEfetiva] ?? ACAO_CONFIG["manter"];
                  return (
                    <div
                      key={item.id}
                      style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 14px", borderTop: "1px solid #F3F4F6", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                        {item.segmento && <span style={{ display: "block", fontSize: 11, color: "#9CA3AF" }}>{item.segmento}</span>}
                      </div>
                      <span style={{
                        backgroundColor: cfg.bg, color: cfg.color,
                        fontSize: 10, borderRadius: 4, padding: "1px 5px",
                        display: "inline-block", width: "fit-content",
                      }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorAtualBRL)}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {acaoEfetiva === "manter" ? formatBRL(item.valorAtualBRL) : formatBRL(item.valorMetaBRL)}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: acaoEfetiva === "manter" ? "#9CA3AF" : item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF",
                      }}>
                        {acaoEfetiva === "manter" || item.movimentacaoBRL === 0
                          ? formatBRL(0)
                          : `${item.movimentacaoBRL > 0 ? "+" : "−"}${formatBRL(Math.abs(item.movimentacaoBRL))}`
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
