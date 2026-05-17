import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { SecaoEstrategia } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import {
  PERFIL_LABELS,
  ALOCACAO_ALVO,
  calcularAlocacaoAtual,
} from "@/types/financialPlanning";

interface Props {
  secao: SecaoEstrategia;
  onChange: (s: SecaoEstrategia) => void;
  financialPlan: FinancialPlan | null;
}

type AssetKey = "rendaFixa" | "acoes" | "fiis" | "rvGlobal" | "rfGlobal" | "cripto";

const ASSET_LABELS: Record<AssetKey, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};

const ASSET_KEYS: AssetKey[] = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6", "#f97316"];

export function SecaoAssetAllocation({ secao, onChange, financialPlan }: Props) {
  const plan = financialPlan;

  const ativos = plan?.ativosAtuais;
  const total = ativos?.total ?? 0;
  const alocacaoAtual = ativos ? calcularAlocacaoAtual(ativos) : null;
  const perfil = plan?.suitability?.perfil;
  const alocacaoAlvo = perfil
    ? (plan?.alocacaoPersonalizada ?? ALOCACAO_ALVO[perfil])
    : null;

  const pieData = alocacaoAtual
    ? ASSET_KEYS.map((key, i) => ({
        name: ASSET_LABELS[key],
        value: alocacaoAtual[key],
        color: PIE_COLORS[i],
      })).filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Asset Allocation</h2>
        {perfil && (
          <Badge variant="secondary">
            Perfil: {PERFIL_LABELS[perfil]}
          </Badge>
        )}
      </div>

      {alocacaoAtual && alocacaoAlvo ? (
        <>
          {/* Allocation table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Classe</th>
                  <th className="text-right py-2 pr-4 font-medium">Valor R$</th>
                  <th className="text-right py-2 pr-4 font-medium">% Atual</th>
                  <th className="text-right py-2 pr-4 font-medium">% Alvo</th>
                  <th className="text-right py-2 font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {ASSET_KEYS.map((key) => {
                  const pct = alocacaoAtual[key];
                  const alvo = alocacaoAlvo[key];
                  const gap = alvo - pct;
                  const valor = total * (pct / 100);
                  return (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-2 pr-4">{ASSET_LABELS[key]}</td>
                      <td className="text-right py-2 pr-4">{formatCurrency(valor)}</td>
                      <td className="text-right py-2 pr-4">{pct.toFixed(1)}%</td>
                      <td className="text-right py-2 pr-4">{alvo.toFixed(1)}%</td>
                      <td
                        className={cn(
                          "text-right py-2 font-medium",
                          gap > 0 ? "text-green-600" : gap < 0 ? "text-red-600" : "text-muted-foreground"
                        )}
                      >
                        {gap > 0 ? "+" : ""}{gap.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pie chart */}
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Alocação atual
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name}: ${value.toFixed(1)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum dado de alocação disponível. Preencha o plano financeiro primeiro.
        </p>
      )}

      {/* Editable area */}
      <div className="space-y-2">
        <Label htmlFor="aaConteudo">
          Estratégia de rebalanceamento e produtos sugeridos
        </Label>
        <Textarea
          id="aaConteudo"
          value={secao.conteudoAssessor}
          onChange={(ev) =>
            onChange({ ...secao, conteudoAssessor: ev.target.value })
          }
          placeholder="Descreva a estratégia de rebalanceamento e os produtos recomendados..."
          className="min-h-[140px]"
          disabled={secao.completa}
        />
      </div>

      <Button
        variant={secao.completa ? "outline" : "default"}
        onClick={() => onChange({ ...secao, completa: !secao.completa })}
      >
        {secao.completa ? "Editar" : "Marcar como completa"}
      </Button>
    </div>
  );
}
