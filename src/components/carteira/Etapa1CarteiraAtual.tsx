import { useMemo, useRef, useState } from "react";
import { Trash2, ChevronDown, ChevronUp, Upload, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Ativo, ClasseAtivo } from "@/lib/carteira/types";
import { CLASSES } from "@/lib/carteira/types";
import {
  atualizarPcts,
  calcularPatrimonio,
  formatBRL,
  formatPct,
  genId,
} from "@/lib/carteira/calculos";
import { lerCarteiraClaude, type AtivoExtraido } from "@/lib/carteira/leitorIA";

interface Props {
  ativos: Ativo[];
  onAtivos: (a: Ativo[]) => void;
  usdBrl: number;
  onUsdBrl: (v: number) => void;
}

export function Etapa1CarteiraAtual({ ativos, onAtivos, usdBrl, onUsdBrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IA panel state
  const [iaOpen, setIaOpen] = useState(false);
  const [iaArquivos, setIaArquivos] = useState<File[]>([]);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaProgress, setIaProgress] = useState("");
  const [iaExtraidos, setIaExtraidos] = useState<AtivoExtraido[]>([]);
  const [iaSelecionados, setIaSelecionados] = useState<boolean[]>([]);
  const [iaClasses, setIaClasses] = useState<ClasseAtivo[]>([]);
  const [iaError, setIaError] = useState("");
  const [iaNomes, setIaNomes] = useState<string[]>([]);
  const [iaValores, setIaValores] = useState<number[]>([]);

  const patrimonio = useMemo(() => calcularPatrimonio(ativos, usdBrl), [ativos, usdBrl]);

  function addAtivo(classe: ClasseAtivo, defaults: Partial<Ativo>) {
    const newAtivo: Ativo = {
      id: genId(),
      classe,
      nome: "",
      valorBRL: 0,
      pctCarteira: 0,
      ...defaults,
    };
    onAtivos(atualizarPcts([...ativos, newAtivo], usdBrl));
  }

  function updateAtivo(id: string, patch: Partial<Ativo>) {
    const updated = ativos.map((a) => (a.id === id ? { ...a, ...patch } : a));
    onAtivos(atualizarPcts(updated, usdBrl));
  }

  function removeAtivo(id: string) {
    onAtivos(atualizarPcts(ativos.filter((a) => a.id !== id), usdBrl));
  }

  async function handleAnalisarIA() {
    setIaLoading(true);
    setIaError("");
    setIaExtraidos([]);
    try {
      const resultado = await lerCarteiraClaude(iaArquivos, setIaProgress);
      setIaExtraidos(resultado);
      setIaSelecionados(resultado.map(() => true));
      setIaClasses(resultado.map((r) => r.classeInferida ?? "rf_rapido"));
      setIaNomes(resultado.map((r) => r.nome));
      setIaValores(resultado.map((r) => r.valorBRL));
    } catch (e) {
      setIaError(e instanceof Error ? e.message : "Erro ao analisar arquivos.");
    } finally {
      setIaLoading(false);
    }
  }

  function handleAdicionarSelecionados() {
    const novos: Ativo[] = iaExtraidos
      .filter((_, i) => iaSelecionados[i])
      .map((_, i) => {
        const valorBRL = iaValores[i] ?? 0;
        return {
          id: genId(),
          classe: iaClasses[i] ?? "rf_rapido",
          nome: iaNomes[i] ?? "",
          posicaoBRL: valorBRL,
          valorBRL,
          pctCarteira: 0,
        };
      });
    onAtivos(atualizarPcts([...ativos, ...novos], usdBrl));
    setIaExtraidos([]);
    setIaSelecionados([]);
    setIaClasses([]);
    setIaNomes([]);
    setIaValores([]);
  }

  // Summary bar segments
  const barSegments = CLASSES.map((c) => ({
    key: c.key,
    label: c.label,
    cor: c.cor,
    pct: ativos.filter((a) => a.classe === c.key).reduce((s, a) => s + a.pctCarteira, 0),
  })).filter((s) => s.pct > 0);

  // Summary table data
  const groups = [
    {
      label: "Renda Fixa",
      classes: [
        { key: "rf_rapido" as ClasseAtivo, label: "Resgate Rápido" },
        { key: "rf_longo" as ClasseAtivo, label: "Resgate Longo" },
      ],
    },
    {
      label: "Renda Variável BR",
      classes: [
        { key: "rv_acoes" as ClasseAtivo, label: "Ações" },
        { key: "rv_fiis" as ClasseAtivo, label: "FIIs" },
      ],
    },
    {
      label: "Internacional",
      classes: [
        { key: "internacional_rv" as ClasseAtivo, label: "RV Exterior" },
        { key: "internacional_rf" as ClasseAtivo, label: "RF Exterior" },
      ],
    },
    {
      label: "Multimercados",
      classes: [{ key: "multi" as ClasseAtivo, label: "Multimercados" }],
    },
    {
      label: "Criptoativos",
      classes: [{ key: "cripto" as ClasseAtivo, label: "Criptoativos" }],
    },
  ];

  function sumByClasse(keys: ClasseAtivo[]) {
    return ativos.filter((a) => keys.includes(a.classe)).reduce((s, a) => s + a.valorBRL, 0);
  }

  function pctByClasse(keys: ClasseAtivo[]) {
    return patrimonio > 0 ? (sumByClasse(keys) / patrimonio) * 100 : 0;
  }

  // Helpers for section headers
  function rfTotal() {
    return sumByClasse(["rf_rapido", "rf_longo"]);
  }
  function rfPct() {
    return pctByClasse(["rf_rapido", "rf_longo"]);
  }
  function rvBrTotal() {
    return sumByClasse(["rv_acoes", "rv_fiis"]);
  }
  function rvBrPct() {
    return pctByClasse(["rv_acoes", "rv_fiis"]);
  }
  function intlTotal() {
    return sumByClasse(["internacional_rv", "internacional_rf"]);
  }
  function intlPct() {
    return pctByClasse(["internacional_rv", "internacional_rf"]);
  }
  function multiTotal() {
    return sumByClasse(["multi"]);
  }
  function multiPct() {
    return pctByClasse(["multi"]);
  }
  function criptoTotal() {
    return sumByClasse(["cripto"]);
  }
  function criptoPct() {
    return pctByClasse(["cripto"]);
  }

  const rfRapido = ativos.filter((a) => a.classe === "rf_rapido");
  const rfLongo = ativos.filter((a) => a.classe === "rf_longo");
  const rvAcoes = ativos.filter((a) => a.classe === "rv_acoes");
  const rvFiis = ativos.filter((a) => a.classe === "rv_fiis");
  const intlRv = ativos.filter((a) => a.classe === "internacional_rv");
  const intlRf = ativos.filter((a) => a.classe === "internacional_rf");
  const multi = ativos.filter((a) => a.classe === "multi");
  const cripto = ativos.filter((a) => a.classe === "cripto");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* LEFT SIDE */}
      <div className="space-y-4">
        {/* AI Import Panel */}
        <div className="rounded-lg border bg-card">
          <div className="p-3">
            <button
              onClick={() => setIaOpen(!iaOpen)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Importar com IA</span>
              <span className="ml-auto">
                {iaOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            </button>
          </div>

          {iaOpen && (
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Envie extratos, prints, PDF ou planilhas. A IA extrai os ativos.
              </p>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  setIaArquivos((prev) => [...prev, ...files]);
                }}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Clique ou arraste arquivos aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, imagens, Excel, CSV, TXT
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setIaArquivos((prev) => [...prev, ...files]);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* File list */}
              {iaArquivos.length > 0 && (
                <div className="space-y-1">
                  {iaArquivos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate">{f.name}</span>
                      <button
                        onClick={() => setIaArquivos((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                onClick={handleAnalisarIA}
                disabled={iaArquivos.length === 0 || iaLoading}
                className="w-full"
              >
                {iaLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Analisar com IA
              </Button>

              {iaProgress && (
                <p className="text-xs text-muted-foreground">{iaProgress}</p>
              )}
              {iaError && <p className="text-xs text-red-500">{iaError}</p>}

              {/* Triagem table */}
              {iaExtraidos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">
                    Ativos extraídos — revise e confirme
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left pb-1 w-6"></th>
                        <th className="text-left pb-1">Ativo</th>
                        <th className="text-left pb-1">Valor R$</th>
                        <th className="text-left pb-1">Classe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iaExtraidos.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-1">
                            <input
                              type="checkbox"
                              checked={iaSelecionados[i] ?? false}
                              onChange={(e) =>
                                setIaSelecionados((prev) => {
                                  const next = [...prev];
                                  next[i] = e.target.checked;
                                  return next;
                                })
                              }
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <Input
                              value={iaNomes[i] ?? item.nome}
                              onChange={(e) =>
                                setIaNomes((prev) => {
                                  const next = [...prev];
                                  next[i] = e.target.value;
                                  return next;
                                })
                              }
                              className="h-7 text-xs"
                            />
                          </td>
                          <td className="py-1 pr-1">
                            <Input
                              type="number"
                              value={iaValores[i] ?? item.valorBRL}
                              onChange={(e) =>
                                setIaValores((prev) => {
                                  const next = [...prev];
                                  next[i] = parseFloat(e.target.value) || 0;
                                  return next;
                                })
                              }
                              className="h-7 text-xs w-28"
                            />
                          </td>
                          <td className="py-1">
                            <Select
                              value={iaClasses[i] ?? "rf_rapido"}
                              onValueChange={(v) =>
                                setIaClasses((prev) => {
                                  const next = [...prev];
                                  next[i] = v as ClasseAtivo;
                                  return next;
                                })
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CLASSES.map((c) => (
                                  <SelectItem key={c.key} value={c.key}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button size="sm" onClick={handleAdicionarSelecionados} className="w-full">
                    Adicionar selecionados à carteira
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 1: Renda Fixa */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Renda Fixa</span>
            <div className="flex items-center gap-2 text-sm">
              <span>{formatBRL(rfTotal())}</span>
              <Badge variant="secondary">{formatPct(rfPct())}</Badge>
            </div>
          </div>

          {/* Resgate Rápido */}
          <div className="p-4 space-y-2">
            <div>
              <p className="text-sm font-medium">Resgate Rápido</p>
              <p className="text-xs text-muted-foreground">
                CDB, LCI, LCA, Tesouro Selic, fundo DI
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ativo/Fundo</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Vencimento</th>
                  <th className="text-left pb-1 font-normal">Posição R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rfRapido.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Nome"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Segmento"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.vencimento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })}
                        className="h-7 text-xs w-24"
                        placeholder="dd/mm/aaaa"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.posicaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-28"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("rf_rapido", { posicaoBRL: 0 })}
              className="text-xs"
            >
              + Resgate Rápido
            </Button>
          </div>

          {/* Resgate Longo */}
          <div className="p-4 pt-0 space-y-2 border-t">
            <div>
              <p className="text-sm font-medium">Resgate Longo</p>
              <p className="text-xs text-muted-foreground">
                Tesouro IPCA+, NTN-B, CRI, CRA, debêntures
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ativo/Fundo</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Vencimento</th>
                  <th className="text-left pb-1 font-normal">Posição R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rfLongo.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Nome"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Segmento"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.vencimento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })}
                        className="h-7 text-xs w-24"
                        placeholder="dd/mm/aaaa"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.posicaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-28"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("rf_longo", { posicaoBRL: 0 })}
              className="text-xs"
            >
              + Resgate Longo
            </Button>
          </div>
        </div>

        {/* Section 2: Renda Variável Brasil */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Renda Variável Brasil</span>
            <div className="flex items-center gap-2 text-sm">
              <span>{formatBRL(rvBrTotal())}</span>
              <Badge variant="secondary">{formatPct(rvBrPct())}</Badge>
            </div>
          </div>

          {/* Ações */}
          <div className="p-4 space-y-2">
            <div>
              <p className="text-sm font-medium">Ações</p>
              <p className="text-xs text-muted-foreground">Ações de empresas brasileiras</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ticker</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Cotação R$</th>
                  <th className="text-left pb-1 font-normal">Qtde</th>
                  <th className="text-left pb-1 font-normal">Valor R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rvAcoes.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs w-20"
                        placeholder="PETR4"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Setor"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.cotacaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-24"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.quantidade ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-20"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">
                      {formatBRL(a.valorBRL)}
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("rv_acoes", { cotacaoBRL: 0, quantidade: 0 })}
              className="text-xs"
            >
              + Ação
            </Button>
          </div>

          {/* FIIs */}
          <div className="p-4 pt-0 space-y-2 border-t">
            <div>
              <p className="text-sm font-medium">FIIs</p>
              <p className="text-xs text-muted-foreground">
                Fundos de investimento imobiliário
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ticker</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Cotação R$</th>
                  <th className="text-left pb-1 font-normal">Qtde</th>
                  <th className="text-left pb-1 font-normal">Valor R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rvFiis.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs w-20"
                        placeholder="HGLG11"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Setor"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.cotacaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-24"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.quantidade ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-20"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">
                      {formatBRL(a.valorBRL)}
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("rv_fiis", { cotacaoBRL: 0, quantidade: 0 })}
              className="text-xs"
            >
              + FII
            </Button>
          </div>
        </div>

        {/* Section 3: Internacional */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Internacional</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">USD/BRL</span>
                <Input
                  type="number"
                  value={usdBrl}
                  onChange={(e) => onUsdBrl(parseFloat(e.target.value) || 5)}
                  className="w-24 h-7 text-xs"
                  step="0.01"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>{formatBRL(intlTotal())}</span>
                <Badge variant="secondary">{formatPct(intlPct())}</Badge>
              </div>
            </div>
          </div>

          {/* RV Exterior */}
          <div className="p-4 space-y-2">
            <div>
              <p className="text-sm font-medium">RV Exterior</p>
              <p className="text-xs text-muted-foreground">ETFs, stocks, REITs em USD</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ticker</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Cotação USD</th>
                  <th className="text-left pb-1 font-normal">Qtde</th>
                  <th className="text-left pb-1 font-normal">Valor R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {intlRv.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs w-20"
                        placeholder="VOO"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Setor"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.cotacaoUSD ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { cotacaoUSD: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-24"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.quantidade ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-20"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">
                      {formatBRL(a.valorBRL)}
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("internacional_rv", { cotacaoUSD: 0, quantidade: 0 })}
              className="text-xs"
            >
              + RV Exterior
            </Button>
          </div>

          {/* RF Exterior */}
          <div className="p-4 pt-0 space-y-2 border-t">
            <div>
              <p className="text-sm font-medium">RF Exterior</p>
              <p className="text-xs text-muted-foreground">Bonds, treasuries</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ativo</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Posição R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {intlRf.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Nome"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Segmento"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.posicaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-28"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("internacional_rf", { posicaoBRL: 0 })}
              className="text-xs"
            >
              + RF Exterior
            </Button>
          </div>
        </div>

        {/* Section 4: Multimercados */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Multimercados</span>
            <div className="flex items-center gap-2 text-sm">
              <span>{formatBRL(multiTotal())}</span>
              <Badge variant="secondary">{formatPct(multiPct())}</Badge>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Fundos macro, hedge, long&amp;short
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Fundo</th>
                  <th className="text-left pb-1 font-normal">Segmento</th>
                  <th className="text-left pb-1 font-normal">Posição R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {multi.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Nome do fundo"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        value={a.segmento ?? ""}
                        onChange={(e) => updateAtivo(a.id, { segmento: e.target.value })}
                        className="h-7 text-xs"
                        placeholder="Macro / Hedge"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.posicaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-28"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("multi", { posicaoBRL: 0 })}
              className="text-xs"
            >
              + Multimercado
            </Button>
          </div>
        </div>

        {/* Section 5: Criptoativos */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Criptoativos</span>
            <div className="flex items-center gap-2 text-sm">
              <span>{formatBRL(criptoTotal())}</span>
              <Badge variant="secondary">{formatPct(criptoPct())}</Badge>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Ativo</th>
                  <th className="text-left pb-1 font-normal">Cotação R$</th>
                  <th className="text-left pb-1 font-normal">Qtde</th>
                  <th className="text-left pb-1 font-normal">Valor R$</th>
                  <th className="text-left pb-1 font-normal w-14">%</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {cripto.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-1 pr-1">
                      <Input
                        value={a.nome}
                        onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                        className="h-7 text-xs w-20"
                        placeholder="BTC"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.cotacaoBRL ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-28"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={a.quantidade ?? ""}
                        onChange={(e) =>
                          updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })
                        }
                        className="h-7 text-xs w-24"
                        step="any"
                      />
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">
                      {formatBRL(a.valorBRL)}
                    </td>
                    <td className="py-1 pr-1 text-muted-foreground">
                      {formatPct(a.pctCarteira)}
                    </td>
                    <td className="py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAtivo(a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addAtivo("cripto", { cotacaoBRL: 0, quantidade: 0 })}
              className="text-xs"
            >
              + Cripto
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — sticky summary */}
      <div className="sticky top-20 space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">Resumo da carteira atual</h3>

          {/* Patrimônio total */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Patrimônio total</p>
            <p className="text-2xl font-bold">{formatBRL(patrimonio)}</p>
          </div>

          {/* Stacked bar */}
          <div>
            <div className="h-8 flex flex-row rounded-full overflow-hidden bg-muted">
              {barSegments.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">0% alocado</span>
                </div>
              ) : (
                barSegments.map((s) => (
                  <div
                    key={s.key}
                    style={{ width: `${s.pct}%`, backgroundColor: s.cor }}
                    title={`${s.label}: ${formatPct(s.pct)}`}
                    className="h-full transition-all"
                  />
                ))
              )}
            </div>
            {/* Legend */}
            {barSegments.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {barSegments.map((s) => (
                  <div key={s.key} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.cor }}
                    />
                    <span className="text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary table */}
          <div>
            <table className="w-full text-xs">
              <tbody>
                {groups.map((g) => {
                  const gKeys = g.classes.map((c) => c.key);
                  const gVal = sumByClasse(gKeys);
                  const gPct = patrimonio > 0 ? (gVal / patrimonio) * 100 : 0;
                  return (
                    <>
                      <tr key={g.label} className="font-semibold">
                        <td className="py-0.5">{g.label}</td>
                        <td className="py-0.5 text-right">{formatBRL(gVal)}</td>
                        <td className="py-0.5 text-right">{formatPct(gPct)}</td>
                      </tr>
                      {g.classes.map((c) => {
                        const cVal = sumByClasse([c.key]);
                        const cPct = patrimonio > 0 ? (cVal / patrimonio) * 100 : 0;
                        return (
                          <tr key={c.key} className="text-muted-foreground">
                            <td className="py-0.5 pl-4">{c.label}</td>
                            <td className="py-0.5 text-right">{formatBRL(cVal)}</td>
                            <td className="py-0.5 text-right">{formatPct(cPct)}</td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
                <tr className="border-t font-bold">
                  <td className="pt-2">TOTAL</td>
                  <td className="pt-2 text-right">{formatBRL(patrimonio)}</td>
                  <td className="pt-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
