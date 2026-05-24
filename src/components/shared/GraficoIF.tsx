import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal,
} from "lucide-react";
import type { ProjecaoPoint } from "@/types/estrategiaResultados";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { formatCurrency } from "@/lib/format";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal,
};

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

interface Props {
  projecao: ProjecaoPoint[];
  objetivos?: ObjetivoVida[];
  height?: number;
  patrimonioAlvo?: number;
}

export function GraficoIF({ projecao, objetivos = [], height = 280, patrimonioAlvo }: Props) {
  const idadeIF = projecao.reduce<number | undefined>((found, p, i) => {
    if (found !== undefined) return found;
    if (i > 0 && p.fase === "decumulacao" && projecao[i - 1]?.fase === "acumulacao") return p.idade;
    return undefined;
  }, undefined);

  const objsByIdade = new Map<number, ObjetivoVida[]>();
  for (const obj of objetivos) {
    const list = objsByIdade.get(obj.idadeRealizacao) ?? [];
    list.push(obj);
    objsByIdade.set(obj.idadeRealizacao, list);
  }

  const renderDot = (dotProps: Record<string, unknown>) => {
    const cx = dotProps.cx as number;
    const cy = dotProps.cy as number;
    const payload = dotProps.payload as { idade: number };
    const objsDaIdade = objsByIdade.get(payload.idade) ?? [];
    if (objsDaIdade.length === 0) return <g />;

    const r = 18;
    return (
      <g>
        {objsDaIdade.map((obj, i) => {
          const meta = OBJETIVO_META[obj.tipo];
          const Icon = ICON_MAP[meta.iconName];
          const offsetY = cy - r - 4 - i * (r * 2 + 4);
          const iconSize = (r - 2) * 2;

          return (
            <g key={obj.id}>
              <circle
                cx={cx}
                cy={offsetY}
                r={r}
                fill={`${meta.color}20`}
                stroke={meta.color}
                strokeWidth={1.5}
              />
              <foreignObject
                x={cx - r + 2}
                y={offsetY - r + 2}
                width={iconSize}
                height={iconSize}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Icon style={{ width: 15, height: 15, color: meta.color }} />
                </div>
              </foreignObject>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={projecao} margin={{ top: 50, right: 16, bottom: 0, left: 8 }}>
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
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(v: number) => [formatCurrency(v), "Patrimônio"]}
          labelFormatter={(l) => `Idade ${l}`}
        />

        {patrimonioAlvo !== undefined && patrimonioAlvo > 0 && (
          <ReferenceLine
            y={patrimonioAlvo}
            stroke="#B91C1C"
            strokeDasharray="4 4"
            label={{ value: "Meta IF", position: "right", fontSize: 9, fill: "#B91C1C" }}
          />
        )}

        {idadeIF !== undefined && (
          <ReferenceLine
            x={idadeIF}
            stroke="#15803D"
            strokeDasharray="4 4"
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
