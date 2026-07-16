import { useState, useMemo } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";

// ── Types ──────────────────────────────────────────────────────────────────

interface FilhoForm {
  id: string;
  nome: string;
  idadeAtual: number;
  idadeIndependencia: number;
  custoMensal: number;
}

interface FormData {
  dividas: number;
  despesasFinais: number;
  mesesEmergencia: number;
  outrosImediatos: number;
  despesasMensais: number;
  rendaConjuge: number;
  temPrevidencia: boolean;
  rendaPrevidencia: number;
  anosSuporte: number;
  filhos: FilhoForm[];
  capitalInvalidez: number;
  capitalDoencaGrave: number;
  seguroVidaAtual: number;
  seguroInvalidezAtual: number;
  outrosSeguroAtual: number;
}

interface Props {
  plan: FinancialPlan;
  resultados: Record<string, unknown>;
  onResultadosChange?: (r: Record<string, unknown>) => void;
  clientId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function genId(): string { return Math.random().toString(36).slice(2, 10); }

// ── Styles ──────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  border: "0.5px solid #E5E7EB",
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 16,
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

const LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "#6B7280",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  marginBottom: 4,
  display: "block",
};

const FIELD_WRAP: React.CSSProperties = { display: "flex", flexDirection: "column" };

const NUMBER_INPUT: React.CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box" as const,
  fontFamily: "inherit",
  outline: "none",
  color: "#111827",
};

