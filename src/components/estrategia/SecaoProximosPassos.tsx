import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import { calcularIF, calcularProtecao } from "@/types/financialPlanning";

interface Props {
  secao: SecaoEstrategia;
  onChange: (s: SecaoEstrategia) => void;
  financialPlan: FinancialPlan | null;
}

interface AcaoItem {
  id: string;
  area: string;
  descricao: string;
  prazo: string;
  urgencia: "alta" | "media" | "baixa";
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function autoGenerateAcoes(plan: FinancialPlan): AcaoItem[] {
  const acoes: AcaoItem[] = [];

  const protResult = calcularProtecao(plan.protecao);
  if (protResult.gap > 0) {
    acoes.push({
      id: generateId(),
      area: "Proteção",
      descricao: "Contratar seguro de vida",
      prazo: "",
      urgencia: "alta",
    });
  }

  const ifResult = calcularIF(plan.planejamentoIF);
  if (ifResult.gap > 0) {
    acoes.push({
      id: generateId(),
      area: "Aposentadoria",
      descricao: "Aumentar aportes mensais",
      prazo: "",
      urgencia: "media",
    });
  }

  if (!plan.fiscal.temPGBL && plan.fiscal.rendaBrutaAnual > 0) {
    acoes.push({
      id: generateId(),
      area: "Fiscal",
      descricao: "Avaliar contribuição ao PGBL",
      prazo: "",
      urgencia: "media",
    });
  }

  if (!plan.sucessorio.possuiTestamento) {
    acoes.push({
      id: generateId(),
      area: "Sucessório",
      descricao: "Elaborar testamento",
      prazo: "",
      urgencia: "baixa",
    });
  }

  return acoes;
}

const URGENCIA_COLORS: Record<AcaoItem["urgencia"], string> = {
  alta: "bg-red-100 text-red-700 border-red-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baixa: "bg-green-100 text-green-700 border-green-200",
};

const URGENCIA_LABELS: Record<AcaoItem["urgencia"], string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function SecaoProximosPassos({ secao, onChange, financialPlan }: Props) {
  const storedAcoes = secao.dados.acoes as AcaoItem[] | undefined;
  const storedProximaReuniao = (secao.dados.proximaReuniao as string) ?? "";
  const storedObservacoes = (secao.dados.observacoes as string) ?? "";

  const [acoes, setAcoes] = useState<AcaoItem[]>(() => {
    if (storedAcoes && storedAcoes.length > 0) return storedAcoes;
    if (financialPlan) return autoGenerateAcoes(financialPlan);
    return [];
  });
  const [proximaReuniao, setProximaReuniao] = useState<string>(storedProximaReuniao);
  const [observacoes, setObservacoes] = useState<string>(storedObservacoes);

  // Sync to parent whenever local state changes
  useEffect(() => {
    const updatedDados: Record<string, unknown> = {
      ...secao.dados,
      acoes,
      proximaReuniao,
      observacoes,
    };
    onChange({ ...secao, dados: updatedDados });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acoes, proximaReuniao, observacoes]);

  function updateAcao(id: string, patch: Partial<AcaoItem>) {
    setAcoes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  }

  function removeAcao(id: string) {
    setAcoes((prev) => prev.filter((a) => a.id !== id));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setAcoes((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setAcoes((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function addAcao() {
    setAcoes((prev) => [
      ...prev,
      {
        id: generateId(),
        area: "",
        descricao: "",
        prazo: "",
        urgencia: "media",
      },
    ]);
  }

  const disabled = secao.completa;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Próximos Passos</h2>
      </div>

      {/* Actions list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ações prioritárias</Label>
          {!disabled && (
            <Button variant="outline" size="sm" onClick={addAcao}>
              Adicionar ação personalizada
            </Button>
          )}
        </div>

        {acoes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma ação registrada.
          </p>
        )}

        <ul className="space-y-2">
          {acoes.map((acao, index) => (
            <li
              key={acao.id}
              className="border rounded p-3 space-y-2 bg-card"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-xs", URGENCIA_COLORS[acao.urgencia])}
                >
                  {URGENCIA_LABELS[acao.urgencia]}
                </Badge>
                {acao.area && (
                  <span className="text-xs text-muted-foreground font-medium">
                    [{acao.area}]
                  </span>
                )}
                {!disabled && (
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label="Mover para cima"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveDown(index)}
                      disabled={index === acoes.length - 1}
                      aria-label="Mover para baixo"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeAcao(acao.id)}
                      aria-label="Remover ação"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>

              {disabled ? (
                <p className="text-sm">{acao.descricao}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={acao.area}
                    onChange={(ev) => updateAcao(acao.id, { area: ev.target.value })}
                    placeholder="Área (ex: Fiscal)"
                    className="text-sm"
                  />
                  <Input
                    value={acao.descricao}
                    onChange={(ev) => updateAcao(acao.id, { descricao: ev.target.value })}
                    placeholder="Descrição da ação"
                    className="text-sm md:col-span-2"
                  />
                  <Input
                    type="date"
                    value={acao.prazo}
                    onChange={(ev) => updateAcao(acao.id, { prazo: ev.target.value })}
                    className="text-sm"
                  />
                  <select
                    value={acao.urgencia}
                    onChange={(ev) =>
                      updateAcao(acao.id, {
                        urgencia: ev.target.value as AcaoItem["urgencia"],
                      })
                    }
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Next meeting */}
      <div className="space-y-2">
        <Label htmlFor="proximaReuniao">Data da próxima reunião</Label>
        <Input
          id="proximaReuniao"
          type="date"
          value={proximaReuniao}
          onChange={(ev) => setProximaReuniao(ev.target.value)}
          disabled={disabled}
          className="max-w-xs"
        />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações finais</Label>
        <Textarea
          id="observacoes"
          value={observacoes}
          onChange={(ev) => setObservacoes(ev.target.value)}
          placeholder="Observações adicionais para o cliente..."
          className="min-h-[140px]"
          disabled={disabled}
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
