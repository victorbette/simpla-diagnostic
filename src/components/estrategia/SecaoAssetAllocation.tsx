import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
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

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelDaClasse(key: string): string {
  const labels: Record<string, string> = {
    resgate_rapido: "Resgate Rápido",
    resgate_longo: "Resgate Longo",
    acoes: "Ações BR",
    fiis: "FIIs",
    exterior: "Internacional",
    cripto: "Cripto",
    rendaFixa: "Renda Fixa",
    rvGlobal: "RV Global",
    rfGlobal: "RF Global",
  };
  return labels[key] ?? key;
}

function corDaClasse(key: string): string {
  const cores: Record<string, string> = {
    resgate_rapido: "#2A4F6A",
    resgate_longo: "#000000",
    acoes: "#3D6B41",
    fiis: "#4A8C4E",
    exterior: "#8A7A45",
    cripto: "#BBA866",
    rendaFixa: "#2A4F6A",
    rvGlobal: "#8A7A45",
    rfGlobal: "#B8A870",
  };
  return cores[key] ?? "#9E9070";
}

// MacroAlocacao keys that map to plan.ativosAtuais fields
const MACRO_KEYS = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"] as const;
type MacroKey = (typeof MACRO_KEYS)[number];

// Map SimplaCardId → MacroKey for action plan grouping
const CARD_TO_MACRO: Record<string, MacroKey> = {
  resgate_rapido: "rendaFixa",
  resgate_longo: "rendaFixa",
  acoes: "acoes",
  fiis: "fiis",
  exterior: "rvGlobal",
  cripto: "cripto",
};

