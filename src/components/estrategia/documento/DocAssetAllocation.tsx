import { formatCurrency } from "@/lib/format";
import {
  calcularAlocacaoAtual,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
} from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { nivelScore } from "@/lib/estrategiaScores";

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

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  score: number;
  comentario: string;
  onComentarioChange: (v: string) => void;
}

const CHAVES = ["rendaFixa", "acoes", "fiis", "rvGlobal", "rfGlobal", "cripto"] as const;

export function DocAssetAllocation({ plan, resultados, score, comentario, onComentarioChange }: Props) {
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "Não definido";
  const nv = nivelScore(score);

  const alocAtual = calcularAlocacaoAtual(plan.ativosAtuais);
  const alocMeta = perfil ? ALOCACAO_ALVO[perfil] : null;
  const patrimonio = resultados.carteira?.patrimonio ?? plan.ativosAtuais.total;

  return (
    <div className="doc-page page-break-before" style={{ background: "white" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "2px solid #1E3A8A", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, background: "#1E3A8A", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <i className="ti ti-chart-pie" style={{ fontSize: 22 }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1E3A8A" }}>Asset Allocation</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#DBEAFE", color: "#1E40AF" }}>{perfilLabel}</span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: nv.bg, color: nv.color }}>{score}/100 · {nv.label}</span>
        </div>
      </div>

      {/* Intro */}
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 28 }}>
        A alocação de ativos é a base de uma estratégia sólida de investimentos. Com base no
        perfil <strong>{perfilLabel}</strong> e patrimônio financeiro de{" "}
        <strong>{formatCurrency(patrimonio)}</strong>, definimos a seguinte distribuição recomendada.
      </p>

      {/* Actual vs Target table */}
      {plan.dadosCliente.comecandoDoZero ? (
        <div style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#15803D", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-check" style={{ fontSize: 16 }} />
            Iniciando a jornada de investimentos — carteira a ser construída com perfil {perfilLabel}.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          {/* Atual */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Carteira Atual</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>Classe</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>%</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {CHAVES.filter((k) => (alocAtual[k] ?? 0) > 0).map((k) => (
                  <tr key={k} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "5px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: CLASSE_COLORS[k], display: "inline-block", flexShrink: 0 }} />
                      {CLASSE_LABELS[k]}
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{alocAtual[k].toFixed(1)}%</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#6B7280" }}>{formatCurrency(patrimonio * alocAtual[k] / 100)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #E5E7EB" }}>
                  <td style={{ padding: "5px 8px", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>100%</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{formatCurrency(patrimonio)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Meta */}
          {alocMeta && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.06em" }}>Alocação Recomendada</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>Classe</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>% Meta</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", color: "#9CA3AF", fontWeight: 600, fontSize: 11 }}>Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {CHAVES.filter((k) => (alocMeta[k] ?? 0) > 0).map((k) => {
                    const dif = alocMeta[k] - (alocAtual[k] ?? 0);
                    return (
                      <tr key={k} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "5px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: CLASSE_COLORS[k], display: "inline-block", flexShrink: 0 }} />
                          {CLASSE_LABELS[k]}
                        </td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{alocMeta[k].toFixed(1)}%</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: dif > 0 ? "#15803D" : dif < 0 ? "#B91C1C" : "#9CA3AF", fontWeight: 600 }}>
                          {dif > 0 ? "+" : ""}{dif.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid #E5E7EB" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 700 }}>Total</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>100%</td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action plan from carteira tool */}
      {resultados.carteira && resultados.carteira.planoAcao.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>O que fazer</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {resultados.carteira.planoAcao.slice(0, 8).map((item) => {
              const badge = item.movimentacaoBRL > 0
                ? { label: "↑ Aportar", color: "#15803D", bg: "#DCFCE7" }
                : item.movimentacaoBRL < 0
                ? { label: "↓ Resgatar", color: "#B91C1C", bg: "#FEE2E2" }
                : { label: "→ Manter", color: "#6B7280", bg: "#F3F4F6" };
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", background: "#F8FAFF", borderRadius: 6, border: "0.5px solid #BFDBFE" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "#111827" }}>{item.nomeAtivo}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.movimentacaoBRL > 0 ? "#15803D" : "#B91C1C" }}>
                    {formatCurrency(Math.abs(item.movimentacaoBRL))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consultant comment */}
      <ConsultorBox label="Comentários do Consultor — Asset Allocation" value={comentario} onChange={onComentarioChange} />
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
