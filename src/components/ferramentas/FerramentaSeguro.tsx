import { useState, useEffect, useMemo } from "react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import type { ProtecaoSimplificada, DadosCliente } from "@/types/financialPlanning";
import type { ResultadoSeguro } from "@/types/estrategiaResultados";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";

// ── Types ──────────────────────────────────────────────────────────────────

interface Filho {
  id: string;
  nome: string;
  idadeAtual: number;
  idadeIndependencia: number;
  custoMensal: number;
}

interface SeguroFormData {
  // Imediato
  dividas: number;
  despesasFinais: number;
  mesesEmergencia: number;
  outrosImediatos: number;
  // Contínuo
  despesasMensais: number;
  rendaConjuge: number;
  temPrevidencia: boolean;
  rendaPrevidencia: number;
  anosSuporte: number;
  filhos: Filho[];
  // Coberturas em Vida
  capitalInvalidez: number;
  capitalDoencaGrave: number;
  // Cobertura Atual
  seguroVidaAtual: number;
  seguroInvalidezAtual: number;
  outrosSeguroAtual: number;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  protecao: ProtecaoSimplificada;
  clientId: string;
  dadosCliente?: DadosCliente;
  onResultadoSeguro: (r: ResultadoSeguro) => void;
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

const BADGE_COLETA: React.CSSProperties = {
  fontSize: 10,
  color: "#1E40AF",
  backgroundColor: "#DBEAFE",
  padding: "1px 6px",
  borderRadius: 99,
  marginLeft: 6,
  fontWeight: 600,
};

const HINT: React.CSSProperties = {
  fontSize: 11,
  color: "#9CA3AF",
  margin: "3px 0 0",
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2); }

function buildInitialData(protecao: ProtecaoSimplificada, dadosCliente?: DadosCliente): SeguroFormData {
  return {
    dividas: 0,
    despesasFinais: 15000,
    mesesEmergencia: 6,
    outrosImediatos: 0,
    despesasMensais: Number(dadosCliente?.custoDeVidaMensal) || protecao.rendaMensal || 0,
    rendaConjuge: 0,
    temPrevidencia: dadosCliente?.possuiPrevidencia ?? false,
    rendaPrevidencia: 0,
    anosSuporte: 20,
    filhos: (dadosCliente?.filhos ?? []).map(f => ({
      id: genId(),
      nome: f.nome,
      idadeAtual: f.idade,
      idadeIndependencia: 25,
      custoMensal: 0,
    })),
    capitalInvalidez: 0,
    capitalDoencaGrave: 0,
    seguroVidaAtual: protecao.possuiSeguroVida ? protecao.capitalSeguradoVida : 0,
    seguroInvalidezAtual: protecao.possuiSeguroInvalidez ? protecao.capitalSeguradoInvalidez : 0,
    outrosSeguroAtual: 0,
  };
}

// ── Main component ──────────────────────────────────────────────────────────

