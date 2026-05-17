import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ItemPlanoAcao } from "@/lib/carteira/types";
import { CLASSES } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  planoAcao: ItemPlanoAcao[];
  onPlanoAcao: (p: ItemPlanoAcao[]) => void;
  patrimonio: number;
  notaConsultor: string;
  onNotaConsultor: (s: string) => void;
}

type Filtro = "todos" | "aportar" | "resgatar" | "manter" | "novo_ativo";

function AcaoBadge({ tipo }: { tipo: ItemPlanoAcao["tipo"] }) {
  const cfg: Record<ItemPlanoAcao["tipo"], { cls: string; label: string }> = {
    manter: { cls: "bg-gray-100 text-gray-700", label: "Manter" },
    aportar: { cls: "bg-blue-100 text-blue-800", label: "Aportar" },
    resgatar_parcial: { cls: "bg-amber-100 text-amber-800", label: "Resgatar parcial" },
    resgatar_total: { cls: "bg-red-100 text-red-800", label: "Resgatar tudo" },
    novo_ativo: { cls: "bg-purple-100 text-purple-800", label: "Novo ativo" },
  };
  const { cls, label } = cfg[tipo];
  return <span className={cn("text-xs rounded px-1.5 py-0.5", cls)}>{label}</span>;
}

export function Etapa3PlanoAcao({
  planoAcao,
  onPlanoAcao,
  patrimonio: _patrimonio,
  notaConsultor,
  onNotaConsultor,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  function updateItem(id: string, patch: Partial<ItemPlanoAcao>) {
    onPlanoAcao(planoAcao.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const ap = planoAcao
      .filter((p) => p.movimentacaoBRL > 0)
      .reduce((s, p) => s + p.movimentacaoBRL, 0);
    const re = planoAcao
      .filter((p) => p.movimentacaoBRL < 0)
      .reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);
    return {
      totalAportes: ap,
      totalResgates: re,
      saldoLiquido: ap - re,
      nMovs: planoAcao.filter((p) => p.tipo !== "manter").length,
    };
  }, [planoAcao]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return planoAcao;
    if (filtro === "resgatar")
      return planoAcao.filter(
        (p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total"
      );
    return planoAcao.filter((p) => p.tipo === filtro);
  }, [planoAcao, filtro]);

  // Group by CLASSES order
  const classesComItens = CLASSES.map((c) => c.key).filter((k) =>
    filtrados.some((p) => p.classe === k)
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total aportes</p>
          <p className="text-base font-semibold text-green-600">{formatBRL(totalAportes)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total resgates</p>
          <p className="text-base font-semibold text-red-600">{formatBRL(totalResgates)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Saldo líquido</p>
          <p
            className={cn(
              "text-base font-semibold",
              saldoLiquido >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {formatBRL(saldoLiquido)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Movimentações</p>
          <p className="text-base font-semibold">{nMovs}</p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-1 flex-wrap">
        {(
          [
            ["todos", "Todos"],
            ["aportar", "Aportar"],
            ["resgatar", "Resgatar"],
            ["manter", "Manter"],
            ["novo_ativo", "Novo ativo"],
          ] as [Filtro, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors border",
              filtro === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Groups */}
      {classesComItens.map((classe) => {
        const classeInfo = CLASSES.find((c) => c.key === classe)!;
        const groupItems = filtrados.filter((p) => p.classe === classe);
        const groupTotal = groupItems.reduce((s, p) => s + p.movimentacaoBRL, 0);

        return (
          <div key={classe} className="rounded-lg border overflow-hidden">
            <div className="bg-muted px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: classeInfo.cor }}
                />
                <span className="font-semibold text-sm">
                  {classeInfo.grupo} — {classeInfo.label}
                </span>
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  groupTotal > 0
                    ? "text-green-600"
                    : groupTotal < 0
                    ? "text-red-600"
                    : "text-muted-foreground"
                )}
              >
                {groupTotal === 0
                  ? "—"
                  : `${groupTotal > 0 ? "+" : ""}${formatBRL(groupTotal)}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-normal">Ativo</th>
                    <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Atual R$</th>
                    <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Meta R$</th>
                    <th className="px-3 py-2 text-right font-normal whitespace-nowrap">
                      Movimentação
                    </th>
                    <th className="px-3 py-2 text-left font-normal">Ação</th>
                    <th className="px-3 py-2 text-left font-normal">Observação</th>
                    <th className="px-3 py-2 text-left font-normal">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">
                        <AcaoBadge tipo={item.tipo} />{" "}
                        <span className="ml-1 font-medium">{item.nomeAtivo}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatBRL(item.valorAtualBRL)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                        {formatBRL(item.valorMetaBRL)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-medium whitespace-nowrap",
                          item.movimentacaoBRL > 0
                            ? "text-green-600"
                            : item.movimentacaoBRL < 0
                            ? "text-red-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.movimentacaoBRL === 0
                          ? "—"
                          : `${item.movimentacaoBRL > 0 ? "+" : ""}${formatBRL(
                              item.movimentacaoBRL
                            )}`}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.tipo}
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                          onChange={(e) =>
                            updateItem(item.id, {
                              tipo: e.target.value as ItemPlanoAcao["tipo"],
                            })
                          }
                        >
                          <option value="manter">Manter</option>
                          <option value="aportar">Aportar</option>
                          <option value="resgatar_parcial">Resgatar parcialmente</option>
                          <option value="resgatar_total">Resgatar tudo</option>
                          <option value="novo_ativo">Novo ativo</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 min-w-[140px]">
                        <Input
                          className="h-7 text-xs"
                          value={item.observacao}
                          onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                          placeholder="observação..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.prioridade}
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                          onChange={(e) =>
                            updateItem(item.id, {
                              prioridade: e.target.value as ItemPlanoAcao["prioridade"],
                            })
                          }
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {filtrados.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          {planoAcao.length === 0
            ? "Plano de ação vazio. Defina a carteira recomendada na etapa anterior."
            : "Nenhum item corresponde ao filtro selecionado."}
        </div>
      )}

      {/* Nota do consultor */}
      <div className="space-y-2">
        <Label>Notas e justificativas do plano</Label>
        <Textarea
          value={notaConsultor}
          onChange={(e) => onNotaConsultor(e.target.value)}
          placeholder="Explique os pontos principais do plano, justifique as movimentações relevantes..."
          className="min-h-[140px]"
        />
      </div>

    </div>
  );
}
