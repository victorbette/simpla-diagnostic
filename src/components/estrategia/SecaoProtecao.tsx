import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaSeguro } from "@/components/ferramentas/FerramentaSeguro";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularProtecao } from "@/types/financialPlanning";

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

export function SecaoProtecao({ plan, comentario, onComentarioChange, status, onStatusChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const result = useMemo(() => calcularProtecao(plan.protecao), [plan.protecao]);
  const score = Math.round(result.percentualCoberto);
  const sb = scoreBadge(score);
  const disabled = status === "concluido";

  const checks = [
    { label: "Possui seguro de vida", ok: plan.protecao.possuiSeguroVida },
    { label: "Capital adequado (≥ 80%)", ok: result.percentualCoberto >= 80 },
    { label: "Possui seguro invalidez", ok: plan.protecao.possuiSeguroInvalidez },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Proteção e Seguros</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Diagnóstico inicial</h3>
              <Badge className={sb.cls}>{sb.label}</Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cobertura atual</span>
                <span>{score}%</span>
              </div>
              <Progress value={Math.min(100, score)} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Capital necessário", value: formatCurrency(result.capitalNecessario) },
                { label: "Capital segurado", value: formatCurrency(result.capitalAtual) },
                { label: "Gap de cobertura", value: formatCurrency(result.gap), red: result.gap > 0 },
              ].map(({ label, value, red }) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className={`font-semibold ${red ? "text-destructive" : ""}`}>{value}</p>
                </div>
              ))}
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
          </div>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Abrir ferramenta de seguros →
          </Button>
        </div>

        {/* Right */}
        <div className="space-y-3">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Estratégia do consultor</h3>
            <p className="text-xs text-muted-foreground">Análise e estratégia para esta área</p>
            <Textarea
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              placeholder="Ex: Identificamos uma lacuna de cobertura de R$ X. Recomendamos contratar apólice de vida por R$ Y, com cobertura de invalidez incluída. Sugerimos revisão anual..."
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

      <FerramentaModal open={modalOpen} onClose={() => setModalOpen(false)} title="Análise de Seguros">
        <FerramentaSeguro
          protecao={plan.protecao}
          onSave={() => setModalOpen(false)}
        />
      </FerramentaModal>
    </div>
  );
}
