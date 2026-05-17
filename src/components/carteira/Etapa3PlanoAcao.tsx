import { useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlanoAcaoItem, MacroClassKey } from "@/lib/carteira/types";
import { MACRO_CLASSES } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { cn } from "@/lib/utils";

interface Props {
  planoAcao: PlanoAcaoItem[];
  onPlanoAcao: (p: PlanoAcaoItem[]) => void;
  patrimonio: number;
  observacoes: string;
  onObservacoes: (s: string) => void;
}

type AcaoType = PlanoAcaoItem["acao"];

function AcaoBadge({ acao }: { acao: AcaoType }) {
  switch (acao) {
    case "manter":
      return <span className="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-700">Manter</span>;
    case "aportar":
      return <span className="text-xs rounded px-1.5 py-0.5 bg-blue-100 text-blue-800">Aportar</span>;
    case "resgatar_parcial":
      return <span className="text-xs rounded px-1.5 py-0.5 bg-amber-100 text-amber-800">Resgate parcial</span>;
    case "resgatar_total":
      return <span className="text-xs rounded px-1.5 py-0.5 bg-red-100 text-red-800">Resgatar tudo</span>;
    case "novo":
      return <span className="text-xs rounded px-1.5 py-0.5 bg-purple-100 text-purple-800">Novo</span>;
    default:
      return null;
  }
}

export function Etapa3PlanoAcao({
  planoAcao,
  onPlanoAcao,
  patrimonio: _patrimonio,
  observacoes,
  onObservacoes,
}: Props) {
  const updateItem = useCallback(
    (id: string, patch: Partial<PlanoAcaoItem>) => {
      onPlanoAcao(planoAcao.map((p) => (p.ativoId === id ? { ...p, ...patch } : p)));
    },
    [planoAcao, onPlanoAcao],
  );

  const { totalAportes, totalResgates, saldoLiquido } = useMemo(() => {
    const aportes = planoAcao.filter((p) => p.movimentacaoBRL > 0).reduce((s, p) => s + p.movimentacaoBRL, 0);
    const resgates = planoAcao.filter((p) => p.movimentacaoBRL < 0).reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);
    return { totalAportes: aportes, totalResgates: resgates, saldoLiquido: aportes - resgates };
  }, [planoAcao]);

  const grouped = useMemo(() => {
    const map = new Map<MacroClassKey, PlanoAcaoItem[]>();
    for (const item of planoAcao) {
      const list = map.get(item.klass) ?? [];
      list.push(item);
      map.set(item.klass, list);
    }
    return map;
  }, [planoAcao]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total aportes</p>
          <p className="text-lg font-semibold text-green-600">{formatBRL(totalAportes)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total resgates</p>
          <p className="text-lg font-semibold text-red-600">{formatBRL(totalResgates)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo líquido</p>
          <p className={cn("text-lg font-semibold", saldoLiquido >= 0 ? "text-green-600" : "text-red-600")}>
            {formatBRL(saldoLiquido)}
          </p>
        </div>
      </div>

      {/* Grouped tables by class */}
      {MACRO_CLASSES.map((c) => {
        const items = grouped.get(c.key);
        if (!items || items.length === 0) return null;
        const groupTotal = items.reduce((s, p) => s + p.movimentacaoBRL, 0);
        return (
          <div key={c.key} className="rounded-lg border overflow-hidden">
            <div className="bg-muted px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-sm font-semibold">{c.label}</span>
              </div>
              <span className={cn("text-sm font-medium", groupTotal > 0 ? "text-green-600" : groupTotal < 0 ? "text-red-600" : "text-muted-foreground")}>
                {groupTotal === 0 ? "—" : `${groupTotal > 0 ? "+" : ""}${formatBRL(groupTotal)}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-normal whitespace-nowrap">Ativo</th>
                    <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Situação Atual R$</th>
                    <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Meta R$</th>
                    <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Movimentação R$</th>
                    <th className="px-3 py-2 text-left font-normal whitespace-nowrap">Ação</th>
                    <th className="px-3 py-2 text-left font-normal whitespace-nowrap">Badge</th>
                    <th className="px-3 py-2 text-left font-normal whitespace-nowrap">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.ativoId} className="border-t border-border/40">
                      <td className="px-3 py-2 font-medium">{item.nomeAtivo || "—"}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">{formatBRL(item.valorAtualBRL)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">{formatBRL(item.valorMetaBRL)}</td>
                      <td className={cn("px-3 py-2 text-right whitespace-nowrap font-medium", item.movimentacaoBRL > 0 ? "text-green-600" : item.movimentacaoBRL < 0 ? "text-red-600" : "text-muted-foreground")}>
                        {item.movimentacaoBRL === 0
                          ? "—"
                          : `${item.movimentacaoBRL > 0 ? "+" : "-"}${formatBRL(Math.abs(item.movimentacaoBRL))}`}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.acao}
                          onChange={(e) => updateItem(item.ativoId, { acao: e.target.value as AcaoType })}
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                        >
                          <option value="manter">Manter</option>
                          <option value="aportar">Aportar</option>
                          <option value="resgatar_parcial">Resgatar parcialmente</option>
                          <option value="resgatar_total">Resgatar tudo</option>
                          <option value="novo">Novo</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <AcaoBadge acao={item.acao} />
                      </td>
                      <td className="px-3 py-2 min-w-[160px]">
                        <Input
                          className="h-7 text-xs"
                          value={item.observacao}
                          onChange={(e) => updateItem(item.ativoId, { observacao: e.target.value })}
                          placeholder="obs..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {planoAcao.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Nenhum item no plano de ação. Defina a alocação ideal na etapa anterior.
        </div>
      )}

      {/* Observações gerais */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Observações gerais</label>
        <Textarea
          className="min-h-[100px] text-sm"
          value={observacoes}
          onChange={(e) => onObservacoes(e.target.value)}
          placeholder="Anotações livres sobre o plano de ação, prioridades, prazos..."
        />
      </div>
    </div>
  );
}
