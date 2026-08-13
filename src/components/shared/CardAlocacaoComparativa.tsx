import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";

interface Props {
  macroAtual: Record<string, number>;
  macroMeta: Record<string, number>;
  patrimonio: number;
}

// ── Mantido para compatibilidade — não utilizado internamente ─────────────────
const RADIAN = Math.PI / 180;

export function renderLabelPizza({
  cx, cy, midAngle, outerRadius, percent, name, cor,
}: {
  cx: number; cy: number; midAngle: number; outerRadius: number;
  percent: number; name: string; cor: string;
}) {
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
      <path d={`M${x1},${y1} Q${x2},${y2} ${x3},${y2}`} fill="none" stroke={cor} strokeWidth={1} opacity={0.6} />
      <text x={labelX} y={y2 - 5} textAnchor={anchor} fontSize={9} fill="#374151" fontWeight="500">{nomeExibido}</text>
      <text x={labelX} y={y2 + 7} textAnchor={anchor} fontSize={9} fill={cor} fontWeight="700">{(percent * 100).toFixed(1)}%</text>
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
  const filtrados = dados.filter((d) => d.value >= 0.5);

  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: "#6B7280",
        textTransform: "uppercase", letterSpacing: "0.05em",
        textAlign: "center", marginBottom: 10,
      }}>
        {titulo}
      </div>

      {filtrados.length === 0 ? (
        <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9CA3AF" }}>
          Sem dados
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Pie — tamanho fixo, sem margens para labels flutuantes */}
          <div style={{ flexShrink: 0 }}>
            <PieChart width={160} height={160}>
              <Pie
                data={filtrados}
                cx={80}
                cy={80}
                outerRadius={74}
                innerRadius={0}
                paddingAngle={1.5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                label={false}
                labelLine={false}
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
          </div>

          {/* Legenda lateral — sem sobreposição possível */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            {filtrados.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <div style={{
                  width: 9, height: 9, borderRadius: 2,
                  background: item.cor, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 10.5, color: "#374151", flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 10.5, color: item.cor, fontWeight: 700, flexShrink: 0 }}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
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
