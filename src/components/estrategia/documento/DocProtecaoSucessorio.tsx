import { formatCurrency } from "@/lib/format";
import { calcularSucessorio } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularPerfilHolding } from "@/lib/holding";
import { nivelScore } from "@/lib/estrategiaScores";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  score: number;
  comentario: string;
  onComentarioChange: (v: string) => void;
}

function Checklist({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
      <i
        className={ok ? "ti ti-check" : "ti ti-x"}
        style={{ color: ok ? "#15803D" : "#B91C1C", fontSize: 14, flexShrink: 0, marginTop: 2 }}
      />
      <div>
        <p style={{ margin: 0, fontSize: 13, color: ok ? "#111827" : "#6B7280", fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF" }}>{sub}</p>}
      </div>
    </div>
  );
}

function MetricaProtecao({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: color ?? "#111827" }}>{value}</p>
    </div>
  );
}

export function DocProtecaoSucessorio({ plan, resultados, score, comentario, onComentarioChange }: Props) {
  const pp = plan.protecao;
  const ps = plan.sucessorio;
  const nv = nivelScore(score);
  const resultadoSuc = calcularSucessorio(ps);
  const holdingPerfil = calcularPerfilHolding(
    { ...plan.dadosCliente, temEmpresa: plan.fiscal.temEmpresa },
    ps,
  );
  const holdingRecomendada = holdingPerfil.recomendada && !ps.possuiHolding;
  const patrimonio = plan.dadosCliente.patrimonioTotalEstimado ?? 0;

  const seguro = resultados.seguro;

  return (
    <div className="doc-page" style={{ background: "white", minHeight: "297mm" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, background: "#B91C1C", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <i className="ti ti-shield" style={{ fontSize: 22 }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Proteção e Sucessório</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
      </div>

      {/* Intro */}
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 28 }}>
        A proteção do seu patrimônio e o planejamento sucessório garantem que seu legado seja
        preservado e transmitido da forma que você deseja, protegendo sua família em qualquer situação.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* PROTEÇÃO */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#B91C1C", textTransform: "uppercase", letterSpacing: "0.06em" }}>Proteção</p>

          {seguro && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
              <MetricaProtecao label="Capital necessário" value={formatCurrency(seguro.totalNeed)} />
              <MetricaProtecao label="Capital atual" value={formatCurrency(seguro.totalCoverage)} />
              <MetricaProtecao label="Gap" value={formatCurrency(seguro.gap)} color={seguro.gap > 0 ? "#B91C1C" : "#15803D"} />
            </div>
          )}

          <div>
            <Checklist
              ok={pp.possuiSeguroVida}
              label="Seguro de vida"
              sub={pp.possuiSeguroVida && pp.capitalSeguradoVida > 0 ? formatCurrency(pp.capitalSeguradoVida) : undefined}
            />
            <Checklist
              ok={pp.possuiSeguroInvalidez}
              label="Seguro de invalidez"
              sub={pp.possuiSeguroInvalidez && pp.capitalSeguradoInvalidez > 0 ? formatCurrency(pp.capitalSeguradoInvalidez) : undefined}
            />
            <Checklist ok={pp.possuiPlanoSaude} label="Plano de saúde" />
          </div>

          {seguro && seguro.gap > 0 && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#B91C1C", textTransform: "uppercase" }}>Recomendação</p>
              <p style={{ margin: 0, fontSize: 13, color: "#7F1D1D" }}>
                Contratar seguro de vida adicional de <strong>{formatCurrency(seguro.gap)}</strong> para cobrir {pp.dependentes} dependente(s).
              </p>
            </div>
          )}
        </div>

        {/* SUCESSÓRIO */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sucessório</p>

          <div style={{ marginBottom: 16 }}>
            <Checklist ok={ps.possuiTestamento} label="Testamento elaborado" />
            <Checklist ok={ps.possuiHolding} label="Holding familiar" />
            <Checklist ok={ps.doacoesVida} label="Doações em vida com usufruto" />
            <Checklist ok={ps.seguroComBeneficiario} label="Seguro com beneficiário definido" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <MetricaProtecao label="ITCMD estimado" value={formatCurrency(resultadoSuc.itcmdEstimado)} color="#B45309" />
            <MetricaProtecao label="Custo inventário" value={formatCurrency(resultadoSuc.custoInventarioEstimado)} color="#B45309" />
          </div>

          {holdingRecomendada && (
            <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <i className="ti ti-building-bank" style={{ fontSize: 18, color: "#7C3AED" }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>Holding Patrimonial Recomendada</p>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#4C1D95", lineHeight: 1.5 }}>
                Com base no perfil identificado (score {holdingPerfil.score}%), a constituição de uma
                holding pode reduzir custos sucessórios e proteger o patrimônio de{" "}
                <strong>{formatCurrency(patrimonio)}</strong>.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {holdingPerfil.motivos.slice(0, 3).map((m) => (
                  <span key={m} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#DCFCE7", color: "#15803D", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-check" style={{ fontSize: 10 }} /> {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consultant comment */}
      <ConsultorBox label="Comentários do Consultor — Proteção e Sucessório" value={comentario} onChange={onComentarioChange} />
    </div>
  );
}

function ConsultorBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "14px 18px", marginTop: 24 }}>
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
