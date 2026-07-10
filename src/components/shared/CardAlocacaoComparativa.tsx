import { PieChart as PieChartIcon } from "lucide-react";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";

interface Props {
  macroAtual: Record<string, number>;
  macroMeta: Record<string, number>;
  patrimonio: number;
}

interface DadoFatia {
  name: string;
  value: number;
  cor: string;
  brl: number;
}

// ── GraficoPizza — SVG puro com labels externos ────────────────────────────────

const W = 340;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const R = 95;
const LABEL_R = R + 45;

function toX(angulo: number, raio: number) { return CX + raio * Math.cos(angulo); }
function toY(angulo: number, raio: number) { return CY + raio * Math.sin(angulo); }

function criarPath(inicio: number, fim: number) {
  const x1 = toX(inicio, R);
  const y1 = toY(inicio, R);
  const x2 = toX(fim, R);
  const y2 = toY(fim, R);
  const largeArc = fim - inicio > Math.PI ? 1 : 0;
  return [`M ${CX} ${CY}`, `L ${x1} ${y1}`, `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`, "Z"].join(" ");
}

function GraficoPizza({ titulo, dados }: { titulo: string; dados: DadoFatia[] }) {
  const dadosFiltrados = dados.filter((d) => d.value > 0.5);

  if (dadosFiltrados.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
          {titulo}
        </div>
        <PieChartIcon size={32} color="#D1D5DB" strokeWidth={1.5} style={{ margin: "0 auto 8px" }} />
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>Sem dados disponíveis</div>
      </div>
    );
  }

  const total = dadosFiltrados.reduce((s, d) => s + d.value, 0);
  let anguloAcum = -Math.PI / 2;

  const fatias = dadosFiltrados.map((d) => {
    const angulo = (d.value / total) * 2 * Math.PI;
    const inicio = anguloAcum;
    const fim = anguloAcum + angulo;
    const meio = inicio + angulo / 2;
    anguloAcum = fim;
    return { ...d, inicio, fim, meio };
  });

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", marginBottom: 8 }}>
        {titulo}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {fatias.map((fatia, i) => {
          const mX = toX(fatia.meio, LABEL_R);
          const mY = toY(fatia.meio, LABEL_R);
          const lineStartX = toX(fatia.meio, R + 4);
          const lineStartY = toY(fatia.meio, R + 4);
          const lineMidX = toX(fatia.meio, R + 22);
          const lineMidY = toY(fatia.meio, R + 22);
          const isRight = mX > CX;
          const labelX = isRight ? mX + 6 : mX - 6;
          const textAnchor = isRight ? "start" : "end";
          const lineEndX = isRight ? mX + 4 : mX - 4;
          const mostrarLabel = fatia.value >= 3;

          return (
            <g key={i}>
              <path
                d={criarPath(fatia.inicio, fatia.fim)}
                fill={fatia.cor}
                stroke="white"
                strokeWidth={1.5}
                opacity={0.92}
              />
              {mostrarLabel && (
                <>
                  <path
                    d={`M ${lineStartX} ${lineStartY} Q ${lineMidX} ${lineMidY} ${lineEndX} ${mY}`}
                    fill="none"
                    stroke={fatia.cor}
                    strokeWidth={1}
                    opacity={0.7}
                  />
                  <line
                    x1={lineEndX} y1={mY}
                    x2={labelX}   y2={mY}
                    stroke={fatia.cor} strokeWidth={1} opacity={0.7}
                  />
                  <text x={labelX} y={mY - 6} textAnchor={textAnchor} fontSize={10} fill="#374151" fontWeight="500">
                    {fatia.name.length > 14 ? fatia.name.slice(0, 13) + "…" : fatia.name}
                  </text>
                  <text x={labelX} y={mY + 8} textAnchor={textAnchor} fontSize={10} fill={fatia.cor} fontWeight="600">
                    {fatia.value.toFixed(1)}%
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── CardAlocacaoComparativa ────────────────────────────────────────────────────

export function CardAlocacaoComparativa({ macroAtual, macroMeta, patrimonio }: Props) {
  const dadosAtual: DadoFatia[] = CARD_ORDER
    .map((cardId) => ({
      name: CARD_META[cardId].label,
      value: Number(macroAtual[cardId]) || 0,
      cor: CARD_META[cardId].cor,
      brl: ((Number(macroAtual[cardId]) || 0) / 100) * patrimonio,
    }))
    .filter((d) => d.value > 0);

  const dadosMeta: DadoFatia[] = CARD_ORDER
    .map((cardId) => ({
      name: CARD_META[cardId].label,
      value: Number(macroMeta[cardId]) || 0,
      cor: CARD_META[cardId].cor,
      brl: ((Number(macroMeta[cardId]) || 0) / 100) * patrimonio,
    }))
    .filter((d) => d.value > 0);

  return (
    <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <i className="ti ti-chart-pie" style={{ fontSize: 18, color: "#2563EB" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Alocação Atual × Proposta</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
        <GraficoPizza titulo="CARTEIRA ATUAL" dados={dadosAtual} />
        <GraficoPizza titulo="ALOCAÇÃO PROPOSTA" dados={dadosMeta} />
      </div>
    </div>
  );
}
