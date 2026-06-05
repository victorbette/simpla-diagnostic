import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularSucessorio } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularPerfilHolding } from "@/lib/holding";
import { nivelScore, calcularScores } from "@/lib/estrategiaScores";
import { PAGINA, HEADER_PAGINA, TITULO_SECAO, TEXTO_CORPO, LABEL_METRICA, CARD_METRICA } from "@/lib/documentoStyles";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  numPagina: number;
}

function Checklist({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: "1px solid #F3F4F6" }}>
      <i className={ok ? "ti ti-check" : "ti ti-x"} style={{ color: ok ? "#059669" : "#B91C1C", fontSize: 13, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontSize: 12, color: ok ? "#111827" : "#6B7280", fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#9CA3AF" }}>{sub}</p>}
      </div>
    </div>
  );
}

export function DocProtecaoSucessorio({ nomeCliente, plan, resultados, numPagina }: Props) {
  const score = useMemo(() => calcularScores(plan, resultados).psScore, [plan, resultados]);
  const storKey = `doc_coment_${plan.clientId}_ps`;
  const [comentario, setComentario] = useState(() => localStorage.getItem(storKey) ?? "");

  const updateComentario = (v: string) => {
    setComentario(v);
    try { localStorage.setItem(storKey, v); } catch { /**/ }
  };

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
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA("#B91C1C")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#B91C1C", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
            <i className="ti ti-shield" style={{ fontSize: 20 }} />
          </div>
          <span style={TITULO_SECAO}>Proteção e Sucessório</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
      </div>

      {/* Intro */}
      <p style={{ ...TEXTO_CORPO, marginBottom: 24 }}>
        A proteção do seu patrimônio e o planejamento sucessório garantem que seu legado seja
        preservado e transmitido da forma que você deseja, protegendo sua família em qualquer situação.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {/* PROTEÇÃO */}
        <div>
          <p style={{ ...LABEL_METRICA, color: "#B91C1C", marginBottom: 10 }}>Proteção</p>

          {seguro && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Capital necessário", value: formatCurrency(seguro.totalNeed) },
                { label: "Capital atual",       value: formatCurrency(seguro.totalCoverage) },
                { label: "Gap",                 value: formatCurrency(seguro.gap), color: seguro.gap > 0 ? "#B91C1C" : "#059669" },
              ].map((m) => (
                <div key={m.label} style={CARD_METRICA}>
                  <p style={{ ...LABEL_METRICA, fontSize: 9 }}>{m.label}</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: m.color ?? "#111827" }}>{m.value}</p>
                </div>
              ))}
            </div>
          )}

          <Checklist ok={pp.possuiSeguroVida} label="Seguro de vida" sub={pp.possuiSeguroVida && pp.capitalSeguradoVida > 0 ? formatCurrency(pp.capitalSeguradoVida) : undefined} />
          <Checklist ok={pp.possuiSeguroInvalidez} label="Seguro de invalidez" sub={pp.possuiSeguroInvalidez && pp.capitalSeguradoInvalidez > 0 ? formatCurrency(pp.capitalSeguradoInvalidez) : undefined} />
          <Checklist ok={pp.possuiPlanoSaude} label="Plano de saúde" />

          {seguro && seguro.gap > 0 && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 7 }}>
              <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, color: "#B91C1C", textTransform: "uppercase" }}>Recomendação</p>
              <p style={{ ...TEXTO_CORPO, color: "#7F1D1D", fontSize: 12 }}>
                Contratar seguro de vida adicional de <strong>{formatCurrency(seguro.gap)}</strong> para cobrir {pp.dependentes} dependente(s).
              </p>
            </div>
          )}
        </div>

        {/* SUCESSÓRIO */}
        <div>
          <p style={{ ...LABEL_METRICA, color: "#7C3AED", marginBottom: 10 }}>Sucessório</p>

          <div style={{ marginBottom: 14 }}>
            <Checklist ok={ps.possuiTestamento} label="Testamento elaborado" />
            <Checklist ok={ps.possuiHolding} label="Holding familiar" />
            <Checklist ok={ps.doacoesVida} label="Doações em vida com usufruto" />
            <Checklist ok={ps.seguroComBeneficiario} label="Seguro com beneficiário definido" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { label: "ITCMD estimado", value: formatCurrency(resultadoSuc.itcmdEstimado) },
              { label: "Custo inventário", value: formatCurrency(resultadoSuc.custoInventarioEstimado) },
            ].map((m) => (
              <div key={m.label} style={CARD_METRICA}>
                <p style={{ ...LABEL_METRICA, fontSize: 9 }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#B45309" }}>{m.value}</p>
              </div>
            ))}
          </div>

          {holdingRecomendada && (
            <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <i className="ti ti-building-bank" style={{ fontSize: 16, color: "#7C3AED" }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>Holding Patrimonial Recomendada</p>
              </div>
              <p style={{ ...TEXTO_CORPO, color: "#4C1D95", fontSize: 12, marginBottom: 8 }}>
                Com base no perfil identificado (score {holdingPerfil.score}%), a constituição de uma
                holding pode reduzir custos sucessórios e proteger o patrimônio de{" "}
                <strong>{formatCurrency(patrimonio)}</strong>.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {holdingPerfil.motivos.slice(0, 3).map((m) => (
                  <span key={m} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "#DCFCE7", color: "#059669", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <i className="ti ti-check" style={{ fontSize: 10 }} /> {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConsultorBox value={comentario} onChange={updateComentario} />

      <RodapePagina nomeCliente={nomeCliente} numPagina={numPagina} totalPaginas={9} />
    </div>
  );
}

function ConsultorBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: 8, padding: "12px 16px", marginTop: 20, marginBottom: 56 }}>
      <p style={{ fontSize: 10, color: "#B45309", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Comentários do Consultor</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Adicione comentários personalizados para o cliente..."
        style={{ width: "100%", minHeight: 72, padding: "6px 8px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12, color: "#000", resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}
