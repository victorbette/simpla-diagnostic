import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Save } from "lucide-react";
import type { Ativo, PlanoAcaoItem, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { formatBRL, formatPct } from "@/lib/carteira/calculos";

interface Props {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  patrimonio: number;
  aporteDisponivel?: number;
  onSave: () => void;
}

const GRUPOS = [
  { nome: "Renda Fixa",    cards: ["resgate_longo", "resgate_rapido"] as CardId[], cor: "#1E3A8A" },
  { nome: "RV Brasil",     cards: ["acoes", "fiis"] as CardId[],                   cor: "#15803D" },
  { nome: "Internacional", cards: ["exterior"] as CardId[],                         cor: "#B45309" },
  { nome: "Criptoativos",  cards: ["cripto"] as CardId[],                           cor: "#2563EB" },
];

function totalByCards(ativos: Ativo[], cards: CardId[]): number {
  return ativos.filter((a) => cards.includes(a.card)).reduce((s, a) => s + a.valorBRL, 0);
}

function PieSection({
  title,
  data,
}: {
  title: string;
  data: { nome: string; valor: number; pct: number; cor: string }[];
}) {
  const pieData = data.filter((d) => d.pct > 0);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>{title}</p>
      {pieData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="pct"
                nameKey="nome"
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {pieData.map((d, i) => <Cell key={i} fill={d.cor} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatPct(v)} />
            </PieChart>
          </ResponsiveContainer>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 4 }}>
            <tbody>
              {pieData.map((d) => (
                <tr key={d.nome}>
                  <td style={{ padding: "2px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.cor, display: "inline-block" }} />
                      <span style={{ color: "#374151" }}>{d.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: "2px 0", textAlign: "right", color: "#6B7280" }}>{formatPct(d.pct)}</td>
                  <td style={{ padding: "2px 0", textAlign: "right", color: "#9CA3AF", paddingLeft: 6 }}>{formatBRL(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9CA3AF" }}>
          Sem dados
        </div>
      )}
    </div>
  );
}

export function Etapa4Resultado({ ativosAtuais, ativosRecomendados: _ativosRecomendados, alocacaoMeta, planoAcao, patrimonio, aporteDisponivel = 0, onSave }: Props) {
  const patrimonioMeta = patrimonio + aporteDisponivel;

  const grupoAtual = useMemo(
    () => GRUPOS.map((g) => {
      const valor = totalByCards(ativosAtuais, g.cards);
      const pct = patrimonio > 0 ? (valor / patrimonio) * 100 : 0;
      return { nome: g.nome, valor, pct: Math.round(pct * 10) / 10, cor: g.cor };
    }),
    [ativosAtuais, patrimonio]
  );

  // grupoMeta: use alocacaoMeta slider values × (patrimônio + aporte)
  const grupoMeta = useMemo(
    () => GRUPOS.map((g) => {
      const pct = g.cards.reduce((s, c) => s + (alocacaoMeta[c] ?? 0), 0);
      const valor = (pct / 100) * patrimonioMeta;
      return { nome: g.nome, valor, pct: Math.round(pct * 10) / 10, cor: g.cor };
    }),
    [alocacaoMeta, patrimonioMeta]
  );

  const totalAportes = planoAcao.filter((p) => p.acao !== 'manter' && p.movimentacaoBRL > 0).reduce((s, p) => s + p.movimentacaoBRL, 0);
  const totalResgates = planoAcao.filter((p) => p.acao !== 'manter' && p.movimentacaoBRL < 0).reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);

  const aportes = planoAcao.filter((p) => p.acao === "aportar" || p.acao === "novo");
  const resgates = planoAcao.filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total");
  const mantidos = planoAcao.filter((p) => p.acao === "manter");

  // Per card: atual = soma ativos atuais; meta = alocacaoMeta % × (patrimônio + aporte)
  const cardTotais = useMemo(
    () => CARD_ORDER.map((cardId) => {
      const atual = ativosAtuais.filter((a) => a.card === cardId).reduce((s, a) => s + a.valorBRL, 0);
      const pctMeta = alocacaoMeta[cardId] ?? 0;
      const meta = (pctMeta / 100) * patrimonioMeta;
      return { cardId, atual, meta, dif: meta - atual };
    }),
    [ativosAtuais, alocacaoMeta, patrimonioMeta]
  );

  const cardStyle = (_accent?: string): React.CSSProperties => ({
    border: "0.5px solid #E5E7EB",
    borderRadius: 10, backgroundColor: "white", overflow: "hidden",
  });

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Visão Geral */}
      <div style={cardStyle("#1E3A8A")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Visão Geral
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            { label: "Patrimônio Total", value: formatBRL(patrimonioMeta), color: "#1E3A8A" },
            { label: "Total Aportes",    value: formatBRL(totalAportes), color: "#15803D" },
            { label: "Total Resgates",   value: formatBRL(totalResgates), color: "#B91C1C" },
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{ padding: 16, borderLeft: i > 0 ? "1px solid #BFDBFE" : "none" }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alocação Atual vs Proposta */}
      <div style={cardStyle("#2563EB")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Alocação Atual vs Proposta
        </div>
        <div style={{ padding: 16, display: "flex", gap: 24 }}>
          <PieSection title="Carteira Atual" data={grupoAtual} />
          <div style={{ width: 1, backgroundColor: "#BFDBFE", flexShrink: 0 }} />
          <PieSection title="Carteira Proposta" data={grupoMeta} />
        </div>
      </div>

      {/* Comparativo por Card */}
      <div style={cardStyle("#2563EB")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Comparativo por Classe
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#1E3A8A" }}>
              <tr>
                {["Classe", "R$ Atual", "R$ Proposta", "Diferença"].map((h) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: h === "Classe" ? "left" : "right", color: "white", fontWeight: 600, fontSize: 11 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cardTotais.map(({ cardId, atual, meta, dif }, i) => (
                <tr key={cardId} style={{ backgroundColor: i % 2 === 0 ? "#F0F7FF" : "white" }}>
                  <td style={{ padding: "8px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: CARD_META[cardId].cor, display: "inline-block" }} />
                      {CARD_META[cardId].label}
                    </div>
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right", color: "#6B7280" }}>{formatBRL(atual)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right" }}>{formatBRL(meta)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: dif > 0 ? "#15803D" : dif < 0 ? "#B91C1C" : "#9CA3AF" }}>
                    {dif === 0 ? "—" : `${dif > 0 ? "+" : ""}${formatBRL(dif)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimentações */}
      <div style={cardStyle("#15803D")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Movimentações
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            { title: "Aportar", items: aportes, color: "#15803D", getVal: (it: PlanoAcaoItem) => it.movimentacaoBRL },
            { title: "Resgatar", items: resgates, color: "#B91C1C", getVal: (it: PlanoAcaoItem) => it.movimentacaoBRL },
            { title: "Manter", items: mantidos, color: "#6B7280", getVal: (it: PlanoAcaoItem) => it.valorAtualBRL },
          ].map(({ title, items, color, getVal }, ci) => (
            <div key={title} style={{ padding: 14, borderLeft: ci > 0 ? "1px solid #BFDBFE" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color, margin: 0 }}>{title}</p>
              {items.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhum</p>
              ) : (
                <>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                        <span style={{
                          backgroundColor: CARD_META[item.card].cor + "18",
                          color: CARD_META[item.card].cor,
                          borderRadius: 4, padding: "1px 5px", fontSize: 10, flexShrink: 0,
                        }}>
                          {CARD_META[item.card].label}
                        </span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nomeAtivo}</span>
                      </div>
                      <span style={{ color, fontWeight: 500, flexShrink: 0 }}>{formatBRL(Math.abs(getVal(item)))}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #BFDBFE", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>Total</span>
                    <span style={{ color }}>{formatBRL(Math.abs(items.reduce((s, it) => s + getVal(it), 0)))}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
        <button
          onClick={onSave}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: "#15803D", color: "white",
            border: "none", borderRadius: 8,
            padding: "12px 40px", fontSize: 15, fontWeight: 500, cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#166534")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#15803D")}
        >
          <Save size={18} />
          Salvar carteira
        </button>
      </div>
    </div>
  );
}
