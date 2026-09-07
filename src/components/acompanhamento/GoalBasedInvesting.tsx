import { useState, useMemo } from "react";
import type { ObjetivoVida } from "@/types/objetivos";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { Ativo } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GBILink {
  ativoId: string;
  ativoNome: string;
  valorAlocado: number;
}

interface GBIState {
  alocacoes: Record<string, GBILink[]>;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const storageKey = (id: string) => `gbi_v1_${id}`;

function loadGBI(clienteId: string): GBIState {
  try {
    const raw = localStorage.getItem(storageKey(clienteId));
    if (raw) return JSON.parse(raw) as GBIState;
  } catch { /* ignore */ }
  return { alocacoes: {} };
}

function saveGBI(clienteId: string, s: GBIState) {
  try { localStorage.setItem(storageKey(clienteId), JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Visual mapping ───────────────────────────────────────────────────────────

const TIPO_ICONE: Record<string, string> = {
  viagem:              "ti-plane",
  veiculo:             "ti-car",
  casa:                "ti-home",
  familia:             "ti-users",
  eletronico:          "ti-device-laptop",
  educacao:            "ti-school",
  hobby:               "ti-star",
  profissional:        "ti-briefcase",
  saude:               "ti-heart-rate-monitor",
  outro:               "ti-target",
  aportes_financeiros: "ti-trending-up",
};

interface Cor { bg: string; text: string; bar: string; }
const TIPO_COR: Record<string, Cor> = {
  viagem:              { bg: "#EFF6FF", text: "#1D4ED8", bar: "#3B82F6" },
  veiculo:             { bg: "#F0FDF4", text: "#15803D", bar: "#22C55E" },
  casa:                { bg: "#FFF7ED", text: "#C2410C", bar: "#F97316" },
  familia:             { bg: "#FDF2F8", text: "#9D174D", bar: "#EC4899" },
  eletronico:          { bg: "#F5F3FF", text: "#6D28D9", bar: "#8B5CF6" },
  educacao:            { bg: "#ECFDF5", text: "#065F46", bar: "#10B981" },
  hobby:               { bg: "#FEFCE8", text: "#854D0E", bar: "#EAB308" },
  profissional:        { bg: "#EFF6FF", text: "#1E40AF", bar: "#2563EB" },
  saude:               { bg: "#FFF1F2", text: "#9F1239", bar: "#F43F5E" },
  outro:               { bg: "#F9FAFB", text: "#374151", bar: "#6B7280" },
  aportes_financeiros: { bg: "#F0FDF4", text: "#166534", bar: "#16A34A" },
};
const defaultCor: Cor = { bg: "#F9FAFB", text: "#374151", bar: "#6B7280" };

function parseBRL(s: string): number {
  const v = parseFloat(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(v) ? 0 : v;
}

function toBRLStr(n: number): string {
  return n > 0 ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
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
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Portfolio ativos — prefer ativosAtuais, fallback to planoAcao current values
  const ativos = useMemo((): Ativo[] => {
    if (!carteira) return [];
    if ((carteira.ativosAtuais ?? []).length > 0) return carteira.ativosAtuais!;
    return (carteira.planoAcao ?? [])
      .filter(item => item.acao !== "novo" && item.valorAtualBRL > 0)
      .map(item => ({
        id: item.id,
        card: item.card as Ativo["card"],
        nome: item.nomeAtivo,
        segmento: item.segmento ?? "",
        valorBRL: item.valorAtualBRL,
      }));
  }, [carteira]);

  // Only saída goals with valorBRL > 0
  const goals = useMemo(() =>
    objetivos
      .filter(o => o.ativo !== false && o.valorBRL > 0 && o.tipoFluxo !== "entrada")
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes),
    [objetivos]
  );

  function alocadoTotal(objId: string) {
    return (gbi.alocacoes[objId] ?? []).reduce((s, l) => s + l.valorAlocado, 0);
  }

  function updateLink(objId: string, ativo: Ativo, rawVal: string) {
    const val = parseBRL(rawVal);
    setGBI(prev => {
      const links = prev.alocacoes[objId] ?? [];
      let next: GBILink[];
      if (val <= 0) {
        next = links.filter(l => l.ativoId !== ativo.id);
      } else {
        const existing = links.find(l => l.ativoId === ativo.id);
        next = existing
          ? links.map(l => l.ativoId === ativo.id ? { ...l, valorAlocado: val } : l)
          : [...links, { ativoId: ativo.id, ativoNome: ativo.nome, valorAlocado: val }];
      }
      const state: GBIState = { ...prev, alocacoes: { ...prev.alocacoes, [objId]: next } };
      saveGBI(clienteId, state);
      return state;
    });
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
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
              Vincule investimentos da carteira a cada objetivo de vida
            </p>
          </div>
        </div>
        {totalCarteira > 0 && (
          <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" }}>
            Carteira total: <strong style={{ color: "#374151" }}>{formatBRL(totalCarteira)}</strong>
          </div>
        )}
      </div>

      {/* Goal cards */}
      {goals.map(obj => {
        const cor = TIPO_COR[obj.tipo] ?? defaultCor;
        const icone = TIPO_ICONE[obj.tipo] ?? "ti-target";
        const alocado = alocadoTotal(obj.id);
        const pct = obj.valorBRL > 0 ? Math.min(100, (alocado / obj.valorBRL) * 100) : 0;
        const concluido = pct >= 100;
        const isExpanded = expandedId === obj.id;
        const links = gbi.alocacoes[obj.id] ?? [];

        return (
          <div key={obj.id} style={{
            background: "white",
            border: `1px solid ${concluido ? "#BBFCCC" : "#E5E7EB"}`,
            borderRadius: 16,
            overflow: "hidden",
            transition: "border-color 200ms",
          }}>

            {/* Card body */}
            <div style={{ padding: "18px 20px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Icon circle */}
                  <div style={{
                    width: 46, height: 46, borderRadius: "50%",
                    background: cor.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <i className={`ti ${icone}`} style={{ fontSize: 20, color: cor.text }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>
                      {String(obj.mes).padStart(2, "0")}.{obj.ano}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                      {obj.label}
                    </div>
                  </div>
                </div>

                {/* Vincular button */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                  style={{
                    border: `1px solid ${isExpanded ? "#BFDBFE" : "#E5E7EB"}`,
                    borderRadius: 8, padding: "5px 12px",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: isExpanded ? "#EFF6FF" : "#FAFAFA",
                    color: isExpanded ? "#1D4ED8" : "#6B7280",
                    display: "flex", alignItems: "center", gap: 5,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-link"}`} style={{ fontSize: 12 }} />
                  {isExpanded ? "Fechar" : links.length > 0 ? `${links.length} ativo${links.length !== 1 ? "s" : ""}` : "Vincular"}
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 7, background: "#F0F2F5", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${pct}%`,
                    background: concluido ? "#16A34A" : cor.bar,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    Alocado:{" "}
                    <strong style={{ color: concluido ? "#16A34A" : "#111827" }}>
                      {formatBRL(alocado)}
                    </strong>
                    {pct > 0 && !concluido && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "#9CA3AF" }}>({pct.toFixed(0)}%)</span>
                    )}
                    {concluido && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "#16A34A", fontWeight: 600 }}>
                        ✓ Meta atingida
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    {formatBRL(obj.valorBRL)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded: ativo selection */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid #F3F4F6", background: "#F8FAFF" }}>
                <div style={{ padding: "12px 20px 4px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Investimentos vinculados a este objetivo
                  </span>
                </div>

                {ativos.length === 0 ? (
                  <div style={{ padding: "16px 20px 20px", fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
                    <i className="ti ti-wallet-off" style={{ fontSize: 22, display: "block", marginBottom: 6 }} />
                    Nenhum ativo na carteira disponível.<br />
                    <span style={{ fontSize: 11 }}>Lance a Carteira Atual em Gestão de Investimentos primeiro.</span>
                  </div>
                ) : (
                  <div style={{ padding: "4px 20px 16px" }}>
                    {/* Column headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px", gap: 8, padding: "6px 0 4px", borderBottom: "0.5px solid #E5E7EB" }}>
                      {["Ativo", "Saldo", "Alocar (R$)"].map((h, i) => (
                        <span key={h} style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i > 0 ? "right" : "left" }}>{h}</span>
                      ))}
                    </div>

                    {ativos.map(ativo => {
                      const linked = links.find(l => l.ativoId === ativo.id);
                      const draftKey = `${obj.id}_${ativo.id}`;
                      const displayVal = draft[draftKey] !== undefined
                        ? draft[draftKey]
                        : linked ? toBRLStr(linked.valorAlocado) : "";

                      return (
                        <div key={ativo.id} style={{
                          display: "grid", gridTemplateColumns: "1fr 90px 120px",
                          alignItems: "center", gap: 8,
                          padding: "8px 0",
                          borderBottom: "0.5px solid #F3F4F6",
                        }}>
                          <div>
                            <div style={{
                              fontSize: 12,
                              color: linked ? "#111827" : "#374151",
                              fontWeight: linked ? 600 : 400,
                            }}>
                              {ativo.nome}
                            </div>
                            {ativo.segmento && (
                              <div style={{ fontSize: 10, color: "#9CA3AF" }}>{ativo.segmento}</div>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" }}>
                            {formatBRL(ativo.valorBRL)}
                          </span>
                          <input
                            type="text" inputMode="decimal"
                            placeholder="0,00"
                            value={displayVal}
                            onChange={e => setDraft(p => ({ ...p, [draftKey]: e.target.value }))}
                            onBlur={e => {
                              updateLink(obj.id, ativo, e.target.value);
                              setDraft(p => { const n = { ...p }; delete n[draftKey]; return n; });
                            }}
                            style={{
                              border: `1px solid ${linked ? "#BFDBFE" : "#E5E7EB"}`,
                              borderRadius: 7, padding: "5px 8px",
                              fontSize: 12, fontWeight: linked ? 600 : 400,
                              color: linked ? "#1D4ED8" : "#374151",
                              background: linked ? "#EFF6FF" : "white",
                              outline: "none", width: "100%",
                              boxSizing: "border-box", textAlign: "right",
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* Total row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>Total vinculado:</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: concluido ? "#16A34A" : "#1D4ED8" }}>
                          {formatBRL(alocado)}
                        </span>
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 6 }}>
                          de {formatBRL(obj.valorBRL)}
                        </span>
                      </div>
                    </div>
                  </div>
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
            { label: "Objetivos", val: goals.length, suffix: "" },
            { label: "Total metas", val: formatBRL(goals.reduce((s, o) => s + o.valorBRL, 0)), suffix: "" },
            { label: "Total alocado", val: formatBRL(goals.reduce((s, o) => s + alocadoTotal(o.id), 0)), suffix: "" },
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
