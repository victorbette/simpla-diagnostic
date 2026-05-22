import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
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

const ACAO_BADGE_STYLE: Record<ItemPlanoAcao["tipo"], { bg: string; color: string; label: string }> = {
  manter:          { bg: "#F0F7FF", color: "#111827", label: "Manter" },
  aportar:         { bg: "#EAF0F5", color: "#1E40AF", label: "Aportar" },
  resgatar_parcial:{ bg: "#EFF6FF", color: "#2563EB", label: "Resgatar parcial" },
  resgatar_total:  { bg: "#FEE2E2", color: "#B91C1C", label: "Resgatar tudo" },
  novo_ativo:      { bg: "#DBEAFE", color: "#000000", label: "Novo ativo" },
};

function AcaoBadge({ tipo }: { tipo: ItemPlanoAcao["tipo"] }) {
  const { bg, color, label } = ACAO_BADGE_STYLE[tipo];
  return (
    <span style={{ backgroundColor: bg, color, fontSize: 11, borderRadius: 4, padding: "2px 6px" }}>
      {label}
    </span>
  );
}

export function Etapa3PlanoAcao({
  planoAcao,
  onPlanoAcao,
  patrimonio: _patrimonio,
  notaConsultor,
  onNotaConsultor,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  function updateItem(id: string, patch: Partial<ItemPlanoAcao>) {
    onPlanoAcao(planoAcao.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const ap = planoAcao
      .filter((p) => p.movimentacaoBRL > 0)
      .reduce((s, p) => s + p.movimentacaoBRL, 0);
    const re = planoAcao
      .filter((p) => p.movimentacaoBRL < 0)
      .reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);
    return {
      totalAportes: ap,
      totalResgates: re,
      saldoLiquido: ap - re,
      nMovs: planoAcao.filter((p) => p.tipo !== "manter").length,
    };
  }, [planoAcao]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return planoAcao;
    if (filtro === "resgatar")
      return planoAcao.filter(
        (p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total"
      );
    return planoAcao.filter((p) => p.tipo === filtro);
  }, [planoAcao, filtro]);

  // Group by SIMPLA_CARDS order, using item.card
  const cardsComItens: SimplaCardId[] = SIMPLA_CARDS.map((c) => c.id).filter((k) =>
    filtrados.some((p) => p.card === k)
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div style={{ borderRadius: 10, border: "1px solid #BFDBFE", borderTop: "3px solid #15803D", padding: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Total aportes</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(totalAportes)}</p>
        </div>
        <div style={{ borderRadius: 10, border: "1px solid #BFDBFE", borderTop: "3px solid #B91C1C", padding: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Total resgates</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{formatBRL(totalResgates)}</p>
        </div>
        <div style={{ borderRadius: 10, border: "1px solid #BFDBFE", borderTop: `3px solid ${saldoLiquido >= 0 ? "#15803D" : "#B91C1C"}`, padding: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Saldo líquido</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C", margin: 0 }}>{formatBRL(saldoLiquido)}</p>
        </div>
        <div style={{ borderRadius: 10, border: "1px solid #BFDBFE", borderTop: "3px solid #1E3A8A", padding: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Movimentações</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#000000", margin: 0 }}>{nMovs}</p>
        </div>
      </div>

      {/* Filter buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(
          [
            ["todos", "Todos"],
            ["aportar", "Aportar"],
            ["resgatar", "Resgatar"],
            ["manter", "Manter"],
            ["novo_ativo", "Novo ativo"],
          ] as [Filtro, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              border: filtro === f ? "1.5px solid #000000" : "1px solid #BFDBFE",
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
          <div key={cardId} className="rounded-lg border overflow-hidden">
            <div style={{ backgroundColor: "#F0F7FF", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F0F7FF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: card.cor }}
                />
                <span style={{ fontWeight: 600, fontSize: 14, color: "#000000" }}>
                  {card.grupo} — {card.label}
                </span>
              </div>
              <span
                style={{ fontSize: 13, fontWeight: 500, color: groupTotal > 0 ? "#15803D" : groupTotal < 0 ? "#B91C1C" : "#9CA3AF" }}
              >
                {groupTotal === 0
                  ? "—"
                  : `${groupTotal > 0 ? "+" : ""}${formatBRL(groupTotal)}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: "#1E3A8A" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: 11 }}>Ativo</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Atual R$</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Meta R$</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>Movimentação</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: 11 }}>Ação</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: 11 }}>Observação</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "white", fontWeight: 600, fontSize: 11 }}>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <AcaoBadge tipo={item.tipo} />
                          <span
                            className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium"
                            style={{
                              backgroundColor: card.cor + "18",
                              color: card.cor,
                            }}
                          >
                            {card.label}
                          </span>
                          <span className="font-medium">{item.nomeAtivo}</span>
                          {item.segmento && (
                            <span className="text-muted-foreground">· {item.segmento}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatBRL(item.valorAtualBRL)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatBRL(item.valorMetaBRL)}
                      </td>
                      <td
                        style={{ padding: "8px 12px", textAlign: "right", fontWeight: 500, whiteSpace: "nowrap", color: item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF" }}
                      >
                        {item.movimentacaoBRL === 0
                          ? "—"
                          : `${item.movimentacaoBRL > 0 ? "+" : ""}${formatBRL(
                              item.movimentacaoBRL
                            )}`}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.tipo}
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                          onChange={(e) =>
                            updateItem(item.id, {
                              tipo: e.target.value as ItemPlanoAcao["tipo"],
                            })
                          }
                        >
                          <option value="manter">Manter</option>
                          <option value="aportar">Aportar</option>
                          <option value="resgatar_parcial">Resgatar parcialmente</option>
                          <option value="resgatar_total">Resgatar tudo</option>
                          <option value="novo_ativo">Novo ativo</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 min-w-[140px]">
                        <Input
                          className="h-7 text-xs"
                          value={item.observacao}
                          onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                          placeholder="observação..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.prioridade}
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                          onChange={(e) =>
                            updateItem(item.id, {
                              prioridade: e.target.value as ItemPlanoAcao["prioridade"],
                            })
                          }
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {filtrados.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {planoAcao.length === 0
            ? "Plano de ação vazio. Defina a carteira recomendada na etapa anterior."
            : "Nenhum item corresponde ao filtro selecionado."}
        </div>
      )}

      {/* Nota do consultor */}
      <div className="space-y-2">
        <Label>Notas e justificativas do plano</Label>
        <Textarea
          value={notaConsultor}
          onChange={(e) => onNotaConsultor(e.target.value)}
          placeholder="Explique os pontos principais do plano, justifique as movimentações relevantes..."
          className="min-h-[140px]"
        />
      </div>

    </div>
  );
}
