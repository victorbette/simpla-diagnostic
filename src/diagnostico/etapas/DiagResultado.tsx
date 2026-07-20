import { useState, useMemo } from "react";
import {
  calcularProjecaoIF,
  calcularPatrimonioPerpetuidade,
  calcularTaxaNecessaria,
  type ProjecaoIFParams,
} from "@/lib/financialFreedomCalc";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Lead, ProximoPasso, ResultadoDiag } from "../types";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";

interface Props {
  lead: Lead;
  onAtualizar: (patch: Partial<Lead>) => void;
}

const VALID_TIPOS = new Set(Object.keys(OBJETIVO_META));

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

function perfilLabel(key?: string): string {
  switch (key) {
    case "conservador": return "Conservador";
    case "conservador_moderado": return "Conservador Moderado";
    case "moderado": return "Moderado";
    case "arrojado": return "Arrojado";
    default: return "Não definido";
  }
}

function perfilColor(key?: string): string {
  switch (key) {
    case "conservador": return "#3B82F6";
    case "conservador_moderado": return "#1E40AF";
    case "moderado": return "#2563EB";
    case "arrojado": return "#B91C1C";
    default: return "#9CA3AF";
  }
}

const PRIORIDADE_CONFIG = {
  alta: { label: "Alta", color: "#B91C1C", bg: "#FEE2E2" },
  media: { label: "Média", color: "#B45309", bg: "#FEF3C7" },
  baixa: { label: "Baixa", color: "#15803D", bg: "#DCFCE7" },
};

