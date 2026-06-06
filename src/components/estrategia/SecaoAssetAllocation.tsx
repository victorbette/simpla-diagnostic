import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { formatPct, formatBRL } from "@/lib/carteira/calculos";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { CarteiraResultado } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { CardSelecaoAtivos } from "@/components/shared/CardSelecaoAtivos";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoCarteira: ResultadoCarteira | null;
  onResultadoCarteira: (r: ResultadoCarteira) => void;
  onLimparCarteira?: () => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

// ── DonutChart ────────────────────────────────────────────────────────────────

interface DonutChartProps {
  data: { name: string; value: number; color: string; key: string; brl: number }[];
  centerLabel: string;
}

function DonutChart({ data, centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F0F7FF", borderRadius: 8, flexDirection: "column", gap: 6 }}>
        <PieChartIcon size={32} color="#3B82F6" strokeWidth={1.5} />
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, textAlign: "center" }}>Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            strokeWidth={1.5}
            stroke="white"
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            <Label
              content={({ viewBox }) => {
                const vb = viewBox as { cx?: number; cy?: number };
                const cx = vb.cx ?? 0;
                const cy = vb.cy ?? 0;
                return (
                  <text textAnchor="middle">
                    <tspan x={cx} y={cy - 7} fontSize={10} fill="#6B7280">{centerLabel}</tspan>
                    <tspan x={cx} y={cy + 11} fontSize={15} fontWeight="700" fill="#000000">{total.toFixed(0)}%</tspan>
                  </text>
                );
              }}
            />
          </Pie>
          <Tooltip formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", marginTop: 4 }}>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td style={{ padding: "2px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ color: "#374151" }}>{d.name}</span>
                </div>
              </td>
              <td style={{ padding: "2px 0", textAlign: "right", color: "#6B7280", paddingLeft: 6 }}>
                {d.value.toFixed(1).replace(".", ",")}%
              </td>
              <td style={{ padding: "2px 0", textAlign: "right", color: "#9CA3AF", paddingLeft: 6 }}>
                {formatBRL(d.brl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SecaoAssetAllocation({
  plan,
  clientName,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoCarteira,
  onResultadoCarteira,
  onLimparCarteira,
}: Props) {
  const [carteiraOpen, setCarteiraOpen] = useState(false);

  function handleCarteiraSave(r: CarteiraResultado) {
    const patrimonio = r.patrimonio;

    // macroAtual: per-card % computed from ativosAtuais
    const macroAtual: Record<string, number> = {};
    for (const cardId of CARD_ORDER) {
      const totalDoCard = r.ativosAtuais
        .filter((a) => a.card === cardId)
        .reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
      macroAtual[cardId] = patrimonio > 0 ? (totalDoCard / patrimonio) * 100 : 0;
    }

    // macroMeta: directly from slider (already %)
    const macroMeta: Record<string, number> = { ...(r.alocacaoMeta ?? {}) };

    const semManter = (r.planoAcao ?? []).filter((i) => i.acao !== "manter");
    const totalAportes = semManter
      .filter((i) => i.movimentacaoBRL > 0)
      .reduce((s, i) => s + i.movimentacaoBRL, 0);
    const totalResgates = semManter
      .filter((i) => i.movimentacaoBRL < 0)
      .reduce((s, i) => s + Math.abs(i.movimentacaoBRL), 0);

    onResultadoCarteira({
      patrimonio,
      planoAcaoCount: r.planoAcao.length,
      totalAportes,
      totalResgates,
      macroAtual,
      macroMeta,
      ativosRecomendados: r.ativosRecomendados ?? [],
      aporteDisponivel: r.aporteDisponivel,
      planoAcao: r.planoAcao.map((i) => ({
        id: i.id,
        card: i.card,
        nomeAtivo: i.nomeAtivo,
        segmento: i.segmento,
        acao: i.acao,
        tipo: i.acao,
        valorAtualBRL: i.valorAtualBRL,
        valorMetaBRL: i.valorMetaBRL,
        movimentacaoBRL: i.movimentacaoBRL,
        prioridade: i.prioridade,
        observacao: i.observacao,
      })),
      dataCalculo: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    });
    setCarteiraOpen(false);
  }

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  // ── Comment card (always visible) ─────────────────────────────────────────
  const commentCard = (
    <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Estratégia e Recomendações
      </p>
      <div style={{ position: "relative" }}>
        <textarea
          value={comentario}
          onChange={(e) => onComentarioChange(e.target.value)}
          placeholder="Descreva a estratégia de asset allocation recomendada: rebalanceamento, classes de ativos prioritários, instrumentos sugeridos..."
          style={{ width: "100%", minHeight: 160, padding: "10px 12px", borderRadius: 6, border: "1px solid #BFDBFE", fontSize: 13, color: "#000000", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>
          {comentario.length} caracteres
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
        {AVAILABLE_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", border: "1px solid #BFDBFE", backgroundColor: tags.includes(t) ? "#2563EB" : "transparent", color: tags.includes(t) ? "white" : "#111827" }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  // ── State A — carteira not defined ────────────────────────────────────────
  if (!resultadoCarteira) {
    return (
      <>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ backgroundColor: "white", border: "2px dashed #3B82F6", borderRadius: 12, padding: "40px 32px", textAlign: "center", maxWidth: 480, width: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <PieChartIcon size={48} color="#3B82F6" strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 8px" }}>Carteira não definida</p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 }}>
                Use a ferramenta de carteira para definir a alocação atual e recomendada do cliente, gerar o plano de ação e consolidar o resultado.
              </p>
              <button
                onClick={() => setCarteiraOpen(true)}
                style={{ padding: "10px 24px", backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14 }}
              >
                Definir Carteira →
              </button>
            </div>
          </div>
          {commentCard}
        </div>
        {carteiraOpen && (
          <FerramentaCarteira
            clientName={clientName}
            clientId={plan.clientId}
            clientProfile={plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null}
            patrimonyInicial={plan.ativosAtuais.total}
            onClose={() => setCarteiraOpen(false)}
            onSave={handleCarteiraSave}
            onLimpar={onLimparCarteira}
          />
        )}
      </>
    );
  }

  // ── State B — carteira defined ────────────────────────────────────────────
  const rc = resultadoCarteira;
  const patrimonio = rc.patrimonio;
  const patrimonioMeta = patrimonio + (rc.aporteDisponivel ?? 0);

  // PieChart data — value is % (0–100), brl derived from patrimonio
  const dadosAtual = CARD_ORDER
    .map((cardId) => {
      const value = Number(rc.macroAtual[cardId]) || 0;
      return { key: cardId, name: CARD_META[cardId].label, value, color: CARD_META[cardId].cor, brl: (value / 100) * patrimonio };
    })
    .filter((d) => d.value > 0.1);

  const dadosMeta = CARD_ORDER
    .map((cardId) => {
      const value = Number(rc.macroMeta[cardId]) || 0;
      return { key: cardId, name: CARD_META[cardId].label, value, color: CARD_META[cardId].cor, brl: (value / 100) * patrimonioMeta };
    })
    .filter((d) => d.value > 0.1);

  const totalAportes = rc.totalAportes ?? 0;
  const totalResgates = rc.totalResgates ?? 0;
  const saldoLiquido = totalAportes - totalResgates;

  // Comparative table data
  const dadosTabela = CARD_ORDER
    .map((cardId) => {
      const pctAtual = Number(rc.macroAtual[cardId]) || 0;
      const pctMeta = Number(rc.macroMeta[cardId]) || 0;
      const brlAtual = (pctAtual / 100) * patrimonio;
      const brlMeta = (pctMeta / 100) * patrimonioMeta;
      const difBRL = brlMeta - brlAtual;

      return { cardId, label: CARD_META[cardId].label, cor: CARD_META[cardId].cor, pctAtual, brlAtual, pctMeta, brlMeta, difBRL };
    })
    .filter((d) => d.pctAtual > 0 || d.pctMeta > 0);

  // Action plan (exclude manter)
  const actionItems = rc.planoAcao.filter((i) => (i.acao || i.tipo) !== "manter").slice(0, 10);
  const totalVisivel = rc.planoAcao.filter((i) => (i.acao || i.tipo) !== "manter").length;

  const groupedByCard: Record<string, typeof actionItems> = {};
  for (const item of actionItems) {
    const cardLabel = item.card && CARD_META[item.card as keyof typeof CARD_META]
      ? CARD_META[item.card as keyof typeof CARD_META].label
      : (item.card ?? "Outros");
    if (!groupedByCard[cardLabel]) groupedByCard[cardLabel] = [];
    groupedByCard[cardLabel].push(item);
  }


  return (
    <>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#15803D", backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB", borderRadius: 999, padding: "4px 12px" }}>
              ✓ Carteira definida
            </span>
            <span style={{ fontSize: 11, color: "#6B7280", backgroundColor: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 10px" }}>
              {new Date(rc.dataCalculo).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <button
            onClick={() => setCarteiraOpen(true)}
            style={{ fontSize: 12, fontWeight: 600, color: "#000000", backgroundColor: "transparent", border: "1px solid #000000", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}
          >
            Editar carteira →
          </button>
        </div>

        {/* Card 1 — Visão Geral */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Visão Geral</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio Financeiro</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#1E3A8A", margin: 0 }}>{formatCurrency(patrimonio)}</p>
            </div>
            <div style={{ backgroundColor: "#DCFCE7", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#15803D", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Aportar</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(totalAportes)}</p>
            </div>
            <div style={{ backgroundColor: totalResgates > 0 ? "#FEE2E2" : "#F0F7FF", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: totalResgates > 0 ? "#B91C1C" : "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Resgatar</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: totalResgates > 0 ? "#B91C1C" : "#9CA3AF", margin: 0 }}>{formatCurrency(totalResgates)}</p>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, backgroundColor: saldoLiquido >= 0 ? "#DCFCE7" : "#FEE2E2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C", textTransform: "uppercase" }}>
              Saldo Líquido (Aportes − Resgates)
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C" }}>
              {saldoLiquido >= 0 ? "+" : ""}{formatCurrency(saldoLiquido)}
            </span>
          </div>
        </div>

        {/* Card 2 — PieCharts */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Alocação Atual vs Proposta
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px", textAlign: "center", fontWeight: 600 }}>
                Atual — {formatCurrency(patrimonio)}
              </p>
              <DonutChart data={dadosAtual} centerLabel="Atual" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px", textAlign: "center", fontWeight: 600 }}>
                Proposta — {formatCurrency(patrimonioMeta)}
              </p>
              <DonutChart data={dadosMeta} centerLabel="Proposta" />
            </div>
          </div>
        </div>

        {/* Card 3 — Comparative table */}
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 65px 100px 65px 100px 110px", backgroundColor: "#1E3A8A", padding: "10px 20px" }}>
            {["Classe", "% Atual", "R$ Atual", "% Meta", "R$ Meta", "Dif R$"].map((h, i) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i === 0 ? "left" : "right" }}>
                {h}
              </span>
            ))}
          </div>

          {dadosTabela.map((d, idx) => (
              <div
                key={d.cardId}
                style={{ display: "grid", gridTemplateColumns: "1.2fr 65px 100px 65px 100px 110px", padding: "10px 20px", backgroundColor: idx % 2 === 0 ? "white" : "#F0F7FF", borderBottom: "1px solid #F0F7FF", alignItems: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#000000" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.cor, flexShrink: 0 }} />
                  {d.label}
                </div>
                <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>{formatPct(d.pctAtual)}</span>
                <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>{formatBRL(d.brlAtual)}</span>
                <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>{formatPct(d.pctMeta)}</span>
                <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>{formatBRL(d.brlMeta)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: d.difBRL > 0 ? "#15803D" : d.difBRL < 0 ? "#B91C1C" : "#9CA3AF", textAlign: "right" }}>
                  {d.difBRL === 0 ? "—" : `${d.difBRL > 0 ? "+" : ""}${formatBRL(d.difBRL)}`}
                </span>
              </div>
          ))}

          {/* Total row */}
          {dadosTabela.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 65px 100px 65px 100px 110px", padding: "10px 20px", backgroundColor: "#F8FAFC", borderTop: "2px solid #BFDBFE", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Total</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textAlign: "right" }}>
                {formatPct(dadosTabela.reduce((s, d) => s + d.pctAtual, 0))}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textAlign: "right" }}>{formatBRL(patrimonio)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textAlign: "right" }}>
                {formatPct(dadosTabela.reduce((s, d) => s + d.pctMeta, 0))}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textAlign: "right" }}>{formatBRL(patrimonioMeta)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textAlign: "right" }}>—</span>
            </div>
          )}
        </div>

        {/* Card 3B — Seleção de Ativos Recomendados */}
        <CardSelecaoAtivos
          ativosRecomendados={rc.ativosRecomendados ?? []}
          macroMeta={rc.macroMeta ?? {}}
          patrimonio={patrimonioMeta}
          titulo="Como sua carteira deverá ficar"
          subtitulo="Seleção de ativos recomendados por classe"
        />

        {/* Card 4 — Action plan */}
        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>Plano de Ação</p>
            {totalVisivel > 10 && (
              <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>Ver todos ({totalVisivel}) →</span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ backgroundColor: "#DCFCE7", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "#15803D", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total Aportes</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(totalAportes)}</p>
            </div>
            <div style={{ backgroundColor: "#FEE2E2", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "#B91C1C", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total Resgates</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{formatCurrency(totalResgates)}</p>
            </div>
          </div>

          {Object.keys(groupedByCard).length === 0 ? (
            <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "16px 0", margin: 0 }}>Nenhuma movimentação necessária</p>
          ) : (
            Object.entries(groupedByCard).map(([cardLabel, items]) => (
              <div key={cardLabel} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px", paddingBottom: 4, borderBottom: "1px solid #BFDBFE" }}>
                  {cardLabel}
                </p>
                {items.map((item) => {
                  const acaoEfetiva = item.acao || item.tipo || "";
                  const isAportar = item.movimentacaoBRL > 0;
                  const movColor = isAportar ? "#15803D" : "#B91C1C";
                  const movPrefix = isAportar ? "+" : "−";
                  const tipoBg = isAportar ? "#DCFCE7" : "#FEE2E2";
                  const tipoColor = isAportar ? "#15803D" : "#B91C1C";
                  const tipoLabel =
                    acaoEfetiva === "novo" ? "Novo"
                    : acaoEfetiva === "aportar" ? "Aportar"
                    : acaoEfetiva === "resgatar_total" ? "Resgatar total"
                    : "Resgatar parcial";
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F7FF" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: "#000000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nomeAtivo}</span>
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: tipoBg, color: tipoColor }}>{tipoLabel}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: movColor, flexShrink: 0, marginLeft: 12 }}>
                        {movPrefix}{formatCurrency(Math.abs(item.movimentacaoBRL))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Card 5 — Comment */}
        {commentCard}
      </div>

      {carteiraOpen && (
        <FerramentaCarteira
          clientName={clientName}
          clientId={plan.clientId}
          clientProfile={plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null}
          patrimonyInicial={plan.ativosAtuais.total}
          onClose={() => setCarteiraOpen(false)}
          onSave={handleCarteiraSave}
        />
      )}
    </>
  );
}
