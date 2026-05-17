import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  ALOCACAO_ALVO,
  PERFIL_LABELS,
  calcularAlocacaoAtual,
} from "@/types/financialPlanning";
import type { AtivoAtual, PerfilRisco } from "@/types/financialPlanning";
import { useState } from "react";

interface AtivoFormProps {
  value: AtivoAtual;
  suitabilityPerfil: PerfilRisco | null;
  onChange: (v: AtivoAtual) => void;
}

const CAMPOS: { key: keyof Omit<AtivoAtual, "total">; label: string; hint: string }[] = [
  { key: "rendaFixa", label: "Renda Fixa", hint: "CDB, Tesouro, LCI, LCA, debêntures" },
  { key: "acoes", label: "Ações brasileiras", hint: "Ações, ETFs nacionais" },
  { key: "fiis", label: "FIIs", hint: "Fundos Imobiliários" },
  { key: "rvGlobal", label: "RV Global", hint: "BDR, ETF internacional, conta exterior" },
  { key: "rfGlobal", label: "RF Global", hint: "Renda fixa internacional" },
  { key: "cripto", label: "Criptoativos", hint: "Bitcoin, Ethereum e outros" },
];

const ASSET_COLORS: Record<string, string> = {
  rendaFixa: "bg-blue-500",
  acoes: "bg-emerald-500",
  fiis: "bg-purple-500",
  rvGlobal: "bg-orange-500",
  rfGlobal: "bg-cyan-500",
  cripto: "bg-yellow-500",
};

export function AtivoForm({ value, suitabilityPerfil, onChange }: AtivoFormProps) {
  const [zerando, setZerando] = useState(false);

  const total =
    value.rendaFixa +
    value.acoes +
    value.fiis +
    value.rvGlobal +
    value.rfGlobal +
    value.cripto;

  useEffect(() => {
    if (value.total !== total) {
      onChange({ ...value, total });
    }
  }, [total, value, onChange]);

  function handleField(key: keyof Omit<AtivoAtual, "total">, v: number) {
    onChange({ ...value, [key]: v, total });
  }

  function handleZerando(checked: boolean) {
    setZerando(checked);
    if (checked) {
      onChange({
        rendaFixa: 0,
        acoes: 0,
        fiis: 0,
        rvGlobal: 0,
        rfGlobal: 0,
        cripto: 0,
        total: 0,
      });
    }
  }

  const alocacaoAtual = calcularAlocacaoAtual({ ...value, total: total || 1 });
  const alvo = suitabilityPerfil ? ALOCACAO_ALVO[suitabilityPerfil] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold">Patrimônio e alocação atual</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Informe o valor investido em cada classe de ativo
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="zerando" checked={zerando} onCheckedChange={handleZerando} />
        <Label htmlFor="zerando" className="cursor-pointer text-sm">
          Cliente está começando a investir agora (patrimônio zerado)
        </Label>
      </div>

      {zerando && (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Mantenha os campos zerados. O planejamento partirá do zero com base nos
          aportes mensais projetados.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map(({ key, label, hint }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`ativo-${key}`} className="text-sm font-medium">
              {label}
            </Label>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <CurrencyInput
              id={`ativo-${key}`}
              value={value[key]}
              onChange={(v) => handleField(key, v)}
              disabled={zerando}
            />
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total investido</span>
            <span className="text-xl font-bold tabular-nums text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-4 text-sm font-semibold">
              Alocação atual
              {alvo && suitabilityPerfil && (
                <span className="ml-2 font-normal text-muted-foreground">
                  vs. alvo {PERFIL_LABELS[suitabilityPerfil]}
                </span>
              )}
            </p>
            <div className="space-y-4">
              {CAMPOS.map(({ key, label }) => {
                const atual = alocacaoAtual[key] ?? 0;
                const alvoVal = alvo ? alvo[key] ?? 0 : null;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">
                        <span className="font-medium">{formatNumber(atual, 1)}%</span>
                        {alvoVal !== null && (
                          <span className="ml-1 text-muted-foreground">
                            / alvo {alvoVal}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${ASSET_COLORS[key] ?? "bg-primary"}`}
                        style={{ width: `${Math.min(100, atual)}%` }}
                      />
                      {alvoVal !== null && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-foreground/40"
                          style={{ left: `${Math.min(100, alvoVal)}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!total && !zerando && (
        <div className="space-y-2">
          {CAMPOS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{label}</span>
              <Progress value={0} className="mx-3 h-1.5 flex-1" />
              <span>0%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
