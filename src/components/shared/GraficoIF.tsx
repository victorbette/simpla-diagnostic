import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal, Sunset,
} from "lucide-react";
import type { PontoProjecao } from "@/lib/financialFreedomCalc";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { formatCurrency } from "@/lib/format";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal,
};

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COR_APOSENTADORIA = "#0891B2";

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

interface Props {
  projecao: PontoProjecao[];
  objetivos?: ObjetivoVida[];
  height?: number;
  /** Absolute month index (from projecao[0]) where accumulation ends */
  mesIF?: number;
}

export function GraficoIF({ projecao, objetivos = [], height = 280, mesIF }: Props) {
  if (projecao.length === 0) return null;

  // Build objectives lookup: "ano-mes" → list of objectives
  const objByMesAno = new Map<string, ObjetivoVida[]>();
  for (const obj of objetivos) {
    const key = `${obj.ano}-${obj.mes}`;
    const list = objByMesAno.get(key) ?? [];
    list.push(obj);
    objByMesAno.set(key, list);
  }

  // Build objectives lookup by absolute mes index for renderDot
  const objByMesIdx = new Map<number, ObjetivoVida[]>();
  for (const p of projecao) {
    const list = objByMesAno.get(`${p.ano}-${p.mesDoAno}`);
    if (list?.length) objByMesIdx.set(p.mes, list);
  }

  // X-axis ticks: one per 5 calendar years, at January
  const anoInicio = projecao[0].ano;
  const xTicks: number[] = [];
  for (const p of projecao) {
    if (p.mesDoAno === 1 && (p.ano - anoInicio) % 5 === 0) {
      xTicks.push(p.mes);
    }
  }
  // Ensure first point is included
  if (!xTicks.includes(0)) xTicks.unshift(0);

  // Map mes-index → ano for tick labels
  const mesParaAno = new Map<number, number>();
  for (const p of projecao) mesParaAno.set(p.mes, p.ano);

  // IF reference line
  const ifPonto = mesIF !== undefined ? projecao[mesIF] : undefined;

  const CustomTooltip = ({
    active, payload,
  }: {
    active?: boolean;
    payload?: { value: number; payload: PontoProjecao }[];
  }) => {
    if (!active || !payload?.length) return null;
    const ponto = payload[0].payload;
    const mesLabel = `${MESES_ABREV[ponto.mesDoAno - 1]}/${ponto.ano}`;
    const objsDoPonto = objByMesAno.get(`${ponto.ano}-${ponto.mesDoAno}`) ?? [];
    return (
      <div style={{
        backgroundColor: "white",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        padding: "8px 12px",
        fontSize: 12,
        minWidth: 160,
      }}>
        <p style={{ margin: "0 0 4px", color: "#6B7280" }}>{mesLabel}</p>
        <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{formatCurrency(ponto.patrimonio)}</p>
        {ifPonto && ponto.mes === ifPonto.mes && (
          <div style={{ color: COR_APOSENTADORIA, marginTop: 4, display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
            <Sunset style={{ width: 12, height: 12 }} />
            Independência Financeira
          </div>
        )}
        {objsDoPonto.map((obj) => {
          const meta = OBJETIVO_META[obj.tipo];
          const sinal = meta.tipo === "aporte" ? "+" : "−";
          return (
            <p key={obj.id} style={{ margin: "3px 0 0", color: meta.color, fontSize: 11 }}>
              {sinal}{formatCurrency(obj.valorBRL)} · {obj.label}
            </p>
          );
        })}
      </div>
    );
  };

  const renderDot = (dotProps: Record<string, unknown>) => {
    const cx = dotProps.cx as number;
    const cy = dotProps.cy as number;
    const payload = dotProps.payload as PontoProjecao;
    const objsDoPonto = objByMesIdx.get(payload.mes) ?? [];
    const ehIF = ifPonto !== undefined && payload.mes === ifPonto.mes;

    if (objsDoPonto.length === 0 && !ehIF) return <g />;

    const r = 18;
    const ra = r + 2;

    return (
      <g>
        {ehIF && (
          <g>
            <circle cx={cx} cy={cy - ra - 4} r={ra} fill="white" stroke={COR_APOSENTADORIA} strokeWidth={2} />
            <foreignObject x={cx - ra} y={cy - ra - 4 - ra} width={ra * 2} height={ra * 2}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                <Sunset style={{ width: 16, height: 16, color: COR_APOSENTADORIA }} />
              </div>
            </foreignObject>
            <circle cx={cx} cy={cy} r={5} fill="white" stroke={COR_APOSENTADORIA} strokeWidth={2} />
          </g>
        )}

        {objsDoPonto.map((obj, i) => {
          const meta = OBJETIVO_META[obj.tipo];
          const Icon = ICON_MAP[meta.iconName];
          const baseOffset = ehIF ? (ra * 2 + 8) : 0;
          const offsetY = cy - r - 4 - baseOffset - i * (r * 2 + 4);
          const iconSize = (r - 2) * 2;
          return (
            <g key={obj.id}>
              <circle cx={cx} cy={offsetY} r={r} fill="white" stroke={meta.color} strokeWidth={1.5} />
              <foreignObject x={cx - r + 2} y={offsetY - r + 2} width={iconSize} height={iconSize}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                  <Icon style={{ width: 15, height: 15, color: meta.color }} />
                </div>
              </foreignObject>
              <circle cx={cx} cy={cy} r={5} fill="white" stroke="#374151" strokeWidth={1.5} />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={projecao} margin={{ top: 60, right: 16, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={true} vertical={false} />
        <XAxis
          dataKey="mes"
          ticks={xTicks}
          tickFormatter={(v) => String(mesParaAno.get(v) ?? "")}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatAxis}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />

        {ifPonto && (
          <ReferenceLine
            x={ifPonto.mes}
            stroke={COR_APOSENTADORIA}
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
        )}

        <Area
          type="monotone"
          dataKey="patrimonio"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#gradIF)"
          dot={renderDot}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
