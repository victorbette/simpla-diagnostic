import type { ResultadoIF } from "@/types/estrategiaResultados";
import { formatBRL } from "@/lib/carteira/calculos";
import { GraficoIF } from "@/components/shared/GraficoIF";

interface Props {
  resultadoIF: ResultadoIF | null;
}

export function AcompLF({ resultadoIF }: Props) {
  if (!resultadoIF) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
        <i className="ti ti-trending-up-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
        Dados de Liberdade Financeira não disponíveis.<br />
        Complete a análise no Financial Planning primeiro.
      </div>
    );
  }

  const {
    liberdadeAlcancada,
    patrimonioAtual,
    patrimonioNecessario,
    rendaSustentavel,
    gapRenda,
    rendaMensalDesejada,
    aporteAjustado,
    idadeAtual,
    idadeMeta,
    anosRestantes,
    projecao,
    curvaIdeal,
    mesNascimento,
  } = resultadoIF;

  const metricas = [
    { label: "Patrimônio Atual",     value: formatBRL(patrimonioAtual),                  color: "#1E3A8A", top: "#1E3A8A" },
    { label: "Patrimônio Necessário", value: formatBRL(patrimonioNecessario),             color: "#6B7280", top: "#6B7280" },
    { label: "Renda Sustentável",     value: `${formatBRL(rendaSustentavel)}/mês`,        color: "#15803D", top: "#15803D" },
    { label: "Aporte Recomendado",    value: `${formatBRL(aporteAjustado)}/mês`,          color: "#B45309", top: "#B45309" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Status banner */}
      <div style={{
        backgroundColor: liberdadeAlcancada ? "#DCFCE7" : "#EFF6FF",
        border: `1px solid ${liberdadeAlcancada ? "#A7C9AB" : "#BFDBFE"}`,
        borderRadius: 12, padding: "18px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <i
          className={`ti ${liberdadeAlcancada ? "ti-circle-check" : "ti-clock"}`}
          style={{ fontSize: 36, color: liberdadeAlcancada ? "#15803D" : "#2563EB", flexShrink: 0 }}
        />
        <div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: liberdadeAlcancada ? "#15803D" : "#1E3A8A" }}>
            {liberdadeAlcancada
              ? "Liberdade Financeira Alcançada!"
              : `${anosRestantes} ano${anosRestantes !== 1 ? "s" : ""} para a Liberdade Financeira`
            }
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
            Idade atual: {idadeAtual} anos · Meta: {idadeMeta} anos · Renda desejada: {formatBRL(rendaMensalDesejada)}/mês
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {metricas.map(({ label, value, color, top }) => (
          <div key={label} style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderTop: `3px solid ${top}`, borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gap alert */}
      {!liberdadeAlcancada && gapRenda > 0 && (
        <div style={{
          backgroundColor: "white", border: "1px solid #BFDBFE", borderLeft: "4px solid #B91C1C",
          borderRadius: 10, padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 4px" }}>Gap de renda atual</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{formatBRL(gapRenda)}/mês</p>
          </div>
          <p style={{ fontSize: 12, color: "#9CA3AF", textAlign: "right", maxWidth: 220 }}>
            Renda sustentável ({formatBRL(rendaSustentavel)}) ainda não alcança a renda desejada ({formatBRL(rendaMensalDesejada)})
          </p>
        </div>
      )}

      {/* Projection chart */}
      {projecao && projecao.length > 0 && (
        <div style={{ backgroundColor: "white", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 16px" }}>Projeção Patrimonial</p>
          <GraficoIF
            projecao={projecao}
            curvaIdeal={curvaIdeal}
            mesNascimento={mesNascimento}
            height={300}
          />
        </div>
      )}
    </div>
  );
}
