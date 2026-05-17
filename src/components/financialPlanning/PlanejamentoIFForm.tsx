import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import type { PlanejamentoIF } from "@/types/financialPlanning";

interface PlanejamentoIFFormProps {
  value: PlanejamentoIF;
  onChange: (v: PlanejamentoIF) => void;
}

export function PlanejamentoIFForm({ value, onChange }: PlanejamentoIFFormProps) {
  const [possuiPrevidencia, setPossuiPrevidencia] = useState(false);
  const [contribuiINSS, setContribuiINSS] = useState(false);
  const [temAluguel, setTemAluguel] = useState(false);

  const set = <K extends keyof PlanejamentoIF>(key: K, val: PlanejamentoIF[K]) =>
    onChange({ ...value, [key]: val });

  const resultado = calcularIF(value);
  const anosRestantes = Math.max(0, value.idadeMeta - value.idadeAtual);
  const patrimonioNec = resultado.patrimonioNecessario;
  const progressoPct =
    patrimonioNec > 0
      ? Math.min(100, (value.patrimonioAtual / patrimonioNec) * 100)
      : 0;

  const gapPositivo = resultado.gap > 0;

  const aporteNecessario = (() => {
    if (!gapPositivo) return 0;
    const taxaMensal = value.taxaRetornoAnual / 100 / 12;
    const meses = anosRestantes * 12;
    if (meses === 0) return resultado.gap;
    if (taxaMensal === 0) return resultado.gap / meses;
    return (
      (resultado.gap * taxaMensal) / (Math.pow(1 + taxaMensal, meses) - 1)
    );
  })();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Formulário ── */}
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold">
            Planejamento de aposentadoria e liberdade financeira
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="if-idade-atual">Idade atual</Label>
            <Input
              id="if-idade-atual"
              type="number"
              min={18}
              max={100}
              value={value.idadeAtual}
              onChange={(e) => set("idadeAtual", Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="if-idade-meta">Idade alvo para IF</Label>
            <Input
              id="if-idade-meta"
              type="number"
              min={value.idadeAtual + 1}
              max={100}
              value={value.idadeMeta}
              onChange={(e) => set("idadeMeta", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="if-renda-desejada">Renda mensal desejada na IF</Label>
          <CurrencyInput
            id="if-renda-desejada"
            value={value.rendaMensalDesejada}
            onChange={(v) => set("rendaMensalDesejada", v)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="if-patrimonio">Patrimônio investido atual</Label>
          <CurrencyInput
            id="if-patrimonio"
            value={value.patrimonioAtual}
            onChange={(v) => set("patrimonioAtual", v)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="if-aporte">Aporte mensal atual</Label>
          <CurrencyInput
            id="if-aporte"
            value={value.aporteMensal}
            onChange={(v) => set("aporteMensal", v)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="if-taxa">Taxa de retorno real estimada</Label>
            <Badge variant="secondary" className="tabular-nums">
              {value.taxaRetornoAnual}% a.a.
            </Badge>
          </div>
          <input
            id="if-taxa"
            type="range"
            min={3}
            max={12}
            step={0.5}
            value={value.taxaRetornoAnual}
            onChange={(e) => set("taxaRetornoAnual", Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3%</span>
            <span>12%</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="if-metodologia">Metodologia de cálculo</Label>
          <Select
            value={value.metodologia}
            onValueChange={(v) =>
              set("metodologia", v as PlanejamentoIF["metodologia"])
            }
          >
            <SelectTrigger id="if-metodologia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regra4porcento">Regra dos 4% (retirada segura)</SelectItem>
              <SelectItem value="renda_perpetua">Renda perpétua</SelectItem>
              <SelectItem value="renda_temporaria">Renda temporária</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="if-previdencia"
              checked={possuiPrevidencia}
              onCheckedChange={setPossuiPrevidencia}
            />
            <Label htmlFor="if-previdencia" className="cursor-pointer">
              Tem previdência privada?
            </Label>
          </div>
          {possuiPrevidencia && (
            <div className="ml-8 space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Valor acumulado na previdência</Label>
                <CurrencyInput
                  value={value.valorPrevidencia ?? 0}
                  onChange={(v) => set("valorPrevidencia", v)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="if-inss"
              checked={contribuiINSS}
              onCheckedChange={setContribuiINSS}
            />
            <Label htmlFor="if-inss" className="cursor-pointer">
              Contribui para o INSS?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="if-aluguel"
              checked={temAluguel}
              onCheckedChange={setTemAluguel}
            />
            <Label htmlFor="if-aluguel" className="cursor-pointer">
              Tem imóveis que geram aluguel?
            </Label>
          </div>
          {temAluguel && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Renda de aluguel mensal</Label>
              <CurrencyInput
                value={value.rendaAluguelMensal ?? 0}
                onChange={(v) => set("rendaAluguelMensal", v)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Painel de resultado ── */}
      <div className="lg:w-72 xl:w-80">
        <Card className="sticky top-4">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Projeção em tempo real</p>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Patrimônio necessário para IF</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(patrimonioNec)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Projeção com aportes atuais</p>
              <p className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(resultado.patrimonioProjetado)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso atual</span>
                <span className="tabular-nums">{formatNumber(progressoPct, 0)}%</span>
              </div>
              <Progress value={progressoPct} className="h-2" />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {gapPositivo ? "Gap (falta)" : "Superávit"}
              </p>
              <p
                className={`text-base font-semibold tabular-nums ${
                  gapPositivo ? "text-destructive" : "text-emerald-600"
                }`}
              >
                {formatCurrency(Math.abs(resultado.gap))}
              </p>
            </div>

            {gapPositivo && aporteNecessario > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Aporte adicional necessário
                </p>
                <p className="text-base font-semibold tabular-nums text-amber-600">
                  {formatCurrency(aporteNecessario)}/mês
                </p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Anos restantes</p>
              <p className="text-base font-medium tabular-nums">{anosRestantes} anos</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Renda mensal atingível</p>
              <p className="text-base font-medium tabular-nums">
                {formatCurrency(resultado.rendaMensalAtingivel)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
