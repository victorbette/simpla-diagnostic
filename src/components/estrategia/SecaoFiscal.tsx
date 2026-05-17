import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaPGBL } from "@/components/ferramentas/FerramentaPGBL";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularFiscal } from "@/types/financialPlanning";

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

export function SecaoFiscal({ plan, comentario, onComentarioChange, status, onStatusChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const result = useMemo(() => calcularFiscal(plan.fiscal), [plan.fiscal]);
  const score =
    result.economiaFiscalPotencial > 0
      ? Math.round((result.economiaFiscalAtual / result.economiaFiscalPotencial) * 100)
      : 100;
  const sb = scoreBadge(score);
  const disabled = status === "concluido";

  const gaps: string[] = [];
  if (result.gapEconomia > 1000)
    gaps.push(`Potencial de economia de ${formatCurrency(result.gapEconomia)}/ano não aproveitado`);
  if (!plan.fiscal.temPGBL && plan.fiscal.tipoDeclaracao === "completa")
    gaps.push("PGBL não utilizado — declaração completa");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Planejamento Fiscal</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Diagnóstico inicial</h3>
              <Badge className={sb.cls}>{sb.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Renda bruta anual", value: formatCurrency(plan.fiscal.rendaBrutaAnual) },
                { label: "Teto PGBL (12%)", value: formatCurrency(result.tetoPGBL) },
                { label: "Economia atual", value: formatCurrency(result.economiaFiscalAtual) },
                { label: "Economia potencial", value: formatCurrency(result.economiaFiscalPotencial) },
                { label: "Gap de economia", value: formatCurrency(result.gapEconomia), red: result.gapEconomia > 0 },
              ].map(({ label, value, red }) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className={`font-semibold ${red ? "text-destructive" : ""}`}>{value}</p>
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
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Abrir calculadora PGBL →
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
              placeholder="Ex: Ao aportar o teto no PGBL, o cliente economizará R$ X por ano em IR. Com declaração completa, o benefício é maximizado. Recomendamos também avaliar VGBL para complementar..."
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

      <FerramentaModal open={modalOpen} onClose={() => setModalOpen(false)} title="Calculadora PGBL">
        <FerramentaPGBL fiscal={plan.fiscal} onSave={() => setModalOpen(false)} />
      </FerramentaModal>
    </div>
  );
}
