/* Gauge semicircular SVG usado no dashboard de diagnóstico e no documento
 * "Estratégia Pronta" (página Ponto de Partida). SVG inline com dimensões
 * fixas — seguro para impressão (sem recharts/ResponsiveContainer). */

export interface NivelScore {
  label: string;
  cor: string;
  bg: string;
}

export function nivelScoreGauge(score: number): NivelScore {
  if (score === 0)  return { label: "Não analisado", cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 40)  return { label: "Em risco",      cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 60)  return { label: "Atenção",       cor: "#B45309", bg: "#FEF3C7" };
  if (score <= 80)  return { label: "Adequado",      cor: "#2563EB", bg: "#DBEAFE" };
  return              { label: "Excelente",     cor: "#15803D", bg: "#DCFCE7" };
}

interface GaugeProps {
  score: number;
  label: string;
  icone: string;
  nivel: NivelScore;
  /** Versão reduzida para caber 4 gauges na largura útil do documento A4 */
  compact?: boolean;
}

export function GaugeSemiCircular({ score, label, icone, nivel, compact }: GaugeProps) {
  const W = compact ? 116 : 160;
  const H = compact ? 65 : 90;
  const CX = W / 2;
  const CY = H;
  const R_EXT = compact ? 52 : 72;
  const R_INT = compact ? 38 : 52;

  const graus = 180 - (score / 100) * 180;
  const rad = (graus * Math.PI) / 180;

  const xFim    = CX + R_EXT * Math.cos(rad);
  const yFim    = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);

  const largeArc = score > 50 ? 1 : 0;

  const pathFundo =
    `M ${CX - R_EXT} ${CY} A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY} ` +
    `L ${CX + R_INT} ${CY} A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY} Z`;

  const pathPreenchido = score > 0
    ? `M ${CX - R_EXT} ${CY} A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFim} ${yFim} ` +
      `L ${xFimInt} ${yFimInt} A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY} Z`
    : "";

  return (
    <div style={{
      background: "white",
      border: "0.5px solid #E5E7EB",
      borderRadius: 12,
      padding: compact ? "12px 8px 10px" : "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{ position: "relative" }}>
        <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`}>
          <path d={pathFundo} fill="#F3F4F6" />
          {score > 0 && <path d={pathPreenchido} fill={nivel.cor} opacity={0.9} />}
          <line
            x1={CX}
            y1={CY}
            x2={CX + (R_EXT - 2) * Math.cos(rad)}
            y2={CY - (R_EXT - 2) * Math.sin(rad)}
            stroke="white"
            strokeWidth={2}
            opacity={score > 0 ? 1 : 0}
          />
          <text
            x={CX}
            y={CY - (compact ? 5 : 8)}
            textAnchor="middle"
            fontSize={compact ? 19 : 24}
            fontWeight={800}
            fill={score > 0 ? nivel.cor : "#9CA3AF"}
          >
            {score > 0 ? score : "—"}
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize={compact ? 8.5 : 10} fill="#9CA3AF">
            /100
          </text>
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: compact ? 11 : 13, color: nivel.cor }} />
        <span style={{ fontSize: compact ? 9.5 : 11, fontWeight: 600, color: "#374151", textAlign: "center" }}>
          {label}
        </span>
      </div>

      <span style={{
        fontSize: compact ? 8.5 : 10, fontWeight: 600, color: nivel.cor, background: nivel.bg,
        padding: "2px 10px", borderRadius: 99, marginTop: compact ? 4 : 6,
      }}>
        {nivel.label}
      </span>
    </div>
  );
}
