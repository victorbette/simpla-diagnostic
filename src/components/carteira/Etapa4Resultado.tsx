import { Fragment, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Save } from "lucide-react";
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

const GRUPOS_DISPLAY = [
  { nome: "Renda Fixa",    cards: ["resgate_rapido", "resgate_longo"] as SimplaCardId[], cor: "#1E3A8A" },
  { nome: "RV Brasil",     cards: ["acoes", "fiis"] as SimplaCardId[],                   cor: "#15803D" },
  { nome: "Internacional", cards: ["exterior"] as SimplaCardId[],                         cor: "#B45309" },
  { nome: "Criptoativos",  cards: ["cripto"] as SimplaCardId[],                           cor: "#2563EB" },
];

export function Etapa4Resultado({
  ativosAtuais, ativosRecomendados, planoAcao, patrimonio,
  notaConsultor, clientName: _clientName, clientProfile: _clientProfile, usdBrl, onGoToEtapa3, onSave,
}: Props) {

  const grupoAtual = useMemo(
    () => GRUPOS_DISPLAY.map((g) => {
      const v = ativosAtuais.filter((a) => g.cards.includes(a.card)).reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
      const pct = patrimonio > 0 ? (v / patrimonio) * 100 : 0;
      return { nome: g.nome, valor: v, pct: Math.round(pct * 10) / 10, cor: g.cor };
    }),
    [ativosAtuais, usdBrl, patrimonio]
  );

  const grupoMeta = useMemo(
    () => GRUPOS_DISPLAY.map((g) => {
      const v = ativosRecomendados.filter((a) => g.cards.includes(a.card)).reduce((s, a) => s + (a.valorMetaBRL ?? 0), 0);
      const pct = ativosRecomendados.filter((a) => g.cards.includes(a.card)).reduce((s, a) => s + (a.pctMeta ?? 0), 0);
      return { nome: g.nome, valor: v, pct: Math.round(pct * 10) / 10, cor: g.cor };
    }),
    [ativosRecomendados]
  );

  const pieAtual = grupoAtual.filter((g) => g.pct > 0);
  const pieMeta = grupoMeta.filter((g) => g.pct > 0);

  const totalAportes = planoAcao.filter((p) => p.movimentacaoBRL > 0).reduce((s, p) => s + p.movimentacaoBRL, 0);
  const totalResgates = planoAcao.filter((p) => p.movimentacaoBRL < 0).reduce((s, p) => s + Math.abs(p.movimentacaoBRL), 0);

  const aportes  = planoAcao.filter((p) => p.tipo === "aportar" || p.tipo === "novo_ativo");
  const resgates = planoAcao.filter((p) => p.tipo === "resgatar_parcial" || p.tipo === "resgatar_total");
  const mantidos = planoAcao.filter((p) => p.tipo === "manter");

  const cardStyle = (accent: string): React.CSSProperties => ({
    border: "0.5px solid #BFDBFE", borderTop: `3px solid ${accent}`,
    borderRadius: 10, backgroundColor: "white", overflow: "hidden",
  });

  const cardHeader = (text: string): React.ReactNode => (
    <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
      {text}
    </div>
  );

  function PieSection({ title, data }: { title: string; data: typeof pieAtual }) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>{title}</p>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data} dataKey="pct" nameKey="nome" cx="50%" cy="50%" innerRadius="45%" outerRadius="80%" paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatPct(v)} />
              </PieChart>
            </ResponsiveContainer>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 4 }}>
              <tbody>
                {data.map((d) => (
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
          <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9CA3AF" }}>Sem dados</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Card: Visão Geral */}
      <div style={cardStyle("#1E3A8A")}>
        {cardHeader("Visão Geral")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            { label: "Patrimônio Total", value: formatBRL(patrimonio), color: "#1E3A8A" },
            { label: "Total Aportes",    value: formatBRL(totalAportes), color: "#15803D" },
            { label: "Total Resgates",   value: formatBRL(totalResgates), color: "#B91C1C" },
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{ padding: "16px", borderLeft: i > 0 ? "0.5px solid #BFDBFE" : "none" }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.04em", margin: "0 0 4px" }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Card: Alocação Atual vs Proposta */}
      <div style={cardStyle("#2563EB")}>
        {cardHeader("Alocação Atual vs Proposta")}
        <div style={{ padding: 16, display: "flex", gap: 24 }}>
          <PieSection title="Carteira Atual" data={pieAtual} />
          <div style={{ width: 1, backgroundColor: "#BFDBFE", flexShrink: 0 }} />
          <PieSection title="Carteira Proposta" data={pieMeta} />
        </div>
      </div>

      {/* Card: Comparativo por Classe */}
      <div style={cardStyle("#2563EB")}>
        {cardHeader("Comparativo por Classe")}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#1E3A8A" }}>
              <tr>
                {["Classe", "% Atual", "R$ Atual", "% Meta", "R$ Meta", "Dif. R$", "Dif. %"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: h === "Classe" ? "left" : "right", color: "white", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRUPOS_DISPLAY.map((g, i) => {
                const at = grupoAtual[i];
                const me = grupoMeta[i];
                const difR = me.valor - at.valor;
                const difP = me.pct - at.pct;
                return (
                  <Fragment key={g.nome}>
                    <tr style={{ backgroundColor: i % 2 === 0 ? "#F0F7FF" : "white" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: g.cor, display: "inline-block" }} />
                          {g.nome}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280" }}>{formatPct(at.pct)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#6B7280" }}>{formatBRL(at.valor)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatPct(me.pct)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatBRL(me.valor)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: difR > 0 ? "#15803D" : difR < 0 ? "#B91C1C" : "#9CA3AF" }}>
                        {difR === 0 ? "—" : `${difR > 0 ? "+" : ""}${formatBRL(difR)}`}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: difP > 0 ? "#15803D" : difP < 0 ? "#B91C1C" : "#9CA3AF" }}>
                        {difP === 0 ? "—" : `${difP > 0 ? "+" : ""}${formatPct(difP)}`}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#DBEAFE", fontWeight: 700 }}>
                <td style={{ padding: "10px 14px" }}>Total</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatPct(grupoAtual.reduce((s, g) => s + g.pct, 0))}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatBRL(patrimonio)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatPct(grupoMeta.reduce((s, g) => s + g.pct, 0))}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatBRL(grupoMeta.reduce((s, g) => s + g.valor, 0))}</td>
                <td style={{ padding: "10px 14px", textAlign: "right", color: "#9CA3AF" }}>—</td>
                <td style={{ padding: "10px 14px", textAlign: "right", color: "#9CA3AF" }}>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Card: Movimentações */}
      <div style={cardStyle("#15803D")}>
        {cardHeader("Movimentações")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            { title: "Aportar", items: aportes, color: "#15803D", totalFn: (items: ItemPlanoAcao[]) => items.reduce((s, p) => s + p.movimentacaoBRL, 0) },
            { title: "Resgatar", items: resgates, color: "#B91C1C", totalFn: (items: ItemPlanoAcao[]) => items.reduce((s, p) => s + p.movimentacaoBRL, 0) },
            { title: "Manter", items: mantidos, color: "#6B7280", totalFn: (items: ItemPlanoAcao[]) => items.reduce((s, p) => s + p.valorAtualBRL, 0) },
          ].map(({ title, items, color, totalFn }, ci) => (
            <div key={title} style={{ padding: 14, borderLeft: ci > 0 ? "0.5px solid #BFDBFE" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color, margin: 0 }}>{title}</p>
              {items.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>Nenhum</p>
              ) : (
                <>
                  {items.map((item) => {
                    const card = getCard(item.card);
                    const displayVal = title === "Manter" ? item.valorAtualBRL : Math.abs(item.movimentacaoBRL);
                    return (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                          <span style={{ backgroundColor: card.cor + "18", color: card.cor, borderRadius: 4, padding: "1px 5px", fontSize: 10, flexShrink: 0 }}>{card.label}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nomeAtivo}</span>
                        </div>
                        <span style={{ color, fontWeight: 500, flexShrink: 0 }}>{formatBRL(displayVal)}</span>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: "0.5px solid #BFDBFE", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>Total</span>
                    <span style={{ color }}>{formatBRL(Math.abs(totalFn(items)))}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nota do consultor */}
      {notaConsultor && (
        <div style={{ border: "0.5px solid #BFDBFE", borderRadius: 10, backgroundColor: "#F0F7FF", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>Notas do consultor</span>
            <button onClick={onGoToEtapa3} style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: 12 }}>Editar</button>
          </div>
          <p style={{ fontSize: 13, whiteSpace: "pre-wrap", color: "#6B7280", margin: 0 }}>{notaConsultor}</p>
        </div>
      )}

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
          <Save style={{ width: 18, height: 18 }} />
          Salvar carteira
        </button>
      </div>

    </div>
  );
}
