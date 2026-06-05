import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularAlocacaoAtual, ALOCACAO_ALVO, PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { nivelScore, calcularScores } from "@/lib/estrategiaScores";
import { PAGINA, HEADER_PAGINA, TITULO_SECAO, TEXTO_CORPO, LABEL_METRICA } from "@/lib/documentoStyles";
import { RodapePagina } from "./RodapePagina";

const CLASSE_LABELS: Record<string, string> = {
  rendaFixa: "Renda Fixa",
  acoes: "Ações",
  fiis: "FIIs",
  rvGlobal: "RV Global",
  rfGlobal: "RF Global",
  cripto: "Cripto",
};

const CLASSE_COLORS: Record<string, string> = {
  rendaFixa: "#1E40AF",
  acoes: "#15803D",
  fiis: "#2563EB",
  rvGlobal: "#7C3AED",
  rfGlobal: "#1E40AF",
  cripto: "#B45309",
};

const CHAVES = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"] as const;

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  numPagina: number;
}

export function DocAssetAllocation({ nomeCliente, plan, resultados, numPagina }: Props) {
  const score = useMemo(() => calcularScores(plan, resultados).aaScore, [plan, resultados]);
  const storKey = `doc_coment_${plan.clientId}_aa`;
  const [comentario, setComentario] = useState(() => localStorage.getItem(storKey) ?? "");

  const updateComentario = (v: string) => {
    setComentario(v);
    try { localStorage.setItem(storKey, v); } catch { /**/ }
  };

  const perfil = plan.dadosCliente.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "Não definido";
  const nv = nivelScore(score);
  const alocAtual = calcularAlocacaoAtual(plan.ativosAtuais);
  const alocMeta = perfil ? ALOCACAO_ALVO[perfil] : null;
  const patrimonio = resultados.carteira?.patrimonio ?? plan.ativosAtuais.total;

  return (
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA("#2563EB")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#2563EB", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
            <i className="ti ti-chart-pie" style={{ fontSize: 20 }} />
          </div>
          <span style={TITULO_SECAO}>Asset Allocation</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#DBEAFE", color: "#1E40AF" }}>{perfilLabel}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
        </div>
      </div>

      {/* Intro */}
      <p style={{ ...TEXTO_CORPO, marginBottom: 24 }}>
        A alocação de ativos é a base de uma estratégia sólida de investimentos. Com base no
        perfil <strong>{perfilLabel}</strong> e patrimônio financeiro de{" "}
        <strong>{formatCurrency(patrimonio)}</strong>, definimos a seguinte distribuição recomendada.
      </p>

      {/* Tabelas */}
      {plan.dadosCliente.comecandoDoZero ? (
        <div style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 8, padding: "14px 18px", marginBottom: 24 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#059669", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <i className="ti ti-check" style={{ fontSize: 15 }} />
            Iniciando a jornada de investimentos — carteira a ser construída com perfil {perfilLabel}.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Atual */}
          <div>
            <p style={{ ...LABEL_METRICA, marginBottom: 8 }}>Carteira Atual</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ textAlign: "left", padding: "3px 6px", color: "#9CA3AF", fontWeight: 600, fontSize: 10 }}>Classe</th>
                  <th style={{ textAlign: "right", padding: "3px 6px", color: "#9CA3AF", fontWeight: 600, fontSize: 10 }}>%</th>
                  <th style={{ textAlign: "right", padding: "3px 6px", color: "#9CA3AF", fontWeight: 600, fontSize: 10 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {CHAVES.filter((k) => (alocAtual[k] ?? 0) > 0).map((k) => (
                  <tr key={k} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "4px 6px", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: CLASSE_COLORS[k], display: "inline-block", flexShrink: 0 }} />
                      {CLASSE_LABELS[k]}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>{alocAtual[k].toFixed(1)}%</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", color: "#6B7280" }}>{formatCurrency(patrimonio * alocAtual[k] / 100)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #E5E7EB" }}>
                  <td style={{ padding: "4px 6px", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>100%</td>
                  <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{formatCurrency(patrimonio)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Meta */}
          {alocMeta && (
            <div>
              <p style={{ ...LABEL_METRICA, color: "#2563EB", marginBottom: 8 }}>Alocação Recomendada</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{ textAlign: "left", padding: "3px 6px", color: "#9CA3AF", fontWeight: 600, fontSize: 10 }}>Classe</th>
                    <th style={{ textAlign: "right", padding: "3px 6px", color: "#9CA3AF", fontWeight: 600, fontSize: 10 }}>% Meta</th>
                    <th style={{ textAlign: "right", padding: "3px 6px", color: "#9CA3AF", fontWeight: 600, fontSize: 10 }}>Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {CHAVES.filter((k) => (alocMeta[k] ?? 0) > 0).map((k) => {
                    const dif = alocMeta[k] - (alocAtual[k] ?? 0);
                    return (
                      <tr key={k} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "4px 6px", display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: CLASSE_COLORS[k], display: "inline-block", flexShrink: 0 }} />
                          {CLASSE_LABELS[k]}
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>{alocMeta[k].toFixed(1)}%</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: dif > 0 ? "#059669" : dif < 0 ? "#B91C1C" : "#9CA3AF", fontWeight: 600 }}>
                          {dif > 0 ? "+" : ""}{dif.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid #E5E7EB" }}>
                    <td style={{ padding: "4px 6px", fontWeight: 700 }}>Total</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>100%</td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Plano de ação */}
      {resultados.carteira && resultados.carteira.planoAcao.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...LABEL_METRICA, marginBottom: 8 }}>O que fazer</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {resultados.carteira.planoAcao.slice(0, 8).map((item) => {
              const badge = item.movimentacaoBRL > 0
                ? { label: "Aportar", color: "#059669", bg: "#DCFCE7" }
                : item.movimentacaoBRL < 0
                ? { label: "Resgatar", color: "#B91C1C", bg: "#FEE2E2" }
                : { label: "Manter", color: "#6B7280", bg: "#F3F4F6" };
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "#F8FAFF", borderRadius: 5, border: "0.5px solid #BFDBFE" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "#111827" }}>{item.nomeAtivo}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.movimentacaoBRL > 0 ? "#059669" : "#B91C1C" }}>
                    {formatCurrency(Math.abs(item.movimentacaoBRL))}
                  </span>
                </div>
              );
            })}
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