function computeMacroFromRecomendados(ativos: Ativo[], total: number): Record<MacroKey, number> {
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

// ── DonutChart component ───────────────────────────────────────────────────────

interface DonutChartProps {
  data: { name: string; value: number; color: string; key: string }[];
  centerLabel: string;
}

function DonutChart({ data, centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F3EE",
          borderRadius: 8,
          flexDirection: "column",
          gap: 6,
        }}
      >
        <PieChartIcon size={32} color="#BBA866" strokeWidth={1.5} />
        <p style={{ fontSize: 12, color: "#9E9070", margin: 0, textAlign: "center" }}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
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
          <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
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
}: Props) {
  const [carteiraOpen, setCarteiraOpen] = useState(false);

  function handleCarteiraSave(r: CarteiraResultado) {
    // Use the total of recommended assets for macroMeta (avoids 0-division when
    // step 1 was skipped and patrimonyInicial is 0)
    const totalRec =
      r.ativosRecomendados.reduce((s, a) => s + a.valorBRL, 0) || r.patrimonio || 1;

    // Aportes: movimentacaoBRL > 0; Resgates: movimentacaoBRL < 0 (always positive display)
    const totalAportar = r.planoAcao
      .filter((i) => i.movimentacaoBRL > 0)
      .reduce((s, i) => s + i.movimentacaoBRL, 0);
    const totalResgatar = r.planoAcao
      .filter((i) => i.movimentacaoBRL < 0)
      .reduce((s, i) => s + Math.abs(i.movimentacaoBRL), 0);

    onResultadoCarteira({
      patrimonio: r.patrimonio,
      planoAcaoCount: r.planoAcao.length,
      totalAportar,
      totalResgatar,
      macroAtual: computeMacroFromRecomendados(r.ativosAtuais, r.patrimonio || 1),
      macroMeta: computeMacroFromRecomendados(r.ativosRecomendados, totalRec),
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

  // ── Comment card (always visible) ──────────────────────────────────────────
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
              <PieChartIcon size={48} color="#BBA866" strokeWidth={1.5} style={{ marginBottom: 16 }} />
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

  // ATUAL: derived from plan.ativosAtuais (Financial Planning step 2)
  const totalAtual = plan.ativosAtuais?.total ?? 0;
  const dadosAtual = MACRO_KEYS
    .map((k) => ({
      key: k,
      name: labelDaClasse(k),
      value: totalAtual > 0 ? ((plan.ativosAtuais[k] ?? 0) / totalAtual) * 100 : 0,
      color: corDaClasse(k),
    }))
    .filter((d) => d.value > 0.1);

  // PROPOSTA: from resultados.carteira.macroMeta
  const totalMeta = rc.patrimonio;
  const dadosMeta = MACRO_KEYS
    .map((k) => ({
      key: k,
      name: labelDaClasse(k),
      value: parseFloat((rc.macroMeta[k] ?? 0).toFixed(1)),
      color: corDaClasse(k),
    }))
    .filter((d) => d.value > 0.1);

  // Saldo líquido
  const saldoLiquido = rc.totalAportar - rc.totalResgatar;

  // Comparative table — all keys that appear in either source
  const tableKeys = MACRO_KEYS.filter(
    (k) => (plan.ativosAtuais[k] ?? 0) > 0 || (rc.macroMeta[k] ?? 0) > 0.1
  );

  // Action plan grouped by class (max 10, exclude manter)
  const actionItems = rc.planoAcao.filter((i) => i.tipo !== "manter").slice(0, 10);
  const totalVisivel = rc.planoAcao.filter((i) => i.tipo !== "manter").length;

  const groupedByClasse: Record<string, typeof actionItems> = {};
  for (const item of actionItems) {
    const classeKey = item.card ? (CARD_TO_MACRO[item.card] ?? "rendaFixa") : "rendaFixa";
    const label = labelDaClasse(classeKey);
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

        {/* Card 1 — 4 metrics (2×2) */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Visão Geral
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio Atual</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#2A4F6A", margin: 0 }}>{formatCurrency(totalAtual)}</p>
            </div>
            <div style={{ backgroundColor: "#F5F3EE", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B6347", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio Proposto</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#000000", margin: 0 }}>{formatCurrency(totalMeta)}</p>
            </div>
            <div style={{ backgroundColor: "#EBF2EC", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#3D6B41", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Aportar</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#3D6B41", margin: 0 }}>{formatCurrency(rc.totalAportar)}</p>
            </div>
            <div style={{ backgroundColor: "#F9ECEC", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#7A3535", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Resgatar</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#7A3535", margin: 0 }}>{formatCurrency(rc.totalResgatar)}</p>
            </div>
          </div>
          {/* Saldo líquido */}
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              backgroundColor: saldoLiquido >= 0 ? "#EBF2EC" : "#F9ECEC",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: saldoLiquido >= 0 ? "#3D6B41" : "#7A3535", textTransform: "uppercase" }}>
              Saldo Líquido (Aportes − Resgates)
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: saldoLiquido >= 0 ? "#3D6B41" : "#7A3535" }}>
              {saldoLiquido >= 0 ? "+" : ""}{formatCurrency(saldoLiquido)}
            </span>
          </div>
        </div>

        {/* Card 2 — Two donut PieCharts */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Alocação Atual vs Proposta
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontSize: 12, color: "#6B6347", margin: "0 0 8px", textAlign: "center", fontWeight: 600 }}>
                Atual — {formatCurrency(totalAtual)}
              </p>
              <DonutChart data={dadosAtual} centerLabel="Atual" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#6B6347", margin: "0 0 8px", textAlign: "center", fontWeight: 600 }}>
                Proposta — {formatCurrency(totalMeta)}
              </p>
              <DonutChart data={dadosMeta} centerLabel="Proposta" />
            </div>
          </div>
        </div>

        {/* Card 3 — Comparative table */}
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 110px 90px",
              backgroundColor: "#000000",
              padding: "10px 20px",
            }}
          >
            {["Classe", "Atual %", "Proposta %", "Dif. R$", "Ação"].map((h) => (
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
            const brlAtual = plan.ativosAtuais[k] ?? 0;
            const pctAtual = totalAtual > 0 ? (brlAtual / totalAtual) * 100 : 0;
            const pctMeta = rc.macroMeta[k] ?? 0;
            const brlMeta = (pctMeta / 100) * totalMeta;
            const difBRL = brlMeta - brlAtual;
            const isNovo = brlAtual === 0 && brlMeta > 100;
            const acao = isNovo ? "✦ Novo" : difBRL > 100 ? "↑ Aportar" : difBRL < -100 ? "↓ Resgatar" : "→ Manter";
            const acaoBg = acao.includes("Aportar") || acao.includes("Novo") ? "#EBF2EC" : acao.includes("Resgatar") ? "#F9ECEC" : "#F5F3EE";
            const acaoColor = acao.includes("Aportar") || acao.includes("Novo") ? "#3D6B41" : acao.includes("Resgatar") ? "#7A3535" : "#6B6347";
            return (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 110px 90px",
                  padding: "10px 20px",
                  backgroundColor: idx % 2 === 0 ? "white" : "#FAFAF8",
                  borderBottom: "1px solid #F5F3EE",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#000000" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: corDaClasse(k), flexShrink: 0 }} />
                  {labelDaClasse(k)}
                </div>
                <span style={{ fontSize: 12, color: "#6B6347", textAlign: "right" }}>
                  {formatNumber(pctAtual, 1)}%
                </span>
                <span style={{ fontSize: 12, color: "#6B6347", textAlign: "right" }}>
                  {formatNumber(pctMeta, 1)}%
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: difBRL >= 0 ? "#3D6B41" : "#7A3535", textAlign: "right" }}>
                  {difBRL >= 0 ? "+" : ""}{formatCurrency(difBRL)}
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 999,
                      backgroundColor: acaoBg,
                      color: acaoColor,
                      border: `1px solid ${acaoColor}40`,
                      whiteSpace: "nowrap",
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
              <span style={{ fontSize: 12, color: "#8A7A45", fontWeight: 600 }}>
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
                  const isAportar = item.movimentacaoBRL > 0;
                  const movColor = isAportar ? "#3D6B41" : "#7A3535";
                  const movPrefix = isAportar ? "+" : "-";
                  const tipoBg = isAportar ? "#EBF2EC" : "#F9ECEC";
                  const tipoColor = isAportar ? "#3D6B41" : "#7A3535";
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
                        <span style={{ fontSize: 13, color: "#000000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
