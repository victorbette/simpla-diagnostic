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

const cardGreenTop: React.CSSProperties = {
  borderTop: "3px solid #22C55E",
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const badgePctStyle: React.CSSProperties = {
  backgroundColor: "#041A20",
  color: "white",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 600,
};

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
    <div className="flex flex-col gap-6">
      {/* Top row: params + results side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Coluna esquerda: Inputs ── */}
        <div className="space-y-5">
          {/* Parâmetros */}
          <Card style={cardGreenTop}>
            <CardContent className="pt-5 space-y-4">
              <p style={{ color: "#041A20", fontSize: 16, fontWeight: 700, margin: 0 }}>
                Parâmetros da simulação
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-idade-atual" style={{ color: "#6B7280" }}>Idade atual</Label>
                  <Input id="lf-idade-atual" type="number" min={18} max={80}
                    value={params.idadeAtual} onChange={e => setP({ idadeAtual: Number(e.target.value) })}
                    style={{ borderColor: "#E5E7EB", color: "#111827" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-apos" style={{ color: "#6B7280" }}>Idade IF</Label>
                  <Input id="lf-apos" type="number" min={params.idadeAtual + 1} max={90}
                    value={params.idadeAposentadoria} onChange={e => setP({ idadeAposentadoria: Number(e.target.value) })}
                    style={{ borderColor: "#E5E7EB", color: "#111827" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-vida" style={{ color: "#6B7280" }}>Expectativa</Label>
                  <Input id="lf-vida" type="number" min={params.idadeAposentadoria + 1} max={110}
                    value={params.expectativaVida} onChange={e => setP({ expectativaVida: Number(e.target.value) })}
                    style={{ borderColor: "#E5E7EB", color: "#111827" }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label style={{ color: "#6B7280" }}>Patrimônio atual</Label>
                <CurrencyInput value={params.patrimonioInicial} onChange={v => setP({ patrimonioInicial: v })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label style={{ color: "#6B7280" }}>Aporte mensal</Label>
                <CurrencyInput value={params.aporteMensal} onChange={v => setP({ aporteMensal: v })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label style={{ color: "#6B7280" }}>Renda mensal desejada na IF</Label>
                <CurrencyInput value={params.rendaDesejada} onChange={v => setP({ rendaDesejada: v })} />
              </div>

              {/* Rentabilidade slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label style={{ color: "#6B7280" }}>Rentabilidade nominal anual</Label>
                  <span style={badgePctStyle}>{formatNumber(params.rentabilidadeAnual * 100, 1)}%</span>
                </div>
                <input
                  type="range" min={3} max={15} step={0.5}
                  value={params.rentabilidadeAnual * 100}
                  onChange={e => setP({ rentabilidadeAnual: Number(e.target.value) / 100 })}
                  className="w-full"
                  style={{ accentColor: "#041A20" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>3% (conservador)</span>
                  <span>15% (arrojado)</span>
                </div>
              </div>

              {/* Inflação slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label style={{ color: "#6B7280" }}>Inflação anual</Label>
                  <span style={badgePctStyle}>{formatNumber(params.inflacaoAnual * 100, 1)}%</span>
                </div>
                <input
                  type="range" min={2} max={10} step={0.5}
                  value={params.inflacaoAnual * 100}
                  onChange={e => setP({ inflacaoAnual: Number(e.target.value) / 100 })}
                  className="w-full"
                  style={{ accentColor: "#041A20" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>2%</span>
                  <span>10%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos de vida */}
          <Card style={cardGreenTop}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p style={{ color: "#041A20", fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Objetivos de vida
                </p>
                <button
                  onClick={() => setShowForm(s => !s)}
                  style={{
                    border: "1px solid #041A20",
                    color: "#041A20",
                    backgroundColor: "transparent",
                    borderRadius: 6,
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Adicionar
                </button>
              </div>

              {showForm && (
                <div className="space-y-3 rounded-xl border p-3" style={{ backgroundColor: "#F8F9FA", borderColor: "#E5E7EB" }}>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs" style={{ color: "#6B7280" }}>Nome do objetivo</Label>
                    <Input
                      placeholder="ex: Compra de imóvel"
                      value={novoNome}
                      onChange={e => setNovoNome(e.target.value)}
                      style={{ borderColor: "#E5E7EB", color: "#111827" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs" style={{ color: "#6B7280" }}>Valor</Label>
                      <CurrencyInput value={novoValor} onChange={setNovoValor} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs" style={{ color: "#6B7280" }}>Idade de realização</Label>
                      <Input
                        type="number" min={params.idadeAtual}
                        value={novaIdade} onChange={e => setNovaIdade(Number(e.target.value))}
                        style={{ borderColor: "#E5E7EB", color: "#111827" }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs" style={{ color: "#6B7280" }}>Tipo</Label>
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
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>Nenhum objetivo cadastrado.</p>
              )}

              {objetivos.map(o => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 rounded-lg p-2.5"
                  style={{ border: "1px solid #E5E7EB" }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 5,
                      padding: "2px 7px",
                      backgroundColor: o.tipo === "aporte" ? "#dcfce7" : "#fee2e2",
                      color: o.tipo === "aporte" ? "#166534" : "#dc2626",
                    }}
                  >
                    {o.tipo === "aporte" ? "+" : "−"} {o.idadeRealizacao} anos
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#111827" }}>{o.nome}</p>
                    <p style={{ fontSize: 11, color: "#6B7280" }}>{formatCurrency(o.valor)}</p>
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
          {/* KPIs 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Patrimônio na IF */}
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Patrimônio na IF
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#041A20" }} className="tabular-nums">
                  {formatCurrency(result.patrimonioAposentadoria)}
                </p>
              </CardContent>
            </Card>

            {/* Renda sustentável */}
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Renda sustentável
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#041A20" }} className="tabular-nums">
                  {formatCurrency(result.rendaSustentavel)}
                </p>
              </CardContent>
            </Card>

            {/* Gap / Superávit */}
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  {result.gapRenda >= 0 ? "Superávit de renda" : "Gap de renda"}
                </p>
                <p
                  style={{ fontSize: 20, fontWeight: 700, color: result.gapRenda >= 0 ? "#16a34a" : "#dc2626" }}
                  className="tabular-nums"
                >
                  {formatCurrency(Math.abs(result.gapRenda))}
                </p>
              </CardContent>
            </Card>

            {/* Liberdade alcançada / Gap badge */}
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4 flex items-center justify-center">
                {result.liberdadeAlcancada ? (
                  <span style={{
                    backgroundColor: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    Liberdade alcançada ✓
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    Gap: {formatCurrency(Math.abs(result.gapRenda))}
                  </span>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de objetivos (right column) */}
          {objetivos.length > 0 && (
            <Card style={cardGreenTop}>
              <CardContent className="pt-4">
                <p style={{ color: "#041A20", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
                  Impacto dos objetivos
                </p>
                <div className="space-y-1.5">
                  {objetivos.map(o => (
                    <div key={o.id} className="flex justify-between text-sm border-b pb-1.5 last:border-0">
                      <span style={{ color: "#6B7280" }}>{o.nome} (idade {o.idadeRealizacao})</span>
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: o.tipo === "despesa" ? "#dc2626" : "#16a34a" }}
                      >
                        {o.tipo === "despesa" ? "−" : "+"}{formatCurrency(o.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save button */}
          <button
            onClick={() => onSave(params, objetivos, result)}
            style={{
              width: "100%",
              backgroundColor: "#22C55E",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Salvar simulação
          </button>
        </div>
      </div>

      {/* ── Full-width chart card ── */}
      <Card style={cardGreenTop}>
        <CardContent className="pt-5">
          <p style={{ color: "#041A20", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Projeção Patrimonial
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradLF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="idade" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 10, fill: "#6B7280" }} width={55} />
              <Tooltip
                formatter={(v) => formatCurrency(v as number)}
                labelFormatter={(l) => `Idade ${l}`}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 12,
                }}
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
    </div>
  );
}
