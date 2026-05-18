import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularProtecao, calcularSucessorio } from "@/types/financialPlanning";
import type { SectionStatus } from "./EstrategiaInicialPage";

interface CommentPair {
  protecao: string;
  sucessorio: string;
}

function parseComments(raw: string): CommentPair {
  try {
    const parsed = JSON.parse(raw) as CommentPair;
    if (typeof parsed.protecao === "string" && typeof parsed.sucessorio === "string") {
      return parsed;
    }
  } catch {
    // treat raw string as protecao comment (migration)
    if (raw) return { protecao: raw, sucessorio: "" };
  }
  return { protecao: "", sucessorio: "" };
}

function encodeComments(pair: CommentPair): string {
  return JSON.stringify(pair);
}

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  status: SectionStatus;
  onStatusChange: (s: SectionStatus) => void;
}

export function SecaoProtecaoSucessorio({
  plan,
  comentario,
  onComentarioChange,
  status,
  onStatusChange,
}: Props) {
  const comments = parseComments(comentario);

  function setComment(key: keyof CommentPair, v: string) {
    onComentarioChange(encodeComments({ ...comments, [key]: v }));
  }

  const resultProtecao = useMemo(() => calcularProtecao(plan.protecao), [plan.protecao]);
  const resultSucessorio = useMemo(() => calcularSucessorio(plan.sucessorio), [plan.sucessorio]);

  const scoreProtecao = Math.round(resultProtecao.percentualCoberto);
  const sbProtecao =
    scoreProtecao >= 70
      ? { label: "Adequado", cls: "bg-emerald-100 text-emerald-800" }
      : scoreProtecao >= 40
      ? { label: "Atenção", cls: "bg-amber-100 text-amber-800" }
      : { label: "Risco", cls: "bg-red-100 text-red-800" };

  const suc = plan.sucessorio;
  let scoreSucessorio = 0;
  if (suc.possuiTestamento) scoreSucessorio += 30;
  if (suc.possuiHolding) scoreSucessorio += 30;
  if (suc.possuiSeguroVidaSucessao) scoreSucessorio += 20;
  if (resultSucessorio.percentualCusto < 5) scoreSucessorio += 20;
  else if (resultSucessorio.percentualCusto < 8) scoreSucessorio += 10;
  scoreSucessorio = Math.min(100, scoreSucessorio);

  const sbSucessorio =
    scoreSucessorio >= 70
      ? { label: "Adequado", cls: "bg-emerald-100 text-emerald-800" }
      : scoreSucessorio >= 40
      ? { label: "Atenção", cls: "bg-amber-100 text-amber-800" }
      : { label: "Risco", cls: "bg-red-100 text-red-800" };

  const disabled = status === "concluido";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Proteção e Sucessório</h2>

      {/* ── Proteção ── */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Proteção e Seguros</h3>
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Diagnóstico inicial</p>
              <Badge className={sbProtecao.cls}>{sbProtecao.label}</Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cobertura atual</span>
                <span>{scoreProtecao}%</span>
              </div>
              <Progress value={Math.min(100, scoreProtecao)} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Capital necessário", value: formatCurrency(resultProtecao.capitalNecessario) },
                { label: "Capital segurado", value: formatCurrency(resultProtecao.capitalAtual) },
                { label: "Gap de cobertura", value: formatCurrency(resultProtecao.gap), red: resultProtecao.gap > 0 },
              ].map(({ label, value, red }) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className={`font-semibold ${red ? "text-destructive" : ""}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Checklist</p>
              {[
                { label: "Possui seguro de vida", ok: plan.protecao.possuiSeguroVida },
                { label: "Capital adequado (≥ 80%)", ok: resultProtecao.percentualCoberto >= 80 },
                { label: "Possui seguro invalidez", ok: plan.protecao.possuiSeguroInvalidez },
              ].map(({ label, ok }) => (
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

          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Estratégia — Proteção</h4>
            <Textarea
              value={comments.protecao}
              onChange={(e) => setComment("protecao", e.target.value)}
              placeholder="Ex: Identificamos lacuna de cobertura de R$ X. Recomendamos apólice de vida por R$ Y com cobertura de invalidez..."
              className="min-h-[150px]"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="border-t" />

      {/* ── Sucessório ── */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Planejamento Sucessório</h3>
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Diagnóstico inicial</p>
              <Badge className={sbSucessorio.cls}>{sbSucessorio.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Patrimônio total</p>
                <p className="font-semibold">{formatCurrency(suc.patrimonioTotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Custo estimado inventário</p>
                <p className="font-semibold text-destructive">{formatCurrency(resultSucessorio.custoInventarioEstimado)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">% do patrimônio</p>
                <p className="font-semibold">{resultSucessorio.percentualCusto.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ITCMD estimado</p>
                <p className="font-semibold">{formatCurrency(resultSucessorio.itcmdEstimado)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Checklist</p>
              {[
                { label: "Possui testamento", ok: suc.possuiTestamento },
                { label: "Possui holding familiar", ok: suc.possuiHolding },
                { label: "Seguro de vida para sucessão", ok: suc.possuiSeguroVidaSucessao },
              ].map(({ label, ok }) => (
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

          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Estratégia — Sucessório</h4>
            <Textarea
              value={comments.sucessorio}
              onChange={(e) => setComment("sucessorio", e.target.value)}
              placeholder="Ex: Com ITCMD estimado de R$ X, recomendamos estruturar holding familiar para otimizar a transmissão do patrimônio..."
              className="min-h-[150px]"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Status button */}
      <div className="flex items-center gap-2 pt-2">
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
  );
}
