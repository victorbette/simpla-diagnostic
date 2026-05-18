import { useEffect } from "react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularIF, calcularProtecao, calcularFiscal, calcularSucessorio } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { EstrategiaData } from "./EstrategiaInicialPage";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  data: EstrategiaData;
  mode: "consultor" | "cliente";
  onClose: () => void;
}

export function EstrategiaPrint({ plan, clientName, data, mode, onClose }: Props) {
  const ifR = calcularIF(plan.planejamentoIF);
  const protR = calcularProtecao(plan.protecao);
  const fiscalR = calcularFiscal(plan.fiscal);
  const sucR = calcularSucessorio(plan.sucessorio);
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
    <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#041A20" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "white", overflowY: "auto", padding: 40 }} className="print-layer">
      {/* Capa */}
      <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "3px solid #BBA866" }}>
        {data.logoBase64 && <img src={data.logoBase64} alt="Logo" style={{ height: 48, marginBottom: 16, objectFit: "contain" }} />}
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#041A20", margin: "0 0 8px" }}>Estratégia Inicial</h1>
        <h2 style={{ fontSize: 20, fontWeight: 400, color: "#374151", margin: "0 0 4px" }}>{clientName}</h2>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>{hoje} · {data.nomeConsultor}</p>
        {data.apresentacao && <p style={{ fontSize: 14, color: "#374151", marginTop: 16, lineHeight: 1.6 }}>{data.apresentacao}</p>}
      </div>

      {/* IF */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#041A20", margin: "0 0 16px", borderLeft: "3px solid #22C55E", paddingLeft: 12 }}>
          Aposentadoria / Independência Financeira
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {row("Patrimônio necessário", formatCurrency(ifR.patrimonioNecessario))}
          {row("Projeção com aportes", formatCurrency(ifR.patrimonioProjetado))}
          {row("Gap patrimonial", ifR.gap > 0 ? `-${formatCurrency(ifR.gap)}` : `+${formatCurrency(Math.abs(ifR.gap))}`)}
          {row("Progresso rumo à IF", `${formatNumber(ifR.percentualIF, 0)}%`)}
        </div>
        {data.comentarios.aposentadoria && isConsultor && (
          <p style={{ fontSize: 13, color: "#374151", backgroundColor: "#F0FDF4", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #22C55E", margin: 0 }}>
            {data.comentarios.aposentadoria}
          </p>
        )}
      </div>

      {/* Proteção */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#041A20", margin: "0 0 16px", borderLeft: "3px solid #F87171", paddingLeft: 12 }}>
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
          <p style={{ fontSize: 13, color: "#374151", backgroundColor: "#FEF2F2", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #F87171", margin: 0 }}>
            {data.comentarios.protecaoSucessorio}
          </p>
        )}
      </div>

      {/* Fiscal */}
      {isConsultor && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#041A20", margin: "0 0 16px", borderLeft: "3px solid #F59E0B", paddingLeft: 12 }}>
            Planejamento Fiscal
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {row("Renda anual bruta", formatCurrency(plan.fiscal.rendaBrutaAnual))}
            {row("Teto PGBL (12%)", formatCurrency(fiscalR.tetoPGBL))}
            {row("Economia potencial", `${formatCurrency(fiscalR.economiaFiscalPotencial)}/ano`)}
            {row("Espaço disponível PGBL", formatCurrency(fiscalR.espacoPGBL))}
          </div>
          {data.comentarios.fiscal && (
            <p style={{ fontSize: 13, color: "#374151", backgroundColor: "#FFFBEB", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #F59E0B", margin: 0 }}>
              {data.comentarios.fiscal}
            </p>
          )}
        </div>
      )}

      {/* Próximos passos */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#041A20", margin: "0 0 16px", borderLeft: "3px solid #3B82F6", paddingLeft: 12 }}>
          Próximos Passos
        </h3>
        {data.acoes.map((a, i) => (
          <div key={a.id} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#041A20", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              {i + 1}
            </span>
            <div>
              <p style={{ fontSize: 13, color: "#041A20", margin: 0, fontWeight: 500 }}>{a.texto}</p>
              {a.prazo && <p style={{ fontSize: 11, color: "#6B7280", margin: "2px 0 0" }}>Prazo: {a.prazo}</p>}
            </div>
          </div>
        ))}
        {data.consideracoesFinais && (
          <p style={{ fontSize: 13, color: "#374151", marginTop: 16, padding: "12px 16px", backgroundColor: "#F8F9FA", borderRadius: 8, borderLeft: "3px solid #041A20" }}>
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
