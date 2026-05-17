import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { FerramentaModal } from "@/components/ferramentas/FerramentaModal";
import { FerramentaLiberdadeFinanceira } from "@/components/ferramentas/FerramentaLiberdadeFinanceira";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularIF } from "@/types/financialPlanning";

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

function buildProj(p: FinancialPlan["planejamentoIF"], meta: number) {
  const anos = Math.max(1, p.idadeMeta - p.idadeAtual);
  const taxaMensal = p.taxaRetornoAnual / 100 / 12;
  const data: { idade: string; projecao: number; meta: number }[] = [];
  let pat = p.patrimonioAtual;
  for (let i = 0; i <= anos; i++) {
    data.push({ idade: String(p.idadeAtual + i), projecao: Math.round(pat), meta: Math.round(meta) });
    for (let m = 0; m < 12; m++) pat = pat * (1 + taxaMensal) + p.aporteMensal;
  }
  return data;
}

function formatAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export function SecaoAposentadoria({ plan, comentario, onComentarioChange, status, onStatusChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const ifResult = useMemo(() => calcularIF(plan.planejamentoIF), [plan.planejamentoIF]);
  const score = Math.round(ifResult.percentualIF);
  const sb = scoreBadge(score);
  const projData = useMemo(() => buildProj(plan.planejamentoIF, ifResult.patrimonioNecessario), [plan.planejamentoIF, ifResult.patrimonioNecessario]);
  const disabled = status === "concluido";
  const p = plan.planejamentoIF;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Aposentadoria / Independência Financeira</h2>
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
                { label: "Idade atual", value: `${p.idadeAtual} anos` },
                { label: "Meta de IF", value: `${p.idadeMeta} anos` },
                { label: "Patrimônio atual", value: formatCurrency(p.patrimonioAtual) },
                { label: "Aporte mensal", value: formatCurrency(p.aporteMensal) },
                { label: "Patrimônio necessário", value: formatCurrency(ifResult.patrimonioNecessario) },
                { label: "Gap", value: formatCurrency(ifResult.gap), red: ifResult.gap > 0 },
              ].map(({ label, value, red }) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className={`font-semibold ${red ? "text-destructive" : ""}`}>{value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Projeção patrimonial</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={projData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIF2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="idade" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={formatAxis} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} labelFormatter={(l) => `Idade ${l}`} />
                  <ReferenceLine y={ifResult.patrimonioNecessario} stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: "Meta", position: "right", fontSize: 9, fill: "#ef4444" }} />
                  <Area type="monotone" dataKey="projecao" name="Projeção" stroke="#3b82f6" fill="url(#gradIF2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {ifResult.gap > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Principais gaps</p>
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  Gap de {formatCurrency(ifResult.gap)} — aporte mensal insuficiente para atingir a meta
                </p>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Abrir ferramenta IF →
          </Button>
        </div>

        {/* Right */}
        <div className="space-y-3">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Estratégia do assessor</h3>
            <p className="text-xs text-muted-foreground">Análise e estratégia para esta área</p>
            <Textarea
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              placeholder="Ex: Para atingir a IF aos 60 anos, o cliente precisa aumentar os aportes mensais de R$ X para R$ Y. Recomendamos revisar a alocação para buscar maior rentabilidade real..."
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

      <FerramentaModal open={modalOpen} onClose={() => setModalOpen(false)} title="Liberdade Financeira">
        <FerramentaLiberdadeFinanceira
          planejamentoIF={plan.planejamentoIF}
          onSave={() => setModalOpen(false)}
        />
      </FerramentaModal>
    </div>
  );
}
