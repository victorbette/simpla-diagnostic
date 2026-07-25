import { formatCurrency } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import type { PontoProjecao } from "@/lib/financialFreedomCalc";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/** SVG estático para impressão — sem Recharts/ResizeObserver, renderiza perfeitamente no PDF */
function GraficoIFDoc({
  projecao,
  patrimonioNecessario,
  mesIF,
}: {
  projecao: PontoProjecao[];
  patrimonioNecessario?: number;
  mesIF?: number;
}) {
  const W = 600, H = 200;
  const P = { t: 20, r: 16, b: 28, l: 56 };
  const pw = W - P.l - P.r;
  const ph = H - P.t - P.b;

  const pts = projecao.filter(p => Number(p.idade) <= 90);
  if (!pts.length) return null;

  const maxVal = Math.max(...pts.map(p => Number(p.patrimonio) || 0), patrimonioNecessario ?? 0, 1);
  const STEP = 500_000;
  const yMax = Math.ceil((maxVal * 1.1) / STEP) * STEP || STEP;

  const x0 = pts[0].mes;
  const xRange = (pts[pts.length - 1].mes - x0) || 1;
  const toX = (m: number) => P.l + ((m - x0) / xRange) * pw;
  const toY = (v: number) => P.t + ph * (1 - Math.min(v, yMax) / yMax);
  const baseY = P.t + ph;

  // Sample every 6th month for a lighter path
  const sampled = pts.filter((_, i) => i % 6 === 0 || i === pts.length - 1);
  const pathD = sampled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.mes).toFixed(1)},${toY(Number(p.patrimonio)).toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L ${toX(sampled[sampled.length - 1].mes).toFixed(1)},${baseY} L ${toX(sampled[0].mes).toFixed(1)},${baseY} Z`;

  const allYTicks: number[] = [];
  for (let v = 0; v <= yMax; v += STEP) allYTicks.push(v);
  const stride = Math.max(1, Math.ceil(allYTicks.length / 6));
  const yTicks = allYTicks.filter((_, i) => i % stride === 0 || i === allYTicks.length - 1);

  const seenAges = new Set<number>();
  const xTicks: { x: number; label: string }[] = [];
  for (const p of pts) {
    const age = Math.floor(Number(p.idade));
    if (age % 5 === 0 && !seenAges.has(age)) {
      seenAges.add(age);
      xTicks.push({ x: toX(p.mes), label: String(age) });
    }
  }

  const fmtV = (v: number) => {
    if (v === 0) return "0";
    if (v >= 1_000_000) {
      const m = v / 1_000_000;
      return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`;
    }
    return `${Math.round(v / 1_000)}K`;
  };

  const ifPt = mesIF !== undefined ? pts.find(p => p.mes === mesIF) : undefined;
  const metaY = patrimonioNecessario && patrimonioNecessario > 0 ? toY(patrimonioNecessario) : null;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="gradDocLF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#2563EB" stopOpacity={0.08} />
        </linearGradient>
      </defs>

      {yTicks.map(v => (
        <line key={v} x1={P.l} y1={toY(v)} x2={P.l + pw} y2={toY(v)} stroke="#F3F4F6" strokeWidth={1} />
      ))}

      <path d={areaD} fill="url(#gradDocLF)" />
      <path d={pathD} fill="none" stroke="#2563EB" strokeWidth={2} />

      {metaY !== null && (
        <line x1={P.l} y1={metaY} x2={P.l + pw} y2={metaY} stroke="#1E3A8A" strokeWidth={1.5} strokeDasharray="6 3" />
      )}

      {yTicks.map(v => (
        <text key={v} x={P.l - 5} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#9CA3AF">
          {fmtV(v)}
        </text>
      ))}

      {xTicks.map(({ x, label }) => (
        <text key={label} x={x} y={baseY + 16} textAnchor="middle" fontSize={9} fill="#9CA3AF">
          {label}
        </text>
      ))}

      <text x={P.l + pw} y={baseY + 16} textAnchor="end" fontSize={9} fill="#9CA3AF">Idade</text>

      {ifPt && (
        <circle cx={toX(ifPt.mes)} cy={toY(Number(ifPt.patrimonio))} r={5} fill="white" stroke="#0891B2" strokeWidth={2} />
      )}

      {metaY !== null && (
        <text x={P.l + pw - 4} y={metaY - 5} textAnchor="end" fontSize={8.5} fill="#1E3A8A">
          Meta (perpetuidade)
        </text>
      )}
    </svg>
  );
}

const fmtInteiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function DocLiberdadeFinanceira({ nomeCliente, plan, resultados }: Props) {
  const pi = plan.planejamentoIF;
  const rif = resultados.if;

  const simplesIF = !rif && pi.rendaMensalDesejada > 0 ? calcularIF(pi) : null;
  const patrimonioNecessario = rif?.patrimonioNecessario ?? simplesIF?.patrimonioNecessario ?? 0;
  const patrimonioNaIF = rif?.patrimonioAposentadoria ?? simplesIF?.patrimonioProjetado ?? 0;
  const rendaSustentavel = rif?.rendaSustentavel ?? 0;
  const rendaDesejada = rif?.rendaMensalDesejada ?? pi.rendaMensalDesejada;
  const aporteNecessario = rif?.aporteAjustado ?? rif?.aporteAtual ?? pi.aporteMensal;
  const aporteAtual = rif?.aporteAtual ?? pi.aporteMensal;
  const objetivos = rif?.objetivos ?? [];
  const temDados = patrimonioNecessario > 0 || rif !== null;

  // Mesma semântica dos cards da ferramenta de Liberdade Financeira do app
  const metaAtingida = rendaDesejada > 0 && rendaSustentavel >= rendaDesejada;
  const aporteOk = aporteNecessario <= aporteAtual;

  const nota = useNotaConsultor(plan.clientId, "lf");

  const blocos: BlocoDoc[] = [
    {
      chave: "intro-1",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
          A estruturação da sua Liberdade Financeira é o pilar central do nosso planejamento. A
          importância desta etapa reside em transformar as suas expectativas de futuro em um mapa
          matemático claro e executável. Sem um destino financeiro definido e um diagnóstico preciso
          do seu custo de vida, a acumulação de capital perde eficiência. Nosso objetivo é garantir a
          gestão estratégica dos seus recursos hoje, estabelecendo metas reais para que você atinja a
          independência financeira com previsibilidade, segurança e controle absoluto sobre o seu
          tempo.
        </p>
      ),
    },
    {
      chave: "intro-2",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
          Com base no seu cenário atual, elaboramos uma projeção estratégica detalhada para
          viabilizar a sua transição para a liberdade financeira na idade alvo estipulada, garantindo
          uma renda mensal sustentável e protegida da perda de poder de compra:
        </p>
      ),
    },
    {
      chave: "metricas",
      node: temDados ? (
        /* Métricas principais — os 4 cards da ferramenta de LF (referência v5) */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Patrimônio Necessário</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: DOC.blue, margin: 0 }}>
              {formatCurrency(patrimonioNecessario)}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>
              perpetuidade (regra dos 4%)
            </p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Projeção Atual</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: metaAtingida ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {formatCurrency(patrimonioNaIF)}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>na aposentadoria</p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Aporte Necessário</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: aporteOk ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {aporteNecessario > 0 ? `${fmtInteiro.format(aporteNecessario)}/mês` : "Meta atingível"}
            </p>
            <p style={{ fontSize: 9.5, color: aporteOk ? DOC.verde : DOC.hint, margin: "3px 0 0" }}>
              {aporteOk
                ? "Aporte atual suficiente"
                : `Faltam ${fmtInteiro.format(aporteNecessario - aporteAtual)}/mês`}
              {objetivos.length > 0 && ` · inclui ${objetivos.length} objetivo(s) de vida`}
            </p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Renda Sustentável</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: metaAtingida ? DOC.verde : DOC.ink, margin: 0 }}>
              {rendaSustentavel > 0 ? fmtInteiro.format(rendaSustentavel) : "—"}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>
              /mês com a projeção atual
            </p>
            {rendaDesejada > 0 && rendaSustentavel > 0 && (
              <p style={{ fontSize: 9.5, fontWeight: 600, color: metaAtingida ? DOC.verde : DOC.vermelho, margin: "3px 0 0" }}>
                {metaAtingida
                  ? `✓ Meta de ${fmtInteiro.format(rendaDesejada)}/mês atingida`
                  : `Meta: ${fmtInteiro.format(rendaDesejada)}/mês`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            ...CARD,
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
            marginBottom: 18,
          }}
        >
          <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
            Execute a simulação de Liberdade Financeira para ver as projeções detalhadas.
          </p>
        </div>
      ),
    },
    {
      chave: "grafico",
      /* Projeção patrimonial */
      node: rif?.projecao && rif.projecao.length > 0 ? (
        <div style={{ marginBottom: 4 }}>
          <div
            className="doc-card"
            style={{
              background: "#FBFCFE",
              border: `1px solid ${DOC.linha}`,
              borderRadius: 10,
              padding: "10px 8px 4px",
              overflow: "hidden",
            }}
          >
            <GraficoIFDoc
              projecao={rif.projecao}
              patrimonioNecessario={patrimonioNecessario}
              mesIF={rif.mesInicioRetirada}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            ...CARD,
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
            textAlign: "center",
            padding: "26px 20px",
          }}
        >
          <p style={{ ...TEXTO_CORPO, color: DOC.muted }}>
            Execute o simulador de Liberdade Financeira para ver o gráfico de projeção.
          </p>
        </div>
      ),
    },
  ];

  // Objetivos de vida
  if (objetivos.length > 0) {
    blocos.push({
      chave: "objetivos",
      node: (
        <div style={{ marginTop: 14 }}>
          <p style={LABEL_SUBSECAO()}>Objetivos de Vida</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {objetivos.slice(0, 5).map((obj) => (
              <div
                key={obj.id}
                className="doc-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 14px",
                  background: "white",
                  borderRadius: 7,
                  border: `1px solid ${DOC.linha}`,
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: DOC.ink, fontWeight: 500 }}>
                  {obj.label}
                </span>
                <span style={{ fontSize: 11, color: DOC.muted }}>
                  {String(obj.mes).padStart(2, "0")}/{obj.ano}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: DOC.blue }}>
                  {formatCurrency(obj.valorBRL)}
                </span>
              </div>
            ))}
            {objetivos.length > 5 && (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: DOC.hint }}>
                + {objetivos.length - 5} outros objetivos considerados na projeção
              </p>
            )}
          </div>
        </div>
      ),
    });
  }

  blocos.push(...blocosNotaConsultor(plan.clientId, "lf", nota));

  return <PaginaDocFluida titulo="Liberdade Financeira" nomeCliente={nomeCliente} blocos={blocos} />;
}
