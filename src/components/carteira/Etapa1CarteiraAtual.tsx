import { useState, useRef, useMemo } from "react";
import { Upload, X, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Ativo } from "@/lib/carteira/types";
import type { Cotacao } from "../../hooks/useCotacoes";
import type { AtivoExtraido } from "@/lib/carteira/leitorIA";
import { lerCarteiraClaude } from "@/lib/carteira/leitorIA";
import {
  calcularPatrimonio,
  atualizarPcts,
  genId,
  formatBRL,
  formatPct,
} from "@/lib/carteira/calculos";
import {
  SIMPLA_CARDS,
  getCard,
  cardsPorGrupo,
  segmentoPadrao,
} from "@/lib/carteira/segmentos";
import type { SimplaCardId } from "@/lib/carteira/segmentos";
import { SegmentoSelect } from "./SegmentoSelect";
import { TabelaAtivos } from "./TabelaAtivos";

interface Props {
  ativos: Ativo[];
  onAtivos: (a: Ativo[]) => void;
  usdBrl: number;
  onUsdBrl: (v: number) => void;
  cotacoes?: Record<string, Cotacao>;
}

const CONTEXT_LABELS: Record<SimplaCardId, string> = {
  resgate_rapido: "CDB, LCI, LCA, Tesouro Selic, fundo DI",
  resgate_longo: "Tesouro IPCA+, NTN-B, CRI, CRA, debêntures",
  acoes: "Ações de empresas brasileiras",
  fiis: "Fundos de investimento imobiliário",
  exterior: "ETFs, stocks, REITs em USD",
  cripto: "BTC, ETH e outros criptoativos",
};

const GRUPO_DOTS: Record<string, string> = {
  "Renda Fixa": "#1E3A8A",
  "Renda Variável Brasil": "#15803D",
  "Internacional": "#B45309",
  "Criptoativos": "#2563EB",
};

const GRUPO_ORDER = ["Renda Fixa", "Renda Variável Brasil", "Internacional", "Criptoativos"];

