import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  macroAtual: Record<string, number>;
  macroMeta: Record<string, number>;
  patrimonio: number;
}

// ── Label customizado com linha de conexão ───────────────────────────────────────

const RADIAN = Math.PI / 180;

function renderLabel({
  cx, cy, midAngle, outerRadius, percent, name, cor,
}: {
  cx: number; cy: number; midAngle: number; outerRadius: number;
  percent: number; name: string; cor: string;
}) {
  if (percent < 0.03) return null;

  const x1 = cx + (outerRadius + 8)  * Math.cos(-midAngle * RADIAN);
  const y1 = cy + (outerRadius + 8)  * Math.sin(-midAngle * RADIAN);
  const x2 = cx + (outerRadius + 30) * Math.cos(-midAngle * RADIAN);
  const y2 = cy + (outerRadius + 30) * Math.sin(-midAngle * RADIAN);
  const x3 = x2 + (x2 > cx ? 16 : -16);

  const anchor = x2 > cx ? "start" : "end";
  const labelX = x2 > cx ? x3 + 2 : x3 - 2;
  const nomeExibido = name.length > 12 ? name.slice(0, 11) + "…" : name;

  return (
    <g>
      <path
        d={`M${x1},${y1} Q${x2},${y2} ${x3},${y2}`}
        fill="none"
        stroke={cor}
        strokeWidth={1}
        opacity={0.6}
      />
      <text x={labelX} y={y2 - 5} textAnchor={anchor} fontSize={9} fill="#374151" fontWeight="500">
        {nomeExibido}
      </text>
      <text x={labelX} y={y2 + 7} textAnchor={anchor} fontSize={9} fill={cor} fontWeight="700">
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
}

// ── GraficoPizza ─────────────────────────────────────────────────────────────

interface Fatia {
  name: string;
  value: number;
  cor: string;
  brl: number;
}

function GraficoPizza({ titulo, dados }: { titulo: string; dados: Fatia[] }) {
  const filtrados = dados.filter((d) => d.value >= 0.5);

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
        <ResponsiveContainer width="100%" height={240}>
          <PieChart margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
            <Pie
              data={filtrados}
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={0}
              paddingAngle={1.5}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              label={(props) => {
                const item = filtrados[props.index];
                return renderLabel({ ...props, cor: item?.cor ?? "#9CA3AF" });
              }}
            >
              {filtrados.map((entry, i) => (
                <Cell key={i} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [`${v.toFixed(1)}%  ·  ${formatBRL(filtrados.find(d => d.name === name)?.brl ?? 0)}`, name]}
              contentStyle={{ fontSize: 11, borderRadius: 6, border: "0.5px solid #E5E7EB" }}
            />
          </PieChart>
        </ResponsiveContainer>
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
