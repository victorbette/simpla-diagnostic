import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularBeneficioPGBL, getAliquotaRegressiva } from "@/lib/taxCalc";
import type { PlanejamentoFiscal } from "@/types/financialPlanning";

interface Props {
  fiscal: PlanejamentoFiscal;
  onSave: (result: ReturnType<typeof calcularBeneficioPGBL>) => void;
}

interface PGBLState {
  rendaMensalBruta: number;
  aportePGBLMensal: number;
  numeroDependentes: number;
  tipoDeclaracao: "completa" | "simplificada";
}

export function FerramentaPGBL({ fiscal, onSave }: Props) {
  const [state, setState] = useState<PGBLState>({
    rendaMensalBruta: fiscal.rendaBrutaAnual / 12,
    aportePGBLMensal: fiscal.temPGBL ? fiscal.valorPGBLAnual / 12 : 0,
    numeroDependentes: 0,
    tipoDeclaracao: fiscal.tipoDeclaracao === "nao_sei" ? "completa" : fiscal.tipoDeclaracao,
  });
  const [aporteSimulado, setAporteSimulado] = useState(state.aportePGBLMensal);

  const set = (patch: Partial<PGBLState>) => setState(s => ({ ...s, ...patch }));

  const result = useMemo(() => calcularBeneficioPGBL(state), [state]);
  const resultSimulado = useMemo(
    () => calcularBeneficioPGBL({ ...state, aportePGBLMensal: aporteSimulado }),
    [state, aporteSimulado]
  );

  const pgblPct = result.tetoPGBLAnual > 0
    ? Math.min(100, (result.aporteAnual / result.tetoPGBLAnual) * 100)
    : 0;
  const teto = result.tetoPGBLAnual / 12;

  // Tabela regressiva PGBL
  const tabelaRegressiva = [0, 2, 4, 6, 8, 10].map(anos => ({
    anos,
    aliquota: getAliquotaRegressiva(anos),
  }));

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Renda mensal bruta</Label>
              <CurrencyInput value={state.rendaMensalBruta}
                onChange={v => { set({ rendaMensalBruta: v }); setAporteSimulado(s => Math.min(s, v * 0.12)); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Aporte PGBL mensal atual</Label>
              <CurrencyInput value={state.aportePGBLMensal}
                onChange={v => { set({ aportePGBLMensal: v }); setAporteSimulado(v); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dep">Dependentes</Label>
              <Input id="dep" type="number" min={0} max={10} value={state.numeroDependentes}
                onChange={e => set({ numeroDependentes: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de declaração</Label>
              <Select value={state.tipoDeclaracao} onValueChange={v => set({ tipoDeclaracao: v as "completa" | "simplificada" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="simplificada">Simplificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado em grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Renda anual bruta", value: result.rendaAnual, cls: "" },
          { label: "Teto PGBL (12% da renda)", value: result.tetoPGBLAnual, cls: "" },
          { label: "Aporte atual no PGBL", value: result.aporteAnual, cls: "" },
          { label: "Espaço disponível", value: Math.max(0, result.tetoPGBLAnual - result.aporteAnual), cls: "text-amber-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-base font-bold tabular-nums ${cls}`}>{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">IR sem PGBL</p>
            <p className="text-base font-bold tabular-nums text-destructive">{formatCurrency(result.irSemPGBL)}/ano</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">IR com PGBL</p>
            <p className="text-base font-bold tabular-nums text-emerald-600">{formatCurrency(result.irComPGBL)}/ano</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-emerald-700">Economia tributária</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums text-emerald-700">{formatCurrency(result.economiaAnual)}/ano</p>
              <p className="text-sm text-emerald-600">{formatCurrency(result.economiaMensal)}/mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra PGBL */}
      <Card>
        <CardContent className="pt-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">PGBL utilizado vs. teto</span>
            <div className="flex gap-2 items-center">
              <span className="tabular-nums">{formatNumber(pgblPct, 0)}%</span>
              {result.aproveitandoTeto ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Teto atingido</Badge>
              ) : (
                <Badge variant="secondary">
                  Espaço: {formatCurrency(result.espacoDisponivelMensal)}/mês
                </Badge>
              )}
            </div>
          </div>
          <Progress value={pgblPct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {formatCurrency(result.aporteAnual)} / {formatCurrency(result.tetoPGBLAnual)} anuais
          </p>
        </CardContent>
      </Card>

      {/* Simulador de otimização */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <p className="text-sm font-semibold">Simulador de otimização</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aporte mensal simulado</span>
              <span className="tabular-nums font-medium">{formatCurrency(aporteSimulado)}/mês</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(teto, 1)}
              step={100}
              value={aporteSimulado}
              onChange={e => setAporteSimulado(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>R$ 0</span>
              <span>{formatCurrency(teto)}/mês (teto)</span>
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Aportando <strong>{formatCurrency(aporteSimulado)}/mês</strong>, você economiza{" "}
            <strong>{formatCurrency(resultSimulado.economiaAnual)}/ano</strong> no IR
            ({formatCurrency(resultSimulado.economiaMensal)}/mês)
          </div>
        </CardContent>
      </Card>

      {/* Tabela regressiva */}
      {state.tipoDeclaracao === "completa" && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-semibold">Tabela regressiva do PGBL no resgate</p>
            <p className="text-xs text-muted-foreground">
              Quanto mais tempo o dinheiro fica investido, menor a alíquota no resgate. Para declaração completa, o PGBL é tributado na saída sobre o valor total (principal + rendimento).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-normal">Tempo de acumulação</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Alíquota no resgate</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaRegressiva.map(({ anos, aliquota }) => (
                    <tr key={anos} className="border-b last:border-0">
                      <td className="py-2">{anos === 0 ? "Até 2 anos" : anos < 10 ? `${anos}–${anos + 2} anos` : "Acima de 10 anos"}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{aliquota}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Diferença da progressiva: a tabela progressiva tributa só os rendimentos, enquanto a regressiva tributa o montante total mas com alíquotas decrescentes com o tempo.
            </p>
          </CardContent>
        </Card>
      )}

      <Button className="w-full" onClick={() => onSave(result)}>
        Salvar análise PGBL
      </Button>
    </div>
  );
}
