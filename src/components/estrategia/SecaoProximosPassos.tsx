import type { AcaoItem } from "./EstrategiaInicialPage";
import type { FinancialPlan } from "@/types/financialPlanning";

interface Props {
  plan: FinancialPlan;
  acoes: AcaoItem[];
  onAcoesChange: (v: AcaoItem[]) => void;
  consideracoesFinais: string;
  onConsideracoesChange: (v: string) => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white", borderRadius: 12, padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const PRIORIDADE_STYLE: Record<AcaoItem["prioridade"], { bg: string; border: string; badge: string; badgeText: string; label: string }> = {
  alta:  { bg: "#F2EBEB", border: "#7A3535", badge: "#FEE2E2", badgeText: "#7A3535", label: "ALTA" },
  media: { bg: "#F5F0E0", border: "#8A7A45", badge: "#FEF3C7", badgeText: "#8A7A45", label: "MÉDIA" },
  baixa: { bg: "#F9FAFB", border: "#9E9070", badge: "#F5F3EE", badgeText: "#6B6347", label: "BAIXA" },
};

export function SecaoProximosPassos({
  plan: _plan,
  acoes,
  onAcoesChange,
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
      <div style={{ ...CARD, borderTop: "3px solid #2A4F6A" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Plano de ação para o cliente
        </p>
        <p style={{ fontSize: 12, color: "#6B6347", margin: "0 0 20px" }}>
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
                <span style={{ fontSize: 16, color: "#9E9070", cursor: "grab", flexShrink: 0, lineHeight: 1.5 }}>⠿</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: style.badge, color: style.badgeText }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F5F3EE", color: "#3D3520" }}>
                      {acao.area}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={acao.texto}
                    onChange={(e) => updateAcao(acao.id, { texto: e.target.value })}
                    style={{ fontSize: 13, color: "#000000", border: "none", background: "transparent", outline: "none", width: "100%", fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <label style={{ fontSize: 11, color: "#6B6347" }}>Prazo:</label>
                    <input
                      type="date"
                      value={acao.prazo}
                      onChange={(e) => updateAcao(acao.id, { prazo: e.target.value })}
                      style={{ fontSize: 12, border: "1px solid #E2DCC8", borderRadius: 4, padding: "2px 6px", color: "#3D3520" }}
                    />
                    <select
                      value={acao.prioridade}
                      onChange={(e) => updateAcao(acao.id, { prioridade: e.target.value as AcaoItem["prioridade"] })}
                      style={{ fontSize: 11, border: "1px solid #E2DCC8", borderRadius: 4, padding: "2px 6px", color: "#3D3520" }}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => removeAcao(acao.id)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#9E9070", fontSize: 16, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addAcao}
          style={{ marginTop: 14, width: "100%", padding: "10px 0", border: "2px dashed #E2DCC8", borderRadius: 8, backgroundColor: "transparent", color: "#6B6347", fontSize: 13, cursor: "pointer" }}
        >
          + Adicionar ação
        </button>
      </div>

      {/* Considerações finais */}
      <div style={{ ...CARD, borderTop: "3px solid #000000" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Considerações Finais
        </p>
        <textarea
          value={consideracoesFinais}
          onChange={(e) => onConsideracoesChange(e.target.value)}
          placeholder="Mensagem final personalizada para o cliente..."
          style={{ width: "100%", minHeight: 140, padding: "10px 12px", borderRadius: 6, border: "1px solid #E2DCC8", fontSize: 13, color: "#000000", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}
