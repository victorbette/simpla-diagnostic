import { useState, useMemo, useEffect, useRef } from "react";
import {
  Home, Car, BookOpen, Plane, Briefcase, Star, Heart,
  Monitor, Shield, TrendingUp, MoreHorizontal,
} from "lucide-react";
import type { ObjetivoVida } from "@/types/objetivos";
import { getObjetivoMeta } from "@/types/objetivos";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { Ativo } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Star, Heart,
  Monitor, Shield, TrendingUp, MoreHorizontal,
};

// ─── Rebalanceamento reader ───────────────────────────────────────────────────

interface RebalAtivo { id: string; card: string; nome: string; valorAtual: number; }

function loadRebalAtivos(clienteId: string): RebalAtivo[] {
  try {
    const raw = localStorage.getItem(`rebalanceamento_v1_${clienteId}`);
    if (raw) return (JSON.parse(raw) as { ativos?: RebalAtivo[] }).ativos ?? [];
  } catch { /* ignore */ }
  return [];
}

// ─── GBI persistence ─────────────────────────────────────────────────────────

// pctAlocado is the source of truth — valorAlocado is recomputed from it when
// current ativo prices are available; it's kept as a fallback for unknown ativos.
interface GBILink { ativoId: string; ativoNome: string; valorAlocado: number; pctAlocado?: number; }
interface GBIState { alocacoes: Record<string, GBILink[]>; }

