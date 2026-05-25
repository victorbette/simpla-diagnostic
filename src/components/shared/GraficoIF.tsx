import { useMemo } from "react";
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
const IDADE_MAXIMA_EXIBICAO = 100;

interface Props {
  projecao: PontoProjecao[];
  objetivos?: ObjetivoVida[];
  height?: number;
  /** Absolute month index where accumulation ends — used for IF marker dot only */
  mesIF?: number;
}

export function GraficoIF({ projecao, objetivos = [], height = 280, mesIF }: Props) {
  // useMemo must come before any conditional return (React hooks rule)
  const projecaoCompleta = useMemo<PontoProjecao[]>(() => {
    if (!projecao?.length) return [];
    const ultimo = projecao[projecao.length - 1];
    const idadeUltima = Number(ultimo.idade) || 90;
    const mesesExtras = Math.round((IDADE_MAXIMA_EXIBICAO - idadeUltima) * 12);
    if (mesesExtras <= 0) return projecao;
    const extras: PontoProjecao[] = [];
    for (let m = 1; m <= mesesExtras; m++) {
      const mesDoAno = ((ultimo.mesDoAno - 1 + m) % 12) + 1;
      const anoExtra = ultimo.ano + Math.floor((ultimo.mesDoAno - 1 + m) / 12);
      extras.push({
        mes: ultimo.mes + m,
        ano: anoExtra,
        mesDoAno,
        idade: Math.round((idadeUltima + m / 12) * 10) / 10,
        patrimonio: 0,
        fase: "decumulacao",
      });
    }
    return [...projecao, ...extras];
  }, [projecao]);

  if (!projecaoCompleta.length) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 13 }}>
        Sem dados de projeção
      </div>
    );
  }

  const idadeAtual = Math.floor(Number(projecaoCompleta[0].idade) || 0);

  // Y-axis: ceil max patrimônio to next 500k multiple
  const maxPatrimonio = Math.max(...projecaoCompleta.map((p) => Number(p.patrimonio) || 0), 0);
  const STEP = 500_000;
  const yMax = Math.ceil(maxPatrimonio / STEP) * STEP || STEP;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += STEP) yTicks.push(v);

  // X-axis: ticks at birthday month, every 5 years, domain extends to age 100
  // Derive birth month from first point whose idade is a whole number
  const firstBirthday = projecaoCompleta.find(
    (p) => p.mes > 0 && Number(p.idade) === Math.floor(Number(p.idade)),
  );
  const mesAniversario = firstBirthday?.mesDoAno ?? projecaoCompleta[0].mesDoAno;

  const totalMeses = (IDADE_MAXIMA_EXIBICAO - idadeAtual) * 12;
  const xTicks = projecaoCompleta
    .filter((p) => p.mesDoAno === mesAniversario && Math.floor(Number(p.idade) || 0) % 5 === 0)
    .map((p) => p.mes);
  if (!xTicks.includes(0)) xTicks.unshift(0);

  // IF marker point (look up in the full array by mes index)
  const ifPonto = mesIF !== undefined ? projecaoCompleta[mesIF] : undefined;

  // Build objectives lookups (only original projecao range has objectives)
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
    const ponto = payload[0]?.payload as PontoProjecao | undefined;
    if (!ponto) return null;
    const mesDoAno = Number(ponto.mesDoAno) || 1;
    const ano = Number(ponto.ano) || 0;
    const idade = Number(ponto.idade) || 0;
    const patrimonio = Number(ponto.patrimonio) || 0;
    const mesLabel = `${MESES_ABREV[mesDoAno - 1]}/${ano}`;
    const objsDoPonto = objByMesAno.get(`${ano}-${mesDoAno}`) ?? [];
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
          {mesLabel} · {idade.toFixed(1)} anos
        </p>
        <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{formatCurrency(patrimonio)}</p>
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
    const cx = dotProps.cx as number | undefined;
    const cy = dotProps.cy as number | undefined;
    const payload = dotProps.payload as PontoProjecao | undefined;
    if (!payload || cx === undefined || cy === undefined) return <g />;
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
      <AreaChart data={projecaoCompleta} margin={{ top: 60, right: 20, bottom: 0, left: 8 }}>
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
          domain={[0, totalMeses]}
          ticks={xTicks}
          tickFormatter={(mes: number) => {
            const ponto = projecaoCompleta.find((p) => p.mes === mes);
            if (!ponto) return "";
            return String(Math.floor(Number(ponto.idade) || 0));
          }}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, yMax]}
          ticks={yTicks}
          tickFormatter={(v: number) => {
            const val = Number(v) || 0;
            if (val === 0) return "R$ 0";
            if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
            return `${(val / 1_000).toFixed(0)}K`;
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
