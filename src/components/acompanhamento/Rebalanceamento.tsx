import { useState, useMemo } from "react";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  carteira: ResultadoCarteira;
}

function parseBRL(raw: string): number {
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  return isNaN(v) || v < 0 ? 0 : v;
}

export function Rebalanceamento({ carteira }: Props) {
  const [aporteText, setAporteText] = useState("");
  const [aporte, setAporte] = useState(0);

  const patrimonioTotal = carteira.patrimonio;

  const rows = useMemo(() => {
    const patrimonioMeta = patrimonioTotal + aporte;
    return CARD_ORDER.map((cardId) => {
      const metaPct = carteira.macroMeta[cardId] ?? 0;
      const atualPct = carteira.macroAtual[cardId] ?? 0;
      const valorAtual = (atualPct / 100) * patrimonioTotal;
      const valorMeta = (metaPct / 100) * patrimonioMeta;
      const delta = valorMeta - valorAtual;
      return { cardId, metaPct, atualPct, valorAtual, valorMeta, delta };
    });
  }, [carteira, patrimonioTotal, aporte]);

  const totalAPortar = rows.filter((r) => r.delta > 0.01).reduce((s, r) => s + r.delta, 0);
  const sobra = aporte - totalAPortar;

  const COLS = "2fr 1fr 1fr 1fr 1fr 1.2fr";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Aporte input */}
      <div style={{
        backgroundColor: "white",
        border: "0.5px solid #BFDBFE",
        borderLeft: "4px solid #15803D",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-cash" style={{ fontSize: 20, color: "#15803D" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Novo Aporte</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
              Patrimônio atual: {formatBRL(patrimonioTotal)}
              {aporte > 0 && (
                <span style={{ color: "#15803D" }}> → {formatBRL(patrimonioTotal + aporte)}</span>
              )}
            </p>
          </div>
        </div>
        <input
          type="text"
          value={aporteText}
          placeholder="R$ 0,00"
          onChange={(e) => {
            setAporteText(e.target.value);
            setAporte(parseBRL(e.target.value));
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => {
            const v = parseBRL(aporteText);
            setAporte(v);
            setAporteText(v > 0 ? formatBRL(v) : "");
          }}
          style={{
            textAlign: "right", fontSize: 18, fontWeight: 600,
            color: "#15803D", border: "1px solid #BFDBFE", borderRadius: 8,
            padding: "8px 14px", width: 180, outline: "none",
            fontFamily: "inherit", boxSizing: "border-box",
          } as React.CSSProperties}
        />
      </div>

      {/* Rebalancing table */}
      <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 16px", backgroundColor: "#1E3A8A" }}>
          {["Categoria", "% Atual", "% Meta", "Valor Atual", "Valor Meta", "Movimentação"].map((h) => (
            <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
          ))}
        </div>

        {rows.map((row) => {
          const meta = CARD_META[row.cardId];
          const isAportar = row.delta > 0.01;
          const isExcesso = row.delta < -0.01;
          return (
            <div
              key={row.cardId}
              style={{
                display: "grid", gridTemplateColumns: COLS, gap: 8,
                padding: "10px 16px", borderTop: "1px solid #F3F4F6", alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{meta.label}</span>
              </div>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{row.atualPct.toFixed(1)}%</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{row.metaPct.toFixed(1)}%</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(row.valorAtual)}</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(row.valorMeta)}</span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: isAportar ? "#15803D" : isExcesso ? "#B91C1C" : "#9CA3AF",
              }}>
                {!isAportar && !isExcesso
                  ? "—"
                  : `${row.delta > 0 ? "+" : ""}${formatBRL(row.delta)}`
                }
              </span>
            </div>
          );
        })}

        {aporte > 0 && (
          <div style={{
            borderTop: "2px solid #BFDBFE", padding: "10px 16px",
            backgroundColor: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: 20, alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: "#6B7280" }}>Total a aportar:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>{formatBRL(totalAPortar)}</span>
          </div>
        )}
      </div>

      {/* Warning if aporte != total delta */}
      {aporte > 0 && Math.abs(sobra) > 1 && (
        <div style={{
          backgroundColor: sobra > 0 ? "#FEF3C7" : "#FEE2E2",
          border: `0.5px solid ${sobra > 0 ? "#FCD34D" : "#FCA5A5"}`,
          borderRadius: 8, padding: "8px 14px",
          fontSize: 12, color: sobra > 0 ? "#B45309" : "#B91C1C",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0 }} />
          {sobra > 0
            ? `Sobram ${formatBRL(sobra)} do aporte após atingir todas as metas. Ajuste os percentuais de meta ou aporte um valor menor.`
            : `O aporte de ${formatBRL(aporte)} é insuficiente para atingir todas as metas. Faltam ${formatBRL(-sobra)}.`
          }
        </div>
      )}

      {aporte === 0 && (
        <div style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", padding: "8px 0" }}>
          Insira o valor do aporte para ver as recomendações de rebalanceamento.
        </div>
      )}
    </div>
  );
}
