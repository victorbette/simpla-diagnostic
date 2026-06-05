import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularIF, PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { nivelScore, calcularScores } from "@/lib/estrategiaScores";
import { GraficoIF } from "@/components/shared/GraficoIF";
import { PAGINA, HEADER_PAGINA, TITULO_SECAO, TEXTO_CORPO, CARD_METRICA, LABEL_METRICA, VALOR_METRICA } from "@/lib/documentoStyles";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  numPagina: number;
}

function Metrica({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={CARD_METRICA}>
      <p style={LABEL_METRICA}>{label}</p>
      <p style={{ ...VALOR_METRICA, color: color ?? "#111827" }}>{value}</p>
    </div>
  );
}

export function DocLiberdadeFinanceira({ nomeCliente, plan, resultados, numPagina }: Props) {
  const score = useMemo(() => calcularScores(plan, resultados).lfScore, [plan, resultados]);
  const storKey = `doc_coment_${plan.clientId}_lf`;
  const [comentario, setComentario] = useState(() => localStorage.getItem(storKey) ?? "");

  const updateComentario = (v: string) => {
    setComentario(v);
    try { localStorage.setItem(storKey, v); } catch { /**/ }
  };

  const pi = plan.planejamentoIF;
  const rif = resultados.if;
  const nv = nivelScore(score);
  const perfilLabel = plan.dadosCliente.suitabilityPerfil
    ? PERFIL_LABELS[plan.dadosCliente.suitabilityPerfil]
    : null;

  const simplesIF = !rif && pi.rendaMensalDesejada > 0 ? calcularIF(pi) : null;
  const patrimonioNecessario = rif?.patrimonioNecessario ?? simplesIF?.patrimonioNecessario ?? 0;
  const patrimonioAtual = rif?.patrimonioAposentadoria ?? simplesIF?.patrimonioProjetado ?? 0;
  const aporteAtual = rif?.aporteAtual ?? pi.aporteMensal;
  const aporteNecessario = rif?.aporteAjustado ?? aporteAtual;
  const rendaDesejada = rif?.rendaMensalDesejada ?? pi.rendaMensalDesejada;
  const ifAlcancada = rif?.liberdadeAlcancada ?? (simplesIF ? simplesIF.gap <= 0 : false);
  const objetivos = rif?.objetivos ?? [];

  return (
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA("#059669")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#059669", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
            <i className="ti ti-beach" style={{ fontSize: 20 }} />
          </div>
          <span style={TITULO_SECAO}>Liberdade Financeira</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>
          {score}/100 · {nv.label}
        </span>
      </div>

      {/* Intro */}
      <p style={{ ...TEXTO_CORPO, marginBottom: 24 }}>
        <strong>{nomeCliente}</strong>, com base na sua situação atual
        {perfilLabel ? ` (perfil ${perfilLabel})` : ""} e objetivos, elaboramos uma projeção
        para que você alcance a liberdade financeira aos <strong>{pi.idadeMeta} anos</strong>
        {rendaDesejada > 0
          ? `, com uma renda mensal sustentável de ${formatCurrency(rendaDesejada)}.`
          : "."}
      </p>

      {/* Métricas */}
      {(patrimonioNecessario > 0 || aporteAtual > 0) ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Metrica label="Patrimônio Necessário" value={formatCurrency(patrimonioNecessario)} />
          <Metrica
            label="Projeção com Aportes"
            value={formatCurrency(patrimonioAtual)}
            color={patrimonioAtual >= patrimonioNecessario ? "#059669" : undefined}
          />
          <Metrica label="Aporte Atual" value={`${formatCurrency(aporteAtual)}/mês`} />
          <Metrica
            label="Aporte Necessário"
            value={`${formatCurrency(aporteNecessario)}/mês`}
            color={aporteNecessario > aporteAtual ? "#B91C1C" : "#059669"}
          />
        </div>
      ) : (
        <div style={{ padding: "16px 20px", background: "#F0F7FF", borderRadius: 8, marginBottom: 20, border: "1px solid #BFDBFE" }}>
          <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: "#6B7280" }}>
            Execute a simulação de Liberdade Financeira para ver as projeções detalhadas.
          </p>
        </div>
      )}

      {/* Status */}
      {(patrimonioNecessario > 0 || rif) && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ padding: "10px 20px", borderRadius: 8, background: ifAlcancada ? "#DCFCE7" : "#FEF3C7", color: ifAlcancada ? "#059669" : "#B45309", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <i className={ifAlcancada ? "ti ti-check" : "ti ti-alert-triangle"} style={{ fontSize: 15 }} />
            {ifAlcancada
              ? "Meta de liberdade financeira atingível com aportes atuais"
              : "Ajuste necessário no aporte mensal para atingir a meta"}
          </div>
        </div>
      )}

      {/* Gráfico */}
      {rif?.projecao && rif.projecao.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...LABEL_METRICA, marginBottom: 8 }}>Projeção Patrimonial</p>
          <div style={{ background: "#F8FAFF", borderRadius: 8, padding: 8, border: "0.5px solid #BFDBFE", overflowX: "hidden" }}>
            <GraficoIF
              projecao={rif.projecao}
              curvaIdeal={rif.curvaIdeal}
              objetivos={rif.objetivos ?? []}
              height={200}
              mesNascimento={rif.mesNascimento}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20, padding: 20, background: "#F0F7FF", borderRadius: 8, border: "1px solid #BFDBFE", textAlign: "center" }}>
          <i className="ti ti-chart-line" style={{ fontSize: 28, color: "#93C5FD", display: "block", marginBottom: 6 }} />
          <p style={{ ...TEXTO_CORPO, color: "#6B7280" }}>
            Execute o simulador de Liberdade Financeira para ver o gráfico de projeção.
          </p>
        </div>
      )}

      {/* Objetivos */}
      {objetivos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ ...LABEL_METRICA, marginBottom: 8 }}>Objetivos de vida planejados</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {objetivos.map((obj) => (
              <div key={obj.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 12px", background: "#F8FAFF", borderRadius: 6, border: "0.5px solid #BFDBFE" }}>
                <span style={{ flex: 1, fontSize: 12, color: "#111827", fontWeight: 500 }}>{obj.label}</span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{obj.mes}/{obj.ano}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>{formatCurrency(obj.valorBRL)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConsultorBox value={comentario} onChange={updateComentario} />

      <RodapePagina nomeCliente={nomeCliente} numPagina={numPagina} totalPaginas={9} />
    </div>
  );
}

function ConsultorBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "12px 16px", marginTop: 16, marginBottom: 56 }}>
      <p style={{ ...LABEL_METRICA, color: "#B45309", marginBottom: 6 }}>Comentários do Consultor</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Adicione comentários personalizados para o cliente..."
        style={{ width: "100%", minHeight: 72, padding: "6px 8px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12, color: "#000", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}
