import { formatCurrency } from "@/lib/format";
import { calcularIF, PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { nivelScore } from "@/lib/estrategiaScores";
import { GraficoIF } from "@/components/shared/GraficoIF";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  score: number;
  comentario: string;
  onComentarioChange: (v: string) => void;
}

function Metrica({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 20px" }}>
      <p style={{ margin: "0 0 6px", fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: color ?? "#111827" }}>{value}</p>
    </div>
  );
}

export function DocLiberdadeFinanceira({ plan, resultados, clientName, score, comentario, onComentarioChange }: Props) {
  const pi = plan.planejamentoIF;
  const rif = resultados.if;
  const nv = nivelScore(score);
  const perfilLabel = plan.dadosCliente.suitabilityPerfil ? PERFIL_LABELS[plan.dadosCliente.suitabilityPerfil] : null;

  const simplesIF = !rif && pi.rendaMensalDesejada > 0 ? calcularIF(pi) : null;
  const patrimonioNecessario = rif?.patrimonioNecessario ?? simplesIF?.patrimonioNecessario ?? 0;
  const patrimonioAtual = rif?.patrimonioAposentadoria ?? simplesIF?.patrimonioProjetado ?? 0;
  const aporteAtual = rif?.aporteAtual ?? pi.aporteMensal;
  const aporteNecessario = rif?.aporteAjustado ?? aporteAtual;
  const rendaDesejada = rif?.rendaMensalDesejada ?? pi.rendaMensalDesejada;
  const ifAlcancada = rif?.liberdadeAlcancada ?? (simplesIF ? simplesIF.gap <= 0 : false);

  const objetivos = rif?.objetivos ?? [];

  return (
    <div className="doc-page page-break-before" style={{ background: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, background: "#15803D", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <i className="ti ti-beach" style={{ fontSize: 22 }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Liberdade Financeira</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
      </div>

      {/* Intro */}
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 24 }}>
        <strong>{clientName}</strong>, com base na sua situação atual
        {perfilLabel ? ` (perfil ${perfilLabel})` : ""} e objetivos, elaboramos uma projeção para que
        você alcance a liberdade financeira aos <strong>{pi.idadeMeta} anos</strong>
        {rendaDesejada > 0 ? `, com uma renda mensal sustentável de ${formatCurrency(rendaDesejada)}.` : "."}
      </p>

      {/* 2×2 metrics */}
      {(patrimonioNecessario > 0 || aporteAtual > 0) ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Metrica label="Patrimônio Necessário" value={formatCurrency(patrimonioNecessario)} color="#111827" />
          <Metrica label="Projeção com Aportes" value={formatCurrency(patrimonioAtual)} color={patrimonioAtual >= patrimonioNecessario ? "#15803D" : "#111827"} />
          <Metrica label="Aporte Atual" value={`${formatCurrency(aporteAtual)}/mês`} color="#111827" />
          <Metrica label="Aporte Necessário" value={`${formatCurrency(aporteNecessario)}/mês`} color={aporteNecessario > aporteAtual ? "#B91C1C" : "#15803D"} />
        </div>
      ) : (
        <div style={{ padding: "16px 20px", background: "#F0F7FF", borderRadius: 8, marginBottom: 20, border: "1px solid #BFDBFE" }}>
          <p style={{ margin: 0, color: "#6B7280", fontSize: 13, fontStyle: "italic" }}>
            Execute a simulação de Liberdade Financeira para ver as projeções detalhadas.
          </p>
        </div>
      )}

      {/* Status badge */}
      {(patrimonioNecessario > 0 || rif) && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: ifAlcancada ? "#DCFCE7" : "#FEF3C7",
            color: ifAlcancada ? "#15803D" : "#B45309",
            fontSize: 14,
            fontWeight: 700,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className={ifAlcancada ? "ti ti-check" : "ti ti-alert-triangle"} style={{ fontSize: 16 }} />
              {ifAlcancada
                ? "Meta de liberdade financeira atingível com aportes atuais"
                : "Ajuste necessário no aporte mensal para atingir a meta"}
            </span>
          </div>
        </div>
      )}

      {/* Projection chart */}
      {rif && rif.projecao && rif.projecao.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Projeção Patrimonial
          </p>
          <div style={{ background: "#F8FAFF", borderRadius: 8, padding: "8px", border: "0.5px solid #BFDBFE", width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
            <GraficoIF
              projecao={rif.projecao}
              curvaIdeal={rif.curvaIdeal}
              objetivos={rif.objetivos ?? []}
              height={220}
              mesNascimento={rif.mesNascimento}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24, padding: "24px", background: "#F0F7FF", borderRadius: 8, border: "1px solid #BFDBFE", textAlign: "center" }}>
          <i className="ti ti-chart-line" style={{ fontSize: 32, color: "#93C5FD", display: "block", marginBottom: 8 }} />
          <p style={{ margin: 0, color: "#6B7280", fontSize: 13 }}>
            Execute o simulador de Liberdade Financeira para ver o gráfico de projeção.
          </p>
        </div>
      )}

      {/* Objectives */}
      {objetivos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Objetivos de vida planejados
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {objetivos.map((obj) => (
              <div key={obj.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", background: "#F8FAFF", borderRadius: 6, border: "0.5px solid #BFDBFE" }}>
                <span style={{ flex: 1, fontSize: 13, color: "#111827", fontWeight: 500 }}>{obj.label}</span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>{obj.mes}/{obj.ano}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF" }}>{formatCurrency(obj.valorBRL)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultant comment */}
      <ConsultorBox label="Comentários do Consultor — Liberdade Financeira" value={comentario} onChange={onComentarioChange} />
    </div>
  );
}

function ConsultorBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "14px 18px", marginTop: 8 }}>
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#B45309", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Adicione comentários personalizados para o cliente..."
        style={{ width: "100%", minHeight: 100, padding: "8px 10px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 13, color: "#000", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}
