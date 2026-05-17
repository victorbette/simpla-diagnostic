import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Circle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularSucessorio } from "@/types/financialPlanning";

type SectionStatus = "pendente" | "revisando" | "concluido";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  status: SectionStatus;
  onStatusChange: (s: SectionStatus) => void;
}

function scoreBadge(score: number) {
  if (score >= 70) return { label: "Adequado", cls: "bg-emerald-100 text-emerald-800" };
  if (score >= 40) return { label: "Atenção", cls: "bg-amber-100 text-amber-800" };
  return { label: "Risco", cls: "bg-red-100 text-red-800" };
}

export function SecaoSucessorio({ plan, comentario, onComentarioChange, status, onStatusChange }: Props) {
  const result = useMemo(() => calcularSucessorio(plan.sucessorio), [plan.sucessorio]);
  const suc = plan.sucessorio;

  let score = 0;
  if (suc.possuiTestamento) score += 30;
  if (suc.possuiHolding) score += 30;
  if (suc.possuiSeguroVidaSucessao) score += 20;
  if (result.percentualCusto < 5) score += 20;
  else if (result.percentualCusto < 8) score += 10;
  score = Math.min(100, score);

  const sb = scoreBadge(score);
  const disabled = status === "concluido";

  const checks = [
    { label: "Possui testamento", ok: suc.possuiTestamento },
    { label: "Possui holding familiar", ok: suc.possuiHolding },
    { label: "Seguro de vida para sucessão", ok: suc.possuiSeguroVidaSucessao },
  ];

  const gaps: string[] = [];
  if (!suc.possuiTestamento) gaps.push("Elaborar testamento");
  if (!suc.possuiHolding && suc.patrimonioTotal > 1_000_000) gaps.push("Avaliar estrutura de holding familiar");
  if (result.percentualCusto > 8) gaps.push("Custo de inventário alto — estruturação necessária");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Planejamento Sucessório</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Diagnóstico inicial</h3>
              <Badge className={sb.cls}>{sb.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Patrimônio total</p>
                <p className="font-semibold">{formatCurrency(suc.patrimonioTotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Custo estimado inventário</p>
                <p className="font-semibold text-destructive">{formatCurrency(result.custoInventarioEstimado)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">% do patrimônio</p>
                <p className="font-semibold">{result.percentualCusto.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ITCMD estimado</p>
                <p className="font-semibold">{formatCurrency(result.itcmdEstimado)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Checklist</p>
              {checks.map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
                </div>
              ))}
            </div>
            {gaps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Principais gaps</p>
                <ul className="space-y-1">
                  {gaps.map((g, i) => (
                    <li key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-3">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Estratégia do assessor</h3>
            <p className="text-xs text-muted-foreground">Análise e estratégia para esta área</p>
            <Textarea
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              placeholder="Ex: Com ITCMD estimado de R$ X, recomendamos estruturar uma holding familiar para otimizar a transmissão do patrimônio e reduzir o custo de inventário..."
              className="min-h-[200px]"
              disabled={disabled}
            />
            <div className="flex items-center gap-2">
              {status === "concluido" ? (
                <>
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => onStatusChange("revisando")}>Editar</Button>
                </>
              ) : (
                <Button onClick={() => onStatusChange("concluido")}>Marcar como concluída</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
