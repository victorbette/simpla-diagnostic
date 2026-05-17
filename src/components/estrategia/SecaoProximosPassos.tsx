import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularIF, calcularProtecao } from "@/types/financialPlanning";

type SectionStatus = "pendente" | "revisando" | "concluido";

export interface PassoItem {
  id: string;
  prioridade: "alta" | "media" | "baixa";
  texto: string;
  prazo: string;
}

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  status: SectionStatus;
  onStatusChange: (s: SectionStatus) => void;
  proximosPassos: PassoItem[];
  onProximosPassosChange: (items: PassoItem[]) => void;
  dataProximaReuniao: string;
  onDataProximaReuniaoChange: (v: string) => void;
  consideracoesFinais: string;
  onConsideracoesFinaisChange: (v: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const PRIORIDADE_COLORS: Record<PassoItem["prioridade"], string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-green-100 text-green-700",
};

const PRIORIDADE_LABELS: Record<PassoItem["prioridade"], string> = {
  alta: "Alta", media: "Média", baixa: "Baixa",
};

export function SecaoProximosPassos({
  plan, comentario: _comentario, onComentarioChange: _onComentarioChange, status, onStatusChange,
  proximosPassos, onProximosPassosChange,
  dataProximaReuniao, onDataProximaReuniaoChange,
  consideracoesFinais, onConsideracoesFinaisChange,
}: Props) {
  const autoAcoes = useMemo(() => {
    const acoes: { area: string; desc: string; prioridade: PassoItem["prioridade"] }[] = [];
    const prot = calcularProtecao(plan.protecao);
    if (prot.gap > 0) acoes.push({ area: "Proteção", desc: `Contratar seguro de vida — gap de ${formatCurrency(prot.gap)}`, prioridade: "alta" });
    const ifR = calcularIF(plan.planejamentoIF);
    if (ifR.gap > 0) acoes.push({ area: "Aposentadoria", desc: "Aumentar aportes mensais para atingir a meta de IF", prioridade: "media" });
    if (!plan.fiscal.temPGBL && plan.fiscal.rendaBrutaAnual > 0) acoes.push({ area: "Fiscal", desc: "Avaliar contribuição ao PGBL", prioridade: "media" });
    if (!plan.sucessorio.possuiTestamento) acoes.push({ area: "Sucessório", desc: "Elaborar testamento", prioridade: "baixa" });
    return acoes;
  }, [plan]);

  const disabled = status === "concluido";

  function updatePasso(id: string, patch: Partial<PassoItem>) {
    onProximosPassosChange(proximosPassos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePasso(id: string) {
    onProximosPassosChange(proximosPassos.filter((p) => p.id !== id));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...proximosPassos];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onProximosPassosChange(next);
  }

  function moveDown(index: number) {
    if (index >= proximosPassos.length - 1) return;
    const next = [...proximosPassos];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onProximosPassosChange(next);
  }

  function addPasso() {
    onProximosPassosChange([...proximosPassos, { id: generateId(), prioridade: "media", texto: "", prazo: "" }]);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Próximos Passos</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Ações identificadas automaticamente</h3>
            {autoAcoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação automática identificada.</p>
            ) : (
              <ul className="space-y-2">
                {autoAcoes.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge className={`shrink-0 mt-0.5 text-xs ${PRIORIDADE_COLORS[a.prioridade]}`}>
                      {PRIORIDADE_LABELS[a.prioridade]}
                    </Badge>
                    <span><span className="font-medium">[{a.area}]</span> {a.desc}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Passos editáveis */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Próximos passos do assessor</h3>
              {!disabled && (
                <Button variant="outline" size="sm" onClick={addPasso}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar passo
                </Button>
              )}
            </div>
            {proximosPassos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum passo adicionado.</p>
            )}
            <ul className="space-y-3">
              {proximosPassos.map((passo, index) => (
                <li key={passo.id} className="border rounded p-3 space-y-2 bg-background">
                  <div className="flex items-center gap-1 justify-end">
                    {!disabled && (
                      <>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveUp(index)} disabled={index === 0}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveDown(index)} disabled={index === proximosPassos.length - 1}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removePasso(passo.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  {disabled ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className={`text-xs ${PRIORIDADE_COLORS[passo.prioridade]}`}>{PRIORIDADE_LABELS[passo.prioridade]}</Badge>
                      <span>{passo.texto}</span>
                      {passo.prazo && <span className="text-muted-foreground ml-auto text-xs">{passo.prazo}</span>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                      <select
                        value={passo.prioridade}
                        onChange={(e) => updatePasso(passo.id, { prioridade: e.target.value as PassoItem["prioridade"] })}
                        className="text-xs border rounded px-2 py-1 bg-background"
                      >
                        <option value="alta">Alta</option>
                        <option value="media">Média</option>
                        <option value="baixa">Baixa</option>
                      </select>
                      <Input
                        value={passo.texto}
                        onChange={(e) => updatePasso(passo.id, { texto: e.target.value })}
                        placeholder="Descrição do passo"
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        value={passo.prazo}
                        onChange={(e) => updatePasso(passo.id, { prazo: e.target.value })}
                        className="text-sm w-36"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Data reunião */}
          <div className="space-y-2">
            <Label htmlFor="proximaReuniao">Data da próxima reunião</Label>
            <Input
              id="proximaReuniao"
              type="date"
              value={dataProximaReuniao}
              onChange={(e) => onDataProximaReuniaoChange(e.target.value)}
              disabled={disabled}
              className="max-w-xs"
            />
          </div>

          {/* Considerações finais */}
          <div className="space-y-2">
            <Label htmlFor="consideracoes">Considerações finais</Label>
            <Textarea
              id="consideracoes"
              value={consideracoesFinais}
              onChange={(e) => onConsideracoesFinaisChange(e.target.value)}
              placeholder="Considerações adicionais para o cliente..."
              className="min-h-[100px]"
              disabled={disabled}
            />
          </div>

          {/* Status */}
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
  );
}
