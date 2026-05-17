import { Fragment, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { Ativo, ItemPlanoAcao } from "@/lib/carteira/types";
import { calcularValorBRL, formatBRL, formatPct } from "@/lib/carteira/calculos";
import { getCard } from "@/lib/carteira/segmentos";
import type { SimplaCardId } from "@/lib/carteira/segmentos";

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

const PERFIL_LABELS_LOCAL: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Conservador Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const GRUPOS_DISPLAY = [
  { nome: "Renda Fixa", cards: ["resgate_rapido", "resgate_longo"] as SimplaCardId[], cor: "#2563EB" },
  { nome: "RV Brasil", cards: ["acoes", "fiis"] as SimplaCardId[], cor: "#16A34A" },
  { nome: "Internacional", cards: ["exterior"] as SimplaCardId[], cor: "#D97706" },
  { nome: "Criptoativos", cards: ["cripto"] as SimplaCardId[], cor: "#EA580C" },
];

function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return formatBRL(n);
}

export function Etapa4Resultado({
  ativosAtuais,
  ativosRecomendados,
  planoAcao,
  patrimonio,
  notaConsultor,
  clientName,
  clientProfile,
  usdBrl,
  onGoToEtapa3,
  onSave,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(nome: string) {
    setOpenGroups((prev) => {
      const n = new Set(prev);
      n.has(nome) ? n.delete(nome) : n.add(nome);
      return n;
    });
  }

  const grupoAtual = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => {
        const v = ativosAtuais
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
        const pct = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
        return { nome: g.nome, valor: v, pct: Math.round(pct * 10) / 10, cor: g.cor, cards: g.cards };
      }),
    [ativosAtuais, usdBrl, patrimonio]
  );

  const grupoMeta = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => {
        const v = ativosRecomendados
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + (a.valorMetaBRL ?? 0), 0);
        const pct = ativosRecomendados
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
        return { nome: g.nome, valor: v, pct: Math.round(pct * 10) / 10, cor: g.cor, cards: g.cards };
      }),
    [ativosRecomendados]
  );

  const pieAtual = grupoAtual.filter((g) => g.pct > 0);
  const pieMeta = grupoMeta.filter((g) => g.pct > 0);

  const barData = GRUPOS_DISPLAY.map((g, i) => ({
    name: g.nome.split(" ")[0] + (g.nome === "RV Brasil" ? " BR" : ""),
    Atual: grupoAtual[i].valor,
    Meta: grupoMeta[i].valor,
  })).filter((d) => d.Atual > 0 || d.Meta > 0);

  const aportes = planoAcao.filter(
    (p) => p.tipo === "aportar" || p.tipo === "novo_ativo"
  );
  const resgates = planoAcao.filter(
    (p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total"
  );
  const mantidos = planoAcao.filter((p) => p.tipo === "manter");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 mb-4">
        <h2 className="text-xl font-bold">{clientName}</h2>
        {clientProfile && (
          <p className="text-sm text-muted-foreground">
            Perfil: {PERFIL_LABELS_LOCAL[clientProfile] ?? clientProfile}
          </p>
        )}
      </div>

      {/* SECTION 1 — Two Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(
          [
            { title: "Carteira Atual", data: pieAtual, subtit: formatBRL(patrimonio) },
            { title: "Carteira Recomendada", data: pieMeta, subtit: formatBRL(patrimonio) },
          ] as const
        ).map(({ title, data, subtit }) => (
          <div key={title} className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{subtit}</p>
            {data.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="pct"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {data.map((d, i) => (
                        <Cell key={i} fill={d.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatPct(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {data.map((d) => (
                    <div key={d.nome} className="flex items-center gap-1 text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: d.cor }}
                      />
                      <span>{d.nome}</span>
                      <span className="text-muted-foreground">{formatPct(d.pct)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SECTION 2 — Comparison Table (collapsible groups + card level) */}
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted px-4 py-2">
          <h3 className="font-semibold text-sm">Comparativo por grupo</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-xs">
            <tr>
              <th className="px-4 py-2 text-left font-normal">Grupo</th>
              <th className="px-4 py-2 text-right font-normal">% Atual</th>
              <th className="px-4 py-2 text-right font-normal">R$ Atual</th>
              <th className="px-4 py-2 text-right font-normal">% Meta</th>
              <th className="px-4 py-2 text-right font-normal">R$ Meta</th>
              <th className="px-4 py-2 text-right font-normal">Dif R$</th>
              <th className="px-4 py-2 text-right font-normal">Dif %</th>
            </tr>
          </thead>
          <tbody>
            {GRUPOS_DISPLAY.map((g, i) => {
              const atual = grupoAtual[i];
              const meta = grupoMeta[i];
              const difR = meta.valor - atual.valor;
              const difP = meta.pct - atual.pct;
              const isOpen = openGroups.has(g.nome);
              return (
                <Fragment key={g.nome}>
                  <tr
                    className="border-t font-semibold cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleGroup(g.nome)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: g.cor }}
                        />
                        {g.nome}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatPct(atual.pct)}</td>
                    <td className="px-4 py-2.5 text-right">{formatBRL(atual.valor)}</td>
                    <td className="px-4 py-2.5 text-right">{formatPct(meta.pct)}</td>
                    <td className="px-4 py-2.5 text-right">{formatBRL(meta.valor)}</td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right",
                        difR > 0
                          ? "text-green-600"
                          : difR < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {difR === 0 ? "—" : `${difR > 0 ? "+" : ""}${formatBRL(difR)}`}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right",
                        difP > 0
                          ? "text-green-600"
                          : difP < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {difP === 0 ? "—" : `${difP > 0 ? "+" : ""}${formatPct(difP)}`}
                    </td>
                  </tr>
                  {isOpen &&
                    g.cards.map((cardId) => {
                      const card = getCard(cardId);
                      const aV = ativosAtuais
                        .filter((a) => a.card === cardId)
                        .reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
                      const mV = ativosRecomendados
                        .filter((a) => a.card === cardId)
                        .reduce((s, a) => s + (a.valorMetaBRL ?? 0), 0);
                      const aP = patrimonio > 0 ? (aV / patrimonio) * 100 : 0;
                      const mP = ativosRecomendados
                        .filter((a) => a.card === cardId)
                        .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
                      const dR = mV - aV;
                      const dP = mP - aP;
                      return (
                        <tr
                          key={cardId}
                          className="border-t bg-muted/20 text-xs text-muted-foreground"
                        >
                          <td className="px-4 py-2 pl-10">{card.label}</td>
                          <td className="px-4 py-2 text-right">{formatPct(aP)}</td>
                          <td className="px-4 py-2 text-right">{formatBRL(aV)}</td>
                          <td className="px-4 py-2 text-right">{formatPct(mP)}</td>
                          <td className="px-4 py-2 text-right">{formatBRL(mV)}</td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right",
                              dR > 0 ? "text-green-600" : dR < 0 ? "text-red-600" : ""
                            )}
                          >
                            {dR === 0 ? "—" : `${dR > 0 ? "+" : ""}${formatBRL(dR)}`}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right",
                              dP > 0 ? "text-green-600" : dP < 0 ? "text-red-600" : ""
                            )}
                          >
                            {dP === 0 ? "—" : `${dP > 0 ? "+" : ""}${formatPct(dP)}`}
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 font-bold">
            <tr>
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right">
                {formatPct(grupoAtual.reduce((s, g) => s + g.pct, 0))}
              </td>
              <td className="px-4 py-2.5 text-right">{formatBRL(patrimonio)}</td>
              <td className="px-4 py-2.5 text-right">
                {formatPct(grupoMeta.reduce((s, g) => s + g.pct, 0))}
              </td>
              <td className="px-4 py-2.5 text-right">
                {formatBRL(grupoMeta.reduce((s, g) => s + g.valor, 0))}
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* SECTION 3 — Bar Chart */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">Atual vs. Proposta por grupo (R$)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={56} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Legend />
            <Bar dataKey="Atual" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Meta" fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION 4 — Plan Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-semibold text-sm text-green-700">Aportes e novos</h4>
          {aportes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum</p>
          ) : (
            <>
              {aportes.map((item) => {
                const card = getCard(item.card);
                return (
                  <div key={item.id} className="flex justify-between text-xs gap-2">
                    <div className="truncate flex items-center gap-1 min-w-0">
                      <span
                        className="inline-flex shrink-0 items-center text-xs rounded-full px-1.5 py-0.5 font-medium"
                        style={{ backgroundColor: card.cor + "18", color: card.cor }}
                      >
                        {card.label}
                      </span>
                      <span className="truncate">{item.nomeAtivo}</span>
                    </div>
                    <span className="text-green-600 font-medium shrink-0">
                      +{formatBRL(item.movimentacaoBRL)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-1 flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span className="text-green-600">
                  {formatBRL(aportes.reduce((s, p) => s + p.movimentacaoBRL, 0))}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-semibold text-sm text-red-700">Resgates</h4>
          {resgates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum</p>
          ) : (
            <>
              {resgates.map((item) => {
                const card = getCard(item.card);
                return (
                  <div key={item.id} className="flex justify-between text-xs gap-2">
                    <div className="truncate flex items-center gap-1 min-w-0">
                      <span
                        className="inline-flex shrink-0 items-center text-xs rounded-full px-1.5 py-0.5 font-medium"
                        style={{ backgroundColor: card.cor + "18", color: card.cor }}
                      >
                        {card.label}
                      </span>
                      <span className="truncate">{item.nomeAtivo}</span>
                    </div>
                    <span className="text-red-600 font-medium shrink-0">
                      {formatBRL(item.movimentacaoBRL)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-1 flex justify-between text-xs font-semibold">
                <span>Total</span>
                <span className="text-red-600">
                  {formatBRL(resgates.reduce((s, p) => s + p.movimentacaoBRL, 0))}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">Mantidos</h4>
          {mantidos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum</p>
          ) : (
            mantidos.map((item) => {
              const card = getCard(item.card);
              return (
                <div key={item.id} className="flex justify-between text-xs gap-2">
                  <div className="truncate flex items-center gap-1 min-w-0">
                    <span
                      className="inline-flex shrink-0 items-center text-xs rounded-full px-1.5 py-0.5 font-medium"
                      style={{ backgroundColor: card.cor + "18", color: card.cor }}
                    >
                      {card.label}
                    </span>
                    <span className="truncate">{item.nomeAtivo}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {formatBRL(item.valorAtualBRL)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 5 — Nota */}
      {notaConsultor && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Notas do consultor</h3>
            <Button variant="ghost" size="sm" onClick={onGoToEtapa3}>
              Editar
            </Button>
          </div>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{notaConsultor}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={onSave}>Salvar carteira</Button>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}
