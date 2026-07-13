import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaLiberdadeFinanceira } from "@/components/ferramentas/FerramentaLiberdadeFinanceira";
import type { ResultadoIF } from "@/types/estrategiaResultados";

const AVAILABLE_TAGS = ["IF", "Aposentadoria", "Aportes", "Previdência", "PGBL"];

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoIF: ResultadoIF | null;
  onResultadoIF: (r: ResultadoIF) => void;
  onSaveCloud?: (r: ResultadoIF) => Promise<void>;
}

export function SecaoAposentadoria({
  plan,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  onResultadoIF,
  onSaveCloud,
}: Props) {
  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Ferramenta de liberdade financeira inline */}
      <FerramentaLiberdadeFinanceira
        clientId={plan.clientId}
        planejamentoIF={plan.planejamentoIF}
        dataNascimento={plan.dadosCliente.dataNascimento}
        dadosCliente={plan.dadosCliente}
        onSave={async (params, objetivos, result) => {
          const r: ResultadoIF = {
            patrimonioAposentadoria: result.patrimonioNaIF,
            rendaSustentavel: result.rendaSustentavel,
            gapRenda: result.gapRenda,
            liberdadeAlcancada: result.ifAlcancada,
            aporteAjustado: result.aporteNecessario,
            patrimonioNecessario: result.patrimonioNecessario,
            patrimonioAtual: params.patrimonioInicial,
            idadeAtual: params.idadeAtual,
            idadeMeta: params.idadeMeta,
            anosRestantes: Math.max(0, params.idadeMeta - params.idadeAtual),
            rendaMensalDesejada: params.rendaMensalDesejada,
            aporteAtual: params.aporteMensal,
            taxaRetorno: params.taxaRetornoAnual,
            projecao: result.projecao,
            curvaIdeal: result.curvaIdeal,
            objetivos,
            anoNascimento: params.anoNascimento,
            mesNascimento: params.mesNascimento,
            mesInicioRetirada: result.mesInicioRetirada,
            dataCalculo: new Date().toISOString(),
            savedAt: new Date().toISOString(),
          };
          onResultadoIF(r);
          await onSaveCloud?.(r);
        }}
      />

      {/* Card comentário */}
      <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Estratégia e Recomendações
        </p>
        <div style={{ position: "relative" }}>
          <textarea
            value={comentario}
            onChange={(e) => onComentarioChange(e.target.value)}
            placeholder="Ex: Para atingir a liberdade financeira aos 60 anos, o cliente precisa aumentar o aporte mensal de R$ 3.000 para R$ 4.500..."
            style={{
              width: "100%",
              minHeight: 200,
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
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
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
    </div>
  );
}
