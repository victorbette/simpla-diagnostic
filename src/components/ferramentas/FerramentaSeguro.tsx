import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularSeguro,
  generateId,
  initialInsuranceData,
  type InsuranceData,
  type Debt,
  type Asset,
  type Child,
  type Policy,
  type LivingPolicy,
} from "@/lib/insuranceCalc";
import type { ProtecaoSimplificada } from "@/types/financialPlanning";
import { cn } from "@/lib/utils";

type Tab = "imediatas" | "continuas" | "vida" | "apolices";

interface Props {
  protecao: ProtecaoSimplificada;
  onSave: (data: InsuranceData, result: ReturnType<typeof calcularSeguro>) => void;
}

function prefill(protecao: ProtecaoSimplificada): InsuranceData {
  const base = { ...initialInsuranceData };
  base.familyExpenses = protecao.rendaMensal;
  if (protecao.possuiSeguroVida) {
    base.policies = [{ id: generateId(), name: "Apólice atual", value: protecao.capitalSeguradoVida }];
  }
  if (protecao.possuiSeguroInvalidez) {
    base.livingPolicies = [{ id: generateId(), name: "Invalidez atual", type: "disability", value: 0 }];
  }
  return base;
}

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "imediatas", label: "Necessidades imediatas" },
  { id: "continuas", label: "Necessidades contínuas" },
  { id: "vida", label: "Coberturas em vida" },
  { id: "apolices", label: "Apólices atuais" },
];

