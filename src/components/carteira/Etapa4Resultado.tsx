import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ativo, ClasseAtivo, ItemPlanoAcao } from "@/lib/carteira/types";
import { formatBRL, formatPct } from "@/lib/carteira/calculos";

interface Props {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  planoAcao: ItemPlanoAcao[];
  patrimonio: number;
  notaConsultor: string;
  clientName: string;
  clientProfile: string | null;
  usdBrl: number;
  onGoToEtapa3: () => void;
  onSave: () => void;
}

const GRUPOS_DISPLAY = [
  {
    nome: "Renda Fixa",
    classes: ["rf_rapido", "rf_longo"] as ClasseAtivo[],
    cor: "#2563EB",
    subclasses: [
      { key: "rf_rapido" as ClasseAtivo, label: "Resgate Rápido" },
      { key: "rf_longo" as ClasseAtivo, label: "Resgate Longo" },
    ],
  },
  {
    nome: "RV Brasil",
    classes: ["rv_acoes", "rv_fiis"] as ClasseAtivo[],
    cor: "#16A34A",
    subclasses: [
      { key: "rv_acoes" as ClasseAtivo, label: "Ações" },
      { key: "rv_fiis" as ClasseAtivo, label: "FIIs" },
    ],
  },
  {
    nome: "Internacional",
    classes: ["internacional_rv", "internacional_rf"] as ClasseAtivo[],
    cor: "#D97706",
    subclasses: [
      { key: "internacional_rv" as ClasseAtivo, label: "RV Exterior" },
      { key: "internacional_rf" as ClasseAtivo, label: "RF Exterior" },
    ],
  },
  {
    nome: "Multimercados",
    classes: ["multi"] as ClasseAtivo[],
    cor: "#7C3AED",
    subclasses: [{ key: "multi" as ClasseAtivo, label: "Multimercados" }],
  },
  {
    nome: "Criptoativos",
    classes: ["cripto"] as ClasseAtivo[],
    cor: "#EA580C",
    subclasses: [{ key: "cripto" as ClasseAtivo, label: "Criptoativos" }],
  },
];

function formatBRLAbbr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return formatBRL(n);
}

