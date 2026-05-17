import { Fragment, useMemo } from "react";
import { Trash2, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import type { Ativo, ClasseAtivo } from "@/lib/carteira/types";
import { CLASSES, GRUPO_CORES } from "@/lib/carteira/types";
import {
  ativosIniciais,
  alocacaoPadraoPorPerfil,
  genId,
  formatBRL,
  formatPct,
} from "@/lib/carteira/calculos";

interface Props {
  ativosRec: Ativo[];
  onAtivosRec: (a: Ativo[]) => void;
  ativosAtuais: Ativo[];
  patrimonio: number;
  clientProfile: string | null;
}

const PERFIL_LABELS_LOCAL: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Conservador Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

// Groups definition for display
const GRUPOS_REC = [
  { nome: "Renda Fixa", classes: ["rf_rapido", "rf_longo"] as ClasseAtivo[] },
  { nome: "Renda Variável Brasil", classes: ["rv_acoes", "rv_fiis"] as ClasseAtivo[] },
  { nome: "Internacional", classes: ["internacional_rv", "internacional_rf"] as ClasseAtivo[] },
  { nome: "Multimercados", classes: ["multi"] as ClasseAtivo[] },
  { nome: "Criptoativos", classes: ["cripto"] as ClasseAtivo[] },
];

export function Etapa2CarteiraRecomendada({
  ativosRec,
  onAtivosRec,
  ativosAtuais,
  patrimonio,
  clientProfile,
}: Props) {
  // suppress unused import warning
  void alocacaoPadraoPorPerfil;

  const totalPct = ativosRec.reduce((s, a) => s + (a.pctMeta ?? 0), 0);
  const isExact = Math.abs(totalPct - 100) < 0.05;

  function addRec(classe: ClasseAtivo) {
    onAtivosRec([
      ...ativosRec,
      { id: genId(), classe, nome: "", valorBRL: 0, pctCarteira: 0, pctMeta: 0, valorMetaBRL: 0 },
    ]);
  }

  function updateRec(id: string, patch: Partial<Ativo>) {
    onAtivosRec(
      ativosRec.map((a) => {
        if (a.id !== id) return a;
        const merged = { ...a, ...patch };
        if (patch.pctMeta !== undefined) {
          merged.valorMetaBRL = (patch.pctMeta / 100) * patrimonio;
        }
        return merged;
      })
    );
  }

  function removeRec(id: string) {
    onAtivosRec(ativosRec.filter((a) => a.id !== id));
  }

  // Sidebar comparison data
  const comparativo = useMemo(
    () =>
      GRUPOS_REC.map((g) => {
        const atual = ativosAtuais
          .filter((a) => g.classes.includes(a.classe))
          .reduce((s, a) => s + a.pctCarteira, 0);
        const meta = ativosRec
          .filter((a) => g.classes.includes(a.classe))
          .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
        return { nome: g.nome, atual, meta, dif: meta - atual };
      }),
    [ativosAtuais, ativosRec]
  );

  // Pie data for META
  const pieData = useMemo(
    () =>
      GRUPOS_REC.map((g) => ({
        name: g.nome,
        value: ativosRec
          .filter((a) => g.classes.includes(a.classe))
          .reduce((s, a) => s + (a.pctMeta ?? 0), 0),
        cor: GRUPO_CORES[g.nome as keyof typeof GRUPO_CORES] ?? "#94a3b8",
      })).filter((d) => d.value > 0),
    [ativosRec]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* LEFT SIDE */}
      <div className="space-y-4">
        {/* Info banner */}
        {clientProfile && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900">
              <span className="font-medium">
                Carteira pré-carregada com perfil{" "}
                {PERFIL_LABELS_LOCAL[clientProfile] ?? clientProfile}.
              </span>{" "}
              Ajuste os percentuais e ativos conforme necessário.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              clientProfile && onAtivosRec(ativosIniciais(clientProfile, patrimonio))
            }
          >
            Usar alocação padrão do perfil
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onAtivosRec(
                ativosAtuais.map((a) => ({ ...a, id: genId(), pctMeta: 0, valorMetaBRL: 0 }))
              )
            }
          >
            Copiar estrutura da carteira atual
          </Button>
        </div>

        {/* Progress card */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total alocado</span>
            {isExact ? (
              <Badge className="bg-green-100 text-green-800">100% alocado</Badge>
            ) : (
              <span className="text-sm font-semibold text-amber-600">{formatPct(totalPct)}</span>
            )}
          </div>
          <Progress
            value={Math.min(totalPct, 100)}
            className={cn("h-2", isExact ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500")}
          />
          {!isExact && (
            <p className="text-xs text-amber-600">Ajuste para fechar em 100%</p>
          )}
        </div>

        {/* Sections by group */}
        {GRUPOS_REC.map((grupo) => {
          const grupoTotalPct = ativosRec
            .filter((a) => grupo.classes.includes(a.classe))
            .reduce((s, a) => s + (a.pctMeta ?? 0), 0);

          return (
            <div key={grupo.nome} className="rounded-lg border overflow-hidden">
              <div className="bg-muted px-4 py-2 flex items-center justify-between">
                <span className="font-semibold text-sm">{grupo.nome}</span>
                <span className="text-xs text-muted-foreground">{formatPct(grupoTotalPct)}</span>
              </div>

              {grupo.classes.map((classe) => {
                const classeInfo = CLASSES.find((c) => c.key === classe)!;
                const classeAtivos = ativosRec.filter((a) => a.classe === classe);

                return (
                  <div key={classe} className="border-t first:border-t-0">
                    <p className="text-xs text-muted-foreground px-4 pt-2 pb-1 font-medium">
                      {classeInfo.label}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="px-3 py-1.5 text-left font-normal">Nome</th>
                            <th className="px-3 py-1.5 text-left font-normal">Segmento</th>
                            <th className="px-3 py-1.5 text-right font-normal">% Meta</th>
                            <th className="px-3 py-1.5 text-right font-normal">R$ Meta</th>
                            <th className="px-3 py-1.5 text-right font-normal">% Atual</th>
                            <th className="px-3 py-1.5 text-right font-normal">Dif R$</th>
                            <th className="px-3 py-1.5 text-left font-normal">Ação</th>
                            <th className="px-3 py-1.5 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {classeAtivos.map((a) => {
                            const match = ativosAtuais.find(
                              (x) =>
                                x.nome.toLowerCase().trim() === a.nome.toLowerCase().trim()
                            );
                            const pctAtual = match?.pctCarteira ?? 0;
                            const dif =
                              ((a.pctMeta ?? 0) / 100) * patrimonio -
                              (match?.valorBRL ?? 0);

                            let acaoLabel = "Manter";
                            let acaoCls = "bg-gray-100 text-gray-700";
                            if (dif > 100) {
                              acaoLabel = "Aportar";
                              acaoCls = "bg-blue-100 text-blue-800";
                            } else if (dif < -100) {
                              acaoLabel = "Resgatar";
                              acaoCls = "bg-red-100 text-red-800";
                            } else if ((a.pctMeta ?? 0) > 0 && !match) {
                              acaoLabel = "Novo";
                              acaoCls = "bg-purple-100 text-purple-800";
                            }

                            return (
                              <tr key={a.id} className="border-t">
                                <td className="px-3 py-1.5">
                                  <Input
                                    className="h-7 text-xs"
                                    value={a.nome}
                                    onChange={(e) =>
                                      updateRec(a.id, { nome: e.target.value })
                                    }
                                    placeholder="nome..."
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Input
                                    className="h-7 text-xs"
                                    value={a.segmento ?? ""}
                                    onChange={(e) =>
                                      updateRec(a.id, { segmento: e.target.value })
                                    }
                                    placeholder="segmento..."
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="100"
                                    className="w-20 h-7 text-xs text-right"
                                    value={a.pctMeta ?? 0}
                                    onChange={(e) =>
                                      updateRec(a.id, {
                                        pctMeta: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-3 py-1.5 text-right text-muted-foreground text-xs whitespace-nowrap">
                                  {formatBRL(a.valorMetaBRL ?? 0)}
                                </td>
                                <td className="px-3 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                                  {formatPct(pctAtual)}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-1.5 text-right font-medium whitespace-nowrap",
                                    dif > 100
                                      ? "text-green-600"
                                      : dif < -100
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {Math.abs(dif) <= 100
                                    ? "—"
                                    : `${dif > 0 ? "+" : ""}${formatBRL(dif)}`}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={cn(
                                      "text-xs rounded px-1.5 py-0.5",
                                      acaoCls
                                    )}
                                  >
                                    {acaoLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5">
                                  <button
                                    onClick={() => removeRec(a.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 ml-3 mb-2 h-7 text-xs"
                      onClick={() => addRec(classe)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> {classeInfo.label}
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* RIGHT SIDE */}
      <div className="sticky top-20 space-y-4">
        {/* Compact progress */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Alocação proposta</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total</span>
            {isExact ? (
              <Badge className="bg-green-100 text-green-800 text-xs">100%</Badge>
            ) : (
              <span className="text-xs font-semibold text-amber-600">{formatPct(totalPct)}</span>
            )}
          </div>
          <Progress
            value={Math.min(totalPct, 100)}
            className={cn("h-1.5", isExact ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500")}
          />

          {/* Comparison table */}
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="pb-1 text-left font-normal">Grupo</th>
                <th className="pb-1 text-right font-normal">Atual</th>
                <th className="pb-1 text-right font-normal">Meta</th>
                <th className="pb-1 text-right font-normal">Dif</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((row) => (
                <tr key={row.nome} className="border-t">
                  <td className="py-1 truncate max-w-[80px]">{row.nome.split(" ")[0]}</td>
                  <td className="py-1 text-right text-muted-foreground">
                    {formatPct(row.atual)}
                  </td>
                  <td className="py-1 text-right">{formatPct(row.meta)}</td>
                  <td
                    className={cn(
                      "py-1 text-right font-medium",
                      row.dif > 0.5
                        ? "text-green-600"
                        : row.dif < -0.5
                        ? "text-red-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {Math.abs(row.dif) < 0.5
                      ? "—"
                      : `${row.dif > 0 ? "+" : ""}${formatPct(row.dif)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPct(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {pieData.map((d) => (
                  <Fragment key={d.name}>
                    <div className="flex items-center gap-1 text-xs">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: d.cor }}
                      />
                      <span className="text-muted-foreground">
                        {d.name.split(" ")[0]} {formatPct(d.value)}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
