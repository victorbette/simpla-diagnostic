import { useState, useEffect } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import {
  calcularSeguro,
  generateId,
  initialInsuranceData,
  initialLivingBenefits,
  type InsuranceData,
  type Debt,
  type Asset,
  type Child,
  type Policy,
  type LivingPolicy,
} from "@/lib/insuranceCalc";
import type { ProtecaoSimplificada, DadosCliente } from "@/types/financialPlanning";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";

interface Props {
  protecao: ProtecaoSimplificada;
  onSave?: (data: InsuranceData, result: ReturnType<typeof calcularSeguro>) => void | Promise<void>;
  clientId: string;
  dadosCliente?: DadosCliente;
}

function prefill(protecao: ProtecaoSimplificada, dadosCliente?: DadosCliente): InsuranceData {
  const base = { ...initialInsuranceData };
  base.familyExpenses = Number(dadosCliente?.custoDeVidaMensal) || protecao.rendaMensal;
  if (protecao.possuiSeguroVida) {
    base.policies = [{ id: generateId(), name: "Apólice atual", value: protecao.capitalSeguradoVida }];
  }
  if (protecao.possuiSeguroInvalidez) {
    base.livingPolicies = [{ id: generateId(), name: "Invalidez atual", type: "disability", value: 0 }];
  }
  if (dadosCliente) {
    base.temPrevidencia = dadosCliente.possuiPrevidencia ?? false;
    base.saldoPrevidencia = Number(dadosCliente.saldoPrevidencia) || 0;
    base.livingBenefits = { ...initialLivingBenefits, familyMonthlyCost: Number(dadosCliente.custoDeVidaMensal) || 0 };
    if (dadosCliente.filhos?.length) {
      base.children = dadosCliente.filhos.map(f => ({
        id: generateId(),
        name: f.nome,
        currentAge: f.idade ?? 0,
        independenceAge: 25,
        monthlyCost: 0,
      }));
    }
  }
  return base;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  border: "0.5px solid #E5E7EB",
  borderRadius: 12,
  padding: "20px 24px",
};

const CARD_HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingBottom: 14,
  marginBottom: 16,
  borderBottom: "0.5px solid #F3F4F6",
};

const CARD_ICON: React.CSSProperties = {
  width: 32,
  height: 32,
  backgroundColor: "#EFF6FF",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "#6B7280",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
  display: "block",
};

const INPUT: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  outline: "none",
  color: "#111827",
};

const SELECT: React.CSSProperties = {
  ...INPUT,
  cursor: "pointer",
  backgroundColor: "white",
};

const ADD_BTN: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  color: "#374151",
  backgroundColor: "transparent",
  borderRadius: 8,
  padding: "5px 12px",
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const REMOVE_BTN: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#9CA3AF",
  padding: "4px",
  lineHeight: 1,
  flexShrink: 0,
};

// ── Main component ──────────────────────────────────────────────────────────