function loadGBI(clienteId: string): GBIState {
  try {
    const raw = localStorage.getItem(`gbi_v1_${clienteId}`);
    if (raw) return JSON.parse(raw) as GBIState;
  } catch { /* ignore */ }
  return { alocacoes: {} };
}
function saveGBI(clienteId: string, s: GBIState) {
  try { localStorage.setItem(`gbi_v1_${clienteId}`, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBRL(s: string): number {
  const v = parseFloat(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(v) ? 0 : v;
}
function toBRLStr(n: number): string {
  return n > 0 ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}
function toPctStr(n: number): string {
  return n > 0 ? n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : "";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  objetivos: ObjetivoVida[];
  clienteId: string;
  carteira: ResultadoCarteira | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoalBasedInvesting({ objetivos, clienteId, carteira }: Props) {
  const [gbi, setGBI] = useState<GBIState>(() => loadGBI(clienteId));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ativos, setAtivos] = useState<Ativo[]>([]);

  // Per-expanded-goal: which ativoIds are checked
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Draft inputs: valor and pct per ativoId (for the currently expanded card)
  const [draftValor, setDraftValor] = useState<Record<string, string>>({});
  const [draftPct, setDraftPct]   = useState<Record<string, string>>({});

  // Track previous expanded to reset selection state
  const prevExpandedRef = useRef<string | null>(null);

  // Refresh ativos from Rebalanceamento localStorage when a card is expanded
  useEffect(() => {
    function resolveAtivos(): Ativo[] {
      const rebal = loadRebalAtivos(clienteId);
      if (rebal.length > 0) return rebal.map(a => ({ id: a.id, card: a.card as Ativo["card"], nome: a.nome, segmento: "", valorBRL: a.valorAtual }));
      if ((carteira?.ativosAtuais ?? []).length > 0) return carteira!.ativosAtuais!;
      return (carteira?.planoAcao ?? [])
        .filter(item => item.acao !== "novo" && item.valorAtualBRL > 0)
        .map(item => ({ id: item.id, card: item.card as Ativo["card"], nome: item.nomeAtivo, segmento: item.segmento ?? "", valorBRL: item.valorAtualBRL }));
    }
    setAtivos(resolveAtivos());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId, clienteId, carteira]);

  // Reset selection + drafts when expanding a different card
  useEffect(() => {
    if (expandedId === prevExpandedRef.current) return;
    prevExpandedRef.current = expandedId;
    if (expandedId) {
      const links = gbi.alocacoes[expandedId] ?? [];
      setSelectedIds(links.filter(l => l.valorAlocado > 0).map(l => l.ativoId));
    } else {
      setSelectedIds([]);
    }
    setDraftValor({});
    setDraftPct({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId]);

  const goals = useMemo(() =>
    objetivos
      .filter(o => o.ativo !== false && o.valorBRL > 0 && o.tipoFluxo !== "entrada")
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes),
    [objetivos]
  );

  // Recompute allocated value using current ativo price when pct is known
  function resolvedValor(l: GBILink): number {
    if (l.pctAlocado != null) {
      const a = ativos.find(a => a.id === l.ativoId);
      if (a) return (l.pctAlocado / 100) * a.valorBRL;
    }
    return l.valorAlocado;
  }

  function alocadoTotal(objId: string) {
    return (gbi.alocacoes[objId] ?? []).reduce((s, l) => s + resolvedValor(l), 0);
  }

  function commitLink(objId: string, ativo: Ativo, valor: number) {
    const pctAlocado = ativo.valorBRL > 0 ? (valor / ativo.valorBRL) * 100 : undefined;
    setGBI(prev => {
      const links = prev.alocacoes[objId] ?? [];
      let next: GBILink[];
      if (valor <= 0) {
        next = links.filter(l => l.ativoId !== ativo.id);
      } else {
        const entry: GBILink = { ativoId: ativo.id, ativoNome: ativo.nome, valorAlocado: valor, pctAlocado };
        const existing = links.find(l => l.ativoId === ativo.id);
        next = existing
          ? links.map(l => l.ativoId === ativo.id ? entry : l)
          : [...links, entry];
      }
      const state: GBIState = { ...prev, alocacoes: { ...prev.alocacoes, [objId]: next } };
      saveGBI(clienteId, state);
      return state;
    });
  }

  function toggleAtivo(objId: string, ativo: Ativo) {
    const isSelected = selectedIds.includes(ativo.id);
    if (isSelected) {
      setSelectedIds(prev => prev.filter(id => id !== ativo.id));
      commitLink(objId, ativo, 0);
      setDraftValor(p => { const n = { ...p }; delete n[ativo.id]; return n; });
      setDraftPct(p => { const n = { ...p }; delete n[ativo.id]; return n; });
    } else {
      setSelectedIds(prev => [...prev, ativo.id]);
    }
  }

  if (goals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
        <i className="ti ti-target-off" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
        Nenhum objetivo de vida cadastrado.<br />
        <span style={{ fontSize: 11 }}>Adicione objetivos no Financial Planning para acompanhá-los aqui.</span>
      </div>
    );
  }

  const totalCarteira = ativos.reduce((s, a) => s + a.valorBRL, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-target" style={{ fontSize: 18, color: "#2563EB" }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Goal Based Investing</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Vincule investimentos da carteira a cada objetivo de vida</p>
          </div>
        </div>
        {totalCarteira > 0 && (
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
            Carteira: <strong style={{ color: "#374151" }}>{formatBRL(totalCarteira)}</strong>
          </div>
        )}
      </div>

      {/* Goal cards */}
      {goals.map(obj => {
        const meta = getObjetivoMeta(obj.tipo);
        const Icon = ICON_MAP[meta.icone];
        const cor = meta.cor;
        const alocado = alocadoTotal(obj.id);
        const pct = obj.valorBRL > 0 ? Math.min(100, (alocado / obj.valorBRL) * 100) : 0;
        const concluido = pct >= 100;
        const isExpanded = expandedId === obj.id;
        const links = gbi.alocacoes[obj.id] ?? [];

        return (
          <div key={obj.id} style={{
            background: "white",
            border: `1px solid ${concluido ? "#BBF7D0" : "#E5E7EB"}`,
            borderRadius: 16, overflow: "hidden",
          }}>

            {/* Card header */}
            <div style={{ padding: "18px 20px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: `${cor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {Icon && <Icon style={{ width: 18, height: 18, color: cor }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
                      {String(obj.mes).padStart(2, "0")}.{obj.ano}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{obj.label}</div>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                  style={{
                    border: `1px solid ${isExpanded ? "#BFDBFE" : "#E5E7EB"}`,
                    borderRadius: 8, padding: "5px 14px", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", background: isExpanded ? "#EFF6FF" : "#FAFAFA",
                    color: isExpanded ? "#1D4ED8" : "#6B7280",
                    display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  }}
                >
                  <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-link"}`} style={{ fontSize: 12 }} />
                  {isExpanded ? "Fechar" : links.length > 0 ? `${links.length} ativo${links.length !== 1 ? "s" : ""}` : "Vincular"}
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 7, background: "#F0F2F5", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: concluido ? "#16A34A" : cor, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    Alocado: <strong style={{ color: concluido ? "#16A34A" : "#111827" }}>{formatBRL(alocado)}</strong>
                    {pct > 0 && !concluido && <span style={{ marginLeft: 6, fontSize: 10, color: "#9CA3AF" }}>({pct.toFixed(0)}%)</span>}
                    {concluido && <span style={{ marginLeft: 6, fontSize: 10, color: "#16A34A", fontWeight: 600 }}>✓ Meta atingida</span>}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{formatBRL(obj.valorBRL)}</span>
                </div>
              </div>
            </div>

            {/* Expanded panel */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid #F0F2F5" }}>

                {ativos.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
                    <i className="ti ti-wallet-off" style={{ fontSize: 22, display: "block", marginBottom: 6 }} />
                    Nenhum ativo disponível. Lance a Carteira Atual na aba Gestão de Investimentos primeiro.
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 110px 32px", gap: 8, padding: "10px 20px 6px", background: "#F8FAFF", borderBottom: "0.5px solid #E5E7EB" }}>
                      <span />
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ativo</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Saldo</span>
                      <span />
                    </div>

                    {ativos.map(ativo => {
                      const isSelected = selectedIds.includes(ativo.id);
                      const linked = links.find(l => l.ativoId === ativo.id);

                      // Use pctAlocado as source of truth: recompute valor from current price
                      const resolvedV = linked ? resolvedValor(linked) : 0;
                      const resolvedP = linked
                        ? (linked.pctAlocado ?? (ativo.valorBRL > 0 ? (linked.valorAlocado / ativo.valorBRL) * 100 : 0))
                        : 0;

                      // Displayed valor: draft → recomputed from current price → ""
                      const displayValor = draftValor[ativo.id] !== undefined
                        ? draftValor[ativo.id]
                        : linked ? toBRLStr(resolvedV) : "";

                      // Displayed pct: draft → stored pct → ""
                      const displayPct = draftPct[ativo.id] !== undefined
                        ? draftPct[ativo.id]
                        : linked ? toPctStr(resolvedP) : "";

                      return (
                        <div key={ativo.id} style={{ borderBottom: "0.5px solid #F3F4F6" }}>
                          {/* Ativo row with checkbox */}
                          <div
                            style={{
                              display: "grid", gridTemplateColumns: "28px 1fr 110px 32px",
                              alignItems: "center", gap: 8,
                              padding: "10px 20px",
                              cursor: "pointer",
                              background: isSelected ? "#FAFBFF" : "white",
                            }}
                            onClick={() => toggleAtivo(obj.id, ativo)}
                          >
                            {/* Checkbox */}
                            <div style={{
                              width: 18, height: 18, borderRadius: 5, border: `2px solid ${isSelected ? "#2563EB" : "#D1D5DB"}`,
                              background: isSelected ? "#2563EB" : "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0, transition: "all 150ms",
                            }}>
                              {isSelected && <i className="ti ti-check" style={{ fontSize: 11, color: "white" }} />}
                            </div>

                            <div>
                              <div style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? "#111827" : "#374151" }}>
                                {ativo.nome}
                              </div>
                              {ativo.segmento && <div style={{ fontSize: 10, color: "#9CA3AF" }}>{ativo.segmento}</div>}
                            </div>

                            <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>
                              {formatBRL(ativo.valorBRL)}
                            </span>

                            <i className={`ti ${isSelected ? "ti-chevron-up" : "ti-chevron-down"}`}
                              style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center" }} />
                          </div>

                          {/* Valor + Pct inputs (shown when selected) */}
                          {isSelected && (
                            <div style={{ padding: "4px 20px 14px 56px", background: "#F8FAFF" }}
                              onClick={e => e.stopPropagation()}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                                {/* Valor alocado */}
                                <div>
                                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                                    Valor alocado
                                  </div>
                                  <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9CA3AF" }}>R$</span>
                                    <input
                                      type="text" inputMode="decimal"
                                      placeholder="0,00"
                                      value={displayValor}
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => {
                                        const raw = e.target.value;
                                        setDraftValor(p => ({ ...p, [ativo.id]: raw }));
                                        const val = parseBRL(raw);
                                        if (ativo.valorBRL > 0) {
                                          setDraftPct(p => ({ ...p, [ativo.id]: toPctStr((val / ativo.valorBRL) * 100) }));
                                        }
                                      }}
                                      onBlur={e => {
                                        const val = parseBRL(e.target.value);
                                        commitLink(obj.id, ativo, val);
                                        setDraftValor(p => { const n = { ...p }; delete n[ativo.id]; return n; });
                                      }}
                                      style={{
                                        width: "100%", boxSizing: "border-box",
                                        border: "1px solid #D1D5DB", borderRadius: 8,
                                        padding: "9px 10px 9px 30px",
                                        fontSize: 13, fontWeight: 600, color: "#111827",
                                        outline: "none", background: "white",
                                        textAlign: "right",
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Percentual alocado */}
                                <div>
                                  <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                                    Percentual alocado
                                  </div>
                                  <div style={{ position: "relative" }}>
                                    <input
                                      type="text" inputMode="decimal"
                                      placeholder="0,0"
                                      value={displayPct}
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => {
                                        const raw = e.target.value;
                                        setDraftPct(p => ({ ...p, [ativo.id]: raw }));
                                        const pctVal = parseFloat(raw.replace(",", ".")) || 0;
                                        if (ativo.valorBRL > 0) {
                                          const calculado = (pctVal / 100) * ativo.valorBRL;
                                          setDraftValor(p => ({ ...p, [ativo.id]: toBRLStr(calculado) }));
                                        }
                                      }}
                                      onBlur={e => {
                                        const pctVal = parseFloat(e.target.value.replace(",", ".")) || 0;
                                        const val = (pctVal / 100) * ativo.valorBRL;
                                        commitLink(obj.id, ativo, val);
                                        setDraftPct(p => { const n = { ...p }; delete n[ativo.id]; return n; });
                                      }}
                                      style={{
                                        width: "100%", boxSizing: "border-box",
                                        border: "1px solid #D1D5DB", borderRadius: 8,
                                        padding: "9px 30px 9px 10px",
                                        fontSize: 13, fontWeight: 600, color: "#111827",
                                        outline: "none", background: "white",
                                        textAlign: "right",
                                      }}
                                    />
                                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9CA3AF" }}>%</span>
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Footer total */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", background: "#F8FAFF", borderTop: "0.5px solid #E5E7EB" }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {selectedIds.length} ativo{selectedIds.length !== 1 ? "s" : ""} selecionado{selectedIds.length !== 1 ? "s" : ""}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: concluido ? "#16A34A" : "#1D4ED8" }}>
                          {formatBRL(alocado)}
                        </span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 6 }}>de {formatBRL(obj.valorBRL)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary bar */}
      {goals.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 4 }}>
          {[
            { label: "Objetivos", val: String(goals.length) },
            { label: "Total metas", val: formatBRL(goals.reduce((s, o) => s + o.valorBRL, 0)) },
            { label: "Total alocado", val: formatBRL(goals.reduce((s, o) => s + alocadoTotal(o.id), 0)) },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
