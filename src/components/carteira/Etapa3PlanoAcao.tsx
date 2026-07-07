import { useState, useMemo } from "react";
import type { PlanoAcaoItem } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  planoAcao: PlanoAcaoItem[];
  onPlanoAcao: (p: PlanoAcaoItem[]) => void;
  notasConsultor: string;
  onNotasConsultor: (s: string) => void;
  patrimonio: number;
  aporteDisponivel: number;
}

type Filtro = "todos" | "aportar" | "resgatar" | "manter" | "novo";

const TIPO_CONFIG: Record<PlanoAcaoItem["acao"], { bg: string; color: string; label: string }> = {
  manter:           { bg: "#F3F4F6", color: "#6B7280", label: "→ Manter" },
  aportar:          { bg: "#DCFCE7", color: "#15803D", label: "↑ Aportar" },
  resgatar_parcial: { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar" },
  resgatar_total:   { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar tudo" },
  novo:             { bg: "#DBEAFE", color: "#1E40AF", label: "✦ Novo" },
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #BFDBFE", borderRadius: 6,
  padding: "3px 6px", fontSize: 12,
  backgroundColor: "white", color: "#111827",
  cursor: "pointer", outline: "none",
};

function formatInputBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(text: string): number {
  const clean = text
    .replace(/R\$\s?/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

export function Etapa3PlanoAcao({
  planoAcao, onPlanoAcao, notasConsultor, onNotasConsultor, patrimonio: _patrimonio, aporteDisponivel,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  function updateItem(id: string, patch: Partial<PlanoAcaoItem>) {
    onPlanoAcao(planoAcao.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.acao === "manter") {
        next.movimentacaoBRL = 0;
        next.valorResgateBRL = undefined;
      } else if (patch.acao === "resgatar_parcial") {
        if (p.acao === "manter") {
          next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
        }
        if (next.valorResgateBRL === undefined) {
          next.valorResgateBRL = Math.abs(next.movimentacaoBRL);
        }
      } else if (patch.acao !== undefined && p.acao === "manter") {
        next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
      }
      return next;
    }));
  }

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const ap = planoAcao
      .filter((p) => p.acao !== "manter" && p.movimentacaoBRL > 0)
      .reduce((s, p) => s + p.movimentacaoBRL, 0);
    const re = planoAcao
      .filter((p) => p.acao !== "manter" && p.movimentacaoBRL < 0)
      .reduce((s, p) => {
        if (p.acao === "resgatar_parcial" && p.valorResgateBRL !== undefined) {
          return s + p.valorResgateBRL;
        }
        return s + Math.abs(p.movimentacaoBRL);
      }, 0);
    return {
      totalAportes: ap,
      totalResgates: re,
      saldoLiquido: ap - re,
      nMovs: planoAcao.filter((p) => p.acao !== "manter").length,
    };
  }, [planoAcao]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return planoAcao;
    if (filtro === "resgatar") return planoAcao.filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total");
    return planoAcao.filter((p) => p.acao === filtro);
  }, [planoAcao, filtro]);

  const cardsComItens = CARD_ORDER.filter((k) => filtrados.some((p) => p.card === k));

  const COLS = "2fr 1fr 1fr 1fr 1fr 1.5fr 0.8fr";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total Aportes",  value: formatBRL(totalAportes),  color: "#15803D" },
          { label: "Total Resgates", value: formatBRL(totalResgates),  color: "#B91C1C" },
          { label: "Saldo Líquido",  value: formatBRL(saldoLiquido),   color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C" },
          { label: "Movimentações",  value: String(nMovs),             color: "#111827" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            border: "0.5px solid #E5E7EB",
            borderRadius: 8, padding: "12px 14px", backgroundColor: "white",
          }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Aporte badge */}
      {aporteDisponivel > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB",
          borderRadius: 8, padding: "8px 14px",
        }}>
          <i className="ti ti-cash" style={{ fontSize: 16, color: "#15803D" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#15803D" }}>
            Aporte de {formatBRL(aporteDisponivel)} incluído nos cálculos
          </span>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          ["todos", "Todos"],
          ["aportar", "Aportar"],
          ["resgatar", "Resgatar"],
          ["manter", "Manter"],
          ["novo", "Novo"],
        ] as [Filtro, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "4px 12px", borderRadius: 6,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: filtro === f ? "none" : "1px solid #BFDBFE",
              backgroundColor: filtro === f ? "#1E3A8A" : "white",
              color: filtro === f ? "white" : "#6B7280",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Groups by card */}
      {cardsComItens.map((cardId) => {
        const meta = CARD_META[cardId];
        const groupItems = filtrados.filter((p) => p.card === cardId);
        const groupTotal = groupItems.reduce((s, p) => s + p.movimentacaoBRL, 0);

        return (
          <div key={cardId} style={{ border: "1px solid #BFDBFE", borderRadius: 8, overflow: "hidden", backgroundColor: "white" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "#F8FAFC", padding: "8px 16px",
              borderBottom: "1px solid #BFDBFE",
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

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: COLS,
              gap: 8, padding: "6px 14px", backgroundColor: "#1E3A8A",
            }}>
              {["Ativo", "Atual R$", "Meta R$", "Movimentação", "Ação", "Observação", "Prioridade"].map((h) => (
                <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
              ))}
            </div>

            {groupItems.map((item) => (
              <div
                key={item.id}
                style={{ borderTop: "1px solid #F3F4F6" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 14px", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{
                        backgroundColor: TIPO_CONFIG[item.acao].bg,
                        color: TIPO_CONFIG[item.acao].color,
                        fontSize: 10, borderRadius: 4, padding: "1px 5px", flexShrink: 0,
                      }}>
                        {TIPO_CONFIG[item.acao].label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                    </div>
                    {item.segmento && (
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{meta.label} · {item.segmento}</span>
                    )}
                  </div>

                  <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorAtualBRL)}</span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    {item.acao === "manter" ? formatBRL(item.valorAtualBRL) : formatBRL(item.valorMetaBRL)}
                  </span>

                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: item.acao === "manter" ? "#9CA3AF" : item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF",
                  }}>
                    {item.acao === "manter" || item.movimentacaoBRL === 0
                      ? formatBRL(0)
                      : `${item.movimentacaoBRL > 0 ? "+" : "−"}${formatBRL(Math.abs(item.movimentacaoBRL))}`
                    }
                  </span>

                  <select
                    value={item.acao}
                    onChange={(e) => updateItem(item.id, { acao: e.target.value as PlanoAcaoItem["acao"] })}
                    style={selectStyle}
                  >
                    <option value="manter">Manter</option>
                    <option value="aportar">Aportar</option>
                    <option value="resgatar_parcial">Resgatar parcialmente</option>
                    <option value="resgatar_total">Resgatar tudo</option>
                    <option value="novo">Novo</option>
                  </select>

                  <input
                    value={item.observacao}
                    onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                    placeholder="observação..."
                    style={{
                      border: "1px solid #BFDBFE", borderRadius: 6, padding: "3px 6px",
                      fontSize: 12, backgroundColor: "white", color: "#111827", outline: "none",
                      width: "100%", boxSizing: "border-box",
                    }}
                  />

                  <select
                    value={item.prioridade ?? "baixa"}
                    onChange={(e) => updateItem(item.id, { prioridade: e.target.value as PlanoAcaoItem["prioridade"] })}
                    style={selectStyle}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>

                {item.acao === "resgatar_parcial" && (
                  <div style={{ padding: "0 14px 10px" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px",
                      background: "#FFF5F5",
                      border: "0.5px solid #FECACA",
                      borderRadius: 6,
                    }}>
                      <span style={{ fontSize: 11, color: "#B91C1C", whiteSpace: "nowrap" }}>
                        Valor a resgatar:
                      </span>
                      <input
                        type="text"
                        value={editingValues[item.id] ?? formatInputBRL(item.valorResgateBRL ?? Math.abs(item.movimentacaoBRL))}
                        onChange={(e) => setEditingValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={(e) => {
                          const valor = parseBRL(e.target.value);
                          const valorValido = Math.min(Math.max(0, valor), item.valorAtualBRL);
                          updateItem(item.id, { valorResgateBRL: valorValido });
                          setEditingValues((prev) => { const next = { ...prev }; delete next[item.id]; return next; });
                        }}
                        style={{
                          flex: 1,
                          border: "1px solid #FECACA",
                          borderRadius: 4,
                          padding: "4px 8px",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#B91C1C",
                          textAlign: "right",
                          background: "white",
                          outline: "none",
                        }}
                        placeholder={formatInputBRL(Math.abs(item.movimentacaoBRL))}
                      />
                      <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>
                        de {formatBRL(item.valorAtualBRL)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {filtrados.length === 0 && (
        <div style={{
          border: "1px solid #BFDBFE", borderRadius: 8, padding: 32,
          textAlign: "center", fontSize: 13, color: "#9CA3AF", backgroundColor: "white",
        }}>
          {planoAcao.length === 0
            ? "Plano de ação vazio. Defina a carteira recomendada na etapa anterior."
            : "Nenhum item corresponde ao filtro selecionado."}
        </div>
      )}

      {/* Notas do consultor */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Notas e justificativas do plano</label>
        <textarea
          value={notasConsultor}
          onChange={(e) => onNotasConsultor(e.target.value)}
          placeholder="Explique os pontos principais do plano, justifique as movimentações relevantes..."
          style={{
            minHeight: 120, padding: "8px 10px", borderRadius: 8,
            border: "1px solid #BFDBFE", fontSize: 13, color: "#111827",
            resize: "vertical", outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", width: "100%",
          }}
        />
      </div>
    </div>
  );
}
