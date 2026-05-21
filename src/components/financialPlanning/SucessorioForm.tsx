import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularSucessorio } from "@/types/financialPlanning";
import type { PlanejamentoSucessorio } from "@/types/financialPlanning";

interface SucessorioFormProps {
  value: PlanejamentoSucessorio;
  onChange: (v: PlanejamentoSucessorio) => void;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-[#8A7A45]";
  return "text-destructive";
}

function calcScore(value: PlanejamentoSucessorio): number {
  let pts = 0;
  if (value.possuiTestamento) pts += 30;
  if (value.possuiHolding) pts += 30;
  if (value.possuiSeguroVidaSucessao) pts += 20;
  const resultado = calcularSucessorio(value);
  if (resultado.percentualCusto < 5) pts += 20;
  else if (resultado.percentualCusto < 8) pts += 10;
  return Math.min(100, pts);
}

export function SucessorioForm({ value, onChange }: SucessorioFormProps) {
  const set = <K extends keyof PlanejamentoSucessorio>(
    key: K,
    val: PlanejamentoSucessorio[K]
  ) => onChange({ ...value, [key]: val });

  const resultado = calcularSucessorio(value);
  const score = calcScore(value);
  const color = scoreColor(score);

  const previdenciaValor =
    (value as unknown as { _previdenciaValor?: number })._previdenciaValor ?? 0;
  const patrimonioForaInventario =
    (value.possuiSeguroVidaSucessao ? value.capitalSeguroVidaSucessao : 0) +
    previdenciaValor;
  const patrimonioNoInventario = Math.max(
    0,
    value.patrimonioTotal - patrimonioForaInventario
  );
  const pctFora =
    value.patrimonioTotal > 0
      ? Math.min(100, (patrimonioForaInventario / value.patrimonioTotal) * 100)
      : 0;

  const possuiPrevidenciaBeneficiario = !!(value as unknown as { _previdenciaBenef?: boolean })._previdenciaBenef;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Formulário ── */}
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold">Planejamento sucessório</h3>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="suc-patrimonio">Patrimônio total estimado</Label>
          <CurrencyInput
            id="suc-patrimonio"
            value={value.patrimonioTotal}
            onChange={(v) => set("patrimonioTotal", v)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suc-herdeiros">Número de herdeiros</Label>
            <Input
              id="suc-herdeiros"
              type="number"
              min={1}
              max={50}
              value={value.numeroHerdeiros}
              onChange={(e) => set("numeroHerdeiros", Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suc-estado">Estado de residência</Label>
            <Input
              id="suc-estado"
              placeholder="SP"
              value={value.estadoResidencia}
              onChange={(e) => set("estadoResidencia", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="suc-testamento"
              checked={value.possuiTestamento}
              onCheckedChange={(v) => set("possuiTestamento", v)}
            />
            <Label htmlFor="suc-testamento" className="cursor-pointer">
              Possui testamento formalizado?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="suc-holding"
              checked={value.possuiHolding}
              onCheckedChange={(v) => set("possuiHolding", v)}
            />
            <Label htmlFor="suc-holding" className="cursor-pointer">
              Possui holding familiar?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="suc-doacao"
              checked={false}
              onCheckedChange={() => {}}
            />
            <Label htmlFor="suc-doacao" className="cursor-pointer">
              Realizou doações em vida com reserva de usufruto?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="suc-seguro"
              checked={value.possuiSeguroVidaSucessao}
              onCheckedChange={(v) => set("possuiSeguroVidaSucessao", v)}
            />
            <Label htmlFor="suc-seguro" className="cursor-pointer">
              Tem seguro de vida com beneficiário definido?
            </Label>
          </div>
          {value.possuiSeguroVidaSucessao && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Valor do seguro</Label>
              <CurrencyInput
                value={value.capitalSeguroVidaSucessao}
                onChange={(v) => set("capitalSeguroVidaSucessao", v)}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="suc-previdencia-benef"
              checked={possuiPrevidenciaBeneficiario}
              onCheckedChange={(v) =>
                onChange({
                  ...value,
                  ...({ _previdenciaBenef: v } as object),
                } as PlanejamentoSucessorio)
              }
            />
            <Label htmlFor="suc-previdencia-benef" className="cursor-pointer">
              Tem previdência com beneficiário definido?
            </Label>
          </div>
          {possuiPrevidenciaBeneficiario && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Valor acumulado na previdência</Label>
              <CurrencyInput
                value={
                  (value as unknown as { _previdenciaValor?: number })
                    ._previdenciaValor ?? 0
                }
                onChange={(v) =>
                  onChange({
                    ...value,
                    ...({ _previdenciaValor: v } as object),
                  } as PlanejamentoSucessorio)
                }
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="suc-menores"
              checked={false}
              onCheckedChange={() => {}}
            />
            <Label htmlFor="suc-menores" className="cursor-pointer">
              Tem herdeiros menores de idade?
            </Label>
          </div>
        </div>
      </div>

      {/* ── Painel de resultado ── */}
      <div className="lg:w-72 xl:w-80">
        <Card className="sticky top-4">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Análise sucessória</p>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Score sucessório</p>
                <span className={`text-lg font-bold tabular-nums ${color}`}>
                  {score}/100
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ITCMD estimado (4%)</p>
              <p className="text-base font-semibold tabular-nums text-destructive">
                {formatCurrency(resultado.itcmdEstimado)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Custo de inventário estimado (6%)
              </p>
              <p className="text-base font-semibold tabular-nums text-destructive">
                {formatCurrency(resultado.custoInventarioEstimado)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Custo total estimado</p>
              <p className="text-lg font-bold tabular-nums text-destructive">
                {formatCurrency(resultado.custoTotal)}
                <span className="ml-1 text-sm font-normal">
                  ({formatNumber(resultado.percentualCusto, 1)}%)
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Patrimônio líquido para herdeiros</p>
              <p className="text-base font-semibold tabular-nums text-emerald-600">
                {formatCurrency(resultado.patrimonioLiquidoHerdeiros)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fora do inventário</span>
                <span className="tabular-nums">{formatNumber(pctFora, 1)}%</span>
              </div>
              <Progress value={pctFora} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fora: {formatCurrency(patrimonioForaInventario)}</span>
                <span>No inventário: {formatCurrency(patrimonioNoInventario)}</span>
              </div>
            </div>

            {resultado.recomendacoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Recomendações
                </p>
                <ul className="space-y-1.5">
                  {resultado.recomendacoes.map((rec, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className="mt-0.5 shrink-0 text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
