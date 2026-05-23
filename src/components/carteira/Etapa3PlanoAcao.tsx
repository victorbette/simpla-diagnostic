import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ItemPlanoAcao } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { SIMPLA_CARDS, getCard } from "@/lib/carteira/segmentos";
import type { SimplaCardId } from "@/lib/carteira/segmentos";

interface Props {
  planoAcao: ItemPlanoAcao[];
  onPlanoAcao: (p: ItemPlanoAcao[]) => void;
  patrimonio: number;
  notaConsultor: string;
  onNotaConsultor: (s: string) => void;
}

type Filtro = "todos" | "aportar" | "resgatar" | "manter" | "novo_ativo";

const TIPO_CONFIG: Record<ItemPlanoAcao["tipo"], { bg: string; color: string; label: string }> = {
  manter:           { bg: "#F0F7FF",  color: "#374151", label: "→ Manter" },
  aportar:          { bg: "#DCFCE7",  color: "#15803D", label: "↑ Aportar" },
  resgatar_parcial: { bg: "#FEE2E2",  color: "#B91C1C", label: "↓ Resgatar" },
  resgatar_total:   { bg: "#FEE2E2",  color: "#B91C1C", label: "↓ Resgatar tudo" },
  novo_ativo:       { bg: "#DBEAFE",  color: "#1E40AF", label: "Novo ativo" },
};

