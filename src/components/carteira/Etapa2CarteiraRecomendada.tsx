import { Fragment, useMemo } from "react";
import { Info } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Ativo } from "@/lib/carteira/types";
import { ativosIniciais, genId, formatPct } from "@/lib/carteira/calculos";
import { getCard, cardsPorGrupo } from "@/lib/carteira/segmentos";
import type { SimplaCardId } from "@/lib/carteira/segmentos";
import { TabelaAtivos } from "./TabelaAtivos";

interface Props {
  ativosRec: Ativo[];
  onAtivosRec: (a: Ativo[]) => void;
  ativosAtuais: Ativo[];
  patrimonio: number;
  clientProfile: string | null;
}

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Conservador Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const GRUPOS_DISPLAY = [
  { nome: "Renda Fixa",           cards: ["resgate_rapido", "resgate_longo"] as SimplaCardId[], cor: "#1E3A8A" },
  { nome: "RV Brasil",            cards: ["acoes", "fiis"] as SimplaCardId[],                   cor: "#15803D" },
  { nome: "Internacional",        cards: ["exterior"] as SimplaCardId[],                         cor: "#B45309" },
  { nome: "Criptoativos",         cards: ["cripto"] as SimplaCardId[],                           cor: "#2563EB" },
];

const GRUPO_ORDER = ["Renda Fixa", "Renda Variável Brasil", "Internacional", "Criptoativos"];

const CONTEXT_LABELS: Record<SimplaCardId, string> = {
  resgate_rapido: "CDB, LCI, LCA, Tesouro Selic, fundo DI",
  resgate_longo: "Tesouro IPCA+, NTN-B, CRI, CRA, debêntures",
  acoes: "Ações de empresas brasileiras",
  fiis: "Fundos de investimento imobiliário",
  exterior: "ETFs, stocks, REITs em USD",
  cripto: "BTC, ETH e outros criptoativos",
};

const GRUPO_DOTS: Record<string, string> = {
  "Renda Fixa": "#1E3A8A",
  "Renda Variável Brasil": "#15803D",
  "Internacional": "#B45309",
  "Criptoativos": "#2563EB",
};

