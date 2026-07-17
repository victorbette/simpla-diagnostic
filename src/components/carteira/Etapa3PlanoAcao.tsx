import { useState, useMemo } from "react";
import type { PlanoAcaoItem, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CurrencyInput } from "@/components/CurrencyInput";

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

function movEfetivo(item: PlanoAcaoItem): number {
  if (item.acao === "aportar" || item.acao === "novo") {
    return item.movimentacaoEditada ?? item.movimentacaoBRL;
  }
  if (item.acao === "resgatar_parcial" && item.valorResgateBRL !== undefined) {
    return -item.valorResgateBRL;
  }
  return item.movimentacaoBRL;
}

function exigeObservacao(item: PlanoAcaoItem): boolean {
  if (item.adicionadoManualmente === true) return true;

  const foiEditado =
    item.movimentacaoEditada !== undefined &&
    item.movimentacaoEditada !== Math.abs(item.movimentacaoBRL ?? 0);
  if (foiEditado) return true;

  if (item.acao === "resgatar_parcial") return true;

  if (item.acao === "manter") {
    const valMeta = item.valorMetaBRL ?? 0;
    if (valMeta === 0) return true;

    const valAtual = item.valorAtualBRL ?? 0;
    if (valMeta > 0) {
      const desvio = Math.abs(valAtual - valMeta) / valMeta * 100;
      if (desvio > 5) return true;
    }
  }

  return false;
}

function placeholderObservacao(item: PlanoAcaoItem): string {
  if (item.acao === "novo") return "Justifique a inclusão deste ativo na carteira recomendada...";
  if (item.acao === "manter") {
    if ((item.valorMetaBRL ?? 0) === 0) return "Ativo não consta na carteira recomendada — justifique a manutenção...";
    return "Justifique por que está mantendo o ativo fora da alocação ideal...";
  }
  if (item.acao === "resgatar_parcial") return "Justifique o resgate parcial em vez do total recomendado...";
  return "Motivo da alteração do valor sugerido...";
}