export function Etapa1CarteiraAtual({ ativos, onAtivos, usdBrl, onUsdBrl, cotacoes = {} }: Props) {
  const [iaOpen, setIaOpen] = useState(false);
  const [iaArquivos, setIaArquivos] = useState<File[]>([]);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaProgress, setIaProgress] = useState("");
  const [iaExtraidos, setIaExtraidos] = useState<AtivoExtraido[]>([]);
  const [iaNomes, setIaNomes] = useState<string[]>([]);
  const [iaValores, setIaValores] = useState<number[]>([]);
  const [iaCards, setIaCards] = useState<SimplaCardId[]>([]);
  const [iaSegmentos, setIaSegmentos] = useState<string[]>([]);
  const [iaSelecionados, setIaSelecionados] = useState<boolean[]>([]);
  const [iaError, setIaError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patrimonio = useMemo(() => calcularPatrimonio(ativos, usdBrl), [ativos, usdBrl]);

  function replaceCardAtivos(cardId: SimplaCardId, updated: Ativo[]) {
    const others = ativos.filter((a) => a.card !== cardId);
    onAtivos(atualizarPcts([...others, ...updated], usdBrl));
  }

  async function handleAnalisarIA() {
    setIaLoading(true);
    setIaError("");
    setIaExtraidos([]);
    try {
      const r = await lerCarteiraClaude(iaArquivos, setIaProgress);
      setIaExtraidos(r);
      setIaNomes(r.map((x) => x.nome));
      setIaValores(r.map((x) => x.valorBRL));
      const cards = r.map((x): SimplaCardId => x.cardInferido ?? "resgate_rapido");
      setIaCards(cards);
      setIaSegmentos(cards.map((c) => segmentoPadrao(c)));
      setIaSelecionados(r.map(() => true));
    } catch (e) {
      setIaError(e instanceof Error ? e.message : "Erro ao analisar.");
    } finally {
      setIaLoading(false);
    }
  }

  function handleAdicionarSelecionados() {
    const novos: Ativo[] = iaExtraidos
      .filter((_x, i) => iaSelecionados[i])
      .map((_x, i) => {
        const cardId = iaCards[i] ?? ("resgate_rapido" as SimplaCardId);
        const card = getCard(cardId);
        const base: Ativo = {
          id: genId(),
          card: cardId,
          segmento: iaSegmentos[i] ?? segmentoPadrao(cardId),
          nome: iaNomes[i] ?? "",
          valorBRL: iaValores[i] ?? 0,
          pctCarteira: 0,
        };
        if (card.inputTipo === "posicao_brl") {
          base.posicaoBRL = iaValores[i] ?? 0;
        }
        return base;
      });
    onAtivos(atualizarPcts([...ativos, ...novos], usdBrl));
    setIaExtraidos([]);
    setIaArquivos([]);
  }

  const grupos = cardsPorGrupo();

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

      {/* ── MAIN COLUMN ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* AI Import Panel */}
        <div style={{
          border: "0.5px solid #BFDBFE", borderRadius: 10,
          overflow: "hidden", backgroundColor: "white",
        }}>
          <button
            onClick={() => setIaOpen(!iaOpen)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 16px",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles style={{ width: 16, height: 16, color: "#2563EB" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Importar com IA</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>— envie extratos, prints, PDF ou planilhas</span>
            </div>
            {iaOpen
              ? <ChevronUp style={{ width: 16, height: 16, color: "#6B7280" }} />
              : <ChevronDown style={{ width: 16, height: 16, color: "#6B7280" }} />
            }
          </button>

          {iaOpen && (
            <div style={{ borderTop: "0.5px solid #BFDBFE", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Drop zone */}
              <div
                style={{
                  border: "1.5px dashed #BFDBFE", borderRadius: 10,
                  padding: 28, textAlign: "center", backgroundColor: "#EFF6FF",
                  cursor: "pointer", transition: "all 150ms",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#2563EB";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#DBEAFE";
                }}
                onDragLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#EFF6FF";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#EFF6FF";
                  setIaArquivos((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                }}
              >
                <Upload style={{ width: 32, height: 32, color: "#60A5FA", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Arraste arquivos ou clique para selecionar</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>Imagens, PDF, Excel, CSV</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
                style={{ display: "none" }}
                onChange={(e) => setIaArquivos((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />

              {iaArquivos.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {iaArquivos.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, backgroundColor: "#F8FAFC", borderRadius: 6, padding: "4px 8px" }}>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                      <button
                        onClick={() => setIaArquivos((prev) => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                disabled={iaArquivos.length === 0 || iaLoading}
                onClick={handleAnalisarIA}
                style={{
                  backgroundColor: "#2563EB", color: "white", border: "none",
                  borderRadius: 8, padding: "8px 20px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, fontSize: 13,
                  opacity: (iaArquivos.length === 0 || iaLoading) ? 0.5 : 1,
                  alignSelf: "flex-start",
                }}
              >
                {iaLoading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Analisando...</> : "Analisar com IA"}
              </button>

              {iaProgress && <p style={{ fontSize: 12, color: "#6B7280" }}>{iaProgress}</p>}
              {iaError && <p style={{ fontSize: 12, color: "#B91C1C" }}>{iaError}</p>}

              {iaExtraidos.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Ativos extraídos — revise e confirme</p>
                  <div style={{ border: "0.5px solid #BFDBFE", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead style={{ backgroundColor: "#1E3A8A" }}>
                        <tr>
                          <th style={{ color: "white", padding: "8px 10px", textAlign: "center", width: 32 }}></th>
                          <th style={{ color: "white", padding: "8px 10px", textAlign: "left" }}>Nome</th>
                          <th style={{ color: "white", padding: "8px 10px", textAlign: "left" }}>Valor R$</th>
                          <th style={{ color: "white", padding: "8px 10px", textAlign: "left" }}>Classe</th>
                          <th style={{ color: "white", padding: "8px 10px", textAlign: "left" }}>Segmento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {iaExtraidos.map((_x, i) => (
                          <tr key={i} style={{ borderTop: "0.5px solid #BFDBFE" }}>
                            <td style={{ padding: "6px 10px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={iaSelecionados[i] ?? true}
                                onChange={(e) => setIaSelecionados((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                              />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ backgroundColor: "#DBEAFE", color: "#1E40AF", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>IA</span>
                                <Input className="h-6 text-xs" value={iaNomes[i] ?? ""} onChange={(e) => setIaNomes((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))} />
                              </div>
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <Input type="number" className="h-6 text-xs w-28" value={iaValores[i] ?? 0} onChange={(e) => setIaValores((prev) => prev.map((v, j) => j === i ? parseFloat(e.target.value) || 0 : v))} />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <select value={iaCards[i] ?? "resgate_rapido"} className="text-xs border rounded px-1 py-0.5 bg-background" onChange={(e) => { const c = e.target.value as SimplaCardId; setIaCards((prev) => prev.map((v, j) => j === i ? c : v)); setIaSegmentos((prev) => prev.map((v, j) => j === i ? segmentoPadrao(c) : v)); }}>
                                {SIMPLA_CARDS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <SegmentoSelect cardId={iaCards[i] ?? "resgate_rapido"} value={iaSegmentos[i] ?? ""} onChange={(v) => setIaSegmentos((prev) => prev.map((s, j) => j === i ? v : s))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleAdicionarSelecionados}
                    style={{ backgroundColor: "#1E3A8A", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, alignSelf: "flex-start" }}
                  >
                    Adicionar selecionados à carteira
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Asset Groups */}
        {GRUPO_ORDER.map((grupoNome) => {
          const cards = grupos[grupoNome] ?? [];
          const grupoVal = ativos.filter((a) => cards.some((c) => c.id === a.card)).reduce((s, a) => s + a.valorBRL, 0);
          const grupoPct = patrimonio > 0 ? (grupoVal / patrimonio) * 100 : 0;
          const dotColor = GRUPO_DOTS[grupoNome] ?? "#6B7280";

          return (
            <div key={grupoNome} style={{ border: "0.5px solid #BFDBFE", borderRadius: 10, overflow: "hidden", backgroundColor: "white" }}>
              {/* Group header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", backgroundColor: "#F8FAFC",
                borderBottom: "0.5px solid #BFDBFE",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: dotColor, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{grupoNome}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {grupoNome === "Internacional" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" }}>
                      <span>Câmbio USD/BRL:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={usdBrl}
                        onChange={(e) => onUsdBrl(parseFloat(e.target.value) || 5)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: 70, border: "0.5px solid #BFDBFE", borderRadius: 6,
                          padding: "3px 6px", fontSize: 12, outline: "none", textAlign: "right",
                        }}
                      />
                    </div>
                  )}
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    {formatBRL(grupoVal)} · {formatPct(grupoPct)}
                  </span>
                </div>
              </div>

              {/* Subclasses (cards) */}
              {cards.map((card, idx) => (
                <div key={card.id} style={{ borderTop: idx === 0 ? "none" : "0.5px solid #BFDBFE" }}>
                  {/* Subclass header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 16px", backgroundColor: "white",
                    borderBottom: "0.5px solid #BFDBFE",
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 500, letterSpacing: "0.04em",
                      textTransform: "uppercase" as const, color: "#6B7280",
                    }}>
                      {card.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{CONTEXT_LABELS[card.id]}</span>
                  </div>
                  <TabelaAtivos
                    card={card}
                    ativos={ativos.filter((a) => a.card === card.id)}
                    onChange={(updated) => replaceCardAtivos(card.id, updated)}
                    patrimonio={patrimonio}
                    usdBrl={usdBrl}
                    modo="atual"
                    cotacoes={cotacoes}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Card: Resumo da carteira */}
        <div style={{ border: "0.5px solid #BFDBFE", borderRadius: 10, overflow: "hidden", backgroundColor: "white" }}>
          <div style={{
            padding: "10px 14px", borderBottom: "0.5px solid #BFDBFE",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 12, fontWeight: 500,
          }}>
            <span style={{ color: "#111827" }}>Resumo da carteira</span>
            <span style={{ backgroundColor: "#DBEAFE", color: "#2563EB", borderRadius: 99, fontSize: 10, padding: "2px 7px" }}>Atualizado</span>
          </div>
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Patrimônio total</p>
              <p style={{ fontSize: 22, fontWeight: 500, color: "#1E3A8A", margin: 0 }}>{formatBRL(patrimonio)}</p>
            </div>

            {/* Stacked bar */}
            <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex", backgroundColor: "#F0F7FF" }}>
              {patrimonio === 0
                ? <div style={{ width: "100%", backgroundColor: "#E5E7EB" }} />
                : GRUPO_ORDER.map((grupoNome) => {
                    const gCards = grupos[grupoNome] ?? [];
                    const gVal = ativos.filter((a) => gCards.some((c) => c.id === a.card)).reduce((s, a) => s + a.valorBRL, 0);
                    const gPct = patrimonio > 0 ? (gVal / patrimonio) * 100 : 0;
                    if (gPct <= 0) return null;
                    return (
                      <div key={grupoNome} style={{ width: `${gPct}%`, backgroundColor: GRUPO_DOTS[grupoNome] ?? "#6B7280", transition: "width 300ms" }} />
                    );
                  })
              }
            </div>

            {/* Groups table */}
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                {GRUPO_ORDER.map((grupoNome, gi) => {
                  const gCards = grupos[grupoNome] ?? [];
                  const gVal = ativos.filter((a) => gCards.some((c) => c.id === a.card)).reduce((s, a) => s + a.valorBRL, 0);
                  const gPct = patrimonio > 0 ? (gVal / patrimonio) * 100 : 0;
                  return (
                    <tr key={grupoNome} style={{ borderTop: gi === 0 ? "none" : "0.5px solid #F0F7FF" }}>
                      <td style={{ padding: "4px 0", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: GRUPO_DOTS[grupoNome] ?? "#6B7280", display: "inline-block", flexShrink: 0 }} />
                        <span style={{ color: "#374151" }}>{grupoNome.split(" ")[0]}</span>
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right", color: "#6B7280" }}>{formatBRL(gVal)}</td>
                      <td style={{ padding: "4px 0", textAlign: "right", color: "#9CA3AF", width: 40 }}>{formatPct(gPct)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: "1px solid #BFDBFE", fontWeight: 600 }}>
                  <td style={{ paddingTop: 6 }}>Total</td>
                  <td style={{ paddingTop: 6, textAlign: "right" }}>{formatBRL(patrimonio)}</td>
                  <td style={{ paddingTop: 6, textAlign: "right", color: "#6B7280" }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
