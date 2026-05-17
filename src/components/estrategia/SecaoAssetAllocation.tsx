import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Layers } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan, MacroalocacaoAlvo } from "@/types/financialPlanning";
import {
  PERFIL_LABELS,
  ALOCACAO_ALVO,
  calcularAlocacaoAtual,
} from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { CarteiraResultado } from "@/lib/carteira/types";

type SectionStatus = "pendente" | "revisando" | "concluido";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  comentario: string;
  onComentarioChange: (v: string) => void;
  status: SectionStatus;
  onStatusChange: (s: SectionStatus) => void;
}

type AssetKey = keyof MacroalocacaoAlvo;
const ASSET_LABELS: Record<AssetKey, string> = {
  rendaFixa: "Renda Fixa", acoes: "Ações", fiis: "FIIs",
  rvGlobal: "RV Global", rfGlobal: "RF Global", cripto: "Cripto",
};
const ASSET_KEYS: AssetKey[] = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"];
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6", "#f97316"];

function scoreBadge(score: number) {
  if (score >= 70) return { label: "Adequado", cls: "bg-emerald-100 text-emerald-800" };
  if (score >= 40) return { label: "Atenção", cls: "bg-amber-100 text-amber-800" };
  return { label: "Risco", cls: "bg-red-100 text-red-800" };
}

function getCarteiraTimestamp(clientId: string): string | null {
  try {
    const raw = localStorage.getItem(`carteira_${clientId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: string };
    return parsed.savedAt ?? null;
  } catch {
    return null;
  }
}

export function SecaoAssetAllocation({
  plan, clientName, comentario, onComentarioChange, status, onStatusChange,
}: Props) {
  const [mostrarCarteira, setMostrarCarteira] = useState(false);
  const [carteiraSalvaEm, setCarteiraSalvaEm] = useState<string | null>(
    () => getCarteiraTimestamp(plan.clientId)
  );

  const total =
    plan.ativosAtuais.total ||
    ASSET_KEYS.reduce((s, k) => s + (plan.ativosAtuais[k] ?? 0), 0);

  const alocacaoAtual = useMemo(
    () => calcularAlocacaoAtual({ ...plan.ativosAtuais, total: total || 1 }),
    [plan.ativosAtuais, total]
  );

  const alvo = plan.suitability ? ALOCACAO_ALVO[plan.suitability.perfil] : null;
  const gapTotal = alvo ? ASSET_KEYS.reduce((s, k) => s + Math.abs(alocacaoAtual[k] - alvo[k]), 0) : 0;
  const score = Math.max(0, Math.round(100 - gapTotal));
  const sb = scoreBadge(score);

  const pieData = ASSET_KEYS.filter((k) => alocacaoAtual[k] > 0).map((k, i) => ({
    name: ASSET_LABELS[k], value: parseFloat(alocacaoAtual[k].toFixed(1)), color: PIE_COLORS[i],
  }));

  const barData = ASSET_KEYS.map((k) => ({
    name: ASSET_LABELS[k], Atual: parseFloat(alocacaoAtual[k].toFixed(1)), Alvo: alvo ? alvo[k] : 0,
  }));

  const gaps = alvo
    ? ASSET_KEYS.filter((k) => Math.abs(alocacaoAtual[k] - alvo[k]) > 5).map(
        (k) => `${ASSET_LABELS[k]}: atual ${alocacaoAtual[k].toFixed(0)}% / alvo ${alvo[k]}%`
      )
    : [];

  const disabled = status === "concluido";

  function handleCarteiraSave(_resultado: CarteiraResultado) {
    const ts = getCarteiraTimestamp(plan.clientId);
    setCarteiraSalvaEm(ts);
    setMostrarCarteira(false);
  }

  if (mostrarCarteira) {
    return (
      <FerramentaCarteira
        clientName={clientName}
        clientId={plan.clientId}
        clientProfile={plan.suitability?.perfil ?? null}
        patrimonyInicial={total}
        onClose={() => setMostrarCarteira(false)}
        onSave={handleCarteiraSave}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Asset Allocation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Diagnóstico inicial</h3>
              <Badge className={sb.cls}>{sb.label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Patrimônio total</p>
                <p className="font-semibold">{formatCurrency(total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Perfil</p>
                <p className="font-semibold">{plan.suitability ? PERFIL_LABELS[plan.suitability.perfil] : "—"}</p>
              </div>
            </div>
            {total > 0 ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Alocação atual</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                        label={({ value }) => `${value}%`} labelLine={false}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {alvo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Atual vs Alvo (%)</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(v) => [`${v}%`]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Atual" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Alvo" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Patrimônio não informado.</p>
            )}
            {gaps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Principais gaps</p>
                <ul className="space-y-1">
                  {gaps.map((g, i) => (
                    <li key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{g}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Carteira tool button */}
            <div className="pt-1 flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setMostrarCarteira(true)}>
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Montar carteira completa →
              </Button>
              {carteiraSalvaEm && (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Carteira montada em {new Date(carteiraSalvaEm).toLocaleDateString("pt-BR")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-3">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Estratégia do assessor</h3>
            <p className="text-xs text-muted-foreground">Análise e estratégia para esta área</p>
            <Textarea
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              placeholder="Ex: Dado o perfil moderado, recomendamos migrar gradualmente para maior exposição internacional, reduzindo renda fixa de X% para Y% ao longo de 12 meses..."
              className="min-h-[200px]"
              disabled={disabled}
            />
            <div className="flex items-center gap-2">
              {status === "concluido" ? (
                <>
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => onStatusChange("revisando")}>Editar</Button>
                </>
              ) : (
                <Button onClick={() => onStatusChange("concluido")}>Marcar como concluída</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
