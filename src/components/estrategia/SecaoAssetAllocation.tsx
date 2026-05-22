import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira, MacroAlocacao } from "@/types/estrategiaResultados";
import type { CarteiraResultado, Ativo } from "@/lib/carteira/types";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoCarteira: ResultadoCarteira | null;
  onResultadoCarteira: (r: ResultadoCarteira) => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const ASSET_KEYS: (keyof MacroAlocacao)[] = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"];
const ASSET_LABELS: Record<keyof MacroAlocacao, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações BR",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};
const ASSET_COLORS: Record<keyof MacroAlocacao, string> = {
  rendaFixa: "#2A4F6A",
  acoes: "#3D6B41",
  fiis: "#4A6B3D",
  rvGlobal: "#000000",
  rfGlobal: "#6B6347",
  cripto: "#BBA866",
};
const CARD_TO_CLASSE: Record<string, keyof MacroAlocacao> = {
  resgate_rapido: "rendaFixa",
  resgate_longo: "rendaFixa",
  acoes: "acoes",
  fiis: "fiis",
  exterior: "rvGlobal",
  cripto: "cripto",
};

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

function computeMacro(ativos: Ativo[], total: number): MacroAlocacao {
  const soma: Record<string, number> = {};
  for (const a of ativos) soma[a.card] = (soma[a.card] ?? 0) + a.valorBRL;
  const t = total || 1;
  return {
    rendaFixa: ((soma["resgate_rapido"] ?? 0) + (soma["resgate_longo"] ?? 0)) / t * 100,
    acoes: (soma["acoes"] ?? 0) / t * 100,
    fiis: (soma["fiis"] ?? 0) / t * 100,
    rvGlobal: (soma["exterior"] ?? 0) / t * 100,
    rfGlobal: 0,
    cripto: (soma["cripto"] ?? 0) / t * 100,
  };
}

interface DonutChartProps {
  data: { name: string; value: number; color: string; key: string }[];
  centerLabel: string;
}