export function FerramentaSeguro({ protecao, onSave, clientId, dadosCliente }: Props) {
  const CHAVE = `ferramenta_seguro_${clientId}`;
  const initialData = prefill(protecao, dadosCliente);

  const [data, setData] = useState<InsuranceData>(() => initialData);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useFerramentaStorage(
    CHAVE,
    { data },
    (v) => {
      if (v.data) setData({ ...initialInsuranceData, ...v.data });
    },
    { data: initialData },
  );

  const resultado = calcularSeguro(data);

  function upd(patch: Partial<InsuranceData>) { setData(d => ({ ...d, ...patch })); }

  // Sync previdencia switch when coleta changes
  const possuiPrevidenciaColeta = dadosCliente?.possuiPrevidencia ?? false;
  useEffect(() => {
    setData(prev => ({ ...prev, temPrevidencia: possuiPrevidenciaColeta }));
  }, [possuiPrevidenciaColeta]);

  // ── Derivations from coleta ──────────────────────────────────────────────
  const custoDeVidaColeta = Number(dadosCliente?.custoDeVidaMensal) || 0;
  const saldoPrevidenciaColeta = Number(dadosCliente?.saldoPrevidencia) || 0;
  const filhosColeta = dadosCliente?.filhos ?? [];
  const filhosNaoImportados = filhosColeta.filter(fc => !data.children.some(c => c.name === fc.nome));

  function importarFilhosDaColeta() {
    upd({
      children: filhosColeta.map(f => ({
        id: generateId(),
        name: f.nome,
        currentAge: f.idade ?? 0,
        independenceAge: 25,
        monthlyCost: 0,
      })),
    });
  }

  // ── CRUD helpers ─────────────────────────────────────────────────────────
  function addDebt() { upd({ debts: [...data.debts, { id: generateId(), name: "", value: 0 }] }); }
  function removeDebt(id: string) { upd({ debts: data.debts.filter(d => d.id !== id) }); }
  function updateDebt(id: string, patch: Partial<Debt>) {
    upd({ debts: data.debts.map(d => d.id === id ? { ...d, ...patch } : d) });
  }

  function addAsset() { upd({ assets: [...data.assets, { id: generateId(), name: "", value: 0 }] }); }
  function removeAsset(id: string) { upd({ assets: data.assets.filter(a => a.id !== id) }); }
  function updateAsset(id: string, patch: Partial<Asset>) {
    upd({ assets: data.assets.map(a => a.id === id ? { ...a, ...patch } : a) });
  }

  function addChild() {
    upd({ children: [...data.children, { id: generateId(), name: "", currentAge: 5, independenceAge: 25, monthlyCost: 0 }] });
  }
  function removeChild(id: string) { upd({ children: data.children.filter(c => c.id !== id) }); }
  function updateChild(id: string, patch: Partial<Child>) {
    upd({ children: data.children.map(c => c.id === id ? { ...c, ...patch } : c) });
  }

  function addPolicy() { upd({ policies: [...data.policies, { id: generateId(), name: "", value: 0 }] }); }
  function removePolicy(id: string) { upd({ policies: data.policies.filter(p => p.id !== id) }); }
  function updatePolicy(id: string, patch: Partial<Policy>) {
    upd({ policies: data.policies.map(p => p.id === id ? { ...p, ...patch } : p) });
  }

  function addLivingPolicy() {
    upd({ livingPolicies: [...data.livingPolicies, { id: generateId(), name: "", type: "disability", value: 0 }] });
  }
  function removeLivingPolicy(id: string) { upd({ livingPolicies: data.livingPolicies.filter(p => p.id !== id) }); }
  function updateLivingPolicy(id: string, patch: Partial<LivingPolicy>) {
    upd({ livingPolicies: data.livingPolicies.map(p => p.id === id ? { ...p, ...patch } : p) });
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      await onSave?.(data, resultado);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  const gapColor = resultado.gap > 0 ? "#B91C1C" : "#15803D";
  const adequado = resultado.gap <= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── CARD 1: Necessidades Imediatas ──────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-alert-circle" style={{ fontSize: 17, color: "#2563EB" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Imediatas</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Despesas com funeral</label>
            <CurrencyInput value={data.funeralExpenses} onChange={v => upd({ funeralExpenses: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Alíquota ITCMD (%)</label>
            <select
              value={String(data.itcmdRate)}
              onChange={e => upd({ itcmdRate: Number(e.target.value) })}
              style={SELECT}
            >
              {[4, 5, 6, 7, 8].map(r => <option key={r} value={String(r)}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label style={FIELD_LABEL}>Honorários advocatícios (%)</label>
            <select
              value={String(data.lawyerFeeRate)}
              onChange={e => upd({ lawyerFeeRate: Number(e.target.value) })}
              style={SELECT}
            >
              {[4, 5, 6, 7, 8].map(r => <option key={r} value={String(r)}>{r}%</option>)}
            </select>
          </div>
        </div>

        {/* Dívidas */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...FIELD_LABEL, margin: 0 }}>Dívidas</span>
            <button onClick={addDebt} style={ADD_BTN}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Adicionar
            </button>
          </div>
          {data.debts.map(d => (
            <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input
                placeholder="Nome"
                value={d.name}
                onChange={e => updateDebt(d.id, { name: e.target.value })}
                style={{ ...INPUT, flex: 1 }}
              />
              <div style={{ width: 140, flexShrink: 0 }}>
                <CurrencyInput value={d.value} onChange={v => updateDebt(d.id, { value: v })} />
              </div>
              <button onClick={() => removeDebt(d.id)} style={REMOVE_BTN}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
          {data.debts.length === 0 && (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhuma dívida cadastrada.</p>
          )}
        </div>

        {/* Ativos do inventário */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...FIELD_LABEL, margin: 0 }}>Ativos do inventário</span>
            <button onClick={addAsset} style={ADD_BTN}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Adicionar
            </button>
          </div>
          {data.assets.map(a => (
            <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input
                placeholder="Nome"
                value={a.name}
                onChange={e => updateAsset(a.id, { name: e.target.value })}
                style={{ ...INPUT, flex: 1 }}
              />
              <div style={{ width: 140, flexShrink: 0 }}>
                <CurrencyInput value={a.value} onChange={v => updateAsset(a.id, { value: v })} />
              </div>
              <button onClick={() => removeAsset(a.id)} style={REMOVE_BTN}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
          {data.assets.length === 0 && (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhum ativo cadastrado.</p>
          )}
        </div>

        {/* Subtotal */}
        <div style={{ marginTop: 14, backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Total imediato</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(resultado.immediateTotal)}</span>
        </div>
      </div>

      {/* ── CARD 2: Necessidades Contínuas ──────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-users" style={{ fontSize: 17, color: "#2563EB" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Contínuas</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ ...FIELD_LABEL, margin: 0 }}>
                Despesas mensais
                {custoDeVidaColeta > 0 && (
                  <span style={{ fontSize: 10, color: "#1E40AF", backgroundColor: "#DBEAFE", padding: "1px 6px", borderRadius: 99, marginLeft: 6, fontWeight: 600 }}>
                    Da coleta
                  </span>
                )}
              </label>
              {custoDeVidaColeta > 0 && data.familyExpenses !== custoDeVidaColeta && (
                <button
                  onClick={() => upd({ familyExpenses: custoDeVidaColeta })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: 0 }}
                >
                  ↺ Restaurar
                </button>
              )}
            </div>
            <CurrencyInput value={data.familyExpenses} onChange={v => upd({ familyExpenses: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Renda mensal do cônjuge</label>
            <CurrencyInput value={data.spouseIncome} onChange={v => upd({ spouseIncome: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Anos de cobertura</label>
            <input
              type="number"
              min={1}
              max={40}
              value={data.coveragePeriod}
              onChange={e => upd({ coveragePeriod: Number(e.target.value) })}
              style={INPUT}
            />
          </div>
        </div>

        {/* Previdência */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span
              onClick={() => upd({ temPrevidencia: !data.temPrevidencia })}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                backgroundColor: data.temPrevidencia ? "#2563EB" : "#D1D5DB",
                position: "relative",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.2s",
                display: "inline-block",
              }}
            >
              <span style={{
                position: "absolute",
                top: 2,
                left: data.temPrevidencia ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
              }} />
            </span>
            <span style={{ fontSize: 13, color: "#374151" }}>
              Possui Previdência (PGBL/VGBL)?
              {possuiPrevidenciaColeta && (
                <span style={{ fontSize: 10, color: "#1E40AF", backgroundColor: "#DBEAFE", padding: "1px 6px", borderRadius: 99, marginLeft: 6, fontWeight: 600 }}>
                  Da coleta
                </span>
              )}
            </span>
          </label>
          {data.temPrevidencia && (
            <div style={{ marginTop: 8, marginLeft: 44 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>
                  Saldo da previdência
                  {saldoPrevidenciaColeta > 0 && (
                    <span style={{ fontSize: 10, color: "#1E40AF", backgroundColor: "#DBEAFE", padding: "1px 6px", borderRadius: 99, marginLeft: 6, fontWeight: 600 }}>
                      Da coleta
                    </span>
                  )}
                </label>
                {saldoPrevidenciaColeta > 0 && data.saldoPrevidencia !== saldoPrevidenciaColeta && (
                  <button
                    onClick={() => upd({ saldoPrevidencia: saldoPrevidenciaColeta })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: 0 }}
                  >
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput value={data.saldoPrevidencia} onChange={v => upd({ saldoPrevidencia: v })} />
            </div>
          )}
        </div>

        {/* Filhos */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...FIELD_LABEL, margin: 0 }}>Filhos</span>
            <button onClick={addChild} style={ADD_BTN}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Adicionar
            </button>
          </div>
          {filhosNaoImportados.length > 0 && (
            <div style={{ fontSize: 12, color: "#B45309", backgroundColor: "#FEF3C7", padding: "8px 12px", borderRadius: 8, marginBottom: 8 }}>
              <strong>{filhosNaoImportados.length} filho(s)</strong> da coleta não importados.{" "}
              <button
                onClick={importarFilhosDaColeta}
                style={{ marginLeft: 4, color: "#B45309", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
              >
                Importar →
              </button>
            </div>
          )}
          {data.children.map(c => (
            <div key={c.id} style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  placeholder="Nome"
                  value={c.name}
                  onChange={e => updateChild(c.id, { name: e.target.value })}
                  style={{ ...INPUT, flex: 1 }}
                />
                <button onClick={() => removeChild(c.id)} style={REMOVE_BTN}>
                  <i className="ti ti-trash" style={{ fontSize: 14 }} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={FIELD_LABEL}>Idade atual</label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={c.currentAge}
                    onChange={e => updateChild(c.id, { currentAge: Number(e.target.value) })}
                    style={INPUT}
                  />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Independência</label>
                  <input
                    type="number"
                    min={c.currentAge + 1}
                    max={40}
                    value={c.independenceAge}
                    onChange={e => updateChild(c.id, { independenceAge: Number(e.target.value) })}
                    style={INPUT}
                  />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Custo/mês</label>
                  <CurrencyInput value={c.monthlyCost} onChange={v => updateChild(c.id, { monthlyCost: v })} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subtotal */}
        <div style={{ marginTop: 4, backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Total contínuo</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(resultado.ongoingTotal)}</span>
        </div>
      </div>

      {/* ── CARD 3: Coberturas em Vida ──────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-heart" style={{ fontSize: 17, color: "#2563EB" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Coberturas em Vida</span>
        </div>

        {/* Apólices de seguro de vida */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...FIELD_LABEL, margin: 0 }}>Apólices de seguro de vida</span>
            <button onClick={addPolicy} style={ADD_BTN}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Adicionar
            </button>
          </div>
          {data.policies.map(p => (
            <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input
                placeholder="Nome da apólice"
                value={p.name}
                onChange={e => updatePolicy(p.id, { name: e.target.value })}
                style={{ ...INPUT, flex: 1 }}
              />
              <div style={{ width: 160, flexShrink: 0 }}>
                <CurrencyInput value={p.value} onChange={v => updatePolicy(p.id, { value: v })} />
              </div>
              <button onClick={() => removePolicy(p.id)} style={REMOVE_BTN}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
          {data.policies.length === 0 && (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhuma apólice cadastrada.</p>
          )}
        </div>

        {/* Coberturas em vida (IPA/DG/MA) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...FIELD_LABEL, margin: 0 }}>Invalidez / Doenças graves (IPA/DG/MA)</span>
            <button onClick={addLivingPolicy} style={ADD_BTN}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Adicionar
            </button>
          </div>
          {data.livingPolicies.map(p => (
            <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <select
                value={p.type}
                onChange={e => updateLivingPolicy(p.id, { type: e.target.value as LivingPolicy["type"] })}
                style={{ ...SELECT, width: 160, flexShrink: 0 }}
              >
                <option value="disability">Invalidez (IPA)</option>
                <option value="criticalIllness">Doenças graves (DG)</option>
                <option value="accidentalDeath">Morte acidental (MA)</option>
              </select>
              <input
                placeholder="Nome"
                value={p.name}
                onChange={e => updateLivingPolicy(p.id, { name: e.target.value })}
                style={{ ...INPUT, flex: 1 }}
              />
              <div style={{ width: 140, flexShrink: 0 }}>
                <CurrencyInput value={p.value} onChange={v => updateLivingPolicy(p.id, { value: v })} />
              </div>
              <button onClick={() => removeLivingPolicy(p.id)} style={REMOVE_BTN}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
        </div>

        {/* Necessidades em vida */}
        <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>Necessidades em caso de invalidez / doença</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={FIELD_LABEL}>Custo de adaptação</label>
              <CurrencyInput
                value={data.livingBenefits.adaptationCost}
                onChange={v => upd({ livingBenefits: { ...data.livingBenefits, adaptationCost: v } })}
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ ...FIELD_LABEL, margin: 0 }}>Custo mensal da família</label>
                {custoDeVidaColeta > 0 && data.livingBenefits.familyMonthlyCost !== custoDeVidaColeta && (
                  <button
                    onClick={() => upd({ livingBenefits: { ...data.livingBenefits, familyMonthlyCost: custoDeVidaColeta } })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: 0 }}
                  >
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput
                value={data.livingBenefits.familyMonthlyCost}
                onChange={v => upd({ livingBenefits: { ...data.livingBenefits, familyMonthlyCost: v } })}
              />
            </div>
            <div>
              <label style={FIELD_LABEL}>Reserva para tratamentos</label>
              <CurrencyInput
                value={data.livingBenefits.extraTreatmentReserve}
                onChange={v => upd({ livingBenefits: { ...data.livingBenefits, extraTreatmentReserve: v } })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 4: Resultado ───────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-calculator" style={{ fontSize: 17, color: "#2563EB" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Resultado</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Capital Necessário</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>{formatCurrency(resultado.totalNeed)}</p>
          </div>
          <div style={{ backgroundColor: "#DCFCE7", border: "0.5px solid #A7C9AB", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: "#15803D", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Capital Atual</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(resultado.totalCoverage)}</p>
          </div>
          <div style={{ backgroundColor: resultado.gap > 0 ? "#FEE2E2" : "#DCFCE7", border: `0.5px solid ${resultado.gap > 0 ? "#C9A0A0" : "#A7C9AB"}`, borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: gapColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Gap de Cobertura</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: gapColor, margin: 0 }}>{formatCurrency(resultado.gap)}</p>
          </div>
        </div>

        {adequado ? (
          <div style={{ backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 20, color: "#15803D", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: 0 }}>Cobertura adequada</p>
              <p style={{ fontSize: 12, color: "#15803D", margin: "2px 0 0", opacity: 0.8 }}>
                O capital segurado cobre todas as necessidades identificadas.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: "#FEE2E2", border: "1px solid #C9A0A0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: "#B91C1C", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", margin: 0 }}>Gap de cobertura identificado</p>
              <p style={{ fontSize: 12, color: "#B91C1C", margin: "2px 0 0", opacity: 0.85 }}>
                Recomenda-se contratar cobertura adicional de {formatCurrency(resultado.gap)}.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Botão Salvar ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          style={{
            backgroundColor: salvo ? "#15803D" : "#2563EB",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: salvando ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "background-color 0.2s",
          }}
        >
          <i
            className={`ti ${salvo ? "ti-circle-check" : salvando ? "ti-loader-2" : "ti-device-floppy"}`}
            style={{ fontSize: 16 }}
          />
          {salvo ? "Análise salva!" : salvando ? "Salvando..." : "Salvar análise"}
        </button>
      </div>
    </div>
  );
}
