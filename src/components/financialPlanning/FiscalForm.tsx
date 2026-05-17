import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { calcularFiscal } from "@/types/financialPlanning";
import type { PlanejamentoFiscal } from "@/types/financialPlanning";

interface FiscalFormProps {
  value: PlanejamentoFiscal;
  onChange: (v: PlanejamentoFiscal) => void;
}

type TipoDeclaracao = "simplificada" | "completa" | "nao_sei";

export function FiscalForm({ value, onChange }: FiscalFormProps) {
  const set = <K extends keyof PlanejamentoFiscal>(
    key: K,
    val: PlanejamentoFiscal[K]
  ) => onChange({ ...value, [key]: val });

  const declaracaoAtual: TipoDeclaracao = value.declaraCompleto
    ? "completa"
    : (value as unknown as { _declaracaoTipo?: TipoDeclaracao })._declaracaoTipo ?? "simplificada";

  function handleDeclaracao(tipo: TipoDeclaracao) {
    onChange({
      ...value,
      declaraCompleto: tipo === "completa",
      ...({ _declaracaoTipo: tipo } as object),
    } as PlanejamentoFiscal);
  }

  const resultado = calcularFiscal(value);
  const rendaAnual = value.rendaBrutaAnual;
  const pgblUsadoPct =
    resultado.tetoPGBL > 0
      ? Math.min(100, (value.aportePGBLAnual / resultado.tetoPGBL) * 100)
      : 0;
  const espacoDisponivel = Math.max(
    0,
    resultado.tetoPGBL - (value.contribuiPGBL ? value.aportePGBLAnual : 0)
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Formulário ── */}
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold">Planejamento fiscal e tributário</h3>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fis-renda">Renda mensal bruta</Label>
          <CurrencyInput
            id="fis-renda"
            value={value.rendaBrutaAnual / 12}
            onChange={(v) => set("rendaBrutaAnual", v * 12)}
          />
          {rendaAnual > 0 && (
            <p className="text-xs text-muted-foreground">
              Renda anual: {formatCurrency(rendaAnual)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fis-declaracao">Tipo de declaração do IR</Label>
          <Select value={declaracaoAtual} onValueChange={handleDeclaracao}>
            <SelectTrigger id="fis-declaracao">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simplificada">Simplificada</SelectItem>
              <SelectItem value="completa">Completa</SelectItem>
              <SelectItem value="nao_sei">Não sei</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="fis-pgbl"
              checked={value.contribuiPGBL}
              onCheckedChange={(v) => set("contribuiPGBL", v)}
            />
            <Label htmlFor="fis-pgbl" className="cursor-pointer">
              Tem previdência PGBL?
            </Label>
          </div>
          {value.contribuiPGBL && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Valor anual aportado no PGBL</Label>
              <CurrencyInput
                value={value.aportePGBLAnual}
                onChange={(v) => set("aportePGBLAnual", v)}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="fis-vgbl"
              checked={false}
              onCheckedChange={() => {}}
            />
            <Label htmlFor="fis-vgbl" className="cursor-pointer">
              Tem previdência VGBL?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="fis-empresa"
              checked={false}
              onCheckedChange={() => {}}
            />
            <Label htmlFor="fis-empresa" className="cursor-pointer">
              Tem empresa (CNPJ)?
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="fis-isentos"
              checked={value.temRendimentosIsentos}
              onCheckedChange={(v) => set("temRendimentosIsentos", v)}
            />
            <Label htmlFor="fis-isentos" className="cursor-pointer">
              Tem rendimentos isentos? (LCI/LCA, dividendos, FIIs)
            </Label>
          </div>
          {value.temRendimentosIsentos && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Valor anual de rendimentos isentos</Label>
              <CurrencyInput
                value={value.valorRendimentosIsentos}
                onChange={(v) => set("valorRendimentosIsentos", v)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Painel de resultado ── */}
      <div className="lg:w-72 xl:w-80">
        <Card className="sticky top-4">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Análise tributária</p>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Renda anual bruta</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(rendaAnual)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Teto de dedução PGBL (12% da renda bruta)
              </p>
              <p className="text-base font-semibold tabular-nums">
                {formatCurrency(resultado.tetoPGBL)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">PGBL utilizado</span>
                <span className="tabular-nums">
                  {formatNumber(pgblUsadoPct, 0)}%
                </span>
              </div>
              <Progress value={pgblUsadoPct} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {value.contribuiPGBL
                  ? `${formatCurrency(value.aportePGBLAnual)} / ${formatCurrency(resultado.tetoPGBL)}`
                  : "Não contribui atualmente"}
              </p>
            </div>

            {espacoDisponivel > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Espaço disponível para PGBL
                </p>
                <p className="text-base font-semibold tabular-nums text-amber-600">
                  {formatCurrency(espacoDisponivel)}/ano
                </p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Economia tributária potencial (27,5%)
              </p>
              <p className="text-base font-bold tabular-nums text-emerald-600">
                {formatCurrency(resultado.economiaFiscalPotencial)}/ano
              </p>
            </div>

            {resultado.economiaFiscalAtual > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Economia atual realizada
                </p>
                <p className="text-base font-medium tabular-nums text-primary">
                  {formatCurrency(resultado.economiaFiscalAtual)}/ano
                </p>
              </div>
            )}

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
