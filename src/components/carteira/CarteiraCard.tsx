import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META, SEGMENTOS_POR_CLASSE } from "@/lib/carteira/types";
import { genId, formatBRL, formatPct } from "@/lib/carteira/calculos";

const SEG_BAR_COLORS: Record<string, string> = {
  "Pós-fixado": "#1E40AF",
  "Inflação":   "#B45309",
  "Prefixado":  "#15803D",
  "Fundos RF":  "#6B7280",
  "Fundos MM":  "#6B7280",
  "COE":        "#6B7280",
};

interface ValueInputProps {
  value: number;
  onChange: (v: number) => void;
}

function ValueInput({ value, onChange }: ValueInputProps) {
  const [display, setDisplay] = useState(() => value === 0 ? "" : value.toFixed(2).replace(".", ","));
  const [focused, setFocused] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDisplay(e.target.value);
    const parsed = parseFloat(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
    if (!isNaN(parsed)) onChange(parsed);
  }

  function handleBlur() {
    setFocused(false);
    const parsed = parseFloat(display.replace(",", ".").replace(/[^\d.]/g, ""));
    if (!isNaN(parsed)) {
      setDisplay(parsed.toFixed(2).replace(".", ","));
      onChange(parsed);
    } else {
      setDisplay(value === 0 ? "" : value.toFixed(2).replace(".", ","));
    }
  }

  function handleFocus() {
    setFocused(true);
    if (value === 0) setDisplay("");
    else setDisplay(value.toFixed(2).replace(".", ","));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? display : (value === 0 ? "" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="0,00"
      style={{
        width: "100%", border: "none", background: "transparent", outline: "none",
        fontSize: 12, color: "#111827", textAlign: "right", padding: 0,
      }}
    />
  );
}

const RF_CARDS: CardId[] = ["resgate_longo", "resgate_rapido"];
// Cards with predefined segmento options — cripto uses free text
const DROPDOWN_SEG_CARDS: CardId[] = ["resgate_longo", "resgate_rapido", "acoes", "fiis", "exterior"];

interface Props {
  cardId: CardId;
  ativos: Ativo[];
  modo: "atual" | "recomendada";
  patrimonio: number;
  metaPct?: number;
  ativosAtuaisRef?: Ativo[];
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onChange: (id: string, partial: Partial<Ativo>) => void;
}

export function CarteiraCard({
  cardId, ativos, modo, patrimonio, metaPct,
  onAdd, onRemove, onChange,
}: Props) {
  const meta = CARD_META[cardId];
  const isRFCard = RF_CARDS.includes(cardId);
  const hasDropdownSeg = DROPDOWN_SEG_CARDS.includes(cardId);
  const temSegs = meta.segmentos.length > 0;
  const total = ativos.reduce((s, a) => s + a.valorBRL, 0);
  const pctCarteira = patrimonio > 0 ? (total / patrimonio) * 100 : 0;

  const barSegments: { seg: string; pct: number; color: string }[] = [];
  if (temSegs && total > 0) {
    const bySegmento: Record<string, number> = {};
    for (const a of ativos) {
      bySegmento[a.segmento] = (bySegmento[a.segmento] ?? 0) + a.valorBRL;
    }
    for (const [seg, val] of Object.entries(bySegmento)) {
      barSegments.push({ seg, pct: (val / total) * 100, color: SEG_BAR_COLORS[seg] ?? "#6B7280" });
    }
  }

  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [editingSegId, setEditingSegId] = useState<string | null>(null);

  // Grid template and column headers by card type
  let gridTemplate: string;
  let headers: string[];
  if (isRFCard) {
    if (modo === "recomendada") {
      gridTemplate = "2.5fr 110px 90px 28px";
      headers = ["Nome", "Segmento", "R$", ""];
    } else {
      gridTemplate = "2.5fr 110px 100px 90px 28px";
      headers = ["Nome", "Segmento", "Vencimento", "R$", ""];
    }
  } else {
    // acoes, fiis, exterior, cripto — 110px Segmento para alinhar com RF
    gridTemplate = "2fr 110px 85px 28px";
    headers = ["Nome", "Segmento", "R$ Atual", ""];
  }

  return (
    <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>

      {/* Card header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #EFF6FF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              backgroundColor: meta.corBg, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: meta.cor }}>{meta.label.charAt(0)}</span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{meta.label}</div>
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{meta.sub}</div>
            </div>
          </div>

          {modo === "recomendada" && metaPct !== undefined ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: meta.cor }}>
                {formatBRL((metaPct / 100) * patrimonio)}
              </div>
              <div style={{ fontSize: 11, color: meta.cor, fontWeight: 600 }}>
                Meta {metaPct.toFixed(1)}%
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatBRL(total)}</div>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>{formatPct(pctCarteira)}</div>
            </div>
          )}
        </div>

        {/* Composition bar */}
        <div style={{ height: 3, borderRadius: 2, overflow: "hidden", marginTop: 8, backgroundColor: "#F3F4F6" }}>
          {total > 0 && (
            temSegs && barSegments.length > 0 ? (
              <div style={{ display: "flex", height: "100%" }}>
                {barSegments.map((bs, i) => (
                  <div key={i} style={{ width: `${bs.pct}%`, backgroundColor: bs.color }} />
                ))}
              </div>
            ) : (
              <div style={{ width: `${Math.min(pctCarteira, 100)}%`, height: "100%", backgroundColor: meta.cor }} />
            )
          )}
        </div>
      </div>

      {/* Column headers */}
      {ativos.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: gridTemplate,
          gap: 4, padding: "4px 12px",
          backgroundColor: "#F8FAFC", borderBottom: "1px solid #EFF6FF",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Nome
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Segmento
            </span>
          </div>
          {isRFCard && modo !== "recomendada" && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Vencimento
              </span>
            </div>
          )}
          <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>
            {isRFCard && modo !== "recomendada" ? "R$" : headers[2] ?? "R$"}
          </span>
          <span />
        </div>
      )}

      {/* Asset rows */}
      {ativos.map((ativo) => {
        const isHover = hoverRow === ativo.id;
        const isEditSeg = editingSegId === ativo.id;

        return (
          <div
            key={ativo.id}
            style={{
              display: "grid", gridTemplateColumns: gridTemplate,
              gap: 4, padding: "5px 12px",
              borderBottom: "1px solid #F3F4F6", alignItems: "center",
              backgroundColor: isHover ? "#F8FAFC" : "white",
              transition: "background 150ms",
            }}
            onMouseEnter={() => setHoverRow(ativo.id)}
            onMouseLeave={() => setHoverRow(null)}
          >
            {/* Nome */}
            {modo === "recomendada" ? (
              <span style={{
                fontSize: 12, color: "#374151", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block",
              }}>
                {ativo.nome || "—"}
              </span>
            ) : (
              <input
                value={ativo.nome}
                onChange={(e) => onChange(ativo.id, { nome: e.target.value })}
                placeholder="Nome do ativo..."
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 12, color: "#111827", width: "100%", padding: 0,
                }}
              />
            )}

            {/* Segmento — dropdown para cards com opções predefinidas; texto livre para cripto */}
            {hasDropdownSeg ? (
              isEditSeg ? (
                <select
                  autoFocus
                  value={ativo.segmento}
                  onChange={(e) => { onChange(ativo.id, { segmento: e.target.value }); setEditingSegId(null); }}
                  onBlur={() => setEditingSegId(null)}
                  style={{
                    fontSize: 11, border: "1px solid #BFDBFE", borderRadius: 4,
                    padding: "2px 4px", backgroundColor: "white", cursor: "pointer", outline: "none",
                  }}
                >
                  {(SEGMENTOS_POR_CLASSE[cardId] ?? meta.segmentos).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <span
                  onClick={() => setEditingSegId(ativo.id)}
                  style={{
                    display: "inline-block",
                    cursor: "pointer",
                    fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                    backgroundColor: "#F3F4F6",
                    color: "#374151",
                    border: "1.5px solid #9CA3AF",
                  }}
                  title="Clique para editar"
                >
                  {ativo.segmento || "—"}
                </span>
              )
            ) : (
              <input
                type="text"
                value={ativo.segmento ?? ""}
                onChange={(e) => onChange(ativo.id, { segmento: e.target.value })}
                placeholder="Ex: Bitcoin, Ethereum..."
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 11, color: "#6B7280", width: "100%", padding: 0,
                }}
              />
            )}

            {/* Vencimento — RF only, editable in modo atual */}
            {isRFCard && modo !== "recomendada" && (
              <input
                value={ativo.vencimento ?? ""}
                onChange={(e) => onChange(ativo.id, { vencimento: e.target.value })}
                placeholder="mm/aaaa"
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 11, color: "#6B7280", width: "100%", padding: 0,
                }}
              />
            )}

            {/* R$ / Valor */}
            {modo === "recomendada" ? (
              <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right", display: "block" }}>
                {ativo.valorBRL > 0 ? ativo.valorBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}
              </span>
            ) : (
              <ValueInput value={ativo.valorBRL} onChange={(v) => onChange(ativo.id, { valorBRL: v })} />
            )}

            {/* Trash */}
            {onRemove && (
              <button
                onClick={() => onRemove(ativo.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 22, height: 22, borderRadius: 4,
                  border: "none", background: "none", cursor: "pointer",
                  opacity: isHover ? 1 : 0, transition: "opacity 150ms",
                  color: "#B91C1C",
                }}
              >
                <Trash2 size={13} />
              </button>
            )}

            {modo === "recomendada" && ativo.adicionadoManualmente && (
              <div style={{ gridColumn: "1 / -1", paddingBottom: 4 }}>
                <input
                  type="text"
                  value={ativo.observacao ?? ""}
                  onChange={(e) => onChange(ativo.id, { observacao: e.target.value })}
                  placeholder="Justifique a inclusão deste ativo não previsto na recomendação..."
                  style={{
                    width: "100%",
                    border: ativo.observacao?.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 12,
                    color: "#374151",
                    background: ativo.observacao?.trim() ? "#F0FDF4" : "#FFF5F5",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {!ativo.observacao?.trim() && (
                  <div style={{ fontSize: 10, color: "#B91C1C", marginTop: 2 }}>
                    Observação obrigatória para ativos adicionados manualmente
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add row */}
      {onAdd && (
        <div style={{ padding: "6px 12px" }}>
          <button
            onClick={onAdd}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "#2563EB", padding: "2px 0",
            }}
          >
            <Plus size={13} />
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}

export function makeNovoAtivo(cardId: CardId): Ativo {
  const meta = CARD_META[cardId];
  const segmento = meta.segmentos[0] ?? "";
  return { id: genId(), card: cardId, nome: "", segmento, valorBRL: 0 };
}
