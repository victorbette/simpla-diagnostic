import { useState, useRef, useMemo } from "react";
import { Trash2, Plus, Upload, X, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Ativo, ClasseAtivo } from "@/lib/carteira/types";
import { CLASSES } from "@/lib/carteira/types";
import type { AtivoExtraido } from "@/lib/carteira/leitorIA";
import { lerCarteiraClaude } from "@/lib/carteira/leitorIA";
import {
  calcularPatrimonio,
  calcularValorBRL,
  atualizarPcts,
  genId,
  formatBRL,
  formatPct,
} from "@/lib/carteira/calculos";

interface Props {
  ativos: Ativo[];
  onAtivos: (a: Ativo[]) => void;
  usdBrl: number;
  onUsdBrl: (v: number) => void;
}

function SectionHeader({ label, valor, pct }: { label: string; valor: number; pct: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg border-b">
      <span className="font-semibold text-sm">{label}</span>
      <div className="text-right text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatBRL(valor)}</span>
        <span className="ml-2">{formatPct(pct)}</span>
      </div>
    </div>
  );
}

export function Etapa1CarteiraAtual({ ativos, onAtivos, usdBrl, onUsdBrl }: Props) {
  const [iaOpen, setIaOpen] = useState(false);
  const [iaArquivos, setIaArquivos] = useState<File[]>([]);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaProgress, setIaProgress] = useState("");
  const [iaExtraidos, setIaExtraidos] = useState<AtivoExtraido[]>([]);
  const [iaNomes, setIaNomes] = useState<string[]>([]);
  const [iaValores, setIaValores] = useState<number[]>([]);
  const [iaClasses, setIaClasses] = useState<ClasseAtivo[]>([]);
  const [iaSelecionados, setIaSelecionados] = useState<boolean[]>([]);
  const [iaError, setIaError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patrimonio = useMemo(() => calcularPatrimonio(ativos, usdBrl), [ativos, usdBrl]);

  function makeAtivo(classe: ClasseAtivo, extra?: Partial<Ativo>): Ativo {
    return { id: genId(), classe, nome: "", valorBRL: 0, pctCarteira: 0, ...extra };
  }

  function addAtivo(classe: ClasseAtivo, extra?: Partial<Ativo>) {
    onAtivos(atualizarPcts([...ativos, makeAtivo(classe, extra)], usdBrl));
  }

  function updateAtivo(id: string, patch: Partial<Ativo>) {
    onAtivos(atualizarPcts(ativos.map((a) => (a.id === id ? { ...a, ...patch } : a)), usdBrl));
  }

  function removeAtivo(id: string) {
    onAtivos(atualizarPcts(ativos.filter((a) => a.id !== id), usdBrl));
  }

  const rfVal = ativos
    .filter((a) => a.classe === "rf_rapido" || a.classe === "rf_longo")
    .reduce((s, a) => s + a.valorBRL, 0);
  const rfPct = ativos
    .filter((a) => a.classe === "rf_rapido" || a.classe === "rf_longo")
    .reduce((s, a) => s + a.pctCarteira, 0);

  const rvBrVal = ativos
    .filter((a) => a.classe === "rv_acoes" || a.classe === "rv_fiis")
    .reduce((s, a) => s + a.valorBRL, 0);
  const rvBrPct = ativos
    .filter((a) => a.classe === "rv_acoes" || a.classe === "rv_fiis")
    .reduce((s, a) => s + a.pctCarteira, 0);

  const intVal = ativos
    .filter((a) => a.classe === "internacional_rv" || a.classe === "internacional_rf")
    .reduce((s, a) => s + a.valorBRL, 0);
  const intPct = ativos
    .filter((a) => a.classe === "internacional_rv" || a.classe === "internacional_rf")
    .reduce((s, a) => s + a.pctCarteira, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* LEFT SIDE */}
      <div className="space-y-6">
        {/* AI Import Panel */}
        <div className="rounded-lg border bg-card">
          <button
            onClick={() => setIaOpen(!iaOpen)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Importar com IA
              <span className="text-xs text-muted-foreground font-normal">
                — envie extratos, prints, PDF ou planilhas
              </span>
            </div>
            {iaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {iaOpen && (
            <div className="px-4 pb-4 space-y-3 border-t">
              {/* drop zone */}
              <div
                className="mt-3 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
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

              {/* file list */}
              {iaArquivos.length > 0 && (
                <div className="space-y-1">
                  {iaArquivos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1">
                      <span className="flex-1 truncate">{f.name}</span>
                      <button
                        onClick={() => setIaArquivos((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                disabled={iaArquivos.length === 0 || iaLoading}
                onClick={async () => {
                  setIaLoading(true);
                  setIaError("");
                  setIaExtraidos([]);
                  try {
                    const r = await lerCarteiraClaude(iaArquivos, setIaProgress);
                    setIaExtraidos(r);
                    setIaNomes(r.map((x) => x.nome));
                    setIaValores(r.map((x) => x.valorBRL));
                    setIaClasses(r.map((x) => x.classeInferida ?? "rf_rapido"));
                    setIaSelecionados(r.map(() => true));
                  } catch (e) {
                    setIaError(e instanceof Error ? e.message : "Erro ao analisar.");
                  } finally {
                    setIaLoading(false);
                  }
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
              </Button>
              {iaProgress && <p className="text-xs text-muted-foreground">{iaProgress}</p>}
              {iaError && <p className="text-xs text-red-500">{iaError}</p>}

              {/* triagem table */}
              {iaExtraidos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ativos extraídos — revise e confirme</p>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 w-8"></th>
                          <th className="px-2 py-1.5 text-left font-normal">Ativo</th>
                          <th className="px-2 py-1.5 text-left font-normal">Valor R$</th>
                          <th className="px-2 py-1.5 text-left font-normal">Classe</th>
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
                                value={iaClasses[i] ?? "rf_rapido"}
                                className="text-xs border rounded px-1 py-0.5 bg-background"
                                onChange={(e) =>
                                  setIaClasses((prev) =>
                                    prev.map((v, j) =>
                                      j === i ? (e.target.value as ClasseAtivo) : v
                                    )
                                  )
                                }
                              >
                                {CLASSES.map((c) => (
                                  <option key={c.key} value={c.key}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const novos: Ativo[] = iaExtraidos
                        .filter((_x, i) => iaSelecionados[i])
                        .map((_x, i) => ({
                          id: genId(),
                          classe: iaClasses[i] ?? "rf_rapido",
                          nome: iaNomes[i] ?? "",
                          posicaoBRL: iaValores[i] ?? 0,
                          valorBRL: iaValores[i] ?? 0,
                          pctCarteira: 0,
                        }));
                      onAtivos(atualizarPcts([...ativos, ...novos], usdBrl));
                      setIaExtraidos([]);
                      setIaArquivos([]);
                    }}
                  >
                    Adicionar selecionados à carteira
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RENDA FIXA */}
        <div className="rounded-lg border overflow-hidden">
          <SectionHeader label="Renda Fixa" valor={rfVal} pct={rfPct} />

          {/* Resgate Rápido */}
          <div className="border-b">
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
              CDB, LCI, LCA, Tesouro Selic, fundo DI
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-3 py-2 text-left font-normal">Ativo/Fundo</th>
                    <th className="px-3 py-2 text-left font-normal">Segmento</th>
                    <th className="px-3 py-2 text-left font-normal">Vencimento</th>
                    <th className="px-3 py-2 text-right font-normal">Posição R$</th>
                    <th className="px-3 py-2 text-right font-normal">%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos
                    .filter((a) => a.classe === "rf_rapido")
                    .map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.nome}
                            onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                            placeholder="nome..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.segmento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                            placeholder="segmento..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs w-28"
                            value={a.vencimento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })}
                            placeholder="dd/mm/aaaa"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-32 text-right"
                            value={a.posicaoBRL ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatPct(a.pctCarteira)}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeAtivo(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-3 mb-2 h-7 text-xs"
              onClick={() => addAtivo("rf_rapido")}
            >
              <Plus className="h-3 w-3 mr-1" /> Resgate Rápido
            </Button>
          </div>

          {/* Resgate Longo */}
          <div>
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
              Tesouro IPCA+, NTN-B, CRI, CRA, debêntures
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-3 py-2 text-left font-normal">Ativo/Fundo</th>
                    <th className="px-3 py-2 text-left font-normal">Segmento</th>
                    <th className="px-3 py-2 text-left font-normal">Vencimento</th>
                    <th className="px-3 py-2 text-right font-normal">Posição R$</th>
                    <th className="px-3 py-2 text-right font-normal">%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos
                    .filter((a) => a.classe === "rf_longo")
                    .map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.nome}
                            onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                            placeholder="nome..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.segmento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                            placeholder="segmento..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs w-28"
                            value={a.vencimento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })}
                            placeholder="dd/mm/aaaa"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-32 text-right"
                            value={a.posicaoBRL ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatPct(a.pctCarteira)}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeAtivo(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-3 mb-2 h-7 text-xs"
              onClick={() => addAtivo("rf_longo")}
            >
              <Plus className="h-3 w-3 mr-1" /> Resgate Longo
            </Button>
          </div>
        </div>

        {/* RENDA VARIÁVEL BRASIL */}
        <div className="rounded-lg border overflow-hidden">
          <SectionHeader label="Renda Variável Brasil" valor={rvBrVal} pct={rvBrPct} />

          {/* Ações */}
          <div className="border-b">
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
              Ações de empresas brasileiras
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-3 py-2 text-left font-normal">Ticker</th>
                    <th className="px-3 py-2 text-left font-normal">Segmento</th>
                    <th className="px-3 py-2 text-right font-normal">Cotação R$</th>
                    <th className="px-3 py-2 text-right font-normal">Qtde</th>
                    <th className="px-3 py-2 text-right font-normal">Valor R$</th>
                    <th className="px-3 py-2 text-right font-normal">%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos
                    .filter((a) => a.classe === "rv_acoes")
                    .map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs w-24"
                            value={a.nome}
                            onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                            placeholder="PETR4"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.segmento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                            placeholder="segmento..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-24 text-right"
                            value={a.cotacaoBRL ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-24 text-right"
                            value={a.quantidade ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatBRL(a.valorBRL)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatPct(a.pctCarteira)}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeAtivo(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-3 mb-2 h-7 text-xs"
              onClick={() => addAtivo("rv_acoes")}
            >
              <Plus className="h-3 w-3 mr-1" /> Ação
            </Button>
          </div>

          {/* FIIs */}
          <div>
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
              Fundos de investimento imobiliário
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-3 py-2 text-left font-normal">Ticker</th>
                    <th className="px-3 py-2 text-left font-normal">Segmento</th>
                    <th className="px-3 py-2 text-right font-normal">Cotação R$</th>
                    <th className="px-3 py-2 text-right font-normal">Qtde</th>
                    <th className="px-3 py-2 text-right font-normal">Valor R$</th>
                    <th className="px-3 py-2 text-right font-normal">%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos
                    .filter((a) => a.classe === "rv_fiis")
                    .map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs w-24"
                            value={a.nome}
                            onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                            placeholder="HGLG11"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.segmento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                            placeholder="segmento..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-24 text-right"
                            value={a.cotacaoBRL ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-24 text-right"
                            value={a.quantidade ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatBRL(a.valorBRL)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatPct(a.pctCarteira)}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeAtivo(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-3 mb-2 h-7 text-xs"
              onClick={() => addAtivo("rv_fiis")}
            >
              <Plus className="h-3 w-3 mr-1" /> FII
            </Button>
          </div>
        </div>

        {/* INTERNACIONAL */}
        <div className="rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg border-b">
            <span className="font-semibold text-sm">Internacional</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">USD/BRL:</span>
                <Input
                  type="number"
                  step="0.01"
                  value={usdBrl}
                  onChange={(e) => onUsdBrl(parseFloat(e.target.value) || 5)}
                  className="w-20 h-6 text-xs"
                />
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{formatBRL(intVal)}</span>
                <span className="ml-2">{formatPct(intPct)}</span>
              </div>
            </div>
          </div>

          {/* RV Exterior */}
          <div className="border-b">
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
              ETFs, stocks, REITs em USD
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-3 py-2 text-left font-normal">Ticker</th>
                    <th className="px-3 py-2 text-left font-normal">Segmento</th>
                    <th className="px-3 py-2 text-right font-normal">Cotação USD</th>
                    <th className="px-3 py-2 text-right font-normal">Qtde</th>
                    <th className="px-3 py-2 text-right font-normal">Valor R$</th>
                    <th className="px-3 py-2 text-right font-normal">%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos
                    .filter((a) => a.classe === "internacional_rv")
                    .map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs w-24"
                            value={a.nome}
                            onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                            placeholder="VOO"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.segmento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                            placeholder="segmento..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-24 text-right"
                            value={a.cotacaoUSD ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { cotacaoUSD: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-24 text-right"
                            value={a.quantidade ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatBRL(calcularValorBRL(a, usdBrl))}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatPct(a.pctCarteira)}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeAtivo(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-3 mb-2 h-7 text-xs"
              onClick={() => addAtivo("internacional_rv")}
            >
              <Plus className="h-3 w-3 mr-1" /> RV Exterior
            </Button>
          </div>

          {/* RF Exterior */}
          <div>
            <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
              Bonds, treasuries, RF exterior
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-3 py-2 text-left font-normal">Ativo</th>
                    <th className="px-3 py-2 text-left font-normal">Segmento</th>
                    <th className="px-3 py-2 text-right font-normal">Posição R$</th>
                    <th className="px-3 py-2 text-right font-normal">%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ativos
                    .filter((a) => a.classe === "internacional_rf")
                    .map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.nome}
                            onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                            placeholder="nome..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            className="h-7 text-xs"
                            value={a.segmento ?? ""}
                            onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                            placeholder="segmento..."
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            className="h-7 text-xs w-32 text-right"
                            value={a.posicaoBRL ?? 0}
                            onChange={(e) =>
                              updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                          {formatPct(a.pctCarteira)}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => removeAtivo(a.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 ml-3 mb-2 h-7 text-xs"
              onClick={() => addAtivo("internacional_rf")}
            >
              <Plus className="h-3 w-3 mr-1" /> RF Exterior
            </Button>
          </div>
        </div>

        {/* MULTIMERCADOS */}
        <div className="rounded-lg border overflow-hidden">
          <SectionHeader
            label="Multimercados"
            valor={ativos
              .filter((a) => a.classe === "multi")
              .reduce((s, a) => s + a.valorBRL, 0)}
            pct={ativos
              .filter((a) => a.classe === "multi")
              .reduce((s, a) => s + a.pctCarteira, 0)}
          />
          <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
            Fundos macro, hedge, long&amp;short
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="px-3 py-2 text-left font-normal">Fundo</th>
                  <th className="px-3 py-2 text-left font-normal">Segmento</th>
                  <th className="px-3 py-2 text-right font-normal">Posição R$</th>
                  <th className="px-3 py-2 text-right font-normal">%</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {ativos
                  .filter((a) => a.classe === "multi")
                  .map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-7 text-xs"
                          value={a.nome}
                          onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                          placeholder="nome do fundo..."
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-7 text-xs"
                          value={a.segmento ?? ""}
                          onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                          placeholder="segmento..."
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          className="h-7 text-xs w-32 text-right"
                          value={a.posicaoBRL ?? 0}
                          onChange={(e) =>
                            updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                        {formatPct(a.pctCarteira)}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => removeAtivo(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 ml-3 mb-2 h-7 text-xs"
            onClick={() => addAtivo("multi")}
          >
            <Plus className="h-3 w-3 mr-1" /> Multimercado
          </Button>
        </div>

        {/* CRIPTOATIVOS */}
        <div className="rounded-lg border overflow-hidden">
          <SectionHeader
            label="Criptoativos"
            valor={ativos
              .filter((a) => a.classe === "cripto")
              .reduce((s, a) => s + a.valorBRL, 0)}
            pct={ativos
              .filter((a) => a.classe === "cripto")
              .reduce((s, a) => s + a.pctCarteira, 0)}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="px-3 py-2 text-left font-normal">Ativo</th>
                  <th className="px-3 py-2 text-right font-normal">Cotação R$</th>
                  <th className="px-3 py-2 text-right font-normal">Qtde</th>
                  <th className="px-3 py-2 text-right font-normal">Posição R$</th>
                  <th className="px-3 py-2 text-right font-normal">%</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {ativos
                  .filter((a) => a.classe === "cripto")
                  .map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-7 text-xs w-24"
                          value={a.nome}
                          onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                          placeholder="BTC"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          className="h-7 text-xs w-32 text-right"
                          value={a.cotacaoBRL ?? 0}
                          onChange={(e) =>
                            updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          className="h-7 text-xs w-24 text-right"
                          value={a.quantidade ?? 0}
                          onChange={(e) =>
                            updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                        {formatBRL((a.cotacaoBRL ?? 0) * (a.quantidade ?? 0))}
                      </td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                        {formatPct(a.pctCarteira)}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => removeAtivo(a.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 ml-3 mb-2 h-7 text-xs"
            onClick={() => addAtivo("cripto")}
          >
            <Plus className="h-3 w-3 mr-1" /> Criptoativo
          </Button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="sticky top-20 space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">Resumo da carteira atual</h3>

          {/* Patrimônio */}
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Patrimônio total</p>
            <p className="text-2xl font-bold">{formatBRL(patrimonio)}</p>
          </div>

          {/* Stacked bar */}
          <div className="rounded-full overflow-hidden h-8 flex bg-muted">
            {CLASSES.map((c) => {
              const pct = ativos
                .filter((a) => a.classe === c.key)
                .reduce((s, a) => s + a.pctCarteira, 0);
              if (pct <= 0) return null;
              return (
                <div
                  key={c.key}
                  style={{ width: `${pct}%`, backgroundColor: c.cor }}
                  title={`${c.label}: ${formatPct(pct)} — ${formatBRL(
                    ativos
                      .filter((a) => a.classe === c.key)
                      .reduce((s, a) => s + a.valorBRL, 0)
                  )}`}
                  className="h-full transition-all"
                />
              );
            })}
            {patrimonio === 0 && (
              <div className="h-full w-full bg-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground">
                0% alocado
              </div>
            )}
          </div>

          {/* Summary tree table */}
          <table className="w-full text-xs">
            <tbody>
              {/* Renda Fixa */}
              {(() => {
                const rfV = ativos
                  .filter((a) => ["rf_rapido", "rf_longo"].includes(a.classe))
                  .reduce((s, a) => s + a.valorBRL, 0);
                const rfP = patrimonio > 0 ? (rfV / patrimonio) * 100 : 0;
                return (
                  <>
                    <tr className="font-semibold">
                      <td>Renda Fixa</td>
                      <td className="text-right">{formatBRL(rfV)}</td>
                      <td className="text-right text-muted-foreground">{formatPct(rfP)}</td>
                    </tr>
                    {(["rf_rapido", "rf_longo"] as ClasseAtivo[]).map((k) => {
                      const c = CLASSES.find((x) => x.key === k)!;
                      const v = ativos
                        .filter((a) => a.classe === k)
                        .reduce((s, a) => s + a.valorBRL, 0);
                      const p = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
                      return (
                        <tr key={k} className="text-muted-foreground">
                          <td className="pl-4">{c.label}</td>
                          <td className="text-right">{formatBRL(v)}</td>
                          <td className="text-right">{formatPct(p)}</td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
              {/* RV Brasil */}
              {(() => {
                const v = ativos
                  .filter((a) => ["rv_acoes", "rv_fiis"].includes(a.classe))
                  .reduce((s, a) => s + a.valorBRL, 0);
                const p = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
                return (
                  <>
                    <tr className="font-semibold border-t">
                      <td>RV Brasil</td>
                      <td className="text-right">{formatBRL(v)}</td>
                      <td className="text-right text-muted-foreground">{formatPct(p)}</td>
                    </tr>
                    {(["rv_acoes", "rv_fiis"] as ClasseAtivo[]).map((k) => {
                      const c = CLASSES.find((x) => x.key === k)!;
                      const kv = ativos
                        .filter((a) => a.classe === k)
                        .reduce((s, a) => s + a.valorBRL, 0);
                      const kp = patrimonio > 0 ? (kv / patrimonio) * 100 : 0;
                      return (
                        <tr key={k} className="text-muted-foreground">
                          <td className="pl-4">{c.label}</td>
                          <td className="text-right">{formatBRL(kv)}</td>
                          <td className="text-right">{formatPct(kp)}</td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
              {/* Internacional */}
              {(() => {
                const v = ativos
                  .filter((a) =>
                    ["internacional_rv", "internacional_rf"].includes(a.classe)
                  )
                  .reduce((s, a) => s + a.valorBRL, 0);
                const p = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
                return (
                  <>
                    <tr className="font-semibold border-t">
                      <td>Internacional</td>
                      <td className="text-right">{formatBRL(v)}</td>
                      <td className="text-right text-muted-foreground">{formatPct(p)}</td>
                    </tr>
                    {(["internacional_rv", "internacional_rf"] as ClasseAtivo[]).map((k) => {
                      const c = CLASSES.find((x) => x.key === k)!;
                      const kv = ativos
                        .filter((a) => a.classe === k)
                        .reduce((s, a) => s + a.valorBRL, 0);
                      const kp = patrimonio > 0 ? (kv / patrimonio) * 100 : 0;
                      return (
                        <tr key={k} className="text-muted-foreground">
                          <td className="pl-4">{c.label}</td>
                          <td className="text-right">{formatBRL(kv)}</td>
                          <td className="text-right">{formatPct(kp)}</td>
                        </tr>
                      );
                    })}
                  </>
                );
              })()}
              {/* Multi */}
              {(() => {
                const v = ativos
                  .filter((a) => a.classe === "multi")
                  .reduce((s, a) => s + a.valorBRL, 0);
                const p = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
                return (
                  <tr className="font-semibold border-t">
                    <td>Multimercados</td>
                    <td className="text-right">{formatBRL(v)}</td>
                    <td className="text-right text-muted-foreground">{formatPct(p)}</td>
                  </tr>
                );
              })()}
              {/* Cripto */}
              {(() => {
                const v = ativos
                  .filter((a) => a.classe === "cripto")
                  .reduce((s, a) => s + a.valorBRL, 0);
                const p = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
                return (
                  <tr className="font-semibold border-t">
                    <td>Criptoativos</td>
                    <td className="text-right">{formatBRL(v)}</td>
                    <td className="text-right text-muted-foreground">{formatPct(p)}</td>
                  </tr>
                );
              })()}
              <tr className="font-bold border-t-2">
                <td>TOTAL</td>
                <td className="text-right">{formatBRL(patrimonio)}</td>
                <td className="text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

