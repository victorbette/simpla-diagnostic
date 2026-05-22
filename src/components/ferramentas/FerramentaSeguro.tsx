import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";

type Tab = "imediatas" | "continuas" | "vida" | "apolices";

interface Props {
  protecao: ProtecaoSimplificada;
  onSave: (data: InsuranceData, result: ReturnType<typeof calcularSeguro>) => void;
  clientId: string;
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

export function FerramentaSeguro({ protecao, onSave, clientId }: Props) {
  const [data, setData] = useState<InsuranceData>(() => prefill(protecao));
  const [tab, setTab] = useState<Tab>("imediatas");

  const CHAVE = `ferramenta_seguro_${clientId}`;
  const temDadosSalvos = localStorage.getItem(CHAVE) !== null;

  const initialData = prefill(protecao);

  const { limpar } = useFerramentaStorage(
    CHAVE,
    { data, tab },
    (v) => {
      if (v.data) setData({ ...initialInsuranceData, ...v.data });
      if (v.tab) setTab(v.tab as Tab);
    },
    { data: initialData, tab: "imediatas" as Tab },
  );

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "8px 12px", backgroundColor: "#F5F3EE", borderRadius: 8, border: "1px solid #E2DCC8" }}>
        <span style={{ fontSize: 11, color: "#BBA866", display: "flex", alignItems: "center", gap: 4 }}>
          {temDadosSalvos ? "● Dados salvos automaticamente" : "○ Preencha os dados abaixo"}
        </span>
        {temDadosSalvos && (
          <button
            onClick={() => { if (window.confirm("Limpar todos os dados desta análise?")) limpar(); }}
            style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.15)", color: "#6B6347", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
          >
            Limpar dados
          </button>
        )}
      </div>
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TAB_LABELS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={
              tab === t.id
                ? { borderColor: "#7A3535", color: "#000000" }
                : { borderColor: "transparent", color: "#6B6347" }
            }
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
                <button
                  onClick={addDebt}
                  style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                >
                  <Plus className="h-3.5 w-3.5" />Adicionar
                </button>
              </div>
              {data.debts.map(d => (
                <div key={d.id} className="flex gap-2 items-center">
                  <Input placeholder="Nome" value={d.name} onChange={e => updateDebt(d.id, { name: e.target.value })} className="flex-1" />
                  <div className="w-40"><CurrencyInput value={d.value} onChange={v => updateDebt(d.id, { value: v })} /></div>
                  <button onClick={() => removeDebt(d.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
              {data.debts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma dívida cadastrada.</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ativos do inventário</Label>
                <button
                  onClick={addAsset}
                  style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                >
                  <Plus className="h-3.5 w-3.5" />Adicionar
                </button>
              </div>
              {data.assets.map(a => (
                <div key={a.id} className="flex gap-2 items-center">
                  <Input placeholder="Nome" value={a.name} onChange={e => updateAsset(a.id, { name: e.target.value })} className="flex-1" />
                  <div className="w-40"><CurrencyInput value={a.value} onChange={v => updateAsset(a.id, { value: v })} /></div>
                  <button onClick={() => removeAsset(a.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
              {data.assets.length === 0 && <p className="text-xs text-muted-foreground">Nenhum ativo cadastrado.</p>}
            </div>
            <Card style={{ borderTop: "3px solid #7A3535", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <CardContent className="pt-4 space-y-1.5">
                <p className="text-xs font-semibold" style={{ color: "#6B6347" }}>Resumo imediato</p>
                {[
                  { label: "Total de ativos", value: resultado.totalAssets },
                  { label: "Total de dívidas", value: resultado.totalDebts },
                  { label: "Custo do inventário (ITCMD + adv.)", value: resultado.inventoryCost },
                  { label: "Funeral", value: data.funeralExpenses },
                  { label: "Total imediato", value: resultado.immediateTotal, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: bold ? "#000000" : "#6B6347", fontWeight: bold ? 600 : undefined }}>{label}</span>
                    <span className="tabular-nums" style={{ color: bold ? "#000000" : undefined, fontWeight: bold ? 600 : undefined }}>{formatCurrency(value)}</span>
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
                <button
                  onClick={addChild}
                  style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                >
                  <Plus className="h-3.5 w-3.5" />Adicionar
                </button>
              </div>
              {data.children.map(c => (
                <Card key={c.id}>
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Nome" value={c.name} onChange={e => updateChild(c.id, { name: e.target.value })} className="flex-1" />
                      <button onClick={() => removeChild(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
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

          <Card style={{ borderTop: "3px solid #7A3535", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CardContent className="pt-4 space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: "#6B6347" }}>Resumo contínuo</p>
              {[
                { label: "Gap de renda mensal", value: Math.max(0, data.familyExpenses - data.spouseIncome) },
                { label: "Cobertura de estilo de vida", value: resultado.lifestyleTotal },
                { label: "Educação dos filhos", value: resultado.educationTotal },
                { label: "Total contínuo", value: resultado.ongoingTotal, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: bold ? "#000000" : "#6B6347", fontWeight: bold ? 600 : undefined }}>{label}</span>
                  <span className="tabular-nums" style={{ color: bold ? "#000000" : undefined, fontWeight: bold ? 600 : undefined }}>{formatCurrency(value)}</span>
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
                <button
                  onClick={addLivingPolicy}
                  style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
                >
                  <Plus className="h-3.5 w-3.5" />Adicionar
                </button>
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
                  <button onClick={() => removeLivingPolicy(p.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
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

          <Card style={{ borderTop: "3px solid #7A3535", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CardContent className="pt-4 space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: "#6B6347" }}>Necessidades em vida</p>
              {[
                { label: "Necessidade de invalidez (5 anos)", value: resultado.disabilityTotal, neg: false },
                { label: "Cobertura invalidez atual", value: resultado.disabilityCoverage, neg: false },
                { label: "Gap invalidez", value: resultado.disabilityGap, neg: resultado.disabilityGap > 0 },
                { label: "Necessidade doenças graves (1 ano)", value: resultado.criticalIllnessTotal, neg: false },
                { label: "Cobertura DG atual", value: resultado.criticalIllnessCoverage, neg: false },
                { label: "Gap DG", value: resultado.criticalIllnessGap, neg: resultado.criticalIllnessGap > 0 },
              ].map(({ label, value, neg }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: "#6B6347" }}>{label}</span>
                  <span className="tabular-nums" style={{ color: neg ? "#7A3535" : (resultado.disabilityGap <= 0 && label === "Gap invalidez") || (resultado.criticalIllnessGap <= 0 && label === "Gap DG") ? "#059669" : undefined }}>{formatCurrency(value)}</span>
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
              <button
                onClick={addPolicy}
                style={{ border: "1px solid #000000", color: "#000000", backgroundColor: "transparent", borderRadius: 6, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}
              >
                <Plus className="h-3.5 w-3.5" />Adicionar
              </button>
            </div>
            {data.policies.map(p => (
              <div key={p.id} className="flex gap-2 items-center">
                <Input placeholder="Nome da apólice" value={p.name} onChange={e => updatePolicy(p.id, { name: e.target.value })} className="flex-1" />
                <div className="w-44"><CurrencyInput value={p.value} onChange={v => updatePolicy(p.id, { value: v })} /></div>
                <button onClick={() => removePolicy(p.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {data.policies.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma apólice cadastrada.</p>}
          </div>

          <Card style={{ borderTop: "3px solid #7A3535", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold" style={{ color: "#6B6347" }}>Resumo de cobertura</p>
              <div className="space-y-1.5">
                {[
                  { label: "Capital necessário total", value: resultado.totalNeed, bold: true },
                  { label: "Capital segurado atual", value: resultado.totalCoverage, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span style={{ color: bold ? "#000000" : "#6B6347", fontWeight: bold ? 600 : undefined }}>{label}</span>
                    <span className="tabular-nums" style={{ color: bold ? "#000000" : undefined, fontWeight: bold ? 600 : undefined }}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#6B6347" }}>Cobertura</span>
                  <span>{formatNumber(coveragePct, 0)}%</span>
                </div>
                <Progress value={coveragePct} className="h-2" />
              </div>
              {resultado.gap > 0 ? (
                <div style={{ border: "1px solid #C8A8A8", backgroundColor: "#F2EBEB", borderRadius: 8, padding: 12, textAlign: "center" }}>
                  <p className="text-xs" style={{ color: "#7A3535" }}>Gap descoberto</p>
                  <p className="tabular-nums" style={{ color: "#7A3535", fontSize: 22, fontWeight: 700 }}>{formatCurrency(resultado.gap)}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#A8C8AB] bg-[#EBF2EC] p-3 text-center">
                  <p className="text-sm font-semibold text-[#3D6B41]">Cobertura adequada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer fixo */}
      <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-4 border-t px-6 py-4" style={{ backgroundColor: "white" }}>
        <div className="flex gap-6">
          <div>
            <p className="text-xs" style={{ color: "#6B6347" }}>Capital necessário</p>
            <p className="text-base font-bold tabular-nums" style={{ color: "#000000" }}>{formatCurrency(resultado.totalNeed)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#6B6347" }}>Capital segurado</p>
            <p className="text-base font-bold tabular-nums" style={{ color: "#000000" }}>{formatCurrency(resultado.totalCoverage)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#6B6347" }}>Gap</p>
            <p className="text-base font-bold tabular-nums" style={{ color: resultado.gap > 0 ? "#7A3535" : "#059669" }}>
              {formatCurrency(resultado.gap)}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          style={{ backgroundColor: "#7A3535", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Salvar análise
        </button>
      </div>
    </div>
  );
}
