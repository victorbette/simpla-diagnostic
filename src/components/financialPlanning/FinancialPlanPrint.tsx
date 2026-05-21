import {
  calcularIF,
  calcularProtecao,
  calcularFiscal,
  calcularSucessorio,
  PERFIL_LABELS,
  ALOCACAO_ALVO,
} from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";

interface PrintProps {
  plan: FinancialPlan;
  clientName: string;
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Adequado";
  if (score >= 40) return "Atenção";
  return "Risco";
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24, pageBreakInside: "avoid" }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 700,
          borderBottom: "1px solid #d1d5db",
          paddingBottom: 4,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Advisor Print ────────────────────────────────────────────────────────────

export function FinancialPlanPrintAdvisor({ plan, clientName }: PrintProps) {
  const ifResult = calcularIF(plan.planejamentoIF);
  const protResult = calcularProtecao(plan.protecao);
  const fiscalResult = calcularFiscal(plan.fiscal);
  const sucResult = calcularSucessorio(plan.sucessorio);
  const alvo = plan.suitability ? ALOCACAO_ALVO[plan.suitability.perfil] : null;

  const scores = {
    if: Math.round(ifResult.percentualIF),
    prot: Math.round(protResult.percentualCoberto),
    fiscal: fiscalResult.economiaFiscalPotencial > 0
      ? Math.round((fiscalResult.economiaFiscalAtual / fiscalResult.economiaFiscalPotencial) * 100)
      : 100,
    suc: [
      plan.sucessorio.possuiTestamento ? 30 : 0,
      plan.sucessorio.possuiHolding ? 30 : 0,
      plan.sucessorio.possuiSeguroVidaSucessao ? 20 : 0,
      sucResult.percentualCusto < 5 ? 20 : sucResult.percentualCusto < 8 ? 10 : 0,
    ].reduce((a, b) => a + b, 0),
  };
  const overallScore = Math.round((scores.if + scores.prot + scores.fiscal + scores.suc) / 4);

  return (
    <div className="hidden print:block print-advisor">
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 11,
          color: "#111827",
          maxWidth: 680,
          margin: "0 auto",
          padding: "20px 0",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            borderBottom: "2px solid #111827",
            paddingBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Simpla · Planejamento Financeiro
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              Uso restrito ao consultor
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#6b7280" }}>
            <div>Data: {formatDate(new Date())}</div>
            <div>Cliente: {clientName}</div>
          </div>
        </div>

        {/* Sumário executivo */}
        <PrintSection title="Sumário executivo">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Row label="Cliente" value={clientName} />
            <Row label="Score geral" value={`${overallScore}/100 — ${scoreLabel(overallScore)}`} />
            <Row
              label="Perfil de risco"
              value={plan.suitability ? PERFIL_LABELS[plan.suitability.perfil] : "Não avaliado"}
            />
            <Row label="Status do plano" value={plan.status === "completo" ? "Completo" : "Rascunho"} />
          </div>
        </PrintSection>

        {/* Asset Allocation */}
        {alvo && (
          <PrintSection title="Asset Allocation">
            <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 6 }}>
              Macroalocação alvo para o perfil {plan.suitability ? PERFIL_LABELS[plan.suitability.perfil] : ""}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {(Object.entries(alvo) as [string, number][]).map(([k, v]) => (
                <Row key={k} label={k} value={`${v}%`} />
              ))}
            </div>
          </PrintSection>
        )}

        {/* IF */}
        <PrintSection title="Aposentadoria e liberdade financeira">
          <Row label="Score" value={`${scores.if}/100`} />
          <Row label="Patrimônio necessário" value={formatCurrency(ifResult.patrimonioNecessario)} />
          <Row label="Projeção com aportes atuais" value={formatCurrency(ifResult.patrimonioProjetado)} />
          <Row label="Gap" value={formatCurrency(ifResult.gap)} />
          <Row label="Renda mensal atingível" value={formatCurrency(ifResult.rendaMensalAtingivel)} />
          <Row label="Anos restantes" value={`${ifResult.anosParaMeta} anos`} />
        </PrintSection>

        {/* Proteção */}
        <PrintSection title="Proteção e gestão de riscos">
          <Row label="Score" value={`${scores.prot}/100`} />
          <Row label="Capital necessário" value={formatCurrency(protResult.capitalNecessario)} />
          <Row label="Capital segurado atual" value={formatCurrency(protResult.capitalAtual)} />
          <Row label="Gap de cobertura" value={formatCurrency(protResult.gap)} />
          <Row label="Seguro de vida" value={plan.protecao.possuiSeguroVida ? "Sim" : "Não"} />
          <Row label="Seguro de invalidez" value={plan.protecao.possuiSeguroInvalidez ? "Sim" : "Não"} />
          <Row label="Plano de saúde" value={plan.protecao.possuiPlanoSaude ? "Sim" : "Não"} />
          {protResult.recomendacoes.map((r, i) => (
            <p key={i} style={{ fontSize: 10, color: "#6b7280", margin: "2px 0" }}>• {r}</p>
          ))}
        </PrintSection>

        {/* Fiscal */}
        <PrintSection title="Planejamento fiscal">
          <Row label="Score" value={`${scores.fiscal}/100`} />
          <Row label="Renda anual bruta" value={formatCurrency(plan.fiscal.rendaBrutaAnual)} />
          <Row label="Teto PGBL (12%)" value={formatCurrency(fiscalResult.tetoPGBL)} />
          <Row
            label="PGBL aportado"
            value={formatCurrency(plan.fiscal.temPGBL ? plan.fiscal.valorPGBLAnual : 0)}
          />
          <Row label="Economia tributária potencial" value={`${formatCurrency(fiscalResult.economiaFiscalPotencial)}/ano`} />
          <Row label="Economia realizada" value={`${formatCurrency(fiscalResult.economiaFiscalAtual)}/ano`} />
          {fiscalResult.recomendacoes.map((r, i) => (
            <p key={i} style={{ fontSize: 10, color: "#6b7280", margin: "2px 0" }}>• {r}</p>
          ))}
        </PrintSection>

        {/* Sucessório */}
        <PrintSection title="Planejamento sucessório">
          <Row label="Score" value={`${scores.suc}/100`} />
          <Row label="Patrimônio total" value={formatCurrency(plan.sucessorio.patrimonioTotal)} />
          <Row label="ITCMD estimado (4%)" value={formatCurrency(sucResult.itcmdEstimado)} />
          <Row label="Custo do inventário (6%)" value={formatCurrency(sucResult.custoInventarioEstimado)} />
          <Row label="Custo total" value={formatCurrency(sucResult.custoTotal)} />
          <Row label="Patrimônio líquido herdeiros" value={formatCurrency(sucResult.patrimonioLiquidoHerdeiros)} />
          <Row label="Testamento" value={plan.sucessorio.possuiTestamento ? "Sim" : "Não"} />
          <Row label="Holding familiar" value={plan.sucessorio.possuiHolding ? "Sim" : "Não"} />
          {sucResult.recomendacoes.map((r, i) => (
            <p key={i} style={{ fontSize: 10, color: "#6b7280", margin: "2px 0" }}>• {r}</p>
          ))}
        </PrintSection>

        {/* Notas */}
        {plan.notasConsultor && (
          <PrintSection title="Notas do consultor">
            <p style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{plan.notasConsultor}</p>
          </PrintSection>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, fontSize: 9, color: "#9ca3af", textAlign: "center" }}>
          Uso restrito ao consultor · {formatDate(new Date())} · Simpla Wealth Financial Planning
        </div>
      </div>
    </div>
  );
}

