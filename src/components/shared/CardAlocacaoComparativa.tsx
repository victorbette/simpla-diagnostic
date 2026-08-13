import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  macroAtual: Record<string, number>;
  macroMeta: Record<string, number>;
  patrimonio: number;
}

// ── Geometria dos labels ──────────────────────────────────────────────────────

const RADIAN   = Math.PI / 180;
const OUTER_R  = 75;
const ELBOW_R  = OUTER_R + 28; // distância do centro ao cotovelo
const TICK     = 14;            // comprimento do traço horizontal
const MIN_GAP  = 15;            // mínimo de px entre centros verticais de labels adjacentes

interface LabelPos {
  index:  number;
  x1: number; y1: number; // origem no bordo do slice
  ex: number; y:  number; // cotovelo (y ajustado por colisão)
  tx: number;              // fim do traço horizontal
  lx: number;              // âncora do texto
  anchor: "start" | "end";
  cor:    string;
  name:   string;
  pct:    number; // 0-1
}

/**
 * Calcula posições de todos os labels de uma vez, resolve colisões verticais
 * em cada lado (esquerdo/direito) e retorna o array indexado por slice.
 */
function buildLabels(filtrados: Fatia[], cx: number, cy: number): LabelPos[] {
  const total = filtrados.reduce((s, d) => s + d.value, 0);
  if (total === 0) return [];

  let cumAngle = 0;
  const natural: LabelPos[] = filtrados.map((item, index) => {
    const fraction = item.value / total;
    const span     = fraction * 360;
    const mid      = 90 - cumAngle - span / 2; // graus, horário do topo
    cumAngle += span;

    const cos = Math.cos(-mid * RADIAN);
    const sin = Math.sin(-mid * RADIAN);
    const x1  = cx + (OUTER_R + 6) * cos;
    const y1  = cy + (OUTER_R + 6) * sin;
    const ex  = cx + ELBOW_R * cos;
    const y   = cy + ELBOW_R * sin;
    const r   = ex >= cx;
    const tx  = ex + (r ? TICK : -TICK);
    const lx  = r  ? tx + 2 : tx - 2;
    return { index, x1, y1, ex, y, tx, lx, anchor: r ? "start" : "end", cor: item.cor, name: item.name, pct: fraction };
  });

  // Resolve colisões em cada lado separadamente
  const sides = [
    natural.filter(l => l.ex >= cx).sort((a, b) => a.y - b.y),
    natural.filter(l => l.ex <  cx).sort((a, b) => a.y - b.y),
  ];
  for (const g of sides) {
    // Passagem para baixo
    for (let i = 1; i < g.length; i++) {
      if (g[i].y - g[i - 1].y < MIN_GAP) g[i].y = g[i - 1].y + MIN_GAP;
    }
    // Passagem para cima
    for (let i = g.length - 2; i >= 0; i--) {
      if (g[i + 1].y - g[i].y < MIN_GAP) g[i].y = g[i + 1].y - MIN_GAP;
    }
  }

  const result = new Array<LabelPos>(filtrados.length);
  for (const l of [...sides[0], ...sides[1]]) result[l.index] = l;
  return result;
}

export function renderLabelPizza(pos: LabelPos) {
  const nome = pos.name.length > 12 ? pos.name.slice(0, 11) + "…" : pos.name;
  return (
    <g key={pos.index}>
      <path
        d={`M${pos.x1},${pos.y1} L${pos.ex},${pos.y} L${pos.tx},${pos.y}`}
        fill="none" stroke={pos.cor} strokeWidth={1} opacity={0.6}
      />
      <text x={pos.lx} y={pos.y - 5} textAnchor={pos.anchor} fontSize={9} fill="#374151" fontWeight="500">
        {nome}
      </text>
      <text x={pos.lx} y={pos.y + 7} textAnchor={pos.anchor} fontSize={9} fill={pos.cor} fontWeight="700">
        {(pos.pct * 100).toFixed(1)}%
      </text>
    </g>
  );
}

// ── GraficoPizza ─────────────────────────────────────────────────────────────

export interface Fatia {
  name: string;
  value: number;
  cor: string;
  brl: number;
}

function GraficoPizza({ titulo, dados }: { titulo: string; dados: Fatia[] }) {
  const filtrados = useMemo(() => dados.filter((d) => d.value >= 0.5), [dados]);

  // Mede a largura real do container para calcular cx correto
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(300);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pré-computa posições com resolução de colisão (cy = 120 = 50% de height=240)
  const labelPos = useMemo(
    () => buildLabels(filtrados, cw / 2, 120),
    [filtrados, cw],
  );

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", marginBottom: 4 }}>
        {titulo}
      </div>

      {filtrados.length === 0 ? (
        <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9CA3AF" }}>
          Sem dados
        </div>
      ) : (
        <div ref={wrapRef}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
              <Pie
                data={filtrados}
                cx="50%"
                cy="50%"
                outerRadius={OUTER_R}
                innerRadius={0}
                paddingAngle={1.5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                labelLine={false}
                label={(props) => {
                  const pos = labelPos[props.index];
                  return pos ? renderLabelPizza(pos) : null;
                }}
              >
                {filtrados.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v.toFixed(1)}%  ·  ${formatBRL(filtrados.find(d => d.name === name)?.brl ?? 0)}`,
                  name,
                ]}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "0.5px solid #E5E7EB" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── CardAlocacaoComparativa ────────────────────────────────────────────────────

export function CardAlocacaoComparativa({ macroAtual, macroMeta, patrimonio }: Props) {
  const montar = (macro: Record<string, number>): Fatia[] =>
    CARD_ORDER
      .map((id) => ({
        name: CARD_META[id].label,
        value: Number(macro[id]) || 0,
        cor: CARD_META[id].cor,
        brl: ((Number(macro[id]) || 0) / 100) * patrimonio,
      }))
      .filter((d) => d.value >= 0.5);

  const dadosAtual    = montar(macroAtual);
  const dadosProposta = montar(macroMeta);

  return (
    <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <i className="ti ti-chart-pie" style={{ fontSize: 18, color: "#2563EB" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Alocação Atual × Proposta</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <GraficoPizza titulo="Carteira Atual"    dados={dadosAtual} />
        <GraficoPizza titulo="Alocação Proposta" dados={dadosProposta} />
      </div>
    </div>
  );
}
