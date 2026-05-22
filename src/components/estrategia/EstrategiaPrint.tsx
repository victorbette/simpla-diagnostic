import { useEffect } from "react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularIF, calcularProtecao, calcularFiscal, calcularSucessorio } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { EstrategiaData } from "./EstrategiaInicialPage";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { defaultResultados } from "@/types/estrategiaResultados";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  data: EstrategiaData;
  resultados?: ResultadosEstrategia;
  mode: "consultor" | "cliente";
  onClose: () => void;
}

export function EstrategiaPrint({ plan, clientName, data, resultados: resultadosProp, mode, onClose }: Props) {
  const ifR = calcularIF(plan.planejamentoIF);
  const protR = calcularProtecao(plan.protecao);
  const fiscalR = calcularFiscal(plan.fiscal);
  const sucR = calcularSucessorio(plan.sucessorio);
  const resultados = resultadosProp ?? defaultResultados;
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
      onClose();
    }, 200);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isConsultor = mode === "consultor";

  const row = (label: string, value: string) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F0F7FF", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#000000" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "white", overflowY: "auto", padding: 40 }} className="print-layer">
      {/* Capa */}
      <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "3px solid #3B82F6" }}>
        {data.logoBase64 && <img src={data.logoBase64} alt="Logo" style={{ height: 48, marginBottom: 16, objectFit: "contain" }} />}
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#000000", margin: "0 0 8px" }}>Estratégia Inicial</h1>
        <h2 style={{ fontSize: 20, fontWeight: 400, color: "#111827", margin: "0 0 4px" }}>{clientName}</h2>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>{hoje} · {data.nomeConsultor}</p>
        {data.apresentacao && <p style={{ fontSize: 14, color: "#111827", marginTop: 16, lineHeight: 1.6 }}>{data.apresentacao}</p>}
      </div>

      {/* IF */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 16px", borderLeft: "3px solid #15803D", paddingLeft: 12 }}>
          Aposentadoria / Independência Financeira
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {row("Patrimônio necessário", formatCurrency(ifR.patrimonioNecessario))}
          {row("Projeção com aportes", formatCurrency(ifR.patrimonioProjetado))}
          {row("Gap patrimonial", ifR.gap > 0 ? `-${formatCurrency(ifR.gap)}` : `+${formatCurrency(Math.abs(ifR.gap))}`)}
          {row("Progresso rumo à IF", `${formatNumber(ifR.percentualIF, 0)}%`)}
        </div>
        {data.comentarios.aposentadoria && isConsultor && (
          <p style={{ fontSize: 13, color: "#111827", backgroundColor: "#DCFCE7", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #15803D", margin: 0 }}>
            {data.comentarios.aposentadoria}
          </p>
        )}
      </div>

      {/* Proteção */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 16px", borderLeft: "3px solid #B91C1C", paddingLeft: 12 }}>
          Proteção e Sucessório
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {row("Capital necessário (vida)", formatCurrency(protR.capitalNecessario))}
          {row("Capital segurado atual", formatCurrency(protR.capitalAtual))}
          {row("Gap de cobertura", formatCurrency(protR.gap))}
          {isConsultor && row("ITCMD estimado", formatCurrency(sucR.itcmdEstimado))}
          {isConsultor && row("Custo inventário", formatCurrency(sucR.custoInventarioEstimado))}
        </div>
        {data.comentarios.protecaoSucessorio && isConsultor && (
          <p style={{ fontSize: 13, color: "#111827", backgroundColor: "#FEE2E2", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #B91C1C", margin: 0 }}>
            {data.comentarios.protecaoSucessorio}
          </p>
        )}
      </div>

      {/* Fiscal */}
      {isConsultor && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 16px", borderLeft: "3px solid #2563EB", paddingLeft: 12 }}>
            Planejamento Fiscal
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {row("Renda anual bruta", formatCurrency(plan.fiscal.rendaBrutaAnual))}
            {row("Teto PGBL (12%)", formatCurrency(fiscalR.tetoPGBL))}
            {row("Economia potencial", `${formatCurrency(fiscalR.economiaFiscalPotencial)}/ano`)}
            {row("Espaço disponível PGBL", formatCurrency(fiscalR.espacoPGBL))}
          </div>
          {data.comentarios.fiscal && (
            <p style={{ fontSize: 13, color: "#111827", backgroundColor: "#EFF6FF", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #2563EB", margin: 0 }}>
              {data.comentarios.fiscal}
            </p>
          )}
        </div>
      )}

      {/* Premissas das ferramentas (consultor only) */}
      {isConsultor && (resultados.carteira || resultados.if || resultados.seguro || resultados.fiscal) && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 16px", borderLeft: "3px solid #3B82F6", paddingLeft: 12 }}>
            Premissas dos Simuladores
          </h3>
          {resultados.carteira && (
            <div style={{ padding: 14, backgroundColor: "#DBEAFE", borderRadius: 8, border: "1px solid #BFDBFE", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#000000", margin: "0 0 8px", textTransform: "uppercase" }}>Ferramenta de Carteira</p>
              {row("Patrimônio mapeado", formatCurrency(resultados.carteira.patrimonio))}
              {row("Total a aportar", formatCurrency(resultados.carteira.totalAportar))}
              {row("Total a resgatar", formatCurrency(resultados.carteira.totalResgatar))}
              {row("Ações no plano", String(resultados.carteira.planoAcaoCount))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {resultados.if && (
              <div style={{ padding: 14, backgroundColor: "#DCFCE7", borderRadius: 8, border: "1px solid #A8C8AB" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#15803D", margin: "0 0 8px", textTransform: "uppercase" }}>Simulador de IF</p>
                {row("Patrimônio apos.", formatCurrency(resultados.if.patrimonioAposentadoria))}
                {row("Renda sustentável", `${formatCurrency(resultados.if.rendaSustentavel)}/mês`)}
                {row("Gap de renda", formatCurrency(resultados.if.gapRenda))}
                {row("Aporte ajustado", `${formatCurrency(resultados.if.aporteAjustado)}/mês`)}
                {row("IF atingida?", resultados.if.liberdadeAlcancada ? "Sim" : "Não")}
              </div>
            )}
            {resultados.seguro && (
              <div style={{ padding: 14, backgroundColor: "#FEE2E2", borderRadius: 8, border: "1px solid #C8A8A8" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", margin: "0 0 8px", textTransform: "uppercase" }}>Análise de Seguros</p>
                {row("Capital necessário", formatCurrency(resultados.seguro.totalNeed))}
                {row("Cobertura atual", formatCurrency(resultados.seguro.totalCoverage))}
                {row("Gap de cobertura", formatCurrency(resultados.seguro.gap))}
              </div>
            )}
            {resultados.fiscal && (
              <div style={{ padding: 14, backgroundColor: "#EFF6FF", borderRadius: 8, border: "1px solid #60A5FA" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", margin: "0 0 8px", textTransform: "uppercase" }}>Calculadora PGBL</p>
                {row("IR sem PGBL", `${formatCurrency(resultados.fiscal.irSemPGBL)}/ano`)}
                {row("IR com PGBL", `${formatCurrency(resultados.fiscal.irComPGBL)}/ano`)}
                {row("Economia anual", formatCurrency(resultados.fiscal.economiaAnual))}
                {row("Espaço disponível", `${formatCurrency(resultados.fiscal.espacoDisponivelMensal)}/mês`)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Próximos passos */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 16px", borderLeft: "3px solid #1E40AF", paddingLeft: 12 }}>
          Próximos Passos
        </h3>
        {data.acoes.map((a, i) => (
          <div key={a.id} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#1E3A8A", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              {i + 1}
            </span>
            <div>
              <p style={{ fontSize: 13, color: "#000000", margin: 0, fontWeight: 500 }}>{a.texto}</p>
              {a.prazo && <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>Prazo: {a.prazo}</p>}
            </div>
          </div>
        ))}
        {data.consideracoesFinais && (
          <p style={{ fontSize: 13, color: "#111827", marginTop: 16, padding: "12px 16px", backgroundColor: "#F0F7FF", borderRadius: 8, borderLeft: "3px solid #000000" }}>
            {data.consideracoesFinais}
          </p>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 32 }}>
        Documento gerado em {hoje} · {isConsultor ? "Versão Consultor" : "Versão Cliente"}
      </p>
    </div>
  );
}
