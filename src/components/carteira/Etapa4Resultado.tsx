import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AtivoItem, MacroAlocacao, PlanoAcaoItem } from "@/lib/carteira/types";
import { MACRO_CLASSES } from "@/lib/carteira/types";
import { formatBRL, formatPct, valorAtivoBRL } from "@/lib/carteira/calculos";
import { cn } from "@/lib/utils";

interface Props {
  ativosAtuais: AtivoItem[];
  ativosMeta: AtivoItem[];
  macroAtual: MacroAlocacao;
  macroMeta: MacroAlocacao;
  planoAcao: PlanoAcaoItem[];
  patrimonio: number;
  clientName: string;
  clientProfile: string | null;
  observacoes: string;
  onSave: () => void;
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

function formatBRLShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return formatBRL(n);
}

export function Etapa4Resultado({
  ativosAtuais,
  ativosMeta: _ativosMeta,
  macroAtual,
  macroMeta,
  planoAcao,
  patrimonio,
  clientName,
  clientProfile,
  observacoes,
  onSave,
}: Props) {
  const pieAtual = useMemo(
    () =>
      MACRO_CLASSES.filter((c) => macroAtual[c.key] > 0).map((c) => ({
        name: c.label,
        value: macroAtual[c.key],
        color: c.color,
      })),
    [macroAtual],
  );

  const pieMeta = useMemo(
    () =>
      MACRO_CLASSES.filter((c) => macroMeta[c.key] > 0).map((c) => ({
        name: c.label,
        value: macroMeta[c.key],
        color: c.color,
      })),
    [macroMeta],
  );

  const barData = useMemo(
    () =>
      MACRO_CLASSES.map((c) => ({
        name: c.label,
        Atual: (macroAtual[c.key] / 100) * patrimonio,
        Meta: (macroMeta[c.key] / 100) * patrimonio,
      })).filter((d) => d.Atual > 0 || d.Meta > 0),
    [macroAtual, macroMeta, patrimonio],
  );

  const { totalAportes, totalResgates, saldoLiquido } = useMemo(() => {
    const aportes = planoAcao.filter((p) => p.movimentacaoBRL > 0).reduce((s, p) => s + p.movimentacaoBRL, 0);
    const resgates = planoAcao.filter((p) => p.movimentacaoBRL < 0).reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);
    return { totalAportes: aportes, totalResgates: resgates, saldoLiquido: aportes - resgates };
  }, [planoAcao]);

  const groupedPlano = useMemo(() => {
    const map = new Map<string, PlanoAcaoItem[]>();
    for (const item of planoAcao) {
      const list = map.get(item.klass) ?? [];
      list.push(item);
      map.set(item.klass, list);
    }
    return map;
  }, [planoAcao]);

  function getAtualValorBRL(nome: string): number {
    const a = ativosAtuais.find((x) => x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    return a ? valorAtivoBRL(a) : 0;
  }

  return (
    <div className="space-y-8">
      {/* Client header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{clientName || "Cliente"}</h2>
          {clientProfile && (
            <p className="text-sm text-muted-foreground capitalize">Perfil: {clientProfile}</p>
          )}
          <p className="text-sm text-muted-foreground">Patrimônio total: {formatBRL(patrimonio)}</p>
        </div>
      </div>

      {/* Section 1: PieCharts */}
      <div>
        <h3 className="font-semibold mb-4">Composição da carteira</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Atual */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Carteira Atual</p>
            {pieAtual.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieAtual}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {pieAtual.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2">
                  {pieAtual.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}</span>
                      <span className="text-muted-foreground">{entry.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Carteira Proposta</p>
            {pieMeta.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieMeta}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {pieMeta.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2">
                  {pieMeta.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1 text-xs">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}</span>
                      <span className="text-muted-foreground">{entry.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Comparison table */}
      <div>
        <h3 className="font-semibold mb-3">Comparativo por classe</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-normal">Classe</th>
                <th className="px-3 py-2 text-right font-normal">% Atual</th>
                <th className="px-3 py-2 text-right font-normal">R$ Atual</th>
                <th className="px-3 py-2 text-right font-normal">% Meta</th>
                <th className="px-3 py-2 text-right font-normal">R$ Meta</th>
                <th className="px-3 py-2 text-right font-normal">Δ R$</th>
              </tr>
            </thead>
            <tbody>
              {MACRO_CLASSES.map((c) => {
                const pctA = macroAtual[c.key];
                const pctM = macroMeta[c.key];
                if (pctA === 0 && pctM === 0) return null;
                const rA = (pctA / 100) * patrimonio;
                const rM = (pctM / 100) * patrimonio;
                const delta = rM - rA;
                return (
                  <tr key={c.key} className="border-t border-border/40">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatPct(pctA)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatBRL(rA)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatPct(pctM)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatBRL(rM)}</td>
                    <td className={cn("px-3 py-2 text-right font-medium", delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground")}>
                      {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${formatBRL(delta)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 border-t border-border font-semibold">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">
                  {formatPct(MACRO_CLASSES.reduce((s, c) => s + macroAtual[c.key], 0))}
                </td>
                <td className="px-3 py-2 text-right">{formatBRL(patrimonio)}</td>
                <td className="px-3 py-2 text-right">
                  {formatPct(MACRO_CLASSES.reduce((s, c) => s + macroMeta[c.key], 0))}
                </td>
                <td className="px-3 py-2 text-right">{formatBRL(MACRO_CLASSES.reduce((s, c) => s + (macroMeta[c.key] / 100) * patrimonio, 0))}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section 3: BarChart */}
      {barData.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Atual vs. Proposto (R$)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatBRLShort} tick={{ fontSize: 11 }} width={64} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
              <Bar dataKey="Atual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Meta" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section 4: Detalhamento por ativo */}
      {planoAcao.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Detalhamento por ativo</h3>
          <div className="space-y-4">
            {MACRO_CLASSES.map((c) => {
              const items = groupedPlano.get(c.key);
              if (!items || items.length === 0) return null;
              const sorted = [...items].sort((a, b) => Math.abs(b.movimentacaoBRL) - Math.abs(a.movimentacaoBRL));
              return (
                <div key={c.key} className="rounded-lg border overflow-hidden">
                  <div className="bg-muted px-3 py-2 flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm font-semibold">{c.label}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground border-b border-border/60">
                        <tr>
                          <th className="px-3 py-2 text-left font-normal">Ativo</th>
                          <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Atual R$</th>
                          <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Meta R$</th>
                          <th className="px-3 py-2 text-left font-normal whitespace-nowrap">Ação</th>
                          <th className="px-3 py-2 text-right font-normal whitespace-nowrap">Δ R$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((item) => {
                          const atualVal = item.valorAtualBRL > 0 ? item.valorAtualBRL : getAtualValorBRL(item.nomeAtivo);
                          const delta = item.movimentacaoBRL;
                          return (
                            <tr key={item.ativoId} className="border-t border-border/40">
                              <td className="px-3 py-2 font-medium">{item.nomeAtivo || "—"}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">{formatBRL(atualVal)}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">{formatBRL(item.valorMetaBRL)}</td>
                              <td className="px-3 py-2"><AcaoBadge acao={item.acao} /></td>
                              <td className={cn("px-3 py-2 text-right font-medium whitespace-nowrap", delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground")}>
                                {delta === 0 ? "—" : `${delta > 0 ? "+" : "-"}${formatBRL(Math.abs(delta))}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 5: Resumo */}
      <div className="space-y-4">
        <h3 className="font-semibold">Resumo financeiro</h3>
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

        {observacoes && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações gerais</label>
            <Textarea className="min-h-[100px] text-sm" value={observacoes} readOnly />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onSave}>Salvar carteira</Button>
        <Button variant="outline" onClick={() => window.print()}>Imprimir</Button>
      </div>
    </div>
  );
}