const SUBTOTAL: React.CSSProperties = {
  marginTop: 12,
  backgroundColor: "#F8FAFF",
  border: "0.5px solid #E5E7EB",
  borderRadius: 8,
  padding: "10px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

// ── Main component ──────────────────────────────────────────────────────────

export function FerramentaSeguro({ plan, resultados, onResultadosChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seguroSalvo: any = resultados?.seguro ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const df: any = seguroSalvo?.dadosFormulario ?? {};
  const dc = plan?.dadosCliente ?? {};

  const [data, setData] = useState<FormData>(() => {
    const initialFilhos: FilhoForm[] = Array.isArray(df.filhos)
      ? (df.filhos as FilhoForm[])
      : (dc.filhos ?? []).map((f) => ({
          id: genId(),
          nome: f.nome ?? "",
          idadeAtual: 0,
          idadeIndependencia: 25,
          custoMensal: 0,
        }));
    return {
      dividas:          Number(df.dividas)         || 0,
      despesasFinais:   Number(df.despesasFinais)  || 0,
      mesesEmergencia:  Number(df.mesesEmergencia) || 6,
      outrosImediatos:  Number(df.outrosImediatos) || 0,
      despesasMensais:  Number(df.despesasMensais) || Number(dc.custoDeVidaMensal) || 0,
      rendaConjuge:     Number(df.rendaConjuge)    || 0,
      temPrevidencia:   Boolean(df.temPrevidencia),
      rendaPrevidencia: Number(df.rendaPrevidencia) || 0,
      anosSuporte:      Number(df.anosSuporte)     || 20,
      filhos:           initialFilhos,
      capitalInvalidez:    Number(df.capitalInvalidez)    || 0,
      capitalDoencaGrave:  Number(df.capitalDoencaGrave)  || 0,
      seguroVidaAtual:     Number(df.seguroVidaAtual)     || 0,
      seguroInvalidezAtual: Number(df.seguroInvalidezAtual) || 0,
      outrosSeguroAtual:   Number(df.outrosSeguroAtual)   || 0,
    };
  });

  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function upd(fields: Partial<FormData>) { setData(prev => ({ ...prev, ...fields })); }

  // ── Cálculos ──────────────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const totalImediato =
      (Number(data.dividas)        || 0) +
      (Number(data.despesasFinais) || 0) +
      (Number(data.despesasMensais) || 0) * (Number(data.mesesEmergencia) || 6) +
      (Number(data.outrosImediatos) || 0);

    const rendaLiquida = Math.max(0,
      (Number(data.despesasMensais)  || 0) -
      (Number(data.rendaConjuge)     || 0) -
      (data.temPrevidencia ? (Number(data.rendaPrevidencia) || 0) : 0)
    );
    const totalContinuo = rendaLiquida * 12 * (Number(data.anosSuporte) || 20);

    const totalFilhos = data.filhos.reduce((s, f) => {
      const anos = Math.max(0, (Number(f.idadeIndependencia) || 25) - (Number(f.idadeAtual) || 0));
      return s + (Number(f.custoMensal) || 0) * 12 * anos;
    }, 0);

    const subtotalContinuo    = totalContinuo + totalFilhos;
    const totalCoberturasVida = (Number(data.capitalInvalidez) || 0) + (Number(data.capitalDoencaGrave) || 0);
    const capitalNecessario   = totalImediato + subtotalContinuo + totalCoberturasVida;
    const capitalAtual =
      (Number(data.seguroVidaAtual)      || 0) +
      (Number(data.seguroInvalidezAtual) || 0) +
      (Number(data.outrosSeguroAtual)    || 0);
    const gap         = Math.max(0, capitalNecessario - capitalAtual);
    const coberturaPct = capitalNecessario > 0
      ? Math.min(100, Math.round(capitalAtual / capitalNecessario * 100))
      : 0;

    return {
      totalImediato, totalContinuo, totalFilhos,
      subtotalContinuo, totalCoberturasVida,
      capitalNecessario, capitalAtual, gap, coberturaPct,
    };
  }, [data]);

  // ── Filhos ────────────────────────────────────────────────────────────────

  function addFilho() {
    upd({ filhos: [...data.filhos, { id: genId(), nome: "", idadeAtual: 0, idadeIndependencia: 25, custoMensal: 0 }] });
  }
  function removeFilho(id: string) { upd({ filhos: data.filhos.filter(f => f.id !== id) }); }
  function updateFilho(id: string, patch: Partial<FilhoForm>) {
    upd({ filhos: data.filhos.map(f => f.id === id ? { ...f, ...patch } : f) });
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    setSalvando(true);
    try {
      const scoreProtecao = calc.capitalNecessario > 0
        ? Math.min(100, Math.round(calc.capitalAtual / calc.capitalNecessario * 100))
        : 0;
      await onResultadosChange?.({
        ...resultados,
        seguro: {
          // Campos canônicos
          capitalNecessario:   calc.capitalNecessario,
          capitalAtual:        calc.capitalAtual,
          gap:                 calc.gap,
          totalImediato:       calc.totalImediato,
          subtotalContinuo:    calc.subtotalContinuo,
          totalCoberturasVida: calc.totalCoberturasVida,
          dadosFormulario:     data,
          dataUltimoSalvamento: new Date().toISOString(),
          // Aliases legados (SecaoProtecaoSucessorio e Dashboard)
          totalNeed:     calc.capitalNecessario,
          totalCoverage: calc.capitalAtual,
          scoreProtecao,
          capitalImediato:      calc.totalImediato,
          capitalContinuo:      calc.subtotalContinuo,
          capitalCoberturasVida: calc.totalCoberturasVida,
          capitalFilhos:        calc.totalFilhos,
          temSeguroVida:        data.seguroVidaAtual > 0,
          temSeguroInvalidez:   data.seguroInvalidezAtual > 0,
          immediateTotal:       calc.totalImediato,
          ongoingTotal:         calc.totalContinuo,
          educationTotal:       calc.totalFilhos,
          lifestyleTotal:       0,
          inventoryCost:        0,
          disabilityTotal:      data.capitalInvalidez,
          disabilityGap:        Math.max(0, data.capitalInvalidez - data.seguroInvalidezAtual),
          disabilityCoverage:   Math.min(data.capitalInvalidez, data.seguroInvalidezAtual),
          criticalIllnessTotal:    data.capitalDoencaGrave,
          criticalIllnessGap:      data.capitalDoencaGrave,
          criticalIllnessCoverage: 0,
          dataCalculo: new Date().toISOString(),
          savedAt:     new Date().toISOString(),
        },
      });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  const adequado = calc.capitalAtual >= calc.capitalNecessario && calc.capitalNecessario > 0;
  const custoDeVidaColeta = Number(dc.custoDeVidaMensal) || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── CARD 1 — Necessidades Imediatas ─────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-alert-circle" style={{ fontSize: 18, color: "#2563EB" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Imediatas</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Capital necessário logo após o sinistro</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Dívidas e Financiamentos</label>
            <CurrencyInput value={data.dividas} onChange={(v) => upd({ dividas: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Despesas Finais (funeral, inventário)</label>
            <CurrencyInput value={data.despesasFinais} onChange={(v) => upd({ despesasFinais: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Meses de Emergência</label>
            <input
              type="number"
              min={1}
              max={24}
              value={data.mesesEmergencia}
              onChange={(e) => upd({ mesesEmergencia: Math.max(1, Math.min(24, Number(e.target.value) || 6)) })}
              style={NUMBER_INPUT}
            />
            <span style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
              Reserva: {formatCurrency((Number(data.despesasMensais) || 0) * (Number(data.mesesEmergencia) || 6))}
            </span>
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Outros Gastos Imediatos</label>
            <CurrencyInput value={data.outrosImediatos} onChange={(v) => upd({ outrosImediatos: v })} />
          </div>
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Subtotal Imediato</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(calc.totalImediato)}</span>
        </div>
      </div>

      {/* ── CARD 2 — Necessidades Contínuas ─────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-users" style={{ fontSize: 18, color: "#2563EB" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Contínuas</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Renda necessária para manter o padrão de vida da família</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>
              Despesas Mensais da Família
              {custoDeVidaColeta > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, color: "#1E40AF", backgroundColor: "#DBEAFE", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>
                  Da coleta
                </span>
              )}
            </label>
            <CurrencyInput value={data.despesasMensais} onChange={(v) => upd({ despesasMensais: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Renda do Cônjuge (desconta)</label>
            <CurrencyInput value={data.rendaConjuge} onChange={(v) => upd({ rendaConjuge: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Período de Suporte (anos)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={data.anosSuporte}
              onChange={(e) => upd({ anosSuporte: Math.max(1, Number(e.target.value) || 20) })}
              style={NUMBER_INPUT}
            />
          </div>
          <div style={FIELD_WRAP}>
            <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 8 }}>
              Possui Previdência?
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={data.temPrevidencia}
                  onChange={(e) => upd({ temPrevidencia: e.target.checked })}
                />
                <span style={{ fontSize: 11, color: "#374151", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>Sim</span>
              </label>
            </label>
            {data.temPrevidencia && (
              <CurrencyInput
                value={data.rendaPrevidencia}
                onChange={(v) => upd({ rendaPrevidencia: v })}
                placeholder="Renda mensal da previdência"
              />
            )}
          </div>
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>
            Renda líquida: {formatCurrency(
              Math.max(0, (Number(data.despesasMensais) || 0) - (Number(data.rendaConjuge) || 0) - (data.temPrevidencia ? (Number(data.rendaPrevidencia) || 0) : 0))
            )}/mês × 12 × {data.anosSuporte} anos
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(calc.totalContinuo)}</span>
        </div>

        {/* Filhos */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Filhos</span>
            <button
              onClick={addFilho}
              style={{
                border: "1px solid #E5E7EB", color: "#374151", backgroundColor: "transparent",
                borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Adicionar filho
            </button>
          </div>

          {data.filhos.length === 0 && (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhum filho cadastrado.</p>
          )}

          {data.filhos.map((f) => (
            <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
              <div style={FIELD_WRAP}>
                <label style={LABEL}>Nome</label>
                <input
                  type="text"
                  value={f.nome}
                  onChange={(e) => updateFilho(f.id, { nome: e.target.value })}
                  style={NUMBER_INPUT}
                  placeholder="Nome"
                />
              </div>
              <div style={FIELD_WRAP}>
                <label style={LABEL}>Idade</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={f.idadeAtual}
                  onChange={(e) => updateFilho(f.id, { idadeAtual: Number(e.target.value) || 0 })}
                  style={NUMBER_INPUT}
                />
              </div>
              <div style={FIELD_WRAP}>
                <label style={LABEL}>Indep.</label>
                <input
                  type="number"
                  min={18}
                  max={40}
                  value={f.idadeIndependencia}
                  onChange={(e) => updateFilho(f.id, { idadeIndependencia: Number(e.target.value) || 25 })}
                  style={NUMBER_INPUT}
                />
              </div>
              <div style={FIELD_WRAP}>
                <label style={LABEL}>Custo/mês</label>
                <CurrencyInput value={f.custoMensal} onChange={(v) => updateFilho(f.id, { custoMensal: v })} />
              </div>
              <button
                onClick={() => removeFilho(f.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "8px 4px", lineHeight: 1, alignSelf: "center", marginTop: 14 }}
              >
                <i className="ti ti-trash" style={{ fontSize: 16 }} />
              </button>
            </div>
          ))}

          {calc.totalFilhos > 0 && (
            <div style={{ ...SUBTOTAL, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>Subtotal filhos</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{formatCurrency(calc.totalFilhos)}</span>
            </div>
          )}
        </div>

        <div style={{ ...SUBTOTAL, marginTop: 12, backgroundColor: "#F0F7FF" }}>
          <span style={{ fontSize: 12, color: "#1E40AF", fontWeight: 600 }}>Subtotal Contínuo (contínuo + filhos)</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1E40AF" }}>{formatCurrency(calc.subtotalContinuo)}</span>
        </div>
      </div>

      {/* ── CARD 3 — Coberturas em Vida ──────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-heart" style={{ fontSize: 18, color: "#2563EB" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>Coberturas em Vida</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Proteção contra invalidez e doenças graves</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Capital para Invalidez Total</label>
            <CurrencyInput value={data.capitalInvalidez} onChange={(v) => upd({ capitalInvalidez: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Capital para Doenças Graves</label>
            <CurrencyInput value={data.capitalDoencaGrave} onChange={(v) => upd({ capitalDoencaGrave: v })} />
          </div>
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Subtotal Coberturas em Vida</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(calc.totalCoberturasVida)}</span>
        </div>
      </div>

      {/* ── CARD 4 — Cobertura Atual ─────────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}>
            <i className="ti ti-shield-check" style={{ fontSize: 18, color: "#2563EB" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>Cobertura Atual (Apólices)</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Seguros já contratados pelo cliente</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Seguro de Vida Atual</label>
            <CurrencyInput value={data.seguroVidaAtual} onChange={(v) => upd({ seguroVidaAtual: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Seguro de Invalidez Atual</label>
            <CurrencyInput value={data.seguroInvalidezAtual} onChange={(v) => upd({ seguroInvalidezAtual: v })} />
          </div>
          <div style={FIELD_WRAP}>
            <label style={LABEL}>Outros Seguros (empresarial, grupo...)</label>
            <CurrencyInput value={data.outrosSeguroAtual} onChange={(v) => upd({ outrosSeguroAtual: v })} />
          </div>
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Total de Cobertura Atual</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: calc.capitalAtual > 0 ? "#15803D" : "#6B7280" }}>
            {formatCurrency(calc.capitalAtual)}
          </span>
        </div>
      </div>

      {/* ── CARD 5 — Resultado ───────────────────────────────────────────── */}
      <div style={{ ...CARD, border: adequado ? "0.5px solid #BBF7D0" : "0.5px solid #FECACA" }}>
        <div style={CARD_HEADER}>
          <div style={{ ...CARD_ICON, backgroundColor: adequado ? "#DCFCE7" : "#FEE2E2" }}>
            <i className="ti ti-calculator" style={{ fontSize: 18, color: adequado ? "#15803D" : "#B91C1C" }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>Resultado da Análise</p>
            <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>Comparativo entre necessidade e cobertura</p>
          </div>
        </div>

        {/* Top 3 colunas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ backgroundColor: "#F8FAFF", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Capital Necessário
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{formatCurrency(calc.capitalNecessario)}</p>
          </div>
          <div style={{ backgroundColor: adequado ? "#F0FDF4" : "#FFF5F5", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Capital Atual
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: adequado ? "#15803D" : "#B91C1C" }}>
              {formatCurrency(calc.capitalAtual)}
            </p>
          </div>
          <div style={{ backgroundColor: "#F8FAFF", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Cobertura
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: adequado ? "#15803D" : "#B91C1C" }}>
              {calc.coberturaPct}%
            </p>
          </div>
        </div>

        {/* Detalhamento */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Necessidades Imediatas", value: calc.totalImediato },
            { label: "Necessidades Contínuas", value: calc.subtotalContinuo },
            { label: "Coberturas em Vida",     value: calc.totalCoberturasVida },
          ].map(({ label, value }) => (
            <div key={label} style={{ backgroundColor: "#F9FAFB", borderRadius: 6, padding: "8px 10px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, color: "#9CA3AF" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#374151" }}>{formatCurrency(value)}</p>
            </div>
          ))}
        </div>

        {/* Banner gap/adequado */}
        {calc.capitalNecessario > 0 && (
          adequado ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB",
              borderRadius: 8, padding: "12px 16px",
            }}>
              <i className="ti ti-circle-check" style={{ fontSize: 18, color: "#15803D", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#15803D" }}>Cobertura adequada</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#166534" }}>
                  Sua apólice cobre {calc.coberturaPct}% do capital necessário. Revise periodicamente.
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5",
              borderRadius: 8, padding: "12px 16px",
            }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 18, color: "#B91C1C", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
                  Gap de {formatCurrency(calc.gap)}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#991B1B" }}>
                  A cobertura atual ({calc.coberturaPct}%) é insuficiente. Avalie a contratação de seguro adicional.
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── BOTÃO SALVAR ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 8 }}>
        {salvo && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#15803D" }}>
            <i className="ti ti-circle-check" style={{ fontSize: 16 }} />
            Análise salva com sucesso
          </div>
        )}
        <button
          onClick={handleSalvar}
          disabled={salvando || calc.capitalNecessario === 0}
          style={{
            backgroundColor: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando || calc.capitalNecessario === 0 ? "not-allowed" : "pointer",
            opacity: salvando || calc.capitalNecessario === 0 ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {salvando
            ? <><i className="ti ti-loader-2" style={{ fontSize: 14 }} /> Salvando...</>
            : <><i className="ti ti-device-floppy" style={{ fontSize: 14 }} /> Salvar análise</>
          }
        </button>
      </div>
    </div>
  );
}
