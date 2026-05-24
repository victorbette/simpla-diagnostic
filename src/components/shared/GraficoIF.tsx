import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { ProjecaoPoint } from "@/types/estrategiaResultados";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { formatCurrency } from "@/lib/format";

function formatAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

interface ObjLabelProps {
  viewBox?: { x: number; y: number; height: number };
  nome: string;
  color: string;
}

function ObjLabel({ viewBox, nome, color }: ObjLabelProps) {
  if (!viewBox) return null;
  const label = nome.length > 7 ? nome.slice(0, 6) + "…" : nome;
  return (
    <text
      x={viewBox.x + 3}
      y={18}
      fontSize={9}
      fill={color}
      fontWeight={700}
      style={{ pointerEvents: "none" }}
    >
      {label}
    </text>
  );
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={projecao} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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

        {objetivos.map((obj) => {
          const meta = OBJETIVO_META[obj.tipo];
          return (
            <ReferenceLine
              key={obj.id}
              x={obj.idadeRealizacao}
              stroke={meta.color}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={<ObjLabel nome={obj.nome} color={meta.color} />}
            />
          );
        })}

        <Area
          type="monotone"
          dataKey="patrimonio"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#gradIF)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