// ─── Client Print ─────────────────────────────────────────────────────────────

export function FinancialPlanPrintClient({ plan, clientName }: PrintProps) {
  const ifResult = calcularIF(plan.planejamentoIF);
  const protResult = calcularProtecao(plan.protecao);
  const fiscalResult = calcularFiscal(plan.fiscal);
  const sucResult = calcularSucessorio(plan.sucessorio);

  const scoreIF = Math.round(ifResult.percentualIF);
  const scoreProt = Math.round(protResult.percentualCoberto);
  const scoreFiscal =
    fiscalResult.economiaFiscalPotencial > 0
      ? Math.round((fiscalResult.economiaFiscalAtual / fiscalResult.economiaFiscalPotencial) * 100)
      : 100;
  const overallScore = Math.round((scoreIF + scoreProt + scoreFiscal) / 3);

  return (
    <div className="hidden print:block print-client">
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 11,
          color: "#111827",
          maxWidth: 680,
          margin: "0 auto",
          padding: "20px 0",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Seu Diagnóstico Financeiro</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Preparado para {clientName} · {formatDate(new Date())}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "8px 24px",
              borderRadius: 99,
              background: overallScore >= 70 ? "#d1fae5" : overallScore >= 40 ? "#fef3c7" : "#fee2e2",
              fontSize: 16,
              fontWeight: 700,
              color: overallScore >= 70 ? "#065f46" : overallScore >= 40 ? "#92400e" : "#991b1b",
            }}
          >
            Score geral: {overallScore}/100 — {scoreLabel(overallScore)}
          </div>
        </div>

        {/* Perfil */}
        {plan.suitability && (
          <PrintSection title="Seu perfil de investidor">
            <p style={{ fontSize: 13, fontWeight: 600 }}>{PERFIL_LABELS[plan.suitability.perfil]}</p>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Pontuação: {plan.suitability.totalPontos} de 35 pontos (
              {formatNumber(plan.suitability.percentual, 0)}%)
            </p>
          </PrintSection>
        )}

        {/* IF */}
        <PrintSection title="Aposentadoria e liberdade financeira">
          <div
            style={{
              padding: "8px 12px",
              background: scoreIF >= 70 ? "#d1fae5" : scoreIF >= 40 ? "#fef3c7" : "#fee2e2",
              borderRadius: 6,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 600,
              color: scoreIF >= 70 ? "#065f46" : scoreIF >= 40 ? "#92400e" : "#991b1b",
            }}
          >
            Situação: {scoreLabel(scoreIF)} ({scoreIF}/100)
          </div>
          <Row label="Meta de renda mensal" value={formatCurrency(plan.planejamentoIF.rendaMensalDesejada)} />
          <Row label="Projeção patrimonial" value={formatCurrency(ifResult.patrimonioProjetado)} />
          <Row label="Patrimônio necessário" value={formatCurrency(ifResult.patrimonioNecessario)} />
          {ifResult.gap > 0 && (
            <p style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
              Próximo passo: aumentar aportes mensais para reduzir o gap de{" "}
              {formatCurrency(ifResult.gap)}.
            </p>
          )}
        </PrintSection>

        {/* Proteção */}
        <PrintSection title="Proteção e seguros">
          <div
            style={{
              padding: "8px 12px",
              background: scoreProt >= 70 ? "#d1fae5" : scoreProt >= 40 ? "#fef3c7" : "#fee2e2",
              borderRadius: 6,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 600,
              color: scoreProt >= 70 ? "#065f46" : scoreProt >= 40 ? "#92400e" : "#991b1b",
            }}
          >
            Situação: {scoreLabel(scoreProt)} ({scoreProt}/100)
          </div>
          <Row label="Capital protegido" value={`${formatNumber(protResult.percentualCoberto, 0)}%`} />
          {protResult.gap > 0 && (
            <p style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
              Próximo passo: contratar ou ampliar cobertura de seguro de vida.
            </p>
          )}
        </PrintSection>

        {/* Fiscal */}
        <PrintSection title="Planejamento fiscal">
          <div
            style={{
              padding: "8px 12px",
              background: scoreFiscal >= 70 ? "#d1fae5" : scoreFiscal >= 40 ? "#fef3c7" : "#fee2e2",
              borderRadius: 6,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 600,
              color: scoreFiscal >= 70 ? "#065f46" : scoreFiscal >= 40 ? "#92400e" : "#991b1b",
            }}
          >
            Situação: {scoreLabel(scoreFiscal)} ({scoreFiscal}/100)
          </div>
          {fiscalResult.economiaFiscalPotencial > 0 && (
            <Row
              label="Economia tributária potencial"
              value={`${formatCurrency(fiscalResult.economiaFiscalPotencial)}/ano`}
            />
          )}
          {fiscalResult.gapEconomia > 5000 && (
            <p style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
              Próximo passo: aportar no PGBL e usar dedução fiscal disponível.
            </p>
          )}
        </PrintSection>

        {/* Sucessório */}
        <PrintSection title="Planejamento sucessório">
          <Row label="Custo total estimado do inventário" value={`${formatNumber(sucResult.percentualCusto, 1)}% do patrimônio`} />
          <Row label="Valor em risco" value={formatCurrency(sucResult.custoTotal)} />
          {sucResult.recomendacoes.slice(0, 2).map((r, i) => (
            <p key={i} style={{ fontSize: 10, color: "#6b7280", margin: "2px 0" }}>• {r}</p>
          ))}
        </PrintSection>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: 8,
            fontSize: 9,
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          {formatDate(new Date())} · Simpla Wealth Financial Planning · Este documento é pessoal e intransferível.
        </div>
      </div>
    </div>
  );
}
