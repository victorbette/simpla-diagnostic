import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaSeguro } from "@/components/ferramentas/FerramentaSeguro";
import type { ResultadoSeguro } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoSeguro: ResultadoSeguro | null;
  onResultadoSeguro: (r: ResultadoSeguro) => void;
}

const AVAILABLE_TAGS = ["Seguro de Vida", "Invalidez", "ITCMD", "Testamento"];

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

// ── Main component ─────────────────────────────────────────────────────────────

export function SecaoProtecaoSucessorio({
  plan,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoSeguro,
  onResultadoSeguro,
}: Props) {
  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  const commentCard = (
    <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Estratégia e Recomendações
      </p>
      <div style={{ position: "relative" }}>
        <textarea
          value={comentario}
          onChange={(e) => onComentarioChange(e.target.value)}
          placeholder="Ex: Identificamos lacuna de cobertura em seguro de vida. Recomendamos ampliar a apólice e estruturar planejamento sucessório..."
          style={{
            width: "100%",
            minHeight: 160,
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
        <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>
          {comentario.length} caracteres
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
        {AVAILABLE_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 999,
              cursor: "pointer",
              border: "1px solid #BFDBFE",
              backgroundColor: tags.includes(t) ? "#2563EB" : "transparent",
              color: tags.includes(t) ? "white" : "#111827",
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* FerramentaSeguro inline */}
      <FerramentaSeguro
        plan={plan}
        resultados={{ seguro: resultadoSeguro }}
        onResultadosChange={(r) => {
          if (r?.seguro) onResultadoSeguro(r.seguro as ResultadoSeguro);
        }}
      />


      {commentCard}
    </div>
  );
}
