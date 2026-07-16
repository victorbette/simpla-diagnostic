import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META } from "@/lib/carteira/types";
import { genId, formatBRL, formatPct } from "@/lib/carteira/calculos";

const SEG_COLORS: Record<string, { bg: string; color: string }> = {
  "Pós-fixado":     { bg: "#DBEAFE", color: "#1E40AF" },
  "Inflação":       { bg: "#FEF3C7", color: "#B45309" },
  "Prefixado":      { bg: "#DCFCE7", color: "#15803D" },
  "Fundos RF":      { bg: "#F3F4F6", color: "#374151" },
  "Fundos MM":      { bg: "#F3F4F6", color: "#374151" },
  "COE":            { bg: "#F5F3FF", color: "#6D28D9" },
  "Renda Variável": { bg: "#FEF3C7", color: "#B45309" },
  "Renda Fixa":     { bg: "#DBEAFE", color: "#1E40AF" },
};

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

interface QtyInputProps {
  value: number | undefined;
  onChange: (v: number) => void;
}

function QtyInput({ value, onChange }: QtyInputProps) {
  const [display, setDisplay] = useState("");
  const [focused, setFocused] = useState(false);

  const formatted = value && value > 0
    ? value.toLocaleString("pt-BR", { maximumFractionDigits: 6 })
    : "";

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? display : formatted}
      onChange={(e) => {
        setDisplay(e.target.value);
        const v = parseFloat(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
        onChange(isNaN(v) ? 0 : v);
      }}
      onFocus={() => {
        setFocused(true);
        setDisplay(value && value > 0 ? String(value).replace(".", ",") : "");
      }}
      onBlur={() => setFocused(false)}
      placeholder="0"
      style={{
        width: "100%", border: "none", background: "transparent", outline: "none",
        fontSize: 12, color: "#111827", textAlign: "right", padding: 0,
      }}
    />
  );
}

interface CotacaoInputProps {
  value: number | undefined;
  onChange: (v: number) => void;
}

function CotacaoInput({ value, onChange }: CotacaoInputProps) {
  const [display, setDisplay] = useState("");
  const [focused, setFocused] = useState(false);

  const formatted = value && value > 0
    ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : "";

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? display : formatted}
      onChange={(e) => {
        setDisplay(e.target.value);
        const v = parseFloat(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
        onChange(isNaN(v) ? 0 : v);
      }}
      onFocus={() => {
        setFocused(true);
        setDisplay(value && value > 0 ? value.toFixed(4).replace(/\.?0+$/, "").replace(".", ",") : "");
      }}
      onBlur={() => setFocused(false)}
      placeholder="0,00"
      style={{
        width: "100%", border: "none", background: "transparent", outline: "none",
        fontSize: 12, color: "#374151", textAlign: "right", padding: 0,
      }}
    />
  );
}

const RF_CARDS: CardId[] = ["resgate_longo", "resgate_rapido"];
const RV_CARDS: CardId[] = ["acoes", "fiis", "exterior", "cripto"];
const USD_CARDS: CardId[] = ["exterior", "cripto"];

interface Props {
  cardId: CardId;
  ativos: Ativo[];
  modo: "atual" | "recomendada";
  patrimonio: number;
  metaPct?: number;
  ativosAtuaisRef?: Ativo[];
  usdBrl?: number;
  onUsdBrlChange?: (v: number) => void;
  onAdd?: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, partial: Partial<Ativo>) => void;
}

