import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import { CARD_ORDER, CARD_META, HIERARQUIA_CLASSES } from "@/lib/carteira/types";
import type { CardId, Ativo } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AtivoRebal {
  id: string;
  card: CardId;
  nome: string;
  valorAtual: number;
  fromFP?: boolean; // veio do Financial Planning
}

interface EstadoRebal {
  ativos: AtivoRebal[];
  aporte: number;
  ajustes: Partial<Record<CardId, number>>;
  dataSnapshot?: string;
}

interface SubclasseCalc {
  cardId: CardId;
  label: string;
  cor: string;
  corBg: string;
  icone: string;
  valorAtual: number;
  pctAtual: number;
  metaPct: number;
  valorMeta: number;
  gap: number;
  ativos: AtivoRebal[];
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const storageKey = (id: string) => `rebalanceamento_v1_${id}`;

function ativosDeAtivos(src: Ativo[]): AtivoRebal[] {
  return src.map(a => ({
    id: a.id,
    card: a.card,
    nome: a.nome,
    valorAtual: a.valorBRL,
    fromFP: true,
  }));
}

function loadState(clienteId: string, seed: AtivoRebal[]): EstadoRebal {
  try {
    const raw = localStorage.getItem(storageKey(clienteId));
    if (raw) {
      const parsed = JSON.parse(raw) as EstadoRebal;
      // If no ativos saved yet, seed from Financial Planning
      if ((!parsed.ativos || parsed.ativos.length === 0) && seed.length > 0) {
        return { ...parsed, ativos: seed };
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return { ativos: seed, aporte: 0, ajustes: {}, dataSnapshot: new Date().toISOString() };
}

function saveState(clienteId: string, s: EstadoRebal) {
  try { localStorage.setItem(storageKey(clienteId), JSON.stringify(s)); } catch { /* ignore */ }
}

function gid() { return Math.random().toString(36).slice(2, 10); }

function parseBRL(s: string): number {
  const v = parseFloat(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(v) ? 0 : v;
}

function toBRLDisplay(n: number): string {
  return n > 0 ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  carteira: ResultadoCarteira;
  clienteId: string;
  ativosIniciais?: Ativo[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Rebalanceamento({ carteira, clienteId, ativosIniciais = [] }: Props) {
  const [view, setView] = useState<"carteira" | "rebalancear">("carteira");

  const seed = useMemo((): AtivoRebal[] => {
    if (ativosIniciais.length > 0) return ativosDeAtivos(ativosIniciais);
    // Fallback: derive current portfolio from planoAcao (excludes 'novo' items added by plan)
    const VALID = new Set(CARD_ORDER as string[]);
    return (carteira.planoAcao ?? [])
      .filter(item => item.acao !== "novo" && item.valorAtualBRL > 0 && VALID.has(item.card ?? ""))
      .map(item => ({
        id: item.id,
        card: item.card as CardId,
        nome: item.nomeAtivo,
        valorAtual: item.valorAtualBRL,
        fromFP: true,
      }));
  }, [ativosIniciais, carteira.planoAcao]);

  const [estado, setEstado] = useState<EstadoRebal>(() => loadState(clienteId, seed));

  // add-form
  const [addCard, setAddCard] = useState<CardId>("resgate_longo");
  const [addNome, setAddNome] = useState("");
  const [addValorStr, setAddValorStr] = useState("");

  // edit-inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editValorStr, setEditValorStr] = useState("");

  // aporte display
  const [aporteStr, setAporteStr] = useState(() => toBRLDisplay(estado.aporte));

  // ajuste display strings (manual overrides)
  const [ajusteStr, setAjusteStr] = useState<Partial<Record<CardId, string>>>({});

  // Fallback: dados antigos do FP podem ter salvo em alocacaoMeta mas não em macroMeta
  const macroMeta = useMemo(
    () => (carteira.macroMeta && Object.keys(carteira.macroMeta).length > 0)
      ? carteira.macroMeta
      : (carteira.alocacaoMeta ?? {}),
    [carteira.macroMeta, carteira.alocacaoMeta],
  );
  const ativosRecomendados = useMemo((): Ativo[] => {
    const plano = carteira.planoAcao ?? [];
    if (plano.length === 0) return carteira.ativosRecomendados ?? [];
    const ativosAtuaisRef = carteira.ativosAtuais ?? [];
    const VALID = new Set(CARD_ORDER as string[]);
    return plano
      .map(item => {
        let valorFinal: number;
        switch (item.acao) {
          case "manter": valorFinal = item.valorAtualBRL; break;
          case "aportar": case "novo":
            valorFinal = item.valorAtualBRL + (item.movimentacaoEditada ?? Math.abs(item.movimentacaoBRL ?? 0)); break;
          case "resgatar_total": valorFinal = 0; break;
          case "resgatar_parcial": {
            const resgate = item.valorResgateBRL !== undefined ? item.valorResgateBRL : Math.abs(item.movimentacaoBRL ?? 0);
            valorFinal = Math.max(0, item.valorAtualBRL - resgate); break;
          }
          default: valorFinal = item.valorAtualBRL;
        }
        if (valorFinal <= 0 || !VALID.has(item.card ?? "")) return null;
        const ativoAtual = ativosAtuaisRef.find(
          a => a.id === item.id || (a.nome === item.nomeAtivo && a.card === item.card)
        );
        const vencimento = item.vencimento?.trim() ? item.vencimento : ativoAtual?.vencimento;
        return {
          id: item.id,
          card: item.card as CardId,
          nome: item.nomeAtivo,
          segmento: item.segmento ?? "",
          valorBRL: valorFinal,
          vencimento,
          adicionadoManualmente: item.adicionadoManualmente,
          observacao: item.observacao,
        } as Ativo;
      })
      .filter(Boolean) as Ativo[];
  }, [carteira.planoAcao, carteira.ativosAtuais, carteira.ativosRecomendados]);

  useEffect(() => { saveState(clienteId, estado); }, [estado, clienteId]);

  // Re-popula ativos do FP quando chegam async (Supabase carrega depois do mount)
  useEffect(() => {
    if (seed.length === 0) return;
    setEstado(prev => {
      if (prev.ativos.length > 0) return prev; // não sobrescreve dados já preenchidos
      const next = { ...prev, ativos: seed, dataSnapshot: new Date().toISOString() };
      saveState(clienteId, next);
      return next;
    });
  }, [seed, clienteId]);

  // Reset completo quando clienteId muda (troca de cliente sem remount)
  const prevClienteIdRef = useRef<string>(clienteId);
  useEffect(() => {
    if (prevClienteIdRef.current === clienteId) return;
    prevClienteIdRef.current = clienteId;
    const freshState = loadState(clienteId, seed);
    setEstado(freshState);
    setAporteStr(toBRLDisplay(freshState.aporte));
    setAjusteStr({});
    setEditId(null);
    setView("carteira");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // ─── Computed ──────────────────────────────────────────────────────────────

  const patrimonioAtual = estado.ativos.reduce((s, a) => s + a.valorAtual, 0);
  const patrimonioTotal = patrimonioAtual + estado.aporte;

  const porSubclasse: SubclasseCalc[] = useMemo(() => {
    return CARD_ORDER.map((cardId) => {
      const meta = CARD_META[cardId];
      const ativosNaClasse = estado.ativos.filter(a => a.card === cardId);
      const valorAtual = ativosNaClasse.reduce((s, a) => s + a.valorAtual, 0);
      const metaPct = Number(macroMeta[cardId]) || 0;
      const valorMeta = (metaPct / 100) * patrimonioTotal;
      const pctAtual = patrimonioTotal > 0 ? (valorAtual / patrimonioTotal) * 100 : 0;
      const gap = valorMeta - valorAtual;
      return {
        cardId, label: meta.label, cor: meta.cor, corBg: meta.corBg, icone: meta.icone,
        valorAtual, pctAtual, metaPct, valorMeta, gap, ativos: ativosNaClasse,
      };
    }).filter(s => s.valorAtual > 0 || s.metaPct > 0);
  }, [estado.ativos, macroMeta, patrimonioTotal]);

  const sugestaoAuto = useMemo((): Partial<Record<CardId, number>> => {
    if (estado.aporte <= 0) return {};
    const necessidades = porSubclasse.filter(s => s.gap > 0);
    const totalNecessidade = necessidades.reduce((s, c) => s + c.gap, 0);
    const result: Partial<Record<CardId, number>> = {};

    if (totalNecessidade <= 0) {
      // Carteira já alinhada (ou sem metas): distribui o aporte proporcionalmente pelo metaPct
      const comMeta = porSubclasse.filter(s => s.metaPct > 0);
      const totalMetaPct = comMeta.reduce((s, c) => s + c.metaPct, 0);
      if (totalMetaPct <= 0) return {};
      comMeta.forEach(s => { result[s.cardId] = (s.metaPct / totalMetaPct) * estado.aporte; });
      return result;
    }

    if (estado.aporte >= totalNecessidade) {
      // Preenche todos os gaps; distribui a sobra proporcionalmente pelo metaPct de TODAS as subclasses com meta
      const sobra = estado.aporte - totalNecessidade;
      const comMeta = porSubclasse.filter(s => s.metaPct > 0);
      const totalMetaPct = comMeta.reduce((s, c) => s + c.metaPct, 0);
      necessidades.forEach(s => {
        result[s.cardId] = s.gap;
      });
      if (sobra > 0 && totalMetaPct > 0) {
        comMeta.forEach(s => {
          result[s.cardId] = (result[s.cardId] ?? 0) + (s.metaPct / totalMetaPct) * sobra;
        });
      }
    } else {
      // Aporte menor que a necessidade total: distribui proporcionalmente pelos gaps
      necessidades.forEach(s => {
        result[s.cardId] = (s.gap / totalNecessidade) * estado.aporte;
      });
    }
    return result;
  }, [porSubclasse, estado.aporte]);

  const temAjuste = Object.values(estado.ajustes).some(v => v !== undefined && v > 0);
  const sugestaoFinal = useMemo(
    (): Partial<Record<CardId, number>> => temAjuste ? estado.ajustes : sugestaoAuto,
    [temAjuste, estado.ajustes, sugestaoAuto],
  );

  interface AtivoSugestao {
    id: string;
    nome: string;
    valorAtual: number;
    valorMeta: number;
    aporte: number;
    isNovo: boolean;
  }

  const sugestaoAporteAtivos = useMemo((): Record<string, AtivoSugestao[]> => {
    const result: Record<string, AtivoSugestao[]> = {};
    for (const sub of porSubclasse) {
      const aporteNaSub = sugestaoFinal[sub.cardId] ?? 0;
      const recomNaSub = ativosRecomendados.filter(a => a.card === sub.cardId);

      const currentWithMeta: AtivoSugestao[] = sub.ativos.map(a => {
        const rec = recomNaSub.find(r => r.id === a.id || r.nome === a.nome);
        return { id: a.id, nome: a.nome, valorAtual: a.valorAtual, valorMeta: rec?.valorBRL ?? 0, aporte: 0, isNovo: false };
      });
      const novos: AtivoSugestao[] = recomNaSub
        .filter(r => !sub.ativos.some(a => a.id === r.id || a.nome === r.nome))
        .map(r => ({ id: r.id, nome: r.nome, valorAtual: 0, valorMeta: r.valorBRL, aporte: 0, isNovo: true }));

      const all = [...currentWithMeta, ...novos];
      const gaps = all.map(a => ({ ...a, gap: Math.max(0, a.valorMeta - a.valorAtual) }));
      const totalGap = gaps.reduce((s, a) => s + a.gap, 0);

      if (aporteNaSub > 0) {
        if (totalGap > 0) {
          // Cap each ativo's aporte at its own gap to prevent exceeding individual meta
          const ratio = Math.min(1, aporteNaSub / totalGap);
          result[sub.cardId] = gaps.map(a => ({ ...a, aporte: a.gap * ratio }));
        } else {
          // All ativos at or above their individual targets — don't push more in
          result[sub.cardId] = all.map(a => ({ ...a, aporte: 0 }));
        }
      } else {
        result[sub.cardId] = gaps.map(a => ({ ...a, aporte: 0 }));
      }
    }
    return result;
  }, [porSubclasse, sugestaoFinal, ativosRecomendados]);

  const totalAjustado = Object.values(sugestaoFinal).reduce((s, v) => s + (v ?? 0), 0);
  const deltaAjuste = estado.aporte - totalAjustado;
  const totalMeta = useMemo(
    () => porSubclasse.reduce((s, sub) => s + sub.valorMeta, 0),
    [porSubclasse],
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const addAtivo = useCallback(() => {
    const val = parseBRL(addValorStr);
    if (!addNome.trim() || val <= 0) return;
    setEstado(p => ({
      ...p,
      ativos: [...p.ativos, { id: gid(), card: addCard, nome: addNome.trim(), valorAtual: val }],
    }));
    setAddNome(""); setAddValorStr("");
  }, [addNome, addValorStr, addCard]);

  const removeAtivo = (id: string) =>
    setEstado(p => ({ ...p, ativos: p.ativos.filter(a => a.id !== id) }));

  const startEdit = (a: AtivoRebal) => {
    setEditId(a.id); setEditNome(a.nome); setEditValorStr(toBRLDisplay(a.valorAtual));
  };

  const saveEdit = (id: string) => {
    const val = parseBRL(editValorStr);
    if (!editNome.trim() || val < 0) return;
    setEstado(p => ({
      ...p,
      ativos: p.ativos.map(a => a.id === id ? { ...a, nome: editNome.trim(), valorAtual: val, fromFP: false } : a),
    }));
    setEditId(null);
  };

  const restaurarFP = () => {
    if (seed.length === 0) return;
    if (!confirm("Restaurar os ativos e valores do Financial Planning? Os valores editados serão perdidos.")) return;
    setEstado(p => ({ ...p, ativos: seed, ajustes: {}, dataSnapshot: new Date().toISOString() }));
    setAjusteStr({});
  };

  const setAporte = (raw: string) => {
    setAporteStr(raw);
    const val = parseBRL(raw);
    setEstado(p => ({ ...p, aporte: val, ajustes: {} }));
    setAjusteStr({});
  };

  const setAjuste = (cardId: CardId, raw: string) => {
    setAjusteStr(p => ({ ...p, [cardId]: raw }));
    const val = parseBRL(raw);
    setEstado(p => ({ ...p, ajustes: { ...p.ajustes, [cardId]: val } }));
  };

  const resetAjustes = () => { setEstado(p => ({ ...p, ajustes: {} })); setAjusteStr({}); };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    border: "1px solid #D1D5DB", borderRadius: 6, padding: "6px 10px",
    fontSize: 12, color: "#111827", outline: "none", background: "white",
  };
  const btn = (color: string, bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
    border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11,
    fontWeight: 600, cursor: "pointer", color, background: bg, ...extra,
  });

  const dataSnap = estado.dataSnapshot
    ? new Date(estado.dataSnapshot).toLocaleDateString("pt-BR")
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", alignItems: "center" }}>
        {(["carteira", "rebalancear"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "10px 24px", fontSize: 13, fontWeight: 500, border: "none",
            cursor: "pointer", background: "transparent",
            color: view === v ? "#1E3A8A" : "#6B7280",
            borderBottom: `2px solid ${view === v ? "#1E3A8A" : "transparent"}`,
            marginBottom: -2,
          }}>
            {v === "carteira" ? "Carteira Atual" : "Rebalancear"}
          </button>
        ))}
        {patrimonioAtual > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}>
            Patrimônio: <strong style={{ color: "#111827" }}>{formatBRL(patrimonioAtual)}</strong>
            {dataSnap && <span style={{ marginLeft: 6 }}>· atualizado em {dataSnap}</span>}
          </span>
        )}
      </div>

      {/* ══════════ VIEW: CARTEIRA ATUAL ══════════ */}
      {view === "carteira" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Actions bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>Posições Atuais da Carteira</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                {seed.length > 0
                  ? "Pré-carregado do Financial Planning — atualize os valores de mercado conforme necessário"
                  : "Lance manualmente os ativos da carteira atual do cliente"}
              </p>
            </div>
            {seed.length > 0 && (
              <button onClick={restaurarFP} style={btn("#B45309", "#FEF3C7")}>
                <i className="ti ti-refresh" style={{ marginRight: 4 }} />
                Restaurar do Financial Planning
              </button>
            )}
          </div>

          {/* Add form */}
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 12px" }}>
              + Adicionar Ativo
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Subclasse</div>
                <select value={addCard} onChange={e => setAddCard(e.target.value as CardId)}
                  style={{ ...inputStyle, width: "100%", appearance: "none" as const }}>
                  {CARD_ORDER.map(c => (
                    <option key={c} value={c}>{CARD_META[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nome do Ativo</div>
                <input
                  value={addNome} onChange={e => setAddNome(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addAtivo()}
                  placeholder="Ex: Tesouro IPCA+ 2029"
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Valor Atual (R$)</div>
                <input
                  value={addValorStr} onChange={e => setAddValorStr(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addAtivo()}
                  placeholder="0,00" inputMode="decimal"
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const, textAlign: "right" as const }}
                />
              </div>
              <button onClick={addAtivo} style={btn("white", "#1E40AF", { padding: "7px 18px", alignSelf: "flex-end" as const })}>
                Adicionar
              </button>
            </div>
          </div>

          {/* Assets grouped by hierarchy */}
          {estado.ativos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
              <i className="ti ti-wallet-off" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
              Nenhum ativo lançado.
            </div>
          ) : (
            <>
              {HIERARQUIA_CLASSES.map(grupo => {
                const subsComAtivos = grupo.subclasses.filter(s =>
                  estado.ativos.some(a => a.card === s.cardId)
                );
                if (subsComAtivos.length === 0) return null;
                const grupoTotal = subsComAtivos.reduce((sum, s) =>
                  sum + estado.ativos.filter(a => a.card === s.cardId).reduce((ss, a) => ss + a.valorAtual, 0), 0
                );
                const macroPct = patrimonioAtual > 0 ? (grupoTotal / patrimonioAtual) * 100 : 0;
                const metaPct = grupo.subclasses.reduce((s, sub) => s + (Number(macroMeta[sub.cardId]) || 0), 0);

                return (
                  <div key={grupo.id} style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                    {/* Group header */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 16, padding: "10px 16px", background: grupo.corBg, borderBottom: "0.5px solid #E5E7EB" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <i className={`ti ${grupo.icone}`} style={{ fontSize: 14, color: grupo.cor }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: grupo.cor }}>{grupo.label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: grupo.cor, opacity: 0.8 }}>
                        {macroPct.toFixed(1)}% atual · {metaPct.toFixed(1)}% meta
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: grupo.cor }}>{formatBRL(grupoTotal)}</span>
                    </div>

                    {/* Column headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 130px 80px", gap: 8, padding: "5px 16px 5px 32px", background: "#F8FAFC", borderBottom: "0.5px solid #F3F4F6" }}>
                      {["Ativo / Subclasse", "Valor Original (FP)", "Valor Atual de Mercado", ""].map((h, i) => (
                        <span key={i} style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.04em", textAlign: i > 0 ? "right" as const : "left" as const }}>{h}</span>
                      ))}
                    </div>

                    {subsComAtivos.map(sub => {
                      const ativosNaSub = estado.ativos.filter(a => a.card === sub.cardId);
                      const subTotal = ativosNaSub.reduce((s, a) => s + a.valorAtual, 0);
                      const subPct = patrimonioAtual > 0 ? (subTotal / patrimonioAtual) * 100 : 0;
                      const subMetaPct = Number(macroMeta[sub.cardId]) || 0;

                      return (
                        <div key={sub.cardId}>
                          {/* Subclass row */}
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 130px 80px", gap: 8, padding: "7px 16px 7px 32px", background: "#F8FAFC", borderBottom: "0.5px solid #F3F4F6", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{sub.label}</span>
                            <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" as const }}>—</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "right" as const }}>{formatBRL(subTotal)}</span>
                            <span style={{ fontSize: 10, color: subMetaPct > 0 ? (Math.abs(subPct - subMetaPct) < 1 ? "#15803D" : subPct < subMetaPct ? "#B91C1C" : "#B45309") : "#9CA3AF", textAlign: "right" as const }}>
                              {subPct.toFixed(1)}% / {subMetaPct.toFixed(1)}%
                            </span>
                          </div>

                          {/* Asset rows */}
                          {ativosNaSub.map(ativo => {
                            const fpOriginal = ativosIniciais.find(a => a.id === ativo.id);
                            const valorOriginal = fpOriginal?.valorBRL;
                            const mudou = valorOriginal !== undefined && Math.abs(ativo.valorAtual - valorOriginal) > 0.5;

                            return (
                              <div key={ativo.id} style={{ borderBottom: "0.5px solid #F9FAFB" }}>
                                {editId === ativo.id ? (
                                  <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 130px 80px", gap: 8, padding: "8px 16px 8px 48px", alignItems: "center" }}>
                                    <input value={editNome} onChange={e => setEditNome(e.target.value)}
                                      autoFocus style={{ ...inputStyle, boxSizing: "border-box" as const }} />
                                    <span />
                                    <input value={editValorStr} onChange={e => setEditValorStr(e.target.value)}
                                      inputMode="decimal" onKeyDown={e => e.key === "Enter" && saveEdit(ativo.id)}
                                      style={{ ...inputStyle, textAlign: "right" as const, boxSizing: "border-box" as const }} />
                                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                      <button onClick={() => saveEdit(ativo.id)} style={btn("white", "#15803D", { padding: "4px 10px" })}>✓</button>
                                      <button onClick={() => setEditId(null)} style={btn("#6B7280", "#F3F4F6", { padding: "4px 8px" })}>✕</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    style={{ display: "grid", gridTemplateColumns: "2fr 100px 130px 80px", gap: 8, padding: "7px 16px 7px 48px", alignItems: "center" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ color: "#D1D5DB", fontSize: 10 }}>↳</span>
                                      <span style={{ fontSize: 12, color: "#374151" }}>{ativo.nome}</span>
                                      {ativo.fromFP && !mudou && (
                                        <span style={{ fontSize: 9, color: "#9CA3AF", background: "#F3F4F6", padding: "1px 5px", borderRadius: 4 }}>FP</span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" as const }}>
                                      {valorOriginal !== undefined ? formatBRL(valorOriginal) : "—"}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                                      {mudou && (
                                        <span style={{ fontSize: 9, color: "#B45309", background: "#FEF3C7", padding: "1px 5px", borderRadius: 4 }}>atualizado</span>
                                      )}
                                      <span style={{ fontSize: 12, fontWeight: mudou ? 600 : 400, color: mudou ? "#111827" : "#374151" }}>
                                        {formatBRL(ativo.valorAtual)}
                                      </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                      <button onClick={() => startEdit(ativo)} title="Editar valor atual"
                                        style={{ border: "none", background: "none", cursor: "pointer", color: "#6B7280", fontSize: 14, padding: "2px 4px" }}>
                                        <i className="ti ti-pencil" />
                                      </button>
                                      <button onClick={() => removeAtivo(ativo.id)} title="Remover"
                                        style={{ border: "none", background: "none", cursor: "pointer", color: "#B91C1C", fontSize: 14, padding: "2px 4px" }}>
                                        <i className="ti ti-trash" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: "12px 16px", background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Total da Carteira Atual:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{formatBRL(patrimonioAtual)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ VIEW: REBALANCEAR ══════════ */}
      {view === "rebalancear" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {patrimonioAtual === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: 13 }}>
              <i className="ti ti-wallet-off" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />
              Lance a carteira atual na aba "Carteira Atual" antes de rebalancear.
            </div>
          )}

          {patrimonioAtual > 0 && (
            <>
              {/* Aporte input */}
              <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>Aporte Disponível</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                      Patrimônio atual: {formatBRL(patrimonioAtual)} · Com aporte: {formatBRL(patrimonioTotal)}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", background: "#F8FAFC" }}>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>R$</span>
                    <input
                      type="text" inputMode="decimal"
                      value={aporteStr}
                      onChange={e => setAporte(e.target.value)}
                      onBlur={() => { if (estado.aporte > 0) setAporteStr(toBRLDisplay(estado.aporte)); }}
                      placeholder="0,00"
                      style={{ border: "none", background: "transparent", outline: "none", fontSize: 15, fontWeight: 600, color: "#111827", width: 150, textAlign: "right" as const }}
                    />
                  </div>
                </div>
              </div>


              {/* Sugestão de rebalanceamento */}
              {estado.aporte > 0 && (
                <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className="ti ti-adjustments-horizontal" style={{ fontSize: 16, color: "#2563EB" }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Sugestão de Aporte por Subclasse</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>
                          {temAjuste ? "ajuste manual ativo" : "automático — prioriza os mais distantes da meta"}
                        </span>
                      </div>
                    </div>
                    {temAjuste && (
                      <button onClick={resetAjustes} style={btn("#B91C1C", "#FEE2E2", { fontSize: 10 })}>
                        Resetar para automático
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 130px 120px", gap: 4, padding: "6px 16px", background: "#F8FAFF", borderBottom: "0.5px solid #E5E7EB" }}>
                    {["Subclasse / Ativo", "Atual R$", "Meta R$", "Aportar (R$)", "Saldo pós-aporte"].map((h, i) => (
                      <span key={h} style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.04em", textAlign: i > 0 ? "right" as const : "left" as const }}>{h}</span>
                    ))}
                  </div>

                  {porSubclasse.map(sub => {
                    const aporteCardSugerido = sugestaoFinal[sub.cardId] ?? 0;
                    const valorPos = sub.valorAtual + aporteCardSugerido;
                    const pctPos = patrimonioTotal > 0 ? (valorPos / patrimonioTotal) * 100 : 0;
                    const desvioPos = pctPos - sub.metaPct;
                    const ativosSubSugestao = sugestaoAporteAtivos[sub.cardId] ?? [];
                    const temAtivoComAporte = ativosSubSugestao.some(a => a.aporte > 0.5);

                    return (
                      <div key={sub.cardId} style={{ borderBottom: "0.5px solid #F3F4F6" }}>
                        {/* Linha da subclasse */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 130px 120px", gap: 4, padding: "9px 16px", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sub.cor, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{sub.label}</span>
                          </div>
                          <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" as const }}>{formatBRL(sub.valorAtual)}</span>
                          <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" as const }}>{formatBRL(sub.valorMeta)}</span>

                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#6B7280" }}>R$</span>
                            <input
                              type="text" inputMode="decimal"
                              value={ajusteStr[sub.cardId] ?? (aporteCardSugerido > 0.5 ? toBRLDisplay(aporteCardSugerido) : "")}
                              onChange={e => setAjuste(sub.cardId, e.target.value)}
                              onFocus={e => { if (!temAjuste) setAjusteStr(p => ({ ...p, [sub.cardId]: toBRLDisplay(aporteCardSugerido) })); e.target.select(); }}
                              placeholder="0,00"
                              style={{
                                border: "1px solid #BFDBFE", borderRadius: 6, padding: "5px 8px",
                                fontSize: 12, fontWeight: 600, color: "#15803D",
                                background: aporteCardSugerido > 0.5 ? "#F0FDF4" : "#FAFAFA",
                                outline: "none", width: 90, textAlign: "right" as const,
                              }}
                            />
                          </div>

                          <div style={{ textAlign: "right" as const }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{formatBRL(valorPos)}</div>
                            <div style={{ fontSize: 10, color: Math.abs(desvioPos) < 0.5 ? "#15803D" : desvioPos < 0 ? "#B91C1C" : "#B45309" }}>
                              {pctPos.toFixed(1)}%{" · "}{Math.abs(desvioPos) < 0.5 ? "✓ na meta" : `${desvioPos > 0 ? "+" : ""}${desvioPos.toFixed(1)}% vs meta`}
                            </div>
                          </div>
                        </div>

                        {/* Linhas por ativo (só quando há aporte a distribuir) */}
                        {temAtivoComAporte && ativosSubSugestao.map(ativo => {
                          const posAtivo = ativo.valorAtual + ativo.aporte;
                          return (
                            <div key={ativo.id} style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 130px 120px", gap: 4, padding: "5px 16px 5px 32px", background: "#FAFBFF", borderTop: "0.5px solid #F3F4F6", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ color: "#D1D5DB", fontSize: 10 }}>↳</span>
                                <span style={{ fontSize: 11, color: "#374151" }}>{ativo.nome}</span>
                                {ativo.isNovo && (
                                  <span style={{ fontSize: 9, color: "#7C3AED", background: "#EDE9FE", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>novo</span>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" as const }}>
                                {ativo.valorAtual > 0 ? formatBRL(ativo.valorAtual) : "—"}
                              </span>
                              <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" as const }}>
                                {ativo.valorMeta > 0 ? formatBRL(ativo.valorMeta) : "—"}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: ativo.aporte > 0.5 ? "#15803D" : "#9CA3AF", textAlign: "right" as const }}>
                                {ativo.aporte > 0.5 ? formatBRL(ativo.aporte) : "—"}
                              </span>
                              <span style={{ fontSize: 11, color: "#374151", textAlign: "right" as const }}>
                                {posAtivo > 0 ? formatBRL(posAtivo) : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 100px 130px 120px", gap: 4, padding: "10px 16px", background: "#F8FAFF", borderTop: "0.5px solid #E5E7EB", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Total</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textAlign: "right" as const }}>{formatBRL(patrimonioAtual)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textAlign: "right" as const }}>{formatBRL(totalMeta)}</span>
                    <div style={{ textAlign: "right" as const }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: Math.abs(deltaAjuste) < 1 ? "#15803D" : "#B91C1C" }}>
                        {formatBRL(totalAjustado)}
                      </span>
                      {Math.abs(deltaAjuste) >= 1 && (
                        <div style={{ fontSize: 10, color: "#B91C1C" }}>
                          {deltaAjuste > 0 ? `${formatBRL(deltaAjuste)} a distribuir` : `${formatBRL(Math.abs(deltaAjuste))} a mais`}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" as const }}>{formatBRL(patrimonioTotal)}</span>
                  </div>
                </div>
              )}

              {/* Carteira Meta — ativos recomendados */}
              {ativosRecomendados.length > 0 && (
                <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="ti ti-target" style={{ fontSize: 16, color: "#2563EB" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Carteira Meta</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>referência de ativos por subclasse — do Financial Planning</span>
                  </div>

                  {HIERARQUIA_CLASSES.map(grupo => {
                    const ativosGrupo = ativosRecomendados.filter(a => grupo.subclasses.some(s => s.cardId === a.card));
                    if (ativosGrupo.length === 0) return null;
                    const grupoTotal = ativosGrupo.reduce((s, a) => s + a.valorBRL, 0);
                    return (
                      <div key={grupo.id}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: grupo.corBg, borderBottom: "0.5px solid #E5E7EB" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <i className={`ti ${grupo.icone}`} style={{ fontSize: 13, color: grupo.cor }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: grupo.cor }}>{grupo.label}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: grupo.cor }}>{formatBRL(grupoTotal)}</span>
                        </div>
                        {grupo.subclasses.map(sub => {
                          const ativosSub = ativosGrupo.filter(a => a.card === sub.cardId);
                          if (ativosSub.length === 0) return null;
                          const subTotal = ativosSub.reduce((s, a) => s + a.valorBRL, 0);
                          return (
                            <div key={sub.cardId}>
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 16px 6px 32px", background: "#F8FAFC", borderBottom: "0.5px solid #F3F4F6" }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{sub.label}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{formatBRL(subTotal)}</span>
                              </div>
                              {ativosSub.map(ativo => (
                                <div key={ativo.id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px", gap: 8, padding: "6px 16px 6px 48px", borderBottom: "0.5px solid #F9FAFB" }}>
                                  <div>
                                    <div style={{ fontSize: 12, color: "#374151" }}>{ativo.nome}</div>
                                    {ativo.segmento && <div style={{ fontSize: 10, color: "#9CA3AF" }}>{ativo.segmento}</div>}
                                  </div>
                                  <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" as const }}>
                                    {grupoTotal > 0 ? ((ativo.valorBRL / grupoTotal) * 100).toFixed(1) + "% sub" : "—"}
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 500, color: "#374151", textAlign: "right" as const }}>{formatBRL(ativo.valorBRL)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bar chart */}
              <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>Alocação Visual: Atual vs Meta</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {porSubclasse.map(sub => (
                    <div key={sub.cardId}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: sub.cor, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{sub.label}</span>
                        <span style={{ fontSize: 11, color: "#6B7280" }}>
                          <strong>{sub.pctAtual.toFixed(1)}%</strong> atual{" → "}
                          <strong style={{ color: sub.cor }}>{sub.metaPct.toFixed(1)}%</strong> meta
                          {estado.aporte > 0 && (() => {
                            const ap = sugestaoFinal[sub.cardId] ?? 0;
                            const pctPos = patrimonioTotal > 0 ? ((sub.valorAtual + ap) / patrimonioTotal) * 100 : 0;
                            return <span style={{ color: "#15803D" }}> → <strong>{pctPos.toFixed(1)}%</strong> pós</span>;
                          })()}
                        </span>
                      </div>
                      <div style={{ height: 8, background: "#F3F4F6", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                        <div style={{ position: "absolute", left: `${Math.min(sub.metaPct, 100)}%`, top: 0, height: "100%", width: 2, background: sub.cor, opacity: 0.4, transform: "translateX(-50%)", zIndex: 2 }} />
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(sub.pctAtual, 100)}%`, background: sub.cor, borderRadius: 99, opacity: 0.7 }} />
                        {estado.aporte > 0 && (() => {
                          const ap = sugestaoFinal[sub.cardId] ?? 0;
                          const pctPos = patrimonioTotal > 0 ? ((sub.valorAtual + ap) / patrimonioTotal) * 100 : 0;
                          return pctPos > sub.pctAtual ? (
                            <div style={{ position: "absolute", left: `${sub.pctAtual}%`, top: 0, height: "100%", width: `${Math.min(pctPos - sub.pctAtual, 100 - sub.pctAtual)}%`, background: "#15803D", opacity: 0.5 }} />
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    {[["#6B7280", 0.7, "Atual"], ["#15803D", 0.5, "Aporte sugerido"]].map(([c, o, l]) => (
                      <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 16, height: 6, borderRadius: 3, background: c as string, opacity: o as number }} />
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{l as string}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 2, height: 10, background: "#6B7280", opacity: 0.4 }} />
                      <span style={{ fontSize: 10, color: "#9CA3AF" }}>Linha meta</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
