import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaPGBL } from "@/components/ferramentas/FerramentaPGBL";
import type { ResultadoFiscal } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoFiscal: ResultadoFiscal | null;
  onResultadoFiscal: (r: ResultadoFiscal) => void;
}

const AVAILABLE_TAGS = ["PGBL", "VGBL", "IR", "Dedução", "Previdência"];

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export function SecaoFiscal({
  plan,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoFiscal,
  onResultadoFiscal,
}: Props) {
  const [lastEdit, setLastEdit] = useState("");

  // Dados da coleta para o contexto
  const dc = plan.dadosCliente;
  const rendaAnualDC =
    (Number(dc.rendaMensal) || 0) * 12 +
    (dc.possuiImovelRenda ? (Number(dc.rendaImovelMensal) || 0) * 12 : 0);
  const tetoPGBLDC = rendaAnualDC * 0.12;
  // Usa 27,5% como estimativa máxima — a calculadora dará o valor exato
  const economiaPotencialDC = tetoPGBLDC * 0.275;
  const temPGBL = dc.possuiPrevidencia && (dc.tipoPrevidencia === "pgbl" || dc.tipoPrevidencia === "ambos");
  const temVGBL = dc.possuiPrevidencia && (dc.tipoPrevidencia === "vgbl" || dc.tipoPrevidencia === "ambos");
  const tipoDecl = plan.fiscal.tipoDeclaracao;

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  function handleComentario(v: string) {
    onComentarioChange(v);
    setLastEdit(
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Card contextual — sempre visível */}
      <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
            Planejamento Tributário — PGBL
          </p>

          {/* Banner contextual da situação de previdência */}
          {temPGBL && (
            <div style={{ background: "#DCFCE7", border: "0.5px solid #86EFAC", borderLeft: "4px solid #15803D", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <i className="ti ti-circle-check" style={{ color: "#15803D", fontSize: 15, marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#14532D", margin: 0, lineHeight: 1.5 }}>
                Cliente possui <strong>PGBL</strong>. Use a calculadora para verificar o aproveitamento do teto e a economia real.
              </p>
            </div>
          )}
          {temVGBL && !temPGBL && tipoDecl === "completa" && (
            <div style={{ background: "#FEF3C7", border: "0.5px solid #FCD34D", borderLeft: "4px solid #B45309", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <i className="ti ti-alert-triangle" style={{ color: "#B45309", fontSize: 15, marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
                Cliente possui <strong>VGBL com declaração completa</strong> — VGBL não deduz no IR. Há espaço para abrir um PGBL e aproveitar o teto de {formatCurrency(tetoPGBLDC)}/ano.
              </p>
            </div>
          )}
          {!dc.possuiPrevidencia && rendaAnualDC > 0 && (
            <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderLeft: "4px solid #2563EB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <i className="ti ti-bulb" style={{ color: "#2563EB", fontSize: 15, marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
                Cliente <strong>sem previdência privada</strong>. Potencial de economia de até {formatCurrency(economiaPotencialDC)}/ano com PGBL na declaração completa.
              </p>
            </div>
          )}

          {/* Métricas contextuais */}
          {rendaAnualDC > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Renda anual", value: formatCurrency(rendaAnualDC) },
                { label: "Teto PGBL (12%)", value: formatCurrency(tetoPGBLDC) + "/ano" },
                { label: "Economia potencial", value: formatCurrency(economiaPotencialDC) + "/ano" },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 3px" }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tipo de declaração */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6B7280" }}>Declaração:</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              backgroundColor: tipoDecl === "completa" ? "#DCFCE7" : tipoDecl === "simplificada" ? "#FEF3C7" : "#F3F4F6",
              color: tipoDecl === "completa" ? "#15803D" : tipoDecl === "simplificada" ? "#B45309" : "#6B7280",
            }}>
              {tipoDecl === "completa" ? "Completa" : tipoDecl === "simplificada" ? "Simplificada" : "Não informado"}
            </span>
          </div>
        </div>
      </div>

      {/* FerramentaPGBL inline */}
      <FerramentaPGBL
        plan={plan}
        savedResult={resultadoFiscal ? {
          rendaAnual:             resultadoFiscal.rendaAnual,
          tetoPGBLAnual:          resultadoFiscal.tetoPGBLAnual,
          aporteAnual:            resultadoFiscal.aporteAnual,
          irComPGBL:              resultadoFiscal.irComPGBL,
          irSemPGBL:              resultadoFiscal.irSemPGBL,
          economiaAnual:          resultadoFiscal.economiaAnual,
          espacoDisponivelMensal: resultadoFiscal.espacoDisponivelMensal,
          aproveitandoTeto:       resultadoFiscal.aproveitandoTeto,
          inputRendaAnualBruta:   resultadoFiscal.inputRendaAnualBruta,
          inputIrrf:              resultadoFiscal.inputIrrf,
          inputDespesas:          resultadoFiscal.inputDespesas,
          inputDependentes:       resultadoFiscal.inputDependentes,
          inputInssAnual:         resultadoFiscal.inputInssAnual,
          inputAporteMensalPGBL:  resultadoFiscal.inputAporteMensalPGBL,
        } : null}
        onSave={(r) => {
          onResultadoFiscal({
            rendaAnual:             r.rendaAnual,
            tetoPGBLAnual:          r.tetoPGBLAnual,
            aporteAnual:            r.aporteAnual,
            irComPGBL:              r.irComPGBL,
            irSemPGBL:              r.irSemPGBL,
            economiaAnual:          r.economiaAnual,
            espacoDisponivelMensal: r.espacoDisponivelMensal,
            aproveitandoTeto:       r.aproveitandoTeto,
            dataCalculo:            new Date().toISOString(),
            savedAt:                new Date().toISOString(),
            inputRendaAnualBruta:   r.inputRendaAnualBruta,
            inputIrrf:              r.inputIrrf,
            inputDespesas:          r.inputDespesas,
            inputDependentes:       r.inputDependentes,
            inputInssAnual:         r.inputInssAnual,
            inputAporteMensalPGBL:  r.inputAporteMensalPGBL,
          });
        }}
      />

      {/* Card comentário */}
      <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#000000",
            margin: "0 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Estratégia e Recomendações
        </p>

        <div style={{ position: "relative" }}>
          <textarea
            value={comentario}
            onChange={(e) => handleComentario(e.target.value)}
            placeholder="Ex: Ao maximizar o aporte no PGBL até o teto de 12% da renda bruta, o cliente economizará R$ 8.400/ano em IR..."
            style={{
              width: "100%",
              minHeight: 180,
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
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 10,
              fontSize: 11,
              color: "#9CA3AF",
            }}
          >
            {comentario.length} caracteres
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
            {lastEdit ? `Última edição: ${lastEdit}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
