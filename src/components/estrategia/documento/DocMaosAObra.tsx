import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import type { EstrategiaScores } from "@/lib/estrategiaScores";
import { nivelScore } from "@/lib/estrategiaScores";
import { RodapePagina } from "./RodapePagina";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  scores: EstrategiaScores;
}

const ETAPAS = [
  {
    num: "01",
    title: "Organize",
    text: "Implemente as recomendações de Asset Allocation para otimizar sua carteira de acordo com seu perfil.",
  },
  {
    num: "02",
    title: "Proteja",
    text: "Contrate os seguros indicados e dê os primeiros passos no planejamento sucessório para proteger sua família.",
  },
  {
    num: "03",
    title: "Economize",
    text: "Aproveite os benefícios fiscais disponíveis e maximize seus aportes mensais para acelerar sua liberdade financeira.",
  },
] as const;

export function DocMaosAObra({
  plan: _plan,
  resultados: _resultados,
  clientName,
  scores,
}: Props) {
  const nv = nivelScore(scores.overall);

  return (
    <div className="doc-page page-break-before">
      {/* Hero */}
      <div
        style={{
          background: "#1E3A8A",
          borderRadius: 12,
          padding: "36px 40px",
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        <i
          className="ti ti-rocket"
          style={{
            fontSize: 44,
            color: "#60A5FA",
            display: "block",
            marginBottom: 12,
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.02em",
          }}
        >
          Mãos à Obra!
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 15, color: "#93C5FD" }}>
          A sua jornada rumo à independência financeira começa agora
        </p>
      </div>

      {/* Score final */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Score Geral do Diagnóstico
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 20,
              background: "#F8FAFF",
              border: "0.5px solid #BFDBFE",
              borderRadius: 16,
              padding: "20px 36px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 60,
                fontWeight: 800,
                color: "#1E3A8A",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {scores.overall}
            </p>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 15, color: "#6B7280" }}>/100</p>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 12px",
                  borderRadius: 999,
                  background: nv.bg,
                  color: nv.color,
                }}
              >
                {nv.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      <p
        style={{
          fontSize: 14,
          color: "#374151",
          lineHeight: 1.85,
          marginBottom: 32,
          textAlign: "center",
          maxWidth: 560,
          margin: "0 auto 40px",
        }}
      >
        <strong>{clientName}</strong>, você já deu o primeiro e mais importante passo:
        entender onde está e para onde quer ir. Agora é hora de colocar em prática o que foi
        planejado.
      </p>

      {/* Steps */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {ETAPAS.map((e) => (
          <div
            key={e.num}
            style={{
              background: "#F8FAFF",
              border: "0.5px solid #BFDBFE",
              borderRadius: 10,
              padding: "22px 16px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 30,
                fontWeight: 800,
                color: "#DBEAFE",
                lineHeight: 1,
              }}
            >
              {e.num}
            </p>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                fontWeight: 700,
                color: "#1E3A8A",
              }}
            >
              {e.title}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#6B7280",
                lineHeight: 1.6,
              }}
            >
              {e.text}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          background: "#1E3A8A",
          borderRadius: 10,
          padding: "22px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#93C5FD" }}>
            Próxima etapa
          </p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "white" }}>
            Agende sua reunião de revisão com o consultor
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "10px 18px",
            flexShrink: 0,
          }}
        >
          <i className="ti ti-calendar-plus" style={{ fontSize: 18, color: "#60A5FA" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
            simpla.invest
          </span>
        </div>
      </div>

      <RodapePagina pagina={9} clientName={clientName} />
    </div>
  );
}
