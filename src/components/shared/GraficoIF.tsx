import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal, Sunset,
} from "lucide-react";
import type { ProjecaoPoint } from "@/types/estrategiaResultados";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { formatCurrency } from "@/lib/format";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal,
};

const COR_APOSENTADORIA = "#0891B2";

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

interface Props {
  projecao: ProjecaoPoint[];
  objetivos?: ObjetivoVida[];
  height?: number;
  idadeMeta?: number;
}

export function GraficoIF({ projecao, objetivos = [], height = 280, idadeMeta }: Props) {
  const objsByIdade = new Map<number, ObjetivoVida[]>();
  for (const obj of objetivos) {
    const list = objsByIdade.get(obj.idadeRealizacao) ?? [];
    list.push(obj);
    objsByIdade.set(obj.idadeRealizacao, list);
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: number }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        backgroundColor: "white",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        padding: "8px 12px",
        fontSize: 12,
      }}>
        <p style={{ margin: "0 0 4px", color: "#6B7280" }}>Idade {label}</p>
        <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{formatCurrency(payload[0].value)}</p>
        {label === idadeMeta && (
          <div style={{
            color: COR_APOSENTADORIA,
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontWeight: 500,
          }}>
            <Sunset style={{ width: 12, height: 12 }} />
            Aposentadoria / IF
          </div>
        )}
      </div>
    );
  };

  const renderDot = (dotProps: Record<string, unknown>) => {
    const cx = dotProps.cx as number;
    const cy = dotProps.cy as number;
    const payload = dotProps.payload as { idade: number };
    const objsDaIdade = objsByIdade.get(payload.idade) ?? [];
    const ehAposentadoria = idadeMeta !== undefined && payload.idade === idadeMeta;

    if (objsDaIdade.length === 0 && !ehAposentadoria) return <g />;

    const r = 18;
    const ra = r + 2; // radius for aposentadoria circle (slightly larger)

    return (
      <g>
        {ehAposentadoria && (
          <g>
            <circle
              cx={cx}
              cy={cy - ra - 4}
              r={ra}
              fill="white"
              stroke={COR_APOSENTADORIA}
              strokeWidth={2}
            />
            <foreignObject
              x={cx - ra}
              y={cy - ra - 4 - ra}
              width={ra * 2}
              height={ra * 2}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}>
                <Sunset style={{ width: 16, height: 16, color: COR_APOSENTADORIA }} />
              </div>
            </foreignObject>
            <circle cx={cx} cy={cy} r={5} fill="white" stroke={COR_APOSENTADORIA} strokeWidth={2} />
          </g>
        )}

        {objsDaIdade.map((obj, i) => {
          const meta = OBJETIVO_META[obj.tipo];
          const Icon = ICON_MAP[meta.iconName];
          const baseOffset = ehAposentadoria ? (ra * 2 + 8) : 0;
          const offsetY = cy - r - 4 - baseOffset - i * (r * 2 + 4);
          const iconSize = (r - 2) * 2;
          return (
            <g key={obj.id}>
              <circle cx={cx} cy={offsetY} r={r} fill="white" stroke={meta.color} strokeWidth={1.5} />
              <foreignObject x={cx - r + 2} y={offsetY - r + 2} width={iconSize} height={iconSize}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                }}>
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
          dataKey="idade"
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
