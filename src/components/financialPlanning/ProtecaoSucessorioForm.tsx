import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import {
  calcularProtecao,
  calcularSucessorio,
} from "@/types/financialPlanning";
import type {
  ProtecaoSimplificada,
  PlanejamentoSucessorio,
  DadosCliente,
} from "@/types/financialPlanning";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  protecao: ProtecaoSimplificada;
  onProtecaoChange: (v: ProtecaoSimplificada) => void;
  sucessorio: PlanejamentoSucessorio;
  onSucessorioChange: (v: PlanejamentoSucessorio) => void;
  dadosCliente?: DadosCliente;
}

export function ProtecaoSucessorioForm({
  protecao,
  onProtecaoChange,
  sucessorio,
  onSucessorioChange,
  dadosCliente,
}: Props) {
  const setP = <K extends keyof ProtecaoSimplificada>(key: K, val: ProtecaoSimplificada[K]) =>
    onProtecaoChange({ ...protecao, [key]: val });

  const setS = <K extends keyof PlanejamentoSucessorio>(key: K, val: PlanejamentoSucessorio[K]) =>
    onSucessorioChange({ ...sucessorio, [key]: val });

  const resultProtecao = useMemo(() => calcularProtecao(protecao), [protecao]);
  const resultSucessorio = useMemo(() => calcularSucessorio(sucessorio), [sucessorio]);

  const scoreProtecao = Math.round(resultProtecao.percentualCoberto);
  const scoreBadgeProtecao =
    scoreProtecao >= 80
      ? { label: "Adequado", cls: "bg-emerald-100 text-emerald-800" }
      : scoreProtecao >= 50
      ? { label: "Atenção", cls: "bg-amber-100 text-amber-800" }
      : { label: "Risco", cls: "bg-red-100 text-red-800" };

  const hasPrefill = !!dadosCliente;

  return (
    <div className="flex flex-col gap-10">
      {/* ══════════════ PROTEÇÃO ══════════════ */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Proteção e Seguros</h2>
          {hasPrefill && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Preenchido automaticamente da coleta
            </Badge>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Form */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ps-renda">Renda mensal</Label>
              <CurrencyInput
                id="ps-renda"
                value={protecao.rendaMensal}
                onChange={(v) => setP("rendaMensal", v)}
              />
              {hasPrefill && dadosCliente!.rendaMensal > 0 && protecao.rendaMensal === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sugestão da coleta: {formatCurrency(dadosCliente!.rendaMensal)}/mês
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ps-dep">Número de dependentes</Label>
              <input
                id="ps-dep"
                type="number"
                min={0}
                max={20}
                value={protecao.dependentes}
                onChange={(e) => setP("dependentes", parseInt(e.target.value, 10) || 0)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="ps-svida"
                  checked={protecao.possuiSeguroVida}
                  onCheckedChange={(v) => setP("possuiSeguroVida", v)}
                />
                <Label htmlFor="ps-svida" className="cursor-pointer">Possui seguro de vida?</Label>
              </div>
              {protecao.possuiSeguroVida && (
                <div className="ml-8 space-y-1.5 max-w-xs">
                  <Label className="text-sm">Capital segurado</Label>
                  <CurrencyInput
                    value={protecao.capitalSeguradoVida}
                    onChange={(v) => setP("capitalSeguradoVida", v)}
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch
                  id="ps-sinval"
                  checked={protecao.possuiSeguroInvalidez}
                  onCheckedChange={(v) => setP("possuiSeguroInvalidez", v)}
                />
                <Label htmlFor="ps-sinval" className="cursor-pointer">Possui seguro de invalidez?</Label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="ps-saude"
                  checked={protecao.possuiPlanoSaude}
                  onCheckedChange={(v) => setP("possuiPlanoSaude", v)}
                />
                <Label htmlFor="ps-saude" className="cursor-pointer">Possui plano de saúde?</Label>
              </div>
            </div>
          </div>

          {/* Result panel */}
          <Card className="lg:w-64 xl:w-72 shrink-0">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Análise de proteção</p>
                <Badge className={scoreBadgeProtecao.cls}>{scoreBadgeProtecao.label}</Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Cobertura</span>
                  <span>{scoreProtecao}%</span>
                </div>
                <Progress value={Math.min(100, scoreProtecao)} className="h-2" />
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Capital necessário</p>
                  <p className="font-semibold">{formatCurrency(resultProtecao.capitalNecessario)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capital segurado</p>
                  <p className="font-semibold">{formatCurrency(resultProtecao.capitalAtual)}</p>
                </div>
                {resultProtecao.gap > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Gap de cobertura</p>
                    <p className="font-semibold text-destructive">{formatCurrency(resultProtecao.gap)}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {[
                  { label: "Seguro de vida", ok: protecao.possuiSeguroVida },
                  { label: "Capital ≥ 80%", ok: resultProtecao.percentualCoberto >= 80 },
                  { label: "Seguro invalidez", ok: protecao.possuiSeguroInvalidez },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${ok ? "text-green-500" : "text-muted-foreground/30"}`} />
                    <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t" />

      {/* ══════════════ SUCESSÓRIO ══════════════ */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Planejamento Sucessório</h2>
          {hasPrefill && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Preenchido automaticamente da coleta
            </Badge>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Form */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ps-pat">Patrimônio total estimado</Label>
              <CurrencyInput
                id="ps-pat"
                value={sucessorio.patrimonioTotal}
                onChange={(v) => {
                  onSucessorioChange({ ...sucessorio, patrimonioTotal: v });
                }}
              />
              {hasPrefill && dadosCliente!.patrimonioTotalEstimado > 0 && sucessorio.patrimonioTotal === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sugestão da coleta: {formatCurrency(dadosCliente!.patrimonioTotalEstimado)}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ps-herd">Número de herdeiros</Label>
              <input
                id="ps-herd"
                type="number"
                min={0}
                max={30}
                value={sucessorio.numeroHerdeiros}
                onChange={(e) => setS("numeroHerdeiros", parseInt(e.target.value, 10) || 0)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ps-uf">Estado de residência (ITCMD)</Label>
              <Select
                value={sucessorio.estadoResidencia}
                onValueChange={(v) => setS("estadoResidencia", v)}
              >
                <SelectTrigger id="ps-uf" className="max-w-xs">
                  <SelectValue placeholder="UF..." />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              {[
                { id: "ps-test", label: "Possui testamento?", key: "possuiTestamento" as const },
                { id: "ps-hold", label: "Possui holding familiar?", key: "possuiHolding" as const },
                { id: "ps-svsucess", label: "Seguro de vida para sucessão?", key: "possuiSeguroVidaSucessao" as const },
              ].map(({ id, label, key }) => (
                <div key={key} className="flex items-center gap-3">
                  <Switch
                    id={id}
                    checked={sucessorio[key] as boolean}
                    onCheckedChange={(v) => setS(key, v)}
                  />
                  <Label htmlFor={id} className="cursor-pointer">{label}</Label>
                </div>
              ))}
              {sucessorio.possuiSeguroVidaSucessao && (
                <div className="ml-8 space-y-1.5 max-w-xs">
                  <Label className="text-sm">Capital do seguro para sucessão</Label>
                  <CurrencyInput
                    value={sucessorio.capitalSeguroVidaSucessao}
                    onChange={(v) => setS("capitalSeguroVidaSucessao", v)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Result panel */}
          <Card className="lg:w-64 xl:w-72 shrink-0">
            <CardContent className="pt-5 space-y-4">
              <p className="text-sm font-semibold">Análise sucessória</p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Patrimônio total</p>
                  <p className="font-semibold">{formatCurrency(sucessorio.patrimonioTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo estimado inventário</p>
                  <p className="font-semibold text-destructive">{formatCurrency(resultSucessorio.custoInventarioEstimado)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% do patrimônio</p>
                  <p className="font-semibold">{resultSucessorio.percentualCusto.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ITCMD estimado</p>
                  <p className="font-semibold">{formatCurrency(resultSucessorio.itcmdEstimado)}</p>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { label: "Possui testamento", ok: sucessorio.possuiTestamento },
                  { label: "Holding familiar", ok: sucessorio.possuiHolding },
                  { label: "Seguro p/ sucessão", ok: sucessorio.possuiSeguroVidaSucessao },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${ok ? "text-green-500" : "text-muted-foreground/30"}`} />
                    <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
