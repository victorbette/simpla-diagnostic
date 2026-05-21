import { useState, useRef, useMemo } from "react";
import { Upload, X, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Ativo } from "@/lib/carteira/types";
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
}

const CONTEXT_LABELS: Record<SimplaCardId, string> = {
  resgate_rapido: "CDB, LCI, LCA, Tesouro Selic, fundo DI",
  resgate_longo: "Tesouro IPCA+, NTN-B, CRI, CRA, debêntures",
  acoes: "Ações de empresas brasileiras",
  fiis: "Fundos de investimento imobiliário",
  exterior: "ETFs, stocks, bonds em USD",
  cripto: "Bitcoin, Ethereum e outros criptoativos",
};

export function Etapa1CarteiraAtual({ ativos, onAtivos, usdBrl, onUsdBrl }: Props) {
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
  const grupoOrder = ["Renda Fixa", "Renda Variável Brasil", "Internacional", "Criptoativos"];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
      {/* LEFT SIDE */}
      <div className="space-y-6">
        {/* AI Import Panel */}
        <div
          className="rounded-lg border bg-card"
          style={{ borderTop: "3px solid #BBA866", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <button
            onClick={() => setIaOpen(!iaOpen)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#BBA866" }} />
              <span style={{ fontWeight: 600, color: "#000000" }}>Importar com IA</span>
              <span className="text-xs text-muted-foreground font-normal">
                — envie extratos, prints, PDF ou planilhas
              </span>
            </div>
            {iaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {iaOpen && (
            <div className="px-4 pb-4 space-y-3 border-t">
              <p className="text-xs text-muted-foreground mt-3">
                Envie extratos de corretoras, prints de aplicativos ou planilhas. A IA identificará os ativos automaticamente.
              </p>
              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                style={{ borderColor: "#E2DCC8" }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIaArquivos((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                }}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste arquivos ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Imagens, PDF, Excel, CSV — qualquer formato
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) =>
                  setIaArquivos((prev) => [...prev, ...Array.from(e.target.files ?? [])])
                }
              />

              {/* File list */}
              {iaArquivos.length > 0 && (
                <div className="space-y-1">
                  {iaArquivos.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1"
                    >
                      <span className="flex-1 truncate">{f.name}</span>
                      <button
                        onClick={() =>
                          setIaArquivos((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                disabled={iaArquivos.length === 0 || iaLoading}
                onClick={handleAnalisarIA}
                style={{
                  backgroundColor: "#BBA866",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  opacity: (iaArquivos.length === 0 || iaLoading) ? 0.5 : 1,
                }}
              >
                {iaLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  "Analisar com IA"
                )}
              </button>
              {iaProgress && (
                <p className="text-xs text-muted-foreground">{iaProgress}</p>
              )}
              {iaError && <p className="text-xs text-[#7A3535]">{iaError}</p>}

              {/* Triagem table */}
              {iaExtraidos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ativos extraídos — revise e confirme</p>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs">
                      <thead style={{ backgroundColor: "#000000" }}>
                        <tr>
                          <th style={{ color: "white", padding: "8px 8px", fontWeight: 600, textAlign: "left" }} className="w-8"></th>
                          <th style={{ color: "white", padding: "8px 8px", fontWeight: 600, textAlign: "left" }}>Nome</th>
                          <th style={{ color: "white", padding: "8px 8px", fontWeight: 600, textAlign: "left" }}>Valor R$</th>
                          <th style={{ color: "white", padding: "8px 8px", fontWeight: 600, textAlign: "left" }}>Card</th>
                          <th style={{ color: "white", padding: "8px 8px", fontWeight: 600, textAlign: "left" }}>Segmento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {iaExtraidos.map((_x, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={iaSelecionados[i] ?? true}
                                onChange={(e) =>
                                  setIaSelecionados((prev) =>
                                    prev.map((v, j) => (j === i ? e.target.checked : v))
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                className="h-6 text-xs"
                                value={iaNomes[i] ?? ""}
                                onChange={(e) =>
                                  setIaNomes((prev) =>
                                    prev.map((v, j) => (j === i ? e.target.value : v))
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                className="h-6 text-xs w-28"
                                value={iaValores[i] ?? 0}
                                onChange={(e) =>
                                  setIaValores((prev) =>
                                    prev.map((v, j) =>
                                      j === i ? parseFloat(e.target.value) || 0 : v
                                    )
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={iaCards[i] ?? "resgate_rapido"}
                                className="text-xs border rounded px-1 py-0.5 bg-background"
                                onChange={(e) => {
                                  const newCard = e.target.value as SimplaCardId;
                                  setIaCards((prev) =>
                                    prev.map((v, j) => (j === i ? newCard : v))
                                  );
                                  setIaSegmentos((prev) =>
                                    prev.map((v, j) =>
                                      j === i ? segmentoPadrao(newCard) : v
                                    )
                                  );
                                }}
                              >
                                {SIMPLA_CARDS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <SegmentoSelect
                                cardId={iaCards[i] ?? "resgate_rapido"}
                                value={iaSegmentos[i] ?? ""}
                                onChange={(v) =>
                                  setIaSegmentos((prev) =>
                                    prev.map((s, j) => (j === i ? v : s))
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleAdicionarSelecionados}
                    style={{
                      backgroundColor: "#000000",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Adicionar selecionados à carteira
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section groups */}
        {grupoOrder.map((grupoNome) => {
          const cards = grupos[grupoNome] ?? [];
          const grupoVal = ativos
            .filter((a) => cards.some((c) => c.id === a.card))
            .reduce((s, a) => s + a.valorBRL, 0);
          const grupoPct = ativos
            .filter((a) => cards.some((c) => c.id === a.card))
            .reduce((s, a) => s + a.pctCarteira, 0);

          return (
            <div key={grupoNome} className="rounded-lg border overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center justify-between px-4 py-2 border-b"
                style={{ backgroundColor: "#F5F3EE" }}
              >
                <span style={{ fontWeight: 600, color: "#000000", fontSize: 14 }}>{grupoNome}</span>
                <div className="text-right text-xs text-muted-foreground">
                  {grupoNome === "Internacional" && (
                    <span className="mr-3 inline-flex items-center gap-1.5">
                      USD/BRL:
                      <Input
                        type="number"
                        step="0.01"
                        value={usdBrl}
                        onChange={(e) => onUsdBrl(parseFloat(e.target.value) || 5)}
                        className="w-20 h-6 text-xs inline-block"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </span>
                  )}
                  <span className="font-medium text-foreground">{formatBRL(grupoVal)}</span>
                  <span className="ml-2">{formatPct(grupoPct)}</span>
                </div>
              </div>

              {/* Cards within group */}
              {cards.map((card, idx) => (
                <div key={card.id} className={idx > 0 ? "border-t" : ""}>
                  <div className="px-4 pt-2 pb-1">
                    <p className="text-xs font-medium text-foreground">{card.label}</p>
                    <p className="text-xs text-muted-foreground">{CONTEXT_LABELS[card.id]}</p>
                  </div>
                  <div className="px-2 pb-1">
                    <TabelaAtivos
                      card={card}
                      ativos={ativos.filter((a) => a.card === card.id)}
                      onChange={(updated) => replaceCardAtivos(card.id, updated)}
                      patrimonio={patrimonio}
                      usdBrl={usdBrl}
                      modo="atual"
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* RIGHT SIDE */}
      <div className="sticky top-20 space-y-4">
        <div
          className="rounded-lg border bg-card p-4 space-y-4"
          style={{ borderTop: "3px solid #BBA866", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <h3 className="font-semibold text-sm" style={{ fontWeight: 700, color: "#000000", fontSize: 14 }}>Resumo da carteira atual</h3>

          {/* Patrimônio */}
          <div>
            <p
              className="text-xs text-muted-foreground mb-0.5"
              style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9E9070" }}
            >
              Patrimônio total
            </p>
            <p className="text-2xl font-bold" style={{ color: "#000000" }}>{formatBRL(patrimonio)}</p>
          </div>

          {/* Stacked bar */}
          <div className="rounded-full overflow-hidden h-8 flex bg-muted">
            {patrimonio === 0 ? (
              <div className="h-full w-full bg-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground">
                0% alocado
              </div>
            ) : (
              SIMPLA_CARDS.map((c) => {
                const pct = ativos
                  .filter((a) => a.card === c.id)
                  .reduce((s, a) => s + a.pctCarteira, 0);
                if (pct <= 0) return null;
                const val = ativos
                  .filter((a) => a.card === c.id)
                  .reduce((s, a) => s + a.valorBRL, 0);
                return (
                  <div
                    key={c.id}
                    style={{ width: `${pct}%`, backgroundColor: c.cor }}
                    title={`${c.label}: ${formatPct(pct)} — ${formatBRL(val)}`}
                    className="h-full transition-all"
                  />
                );
              })
            )}
          </div>

          {/* Summary tree table */}
          <table className="w-full text-xs">
            <tbody>
              {grupoOrder.map((grupoNome, gi) => {
                const cards = grupos[grupoNome] ?? [];
                const gVal = ativos
                  .filter((a) => cards.some((c) => c.id === a.card))
                  .reduce((s, a) => s + a.valorBRL, 0);
                const gPct = patrimonio > 0 ? (gVal / patrimonio) * 100 : 0;
                return (
                  <>
                    <tr key={grupoNome} className={cn("font-semibold", gi > 0 ? "border-t" : "")}>
                      <td className="py-1">{grupoNome}</td>
                      <td className="text-right py-1">{formatBRL(gVal)}</td>
                      <td className="text-right text-muted-foreground py-1">{formatPct(gPct)}</td>
                    </tr>
                    {cards.map((card) => {
                      const cVal = ativos
                        .filter((a) => a.card === card.id)
                        .reduce((s, a) => s + a.valorBRL, 0);
                      const cPct = patrimonio > 0 ? (cVal / patrimonio) * 100 : 0;
                      return (
                        <tr key={card.id} className="text-muted-foreground">
                          <td className="pl-4 py-0.5">{card.label}</td>
                          <td className="text-right py-0.5">{formatBRL(cVal)}</td>
                          <td className="text-right py-0.5">{formatPct(cPct)}</td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}
              <tr className="font-bold border-t-2">
                <td className="py-1">Total</td>
                <td className="text-right py-1">{formatBRL(patrimonio)}</td>
                <td className="text-right py-1">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