function AcaoBadge({ tipo }: { tipo: ItemPlanoAcao["tipo"] }) {
  const { bg, color, label } = TIPO_CONFIG[tipo];
  return (
    <span style={{
      backgroundColor: bg, color, fontSize: 11, borderRadius: 4,
      padding: "2px 6px", whiteSpace: "nowrap" as const, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function SInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        border: `0.5px solid ${focused ? "#2563EB" : "#BFDBFE"}`,
        borderRadius: 6, padding: "4px 8px", fontSize: 12,
        backgroundColor: "white", color: "#111827", outline: "none",
        width: "100%", boxSizing: "border-box" as const,
        boxShadow: focused ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
        ...props.style,
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

export function Etapa3PlanoAcao({
  planoAcao, onPlanoAcao, patrimonio: _patrimonio, notaConsultor, onNotaConsultor,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  function updateItem(id: string, patch: Partial<ItemPlanoAcao>) {
    onPlanoAcao(planoAcao.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const ap = planoAcao.filter((p) => p.movimentacaoBRL > 0).reduce((s, p) => s + p.movimentacaoBRL, 0);
    const re = planoAcao.filter((p) => p.movimentacaoBRL < 0).reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);
    return { totalAportes: ap, totalResgates: re, saldoLiquido: ap - re, nMovs: planoAcao.filter((p) => p.tipo !== "manter").length };
  }, [planoAcao]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return planoAcao;
    if (filtro === "resgatar") return planoAcao.filter((p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total");
    return planoAcao.filter((p) => p.tipo === filtro);
  }, [planoAcao, filtro]);

  const cardsComItens: SimplaCardId[] = SIMPLA_CARDS.map((c) => c.id).filter((k) =>
    filtrados.some((p) => p.card === k)
  );

  const selectStyle: React.CSSProperties = {
    border: "0.5px solid #BFDBFE", borderRadius: 6,
    padding: "4px 6px", fontSize: 12,
    backgroundColor: "white", color: "#111827",
    cursor: "pointer", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total Aportes",   value: formatBRL(totalAportes),  color: "#15803D", border: "#15803D" },
          { label: "Total Resgates",  value: formatBRL(totalResgates), color: "#B91C1C", border: "#B91C1C" },
          { label: "Saldo Líquido",   value: formatBRL(saldoLiquido),  color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C", border: "#1E3A8A" },
          { label: "Movimentações",   value: String(nMovs),            color: "#111827", border: "#6B7280" },
        ].map(({ label, value, color, border }) => (
          <div key={label} style={{
            border: "0.5px solid #BFDBFE", borderTop: `3px solid ${border}`,
            borderRadius: 8, padding: "12px 14px", backgroundColor: "white",
          }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
        {([
          ["todos", "Todos"],
          ["aportar", "Aportar"],
          ["resgatar", "Resgatar"],
          ["manter", "Manter"],
          ["novo_ativo", "Novo ativo"],
        ] as [Filtro, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "4px 12px", borderRadius: 6,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: filtro === f ? "none" : "0.5px solid #BFDBFE",
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
        const card = getCard(cardId);
        const groupItems = filtrados.filter((p) => p.card === cardId);
        const groupTotal = groupItems.reduce((s, p) => s + p.movimentacaoBRL, 0);

        return (
          <div key={cardId} style={{ border: "0.5px solid #BFDBFE", borderRadius: 8, overflow: "hidden", backgroundColor: "white" }}>
            {/* Group header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "#F8FAFC", padding: "8px 16px",
              borderBottom: "0.5px solid #BFDBFE",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: card.cor, display: "inline-block" }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{card.grupo} — {card.label}</span>
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
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr 0.8fr",
              gap: 8, padding: "8px 16px",
              backgroundColor: "#1E3A8A",
            }}>
              {["Ativo", "Atual R$", "Meta R$", "Movimentação", "Ação", "Observação", "Prioridade"].map((h) => (
                <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {groupItems.map((item) => {
              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.5fr 0.8fr",
                    gap: 8, padding: "10px 16px",
                    borderTop: "0.5px solid #BFDBFE",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                >
                  {/* Col: Ativo */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const }}>
                      <AcaoBadge tipo={item.tipo} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                    </div>
                    {item.segmento && (
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{card.label} · {item.segmento}</span>
                    )}
                  </div>

                  {/* Col: Atual */}
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorAtualBRL)}</span>

                  {/* Col: Meta */}
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorMetaBRL)}</span>

                  {/* Col: Movimentação */}
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF",
                  }}>
                    {item.movimentacaoBRL === 0
                      ? "—"
                      : `${item.movimentacaoBRL > 0 ? "+" : "−"}${formatBRL(Math.abs(item.movimentacaoBRL))}`
                    }
                  </span>

                  {/* Col: Ação */}
                  <select
                    value={item.tipo}
                    onChange={(e) => updateItem(item.id, { tipo: e.target.value as ItemPlanoAcao["tipo"] })}
                    style={selectStyle}
                  >
                    <option value="manter">Manter</option>
                    <option value="aportar">Aportar</option>
                    <option value="resgatar_parcial">Resgatar parcialmente</option>
                    <option value="resgatar_total">Resgatar tudo</option>
                    <option value="novo_ativo">Novo ativo</option>
                  </select>

                  {/* Col: Observação */}
                  <SInput
                    value={item.observacao}
                    onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                    placeholder="observação..."
                  />

                  {/* Col: Prioridade */}
                  <select
                    value={item.prioridade}
                    onChange={(e) => updateItem(item.id, { prioridade: e.target.value as ItemPlanoAcao["prioridade"] })}
                    style={selectStyle}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Empty state */}
      {filtrados.length === 0 && (
        <div style={{ border: "0.5px solid #BFDBFE", borderRadius: 8, padding: 32, textAlign: "center", fontSize: 13, color: "#9CA3AF", backgroundColor: "white" }}>
          {planoAcao.length === 0
            ? "Plano de ação vazio. Defina a carteira recomendada na etapa anterior."
            : "Nenhum item corresponde ao filtro selecionado."}
        </div>
      )}

      {/* Nota do consultor */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Label style={{ fontSize: 12, color: "#374151" }}>Notas e justificativas do plano</Label>
        <Textarea
          value={notaConsultor}
          onChange={(e) => onNotaConsultor(e.target.value)}
          placeholder="Explique os pontos principais do plano, justifique as movimentações relevantes..."
          className="min-h-[120px]"
        />
      </div>
    </div>
  );
}