export function Etapa4Resultado({
  ativosAtuais,
  ativosRecomendados,
  planoAcao,
  patrimonio,
  notaConsultor,
  clientName: _clientName,
  clientProfile: _clientProfile,
  usdBrl: _usdBrl,
  onGoToEtapa3,
  onSave,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(nome: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  }

  // Helpers
  function sumAtualBRL(classes: ClasseAtivo[]) {
    return ativosAtuais
      .filter((a) => classes.includes(a.classe))
      .reduce((s, a) => s + a.valorBRL, 0);
  }
  function sumAtualPct(classes: ClasseAtivo[]) {
    return patrimonio > 0 ? (sumAtualBRL(classes) / patrimonio) * 100 : 0;
  }
  function sumMetaPct(classes: ClasseAtivo[]) {
    return ativosRecomendados
      .filter((a) => classes.includes(a.classe))
      .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
  }
  function sumMetaBRL(classes: ClasseAtivo[]) {
    return (sumMetaPct(classes) / 100) * patrimonio;
  }

  // Pie chart data
  const pieAtualData = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => ({
        name: g.nome,
        value: sumAtualPct(g.classes),
        cor: g.cor,
      })).filter((d) => d.value > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativosAtuais, patrimonio]
  );

  const pieMetaData = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => ({
        name: g.nome,
        value: sumMetaPct(g.classes),
        cor: g.cor,
      })).filter((d) => d.value > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativosRecomendados, patrimonio]
  );

  // Bar chart data
  const barData = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => ({
        nome: g.nome,
        Atual: Math.round(sumAtualBRL(g.classes)),
        Meta: Math.round(sumMetaBRL(g.classes)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativosAtuais, ativosRecomendados, patrimonio]
  );

  // Plano resumo
  const aportes = planoAcao.filter(
    (p) => p.tipo === "aportar" || p.tipo === "novo_ativo"
  );
  const resgates = planoAcao.filter(
    (p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total"
  );
  const mantidos = planoAcao.filter((p) => p.tipo === "manter");

  const totalAportes = aportes.reduce((s, p) => s + p.movimentacaoBRL, 0);
  const totalResgates = resgates.reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);

  // Comparison table totals
  const totalAtualBRL = ativosAtuais.reduce((s, a) => s + a.valorBRL, 0);
  const totalMetaBRL = (ativosRecomendados.reduce((s, a) => s + (a.pctMeta ?? 0), 0) / 100) * patrimonio;

  return (
    <div className="space-y-8">
      {/* SECTION 1: Two pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carteira Atual */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">
            Carteira Atual — {formatBRL(patrimonio)}
          </h3>
          {pieAtualData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieAtualData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                  >
                    {pieAtualData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatPct(v), ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {pieAtualData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.cor }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name} | {formatPct(entry.value)} |{" "}
                      {formatBRL((entry.value / 100) * patrimonio)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem ativos na carteira atual.
            </p>
          )}
        </div>

        {/* Carteira Recomendada */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">
            Proposta — {formatBRL(patrimonio)}
          </h3>
          {pieMetaData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieMetaData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                  >
                    {pieMetaData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatPct(v), ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {pieMetaData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.cor }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name} | {formatPct(entry.value)} |{" "}
                      {formatBRL((entry.value / 100) * patrimonio)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem ativos na carteira recomendada.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 2: Comparison table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Comparativo por classe</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted text-muted-foreground font-normal">
              <th className="text-left px-4 py-2 font-normal">Grupo</th>
              <th className="text-right px-3 py-2 font-normal">% Atual</th>
              <th className="text-right px-3 py-2 font-normal">R$ Atual</th>
              <th className="text-right px-3 py-2 font-normal">% Meta</th>
              <th className="text-right px-3 py-2 font-normal">R$ Meta</th>
              <th className="text-right px-3 py-2 font-normal">Dif R$</th>
              <th className="text-right px-3 py-2 font-normal">Dif %</th>
            </tr>
          </thead>
          <tbody>
            {GRUPOS_DISPLAY.map((g) => {
              const atualBRL = sumAtualBRL(g.classes);
              const atualPct = sumAtualPct(g.classes);
              const metaPct = sumMetaPct(g.classes);
              const metaBRL = sumMetaBRL(g.classes);
              const difBRL = metaBRL - atualBRL;
              const difPct = metaPct - atualPct;
              const isOpen = openGroups.has(g.nome);

              return (
                <>
                  <tr
                    key={g.nome}
                    className="border-t cursor-pointer hover:bg-muted/40 font-medium"
                    onClick={() => toggleGroup(g.nome)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {isOpen ? "▼" : "▶"}
                        </span>
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: g.cor }}
                        />
                        {g.nome}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{formatPct(atualPct)}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(atualBRL)}</td>
                    <td className="px-3 py-2 text-right">{formatPct(metaPct)}</td>
                    <td className="px-3 py-2 text-right">{formatBRL(metaBRL)}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right",
                        difBRL > 0 ? "text-green-600" : difBRL < 0 ? "text-red-600" : ""
                      )}
                    >
                      {difBRL !== 0
                        ? (difBRL > 0 ? "+" : "") + formatBRL(difBRL)
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right",
                        difPct > 0 ? "text-green-600" : difPct < 0 ? "text-red-600" : ""
                      )}
                    >
                      {difPct !== 0
                        ? (difPct > 0 ? "+" : "") + formatPct(difPct)
                        : "—"}
                    </td>
                  </tr>
                  {isOpen &&
                    g.subclasses.map((sub) => {
                      const subAtualBRL = sumAtualBRL([sub.key]);
                      const subAtualPct = sumAtualPct([sub.key]);
                      const subMetaPct = sumMetaPct([sub.key]);
                      const subMetaBRL = sumMetaBRL([sub.key]);
                      const subDifBRL = subMetaBRL - subAtualBRL;
                      const subDifPct = subMetaPct - subAtualPct;
                      return (
                        <tr key={sub.key} className="border-t bg-muted/20 text-muted-foreground">
                          <td className="px-4 py-1.5 pl-10">{sub.label}</td>
                          <td className="px-3 py-1.5 text-right">{formatPct(subAtualPct)}</td>
                          <td className="px-3 py-1.5 text-right">{formatBRL(subAtualBRL)}</td>
                          <td className="px-3 py-1.5 text-right">{formatPct(subMetaPct)}</td>
                          <td className="px-3 py-1.5 text-right">{formatBRL(subMetaBRL)}</td>
                          <td
                            className={cn(
                              "px-3 py-1.5 text-right",
                              subDifBRL > 0 ? "text-green-600" : subDifBRL < 0 ? "text-red-600" : ""
                            )}
                          >
                            {subDifBRL !== 0
                              ? (subDifBRL > 0 ? "+" : "") + formatBRL(subDifBRL)
                              : "—"}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1.5 text-right",
                              subDifPct > 0 ? "text-green-600" : subDifPct < 0 ? "text-red-600" : ""
                            )}
                          >
                            {subDifPct !== 0
                              ? (subDifPct > 0 ? "+" : "") + formatPct(subDifPct)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </>
              );
            })}
            {/* Total row */}
            <tr className="border-t-2 font-bold">
              <td className="px-4 py-2">TOTAL</td>
              <td className="px-3 py-2 text-right">
                {formatPct(patrimonio > 0 ? (totalAtualBRL / patrimonio) * 100 : 0)}
              </td>
              <td className="px-3 py-2 text-right">{formatBRL(totalAtualBRL)}</td>
              <td className="px-3 py-2 text-right">
                {formatPct(
                  ativosRecomendados.reduce((s, a) => s + (a.pctMeta ?? 0), 0)
                )}
              </td>
              <td className="px-3 py-2 text-right">{formatBRL(totalMetaBRL)}</td>
              <td
                className={cn(
                  "px-3 py-2 text-right",
                  totalMetaBRL - totalAtualBRL > 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatBRL(totalMetaBRL - totalAtualBRL)}
              </td>
              <td className="px-3 py-2 text-right">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION 3: Bar chart */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">Atual vs. Proposta por grupo (R$)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatBRLAbbr} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Legend />
            <Bar dataKey="Atual" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Meta" fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION 4: Plano resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Aportes e novos */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-green-700">Aportes e novos</h3>
          <div className="space-y-1">
            {aportes.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="truncate mr-2">{item.nomeAtivo}</span>
                <span className="text-green-600 font-medium whitespace-nowrap">
                  +{formatBRL(item.movimentacaoBRL)}
                </span>
              </div>
            ))}
            {aportes.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum</p>
            )}
          </div>
          {aportes.length > 0 && (
            <div className="border-t pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Total</span>
                <span className="text-green-600">+{formatBRL(totalAportes)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Resgates */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-red-700">Resgates</h3>
          <div className="space-y-1">
            {resgates.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="truncate mr-2">{item.nomeAtivo}</span>
                <span className="text-red-600 font-medium whitespace-nowrap">
                  {formatBRL(item.movimentacaoBRL)}
                </span>
              </div>
            ))}
            {resgates.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum</p>
            )}
          </div>
          {resgates.length > 0 && (
            <div className="border-t pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Total</span>
                <span className="text-red-600">-{formatBRL(totalResgates)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mantidos */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Mantidos</h3>
          <div className="space-y-1">
            {mantidos.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="truncate mr-2">{item.nomeAtivo}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatBRL(item.valorAtualBRL)}
                </span>
              </div>
            ))}
            {mantidos.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: Nota do consultor */}
      {notaConsultor && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Notas do consultor</h3>
            <Button variant="ghost" size="sm" onClick={onGoToEtapa3}>
              Editar
            </Button>
          </div>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {notaConsultor}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={onSave}>Salvar carteira</Button>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}
