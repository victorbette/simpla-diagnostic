import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Home, Car, BookOpen, Plane, Briefcase, Star, Heart,
  Monitor, Shield, TrendingUp, MoreHorizontal, Sunset,
} from "lucide-react";
import type { PontoProjecao } from "@/lib/financialFreedomCalc";
import type { ObjetivoVida } from "@/types/objetivos";
import { getObjetivoMeta } from "@/types/objetivos";
import { formatCurrency } from "@/lib/format";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Star, Heart,
  Monitor, Shield, TrendingUp, MoreHorizontal,
};

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COR_APOSENTADORIA = "#0891B2";

interface Props {
  projecao: PontoProjecao[];
  curvaIdeal?: (number | null)[];
  objetivos?: ObjetivoVida[];
  height?: number;
  /** Absolute month index where accumulation ends — used for IF marker dot only */
  mesIF?: number;
  /** Birth month 1-12 */
  mesNascimento?: number;
  /** Dashed horizontal reference line at this Y value */
  patrimonioNecessario?: number;
}

export function GraficoIF({ projecao, curvaIdeal, objetivos = [], height = 420, mesIF, patrimonioNecessario }: Props) {
  // ── Hooks (must be before any early return) ──────────────────────────────────
  const [mostrarProjetado, setMostrarProjetado] = useState(true);
  const [mostrarIdeal, setMostrarIdeal] = useState(true);
  const [range, setRange] = useState<"2a" | "5a" | "10a" | "max">("max");

  const projecaoCompleta = useMemo(
    () => (projecao ?? []).filter(p => Number(p.idade) <= 90),
    [projecao],
  );

  const dadosMesclados = useMemo(
    () => projecaoCompleta.map((ponto) => ({
      ...ponto,
      patrimonioIdeal: curvaIdeal?.[ponto.mes] ?? null,
    })),
    [projecaoCompleta, curvaIdeal],
  );

  const idadeAtual = useMemo(
    () => Math.floor(Number(projecaoCompleta[0]?.idade) || 0),
    [projecaoCompleta],
  );

  const dominioX = useMemo((): [number, number] => {
    if (range === "max") return [idadeAtual, 90];
    const anos = range === "2a" ? 2 : range === "5a" ? 5 : 10;
    return [idadeAtual, Math.min(idadeAtual + anos, 90)];
  }, [range, idadeAtual]);

  const dadosFiltrados = useMemo(
    () => dadosMesclados.filter(
      d => Number(d.idade) >= dominioX[0] && Number(d.idade) <= dominioX[1],
    ),
    [dadosMesclados, dominioX],
  );

  // ── Early return ─────────────────────────────────────────────────────────────
  if (!projecaoCompleta.length) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 13 }}>
        Sem dados de projeção
      </div>
    );
  }

  // ── Derived values (non-hook, safe after early return) ────────────────────────

  // Y-axis based on visible (filtered) data
  const maxPatrimonio = Math.max(
    ...dadosFiltrados.map((p) => Number(p.patrimonio) || 0),
    ...dadosFiltrados.map((p) => Number(p.patrimonioIdeal) || 0),
    0,
  );
  const STEP = 500_000;
  const yMax = Math.ceil(maxPatrimonio / STEP) * STEP || STEP;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += STEP) yTicks.push(v);

  // X-axis from filtered data
  const firstMes   = dadosFiltrados[0]?.mes ?? 0;
  const totalMeses  = dadosFiltrados[dadosFiltrados.length - 1]?.mes ?? (90 - idadeAtual) * 12;
  const agePorMes  = new Map<number, number>();
  const xTicks: number[] = [];
  const idadesVistas = new Set<number>();
  for (const p of dadosFiltrados) {
    const a = Math.floor(Number(p.idade));
    agePorMes.set(p.mes, a);
    if (a % 5 === 0 && !idadesVistas.has(a)) {
      idadesVistas.add(a);
      xTicks.push(p.mes);
    }
  }

  const ifPonto = mesIF !== undefined ? projecaoCompleta[mesIF] : undefined;

  // Objectives lookup maps
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

  // ── Custom Tooltip ────────────────────────────────────────────────────────────
  const CustomTooltip = ({
    active, payload,
  }: {
    active?: boolean;
    payload?: { value: number; payload: PontoProjecao & { patrimonioIdeal?: number | null } }[];
  }) => {
    if (!active || !payload?.length) return null;
    const ponto = payload[0]?.payload as (PontoProjecao & { patrimonioIdeal?: number | null }) | undefined;
    if (!ponto) return null;
    const mesDoAno = Number(ponto.mesDoAno) || 1;
    const ano = Number(ponto.ano) || 0;
    const idade = Number(ponto.idade) || 0;
    const patrimonio = Number(ponto.patrimonio) || 0;
    const patrimonioIdealVal = ponto.patrimonioIdeal != null ? Number(ponto.patrimonioIdeal) : null;
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
        minWidth: 180,
      }}>
        <p style={{ margin: "0 0 4px", color: "#6B7280" }}>
          {mesLabel} · {idade.toFixed(1)} anos
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <span style={{ width: 14, height: 3, background: "#2563EB", display: "inline-block", borderRadius: 2, flexShrink: 0 }} />
          <span style={{ color: "#6B7280", fontSize: 11 }}>Patrimônio Total Projetado</span>
        </div>
        <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#2563EB" }}>{formatCurrency(patrimonio)}</p>
        {patrimonioIdealVal != null && (
          <div style={{ color: "#1E3A8A", fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 14, height: 2, background: "#1E3A8A", display: "inline-block", borderRadius: 1, flexShrink: 0 }} />
            Aposentadoria Ideal: {formatCurrency(patrimonioIdealVal)}
          </div>
        )}
        {/* IF icon marker: sem texto no tooltip (melhoria 1) */}
        {objsDoPonto.map((obj) => {
          const meta = getObjetivoMeta(obj.tipo);
          const sinal = obj.tipo === "aportes_financeiros" ? "+" : "−";
          return (
            <p key={obj.id} style={{ margin: "3px 0 0", color: meta.cor, fontSize: 11 }}>
              {sinal}{formatCurrency(obj.valorBRL)} · {obj.label}
            </p>
          );
        })}
      </div>
    );
  };

  // ── Dot renderer — ícone de aposentadoria (sempre visível) ───────────────────
  const renderDotIF = (dotProps: Record<string, unknown>) => {
    const cx = dotProps.cx as number | undefined;
    const cy = dotProps.cy as number | undefined;
    const payload = dotProps.payload as PontoProjecao | undefined;
    if (!payload || cx === undefined || cy === undefined) return <g />;
    if (ifPonto === undefined || payload.mes !== ifPonto.mes) return <g />;

    const ra = 20;
    return (
      <g>
        <circle cx={cx} cy={cy - ra - 4} r={ra} fill="white" stroke={COR_APOSENTADORIA} strokeWidth={2} />
        <foreignObject x={cx - ra} y={cy - ra - 4 - ra} width={ra * 2} height={ra * 2}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <Sunset style={{ width: 16, height: 16, color: COR_APOSENTADORIA }} />
          </div>
        </foreignObject>
        <circle cx={cx} cy={cy} r={5} fill="white" stroke={COR_APOSENTADORIA} strokeWidth={2} />
      </g>
    );
  };

  // ── Dot renderer — ícones de objetivos (visíveis apenas com mostrarProjetado) ─
  const renderDotObjetivos = (dotProps: Record<string, unknown>) => {
    const cx = dotProps.cx as number | undefined;
    const cy = dotProps.cy as number | undefined;
    const payload = dotProps.payload as PontoProjecao | undefined;
    if (!payload || cx === undefined || cy === undefined) return <g />;
    const objsDoPonto = objByMesIdx.get(payload.mes) ?? [];
    if (objsDoPonto.length === 0) return <g />;

    const r = 18;
    const ra = r + 2;
    // If the IF icon is at the same point, offset objectives above it
    const ehIF = ifPonto !== undefined && payload.mes === ifPonto.mes;
    const baseOffset = ehIF ? (ra * 2 + 8) : 0;

    return (
      <g>
        {objsDoPonto.map((obj, i) => {
          const meta = getObjetivoMeta(obj.tipo);
          const Icon = ICON_MAP[meta.icone];
          const offsetY = cy - r - 4 - baseOffset - i * (r * 2 + 4);
          const iconSize = (r - 2) * 2;
          return (
            <g key={obj.id}>
              <circle cx={cx} cy={offsetY} r={r} fill="white" stroke={meta.cor} strokeWidth={1.5} />
              <foreignObject x={cx - r + 2} y={offsetY - r + 2} width={iconSize} height={iconSize}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                  {Icon && <Icon style={{ width: 15, height: 15, color: meta.cor }} />}
                </div>
              </foreignObject>
              <circle cx={cx} cy={cy} r={5} fill="white" stroke="#374151" strokeWidth={1.5} />
            </g>
          );
        })}
      </g>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const temCurvaIdeal = !!(curvaIdeal && curvaIdeal.length > 0);

  return (
    <div>
      {/* Pills de zoom (canto direito, acima do gráfico) */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 8 }}>
        {(["2a", "5a", "10a", "max"] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              fontSize: 11,
              fontWeight: range === r ? 600 : 400,
              color: range === r ? "#2563EB" : "#9CA3AF",
              background: range === r ? "#DBEAFE" : "transparent",
              border: range === r ? "0.5px solid #BFDBFE" : "0.5px solid #E5E7EB",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {r === "2a" ? "2 anos" : r === "5a" ? "5 anos" : r === "10a" ? "10 anos" : "Máx"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={dadosFiltrados} margin={{ top: 60, right: 20, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={true} vertical={false} />
          <XAxis
            dataKey="mes"
            type="number"
            domain={[firstMes, totalMeses]}
            ticks={xTicks}
            tickFormatter={(mes: number) => {
              const a = agePorMes.get(mes);
              return a !== undefined ? String(a) : "";
            }}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Idade", position: "insideBottomRight", offset: -8, fontSize: 10, fill: "#9CA3AF" }}
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

          {/* 1. ÁREA AZUL — patrimônio projetado, com activeDot ao hover */}
          {mostrarProjetado && (
            <Area
              type="monotone"
              dataKey="patrimonio"
              stroke="none"
              strokeWidth={0}
              fill="url(#gradReal)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 5, fill: "#2563EB", stroke: "white", strokeWidth: 2 }}
              isAnimationActive={false}
              name="Patrimônio Total Projetado"
            />
          )}

          {/* 2. LINHA AZUL ESCURO — curva ideal de aposentadoria */}
          {mostrarIdeal && temCurvaIdeal && (
            <Area
              type="monotone"
              dataKey="patrimonioIdeal"
              stroke="#1E3A8A"
              strokeWidth={2.5}
              fill="none"
              fillOpacity={0}
              dot={false}
              activeDot={{ r: 5, fill: "#1E3A8A", stroke: "white", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
              name="Aposentadoria Ideal"
            />
          )}

          {/* Linha de referência: patrimônio necessário */}
          {patrimonioNecessario !== undefined && patrimonioNecessario > 0 && (
            <ReferenceLine
              y={patrimonioNecessario}
              stroke="#059669"
              strokeDasharray="6 3"
              strokeWidth={1.5}
            />
          )}

          {/* 3a. DOTS — ícone de aposentadoria (sempre visível) */}
          <Area
            type="monotone"
            dataKey="patrimonio"
            stroke="none"
            strokeWidth={0}
            fill="none"
            fillOpacity={0}
            isAnimationActive={false}
            dot={renderDotIF}
            activeDot={false}
            name="Aposentadoria marcador"
          />

          {/* 3b. DOTS — ícones de objetivos (ocultos junto com a área) */}
          {mostrarProjetado && (
            <Area
              type="monotone"
              dataKey="patrimonio"
              stroke="none"
              strokeWidth={0}
              fill="none"
              fillOpacity={0}
              isAnimationActive={false}
              dot={renderDotObjetivos}
              activeDot={false}
              name="Projeção com objetivos"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legenda clicável abaixo do gráfico */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
        <button
          onClick={() => setMostrarProjetado(p => !p)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer",
            padding: "4px 8px", borderRadius: 6,
            opacity: mostrarProjetado ? 1 : 0.4,
            transition: "opacity 200ms",
            fontFamily: "inherit",
          }}
        >
          <div style={{ width: 24, height: 3, background: "#2563EB", borderRadius: 2 }} />
          <span style={{ fontSize: 12, color: "#374151" }}>Patrimônio Total Projetado</span>
        </button>

        {temCurvaIdeal && (
          <button
            onClick={() => setMostrarIdeal(p => !p)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 8px", borderRadius: 6,
              opacity: mostrarIdeal ? 1 : 0.4,
              transition: "opacity 200ms",
              fontFamily: "inherit",
            }}
          >
            <div style={{ width: 24, height: 2, background: "#1E3A8A", borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: "#374151" }}>Aposentadoria Ideal</span>
          </button>
        )}
      </div>
    </div>
  );
}
