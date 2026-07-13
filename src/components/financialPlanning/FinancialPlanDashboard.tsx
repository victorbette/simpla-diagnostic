import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import { CARD_ORDER } from "@/lib/carteira/types";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

// ─ Props ─────────────────────────────────────────────────────────────────────

interface FinancialPlanDashboardProps {
  plan: FinancialPlan;
  clientName: string;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onPrint: (type: "advisor" | "client") => void;
  onAvancarEstrategia: () => void;
  allStepsDone?: boolean;
  ultimoSalvo?: Date | null;
  resultados: ResultadosEstrategia;
}

// ─ Nível por score ─────────────────────────────────────────────────────────

function nivelScore(score: number): { label: string; cor: string; bg: string } {
  if (score === 0)  return { label: "Não analisado", cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 40)  return { label: "Em risco",      cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 60)  return { label: "Atenção",       cor: "#B45309", bg: "#FEF3C7" };
  if (score <= 80)  return { label: "Adequado",      cor: "#2563EB", bg: "#DBEAFE" };
  return              { label: "Excelente",     cor: "#15803D", bg: "#DCFCE7" };
}

// ─ Main Component ────────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  resultados,
}: FinancialPlanDashboardProps) {
  const dc = plan.dadosCliente;

  // ── Dados salvos das ferramentas ─────────────────────────────────────────
  const ifSalvo       = resultados.if;
  const seguroSalvo   = resultados.seguro;
  const fiscalSalvo   = resultados.fiscal;
  const carteiraSalva = resultados.carteira;

  // ── Score Aposentadoria ──────────────────────────────────────────────────
  const scoreAposentadoria = (() => {
    if (!ifSalvo) return 0;
    const { patrimonioNecessario, patrimonioAposentadoria } = ifSalvo;
    if (!patrimonioNecessario) return 0;
    if (patrimonioAposentadoria >= patrimonioNecessario) return 100;
    return Math.round((patrimonioAposentadoria / patrimonioNecessario) * 100);
  })();

  // ── Score Proteção ────────────────────────────────────────────────────────
  const scoreProtecao = (() => {
    if (!seguroSalvo) return 0;
    const capitalNecessario = seguroSalvo.totalNeed ?? 0;
    const capitalAtual = seguroSalvo.totalCoverage ?? 0;
    if (!capitalNecessario) return 0;
    if (capitalAtual >= capitalNecessario) return 100;
    return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
  })();

  // ── Score Tributário ──────────────────────────────────────────────────────
  const scoreTributario = (() => {
    if (!fiscalSalvo) return 0;
    const { economiaAnual, tetoPGBLAnual, aporteAnual } = fiscalSalvo;
    if (tetoPGBLAnual === 0) return 50;
    if (economiaAnual > 0) {
      const aproveitamento = Math.min(aporteAnual / tetoPGBLAnual, 1) * 100;
      return Math.round(aproveitamento);
    }
    return 20;
  })();

  // ── Score Asset Allocation ────────────────────────────────────────────────
  const scoreAA = (() => {
    if (!carteiraSalva) return 0;
    const { macroAtual, macroMeta } = carteiraSalva;
    if (!macroAtual || !macroMeta || Object.keys(macroAtual).length === 0) return 0;
    const desvios = CARD_ORDER.map((id) => Math.abs((macroAtual[id] ?? 0) - (macroMeta[id] ?? 0)));
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    return Math.max(0, Math.round(100 - desvioMedio * 3));
  })();

  // ── Score Geral ───────────────────────────────────────────────────────────
  const scoresAtivos = [
    ifSalvo       ? scoreAposentadoria : null,
    carteiraSalva ? scoreAA            : null,
    seguroSalvo   ? scoreProtecao      : null,
    fiscalSalvo   ? scoreTributario    : null,
  ].filter((s): s is number => s !== null);

  const scoreGeral = scoresAtivos.length > 0
    ? Math.round(scoresAtivos.reduce((a, v) => a + v, 0) / scoresAtivos.length)
    : null;

  const nivelGeral = nivelScore(scoreGeral ?? 0);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const perfil = dc.suitabilityPerfil;

  // ── Dados para o radar ─────────────────────────────────────────────────────
  const dadosRadar = [
    { area: "Liberdade Financeira", score: scoreAposentadoria },
    { area: "Asset Allocation",     score: scoreAA },
    { area: "Proteção",             score: scoreProtecao },
    { area: "Tributário",           score: scoreTributario },
  ];

  // ── Textos analíticos por área ─────────────────────────────────────────────

  const textoAposentadoria = (() => {
    if (!ifSalvo) {
      return "Simulação de liberdade financeira ainda não realizada. Acesse a aba Liberdade Financeira para configurar sua projeção patrimonial.";
    }
    const { patrimonioAposentadoria: projecao, patrimonioNecessario: meta, rendaMensalDesejada: renda, idadeMeta: idadeAlvo } = ifSalvo;
    if (projecao >= meta) {
      return `Com o aporte atual, sua projeção de patrimônio aos ${idadeAlvo} anos é de ${formatCurrency(projecao)}, superando o patrimônio necessário de ${formatCurrency(meta)} para sustentar uma renda de ${formatCurrency(renda)}/mês. Sua meta de liberdade financeira está no caminho certo.`;
    }
    return `Sua projeção de patrimônio aos ${idadeAlvo} anos é de ${formatCurrency(projecao)}, abaixo do necessário ${formatCurrency(meta)} para uma renda mensal de ${formatCurrency(renda)}. Para alcançar a meta de liberdade financeira, é necessário aumentar aportes ou ajustar a estratégia de investimentos.`;
  })();

  const textoAA = (() => {
    if (!carteiraSalva) {
      return "Análise de carteira ainda não realizada. Acesse a aba Asset Allocation para registrar seus investimentos e definir a alocação ideal.";
    }
    const { patrimonio, macroAtual, macroMeta } = carteiraSalva;
    const desvios = CARD_ORDER.map((id) => Math.abs((macroAtual[id] ?? 0) - (macroMeta[id] ?? 0)));
    const desvioMedio = desvios.reduce((s, d) => s + d, 0) / desvios.length;
    const alinhado = desvioMedio < 5;
    const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
    return `Patrimônio financeiro atual de ${formatCurrency(patrimonio)}, com perfil ${perfilLabel}. A alocação proposta segue o padrão Simpla Invest para o seu perfil. ${alinhado ? "Carteira alinhada com a meta." : "Há desvios na alocação atual que podem ser corrigidos com o plano de ação definido."}`;
  })();

  const textoProtecao = (() => {
    if (!seguroSalvo) {
      return "Análise de proteção ainda não realizada. Acesse a aba Proteção e Sucessório para mapear suas necessidades de cobertura.";
    }
    const capitalNecessario = seguroSalvo.totalNeed ?? 0;
    const capitalAtual = seguroSalvo.totalCoverage ?? 0;
    const gap = seguroSalvo.gap ?? Math.max(0, capitalNecessario - capitalAtual);
    if (capitalAtual >= capitalNecessario) {
      return `Sua cobertura de ${formatCurrency(capitalAtual)} é adequada para proteger sua família. O capital necessário estimado é de ${formatCurrency(capitalNecessario)}.`;
    }
    return `Foi identificado um gap de proteção de ${formatCurrency(gap)}. Sua cobertura atual de ${formatCurrency(capitalAtual)} é inferior ao capital necessário de ${formatCurrency(capitalNecessario)} para proteger sua família.`;
  })();

  const textoTributario = (() => {
    if (!fiscalSalvo) {
      return "Análise tributária ainda não realizada. Acesse a aba Planejamento Tributário para simular o diferimento fiscal via PGBL.";
    }
    const { economiaAnual, tetoPGBLAnual } = fiscalSalvo;
    if (economiaAnual > 0) {
      return `Com a estratégia PGBL simulada, a economia fiscal estimada é de ${formatCurrency(economiaAnual)}/ano (${formatCurrency(economiaAnual / 12)}/mês). O teto disponível para dedução é de ${formatCurrency(tetoPGBLAnual)}/ano.`;
    }
    return "Não foi identificada oportunidade de diferimento fiscal com os dados informados. Verifique o tipo de declaração e a renda na calculadora tributária.";
  })();

  // ── Definição dos cards ────────────────────────────────────────────────────

  const areaCards = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",   score: scoreAposentadoria, temDados: !!ifSalvo },
    { icone: "ti-chart-pie", nome: "Asset Allocation",       score: scoreAA,            temDados: !!carteiraSalva },
    { icone: "ti-shield",    nome: "Proteção e Sucessório",  score: scoreProtecao,      temDados: !!seguroSalvo },
    { icone: "ti-receipt",   nome: "Tributário",             score: scoreTributario,    temDados: !!fiscalSalvo },
  ];

  const textCards = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",      texto: textoAposentadoria, score: scoreAposentadoria, temDados: !!ifSalvo },
    { icone: "ti-chart-pie", nome: "Asset Allocation",          texto: textoAA,            score: scoreAA,            temDados: !!carteiraSalva },
    { icone: "ti-shield",    nome: "Proteção e Sucessório",     texto: textoProtecao,      score: scoreProtecao,      temDados: !!seguroSalvo },
    { icone: "ti-receipt",   nome: "Planejamento Tributário",   texto: textoTributario,    score: scoreTributario,    temDados: !!fiscalSalvo },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", padding: "24px 32px", boxSizing: "border-box" }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{clientName}</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 10px" }}>Diagnóstico · {hoje}</p>
            {perfil && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF" }}>
                Perfil: {PERFIL_LABELS[perfil]}
              </span>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>
              Score Geral
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "center" }}>
              <span style={{ fontSize: 48, fontWeight: 700, color: "#111827", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {scoreGeral !== null ? scoreGeral : "—"}
              </span>
              {scoreGeral !== null && <span style={{ fontSize: 16, color: "#9CA3AF" }}>/100</span>}
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: nivelGeral.bg, color: nivelGeral.cor }}>
                {scoreGeral !== null ? nivelGeral.label : "Sem análise"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RADAR + SCORES COMPACTOS ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Gráfico em teia */}
        <div style={{ backgroundColor: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "0.5px solid #E5E7EB" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>
            Visão Geral por Área
          </p>
          <ResponsiveContainer width="100%" height={420}>
            <RadarChart data={dadosRadar} margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
              <PolarGrid stroke="#E5E7EB" gridType="polygon" />
              <PolarAngleAxis
                dataKey="area"
                tick={{ fontSize: 13, fill: "#374151", fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                tickCount={5}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#2563EB"
                fill="#2563EB"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ fill: "#2563EB", r: 4 }}
              />
              <Tooltip
                formatter={(v: unknown) => [`${v}/100`, "Score"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E5E7EB" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 4 scores compactos */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          {areaCards.map(({ icone, nome, score, temDados }) => {
            const barColor = !temDados ? "#E5E7EB"
              : score >= 75 ? "#15803D"
              : score >= 50 ? "#F59E0B"
              : score > 0   ? "#B91C1C"
              : "#E5E7EB";
            const textColor = !temDados ? "#9CA3AF"
              : score >= 75 ? "#15803D"
              : score >= 50 ? "#B45309"
              : score > 0   ? "#B91C1C"
              : "#9CA3AF";
            return (
              <div
                key={nome}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", background: "white",
                  border: "0.5px solid #E5E7EB", borderRadius: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className={`ti ${icone}`} style={{ fontSize: 16, color: "#2563EB" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{nome}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 80, height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${temDados ? score : 0}%`, height: "100%",
                      background: barColor, borderRadius: 99,
                      transition: "width 600ms ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textColor, minWidth: 36, textAlign: "right" }}>
                    {temDados ? score : "—"}
                  </span>
                </div>
              </div>
            );
          })}

          {scoreGeral !== null && (
            <div style={{
              marginTop: 4, padding: "12px 16px",
              background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>Score Geral</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{scoreGeral}/100</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, backgroundColor: nivelGeral.bg, color: nivelGeral.cor }}>
                  {nivelGeral.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CARDS ANALÍTICOS POR ÁREA ─────────────────────────────────────────── */}
      {textCards.map(({ icone, nome, texto, score, temDados }) => {
        const n = nivelScore(temDados ? score : 0);
        return (
          <div
            key={nome}
            style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${icone}`} style={{ fontSize: 18, color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{nome}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: n.cor, background: n.bg, padding: "3px 10px", borderRadius: 99 }}>
                {n.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: 0 }}>
              {texto}
            </p>
          </div>
        );
      })}

    </div>
  );
}