export function CarteiraCard({
  cardId, ativos, modo, patrimonio, metaPct, ativosAtuaisRef,
  usdBrl = 5.0, onUsdBrlChange,
  onAdd, onRemove, onChange,
}: Props) {
  const meta = CARD_META[cardId];
  const isRFCard = RF_CARDS.includes(cardId);
  const isRVCard = RV_CARDS.includes(cardId);
  const isUSDCard = USD_CARDS.includes(cardId);
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
  const [usdFocused, setUsdFocused] = useState(false);
  const [usdLocalVal, setUsdLocalVal] = useState("");

  // Grid template and column headers by card type
  let gridTemplate: string;
  let headers: string[];
  if (isRFCard) {
    gridTemplate = "2.5fr 110px 100px 90px 28px";
    headers = ["Nome", "Segmento", "Vencimento", "R$", ""];
  } else if (cardId === "exterior") {
    gridTemplate = "2fr 100px 65px 115px 85px 28px";
    headers = ["Nome", "Segmento", "Qtd", "Cotação USD", "R$ Atual", ""];
  } else {
    // acoes, fiis, cripto
    gridTemplate = "2fr 65px 115px 85px 28px";
    headers = ["Nome", "Qtd", "Cotação", "R$ Atual", ""];
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
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{meta.sub}</div>
            </div>

            {/* USD/BRL câmbio — exterior only */}
            {cardId === "exterior" && onUsdBrlChange && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4, marginLeft: 8,
                padding: "3px 8px", border: "1px solid #BFDBFE", borderRadius: 6, backgroundColor: "#F8FAFC",
              }}>
                <span style={{ fontSize: 10, color: "#9CA3AF", flexShrink: 0 }}>USD/BRL</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={usdFocused ? usdLocalVal : usdBrl.toFixed(4)}
                  onFocus={() => { setUsdFocused(true); setUsdLocalVal(usdBrl.toFixed(4)); }}
                  onChange={(e) => {
                    setUsdLocalVal(e.target.value);
                    const v = parseFloat(e.target.value.replace(",", "."));
                    if (!isNaN(v) && v > 0) onUsdBrlChange(v);
                  }}
                  onBlur={() => setUsdFocused(false)}
                  style={{
                    width: 60, textAlign: "right", fontSize: 11, fontWeight: 500,
                    border: "none", background: "transparent", outline: "none",
                    color: "#374151", padding: 0,
                  }}
                />
              </div>
            )}
          </div>

          {modo === "recomendada" && metaPct !== undefined ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: meta.cor }}>
                {formatBRL((metaPct / 100) * patrimonio)}
              </div>
              <div style={{ fontSize: 11, color: meta.cor, fontWeight: 600 }}>
                Meta {metaPct.toFixed(1)}%
              </div>
              {(() => {
                const brlAtual = (ativosAtuaisRef ?? [])
                  .filter((a) => a.card === cardId)
                  .reduce((s, a) => s + a.valorBRL, 0);
                const brlMeta = (metaPct / 100) * patrimonio;
                const dif = brlMeta - brlAtual;
                if (Math.abs(dif) < 1) return (
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>Alinhado</div>
                );
                return (
                  <div style={{ fontSize: 11, fontWeight: 600, color: dif > 0 ? "#15803D" : "#B91C1C" }}>
                    {dif > 0 ? "+" : ""}{formatBRL(dif)}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatBRL(total)}</div>
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
        }}>
          {headers.map((h, i) => (
            <span key={i} style={{
              fontSize: 10, color: "#9CA3AF",
              textTransform: "uppercase", letterSpacing: "0.04em",
              textAlign: i >= 2 ? "right" : "left",
            }}>
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Asset rows */}
      {ativos.map((ativo) => {
        const segCor = SEG_COLORS[ativo.segmento];
        const isHover = hoverRow === ativo.id;
        const isEditSeg = editingSegId === ativo.id;
        const isCalc = (ativo.quantidade ?? 0) > 0 && (ativo.cotacaoAtual ?? 0) > 0;

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
            <input
              value={ativo.nome}
              onChange={(e) => onChange(ativo.id, { nome: e.target.value })}
              placeholder="Nome do ativo..."
              style={{
                border: "none", background: "transparent", outline: "none",
                fontSize: 12, color: "#111827", width: "100%", padding: 0,
              }}
            />

            {/* Segmento — RF cards and exterior */}
            {(isRFCard || cardId === "exterior") && (
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
                  {meta.segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <span
                  onClick={() => meta.segmentos.length > 0 && setEditingSegId(ativo.id)}
                  style={{
                    display: "inline-block",
                    cursor: meta.segmentos.length > 0 ? "pointer" : "default",
                    fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                    backgroundColor: segCor?.bg ?? "#F3F4F6",
                    color: segCor?.color ?? "#374151",
                  }}
                  title={meta.segmentos.length > 0 ? "Clique para editar" : undefined}
                >
                  {ativo.segmento || "—"}
                </span>
              )
            )}

            {/* Vencimento — RF only */}
            {isRFCard && (
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

            {/* Qtd — RV only */}
            {isRVCard && (
              <QtyInput
                value={ativo.quantidade}
                onChange={(novaQtd) => {
                  const novoValor = novaQtd > 0 && (ativo.cotacaoAtual ?? 0) > 0
                    ? novaQtd * (ativo.cotacaoAtual ?? 0) * (isUSDCard ? usdBrl : 1)
                    : ativo.valorBRL;
                  onChange(ativo.id, { quantidade: novaQtd, valorBRL: novoValor });
                }}
              />
            )}

            {/* Cotação — RV only */}
            {isRVCard && (
              <CotacaoInput
                value={ativo.cotacaoAtual}
                onChange={(novaCotacao) => {
                  const novoValor = (ativo.quantidade ?? 0) > 0 && novaCotacao > 0
                    ? (ativo.quantidade ?? 0) * novaCotacao * (isUSDCard ? usdBrl : 1)
                    : ativo.valorBRL;
                  onChange(ativo.id, { cotacaoAtual: novaCotacao, valorBRL: novoValor });
                }}
              />
            )}

            {/* R$ / Valor */}
            {isRFCard ? (
              <ValueInput value={ativo.valorBRL} onChange={(v) => onChange(ativo.id, { valorBRL: v })} />
            ) : isCalc ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#374151" }}>
                  {ativo.valorBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{
                  fontSize: 9, padding: "1px 4px", borderRadius: 3, flexShrink: 0,
                  backgroundColor: "#EFF6FF", color: "#1E40AF", fontWeight: 700,
                }}>
                  CALC
                </span>
              </div>
            ) : (
              <ValueInput value={ativo.valorBRL} onChange={(v) => onChange(ativo.id, { valorBRL: v })} />
            )}

            {/* Trash */}
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