function DonutChart({ data, centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            strokeWidth={1.5}
            stroke="white"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                const vb = viewBox as { cx?: number; cy?: number };
                const cx = vb.cx ?? 0;
                const cy = vb.cy ?? 0;
                return (
                  <text textAnchor="middle">
                    <tspan x={cx} y={cy - 7} fontSize={10} fill="#6B6347">
                      {centerLabel}
                    </tspan>
                    <tspan x={cx} y={cy + 11} fontSize={15} fontWeight="700" fill="#000000">
                      {total.toFixed(0)}%
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
          <Tooltip formatter={(v) => [`${v}%`]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", justifyContent: "center", marginTop: 4 }}>
        {data.map((d) => (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6347" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
            {d.name} {d.value.toFixed(0)}%
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecaoAssetAllocation({
  plan,
  clientName,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoCarteira,
  onResultadoCarteira,
}: Props) {
  const [carteiraOpen, setCarteiraOpen] = useState(false);

  function handleCarteiraSave(r: CarteiraResultado) {
    const total = r.patrimonio || 1;
    const totalAportar = r.planoAcao
      .filter((i) => i.tipo === "aportar" || i.tipo === "novo_ativo")
      .reduce((s, i) => s + i.movimentacaoBRL, 0);
    const totalResgatar = r.planoAcao
      .filter((i) => i.tipo === "resgatar_parcial" || i.tipo === "resgatar_total")
      .reduce((s, i) => s + Math.abs(i.movimentacaoBRL), 0);
    onResultadoCarteira({
      patrimonio: r.patrimonio,
      planoAcaoCount: r.planoAcao.length,
      totalAportar,
      totalResgatar,
      macroAtual: computeMacro(r.ativosAtuais, total),
      macroMeta: computeMacro(r.ativosRecomendados, total),
      planoAcao: r.planoAcao.map((i) => ({
        id: i.id,
        card: i.card,
        nomeAtivo: i.nomeAtivo,
        segmento: i.segmento,
        tipo: i.tipo,
        valorAtualBRL: i.valorAtualBRL,
        valorMetaBRL: i.valorMetaBRL,
        movimentacaoBRL: i.movimentacaoBRL,
        prioridade: i.prioridade,
      })),
      dataCalculo: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    });
    setCarteiraOpen(false);
  }

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  const commentCard = (
    <div
      style={{
        ...CARD,
        borderLeft: "4px solid #000000",
        borderRadius: 0,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Estratégia e Recomendações
      </p>
      <div style={{ position: "relative" }}>
        <textarea
          value={comentario}
          onChange={(e) => onComentarioChange(e.target.value)}
          placeholder="Descreva a estratégia de asset allocation recomendada: rebalanceamento, classes de ativos prioritários, instrumentos sugeridos..."
          style={{
            width: "100%",
            minHeight: 160,
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #E2DCC8",
            fontSize: 13,
            color: "#000000",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9E9070" }}>
          {comentario.length} caracteres
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B6347", marginRight: 4 }}>Tags:</span>
        {AVAILABLE_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 999,
              cursor: "pointer",
              border: "1px solid #E2DCC8",
              backgroundColor: tags.includes(t) ? "#000000" : "transparent",
              color: tags.includes(t) ? "white" : "#3D3520",
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  // ── State A — carteira not defined ─────────────────────────────────────────
  if (!resultadoCarteira) {
    return (
      <>
        <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                backgroundColor: "white",
                border: "2px dashed #BBA866",
                borderRadius: 12,
                padding: "40px 32px",
                textAlign: "center",
                maxWidth: 480,
                width: "100%",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <PieChartIcon
                size={48}
                color="#BBA866"
                strokeWidth={1.5}
                style={{ marginBottom: 16 }}
              />
              <p style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 8px" }}>
                Carteira não definida
              </p>
              <p style={{ fontSize: 13, color: "#6B6347", margin: "0 0 20px", lineHeight: 1.6 }}>
                Use a ferramenta de carteira para definir a alocação atual e recomendada do cliente, gerar o plano de ação e consolidar o resultado.
              </p>
              <button
                onClick={() => setCarteiraOpen(true)}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#000000",
                  color: "white",
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                }}
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
          />
        )}
      </>
    );
  }

  // ── State B — carteira defined ─────────────────────────────────────────────
  const rc = resultadoCarteira;

  function makePieData(macro: MacroAlocacao) {
    return ASSET_KEYS
      .map((k) => ({ name: ASSET_LABELS[k], value: parseFloat(macro[k].toFixed(1)), color: ASSET_COLORS[k], key: k }))
      .filter((d) => d.value > 0.1);
  }

  const pieAtual = makePieData(rc.macroAtual);
  const pieMeta = makePieData(rc.macroMeta);

  const tableKeys = ASSET_KEYS.filter((k) => rc.macroAtual[k] > 0.5 || rc.macroMeta[k] > 0.5);

  const actionItems = rc.planoAcao.filter((i) => i.tipo !== "manter").slice(0, 10);
  const totalVisivel = rc.planoAcao.filter((i) => i.tipo !== "manter").length;

  const groupedByClasse: Record<string, typeof actionItems> = {};
  for (const item of actionItems) {
    const classeKey = item.card ? (CARD_TO_CLASSE[item.card] ?? "rendaFixa") : "rendaFixa";
    const label = ASSET_LABELS[classeKey];
    if (!groupedByClasse[label]) groupedByClasse[label] = [];
    groupedByClasse[label].push(item);
  }

  return (
    <>
      <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "#3D6B41",
                backgroundColor: "#EBF2EC",
                border: "1px solid #A7C9AB",
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              ✓ Carteira definida
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#6B6347",
                backgroundColor: "#F5F3EE",
                border: "1px solid #E2DCC8",
                borderRadius: 999,
                padding: "2px 10px",
              }}
            >
              {new Date(rc.dataCalculo).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <button
            onClick={() => setCarteiraOpen(true)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#000000",
              backgroundColor: "transparent",
              border: "1px solid #000000",
              borderRadius: 6,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Editar carteira →
          </button>
        </div>

        {/* Card 1 — 3 metrics */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Visão Geral
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#2A4F6A", margin: 0 }}>{formatCurrency(rc.patrimonio)}</p>
            </div>
            <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Aportar</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#3D6B41", margin: 0 }}>{formatCurrency(rc.totalAportar)}</p>
            </div>
            <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Resgatar</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#7A3535", margin: 0 }}>{formatCurrency(rc.totalResgatar)}</p>
            </div>
          </div>
        </div>

        {/* Card 2 — Two donut PieCharts */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Alocação Atual vs Proposta
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontSize: 12, color: "#6B6347", margin: "0 0 8px", textAlign: "center", fontWeight: 600 }}>Atual</p>
              <DonutChart data={pieAtual} centerLabel="Atual" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#6B6347", margin: "0 0 8px", textAlign: "center", fontWeight: 600 }}>Proposta</p>
              <DonutChart data={pieMeta} centerLabel="Proposta" />
            </div>
          </div>
        </div>

        {/* Card 3 — Comparative table */}
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 72px 72px 108px 88px",
              backgroundColor: "#000000",
              padding: "10px 20px",
            }}
          >
            {["Classe", "Atual", "Proposta", "Dif. R$", "Ação"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  textAlign: h === "Classe" ? "left" : "right",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {tableKeys.map((k, idx) => {
            const atual = rc.macroAtual[k];
            const meta = rc.macroMeta[k];
            const difPct = meta - atual;
            const difBRL = (difPct / 100) * rc.patrimonio;
            const acao = difBRL > 500 ? "Aportar" : difBRL < -500 ? "Resgatar" : "Manter";
            const acaoBg = acao === "Aportar" ? "#EBF2EC" : acao === "Resgatar" ? "#F9ECEC" : "#F5F3EE";
            const acaoColor = acao === "Aportar" ? "#3D6B41" : acao === "Resgatar" ? "#7A3535" : "#6B6347";
            return (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 72px 72px 108px 88px",
                  padding: "10px 20px",
                  backgroundColor: idx % 2 === 0 ? "white" : "#FAFAF8",
                  borderBottom: "1px solid #F5F3EE",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#000000" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ASSET_COLORS[k], flexShrink: 0 }} />
                  {ASSET_LABELS[k]}
                </div>
                <span style={{ fontSize: 12, color: "#6B6347", textAlign: "right" }}>{formatNumber(atual, 1)}%</span>
                <span style={{ fontSize: 12, color: "#6B6347", textAlign: "right" }}>{formatNumber(meta, 1)}%</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: difBRL >= 0 ? "#3D6B41" : "#7A3535", textAlign: "right" }}>
                  {difBRL >= 0 ? "+" : ""}{formatCurrency(difBRL)}
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor: acaoBg,
                      color: acaoColor,
                      border: `1px solid ${acaoColor}40`,
                    }}
                  >
                    {acao}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card 4 — Action plan */}
        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Plano de Ação
            </p>
            {totalVisivel > 10 && (
              <span style={{ fontSize: 12, color: "#8A7A45", fontWeight: 600, cursor: "default" }}>
                Ver todos ({totalVisivel}) →
              </span>
            )}
          </div>

          {/* Totals summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ backgroundColor: "#EBF2EC", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "#3D6B41", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total Aportes</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#3D6B41", margin: 0 }}>{formatCurrency(rc.totalAportar)}</p>
            </div>
            <div style={{ backgroundColor: "#F9ECEC", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "#7A3535", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total Resgates</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#7A3535", margin: 0 }}>{formatCurrency(rc.totalResgatar)}</p>
            </div>
          </div>

          {/* Items grouped by class */}
          {Object.keys(groupedByClasse).length === 0 ? (
            <p style={{ fontSize: 13, color: "#9E9070", textAlign: "center", padding: "16px 0", margin: 0 }}>
              Nenhuma movimentação necessária
            </p>
          ) : (
            Object.entries(groupedByClasse).map(([classeLabel, items]) => (
              <div key={classeLabel} style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B6347",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    margin: "0 0 6px",
                    paddingBottom: 4,
                    borderBottom: "1px solid #E2DCC8",
                  }}
                >
                  {classeLabel}
                </p>
                {items.map((item) => {
                  const isAportar = item.tipo === "aportar" || item.tipo === "novo_ativo";
                  const isResgatar = item.tipo === "resgatar_parcial" || item.tipo === "resgatar_total";
                  const movColor = isAportar ? "#3D6B41" : isResgatar ? "#7A3535" : "#000000";
                  const movPrefix = isAportar ? "+" : "-";
                  const tipoBg = isAportar ? "#EBF2EC" : isResgatar ? "#F9ECEC" : "#F5F3EE";
                  const tipoColor = isAportar ? "#3D6B41" : isResgatar ? "#7A3535" : "#6B6347";
                  const tipoLabel =
                    item.tipo === "novo_ativo" ? "Novo"
                    : item.tipo === "aportar" ? "Aportar"
                    : item.tipo === "resgatar_total" ? "Resgatar total"
                    : "Resgatar parcial";
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid #F5F3EE",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 13,
                            color: "#000000",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.nomeAtivo}
                        </span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 999,
                            backgroundColor: tipoBg,
                            color: tipoColor,
                          }}
                        >
                          {tipoLabel}
                        </span>
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
