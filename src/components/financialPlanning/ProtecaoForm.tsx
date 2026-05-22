import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularProtecao } from "@/types/financialPlanning";
import type { ProtecaoSimplificada } from "@/types/financialPlanning";
import { ShieldAlert } from "lucide-react";

interface ProtecaoFormProps {
  value: ProtecaoSimplificada;
  onChange: (v: ProtecaoSimplificada) => void;
}

function scoreProtecao(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Boa proteção", color: "text-emerald-600" };
  if (pct >= 50) return { label: "Proteção parcial", color: "text-[#2563EB]" };
  return { label: "Proteção insuficiente", color: "text-destructive" };
}

export function ProtecaoForm({ value, onChange }: ProtecaoFormProps) {
  const set = <K extends keyof ProtecaoSimplificada>(
    key: K,
    val: ProtecaoSimplificada[K]
  ) => onChange({ ...value, [key]: val });

  const resultado = calcularProtecao(value);
  const score = resultado.percentualCoberto;
  const scoreInfo = scoreProtecao(score);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Formulário ── */}
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold">Gestão de riscos e proteção</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Avaliação simplificada — análise completa na reunião de seguros
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prot-renda">Renda mensal</Label>
          <CurrencyInput
            id="prot-renda"
            value={value.rendaMensal}
            onChange={(v) => set("rendaMensal", v)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prot-dependentes">Número de dependentes financeiros</Label>
          <Input
            id="prot-dependentes"
            type="number"
            min={0}
            max={20}
            value={value.dependentes}
            onChange={(e) => set("dependentes", Number(e.target.value))}
          />
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="prot-seguro-vida"
              checked={value.possuiSeguroVida}
              onCheckedChange={(v) => set("possuiSeguroVida", v)}
            />
            <Label htmlFor="prot-seguro-vida" className="cursor-pointer">
              Possui seguro de vida?
            </Label>
          </div>
          {value.possuiSeguroVida && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Capital segurado</Label>
              <CurrencyInput
                value={value.capitalSeguradoVida}
                onChange={(v) => set("capitalSeguradoVida", v)}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="prot-invalidez"
              checked={value.possuiSeguroInvalidez}
              onCheckedChange={(v) => set("possuiSeguroInvalidez", v)}
            />
            <Label htmlFor="prot-invalidez" className="cursor-pointer">
              Possui seguro de invalidez?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="prot-saude"
              checked={value.possuiPlanoSaude}
              onCheckedChange={(v) => set("possuiPlanoSaude", v)}
            />
            <Label htmlFor="prot-saude" className="cursor-pointer">
              Possui plano de saúde?
            </Label>
          </div>
        </div>
      </div>

      {/* ── Painel de resultado ── */}
      <div className="lg:w-72 xl:w-80">
        <Card className="sticky top-4">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Análise de proteção</p>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Capital necessário estimado</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(resultado.capitalNecessario)}
              </p>
              <p className="text-xs text-muted-foreground">
                Base: 5 anos de renda (
                {formatCurrency(value.rendaMensal * 12 * 5)})
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Capital segurado atual</p>
              <p className="text-lg font-bold tabular-nums text-primary">
                {formatCurrency(resultado.capitalAtual)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cobertura</span>
                <span className={`font-medium tabular-nums ${scoreInfo.color}`}>
                  {formatNumber(score, 0)}%
                </span>
              </div>
              <Progress value={score} className="h-2" />
              <p className={`text-xs font-medium ${scoreInfo.color}`}>
                {scoreInfo.label}
              </p>
            </div>

            {resultado.gap > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Gap de cobertura</p>
                <p className="text-base font-semibold tabular-nums text-destructive">
                  {formatCurrency(resultado.gap)}
                </p>
              </div>
            )}

            {resultado.gap > 0 && (
              <Badge variant="outline" className="flex items-center gap-1.5 text-[#2563EB] border-[#3B82F6] bg-[#EFF6FF] w-full justify-center py-2">
                <ShieldAlert className="h-3.5 w-3.5" />
                Encaminhar para análise completa de seguros
              </Badge>
            )}

            {resultado.recomendacoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Recomendações
                </p>
                <ul className="space-y-1.5">
                  {resultado.recomendacoes.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="mt-0.5 shrink-0 text-amber-500">•</span>
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
