import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularIF } from "@/types/financialPlanning";

interface Props {
  secao: SecaoEstrategia;
  onChange: (s: SecaoEstrategia) => void;
  financialPlan: FinancialPlan | null;
}

function generateProjectionData(
  idadeAtual: number,
  idadeMeta: number,
  patrimonioAtual: number,
  aporteMensal: number,
  taxaRetornoAnual: number
): { idade: number; patrimonio: number }[] {
  const totalAnos = Math.max(1, idadeMeta - idadeAtual);
  const numPoints = 10;
  const taxaMensal = taxaRetornoAnual / 100 / 12;
  const points: { idade: number; patrimonio: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const fracao = i / numPoints;
    const anos = fracao * totalAnos;
    const meses = anos * 12;
    const idade = idadeAtual + anos;

    let patrimonio: number;
    if (taxaMensal === 0) {
      patrimonio = patrimonioAtual + aporteMensal * meses;
    } else {
      const fv = patrimonioAtual * Math.pow(1 + taxaMensal, meses);
      const aportesFV = aporteMensal * ((Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal);
      patrimonio = fv + aportesFV;
    }

    points.push({ idade: Math.round(idade * 10) / 10, patrimonio });
  }

  return points;
}

export function SecaoAposentadoria({ secao, onChange, financialPlan }: Props) {
  const plan = financialPlan;
  const pIF = plan?.planejamentoIF;
  const resultado = pIF ? calcularIF(pIF) : null;

  const projData =
    pIF && resultado
      ? generateProjectionData(
          pIF.idadeAtual,
          pIF.idadeMeta,
          pIF.patrimonioAtual,
          pIF.aporteMensal,
          pIF.taxaRetornoAnual
        )
      : [];

  const anosRestantes = pIF ? Math.max(0, pIF.idadeMeta - pIF.idadeAtual) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Aposentadoria / Independência Financeira</h2>
      </div>

      {resultado && pIF ? (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Idade atual</p>
              <p className="font-semibold">{pIF.idadeAtual} anos</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Idade meta</p>
              <p className="font-semibold">{pIF.idadeMeta} anos ({anosRestantes} restantes)</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Progresso IF</p>
              <p className="font-semibold">{resultado.percentualIF.toFixed(1)}%</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Patrimônio necessário</p>
              <p className="font-semibold">{formatCurrency(resultado.patrimonioNecessario)}</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Projeção com aportes</p>
              <p className="font-semibold">{formatCurrency(resultado.patrimonioProjetado)}</p>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Gap</p>
              <p
                className={cn(
                  "font-semibold",
                  resultado.gap > 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {resultado.gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(resultado.gap))}
              </p>
            </div>
          </div>

          {/* Projection chart */}
          {projData.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                Projeção patrimonial
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projData}>
                  <XAxis
                    dataKey="idade"
                    tickFormatter={(v: number) => `${v.toFixed(0)}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Patrimônio"]}
                    labelFormatter={(label: number) => `Idade: ${label.toFixed(1)}`}
                  />
                  <ReferenceLine
                    y={resultado.patrimonioNecessario}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "Meta IF", position: "insideTopRight", fontSize: 11, fill: "#ef4444" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="patrimonio"
                    stroke="#3b82f6"
                    fill="#bfdbfe"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum dado de planejamento disponível. Preencha o plano financeiro primeiro.
        </p>
      )}

      {/* Editable area */}
      <div className="space-y-2">
        <Label htmlFor="apoConteudo">
          Estratégia de acumulação e produtos recomendados
        </Label>
        <Textarea
          id="apoConteudo"
          value={secao.conteudoAssessor}
          onChange={(ev) =>
            onChange({ ...secao, conteudoAssessor: ev.target.value })
          }
          placeholder="Descreva a estratégia de acumulação e os produtos recomendados..."
          className="min-h-[140px]"
          disabled={secao.completa}
        />
      </div>

      <Button
        variant={secao.completa ? "outline" : "default"}
        onClick={() => onChange({ ...secao, completa: !secao.completa })}
      >
        {secao.completa ? "Editar" : "Marcar como completa"}
      </Button>
    </div>
  );
}
