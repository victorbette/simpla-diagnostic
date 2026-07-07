import { gerarAcoes } from "@/lib/estrategiaAcoes";
import type { PrioridadeAcao } from "@/lib/estrategiaAcoes";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  concluidos: Record<string, boolean>;
  onConcluidosChange: (v: Record<string, boolean>) => void;
  consideracoesFinais: string;
  onConsideracoesChange: (v: string) => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const PRIORIDADE: Record<PrioridadeAcao, { border: string; badge: string; badgeText: string; label: string }> = {
  alta:  { border: "#B91C1C", badge: "#FEE2E2", badgeText: "#B91C1C", label: "Alta"  },
  media: { border: "#B45309", badge: "#FEF3C7", badgeText: "#B45309", label: "Média" },
  baixa: { border: "#6B7280", badge: "#F3F4F6", badgeText: "#6B7280", label: "Baixa" },
};

export function SecaoProximosPassos({
  plan,
  resultados,
  concluidos,
  onConcluidosChange,
  consideracoesFinais,
  onConsideracoesChange,
}: Props) {
  const acoes = gerarAcoes(plan, resultados);

  function toggle(id: string) {
    onConcluidosChange({ ...concluidos, [id]: !concluidos[id] });
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Ações geradas automaticamente */}
      <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Próximos Passos
        </p>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px" }}>
          Ações recomendadas com base no diagnóstico
        </p>

        {acoes.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", backgroundColor: "#F0FDF4", borderRadius: 8, border: "1px solid #DCFCE7" }}>
            <span style={{ fontSize: 22, color: "#15803D" }}>✓</span>
            <p style={{ fontSize: 13, color: "#15803D", fontWeight: 600, margin: 0 }}>
              Parabéns! Não identificamos ações urgentes no momento.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {acoes.map((acao) => {
              const p = PRIORIDADE[acao.prioridade];
              const concluido = !!concluidos[acao.id];
              return (
                <div
                  key={acao.id}
                  style={{
                    backgroundColor: "white",
                    borderLeft: `3px solid ${concluido ? "#D1D5DB" : p.border}`,
                    borderRadius: 8,
                    padding: "14px 16px",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    opacity: concluido ? 0.55 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: p.badge, color: p.badgeText }}>
                        {p.label}
                      </span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F0F7FF", color: acao.areaColor, fontWeight: 600 }}>
                        {acao.area}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13,
                      color: concluido ? "#9CA3AF" : "#111827",
                      fontWeight: 500,
                      margin: 0,
                      lineHeight: 1.5,
                      textDecoration: concluido ? "line-through" : "none",
                    }}>
                      {acao.texto}
                    </p>
                  </div>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
                    <input
                      type="checkbox"
                      checked={concluido}
                      onChange={() => toggle(acao.id)}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#15803D" }}
                    />
                    <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Feito</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Considerações finais */}
      <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Considerações Finais
        </p>
        <textarea
          value={consideracoesFinais}
          onChange={(e) => onConsideracoesChange(e.target.value)}
          placeholder="Mensagem final personalizada para o cliente..."
          style={{
            width: "100%",
            minHeight: 140,
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #BFDBFE",
            fontSize: 13,
            color: "#000000",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
