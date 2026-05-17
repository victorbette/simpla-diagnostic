import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  simularLiberdadeFinanceira,
  type SimulationParams,
  type SimulationResult,
  type LifeGoal,
  type LifeGoalTipo,
} from "@/lib/financialFreedomCalc";
import type { PlanejamentoIF } from "@/types/financialPlanning";

function generateId() { return Math.random().toString(36).substring(2, 9); }

interface Props {
  planejamentoIF: PlanejamentoIF;
  onSave: (params: SimulationParams, objetivos: LifeGoal[], result: SimulationResult) => void;
}

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function FerramentaLiberdadeFinanceira({ planejamentoIF, onSave }: Props) {
  const [params, setParams] = useState<SimulationParams>({
    idadeAtual: planejamentoIF.idadeAtual,
    idadeAposentadoria: planejamentoIF.idadeMeta,
    expectativaVida: 90,
    patrimonioInicial: planejamentoIF.patrimonioAtual,
    aporteMensal: planejamentoIF.aporteMensal,
    rendaDesejada: planejamentoIF.rendaMensalDesejada,
    rentabilidadeAnual: planejamentoIF.taxaRetornoAnual / 100,
    inflacaoAnual: planejamentoIF.inflacaoAnual / 100,
  });
  const [objetivos, setObjetivos] = useState<LifeGoal[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState(0);
  const [novaIdade, setNovaIdade] = useState(params.idadeAtual + 5);
  const [novoTipo, setNovoTipo] = useState<LifeGoalTipo>("despesa");
  const [showForm, setShowForm] = useState(false);

  const setP = (patch: Partial<SimulationParams>) => setParams(p => ({ ...p, ...patch }));

  const result = useMemo(
    () => simularLiberdadeFinanceira({ ...params, objetivos }),
    [params, objetivos]
  );

  const patrimonioAlvo = result.projecao.find(p => p.fase === "acumulacao")
    ? result.projecao[result.projecao.findIndex(p => p.fase === "decumulacao") - 1]?.patrimonio ?? 0
    : 0;

  const chartData = result.projecao.map((p, i) => ({
    idade: p.idade,
    comObjetivos: p.patrimonio,
    semObjetivos: result.projecaoSemObjetivos?.[i]?.patrimonio,
  }));

  function addObjetivo() {
    if (!novoNome.trim() || novoValor <= 0) return;
    setObjetivos(prev => [...prev, {
      id: generateId(), nome: novoNome, valor: novoValor,
      idadeRealizacao: novaIdade, tipo: novoTipo,
    }]);
    setNovoNome(""); setNovoValor(0); setShowForm(false);
  }

  function removeObjetivo(id: string) { setObjetivos(prev => prev.filter(o => o.id !== id)); }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Coluna esquerda: Inputs ── */}
      <div className="space-y-5">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Parâmetros da simulação</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lf-idade-atual">Idade atual</Label>
                <Input id="lf-idade-atual" type="number" min={18} max={80}
                  value={params.idadeAtual} onChange={e => setP({ idadeAtual: Number(e.target.value) })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lf-apos">Idade IF</Label>
                <Input id="lf-apos" type="number" min={params.idadeAtual + 1} max={90}
                  value={params.idadeAposentadoria} onChange={e => setP({ idadeAposentadoria: Number(e.target.value) })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lf-vida">Expectativa</Label>
                <Input id="lf-vida" type="number" min={params.idadeAposentadoria + 1} max={110}
                  value={params.expectativaVida} onChange={e => setP({ expectativaVida: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Patrimônio atual</Label>
              <CurrencyInput value={params.patrimonioInicial} onChange={v => setP({ patrimonioInicial: v })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Aporte mensal</Label>
              <CurrencyInput value={params.aporteMensal} onChange={v => setP({ aporteMensal: v })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Renda mensal desejada na IF</Label>
              <CurrencyInput value={params.rendaDesejada} onChange={v => setP({ rendaDesejada: v })} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <Label>Rentabilidade nominal anual</Label>
                <span className="tabular-nums font-medium">{formatNumber(params.rentabilidadeAnual * 100, 1)}%</span>
              </div>
              <input type="range" min={3} max={15} step={0.5}
                value={params.rentabilidadeAnual * 100}
                onChange={e => setP({ rentabilidadeAnual: Number(e.target.value) / 100 })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>3%</span><span>15%</span></div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <Label>Inflação anual</Label>
                <span className="tabular-nums font-medium">{formatNumber(params.inflacaoAnual * 100, 1)}%</span>
              </div>
              <input type="range" min={2} max={10} step={0.5}
                value={params.inflacaoAnual * 100}
                onChange={e => setP({ inflacaoAnual: Number(e.target.value) / 100 })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>2%</span><span>10%</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Objetivos de vida */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Objetivos de vida</p>
              <Button size="sm" variant="outline" onClick={() => setShowForm(s => !s)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
              </Button>
            </div>

            {showForm && (
              <div className="space-y-3 rounded-xl border p-3 bg-muted/30">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Nome do objetivo</Label>
                  <Input placeholder="ex: Compra de imóvel" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Valor</Label>
                    <CurrencyInput value={novoValor} onChange={setNovoValor} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Idade de realização</Label>
                    <Input type="number" min={params.idadeAtual} value={novaIdade} onChange={e => setNovaIdade(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={novoTipo} onValueChange={v => setNovoTipo(v as LifeGoalTipo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa">Despesa (saída)</SelectItem>
                      <SelectItem value="aporte">Aporte (entrada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addObjetivo} className="flex-1">Confirmar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {objetivos.length === 0 && !showForm && (
              <p className="text-xs text-muted-foreground">Nenhum objetivo cadastrado.</p>
            )}
            {objetivos.map(o => (
              <div key={o.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                <Badge variant={o.tipo === "aporte" ? "default" : "secondary"} className="shrink-0 text-xs">
                  {o.tipo === "aporte" ? "+" : "−"} {o.idadeRealizacao} anos
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{o.nome}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(o.valor)}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeObjetivo(o.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Coluna direita: Resultado ── */}
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Patrimônio na IF</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(result.patrimonioAposentadoria)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Renda sustentável</p>
              <p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(result.rendaSustentavel)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {result.gapRenda >= 0 ? "Superávit de renda" : "Gap de renda"}
              </p>
              <p className={`text-lg font-bold tabular-nums ${result.gapRenda >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatCurrency(Math.abs(result.gapRenda))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center justify-center">
              {result.liberdadeAlcancada ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-sm px-3 py-1">
                  Liberdade alcançada ✓
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-sm px-3 py-1">
                  Gap: {formatCurrency(Math.abs(result.gapRenda))}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico */}
        <Card>
          <CardContent className="pt-5">
            <p className="mb-3 text-sm font-semibold">Projeção patrimonial por idade</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradLF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="idade" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10 }} width={55} />
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  labelFormatter={(l) => `Idade ${l}`}
                />
                <Legend />
                {patrimonioAlvo > 0 && (
                  <ReferenceLine
                    y={patrimonioAlvo}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "Meta IF", position: "right", fontSize: 9, fill: "#ef4444" }}
                  />
                )}
                {result.projecaoSemObjetivos && (
                  <Area
                    type="monotone"
                    dataKey="semObjetivos"
                    name="Sem objetivos"
                    stroke="#94a3b8"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="comObjetivos"
                  name="Com objetivos"
                  stroke="#3b82f6"
                  fill="url(#gradLF)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabela de objetivos */}
        {objetivos.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <p className="mb-3 text-sm font-semibold">Impacto dos objetivos</p>
              <div className="space-y-1.5">
                {objetivos.map(o => (
                  <div key={o.id} className="flex justify-between text-sm border-b pb-1.5 last:border-0">
                    <span className="text-muted-foreground">{o.nome} (idade {o.idadeRealizacao})</span>
                    <span className={`tabular-nums font-medium ${o.tipo === "despesa" ? "text-destructive" : "text-emerald-600"}`}>
                      {o.tipo === "despesa" ? "−" : "+"}{formatCurrency(o.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button className="w-full" onClick={() => onSave(params, objetivos, result)}>
          Salvar simulação
        </Button>
      </div>
    </div>
  );
}