export function Etapa3PlanoAcao({
  planoAcao, onPlanoAcao, notasConsultor, onNotasConsultor, patrimonio: _patrimonio, aporteDisponivel,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editandoMovId, setEditandoMovId] = useState<string | null>(null);
  const [editandoMovVal, setEditandoMovVal] = useState<string>("");
  const [adicionandoAtivo, setAdicionandoAtivo] = useState(false);
  const [novoAtivo, setNovoAtivo] = useState({
    nome: "",
    card: "",
    segmento: "",
    valorBRL: 0,
    observacao: "",
  });

  function resetNovoAtivo() {
    setNovoAtivo({ nome: "", card: "", segmento: "", valorBRL: 0, observacao: "" });
  }

  const [editandoManualId, setEditandoManualId] = useState<string | null>(null);
  const [editandoManual, setEditandoManual] = useState({
    nome: "",
    card: "",
    segmento: "",
    valorBRL: 0,
    observacao: "",
  });

  function updateItem(id: string, patch: Partial<PlanoAcaoItem>) {
    onPlanoAcao(planoAcao.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.acao === "manter") {
        next.movimentacaoBRL = 0;
        next.valorResgateBRL = undefined;
        next.movimentacaoEditada = undefined;
      } else if (patch.acao === "resgatar_parcial") {
        if (p.acao === "manter") {
          next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
        }
        if (next.valorResgateBRL === undefined) {
          next.valorResgateBRL = Math.abs(next.movimentacaoBRL);
        }
        next.movimentacaoEditada = undefined;
      } else if (patch.acao === "resgatar_total") {
        next.movimentacaoEditada = undefined;
        if (p.acao === "manter") {
          next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
        }
      } else if (patch.acao !== undefined && p.acao === "manter") {
        next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
      }
      return next;
    }));
  }

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const ap = planoAcao
      .filter((p) => p.acao === "aportar" || p.acao === "novo")
      .reduce((s, p) => s + movEfetivo(p), 0);
    const re = planoAcao
      .filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total")
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
        const groupTotal = groupItems.reduce((s, p) => s + movEfetivo(p) * (p.acao === "resgatar_parcial" || p.acao === "resgatar_total" ? -1 : 1), 0);

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

            {groupItems.map((item) => {
              // ── Modo edição inline para ativos manuais ──
              if (editandoManualId === item.id) {
                const camposEditOk =
                  editandoManual.nome.trim() !== "" &&
                  editandoManual.card !== "" &&
                  editandoManual.observacao.trim() !== "" &&
                  editandoManual.valorBRL > 0;
                return (
                  <div key={item.id} style={{ borderTop: "1px solid #F3F4F6", padding: 12, background: "#F8FAFF" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", marginBottom: 10 }}>
                      Editando: {item.nomeAtivo}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Classe</label>
                        <select
                          value={editandoManual.card}
                          onChange={(e) => setEditandoManual((p) => ({ ...p, card: e.target.value }))}
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", fontSize: 12, backgroundColor: "white", outline: "none", boxSizing: "border-box" as const }}
                        >
                          <option value="">Selecionar...</option>
                          {CARD_ORDER.map((id) => (
                            <option key={id} value={id}>{CARD_META[id].label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Nome do ativo</label>
                        <input
                          type="text"
                          value={editandoManual.nome}
                          onChange={(e) => setEditandoManual((p) => ({ ...p, nome: e.target.value }))}
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Valor a aportar (R$)</label>
                        <CurrencyInput
                          value={editandoManual.valorBRL}
                          onChange={(v) => setEditandoManual((p) => ({ ...p, valorBRL: v }))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Segmento</label>
                        <input
                          type="text"
                          value={editandoManual.segmento}
                          onChange={(e) => setEditandoManual((p) => ({ ...p, segmento: e.target.value }))}
                          placeholder="Ex: Petróleo, Inflação, ETF..."
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Justificativa (obrigatória)</label>
                      <input
                        type="text"
                        value={editandoManual.observacao}
                        onChange={(e) => setEditandoManual((p) => ({ ...p, observacao: e.target.value }))}
                        placeholder="Justifique a inclusão deste ativo fora da alocação recomendada..."
                        style={{
                          width: "100%",
                          border: editandoManual.observacao.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                          borderRadius: 6, padding: "6px 10px", fontSize: 12,
                          background: editandoManual.observacao.trim() ? "#F0FDF4" : "#FFF5F5",
                          outline: "none", boxSizing: "border-box" as const,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                      <button
                        onClick={() => setEditandoManualId(null)}
                        style={{ fontSize: 12, color: "#6B7280", background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={!camposEditOk}
                        onClick={() => {
                          if (!camposEditOk) return;
                          onPlanoAcao(planoAcao.map((i) =>
                            i.id === editandoManualId
                              ? {
                                  ...i,
                                  nomeAtivo: editandoManual.nome,
                                  card: editandoManual.card as CardId,
                                  segmento: editandoManual.segmento,
                                  movimentacaoBRL: editandoManual.valorBRL,
                                  observacao: editandoManual.observacao,
                                }
                              : i
                          ));
                          setEditandoManualId(null);
                        }}
                        style={{
                          fontSize: 12, fontWeight: 600, color: "white",
                          background: camposEditOk ? "#2563EB" : "#9CA3AF",
                          border: "none", borderRadius: 6, padding: "5px 14px",
                          cursor: camposEditOk ? "pointer" : "not-allowed",
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                );
              }

              const isMovEditable = item.acao === "aportar" || item.acao === "novo";
              const movEditado = isMovEditable && item.movimentacaoEditada !== undefined && item.movimentacaoEditada !== item.movimentacaoBRL;
              const exige = exigeObservacao(item);
              const efetivo = movEfetivo(item);
              const obsNeedsFill = exige && !item.observacao?.trim();

              return (
                <div
                  key={item.id}
                  style={{ borderTop: "1px solid #F3F4F6" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                >
                  <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 14px", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{
                          backgroundColor: TIPO_CONFIG[item.acao].bg,
                          color: TIPO_CONFIG[item.acao].color,
                          fontSize: 10, borderRadius: 4, padding: "1px 5px", flexShrink: 0,
                        }}>
                          {TIPO_CONFIG[item.acao].label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                        {item.adicionadoManualmente && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: "#7C3AED",
                            background: "#F5F3FF", padding: "1px 6px",
                            borderRadius: 99, flexShrink: 0,
                          }}>MANUAL</span>
                        )}
                        {obsNeedsFill && (
                          <span style={{
                            fontSize: 10, color: "#B91C1C", background: "#FEE2E2",
                            padding: "1px 6px", borderRadius: 99, flexShrink: 0,
                          }}>⚠ pendente</span>
                        )}
                      </div>
                      {item.segmento && (
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{meta.label} · {item.segmento}</span>
                      )}
                    </div>

                    <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorAtualBRL)}</span>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                      {item.acao === "manter" ? formatBRL(item.valorAtualBRL) : formatBRL(item.valorMetaBRL)}
                    </span>

                    {/* Movimentação — click-to-edit for aportar/novo */}
                    {isMovEditable && editandoMovId === item.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editandoMovVal}
                        onChange={(e) => setEditandoMovVal(e.target.value)}
                        onBlur={() => {
                          const valor = Math.max(0, parseBRL(editandoMovVal));
                          updateItem(item.id, { movimentacaoEditada: valor });
                          setEditandoMovId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setEditandoMovId(null);
                        }}
                        style={{
                          border: "1px solid #BFDBFE", borderRadius: 4, padding: "3px 6px",
                          fontSize: 12, fontWeight: 600, color: "#15803D",
                          width: "100%", boxSizing: "border-box", outline: "none",
                        }}
                      />
                    ) : isMovEditable ? (
                      <div
                        title="Clique para editar"
                        onClick={() => { setEditandoMovId(item.id); setEditandoMovVal(formatInputBRL(efetivo)); }}
                        style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}
                      >
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: efetivo > 0 ? "#15803D" : "#9CA3AF",
                        }}>
                          {efetivo > 0 ? `+${formatBRL(efetivo)}` : formatBRL(0)}
                        </span>
                        <span style={{ fontSize: 10, color: movEditado ? "#B45309" : "#D1D5DB" }} title={movEditado ? "Valor editado" : "Editar"}>✎</span>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: item.acao === "manter" ? "#9CA3AF" : item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF",
                      }}>
                        {item.acao === "manter" || item.movimentacaoBRL === 0
                          ? formatBRL(0)
                          : `${item.movimentacaoBRL > 0 ? "+" : "−"}${formatBRL(Math.abs(item.movimentacaoBRL))}`
                        }
                      </span>
                    )}

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
                      placeholder={obsNeedsFill ? "obrigatório..." : "observação..."}
                      style={{
                        border: `1px solid ${exige ? (item.observacao?.trim() ? "#15803D" : "#B91C1C") : "#BFDBFE"}`,
                        borderRadius: 6, padding: "3px 6px",
                        fontSize: 12, backgroundColor: "white", color: "#111827", outline: "none",
                        width: "100%", boxSizing: "border-box",
                      }}
                    />

                    {item.adicionadoManualmente ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => {
                            setEditandoManualId(item.id);
                            setEditandoManual({
                              nome: item.nomeAtivo,
                              card: item.card,
                              segmento: item.segmento,
                              valorBRL: item.movimentacaoBRL,
                              observacao: item.observacao ?? "",
                            });
                          }}
                          title="Editar"
                          style={{
                            background: "none", border: "1px solid #E5E7EB",
                            borderRadius: 6, padding: "4px 8px",
                            cursor: "pointer", color: "#6B7280",
                          }}
                        >
                          <i className="ti ti-pencil" style={{ fontSize: 13 }} />
                        </button>
                        <button
                          onClick={() => onPlanoAcao(planoAcao.filter((i) => i.id !== item.id))}
                          title="Excluir"
                          style={{
                            background: "none", border: "1px solid #FCA5A5",
                            borderRadius: 6, padding: "4px 8px",
                            cursor: "pointer", color: "#B91C1C",
                          }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <select
                          value={item.prioridade ?? "baixa"}
                          onChange={(e) => updateItem(item.id, { prioridade: e.target.value as PlanoAcaoItem["prioridade"] })}
                          style={selectStyle}
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                        <button
                          onClick={() => onPlanoAcao(planoAcao.filter((i) => i.id !== item.id))}
                          title="Remover ativo do plano"
                          style={{
                            background: "none", border: "1px solid #FCA5A5",
                            borderRadius: 6, padding: "4px 8px",
                            cursor: "pointer", color: "#B91C1C", flexShrink: 0,
                          }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {item.acao === "resgatar_parcial" && (
                    <div style={{ padding: "0 14px 8px" }}>
                      <div style={{
                        padding: "8px 10px",
                        background: "#FFF5F5",
                        border: "0.5px solid #FECACA",
                        borderRadius: 6,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#B91C1C", flexShrink: 0 }}>
                            Valor a resgatar:
                          </span>
                          <div style={{ flex: 1 }}>
                            <CurrencyInput
                              value={item.valorResgateBRL ?? Math.abs(item.movimentacaoBRL)}
                              onChange={(v) => {
                                const valorValido = Math.min(Math.max(0, v), item.valorAtualBRL);
                                updateItem(item.id, { valorResgateBRL: valorValido });
                              }}
                              placeholder="R$ 0,00"
                            />
                          </div>
                          <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0 }}>
                            de {formatBRL(item.valorAtualBRL)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
                          Saldo após resgate:{" "}
                          <strong style={{ color: "#374151" }}>
                            {formatBRL(Math.max(0, item.valorAtualBRL - (item.valorResgateBRL ?? Math.abs(item.movimentacaoBRL))))}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observação obrigatória contextual */}
                  {exige && (
                    <div style={{ padding: "0 14px 10px" }}>
                      <div style={{
                        display: "flex", flexDirection: "column", gap: 6,
                        padding: "8px 10px",
                        background: item.observacao?.trim() ? "#F0FDF4" : "#FFFBEB",
                        border: `0.5px solid ${item.observacao?.trim() ? "#BBF7D0" : "#FDE68A"}`,
                        borderRadius: 6,
                      }}>
                        <div style={{ fontSize: 10, color: "#B45309" }}>
                          {item.acao === "manter" && ((item.valorMetaBRL ?? 0) === 0 ? "Ativo fora da carteira recomendada — " : "Ativo mantido fora da alocação ideal — ")}
                          {item.acao === "resgatar_parcial" && "Resgate parcial — "}
                          {item.acao === "novo" && "Ativo novo na recomendada — "}
                          {item.acao === "aportar" && item.movimentacaoEditada !== undefined && "Valor alterado — "}
                          observação obrigatória
                        </div>
                        <input
                          type="text"
                          value={item.observacao ?? ""}
                          onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                          placeholder={placeholderObservacao(item)}
                          style={{
                            width: "100%",
                            border: item.observacao?.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                            borderRadius: 6, padding: "6px 10px", fontSize: 12,
                            color: "#374151",
                            background: item.observacao?.trim() ? "#F0FDF4" : "#FFF5F5",
                            boxSizing: "border-box", outline: "none",
                          }}
                        />
                        {!item.observacao?.trim() && (
                          <div style={{ fontSize: 10, color: "#B91C1C" }}>
                            Preencha a observação para continuar
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Adicionar ativo fora da recomendação */}
      {!adicionandoAtivo && (
        <button
          onClick={() => setAdicionandoAtivo(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "1px dashed #BFDBFE",
            borderRadius: 8, padding: "10px 16px",
            fontSize: 13, color: "#2563EB",
            cursor: "pointer", width: "100%", justifyContent: "center",
            marginTop: 8,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Adicionar ativo fora da recomendação
        </button>
      )}

      {adicionandoAtivo && (() => {
        const camposOk =
          novoAtivo.nome.trim() !== "" &&
          novoAtivo.card !== "" &&
          novoAtivo.observacao.trim() !== "" &&
          novoAtivo.valorBRL > 0;
        return (
          <div style={{
            background: "#F8FAFF", border: "1px solid #BFDBFE",
            borderRadius: 10, padding: 16, marginTop: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", marginBottom: 12 }}>
              Novo ativo fora da recomendação
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Classe */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Classe</label>
                <select
                  value={novoAtivo.card}
                  onChange={(e) => setNovoAtivo((p) => ({ ...p, card: e.target.value }))}
                  style={{
                    width: "100%", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    backgroundColor: "white", color: "#111827",
                    cursor: "pointer", outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Selecionar...</option>
                  {CARD_ORDER.map((id) => (
                    <option key={id} value={id}>{CARD_META[id].label}</option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Nome do ativo</label>
                <input
                  type="text"
                  value={novoAtivo.nome}
                  onChange={(e) => setNovoAtivo((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: PETR4, Tesouro IPCA+ 2035..."
                  style={{
                    width: "100%", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Valor */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Valor a aportar (R$)</label>
                <CurrencyInput
                  value={novoAtivo.valorBRL}
                  onChange={(v) => setNovoAtivo((p) => ({ ...p, valorBRL: v }))}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Segmento */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Segmento</label>
                <input
                  type="text"
                  value={novoAtivo.segmento}
                  onChange={(e) => setNovoAtivo((p) => ({ ...p, segmento: e.target.value }))}
                  placeholder="Ex: Petróleo, Inflação, ETF..."
                  style={{
                    width: "100%", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Observação obrigatória */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>
                Justificativa (obrigatória)
              </label>
              <input
                type="text"
                value={novoAtivo.observacao}
                onChange={(e) => setNovoAtivo((p) => ({ ...p, observacao: e.target.value }))}
                placeholder="Justifique a inclusão deste ativo fora da alocação recomendada..."
                style={{
                  width: "100%",
                  border: novoAtivo.observacao.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                  borderRadius: 8, padding: "8px 12px", fontSize: 13,
                  background: novoAtivo.observacao.trim() ? "#F0FDF4" : "#FFF5F5",
                  outline: "none", boxSizing: "border-box" as const,
                }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={() => { setAdicionandoAtivo(false); resetNovoAtivo(); }}
                style={{
                  fontSize: 12, color: "#6B7280", background: "white",
                  border: "1px solid #E5E7EB", borderRadius: 6,
                  padding: "6px 14px", cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                disabled={!camposOk}
                onClick={() => {
                  if (!camposOk) return;
                  const itemNovo: PlanoAcaoItem = {
                    id: crypto.randomUUID(),
                    nomeAtivo: novoAtivo.nome,
                    card: novoAtivo.card as CardId,
                    segmento: novoAtivo.segmento,
                    acao: "novo",
                    valorAtualBRL: 0,
                    valorMetaBRL: 0,
                    movimentacaoBRL: novoAtivo.valorBRL,
                    adicionadoManualmente: true,
                    observacao: novoAtivo.observacao,
                    prioridade: "baixa",
                  };
                  onPlanoAcao([...planoAcao, itemNovo]);
                  setAdicionandoAtivo(false);
                  resetNovoAtivo();
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: "white",
                  background: camposOk ? "#2563EB" : "#9CA3AF",
                  border: "none", borderRadius: 6, padding: "6px 16px",
                  cursor: camposOk ? "pointer" : "not-allowed",
                }}
              >
                Adicionar ao plano
              </button>
            </div>
          </div>
        );
      })()}

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
