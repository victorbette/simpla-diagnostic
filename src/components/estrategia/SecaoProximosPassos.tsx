import type { AcaoItem } from "./EstrategiaInicialPage";
import type { FinancialPlan } from "@/types/financialPlanning";

interface Props {
  plan: FinancialPlan;
  acoes: AcaoItem[];
  onAcoesChange: (v: AcaoItem[]) => void;
  dataProximaReuniao: string;
  onDataChange: (v: string) => void;
  formatoReuniao: string;
  onFormatoChange: (v: string) => void;
  pautaSugerida: string;
  onPautaChange: (v: string) => void;
  consideracoesFinais: string;
  onConsideracoesChange: (v: string) => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white", borderRadius: 12, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const PRIORIDADE_STYLE: Record<AcaoItem["prioridade"], { bg: string; border: string; badge: string; badgeText: string; label: string }> = {
  alta:  { bg: "#FEF2F2", border: "#EF4444", badge: "#FEE2E2", badgeText: "#DC2626", label: "ALTA" },
  media: { bg: "#FFFBEB", border: "#F59E0B", badge: "#FEF3C7", badgeText: "#B45309", label: "MÉDIA" },
  baixa: { bg: "#F9FAFB", border: "#9CA3AF", badge: "#F3F4F6", badgeText: "#6B7280", label: "BAIXA" },
};

export function SecaoProximosPassos({
  plan: _plan,
  acoes,
  onAcoesChange,
  dataProximaReuniao,
  onDataChange,
  formatoReuniao,
  onFormatoChange,
  pautaSugerida,
  onPautaChange,
  consideracoesFinais,
  onConsideracoesChange,
}: Props) {
  function updateAcao(id: string, patch: Partial<AcaoItem>) {
    onAcoesChange(acoes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeAcao(id: string) {
    onAcoesChange(acoes.filter((a) => a.id !== id));
  }

  function addAcao() {
    const novo: AcaoItem = {
      id: `acao_${Date.now()}`,
      texto: "Nova ação",
      prioridade: "media",
      area: "Geral",
      prazo: "",
    };
    onAcoesChange([...acoes, novo]);
  }

  return (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Ações prioritárias */}
      <div style={{ ...CARD, borderTop: "3px solid #3B82F6" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Plano de ação para o cliente
        </p>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px" }}>
          Gerado automaticamente dos gaps identificados. Edite, reordene e adicione ações.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {acoes.map((acao) => {
            const style = PRIORIDADE_STYLE[acao.prioridade];
            return (
              <div
                key={acao.id}
                style={{
                  backgroundColor: style.bg,
                  borderLeft: `4px solid ${style.border}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 16, color: "#9CA3AF", cursor: "grab", flexShrink: 0, lineHeight: 1.5 }}>⠿</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: style.badge, color: style.badgeText }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F3F4F6", color: "#374151" }}>
                      {acao.area}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={acao.texto}
                    onChange={(e) => updateAcao(acao.id, { texto: e.target.value })}
                    style={{ fontSize: 13, color: "#041A20", border: "none", background: "transparent", outline: "none", width: "100%", fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <label style={{ fontSize: 11, color: "#6B7280" }}>Prazo:</label>
                    <input
                      type="date"
                      value={acao.prazo}
                      onChange={(e) => updateAcao(acao.id, { prazo: e.target.value })}
                      style={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 4, padding: "2px 6px", color: "#374151" }}
                    />
                    <select
                      value={acao.prioridade}
                      onChange={(e) => updateAcao(acao.id, { prioridade: e.target.value as AcaoItem["prioridade"] })}
                      style={{ fontSize: 11, border: "1px solid #E5E7EB", borderRadius: 4, padding: "2px 6px", color: "#374151" }}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => removeAcao(acao.id)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 16, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addAcao}
          style={{ marginTop: 14, width: "100%", padding: "10px 0", border: "2px dashed #D1D5DB", borderRadius: 8, backgroundColor: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer" }}
        >
          + Adicionar ação
        </button>
      </div>

      {/* Próxima reunião */}
      <div style={{ ...CARD, borderTop: "3px solid #3B82F6" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Informações da Próxima Reunião
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 6 }}>Data da próxima reunião</label>
            <input
              type="date"
              value={dataProximaReuniao}
              onChange={(e) => onDataChange(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 6 }}>Formato</label>
            <select
              value={formatoReuniao}
              onChange={(e) => onFormatoChange(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", boxSizing: "border-box" }}
            >
              <option value="Presencial">Presencial</option>
              <option value="Online">Online</option>
              <option value="Telefone">Telefone</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 6 }}>Pauta sugerida</label>
          <textarea
            value={pautaSugerida}
            onChange={(e) => onPautaChange(e.target.value)}
            placeholder="Tópicos a discutir na próxima reunião..."
            style={{ width: "100%", minHeight: 100, padding: "10px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Considerações finais */}
      <div style={{ ...CARD, borderTop: "3px solid #041A20" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#041A20", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Considerações Finais
        </p>
        <textarea
          value={consideracoesFinais}
          onChange={(e) => onConsideracoesChange(e.target.value)}
          placeholder="Mensagem final personalizada para o cliente..."
          style={{ width: "100%", minHeight: 140, padding: "10px 12px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, color: "#041A20", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}