export function Etapa2CarteiraRecomendada({
  ativosRec, onAtivosRec, ativosAtuais, patrimonio, clientProfile,
}: Props) {
  const totalPctMeta = ativosRec.reduce((s, a) => s + (a.pctMeta ?? 0), 0);
  const isExact = Math.abs(totalPctMeta - 100) < 0.05;

  function replaceCardAtivos(cardId: SimplaCardId, updated: Ativo[]) {
    const others = ativosRec.filter((a) => a.card !== cardId);
    onAtivosRec([...others, ...updated]);
  }

  const comparativo = useMemo(
    () => GRUPOS_DISPLAY.map((g) => {
      const atual = ativosAtuais.filter((a) => g.cards.includes(a.card)).reduce((s, a) => s + a.pctCarteira, 0);
      const meta = ativosRec.filter((a) => g.cards.includes(a.card)).reduce((s, a) => s + (a.pctMeta ?? 0), 0);
      return { nome: g.nome, atual, meta, dif: meta - atual, cor: g.cor };
    }),
    [ativosAtuais, ativosRec]
  );

  const pieData = useMemo(
    () => GRUPOS_DISPLAY.map((g) => ({
      name: g.nome,
      value: ativosRec.filter((a) => g.cards.includes(a.card)).reduce((s, a) => s + (a.pctMeta ?? 0), 0),
      cor: g.cor,
    })).filter((d) => d.value > 0),
    [ativosRec]
  );

  const grupos = cardsPorGrupo();

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

      {/* ── MAIN COLUMN ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Info banner */}
        <div style={{
          backgroundColor: "#EFF6FF", border: "0.5px solid #BFDBFE",
          borderRadius: 8, padding: "10px 16px",
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <Info style={{ width: 16, height: 16, color: "#2563EB", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "#111827", flex: 1, margin: 0 }}>
            {clientProfile
              ? <><span style={{ fontWeight: 600 }}>Carteira pré-carregada com perfil {PERFIL_LABELS[clientProfile] ?? clientProfile}.</span> Ajuste os percentuais e ativos conforme necessário.</>
              : "Defina a alocação recomendada para o cliente."
            }
          </p>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => { if (clientProfile) onAtivosRec(ativosIniciais(clientProfile, patrimonio)); }}
              style={{ border: "0.5px solid #BFDBFE", color: "#2563EB", backgroundColor: "white", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}
            >
              Alocação padrão
            </button>
            <button
              onClick={() => onAtivosRec(ativosAtuais.map((a) => ({ ...a, id: genId(), pctMeta: 0, valorMetaBRL: 0 })))}
              style={{ border: "0.5px solid #BFDBFE", color: "#2563EB", backgroundColor: "white", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}
            >
              Copiar atual
            </button>
          </div>
        </div>

        {/* Total % indicator */}
        <div style={{ border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", backgroundColor: "white" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Total alocado</span>
            {isExact ? (
              <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 99, fontSize: 11, padding: "2px 8px" }}>100% alocado</span>
            ) : (
              <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", borderRadius: 99, fontSize: 11, padding: "2px 8px" }}>
                {formatPct(totalPctMeta)} — ajuste necessário
              </span>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 3, backgroundColor: "#BFDBFE", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(totalPctMeta, 100)}%`,
              backgroundColor: isExact ? "#15803D" : "#2563EB",
              transition: "width 300ms",
            }} />
          </div>
        </div>

        {/* Asset Groups */}
        {GRUPO_ORDER.map((grupoNome) => {
          const cards = grupos[grupoNome] ?? [];
          const grupoTotalPct = ativosRec
            .filter((a) => cards.some((c) => c.id === a.card))
            .reduce((s, a) => s + (a.pctMeta ?? 0), 0);
          const dotColor = GRUPO_DOTS[grupoNome] ?? "#6B7280";

          return (
            <div key={grupoNome} style={{ border: "0.5px solid #BFDBFE", borderRadius: 10, overflow: "hidden", backgroundColor: "white" }}>
              {/* Group header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", backgroundColor: "#F8FAFC",
                borderBottom: "0.5px solid #BFDBFE",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: dotColor, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{grupoNome}</span>
                </div>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{formatPct(grupoTotalPct)} alocado</span>
              </div>

              {/* Subclasses */}
              {cards.map((card, idx) => {
                const cardInfo = getCard(card.id);
                return (
                  <div key={card.id} style={{ borderTop: idx === 0 ? "none" : "0.5px solid #BFDBFE" }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 16px", backgroundColor: "white",
                      borderBottom: "0.5px solid #BFDBFE",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6B7280" }}>
                        {cardInfo.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{CONTEXT_LABELS[card.id]}</span>
                    </div>
                    <TabelaAtivos
                      card={card}
                      ativos={ativosRec.filter((a) => a.card === card.id)}
                      onChange={(updated) => replaceCardAtivos(card.id, updated)}
                      patrimonio={patrimonio}
                      modo="recomendada"
                      ativosAtuaisRef={ativosAtuais}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Card: Alocação recomendada */}
        <div style={{ border: "0.5px solid #BFDBFE", borderRadius: 10, overflow: "hidden", backgroundColor: "white" }}>
          <div style={{
            padding: "10px 14px", borderBottom: "0.5px solid #BFDBFE",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 12, fontWeight: 500,
          }}>
            <span style={{ color: "#111827" }}>Alocação recomendada</span>
            {isExact
              ? <span style={{ backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 99, fontSize: 10, padding: "2px 7px" }}>100%</span>
              : <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", borderRadius: 99, fontSize: 10, padding: "2px 7px" }}>{formatPct(totalPctMeta)}</span>
            }
          </div>
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Pie chart */}
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="45%" outerRadius="80%" paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPct(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Comparativo table */}
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #BFDBFE" }}>
                  <th style={{ padding: "3px 0", textAlign: "left", color: "#9CA3AF", fontWeight: 500 }}>Grupo</th>
                  <th style={{ padding: "3px 0", textAlign: "right", color: "#9CA3AF", fontWeight: 500 }}>Atual</th>
                  <th style={{ padding: "3px 0", textAlign: "right", color: "#9CA3AF", fontWeight: 500 }}>Meta</th>
                  <th style={{ padding: "3px 0", textAlign: "right", color: "#9CA3AF", fontWeight: 500 }}>Dif</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((row) => (
                  <Fragment key={row.nome}>
                    <tr style={{ borderTop: "0.5px solid #F0F7FF" }}>
                      <td style={{ padding: "3px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: row.cor, display: "inline-block" }} />
                          {row.nome.split(" ")[0]}
                        </div>
                      </td>
                      <td style={{ padding: "3px 0", textAlign: "right", color: "#6B7280" }}>{formatPct(row.atual)}</td>
                      <td style={{ padding: "3px 0", textAlign: "right" }}>{formatPct(row.meta)}</td>
                      <td style={{
                        padding: "3px 0", textAlign: "right", fontWeight: 500,
                        color: row.dif > 0.5 ? "#15803D" : row.dif < -0.5 ? "#B91C1C" : "#9CA3AF",
                      }}>
                        {Math.abs(row.dif) < 0.5 ? "—" : `${row.dif > 0 ? "+" : ""}${formatPct(row.dif)}`}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>

          </div>
        </div>

      </div>
    </div>
  );
}