export function FerramentaSeguro({ protecao, clientId, dadosCliente, onResultadoSeguro }: Props) {
  const CHAVE = `ferramenta_seguro_v3_${clientId}`;
  const initialData = buildInitialData(protecao, dadosCliente);

  const [data, setData] = useState<SeguroFormData>(() => buildInitialData(protecao, dadosCliente));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useFerramentaStorage(CHAVE, data, (restored) => setData(restored), initialData);

  // Sync temPrevidencia quando coleta muda
  const possuiPrevidenciaColeta = dadosCliente?.possuiPrevidencia ?? false;
  useEffect(() => {
    setData(prev => ({ ...prev, temPrevidencia: possuiPrevidenciaColeta }));
  }, [possuiPrevidenciaColeta]);

  function upd(patch: Partial<SeguroFormData>) { setData(d => ({ ...d, ...patch })); }

  // ── Cálculos em tempo real ────────────────────────────────────────────────

  const {
    totalImediato,
    totalContinuo,
    totalFilhos,
    subtotalContinuo,
    totalCoberturasVida,
    capitalNecessario,
    capitalAtual,
    gap,
  } = useMemo(() => {
    const totalImediato =
      (Number(data.dividas) || 0) +
      (Number(data.despesasFinais) || 0) +
      (Number(data.despesasMensais) || 0) * (Number(data.mesesEmergencia) || 6) +
      (Number(data.outrosImediatos) || 0);

    const rendaLiquida = Math.max(0,
      (Number(data.despesasMensais) || 0) -
      (Number(data.rendaConjuge) || 0) -
      (data.temPrevidencia ? (Number(data.rendaPrevidencia) || 0) : 0)
    );
    const totalContinuo = rendaLiquida * 12 * (Number(data.anosSuporte) || 20);

    const totalFilhos = (data.filhos ?? []).reduce((s, f) => {
      const anos = Math.max(0,
        (Number(f.idadeIndependencia) || 25) - (Number(f.idadeAtual) || 0)
      );
      return s + (Number(f.custoMensal) || 0) * 12 * anos;
    }, 0);

    const subtotalContinuo = totalContinuo + totalFilhos;

    const totalCoberturasVida =
      (Number(data.capitalInvalidez) || 0) +
      (Number(data.capitalDoencaGrave) || 0);

    const capitalNecessario = totalImediato + subtotalContinuo + totalCoberturasVida;

    const capitalAtual =
      (Number(data.seguroVidaAtual) || 0) +
      (Number(data.seguroInvalidezAtual) || 0) +
      (Number(data.outrosSeguroAtual) || 0);

    const gap = Math.max(0, capitalNecessario - capitalAtual);

    return {
      totalImediato, totalContinuo, totalFilhos,
      subtotalContinuo, totalCoberturasVida,
      capitalNecessario, capitalAtual, gap,
    };
  }, [data]);

  const scoreCalculado = capitalNecessario > 0
    ? Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100))
    : 0;
  const adequado = capitalAtual >= capitalNecessario;

  // ── CRUD filhos ──────────────────────────────────────────────────────────

  function addFilho() {
    upd({ filhos: [...data.filhos, { id: genId(), nome: "", idadeAtual: 5, idadeIndependencia: 25, custoMensal: 0 }] });
  }
  function removeFilho(id: string) { upd({ filhos: data.filhos.filter(f => f.id !== id) }); }
  function updateFilho(id: string, patch: Partial<Filho>) {
    upd({ filhos: data.filhos.map(f => f.id === id ? { ...f, ...patch } : f) });
  }

  // ── Filhos da coleta ─────────────────────────────────────────────────────

  const filhosColeta = dadosCliente?.filhos ?? [];
  const filhosNaoImportados = filhosColeta.filter(fc => !data.filhos.some(f => f.nome === fc.nome));

  function importarFilhosDaColeta() {
    upd({
      filhos: filhosColeta.map(f => ({
        id: genId(),
        nome: f.nome,
        idadeAtual: f.idade,
        idadeIndependencia: 25,
        custoMensal: 0,
      })),
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    setSalvando(true);
    try {
      onResultadoSeguro({
        capitalNecessario,
        capitalAtual,
        capitalImediato: totalImediato,
        capitalContinuo: subtotalContinuo,
        capitalFilhos: totalFilhos,
        capitalCoberturasVida: totalCoberturasVida,
        totalNeed: capitalNecessario,
        totalCoverage: capitalAtual,
        gap,
        scoreProtecao: scoreCalculado,
        temSeguroVida: data.seguroVidaAtual > 0,
        temSeguroInvalidez: data.seguroInvalidezAtual > 0,
        immediateTotal: totalImediato,
        ongoingTotal: totalContinuo,
        educationTotal: totalFilhos,
        lifestyleTotal: 0,
        inventoryCost: 0,
        disabilityTotal: data.capitalInvalidez,
        disabilityGap: Math.max(0, data.capitalInvalidez - data.seguroInvalidezAtual),
        disabilityCoverage: Math.min(data.capitalInvalidez, data.seguroInvalidezAtual),
        criticalIllnessTotal: data.capitalDoencaGrave,
        criticalIllnessGap: data.capitalDoencaGrave,
        criticalIllnessCoverage: 0,
        dadosFormulario: data as unknown as Record<string, unknown>,
        dataCalculo: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  const custoDeVidaColeta = Number(dadosCliente?.custoDeVidaMensal) || 0;
  const reservaEmergenciaCalc = (Number(data.despesasMensais) || 0) * (Number(data.mesesEmergencia) || 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Card 1: Necessidades Imediatas ──────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-alert-circle" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Imediatas</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={FIELD_LABEL}>Dívidas e Financiamentos (R$)</label>
            <CurrencyInput value={data.dividas} onChange={v => upd({ dividas: v })} />
            <p style={HINT}>Saldo devedor de empréstimos, financiamentos, cartões</p>
          </div>
          <div>
            <label style={FIELD_LABEL}>Despesas Finais (R$)</label>
            <CurrencyInput value={data.despesasFinais} onChange={v => upd({ despesasFinais: v })} />
            <p style={HINT}>Funeral, inventário, custos legais</p>
          </div>
          <div>
            <label style={FIELD_LABEL}>Reserva de Emergência (meses)</label>
            <input
              type="number" min={1} max={24} value={data.mesesEmergencia}
              onChange={e => upd({ mesesEmergencia: Number(e.target.value) })}
              style={INPUT}
            />
            {reservaEmergenciaCalc > 0 && (
              <p style={HINT}>= {formatCurrency(reservaEmergenciaCalc)} ({data.mesesEmergencia} × despesas mensais)</p>
            )}
          </div>
          <div>
            <label style={FIELD_LABEL}>Outros Gastos Imediatos (R$)</label>
            <CurrencyInput value={data.outrosImediatos} onChange={v => upd({ outrosImediatos: v })} />
          </div>
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Total imediato</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(totalImediato)}</span>
        </div>
      </div>

      {/* ── Card 2: Necessidades Contínuas ──────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-users" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Contínuas</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ ...FIELD_LABEL, margin: 0 }}>
                Despesas Mensais da Família (R$)
                {custoDeVidaColeta > 0 && <span style={BADGE_COLETA}>Da coleta</span>}
              </label>
              {custoDeVidaColeta > 0 && data.despesasMensais !== custoDeVidaColeta && (
                <button
                  onClick={() => upd({ despesasMensais: custoDeVidaColeta })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: 0 }}
                >
                  ↺ Restaurar
                </button>
              )}
            </div>
            <CurrencyInput value={data.despesasMensais} onChange={v => upd({ despesasMensais: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Renda Mensal do Cônjuge (R$)</label>
            <CurrencyInput value={data.rendaConjuge} onChange={v => upd({ rendaConjuge: v })} />
            <p style={HINT}>Desconta das necessidades mensais</p>
          </div>
          <div>
            <label style={FIELD_LABEL}>Período de Suporte (anos)</label>
            <input
              type="number" min={1} max={50} value={data.anosSuporte}
              onChange={e => upd({ anosSuporte: Number(e.target.value) })}
              style={INPUT}
            />
          </div>
        </div>

        {/* Previdência */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span
              onClick={() => upd({ temPrevidencia: !data.temPrevidencia })}
              style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: data.temPrevidencia ? "#2563EB" : "#D1D5DB", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s", display: "inline-block" }}
            >
              <span style={{ position: "absolute", top: 2, left: data.temPrevidencia ? 18 : 2, width: 16, height: 16, borderRadius: "50%", backgroundColor: "white", transition: "left 0.2s" }} />
            </span>
            <span style={{ fontSize: 13, color: "#374151" }}>
              Possui Previdência (PGBL/VGBL)?
              {possuiPrevidenciaColeta && <span style={BADGE_COLETA}>Da coleta</span>}
            </span>
          </label>
          {data.temPrevidencia && (
            <div style={{ marginTop: 8, marginLeft: 44, maxWidth: 240 }}>
              <label style={FIELD_LABEL}>Renda Mensal da Previdência (R$)</label>
              <CurrencyInput value={data.rendaPrevidencia} onChange={v => upd({ rendaPrevidencia: v })} />
            </div>
          )}
        </div>

        {/* Filhos */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ ...FIELD_LABEL, margin: 0 }}>Filhos dependentes</span>
            <button onClick={addFilho} style={ADD_BTN}>
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
          {data.filhos.map(f => (
            <div key={f.id} style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  placeholder="Nome do filho"
                  value={f.nome}
                  onChange={e => updateFilho(f.id, { nome: e.target.value })}
                  style={{ ...INPUT, flex: 1 }}
                />
                <button onClick={() => removeFilho(f.id)} style={REMOVE_BTN}>
                  <i className="ti ti-trash" style={{ fontSize: 14 }} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={FIELD_LABEL}>Idade atual</label>
                  <input type="number" min={0} max={40} value={f.idadeAtual} onChange={e => updateFilho(f.id, { idadeAtual: Number(e.target.value) })} style={INPUT} />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Idade independência</label>
                  <input type="number" min={f.idadeAtual + 1} max={40} value={f.idadeIndependencia} onChange={e => updateFilho(f.id, { idadeIndependencia: Number(e.target.value) })} style={INPUT} />
                </div>
                <div>
                  <label style={FIELD_LABEL}>Custo mensal (R$)</label>
                  <CurrencyInput value={f.custoMensal} onChange={v => updateFilho(f.id, { custoMensal: v })} />
                </div>
              </div>
            </div>
          ))}
          {data.filhos.length === 0 && <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhum filho cadastrado.</p>}
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Total contínuo + filhos</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(subtotalContinuo)}</span>
        </div>
      </div>

      {/* ── Card 3: Coberturas em Vida ──────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-heart" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Coberturas em Vida</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={FIELD_LABEL}>Capital para Invalidez Total (R$)</label>
            <CurrencyInput value={data.capitalInvalidez} onChange={v => upd({ capitalInvalidez: v })} />
            <p style={HINT}>Capital único em caso de invalidez permanente total</p>
          </div>
          <div>
            <label style={FIELD_LABEL}>Capital para Doenças Graves (R$)</label>
            <CurrencyInput value={data.capitalDoencaGrave} onChange={v => upd({ capitalDoencaGrave: v })} />
            <p style={HINT}>Diagnóstico de câncer, AVC, infarto, etc.</p>
          </div>
        </div>

        <div style={SUBTOTAL}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Total coberturas em vida</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(totalCoberturasVida)}</span>
        </div>
      </div>

      {/* ── Card 4: Cobertura Atual ──────────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-shield-check" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Cobertura Atual</span>
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "-8px 0 14px" }}>Informe os seguros que o cliente já possui</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={FIELD_LABEL}>
              Seguro de Vida Atual (R$)
              {protecao.possuiSeguroVida && <span style={BADGE_COLETA}>Da coleta</span>}
            </label>
            <CurrencyInput value={data.seguroVidaAtual} onChange={v => upd({ seguroVidaAtual: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>
              Seguro de Invalidez Atual (R$)
              {protecao.possuiSeguroInvalidez && <span style={BADGE_COLETA}>Da coleta</span>}
            </label>
            <CurrencyInput value={data.seguroInvalidezAtual} onChange={v => upd({ seguroInvalidezAtual: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Outros Seguros (R$)</label>
            <CurrencyInput value={data.outrosSeguroAtual} onChange={v => upd({ outrosSeguroAtual: v })} />
            <p style={HINT}>Seguro empresarial, grupo...</p>
          </div>
        </div>

        <div style={{ ...SUBTOTAL, backgroundColor: "#DCFCE7", border: "0.5px solid #A7C9AB" }}>
          <span style={{ fontSize: 12, color: "#15803D" }}>Capital atual total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>{formatCurrency(capitalAtual)}</span>
        </div>
      </div>

      {/* ── Card 5: Resultado da Análise ────────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-calculator" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Resultado da Análise</span>
        </div>

        {/* Capital necessário vs atual */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Capital Necessário Total</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{formatCurrency(capitalNecessario)}</p>
          </div>
          <div style={{ backgroundColor: adequado ? "#DCFCE7" : "#FEE2E2", border: `0.5px solid ${adequado ? "#A7C9AB" : "#C9A0A0"}`, borderRadius: 8, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: adequado ? "#15803D" : "#B91C1C", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Capital Atual</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: adequado ? "#15803D" : "#B91C1C", margin: 0 }}>{formatCurrency(capitalAtual)}</p>
          </div>
        </div>

        {/* Breakdown: 3 colunas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {([
            { label: "Necessidades Imediatas", value: totalImediato },
            { label: "Necessidades Contínuas", value: subtotalContinuo },
            { label: "Coberturas em Vida",     value: totalCoberturasVida },
          ] as const).map(({ label, value }) => (
            <div key={label} style={{ backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", margin: 0 }}>{formatCurrency(value)}</p>
            </div>
          ))}
        </div>

        {/* Gap */}
        <div style={{ borderTop: "0.5px solid #F3F4F6", paddingTop: 14 }}>
          {adequado ? (
            <div style={{ backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB", borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 22, color: "#15803D", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: 0 }}>Cobertura adequada</p>
                <p style={{ fontSize: 12, color: "#15803D", margin: "2px 0 0", opacity: 0.85 }}>O capital segurado cobre todas as necessidades identificadas.</p>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "#FEE2E2", border: "1px solid #C9A0A0", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 22, color: "#B91C1C", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", margin: 0 }}>Gap de Proteção</p>
                  <p style={{ fontSize: 12, color: "#B91C1C", margin: "2px 0 0", opacity: 0.85 }}>Cobertura insuficiente — considerar contratação de seguro adicional</p>
                </div>
              </div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#B91C1C", margin: "0 0 0 32px" }}>{formatCurrency(gap)}</p>
            </div>
          )}
        </div>
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
          <i className={`ti ${salvo ? "ti-circle-check" : salvando ? "ti-loader-2" : "ti-device-floppy"}`} style={{ fontSize: 16 }} />
          {salvo ? "Análise salva!" : salvando ? "Salvando..." : "Salvar análise"}
        </button>
      </div>
    </div>
  );
}