export function DiagResultado({ lead, onAtualizar }: Props) {
  const { dadosColeta, dadosLF } = lead;
  const [novoTexto, setNovoTexto] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<ProximoPasso["prioridade"]>("media");

  const passos = lead.resultado?.proximosPassos ?? [];

  function salvarPassos(novos: ProximoPasso[]) {
    const resultado: ResultadoDiag = {
      ...lead.resultado,
      proximosPassos: novos,
      dataResultado: new Date().toISOString(),
    };
    onAtualizar({ resultado });
  }

  function addPasso() {
    if (!novoTexto.trim()) return;
    const novo: ProximoPasso = { id: crypto.randomUUID(), texto: novoTexto.trim(), prioridade: novaPrioridade };
    salvarPassos([...passos, novo]);
    setNovoTexto("");
  }

  function removePasso(id: string) {
    salvarPassos(passos.filter(p => p.id !== id));
  }

  function togglePrioridade(id: string) {
    const ordem: ProximoPasso["prioridade"][] = ["alta", "media", "baixa"];
    salvarPassos(passos.map(p => {
      if (p.id !== id) return p;
      const idx = ordem.indexOf(p.prioridade);
      return { ...p, prioridade: ordem[(idx + 1) % 3] };
    }));
  }

  // ── Recalculate from dadosLF ──
  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const anoNascimento = parsed?.ano ?? (new Date().getFullYear() - 30);
  const mesNascimento = parsed?.mes ?? 1;
  const idadeAtual = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30;

  const patrimonioInicial = Number(dadosLF.patrimonioInicial) || Number(dadosColeta.patrimonioFinanceiro) || 0;
  const aporteMensal = Number(dadosLF.aporteMensal) || Number(dadosColeta.aporteMensal) || 0;
  const idadeAlvo = Number(dadosLF.idadeAlvo) || Number(dadosColeta.idadeMeta) || 60;
  const rendaDesejada = Number(dadosLF.rendaDesejada) || Number(dadosColeta.rendaDesejadaAposentadoria) || 0;

  const objetivosAtivos = useMemo((): ObjetivoVida[] => {
    const raw = dadosLF.objetivos ?? [];
    return (raw as Record<string, unknown>[])
      .filter(o => VALID_TIPOS.has(String(o.tipo)) && o.ativo !== false) as unknown as ObjetivoVida[];
  }, [dadosLF.objetivos]);

  const patrimonioPerpetuidade = useMemo(() => {
    if (!rendaDesejada) return 0;
    return calcularPatrimonioPerpetuidade(rendaDesejada);
  }, [rendaDesejada]);

  const taxaEfetiva = useMemo(() => {
    if (dadosLF.taxaTravada && dadosLF.taxaTravadaValor != null) return dadosLF.taxaTravadaValor;
    if (patrimonioPerpetuidade <= 0) return 0.03;
    return calcularTaxaNecessaria({
      patrimonioAtual: patrimonioInicial,
      aporteMensal,
      patrimonioAlvo: patrimonioPerpetuidade,
      idadeAtual,
      idadeAlvo,
      objetivos: objetivosAtivos,
    });
  }, [dadosLF.taxaTravada, dadosLF.taxaTravadaValor, patrimonioPerpetuidade, patrimonioInicial, aporteMensal, idadeAtual, idadeAlvo, objetivosAtivos]);

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual,
    idadeMeta: idadeAlvo,
    idadeMaxima: 100,
    patrimonioInicial,
    aporteMensal,
    rendaMensalDesejada: rendaDesejada,
    taxaRetornoAnual: Math.max(taxaEfetiva, 0.03),
    anoNascimento,
    mesNascimento,
    objetivos: objetivosAtivos,
  }), [idadeAtual, idadeAlvo, patrimonioInicial, aporteMensal, rendaDesejada, taxaEfetiva, anoNascimento, mesNascimento, objetivosAtivos]);

  const result = useMemo(() => {
    try { return calcularProjecaoIF(projecaoParams); } catch { return null; }
  }, [projecaoParams]);

  const rendaSustentavel = result ? (result.patrimonioNaIF * 0.04) / 12 : 0;

  const hasLFData = patrimonioInicial > 0 || aporteMensal > 0 || rendaDesejada > 0;

  const ativos = dadosColeta.ativosAtuais;
  const ativoLabels: string[] = [];
  if (ativos) {
    if (ativos.rendaFixa > 0) ativoLabels.push("Renda Fixa");
    if (ativos.acoes > 0) ativoLabels.push("Ações");
    if (ativos.fiis > 0) ativoLabels.push("FIIs");
    if (ativos.rvGlobal > 0) ativoLabels.push("RV Global");
    if (ativos.rfGlobal > 0) ativoLabels.push("RF Global");
    if (ativos.cripto > 0) ativoLabels.push("Criptoativos");
  }

  return (
    <>
      <style>{`
        @media print {
          .diag-no-print { display: none !important; }
          body { background: white !important; }
          .diag-print-root { padding: 0 !important; }
        }
      `}</style>

      <div className="diag-print-root">
        {/* ── Print button ── */}
        <div className="diag-no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            onClick={() => window.print()}
            style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
          >
            <i className="ti ti-printer" style={{ fontSize: 15 }} />
            Imprimir relatório
          </button>
        </div>

        {/* ── LF Card ── */}
        {hasLFData && result ? (
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <i className="ti ti-trending-up" style={{ fontSize: 16, color: "#15803D" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Liberdade Financeira</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div style={{ background: "#F8FAFF", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #BFDBFE" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>Patrimônio Necessário</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1E40AF" }} className="tabular-nums">{formatCurrency(patrimonioPerpetuidade)}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>perpetuidade (4%)</div>
              </div>
              <div style={{ background: "#F8FAFF", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #BFDBFE" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>Projeção Atual</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: result.ifAlcancada ? "#15803D" : "#B91C1C" }} className="tabular-nums">{formatCurrency(result.patrimonioNaIF)}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>na aposentadoria</div>
              </div>
              <div style={{ background: "#F8FAFF", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #BFDBFE" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>Taxa Necessária</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: taxaEfetiva > 0.15 ? "#B91C1C" : taxaEfetiva > 0.08 ? "#B45309" : "#15803D" }} className="tabular-nums">
                  IPCA + {formatNumber(taxaEfetiva * 100, 1)}% a.a.
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>para atingir a meta</div>
              </div>
              <div style={{ background: "#F8FAFF", borderRadius: 10, padding: "14px 16px", border: "0.5px solid #BFDBFE" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>Renda Sustentável</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: rendaSustentavel >= rendaDesejada && rendaDesejada > 0 ? "#15803D" : "#111827" }} className="tabular-nums">
                  {rendaSustentavel > 0 ? rendaSustentavel.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>/mês com a projeção atual</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24, marginBottom: 16, color: "#9CA3AF", textAlign: "center" as const }}>
            <i className="ti ti-trending-up" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>Configure a simulação de Liberdade Financeira para ver os resultados.</div>
          </div>
        )}

        {/* ── Carteira Card ── */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <i className="ti ti-chart-pie" style={{ fontSize: 16, color: "#2563EB" }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Carteira & Perfil</h3>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>Perfil de risco</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: perfilColor(dadosColeta.suitabilityPerfil), background: `${perfilColor(dadosColeta.suitabilityPerfil)}18`, padding: "4px 12px", borderRadius: 999 }}>
                {perfilLabel(dadosColeta.suitabilityPerfil)}
              </span>
            </div>
            {ativoLabels.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>Classes na carteira</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {ativoLabels.map(l => (
                    <span key={l} style={{ fontSize: 11, fontWeight: 500, color: "#1E40AF", background: "#DBEAFE", padding: "3px 10px", borderRadius: 999 }}>{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Próximos Passos ── */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <i className="ti ti-list-check" style={{ fontSize: 16, color: "#1E3A8A" }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Próximos Passos</h3>
          </div>

          {passos.length === 0 && (
            <div style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 16 }}>Nenhum passo cadastrado.</div>
          )}

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 16 }}>
            {passos.map(p => {
              const cfg = PRIORIDADE_CONFIG[p.prioridade];
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F8FAFF", borderRadius: 8, border: "0.5px solid #E5E7EB" }}>
                  <button
                    onClick={() => togglePrioridade(p.id)}
                    title="Alterar prioridade"
                    style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: "none", borderRadius: 4, padding: "2px 7px", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {cfg.label}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{p.texto}</span>
                  <button
                    onClick={() => removePasso(p.id)}
                    className="diag-no-print"
                    style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: "2px 4px", fontSize: 15, fontFamily: "inherit" }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add passo */}
          <div className="diag-no-print" style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={novoTexto}
              onChange={e => setNovoTexto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPasso()}
              placeholder="Descreva o próximo passo..."
              style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit" }}
            />
            <select
              value={novaPrioridade}
              onChange={e => setNovaPrioridade(e.target.value as ProximoPasso["prioridade"])}
              style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "#374151", outline: "none", fontFamily: "inherit", cursor: "pointer" }}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <button
              onClick={addPasso}
              style={{ background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}
            >
              + Adicionar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
