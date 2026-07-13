import { useState, useEffect } from "react";
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
  dividas: number;
  reservaEmergencia: number;
  despesasFuneral: number;
  outrasImediatas: number;
  despesasMensais: number;
  anosSuporte: number;
  temPrevidencia: boolean;
  rendaPrevidenciaMensal: number;
  filhos: Filho[];
  capitalInvalidez: number;
  capitalDoencaGrave: number;
  seguroVidaAtual: number;
  seguroInvalidezAtual: number;
  outroSeguroAtual: number;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2); }

function buildInitialData(protecao: ProtecaoSimplificada, dadosCliente?: DadosCliente): SeguroFormData {
  return {
    dividas: 0,
    reservaEmergencia: 0,
    despesasFuneral: 15000,
    outrasImediatas: 0,
    despesasMensais: Number(dadosCliente?.custoDeVidaMensal) || protecao.rendaMensal || 0,
    anosSuporte: 15,
    temPrevidencia: dadosCliente?.possuiPrevidencia ?? false,
    rendaPrevidenciaMensal: 0,
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
    outroSeguroAtual: 0,
  };
}

// ── Main component ──────────────────────────────────────────────────────────

export function FerramentaSeguro({ protecao, clientId, dadosCliente, onResultadoSeguro }: Props) {
  const CHAVE = `ferramenta_seguro_v2_${clientId}`;
  const initialData = buildInitialData(protecao, dadosCliente);

  const [data, setData] = useState<SeguroFormData>(() => buildInitialData(protecao, dadosCliente));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useFerramentaStorage(
    CHAVE,
    data,
    (restored) => setData(restored),
    initialData,
  );

  // Sync temPrevidencia quando coleta muda
  const possuiPrevidenciaColeta = dadosCliente?.possuiPrevidencia ?? false;
  useEffect(() => {
    setData(prev => ({ ...prev, temPrevidencia: possuiPrevidenciaColeta }));
  }, [possuiPrevidenciaColeta]);

  function upd(patch: Partial<SeguroFormData>) { setData(d => ({ ...d, ...patch })); }

  // ── Cálculos em tempo real ────────────────────────────────────────────────

  const capitalImediato =
    data.dividas + data.reservaEmergencia + data.despesasFuneral + data.outrasImediatas;

  const rendaPrevidencia = data.temPrevidencia ? data.rendaPrevidenciaMensal : 0;
  const despesasLiquidas = Math.max(0, data.despesasMensais - rendaPrevidencia);
  const capitalContinuo  = despesasLiquidas * 12 * data.anosSuporte;

  const capitalFilhos = data.filhos.reduce((soma, filho) => {
    const anos = Math.max(0, filho.idadeIndependencia - filho.idadeAtual);
    return soma + filho.custoMensal * 12 * anos;
  }, 0);

  const capitalNecessario =
    capitalImediato + capitalContinuo + capitalFilhos +
    data.capitalInvalidez + data.capitalDoencaGrave;

  const capitalAtual =
    data.seguroVidaAtual + data.seguroInvalidezAtual + data.outroSeguroAtual;

  const gap = Math.max(0, capitalNecessario - capitalAtual);

  const scoreCalculado = capitalNecessario > 0
    ? Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100))
    : 0;

  const adequado = capitalAtual >= capitalNecessario;
  const gapColor = adequado ? "#15803D" : "#B91C1C";

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
        // Campos canônicos
        capitalNecessario,
        capitalAtual,
        capitalImediato,
        capitalContinuo,
        capitalFilhos,
        // Aliases legados
        totalNeed: capitalNecessario,
        totalCoverage: capitalAtual,
        gap,
        scoreProtecao: scoreCalculado,
        temSeguroVida: data.seguroVidaAtual > 0,
        temSeguroInvalidez: data.seguroInvalidezAtual > 0,
        immediateTotal: capitalImediato,
        ongoingTotal: capitalContinuo,
        educationTotal: capitalFilhos,
        lifestyleTotal: 0,
        inventoryCost: 0,
        disabilityTotal: data.capitalInvalidez,
        disabilityGap: Math.max(0, data.capitalInvalidez - data.seguroInvalidezAtual),
        disabilityCoverage: Math.min(data.capitalInvalidez, data.seguroInvalidezAtual),
        criticalIllnessTotal: data.capitalDoencaGrave,
        criticalIllnessGap: data.capitalDoencaGrave,
        criticalIllnessCoverage: 0,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Card 1: Necessidades Imediatas ──────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-alert-circle" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Necessidades Imediatas</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 6 }}>
          <div>
            <label style={FIELD_LABEL}>Dívidas</label>
            <CurrencyInput value={data.dividas} onChange={v => upd({ dividas: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Reserva de emergência</label>
            <CurrencyInput value={data.reservaEmergencia} onChange={v => upd({ reservaEmergencia: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Despesas com funeral</label>
            <CurrencyInput value={data.despesasFuneral} onChange={v => upd({ despesasFuneral: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Outras necessidades imediatas</label>
            <CurrencyInput value={data.outrasImediatas} onChange={v => upd({ outrasImediatas: v })} />
          </div>
        </div>

        <div style={{ marginTop: 10, backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Subtotal imediato</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(capitalImediato)}</span>
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
                Despesas mensais da família
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
            <label style={FIELD_LABEL}>Anos de suporte</label>
            <input
              type="number" min={1} max={40} value={data.anosSuporte}
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
              <label style={FIELD_LABEL}>Renda mensal da previdência</label>
              <CurrencyInput value={data.rendaPrevidenciaMensal} onChange={v => upd({ rendaPrevidenciaMensal: v })} />
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
                  <label style={FIELD_LABEL}>Custo mensal</label>
                  <CurrencyInput value={f.custoMensal} onChange={v => updateFilho(f.id, { custoMensal: v })} />
                </div>
              </div>
            </div>
          ))}
          {data.filhos.length === 0 && <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhum filho cadastrado.</p>}
        </div>

        <div style={{ marginTop: 10, backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>Subtotal contínuo + filhos</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatCurrency(capitalContinuo + capitalFilhos)}</span>
        </div>
      </div>

      {/* ── Card 3: Coberturas em Vida e Seguros Existentes ─────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-heart" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Coberturas em Vida e Seguros Existentes</span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>Necessidades em Vida</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={FIELD_LABEL}>Capital necessário para invalidez</label>
            <CurrencyInput value={data.capitalInvalidez} onChange={v => upd({ capitalInvalidez: v })} />
          </div>
          <div>
            <label style={FIELD_LABEL}>Capital necessário para doenças graves</label>
            <CurrencyInput value={data.capitalDoencaGrave} onChange={v => upd({ capitalDoencaGrave: v })} />
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid #F3F4F6", paddingTop: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>Capital Atual (Seguros Existentes)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={FIELD_LABEL}>
                Seguro de vida atual
                {protecao.possuiSeguroVida && <span style={BADGE_COLETA}>Da coleta</span>}
              </label>
              <CurrencyInput value={data.seguroVidaAtual} onChange={v => upd({ seguroVidaAtual: v })} />
            </div>
            <div>
              <label style={FIELD_LABEL}>
                Seguro invalidez atual
                {protecao.possuiSeguroInvalidez && <span style={BADGE_COLETA}>Da coleta</span>}
              </label>
              <CurrencyInput value={data.seguroInvalidezAtual} onChange={v => upd({ seguroInvalidezAtual: v })} />
            </div>
            <div>
              <label style={FIELD_LABEL}>Outros seguros</label>
              <CurrencyInput value={data.outroSeguroAtual} onChange={v => upd({ outroSeguroAtual: v })} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 4: Resultado (tempo real) ──────────────────────────────── */}
      <div style={CARD}>
        <div style={CARD_HEADER}>
          <div style={CARD_ICON}><i className="ti ti-calculator" style={{ fontSize: 17, color: "#2563EB" }} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Resultado</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ backgroundColor: "#F8FAFF", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Capital Necessário</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>{formatCurrency(capitalNecessario)}</p>
          </div>
          <div style={{ backgroundColor: "#DCFCE7", border: "0.5px solid #A7C9AB", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: "#15803D", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Capital Atual</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(capitalAtual)}</p>
          </div>
          <div style={{ backgroundColor: adequado ? "#DCFCE7" : "#FEE2E2", border: `0.5px solid ${adequado ? "#A7C9AB" : "#C9A0A0"}`, borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: gapColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Gap de Cobertura</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: gapColor, margin: 0 }}>{formatCurrency(gap)}</p>
          </div>
        </div>

        {adequado ? (
          <div style={{ backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 20, color: "#15803D", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: 0 }}>Cobertura adequada</p>
              <p style={{ fontSize: 12, color: "#15803D", margin: "2px 0 0", opacity: 0.8 }}>O capital segurado cobre todas as necessidades identificadas.</p>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: "#FEE2E2", border: "1px solid #C9A0A0", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: "#B91C1C", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", margin: 0 }}>Gap de cobertura identificado</p>
              <p style={{ fontSize: 12, color: "#B91C1C", margin: "2px 0 0", opacity: 0.85 }}>
                Recomenda-se contratar cobertura adicional de {formatCurrency(gap)}.
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
          <i className={`ti ${salvo ? "ti-circle-check" : salvando ? "ti-loader-2" : "ti-device-floppy"}`} style={{ fontSize: 16 }} />
          {salvo ? "Análise salva!" : salvando ? "Salvando..." : "Salvar análise"}
        </button>
      </div>
    </div>
  );
}
