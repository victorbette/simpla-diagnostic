import { Fragment, useMemo } from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import type { Ativo } from "@/lib/carteira/types";
import {
  ativosIniciais,
  genId,
  formatPct,
} from "@/lib/carteira/calculos";
import {
  getCard,
  cardsPorGrupo,
} from "@/lib/carteira/segmentos";
import type { SimplaCardId } from "@/lib/carteira/segmentos";
import { TabelaAtivos } from "./TabelaAtivos";

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
  { nome: "Renda Fixa", cards: ["resgate_rapido", "resgate_longo"] as SimplaCardId[], cor: "#2A4F6A" },
  { nome: "RV Brasil", cards: ["acoes", "fiis"] as SimplaCardId[], cor: "#3D6B41" },
  { nome: "Internacional", cards: ["exterior"] as SimplaCardId[], cor: "#8A7A45" },
  { nome: "Criptoativos", cards: ["cripto"] as SimplaCardId[], cor: "#8A7A45" },
];

const GRUPO_ORDER = ["Renda Fixa", "Renda Variável Brasil", "Internacional", "Criptoativos"];

export function Etapa2CarteiraRecomendada({
  ativosRec,
  onAtivosRec,
  ativosAtuais,
  patrimonio,
  clientProfile,
}: Props) {
  const totalPctMeta = ativosRec.reduce((s, a) => s + (a.pctMeta ?? 0), 0);
  const isExact = Math.abs(totalPctMeta - 100) < 0.05;

  function replaceCardAtivos(cardId: SimplaCardId, updated: Ativo[]) {
    const others = ativosRec.filter((a) => a.card !== cardId);
    onAtivosRec([...others, ...updated]);
  }

  // Comparison data for right panel
  const comparativo = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => {
        const atual = ativosAtuais
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + a.pctCarteira, 0);
        const meta = ativosRec
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
        return { nome: g.nome, atual, meta, dif: meta - atual };
      }),
    [ativosAtuais, ativosRec]
  );

  // Pie data for meta allocation
  const pieData = useMemo(
    () =>
      GRUPOS_DISPLAY.map((g) => ({
        name: g.nome,
        value: ativosRec
          .filter((a) => g.cards.includes(a.card))
          .reduce((s, a) => s + (a.pctMeta ?? 0), 0),
        cor: g.cor,
      })).filter((d) => d.value > 0),
    [ativosRec]
  );

  const grupos = cardsPorGrupo();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* LEFT SIDE */}
      <div className="space-y-4">
        {/* Info banner */}
        {clientProfile && (
          <div style={{ border: "1px solid #99E6EB", backgroundColor: "#F0FDFB", borderRadius: 8, padding: "12px 16px" }} className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#BBA866" }} />
            <p className="text-sm" style={{ color: "#000000" }}>
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
          <button
            onClick={() => {
              if (clientProfile) {
                onAtivosRec(ativosIniciais(clientProfile, patrimonio));
              }
            }}
            style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
          >
            Usar alocação padrão do perfil
          </button>
          <button
            onClick={() =>
              onAtivosRec(
                ativosAtuais.map((a) => ({ ...a, id: genId(), pctMeta: 0, valorMetaBRL: 0 }))
              )
            }
            style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 }}
          >
            Copiar estrutura da carteira atual
          </button>
        </div>

        {/* Progress bar card */}
        <div className="rounded-lg border p-3 space-y-2" style={isExact ? { borderTop: "3px solid #3D6B41" } : undefined}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total alocado</span>
            {isExact ? (
              <span style={{ backgroundColor: "#EBF2EC", color: "#3D6B41", border: "1px solid #A8C8AB", borderRadius: 9999, padding: "2px 8px", fontSize: 12 }}>100% alocado</span>
            ) : (
              <span className="text-sm font-semibold" style={{ color: "#8A7A45" }}>{formatPct(totalPctMeta)}</span>
            )}
          </div>
          <Progress
            value={Math.min(totalPctMeta, 100)}
            className={cn("h-2", isExact ? "[&>div]:bg-[#EBF2EC]0" : "[&>div]:bg-[#F5F0E0]0")}
          />
          {!isExact && (
            <p className="text-xs" style={{ color: "#8A7A45" }}>Ajuste para fechar em 100%</p>
          )}
        </div>

        {/* Section groups */}
        {GRUPO_ORDER.map((grupoNome) => {
          const cards = grupos[grupoNome] ?? [];
          const grupoTotalPct = ativosRec
            .filter((a) => cards.some((c) => c.id === a.card))
            .reduce((s, a) => s + (a.pctMeta ?? 0), 0);

          return (
            <div key={grupoNome} className="rounded-lg border overflow-hidden">
              <div style={{ backgroundColor: "#F5F3EE", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F5F3EE" }}>
                <span style={{ fontWeight: 600, color: "#000000", fontSize: 14 }}>{grupoNome}</span>
                <span style={{ fontSize: 12, color: "#6B6347" }}>{formatPct(grupoTotalPct)}</span>
              </div>

              {cards.map((card, idx) => {
                const cardInfo = getCard(card.id);
                return (
                  <div key={card.id} className={idx > 0 ? "border-t" : ""}>
                    <p className="text-xs font-medium text-muted-foreground px-4 pt-2 pb-1">
                      {cardInfo.label}
                    </p>
                    <div className="px-2 pb-1">
                      <TabelaAtivos
                        card={card}
                        ativos={ativosRec.filter((a) => a.card === card.id)}
                        onChange={(updated) => replaceCardAtivos(card.id, updated)}
                        patrimonio={patrimonio}
                        modo="recomendada"
                        ativosAtuaisRef={ativosAtuais}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* RIGHT SIDE */}
      <div className="sticky top-20 space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-3" style={{ borderTop: "3px solid #BBA866", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 className="font-semibold text-sm" style={{ fontWeight: 700, color: "#000000", fontSize: 14 }}>Alocação recomendada</h3>

          {/* Compact progress */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total</span>
            {isExact ? (
              <Badge className="bg-[#D4E8D5] text-green-800 text-xs">100%</Badge>
            ) : (
              <span className="text-xs font-semibold text-[#8A7A45]">{formatPct(totalPctMeta)}</span>
            )}
          </div>
          <Progress
            value={Math.min(totalPctMeta, 100)}
            className={cn("h-1.5", isExact ? "[&>div]:bg-[#EBF2EC]0" : "[&>div]:bg-[#F5F0E0]0")}
          />

          {/* Comparison table */}
          <table className="w-full text-xs mt-2">
            <thead>
              <tr style={{ borderBottom: "2px solid #E2DCC8" }}>
                <th className="pb-1 text-left" style={{ color: "#9E9070", fontWeight: 500, fontSize: 11 }}>Grupo</th>
                <th className="pb-1 text-right" style={{ color: "#9E9070", fontWeight: 500, fontSize: 11 }}>Atual</th>
                <th className="pb-1 text-right" style={{ color: "#9E9070", fontWeight: 500, fontSize: 11 }}>Meta</th>
                <th className="pb-1 text-right" style={{ color: "#9E9070", fontWeight: 500, fontSize: 11 }}>Dif</th>
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
                        ? "text-[#3D6B41]"
                        : row.dif < -0.5
                        ? "text-[#7A3535]"
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
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="80%"
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
