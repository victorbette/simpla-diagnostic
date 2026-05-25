import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
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

interface Props {
  projecao: PontoProjecao[];
  objetivos?: ObjetivoVida[];
  height?: number;
  /** Absolute month index where accumulation ends — used for IF marker dot only */
  mesIF?: number;
}

export function GraficoIF({ projecao, objetivos = [], height = 280, mesIF }: Props) {
  if (projecao.length === 0) return null;

  const idadeAtual = Math.floor(projecao[0].idade);
  const mesNascimentoDoAno = projecao[0].mesDoAno;

  // Y-axis: ceil max patrimônio to next 500k multiple
  const maxPatrimonio = Math.max(...projecao.map((p) => p.patrimonio), 0);
  const STEP = 500_000;
  const yMax = Math.ceil(maxPatrimonio / STEP) * STEP || STEP;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += STEP) yTicks.push(v);

  // X-axis: annual ticks at birth month, every 5 years, shown up to age 100
  const domainMax = (100 - idadeAtual) * 12;
  const xTicks = projecao
    .filter((p) => p.mesDoAno === mesNascimentoDoAno && Math.floor(p.idade) % 5 === 0)
    .map((p) => p.mes);
  if (!xTicks.includes(0)) xTicks.unshift(0);

  // IF marker point
  const ifPonto = mesIF !== undefined ? projecao[mesIF] : undefined;

  // Build objectives lookups
  const objByMesAno = new Map<string, ObjetivoVida[]>();
  for (const obj of objetivos) {
    const key = `${obj.ano}-${obj.mes}`;
    const list = objByMesAno.get(key) ?? [];
    list.push(obj);
    objByMesAno.set(key, list);
  }
  const objByMesIdx = new Map<number, ObjetivoVida[]>();
  for (const p of projecao) {
    const list = objByMesAno.get(`${p.ano}-${p.mesDoAno}`);
    if (list?.length) objByMesIdx.set(p.mes, list);
  }

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
        <p style={{ margin: "0 0 2px", color: "#6B7280" }}>
          {mesLabel}
          <span style={{ marginLeft: 6, color: "#9CA3AF" }}>{ponto.idade.toFixed(1)} anos</span>
        </p>
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
      <AreaChart data={projecao} margin={{ top: 60, right: 20, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="gradIF" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={true} vertical={false} />
        <XAxis
          dataKey="mes"
          type="number"
          domain={[0, domainMax]}
          ticks={xTicks}
          tickFormatter={(v: number) => {
            const ponto = projecao[v];
            if (!ponto) return "";
            return String(Math.floor(ponto.idade));
          }}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, yMax]}
          ticks={yTicks}
          tickFormatter={(v: number) => {
            if (v === 0) return "R$ 0";
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            return `${(v / 1_000).toFixed(0)}K`;
          }}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          width={52}
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
