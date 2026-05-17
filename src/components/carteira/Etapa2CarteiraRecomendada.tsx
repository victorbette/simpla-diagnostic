import { useMemo } from "react";
import { Info, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Ativo, ClasseAtivo } from "@/lib/carteira/types";
import { GRUPO_CORES } from "@/lib/carteira/types";
import {
  atualizarPcts,
  ativosIniciais,
  formatBRL,
  formatPct,
  genId,
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

const GRUPOS_DISPLAY = [
  {
    label: "Renda Fixa",
    classes: ["rf_rapido", "rf_longo"] as ClasseAtivo[],
    subclasses: [
      { key: "rf_rapido" as ClasseAtivo, label: "Resgate Rápido" },
      { key: "rf_longo" as ClasseAtivo, label: "Resgate Longo" },
    ],
  },
  {
    label: "Renda Variável Brasil",
    classes: ["rv_acoes", "rv_fiis"] as ClasseAtivo[],
    subclasses: [
      { key: "rv_acoes" as ClasseAtivo, label: "Ações" },
      { key: "rv_fiis" as ClasseAtivo, label: "FIIs" },
    ],
  },
  {
    label: "Internacional",
    classes: ["internacional_rv", "internacional_rf"] as ClasseAtivo[],
    subclasses: [
      { key: "internacional_rv" as ClasseAtivo, label: "RV Exterior" },
      { key: "internacional_rf" as ClasseAtivo, label: "RF Exterior" },
    ],
  },
  {
    label: "Multimercados",
    classes: ["multi"] as ClasseAtivo[],
    subclasses: [{ key: "multi" as ClasseAtivo, label: "Multimercados" }],
  },
  {
    label: "Criptoativos",
    classes: ["cripto"] as ClasseAtivo[],
    subclasses: [{ key: "cripto" as ClasseAtivo, label: "Criptoativos" }],
  },
];

const SUBSECTION_INFO: Record<
  ClasseAtivo,
  { sectionLabel: string; addLabel: string; parentGroup: string }
> = {
  rf_rapido: { sectionLabel: "Resgate Rápido", addLabel: "+ Resgate Rápido", parentGroup: "Renda Fixa" },
  rf_longo: { sectionLabel: "Resgate Longo", addLabel: "+ Resgate Longo", parentGroup: "Renda Fixa" },
  rv_acoes: { sectionLabel: "Ações", addLabel: "+ Ação", parentGroup: "Renda Variável Brasil" },
  rv_fiis: { sectionLabel: "FIIs", addLabel: "+ FII", parentGroup: "Renda Variável Brasil" },
  internacional_rv: { sectionLabel: "RV Exterior", addLabel: "+ RV Exterior", parentGroup: "Internacional" },
  internacional_rf: { sectionLabel: "RF Exterior", addLabel: "+ RF Exterior", parentGroup: "Internacional" },
  multi: { sectionLabel: "Multimercados", addLabel: "+ Multimercado", parentGroup: "Multimercados" },
  cripto: { sectionLabel: "Criptoativos", addLabel: "+ Cripto", parentGroup: "Criptoativos" },
};

export function Etapa2CarteiraRecomendada({
  ativosRec,
  onAtivosRec,
  ativosAtuais,
  patrimonio,
  clientProfile,
}: Props) {
  const profileLabel = clientProfile
    ? (PERFIL_LABELS_LOCAL[clientProfile] ?? clientProfile)
    : "não definido";

  const totalPct = useMemo(
    () => ativosRec.reduce((s, a) => s + (a.pctMeta ?? 0), 0),
    [ativosRec]
  );
  const totalRounded = Math.round(totalPct * 10) / 10;
  const isExact = Math.abs(totalRounded - 100) < 0.05;

  function addRec(classe: ClasseAtivo) {
    const newAtivo: Ativo = {
      id: genId(),
      classe,
      nome: "",
      valorBRL: 0,
      pctCarteira: 0,
      pctMeta: 0,
      valorMetaBRL: 0,
    };
    onAtivosRec(atualizarPcts([...ativosRec, newAtivo], 5));
  }

  function updateRec(id: string, patch: Partial<Ativo>) {
    const updated = ativosRec.map((a) => {
      if (a.id !== id) return a;
      const merged = { ...a, ...patch };
      if (patch.pctMeta !== undefined) {
        merged.valorMetaBRL = (patch.pctMeta / 100) * patrimonio;
      }
      return merged;
    });
    onAtivosRec(atualizarPcts(updated, 5));
  }

  function removeRec(id: string) {
    onAtivosRec(atualizarPcts(ativosRec.filter((a) => a.id !== id), 5));
  }

  function handleUsarPadrao() {
    if (clientProfile) {
      onAtivosRec(ativosIniciais(clientProfile, patrimonio));
    }
  }

  function handleCopiarEstrutura() {
    const copied: Ativo[] = ativosAtuais.map((a) => ({
      ...a,
      id: genId(),
      pctMeta: 0,
      valorMetaBRL: 0,
    }));
    onAtivosRec(atualizarPcts(copied, 5));
  }

  // For comparison table and pie chart
  function pctAtual(classes: ClasseAtivo[]) {
    const total = ativosAtuais.reduce((s, a) => s + a.valorBRL, 0);
    if (total <= 0) return 0;
    return (
      (ativosAtuais
        .filter((a) => classes.includes(a.classe))
        .reduce((s, a) => s + a.valorBRL, 0) /
        total) *
      100
    );
  }

  function pctMeta(classes: ClasseAtivo[]) {
    return ativosRec
      .filter((a) => classes.includes(a.classe))
      .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
  }

  // Pie chart data
  const pieData = useMemo(() => {
    return GRUPOS_DISPLAY.map((g) => ({
      name: g.label,
      value: pctMeta(g.classes),
      cor: GRUPO_CORES[g.label as keyof typeof GRUPO_CORES] ?? "#94a3b8",
    })).filter((d) => d.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativosRec]);

  // Helper to get action badge for a rec ativo
  function getAcaoBadge(a: Ativo) {
    const atual = ativosAtuais.find(
      (x) => x.nome.trim().toLowerCase() === a.nome.trim().toLowerCase()
    );
    const valorAtualBRL = atual ? atual.valorBRL : 0;
    const valorMetaBRL = (a.pctMeta ?? 0) / 100 * patrimonio;
    const dif = valorMetaBRL - valorAtualBRL;

    if (!atual && (a.pctMeta ?? 0) > 0) {
      return <Badge className="bg-purple-100 text-purple-800 text-xs">Novo</Badge>;
    }
    if (dif > 100) {
      return <Badge className="bg-blue-100 text-blue-800 text-xs">Aportar</Badge>;
    }
    if (dif < -100) {
      return <Badge className="bg-red-100 text-red-800 text-xs">Resgatar</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 text-xs">Manter</Badge>;
  }

  function getDifBRL(a: Ativo) {
    const atual = ativosAtuais.find(
      (x) => x.nome.trim().toLowerCase() === a.nome.trim().toLowerCase()
    );
    const valorAtualBRL = atual ? atual.valorBRL : 0;
    const valorMetaBRL = (a.pctMeta ?? 0) / 100 * patrimonio;
    return valorMetaBRL - valorAtualBRL;
  }

  function getPctAtualForAtivo(a: Ativo) {
    const atual = ativosAtuais.find(
      (x) => x.nome.trim().toLowerCase() === a.nome.trim().toLowerCase()
    );
    return atual ? atual.pctCarteira : 0;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* LEFT SIDE */}
      <div className="space-y-4">
        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900">
            <span className="font-medium">
              Carteira pré-carregada com perfil {profileLabel}.
            </span>{" "}
            Ajuste os percentuais e ativos conforme necessário.
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleUsarPadrao} disabled={!clientProfile}>
            Usar alocação padrão do perfil
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopiarEstrutura}>
            Copiar estrutura da carteira atual
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Total alocado: {totalRounded.toFixed(1).replace(".", ",")}%
            </span>
            {isExact ? (
              <Badge className="bg-green-100 text-green-800">100% alocado</Badge>
            ) : (
              <p className="text-xs text-amber-600">Ajuste para fechar em 100%</p>
            )}
          </div>
          <Progress
            value={Math.min(totalRounded, 100)}
            className={cn(isExact ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500")}
          />
        </div>

        {/* Sections grouped by asset class */}
        {GRUPOS_DISPLAY.map((grupo) => {
          const grupoAtivos = ativosRec.filter((a) => grupo.classes.includes(a.classe));
          const grupoMetaPct = pctMeta(grupo.classes);
          const grupoMetaBRL = (grupoMetaPct / 100) * patrimonio;

          return (
            <div key={grupo.label} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm">{grupo.label}</span>
                <div className="flex items-center gap-2 text-sm">
                  <span>{formatBRL(grupoMetaBRL)}</span>
                  <Badge variant="secondary">{formatPct(grupoMetaPct)}</Badge>
                </div>
              </div>

              {grupo.subclasses.map((sub) => {
                const subAtivos = grupoAtivos.filter((a) => a.classe === sub.key);
                const info = SUBSECTION_INFO[sub.key];

                return (
                  <div key={sub.key} className="p-4 space-y-2 border-t first:border-t-0">
                    <p className="text-sm font-medium">{info.sectionLabel}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground font-normal">
                          <th className="text-left pb-1 font-normal">Nome</th>
                          <th className="text-left pb-1 font-normal">Segmento</th>
                          <th className="text-left pb-1 font-normal">% Meta</th>
                          <th className="text-left pb-1 font-normal">R$ Meta</th>
                          <th className="text-left pb-1 font-normal">% Atual</th>
                          <th className="text-left pb-1 font-normal">Dif R$</th>
                          <th className="text-left pb-1 font-normal">Ação</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {subAtivos.map((a) => {
                          const dif = getDifBRL(a);
                          return (
                            <tr key={a.id} className="border-t">
                              <td className="py-1 pr-1">
                                <Input
                                  value={a.nome}
                                  onChange={(e) => updateRec(a.id, { nome: e.target.value })}
                                  className="h-7 text-xs"
                                  placeholder="Nome"
                                />
                              </td>
                              <td className="py-1 pr-1">
                                <Input
                                  value={a.segmento ?? ""}
                                  onChange={(e) =>
                                    updateRec(a.id, { segmento: e.target.value })
                                  }
                                  className="h-7 text-xs"
                                  placeholder="Segmento"
                                />
                              </td>
                              <td className="py-1 pr-1">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={a.pctMeta ?? ""}
                                  onChange={(e) =>
                                    updateRec(a.id, {
                                      pctMeta: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="h-7 text-xs w-20"
                                />
                              </td>
                              <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">
                                {formatBRL(a.valorMetaBRL ?? 0)}
                              </td>
                              <td className="py-1 pr-1 text-muted-foreground">
                                {formatPct(getPctAtualForAtivo(a))}
                              </td>
                              <td
                                className={cn(
                                  "py-1 pr-1 font-medium whitespace-nowrap",
                                  dif > 0 ? "text-green-600" : dif < 0 ? "text-red-600" : "text-muted-foreground"
                                )}
                              >
                                {dif !== 0
                                  ? (dif > 0 ? "+" : "") + formatBRL(dif)
                                  : "—"}
                              </td>
                              <td className="py-1 pr-1">{getAcaoBadge(a)}</td>
                              <td className="py-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeRec(a.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addRec(sub.key)}
                      className="text-xs"
                    >
                      {info.addLabel}
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* RIGHT SIDE — sticky */}
      <div className="sticky top-20 space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">Alocação recomendada</h3>

          {/* Total progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {totalRounded.toFixed(1).replace(".", ",")}% alocado
              </span>
              {isExact ? (
                <Badge className="bg-green-100 text-green-800 text-xs">OK</Badge>
              ) : (
                <span className="text-xs text-amber-600">Falta {(100 - totalRounded).toFixed(1)}%</span>
              )}
            </div>
            <Progress
              value={Math.min(totalRounded, 100)}
              className={cn(isExact ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500")}
            />
          </div>

          {/* Comparison table */}
          <div>
            <p className="text-xs font-medium mb-2">Comparativo por grupo</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground font-normal">
                  <th className="text-left pb-1 font-normal">Grupo</th>
                  <th className="text-right pb-1 font-normal">Atual</th>
                  <th className="text-right pb-1 font-normal">Meta</th>
                  <th className="text-right pb-1 font-normal">Dif</th>
                </tr>
              </thead>
              <tbody>
                {GRUPOS_DISPLAY.map((g) => {
                  const atualPct = pctAtual(g.classes);
                  const metaPct = pctMeta(g.classes);
                  const dif = metaPct - atualPct;
                  return (
                    <>
                      <tr key={g.label} className="font-medium border-t">
                        <td className="py-0.5">{g.label}</td>
                        <td className="py-0.5 text-right">{formatPct(atualPct)}</td>
                        <td className="py-0.5 text-right">{formatPct(metaPct)}</td>
                        <td
                          className={cn(
                            "py-0.5 text-right",
                            dif > 0 ? "text-green-600" : dif < 0 ? "text-red-600" : "text-muted-foreground"
                          )}
                        >
                          {dif !== 0 ? (dif > 0 ? "+" : "") + formatPct(dif) : "—"}
                        </td>
                      </tr>
                      {g.subclasses.map((sub) => {
                        const subAtualPct = pctAtual([sub.key]);
                        const subMetaPct = pctMeta([sub.key]);
                        return (
                          <tr key={sub.key} className="text-muted-foreground">
                            <td className="py-0.5 pl-3">{sub.label}</td>
                            <td className="py-0.5 text-right">{formatPct(subAtualPct)}</td>
                            <td className="py-0.5 text-right">{formatPct(subMetaPct)}</td>
                            <td className="py-0.5 text-right"></td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Distribuição proposta</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.cor }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name}: {entry.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
