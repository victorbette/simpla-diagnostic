import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatBRL } from "@/lib/carteira/calculos";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";

interface Props {
  macroAtual: Record<string, number>;
  macroMeta: Record<string, number>;
  patrimonio: number;
}

interface PizzaSlice {
  name: string;
  value: number;
  cor: string;
  brl: number;
}

function ColunaPizza({ titulo, dados, placeholder }: { titulo: string; dados: PizzaSlice[]; placeholder?: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", margin: "0 0 12px" }}>
        {titulo}
      </p>

      {dados.length === 0 ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB", borderRadius: 8, flexDirection: "column", gap: 6 }}>
          <PieChartIcon size={28} color="#D1D5DB" strokeWidth={1.5} />
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{placeholder ?? "Sem dados"}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={dados}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={85}
              paddingAngle={1.5}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {dados.map((entry, i) => (
                <Cell key={i} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #E5E7EB" }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {dados.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 12 }}>
          {dados.map((d) => (
            <div
              key={d.name}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid #F9FAFB" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: d.cor, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#374151" }}>{d.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: d.cor }}>{d.value.toFixed(1).replace(".", ",")}%</span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{formatBRL(d.brl)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CardAlocacaoComparativa({ macroAtual, macroMeta, patrimonio }: Props) {
  const dadosAtual: PizzaSlice[] = CARD_ORDER
    .map((cardId) => ({
      name: CARD_META[cardId].label,
      value: Number(macroAtual[cardId]) || 0,
      cor: CARD_META[cardId].cor,
      brl: ((Number(macroAtual[cardId]) || 0) / 100) * patrimonio,
    }))
    .filter((d) => d.value > 0);

  const dadosMeta: PizzaSlice[] = CARD_ORDER
    .map((cardId) => ({
      name: CARD_META[cardId].label,
      value: Number(macroMeta[cardId]) || 0,
      cor: CARD_META[cardId].cor,
      brl: ((Number(macroMeta[cardId]) || 0) / 100) * patrimonio,
    }))
    .filter((d) => d.value > 0);

  return (
    <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <i className="ti ti-chart-pie" style={{ fontSize: 18, color: "#2563EB" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Alocação Atual × Proposta</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <ColunaPizza
          titulo="Carteira Atual"
          dados={dadosAtual}
          placeholder="Carteira atual não informada"
        />
        <ColunaPizza
          titulo="Alocação Proposta"
          dados={dadosMeta}
        />
      </div>
    </div>
  );
}