export function FerramentaSeguro({ protecao, onSave }: Props) {
  const [data, setData] = useState<InsuranceData>(() => prefill(protecao));
  const [tab, setTab] = useState<Tab>("imediatas");

  const resultado = calcularSeguro(data);
  const coveragePct = resultado.totalNeed > 0
    ? Math.min(100, (resultado.totalCoverage / resultado.totalNeed) * 100)
    : 0;

  function upd(patch: Partial<InsuranceData>) { setData(d => ({ ...d, ...patch })); }

  // Debts
  function addDebt() { upd({ debts: [...data.debts, { id: generateId(), name: "", value: 0 }] }); }
  function removeDebt(id: string) { upd({ debts: data.debts.filter(d => d.id !== id) }); }
  function updateDebt(id: string, patch: Partial<Debt>) {
    upd({ debts: data.debts.map(d => d.id === id ? { ...d, ...patch } : d) });
  }

  // Assets
  function addAsset() { upd({ assets: [...data.assets, { id: generateId(), name: "", value: 0 }] }); }
  function removeAsset(id: string) { upd({ assets: data.assets.filter(a => a.id !== id) }); }
  function updateAsset(id: string, patch: Partial<Asset>) {
    upd({ assets: data.assets.map(a => a.id === id ? { ...a, ...patch } : a) });
  }

  // Children
  function addChild() {
    upd({ children: [...data.children, { id: generateId(), name: "", currentAge: 5, independenceAge: 25, monthlyCost: 0 }] });
  }
  function removeChild(id: string) { upd({ children: data.children.filter(c => c.id !== id) }); }
  function updateChild(id: string, patch: Partial<Child>) {
    upd({ children: data.children.map(c => c.id === id ? { ...c, ...patch } : c) });
  }

  // Policies
  function addPolicy() { upd({ policies: [...data.policies, { id: generateId(), name: "", value: 0 }] }); }
  function removePolicy(id: string) { upd({ policies: data.policies.filter(p => p.id !== id) }); }
  function updatePolicy(id: string, patch: Partial<Policy>) {
    upd({ policies: data.policies.map(p => p.id === id ? { ...p, ...patch } : p) });
  }

  // Living Policies
  function addLivingPolicy() {
    upd({ livingPolicies: [...data.livingPolicies, { id: generateId(), name: "", type: "disability", value: 0 }] });
  }
  function removeLivingPolicy(id: string) { upd({ livingPolicies: data.livingPolicies.filter(p => p.id !== id) }); }
  function updateLivingPolicy(id: string, patch: Partial<LivingPolicy>) {
    upd({ livingPolicies: data.livingPolicies.map(p => p.id === id ? { ...p, ...patch } : p) });
  }

  function handleSave() { onSave(data, resultado); }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TAB_LABELS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Imediatas */}
      {tab === "imediatas" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <Label>Despesas com funeral estimadas</Label>
              <CurrencyInput value={data.funeralExpenses} onChange={v => upd({ funeralExpenses: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Alíquota ITCMD (%)</Label>
                <Select value={String(data.itcmdRate)} onValueChange={v => upd({ itcmdRate: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Honorários advocatícios (%)</Label>
                <Select value={String(data.lawyerFeeRate)} onValueChange={v => upd({ lawyerFeeRate: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dívidas</Label>
                <Button size="sm" variant="outline" onClick={addDebt}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
              </div>
              {data.debts.map(d => (
                <div key={d.id} className="flex gap-2 items-center">
                  <Input placeholder="Nome" value={d.name} onChange={e => updateDebt(d.id, { name: e.target.value })} className="flex-1" />
                  <div className="w-40"><CurrencyInput value={d.value} onChange={v => updateDebt(d.id, { value: v })} /></div>
                  <Button size="icon" variant="ghost" onClick={() => removeDebt(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {data.debts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma dívida cadastrada.</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ativos do inventário</Label>
                <Button size="sm" variant="outline" onClick={addAsset}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
              </div>
              {data.assets.map(a => (
                <div key={a.id} className="flex gap-2 items-center">
                  <Input placeholder="Nome" value={a.name} onChange={e => updateAsset(a.id, { name: e.target.value })} className="flex-1" />
                  <div className="w-40"><CurrencyInput value={a.value} onChange={v => updateAsset(a.id, { value: v })} /></div>
                  <Button size="icon" variant="ghost" onClick={() => removeAsset(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {data.assets.length === 0 && <p className="text-xs text-muted-foreground">Nenhum ativo cadastrado.</p>}
            </div>
            <Card>
              <CardContent className="pt-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Resumo imediato</p>
                {[
                  { label: "Total de ativos", value: resultado.totalAssets },
                  { label: "Total de dívidas", value: resultado.totalDebts },
                  { label: "Custo do inventário (ITCMD + adv.)", value: resultado.inventoryCost },
                  { label: "Funeral", value: data.funeralExpenses },
                  { label: "Total imediato", value: resultado.immediateTotal, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
                    <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Contínuas */}
      {tab === "continuas" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <Label>Despesas mensais da família</Label>
              <CurrencyInput value={data.familyExpenses} onChange={v => upd({ familyExpenses: v })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Renda mensal do cônjuge</Label>
              <CurrencyInput value={data.spouseIncome} onChange={v => upd({ spouseIncome: v })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coverage">Anos de cobertura do estilo de vida</Label>
              <Input id="coverage" type="number" min={1} max={40} value={data.coveragePeriod}
                onChange={e => upd({ coveragePeriod: Number(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Filhos</Label>
                <Button size="sm" variant="outline" onClick={addChild}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
              </div>
              {data.children.map(c => (
                <Card key={c.id}>
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Nome" value={c.name} onChange={e => updateChild(c.id, { name: e.target.value })} className="flex-1" />
                      <Button size="icon" variant="ghost" onClick={() => removeChild(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Idade atual</Label>
                        <Input type="number" min={0} max={40} value={c.currentAge} onChange={e => updateChild(c.id, { currentAge: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label className="text-xs">Independência</Label>
                        <Input type="number" min={c.currentAge + 1} max={40} value={c.independenceAge} onChange={e => updateChild(c.id, { independenceAge: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label className="text-xs">Custo/mês</Label>
                        <CurrencyInput value={c.monthlyCost} onChange={v => updateChild(c.id, { monthlyCost: v })} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Resumo contínuo</p>
              {[
                { label: "Gap de renda mensal", value: Math.max(0, data.familyExpenses - data.spouseIncome) },
                { label: "Cobertura de estilo de vida", value: resultado.lifestyleTotal },
                { label: "Educação dos filhos", value: resultado.educationTotal },
                { label: "Total contínuo", value: resultado.ongoingTotal, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
                  <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>{formatCurrency(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Coberturas em vida */}
      {tab === "vida" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Switch checked={data.hasPrivatePension} onCheckedChange={v => upd({ hasPrivatePension: v })} id="pension" />
              <Label htmlFor="pension" className="cursor-pointer">Tem previdência privada?</Label>
            </div>
            {data.hasPrivatePension && (
              <div className="ml-8 flex flex-col gap-1.5">
                <Label>Saldo acumulado na previdência</Label>
                <CurrencyInput value={data.privatePensionBalance} onChange={v => upd({ privatePensionBalance: v })} />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Coberturas em vida (IPA/DG/MA)</Label>
                <Button size="sm" variant="outline" onClick={addLivingPolicy}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
              </div>
              {data.livingPolicies.map(p => (
                <div key={p.id} className="flex gap-2 items-center">
                  <Select value={p.type} onValueChange={v => updateLivingPolicy(p.id, { type: v as LivingPolicy["type"] })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disability">Invalidez (IPA)</SelectItem>
                      <SelectItem value="criticalIllness">Doenças graves (DG)</SelectItem>
                      <SelectItem value="accidentalDeath">Morte acidental (MA)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Nome" value={p.name} onChange={e => updateLivingPolicy(p.id, { name: e.target.value })} className="flex-1" />
                  <div className="w-36"><CurrencyInput value={p.value} onChange={v => updateLivingPolicy(p.id, { value: v })} /></div>
                  <Button size="icon" variant="ghost" onClick={() => removeLivingPolicy(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-semibold">Necessidades em caso de invalidez/doença</p>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Custo de adaptação (cadeira, obra etc.)</Label>
                <CurrencyInput value={data.livingBenefits.adaptationCost}
                  onChange={v => upd({ livingBenefits: { ...data.livingBenefits, adaptationCost: v } })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Custo mensal da família durante tratamento</Label>
                <CurrencyInput value={data.livingBenefits.familyMonthlyCost}
                  onChange={v => upd({ livingBenefits: { ...data.livingBenefits, familyMonthlyCost: v } })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Reserva para tratamentos extras</Label>
                <CurrencyInput value={data.livingBenefits.extraTreatmentReserve}
                  onChange={v => upd({ livingBenefits: { ...data.livingBenefits, extraTreatmentReserve: v } })} />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Necessidades em vida</p>
              {[
                { label: "Necessidade de invalidez (5 anos)", value: resultado.disabilityTotal },
                { label: "Cobertura invalidez atual", value: resultado.disabilityCoverage },
                { label: "Gap invalidez", value: resultado.disabilityGap, cls: resultado.disabilityGap > 0 ? "text-destructive" : "text-emerald-600" },
                { label: "Necessidade doenças graves (1 ano)", value: resultado.criticalIllnessTotal },
                { label: "Cobertura DG atual", value: resultado.criticalIllnessCoverage },
                { label: "Gap DG", value: resultado.criticalIllnessGap, cls: resultado.criticalIllnessGap > 0 ? "text-destructive" : "text-emerald-600" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`tabular-nums ${cls ?? ""}`}>{formatCurrency(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Apólices */}
      {tab === "apolices" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Apólices de seguro de vida</Label>
              <Button size="sm" variant="outline" onClick={addPolicy}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar</Button>
            </div>
            {data.policies.map(p => (
              <div key={p.id} className="flex gap-2 items-center">
                <Input placeholder="Nome da apólice" value={p.name} onChange={e => updatePolicy(p.id, { name: e.target.value })} className="flex-1" />
                <div className="w-44"><CurrencyInput value={p.value} onChange={v => updatePolicy(p.id, { value: v })} /></div>
                <Button size="icon" variant="ghost" onClick={() => removePolicy(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {data.policies.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma apólice cadastrada.</p>}
          </div>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Resumo de cobertura</p>
              <div className="space-y-1.5">
                {[
                  { label: "Capital necessário total", value: resultado.totalNeed, bold: true },
                  { label: "Capital segurado atual", value: resultado.totalCoverage, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
                    <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cobertura</span>
                  <span>{formatNumber(coveragePct, 0)}%</span>
                </div>
                <Progress value={coveragePct} className="h-2" />
              </div>
              {resultado.gap > 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <p className="text-xs text-red-700">Gap descoberto</p>
                  <p className="text-2xl font-bold text-red-700 tabular-nums">{formatCurrency(resultado.gap)}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-sm font-semibold text-emerald-700">Cobertura adequada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer fixo */}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-4 border-t bg-background px-6 py-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Capital necessário</p>
            <p className="text-base font-bold tabular-nums">{formatCurrency(resultado.totalNeed)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Capital segurado</p>
            <p className="text-base font-bold tabular-nums text-primary">{formatCurrency(resultado.totalCoverage)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gap</p>
            <p className={`text-base font-bold tabular-nums ${resultado.gap > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {formatCurrency(resultado.gap)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave}>Salvar análise</Button>
      </div>
    </div>
  );
}
