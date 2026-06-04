import { formatCurrency } from "@/lib/format";
import { calcularIF, PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import type { EstrategiaScores } from "@/lib/estrategiaScores";
import { nivelScore } from "@/lib/estrategiaScores";
import { RodapePagina } from "./RodapePagina";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  scores: EstrategiaScores;
}

const TOC_ITEMS = [
  { num: 1, label: "Capa e Identificação",       icon: "ti-file"            },
  { num: 2, label: "Carta ao Cliente",            icon: "ti-mail"            },
  { num: 3, label: "Sumário Executivo",           icon: "ti-clipboard-list"  },
  { num: 4, label: "Liberdade Financeira",        icon: "ti-beach"           },
  { num: 5, label: "Asset Allocation",            icon: "ti-chart-pie"       },
  { num: 6, label: "Proteção e Sucessório",       icon: "ti-shield"          },
  { num: 7, label: "Planejamento Fiscal",         icon: "ti-receipt"         },
  { num: 8, label: "Próximos Passos",             icon: "ti-list-checks"     },
  { num: 9, label: "Mãos à Obra",                icon: "ti-rocket"          },
];

const AREAS_SCORE = [
  { id: "aa",     label: "Asset Alloc.",    scoreKey: "aaScore" as const,     icon: "ti ti-chart-pie"    },
  { id: "lf",     label: "Lib. Financeira", scoreKey: "lfScore" as const,     icon: "ti ti-beach"        },
  { id: "ps",     label: "Proteção",        scoreKey: "psScore" as const,     icon: "ti ti-shield"       },
  { id: "fiscal", label: "Fiscal",          scoreKey: "fiscalScore" as const, icon: "ti ti-receipt"      },
];

function CircleGauge({ score, size = 56 }: { score: number; size?: number }) {
  const sw = 6;
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
      <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="700" fill="white">
        {score}
      </text>
    </svg>
  );
}

function buildPanorama(plan: FinancialPlan, resultados: ResultadosEstrategia) {
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const pi = plan.planejamentoIF;
  const items: { icon: string; area: string; color: string; resumo: string; recomendacao: string }[] = [];

  // AA
  let aaResumo = "Carteira não mapeada";
  let aaRec = "Mapear carteira de investimentos";
  if (resultados.carteira) {
    aaResumo = `Patrimônio de ${formatCurrency(resultados.carteira.patrimonio)}`;
    aaRec = perfil ? `Perfil ${PERFIL_LABELS[perfil]}` : "Revisar alocação";
  }
  items.push({ icon: "ti ti-chart-pie", area: "Asset Allocation", color: "#1E40AF", resumo: aaResumo, recomendacao: aaRec });

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
  items.push({ icon: "ti ti-beach", area: "Liberdade Financeira", color: "#15803D", resumo: lfResumo, recomendacao: lfRec });

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
  items.push({ icon: "ti ti-shield", area: "Proteção e Sucessório", color: "#B91C1C", resumo: psResumo, recomendacao: psRec });

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
  items.push({ icon: "ti ti-receipt", area: "Planejamento Fiscal", color: "#2563EB", resumo: fiscalResumo, recomendacao: fiscalRec });

  return items;
}

export function DocSumario({ plan, resultados, clientName, scores }: Props) {
  const panorama = buildPanorama(plan, resultados);
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="doc-page page-break-before" style={{ background: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, background: "#1E3A8A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 22 }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Sumário Executivo</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
            Visão consolidada da estratégia · {clientName} · {data}
          </p>
        </div>
      </div>

      {/* TOC */}
      <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Índice do documento
      </p>
      <div style={{ marginBottom: 28, border: "0.5px solid #BFDBFE", borderRadius: 8, overflow: "hidden" }}>
        {TOC_ITEMS.map((item, idx) => (
          <div
            key={item.num}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 16px",
              background: idx % 2 === 0 ? "#F8FAFF" : "white",
              borderBottom: idx < TOC_ITEMS.length - 1 ? "0.5px solid #EFF6FF" : "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#93C5FD",
                width: 18,
                textAlign: "right",
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {item.num}
            </span>
            <i className={`ti ${item.icon}`} style={{ fontSize: 14, color: "#60A5FA", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{item.label}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#1E3A8A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {item.num}
            </span>
          </div>
        ))}
      </div>

      {/* Score geral */}
      <div style={{ background: "#1E3A8A", borderRadius: 12, padding: "20px 28px", marginBottom: 24, display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 56, fontWeight: 800, color: "white", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {scores.overall}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#93C5FD" }}>/100 Score Geral</p>
        </div>
        <div style={{ width: 1, background: "rgba(255,255,255,0.2)", alignSelf: "stretch" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, flex: 1 }}>
          {AREAS_SCORE.map((a) => {
            const s = scores[a.scoreKey];
            const nv = nivelScore(s);
            return (
              <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <CircleGauge score={s} size={56} />
                <p style={{ margin: 0, fontSize: 10, color: "#93C5FD", textAlign: "center" }}>{a.label}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999, backgroundColor: nv.bg, color: nv.color }}>
                  {nv.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panorama por área */}
      <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Panorama por área
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {panorama.map((item) => (
          <div
            key={item.area}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 14px",
              background: "#F8FAFF",
              borderRadius: 8,
              border: "0.5px solid #BFDBFE",
            }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 7, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={item.icon} style={{ fontSize: 15, color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: item.color }}>{item.area}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#374151" }}>{item.resumo}</p>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#6B7280", flexShrink: 0, maxWidth: 180, textAlign: "right", fontStyle: "italic" }}>
              {item.recomendacao}
            </p>
          </div>
        ))}
      </div>

      <RodapePagina pagina={3} clientName={clientName} />
    </div>
  );
}
