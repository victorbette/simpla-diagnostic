import { formatCurrency } from "@/lib/format";
import { calcularIF, PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import type { EstrategiaScores } from "@/lib/estrategiaScores";
import { nivelScore } from "@/lib/estrategiaScores";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  scores: EstrategiaScores;
}

function CircleGauge({ score, size = 72 }: { score: number; size?: number }) {
  const sw = 7;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, score)) / 100);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke="white" strokeWidth={sw}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cx}px` }}
      />
      <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight="700" fill="white">
        {score}
      </text>
    </svg>
  );
}

const AREAS = [
  { id: "aa",     label: "Asset Alloc.",    scoreKey: "aaScore" as const },
  { id: "lf",     label: "Lib. Financeira", scoreKey: "lfScore" as const },
  { id: "ps",     label: "Proteção",        scoreKey: "psScore" as const },
  { id: "fiscal", label: "Fiscal",          scoreKey: "fiscalScore" as const },
];

function buildPanorama(plan: FinancialPlan, resultados: ResultadosEstrategia) {
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const pi = plan.planejamentoIF;
  const items: { icon: string; area: string; color: string; resumo: string; recomendacao: string; score: number }[] = [];

  // AA
  let aaResumo = "Carteira não mapeada";
  let aaRec = "Mapear carteira de investimentos";
  if (resultados.carteira) {
    aaResumo = `Patrimônio de ${formatCurrency(resultados.carteira.patrimonio)}`;
    aaRec = perfil ? `Perfil ${PERFIL_LABELS[perfil]}` : "Revisar alocação";
  }
  items.push({ icon: "🥧", area: "Asset Allocation", color: "#1E40AF", resumo: aaResumo, recomendacao: aaRec, score: 0 });

  // LF
  let lfResumo = "Simulação não executada";
  let lfRec = "Executar simulação de IF";
  if (resultados.if) {
    const pat = formatCurrency(resultados.if.patrimonioAposentadoria);
    lfResumo = `Patrimônio projetado de ${pat} aos ${pi.idadeMeta} anos`;
    lfRec = resultados.if.liberdadeAlcancada
      ? "Meta de IF atingível com aportes atuais"
      : `Aumentar aporte em ${formatCurrency(Math.max(0, resultados.if.aporteAjustado - resultados.if.aporteAtual))}/mês`;
  } else if (pi.rendaMensalDesejada > 0) {
    const simples = calcularIF(pi);
    lfResumo = `Meta: ${formatCurrency(pi.rendaMensalDesejada)}/mês aos ${pi.idadeMeta} anos`;
    lfRec = simples.gap > 0 ? "Aumentar aportes mensais" : "Meta atingível com aportes atuais";
  }
  items.push({ icon: "🏖", area: "Liberdade Financeira", color: "#15803D", resumo: lfResumo, recomendacao: lfRec, score: 0 });

  // Proteção
  let psResumo = "Proteção não calculada";
  let psRec = "Avaliar coberturas";
  if (resultados.seguro) {
    psResumo = resultados.seguro.gap > 0
      ? `Gap de ${formatCurrency(resultados.seguro.gap)} na cobertura`
      : "Coberturas adequadas";
    psRec = resultados.seguro.gap > 0
      ? `Contratar seguro de ${formatCurrency(resultados.seguro.gap)}`
      : "Manter coberturas atuais";
  } else {
    const checks = [plan.protecao.possuiSeguroVida, plan.protecao.possuiSeguroInvalidez, plan.protecao.possuiPlanoSaude];
    const ok = checks.filter(Boolean).length;
    psResumo = `${ok} de 3 coberturas contratadas`;
    psRec = ok < 3 ? "Contratar coberturas faltantes" : "Coberturas básicas presentes";
  }
  items.push({ icon: "🛡", area: "Proteção e Sucessório", color: "#B91C1C", resumo: psResumo, recomendacao: psRec, score: 0 });

  // Fiscal
  let fiscalResumo = "Planejamento fiscal não executado";
  let fiscalRec = "Executar planejamento fiscal";
  if (resultados.fiscal) {
    fiscalResumo = resultados.fiscal.aproveitandoTeto
      ? "PGBL maximizado"
      : `Espaço disponível de ${formatCurrency(resultados.fiscal.espacoDisponivelMensal)}/mês`;
    fiscalRec = resultados.fiscal.aproveitandoTeto
      ? "Manter aportes no PGBL"
      : `Economia potencial de ${formatCurrency(resultados.fiscal.economiaAnual)}/ano`;
  }
  items.push({ icon: "🧾", area: "Planejamento Fiscal", color: "#2563EB", resumo: fiscalResumo, recomendacao: fiscalRec, score: 0 });

  return items;
}

export function DocSumario({ plan, resultados, clientName, scores }: Props) {
  const panorama = buildPanorama(plan, resultados);
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="doc-page" style={{ background: "white", minHeight: "297mm" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, background: "#1E3A8A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "white", flexShrink: 0 }}>
          📋
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Sumário Executivo</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>Visão consolidada da estratégia · {clientName} · {data}</p>
        </div>
      </div>

      {/* Score geral */}
      <div style={{ background: "#1E3A8A", borderRadius: 12, padding: "24px 32px", marginBottom: 28, display: "flex", alignItems: "center", gap: 32 }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 64, fontWeight: 800, color: "white", lineHeight: 1 }}>{scores.overall}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#93C5FD" }}>/100 Score Geral</p>
        </div>
        <div style={{ width: 1, background: "rgba(255,255,255,0.2)", alignSelf: "stretch" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, flex: 1 }}>
          {AREAS.map((a) => {
            const s = scores[a.scoreKey];
            const nv = nivelScore(s);
            return (
              <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <CircleGauge score={s} size={64} />
                <p style={{ margin: 0, fontSize: 11, color: "#93C5FD", textAlign: "center" }}>{a.label}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999, backgroundColor: nv.bg, color: nv.color }}>
                  {nv.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panorama por área */}
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Panorama por área
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {panorama.map((item) => (
          <div key={item.area} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "#F8FAFF", borderRadius: 8, border: "0.5px solid #BFDBFE" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: item.color }}>{item.area}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#374151" }}>{item.resumo}</p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#6B7280", maxWidth: 200, textAlign: "right", fontStyle: "italic" }}>
              {item.recomendacao}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
