import type { FinancialPlan } from "@/types/financialPlanning";
import { PERFIL_LABELS, calcularIF, calcularProtecao, calcularFiscal, calcularSucessorio } from "@/types/financialPlanning";
import logoSimpla from "@/assets/logo-simpla.svg";

type SectionStatus = "pendente" | "revisando" | "concluido";
type SecaoAtiva =
  | "capa" | "assetAllocation" | "aposentadoria" | "protecaoSucessorio"
  | "fiscal" | "proximosPassos" | "revisao";

function parseProtecaoSucessorioComment(raw: string): { protecao: string; sucessorio: string } {
  try {
    const p = JSON.parse(raw) as { protecao: string; sucessorio: string };
    if (typeof p.protecao === "string") return p;
  } catch { /* ignore */ }
  return { protecao: raw ?? "", sucessorio: "" };
}

export interface PassoItem {
  id: string;
  prioridade: "alta" | "media" | "baixa";
  texto: string;
  prazo: string;
}

interface PrintProps {
  plan: FinancialPlan;
  clientName: string;
  logoBase64: string | null;
  nomeConsultor: string;
  apresentacao: string;
  comentarios: Record<SecaoAtiva, string>;
  statusSecoes: Record<SecaoAtiva, SectionStatus>;
  proximosPassos: PassoItem[];
  dataProximaReuniao: string;
  consideracoesFinais: string;
}

const SECAO_ORDER: { id: SecaoAtiva; label: string; labelSimples: string }[] = [
  { id: "assetAllocation", label: "Asset Allocation", labelSimples: "Sua carteira de investimentos" },
  { id: "aposentadoria", label: "Aposentadoria / Independência Financeira", labelSimples: "Sua aposentadoria" },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório", labelSimples: "Sua proteção e sucessão" },
  { id: "fiscal", label: "Planejamento Fiscal", labelSimples: "Sua situação fiscal" },
];

const PRIORIDADE_LABELS: Record<PassoItem["prioridade"], string> = {
  alta: "Alta", media: "Média", baixa: "Baixa",
};

function formatDateBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function formatCurr(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ─── Assessor print ───────────────────────────────────────────────────────────

export function EstrategiaPrintConsultor({
  plan, clientName, logoBase64, nomeConsultor, apresentacao,
  comentarios, statusSecoes, proximosPassos, dataProximaReuniao, consideracoesFinais,
}: PrintProps) {
  const logoSrc = logoBase64 ?? logoSimpla;
  const ifResult = calcularIF(plan.planejamentoIF);
  const protResult = calcularProtecao(plan.protecao);
  const fiscalResult = calcularFiscal(plan.fiscal);
  const sucResult = calcularSucessorio(plan.sucessorio);

  const concluidas = SECAO_ORDER.filter((s) => statusSecoes[s.id] === "concluido");

  return (
    <div className="hidden print:block" style={{ fontFamily: "sans-serif", fontSize: 12, color: "#111" }}>
      {/* Capa */}
      <div style={{ pageBreakAfter: "always", textAlign: "center", padding: "60px 40px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <img src={logoSrc} alt="Logo" style={{ maxHeight: 80, maxWidth: 280, objectFit: "contain", marginBottom: 40 }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Estratégia Inicial de Financial Planning</h1>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 32, color: "#1d4ed8" }}>{clientName}</h2>
        <p style={{ fontSize: 14, marginBottom: 4 }}>Consultor: {nomeConsultor || "—"}</p>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>Data de elaboração: {formatDateBR()}</p>
        {plan.suitability && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 24px", display: "inline-block" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Perfil de risco</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{PERFIL_LABELS[plan.suitability.perfil]}</p>
          </div>
        )}
        {apresentacao && (
          <div style={{ marginTop: 32, maxWidth: 500, textAlign: "left", backgroundColor: "#f9fafb", padding: 16, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#374151" }}>{apresentacao}</p>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 20, width: "100%", textAlign: "center", fontSize: 10, color: "#9ca3af" }}>
          CONFIDENCIAL — Uso restrito ao consultor | Simpla Wealth
        </div>
      </div>

      {/* Sections */}
      {concluidas.map(({ id, label }) => {
        const rawComentario = comentarios[id];
        const pairComment = id === "protecaoSucessorio" ? parseProtecaoSucessorioComment(rawComentario) : null;
        return (
          <div key={id} style={{ pageBreakAfter: "always", padding: "40px 40px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, borderBottom: "2px solid #1d4ed8", paddingBottom: 8, marginBottom: 20 }}>{label}</h2>

            {/* Auto data */}
            <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#0369a1", marginBottom: 8 }}>Diagnóstico automático</p>
              {id === "aposentadoria" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Patrimônio atual</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(plan.planejamentoIF.patrimonioAtual)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Patrimônio necessário</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(ifResult.patrimonioNecessario)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Gap</p><p style={{ margin: 0, fontWeight: 700, color: "#dc2626" }}>{formatCurr(ifResult.gap)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Score IF</p><p style={{ margin: 0, fontWeight: 700 }}>{Math.round(ifResult.percentualIF)}%</p></div>
                </div>
              )}
              {id === "protecaoSucessorio" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Capital necessário</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(protResult.capitalNecessario)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Capital segurado</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(protResult.capitalAtual)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Patrimônio total</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(plan.sucessorio.patrimonioTotal)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Custo inventário</p><p style={{ margin: 0, fontWeight: 700, color: "#dc2626" }}>{formatCurr(sucResult.custoInventarioEstimado)}</p></div>
                </div>
              )}
              {id === "fiscal" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Renda bruta anual</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(plan.fiscal.rendaBrutaAnual)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Economia potencial</p><p style={{ margin: 0, fontWeight: 700 }}>{formatCurr(fiscalResult.economiaFiscalPotencial)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 11, color: "#555" }}>Gap de economia</p><p style={{ margin: 0, fontWeight: 700, color: "#dc2626" }}>{formatCurr(fiscalResult.gapEconomia)}</p></div>
                </div>
              )}
              {id === "assetAllocation" && plan.suitability && (
                <p style={{ margin: 0, fontSize: 12 }}>Perfil: {PERFIL_LABELS[plan.suitability.perfil]} | Patrimônio: {formatCurr(plan.ativosAtuais.total || 0)}</p>
              )}
            </div>

            {/* Assessor text */}
            {pairComment ? (
              <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                {pairComment.protecao && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#374151", marginBottom: 4 }}>Estratégia — Proteção</p>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>{pairComment.protecao}</p>
                  </div>
                )}
                {pairComment.sucessorio && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#374151", marginBottom: 4 }}>Estratégia — Sucessório</p>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>{pairComment.sucessorio}</p>
                  </div>
                )}
              </div>
            ) : rawComentario ? (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#374151", marginBottom: 8 }}>Estratégia do consultor</p>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>{rawComentario}</p>
              </div>
            ) : null}

            <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 32 }} />
            <div style={{ position: "fixed", bottom: 20, right: 40, fontSize: 10, color: "#9ca3af" }}>
              CONFIDENCIAL — Uso restrito ao consultor | Simpla Wealth
            </div>
          </div>
        );
      })}

      {/* Próximos passos */}
      {proximosPassos.length > 0 && (
        <div style={{ padding: "40px 40px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, borderBottom: "2px solid #1d4ed8", paddingBottom: 8, marginBottom: 20 }}>Próximos Passos</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e5e7eb" }}>Prioridade</th>
                <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e5e7eb" }}>Ação</th>
                <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid #e5e7eb" }}>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {proximosPassos.map((p, i) => (
                <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{PRIORIDADE_LABELS[p.prioridade]}</td>
                  <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{p.texto}</td>
                  <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{p.prazo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dataProximaReuniao && (
            <p style={{ marginTop: 16, fontSize: 13 }}><strong>Próxima reunião:</strong> {new Date(dataProximaReuniao + "T12:00:00").toLocaleDateString("pt-BR")}</p>
          )}
          {consideracoesFinais && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#374151", marginBottom: 4 }}>Considerações finais</p>
              <p style={{ fontSize: 13, lineHeight: 1.7 }}>{consideracoesFinais}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Client print ─────────────────────────────────────────────────────────────

export function EstrategiaPrintCliente({
  plan: _plan, clientName, logoBase64, nomeConsultor, apresentacao,
  comentarios, statusSecoes, proximosPassos, dataProximaReuniao,
}: PrintProps) {
  const logoSrc = logoBase64 ?? logoSimpla;
  const concluidas = SECAO_ORDER.filter((s) => statusSecoes[s.id] === "concluido");

  return (
    <div className="hidden print:block" style={{ fontFamily: "sans-serif", fontSize: 13, color: "#111" }}>
      {/* Capa */}
      <div style={{ pageBreakAfter: "always", textAlign: "center", padding: "60px 40px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <img src={logoSrc} alt="Logo" style={{ maxHeight: 80, maxWidth: 280, objectFit: "contain", marginBottom: 40 }} />
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, color: "#1d4ed8" }}>Seu Planejamento Financeiro</h1>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>{clientName}</h2>
        <p style={{ fontSize: 14, marginBottom: 4 }}>Consultor: {nomeConsultor || "—"}</p>
        <p style={{ fontSize: 14, color: "#555" }}>Data: {formatDateBR()}</p>
        {apresentacao && (
          <div style={{ marginTop: 40, maxWidth: 500, textAlign: "left", backgroundColor: "#f0f9ff", padding: 20, borderRadius: 8, border: "1px solid #bae6fd" }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#1e3a5f" }}>{apresentacao}</p>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 20, width: "100%", textAlign: "center", fontSize: 10, color: "#9ca3af" }}>
          Documento preparado exclusivamente para {clientName}
        </div>
      </div>

      {/* Sections */}
      {concluidas.map(({ id, labelSimples }) => {
        const rawComentario = comentarios[id];
        const pairComment = id === "protecaoSucessorio" ? parseProtecaoSucessorioComment(rawComentario) : null;
        const mainText = pairComment ? (pairComment.protecao || pairComment.sucessorio) : rawComentario;
        if (!mainText) return null;
        return (
          <div key={id} style={{ pageBreakAfter: "always", padding: "40px 40px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: "2px solid #1d4ed8", paddingBottom: 8, marginBottom: 20, color: "#1d4ed8" }}>
              {labelSimples}
            </h2>
            {pairComment ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pairComment.protecao && (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Proteção e Seguros</p>
                    <p style={{ fontSize: 14, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap" }}>{pairComment.protecao}</p>
                  </div>
                )}
                {pairComment.sucessorio && (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Planejamento Sucessório</p>
                    <p style={{ fontSize: 14, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap" }}>{pairComment.sucessorio}</p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap" }}>{rawComentario}</p>
            )}
            <div style={{ marginTop: 24, backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4 }}>Principal ponto de ação</p>
              <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                {mainText.split(/[.!]\s/)[0].trim()}.
              </p>
            </div>
            <div style={{ position: "fixed", bottom: 20, right: 40, fontSize: 10, color: "#9ca3af" }}>
              Documento preparado exclusivamente para {clientName}
            </div>
          </div>
        );
      })}

      {/* Próximos passos */}
      {proximosPassos.length > 0 && (
        <div style={{ padding: "40px 40px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: "2px solid #1d4ed8", paddingBottom: 8, marginBottom: 20, color: "#1d4ed8" }}>
            Seus Próximos Passos
          </h2>
          <ul style={{ paddingLeft: 0, listStyle: "none" }}>
            {proximosPassos.map((p, i) => (
              <li key={p.id} style={{ marginBottom: 12, padding: "10px 14px", backgroundColor: i % 2 === 0 ? "#f9fafb" : "#fff", border: "1px solid #e5e7eb", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, flex: 1 }}>{p.texto}</span>
                {p.prazo && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 12 }}>{new Date(p.prazo + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
              </li>
            ))}
          </ul>
          {dataProximaReuniao && (
            <div style={{ marginTop: 24, backgroundColor: "#eff6ff", padding: 16, borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Próxima reunião: {new Date(dataProximaReuniao + "T12:00:00").toLocaleDateString("pt-BR")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
