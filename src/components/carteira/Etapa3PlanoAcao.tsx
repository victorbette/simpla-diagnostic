import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type FiltroTipo = "todos" | "aportar" | "resgatar" | "manter" | "novo_ativo";

function AcaoBadge({ tipo }: { tipo: ItemPlanoAcao["tipo"] }) {
  const map: Record<ItemPlanoAcao["tipo"], { bg: string; text: string; label: string }> = {
    manter: { bg: "bg-gray-100", text: "text-gray-700", label: "Manter" },
    aportar: { bg: "bg-blue-100", text: "text-blue-800", label: "Aportar" },
    resgatar_parcial: { bg: "bg-amber-100", text: "text-amber-800", label: "Resgatar parcial" },
    resgatar_total: { bg: "bg-red-100", text: "text-red-800", label: "Resgatar tudo" },
    novo_ativo: { bg: "bg-purple-100", text: "text-purple-800", label: "Novo ativo" },
  };
  const entry = map[tipo];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        entry.bg,
        entry.text
      )}
    >
      {entry.label}
    </span>
  );
}

export function Etapa3PlanoAcao({
  planoAcao,
  onPlanoAcao,
  patrimonio: _patrimonio,
  notaConsultor,
  onNotaConsultor,
}: Props) {
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const totalAportes = planoAcao
      .filter((p) => p.movimentacaoBRL > 0)
      .reduce((s, p) => s + p.movimentacaoBRL, 0);
    const totalResgates = planoAcao
      .filter((p) => p.movimentacaoBRL < 0)
      .reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);
    const saldoLiquido = totalAportes - totalResgates;
    const nMovs = planoAcao.filter((p) => p.tipo !== "manter").length;
    return { totalAportes, totalResgates, saldoLiquido, nMovs };
  }, [planoAcao]);

  function updateItem(id: string, patch: Partial<ItemPlanoAcao>) {
    onPlanoAcao(planoAcao.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function matchesFiltro(item: ItemPlanoAcao): boolean {
    if (filtro === "todos") return true;
    if (filtro === "resgatar") {
      return item.tipo === "resgatar_parcial" || item.tipo === "resgatar_total";
    }
    return item.tipo === filtro;
  }

  const filtrado = planoAcao.filter(matchesFiltro);

  const filtroButtons: { key: FiltroTipo; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "aportar", label: "Aportar" },
    { key: "resgatar", label: "Resgatar" },
    { key: "manter", label: "Manter" },
    { key: "novo_ativo", label: "Novo ativo" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total aportes</p>
          <p className="text-lg font-bold text-green-600">{formatBRL(totalAportes)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total resgates</p>
          <p className="text-lg font-bold text-red-600">{formatBRL(totalResgates)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo líquido</p>
          <p
            className={cn(
              "text-lg font-bold",
              saldoLiquido >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {saldoLiquido >= 0 ? "+" : ""}
            {formatBRL(saldoLiquido)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Movimentações</p>
          <p className="text-lg font-bold">{nMovs}</p>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {filtroButtons.map((btn) => (
          <Button
            key={btn.key}
            size="sm"
            variant={filtro === btn.key ? "default" : "outline"}
            onClick={() => setFiltro(btn.key)}
            className={cn(filtro === btn.key && "bg-primary text-primary-foreground")}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Grouped table */}
      {filtrado.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma movimentação encontrada para o filtro selecionado.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {CLASSES.map((classeInfo) => {
            const items = filtrado.filter((item) => item.classe === classeInfo.key);
            if (items.length === 0) return null;

            const groupTotal = items.reduce((s, item) => s + item.movimentacaoBRL, 0);

            return (
              <div key={classeInfo.key}>
                {/* Group header */}
                <div className="bg-muted px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: classeInfo.cor }}
                    />
                    <span className="font-semibold text-sm">
                      {classeInfo.grupo} — {classeInfo.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      groupTotal > 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {groupTotal !== 0
                      ? (groupTotal > 0 ? "+" : "") + formatBRL(groupTotal)
                      : "—"}
                  </span>
                </div>

                {/* Items */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground font-normal border-b">
                      <th className="text-left px-4 py-1.5 font-normal">Ativo</th>
                      <th className="text-right px-2 py-1.5 font-normal">Atual</th>
                      <th className="text-right px-2 py-1.5 font-normal">Meta</th>
                      <th className="text-right px-2 py-1.5 font-normal">Movimentação</th>
                      <th className="px-2 py-1.5 font-normal">Ação</th>
                      <th className="px-2 py-1.5 font-normal">Observação</th>
                      <th className="px-2 py-1.5 font-normal">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <AcaoBadge tipo={item.tipo} />
                            <span className="font-medium">{item.nomeAtivo}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {formatBRL(item.valorAtualBRL)}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">
                          {formatBRL(item.valorMetaBRL)}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-bold",
                            item.movimentacaoBRL > 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {item.movimentacaoBRL > 0 ? "+" : ""}
                          {formatBRL(item.movimentacaoBRL)}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={item.tipo}
                            onChange={(e) =>
                              updateItem(item.id, {
                                tipo: e.target.value as ItemPlanoAcao["tipo"],
                              })
                            }
                            className="text-xs border rounded px-1 py-0.5 bg-background"
                          >
                            <option value="manter">Manter</option>
                            <option value="aportar">Aportar</option>
                            <option value="resgatar_parcial">Resgatar parcial</option>
                            <option value="resgatar_total">Resgatar tudo</option>
                            <option value="novo_ativo">Novo ativo</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={item.observacao}
                            onChange={(e) =>
                              updateItem(item.id, { observacao: e.target.value })
                            }
                            className="h-7 text-xs"
                            placeholder="observação..."
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={item.prioridade}
                            onChange={(e) =>
                              updateItem(item.id, {
                                prioridade: e.target.value as ItemPlanoAcao["prioridade"],
                              })
                            }
                            className="text-xs border rounded px-1 py-0.5 bg-background"
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
            );
          })}
        </div>
      )}

      {/* Nota do consultor */}
      <div className="space-y-2 mt-6">
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
