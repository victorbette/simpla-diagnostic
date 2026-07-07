import { useState } from "react";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  carteira: ResultadoCarteira;
}

export function Rebalanceamento({ carteira }: Props) {
  const [aporte, setAporte] = useState<number>(carteira.aporteDisponivel ?? 0);
  const [display, setDisplay] = useState<string>(
    (carteira.aporteDisponivel ?? 0) === 0
      ? ""
      : (carteira.aporteDisponivel ?? 0).toFixed(2).replace(".", ",")
  );

  const patrimonioTotal = carteira.patrimonio + aporte;

  const rebalanceamento = CARD_ORDER.map((cardId) => {
    const meta = CARD_META[cardId];
    const atualPct = carteira.macroAtual[cardId] ?? 0;
    const metaPct = carteira.macroMeta[cardId] ?? 0;
    const valorMeta = (metaPct / 100) * patrimonioTotal;
    const diferenca = valorMeta - (atualPct / 100) * carteira.patrimonio;
    return { cardId, meta, atualPct, metaPct, valorMeta, diferenca };
  }).filter(({ metaPct, atualPct }) => metaPct > 0 || atualPct > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Aporte input */}
      <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 12px" }}>
          Simular Rebalanceamento
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontSize: 13, color: "#6B7280", flexShrink: 0 }}>Aporte disponível:</label>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            border: "1.5px solid #BFDBFE", borderRadius: 8, padding: "8px 12px",
            backgroundColor: "#F8FAFC",
          }}>
            <span style={{ fontSize: 13, color: "#6B7280", flexShrink: 0 }}>R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={display}
              onChange={(e) => {
                setDisplay(e.target.value);
                const parsed = parseFloat(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
                if (!isNaN(parsed)) setAporte(parsed);
                else setAporte(0);
              }}
              onBlur={() => {
                if (aporte > 0) setDisplay(aporte.toFixed(2).replace(".", ","));
                else setDisplay("");
              }}
              placeholder="0,00"
              style={{
                border: "none", background: "transparent", outline: "none",
                fontSize: 14, color: "#111827", width: 140, textAlign: "right",
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            Patrimônio total: {formatBRL(patrimonioTotal)}
          </span>
        </div>
      </div>

      {/* Rebalancing table */}
      <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: 8, padding: "8px 16px", backgroundColor: "#1E3A8A",
        }}>
          {["Categoria", "Atual %", "Meta %", "Valor Meta", "Movimentação"].map((h) => (
            <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
          ))}
        </div>

        {rebalanceamento.map(({ cardId, meta, atualPct, metaPct, valorMeta, diferenca }) => {
          const isAporte = diferenca > 0;
          const isResgate = diferenca < 0;
          return (
            <div
              key={cardId}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                gap: 8, padding: "10px 16px", borderTop: "1px solid #F3F4F6", alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{meta.label}</span>
              </div>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{atualPct.toFixed(1)}%</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{metaPct.toFixed(1)}%</span>
              <span style={{ fontSize: 12, color: "#374151" }}>{formatBRL(valorMeta)}</span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: isAporte ? "#15803D" : isResgate ? "#B91C1C" : "#9CA3AF",
              }}>
                {Math.abs(diferenca) < 1
                  ? "—"
                  : `${isAporte ? "+" : "−"}${formatBRL(Math.abs(diferenca))}`
                }
              </span>
            </div>
          );
        })}

        {/* Total row */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: 8, padding: "10px 16px", borderTop: "2px solid #BFDBFE",
          backgroundColor: "#F8FAFC", alignItems: "center",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Total</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            {CARD_ORDER.reduce((s, c) => s + (carteira.macroAtual[c] ?? 0), 0).toFixed(1)}%
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            {CARD_ORDER.reduce((s, c) => s + (carteira.macroMeta[c] ?? 0), 0).toFixed(1)}%
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{formatBRL(patrimonioTotal)}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: aporte > 0 ? "#15803D" : "#9CA3AF" }}>
            {aporte > 0 ? `+${formatBRL(aporte)}` : "—"}
          </span>
        </div>
      </div>

      {/* Bar chart comparison */}
      <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>Alocação: Atual vs Meta</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rebalanceamento.map(({ cardId, meta, atualPct, metaPct }) => (
            <div key={cardId}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{meta.label}</span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>
                  <strong>{atualPct.toFixed(1)}%</strong> atual → <strong style={{ color: meta.cor }}>{metaPct.toFixed(1)}%</strong> meta
                </span>
              </div>
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(metaPct, 100)}%`, background: "#E5E7EB", borderRadius: 99 }} />
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(atualPct, 100)}%`, background: meta.cor, borderRadius: 99, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
