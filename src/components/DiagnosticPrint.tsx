import type { DiagnosticAnswers, DiagnosticResult, RiskLevel } from "@/hooks/useDiagnosticEngine";
import { formatCurrency } from "@/lib/format";

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "Risco alto",
  medium: "Atenção",
  low: "Adequado",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
}

// ─── Advisor print ────────────────────────────────────────────────────────────

interface AdvisorProps {
  result: DiagnosticResult;
  answers: DiagnosticAnswers;
  clientName: string;
}

export function DiagnosticPrintAdvisor({ result, answers, clientName }: AdvisorProps) {
  const { overallScore, overallRisk, categories } = result;

  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
  categories.forEach((c) => counts[c.riskLevel]++);

  const requiredAssets =
    answers.targetPassiveIncome > 0
      ? (answers.targetPassiveIncome * 12) / 0.04
      : 0;

  return (
    <div className="hidden print:block p-8 font-sans text-sm text-black">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 mb-6">
        <h1 className="text-xl font-bold">
          Diagnóstico de Planejamento Financeiro — Relatório Completo
        </h1>
        <p className="mt-1">
          Cliente: <strong>{clientName}</strong> · Data: {formatDate(result.createdAt)}
        </p>
      </div>

      {/* Overall score */}
      <div className="mb-6 flex items-start gap-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Score geral</p>
          <p className="text-5xl font-bold">{overallScore}%</p>
          <p className="mt-1 font-semibold">{RISK_LABEL[overallRisk]}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(["high", "medium", "low"] as RiskLevel[]).map((level) => (
            <div key={level} className="text-center">
              <p className="text-2xl font-bold">{counts[level]}</p>
              <p className="text-xs text-gray-600">{RISK_LABEL[level]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary table */}
      <h2 className="mb-2 font-bold uppercase tracking-wide text-xs text-gray-500">
        Resumo por categoria
      </h2>
      <table className="mb-8 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-1.5 pr-3">Categoria</th>
            <th className="py-1.5 pr-3 w-16 text-right">Score</th>
            <th className="py-1.5 pr-3 w-24">Situação</th>
            <th className="py-1.5">Pontos principais</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} className="border-b border-gray-100">
              <td className="py-1.5 pr-3 font-medium">{cat.label}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{cat.score}%</td>
              <td className="py-1.5 pr-3">{RISK_LABEL[cat.riskLevel]}</td>
              <td className="py-1.5 text-gray-700">
                {cat.findings.slice(0, 2).join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detailed per category */}
      <h2 className="mb-3 font-bold uppercase tracking-wide text-xs text-gray-500">
        Detalhamento por categoria
      </h2>
      {categories.map((cat) => (
        <div key={cat.id} className="mb-5 break-inside-avoid">
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="font-bold">{cat.label}</h3>
            <span className="text-xs text-gray-500">
              {cat.score}% · {RISK_LABEL[cat.riskLevel]}
            </span>
          </div>
          {cat.findings.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">Pontos identificados</p>
              <ul className="mb-1 ml-4 list-disc space-y-0.5">
                {cat.findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {cat.recommendations.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">Recomendações</p>
              <ul className="ml-4 list-disc space-y-0.5">
                {cat.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}

      {/* FIRE data */}
      {answers.targetPassiveIncome > 0 && (
        <>
          <h2 className="mb-2 mt-4 font-bold uppercase tracking-wide text-xs text-gray-500">
            Liberdade financeira (FIRE)
          </h2>
          <table className="mb-8 w-full border-collapse text-xs">
            <tbody>
              {[
                ["Idade atual", `${answers.currentAge} anos`],
                ["Idade alvo", `${answers.fireTargetAge} anos`],
                ["Anos disponíveis", `${Math.max(0, answers.fireTargetAge - answers.currentAge)} anos`],
                ["Renda passiva atual", formatCurrency(answers.monthlyPassiveIncome) + "/mês"],
                ["Meta de renda passiva", formatCurrency(answers.targetPassiveIncome) + "/mês"],
                ["Patrimônio investido atual", formatCurrency(answers.totalInvestedAssets)],
                ["Patrimônio necessário (regra dos 4%)", formatCurrency(requiredAssets)],
                [
                  "Progresso patrimonial",
                  `${Math.round(Math.min((answers.totalInvestedAssets / requiredAssets) * 100, 100))}%`,
                ],
                [
                  "Progresso de renda passiva",
                  `${Math.round(Math.min((answers.monthlyPassiveIncome / answers.targetPassiveIncome) * 100, 100))}%`,
                ],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1 pr-4 text-gray-600 w-64">{label}</td>
                  <td className="py-1 font-semibold tabular-nums">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Consultor notes */}
      {answers.consultorNotes && (
        <>
          <h2 className="mb-2 font-bold uppercase tracking-wide text-xs text-gray-500">
            Notas do consultor
          </h2>
          <p className="mb-8 whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-xs">
            {answers.consultorNotes}
          </p>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-gray-300 pt-3 text-xs text-gray-500">
        <span>Gerado em {formatDate(result.createdAt)}</span>
        <span className="ml-4 font-semibold">Uso restrito ao consultor</span>
      </div>
    </div>
  );
}

// ─── Client print ─────────────────────────────────────────────────────────────

interface ClientProps {
  result: DiagnosticResult;
  clientName: string;
  advisorName?: string;
}

export function DiagnosticPrintClient({ result, clientName, advisorName }: ClientProps) {
  const { overallScore, overallRisk, categories } = result;

  const highRisk = categories.filter((c) => c.riskLevel === "high");
  const mediumRisk = categories.filter((c) => c.riskLevel === "medium");

  return (
    <div className="hidden print:block p-8 font-sans text-sm text-black">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 mb-6">
        <h1 className="text-xl font-bold">
          Diagnóstico Financeiro — Sumário Executivo
        </h1>
        <p className="mt-1">
          Preparado para: <strong>{clientName}</strong> · Data:{" "}
          {formatDate(result.createdAt)}
        </p>
      </div>

      {/* Score in large */}
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Score geral</p>
        <p className="text-7xl font-black leading-none">{overallScore}%</p>
        <p className="mt-2 text-lg font-semibold">{RISK_LABEL[overallRisk]}</p>
      </div>

      {/* Summary table (no technical findings) */}
      <h2 className="mb-2 font-bold uppercase tracking-wide text-xs text-gray-500">
        Avaliação por área
      </h2>
      <table className="mb-8 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-1.5 pr-3">Área</th>
            <th className="py-1.5 pr-3 w-16 text-right">Score</th>
            <th className="py-1.5 w-24">Situação</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id} className="border-b border-gray-100">
              <td className="py-1.5 pr-3 font-medium">{cat.label}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{cat.score}%</td>
              <td className="py-1.5">{RISK_LABEL[cat.riskLevel]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* High risk recommendations (priority) */}
      {highRisk.length > 0 && (
        <>
          <h2 className="mb-2 font-bold uppercase tracking-wide text-xs text-gray-500">
            Próximos passos prioritários
          </h2>
          {highRisk.map((cat) =>
            cat.recommendations.length > 0 ? (
              <div key={cat.id} className="mb-3">
                <p className="font-semibold mb-0.5">{cat.label}</p>
                <ul className="ml-4 list-disc space-y-0.5">
                  {cat.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </>
      )}

      {/* Medium risk recommendations */}
      {mediumRisk.length > 0 && (
        <>
          <h2 className="mb-2 mt-4 font-bold uppercase tracking-wide text-xs text-gray-500">
            Oportunidades de melhoria
          </h2>
          {mediumRisk.map((cat) =>
            cat.recommendations.length > 0 ? (
              <div key={cat.id} className="mb-3">
                <p className="font-semibold mb-0.5">{cat.label}</p>
                <ul className="ml-4 list-disc space-y-0.5">
                  {cat.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </>
      )}

      {/* Footer */}
      <div className="border-t border-gray-300 pt-3 mt-8 text-xs text-gray-500">
        <span>Gerado em {formatDate(result.createdAt)}</span>
        {advisorName && <span className="ml-4">Consultor: {advisorName}</span>}
        <span className="ml-4">Documento preparado pelo seu consultor financeiro</span>
      </div>
    </div>
  );
}
