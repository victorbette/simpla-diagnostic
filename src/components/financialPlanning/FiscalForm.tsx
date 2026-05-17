import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { calcularFiscal } from "@/types/financialPlanning";
import type { PlanejamentoFiscal } from "@/types/financialPlanning";
import { cn } from "@/lib/utils";

interface FiscalFormProps {
  value: PlanejamentoFiscal;
  onChange: (v: PlanejamentoFiscal) => void;
}

export function FiscalForm({ value, onChange }: FiscalFormProps) {
  const [, setEmpresaExpanded] = useState(false);

  const set = <K extends keyof PlanejamentoFiscal>(key: K, val: PlanejamentoFiscal[K]) =>
    onChange({ ...value, [key]: val });

  const resultado = calcularFiscal(value);

  const pgblPct =
    resultado.tetoPGBL > 0
      ? Math.min(100, (resultado.pgblAtual / resultado.tetoPGBL) * 100)
      : 0;

  // Determine analisePrevidencia card style
  const analise = resultado.analisePrevidencia;
  const isAlerta = analise.startsWith("Atenção");
  const isPositivo = analise.length > 0 && !isAlerta;

  function handleToggleEmpresa(v: boolean) {
    set("temEmpresa", v);
    if (!v) {
      onChange({ ...value, temEmpresa: false, recebeProlabore: false, recebeDividendos: false });
    } else {
      set("temEmpresa", true);
      setEmpresaExpanded(true);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Formulário ── */}
      <div className="flex flex-1 flex-col gap-5">
        <h3 className="text-lg font-semibold">Planejamento fiscal e tributário</h3>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fis-renda">Renda mensal bruta</Label>
          <CurrencyInput
            id="fis-renda"
            value={value.rendaBrutaAnual / 12}
            onChange={(v) => set("rendaBrutaAnual", v * 12)}
          />
          {value.rendaBrutaAnual > 0 && (
            <p className="text-xs text-muted-foreground">
              Renda anual: {formatCurrency(value.rendaBrutaAnual)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fis-declaracao">Tipo de declaração do IR</Label>
          <Select
            value={value.tipoDeclaracao}
            onValueChange={(v) =>
              set("tipoDeclaracao", v as PlanejamentoFiscal["tipoDeclaracao"])
            }
          >
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
          {/* PGBL */}
          <div className="flex items-center gap-3">
            <Switch
              id="fis-pgbl"
              checked={value.temPGBL}
              onCheckedChange={(v) => set("temPGBL", v)}
            />
            <Label htmlFor="fis-pgbl" className="cursor-pointer">
              Tem previdência PGBL?
            </Label>
          </div>
          {value.temPGBL && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Valor anual aportado no PGBL</Label>
              <CurrencyInput
                value={value.valorPGBLAnual ?? 0}
                onChange={(v) => set("valorPGBLAnual", v)}
              />
            </div>
          )}

          {/* VGBL */}
          <div className="flex items-center gap-3">
            <Switch
              id="fis-vgbl"
              checked={value.temVGBL}
              onCheckedChange={(v) => set("temVGBL", v)}
            />
            <Label htmlFor="fis-vgbl" className="cursor-pointer">
              Tem previdência VGBL?
            </Label>
          </div>
          {value.temVGBL && (
            <div className="ml-8 flex flex-col gap-1.5">
              <Label className="text-sm">Valor aportado no VGBL (anual)</Label>
              <CurrencyInput
                value={value.valorVGBLAnual ?? 0}
                onChange={(v) => set("valorVGBLAnual", v)}
                placeholder="R$ 0,00"
              />
            </div>
          )}

          {/* Empresa */}
          <div className="flex items-center gap-3">
            <Switch
              id="fis-empresa"
              checked={value.temEmpresa}
              onCheckedChange={handleToggleEmpresa}
            />
            <Label htmlFor="fis-empresa" className="cursor-pointer">
              Tem empresa (CNPJ)?
            </Label>
          </div>
          {value.temEmpresa && (
            <div
              className="ml-8 space-y-2"
              onClick={() => setEmpresaExpanded(true)}
            >
              <div className="flex items-center gap-3">
                <Switch
                  id="fis-prolabore"
                  checked={value.recebeProlabore}
                  onCheckedChange={(v) => set("recebeProlabore", v)}
                />
                <Label htmlFor="fis-prolabore" className="cursor-pointer text-sm">
                  Recebe pró-labore?
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="fis-dividendos"
                  checked={value.recebeDividendos}
                  onCheckedChange={(v) => set("recebeDividendos", v)}
                />
                <Label htmlFor="fis-dividendos" className="cursor-pointer text-sm">
                  Recebe dividendos?
                </Label>
              </div>
            </div>
          )}

          {/* Rendimentos isentos */}
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

        {/* Análise automática */}
        {analise && (
          <div
            className={cn(
              "rounded-xl border p-4 text-sm",
              isAlerta
                ? "border-red-200 bg-red-50 text-red-800"
                : isPositivo
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {analise}
          </div>
        )}
      </div>

      {/* ── Painel lateral ── */}
      <div className="lg:w-72 xl:w-80">
        <Card className="sticky top-4">
          <CardContent className="pt-5 space-y-5">

            {/* Seção: Análise de previdência privada */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Análise de previdência privada</p>

              {value.tipoDeclaracao === "completa" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                      PGBL recomendado — dedutível no IR
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Teto PGBL</span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(resultado.tetoPGBL)}/ano
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">PGBL atual</span>
                      <span className="tabular-nums">
                        {formatCurrency(resultado.pgblAtual)}/ano
                      </span>
                    </div>
                    <Progress value={pgblPct} className="h-1.5" />
                    {resultado.espacoPGBL > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Espaço disponível</span>
                        <span className="tabular-nums font-medium text-amber-600">
                          {formatCurrency(resultado.espacoPGBL)}/ano
                        </span>
                      </div>
                    )}
                    {resultado.economiaEstimadaPGBL > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Economia estimada</span>
                        <span className="tabular-nums font-medium text-emerald-600">
                          {formatCurrency(resultado.economiaEstimadaPGBL)}/ano
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {value.tipoDeclaracao === "simplificada" && (
                <div className="space-y-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    VGBL mais indicado para este perfil
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Declaração simplificada não permite dedução do PGBL.
                  </p>
                  {value.temPGBL && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      Atenção: PGBL sem benefício fiscal — avaliar migração para VGBL
                    </div>
                  )}
                </div>
              )}

              {value.tipoDeclaracao === "nao_sei" && (
                <p className="text-xs text-muted-foreground">
                  Defina o tipo de declaração para análise completa.
                </p>
              )}
            </div>

            <div className="border-t" />

            {/* Seção: Análise fiscal */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Análise fiscal</p>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Renda anual bruta</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(value.rendaBrutaAnual)}
                </p>
              </div>

              {value.tipoDeclaracao === "completa" && resultado.tetoPGBL > 0 && (
                <>
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
                      <p className="text-xs text-muted-foreground">Economia atual realizada</p>
                      <p className="text-base font-medium tabular-nums text-primary">
                        {formatCurrency(resultado.economiaFiscalAtual)}/ano
                      </p>
                    </div>
                  )}
                </>
              )}

              {resultado.recomendaCompleta && value.tipoDeclaracao !== "completa" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  Renda ou perfil sugerem declaração completa — pode ser mais vantajoso.
                </div>
              )}

              {value.temRendimentosIsentos && value.valorRendimentosIsentos > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Rendimentos isentos</p>
                  <p className="text-sm tabular-nums font-medium">
                    {formatCurrency(value.valorRendimentosIsentos)}/ano
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber((value.valorRendimentosIsentos / Math.max(1, value.rendaBrutaAnual)) * 100, 1)}% da renda — eficiência fiscal positiva
                  </p>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
