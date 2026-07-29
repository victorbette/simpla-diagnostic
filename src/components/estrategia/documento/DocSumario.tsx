import { DOC } from "@/lib/documentoStyles";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GaugeSemiCircular, nivelScoreGauge } from "@/components/shared/GaugeSemiCircular";
import { calcularScoresAreas } from "@/lib/resumoAreas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

export function DocSumario({ nomeCliente, plan, resultados }: Props) {
  const scores      = calcularScoresAreas(plan, resultados);
  const perfil      = plan.dadosCliente.suitabilityPerfil;
  const nivelGeral  = nivelScoreGauge(scores.geral ?? -1);
  const dataHoje    = new Date().toLocaleDateString("pt-BR");

  const nome           = nomeCliente.split(" ")[0];
  const scoreLF        = scores.lf;
  const scoreAA        = scores.aa;
  const scoreProtecao  = scores.ps;
  const scoreTributario = scores.fiscal;

  const areas = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",  score: scoreLF        },
    { icone: "ti-chart-pie", nome: "Gestão de Ativos",      score: scoreAA        },
    { icone: "ti-shield",    nome: "Proteção e Sucessório", score: scoreProtecao  },
    { icone: "ti-receipt",   nome: "Tributário",            score: scoreTributario },
  ];

  // ── Descrições por área ───────────────────────────────────────────────────

  const descricaoLF =
    scoreLF < 0
      ? "a jornada rumo à liberdade financeira ainda precisa ser mapeada"
      : scoreLF <= 30
      ? "a projeção atual indica uma lacuna significativa para a aposentadoria desejada"
      : scoreLF <= 50
      ? "a projeção atual cobre menos da metade do patrimônio necessário para a aposentadoria"
      : scoreLF <= 90
      ? `a projeção já atinge ${scoreLF}% da meta de aposentadoria — um bom começo, mas ainda há caminho`
      : "a projeção indica que você está no caminho certo para a aposentadoria desejada";

  const descricaoAA =
    scoreAA < 0
      ? "a composição da carteira ainda precisa ser avaliada"
      : scoreAA <= 30
      ? "a carteira atual precisa de uma revisão profunda em sua composição e qualidade"
      : scoreAA <= 50
      ? "há oportunidades claras de melhoria na diversificação e nos ativos escolhidos"
      : scoreAA <= 90
      ? "a carteira tem bons fundamentos, mas ainda pode ser otimizada"
      : "a carteira demonstra boa diversificação e qualidade de ativos";

  const descricaoProtecao =
    scoreProtecao < 0
      ? "a proteção patrimonial ainda não foi analisada"
      : scoreProtecao === 0
      ? "não há cobertura de seguro identificada — esse é o ponto mais crítico do diagnóstico"
      : scoreProtecao <= 50
      ? "a cobertura atual protege parcialmente a família em caso de imprevistos"
      : scoreProtecao <= 90
      ? "a proteção está parcialmente estruturada, mas ainda há lacunas importantes"
      : "a proteção patrimonial está bem estruturada";

  const descricaoTributario =
    scoreTributario < 0
      ? "o planejamento tributário ainda não foi analisado"
      : scoreTributario <= 30
      ? "há oportunidades fiscais significativas que ainda não estão sendo aproveitadas"
      : scoreTributario <= 50
      ? "o planejamento tributário pode ser otimizado para reduzir a carga fiscal"
      : scoreTributario <= 90
      ? "há boas práticas fiscais, mas ainda há espaço para melhorar a eficiência"
      : "o planejamento tributário está bem estruturado e eficiente";

  const texto = `${nome}, este documento representa o ponto de partida de uma jornada que vai muito além dos números. Ele é o resultado de um olhar honesto sobre quatro pilares que definem o futuro financeiro de qualquer família — e que, quando bem estruturados, trabalham juntos para construir algo que poucas pessoas conseguem: liberdade de verdade.

Na análise da Liberdade Financeira, ${descricaoLF}. Esse é o pilar que define quando e como você poderá viver de forma completamente independente do trabalho — e ele exige atenção e consistência desde agora.

Na Gestão de Ativos, ${descricaoAA}. A forma como o patrimônio está alocado determina o ritmo com que ele cresce e o quanto resiste às turbulências do mercado.

Na Proteção Patrimonial, ${descricaoProtecao}. Nenhum plano financeiro está completo sem a certeza de que, independente do que aconteça, a família continuará protegida.

No Planejamento Tributário, ${descricaoTributario}. Pagar menos imposto de forma legal e estratégica é uma das alavancas mais subestimadas na construção de patrimônio.

Nas páginas a seguir, você encontrará o direcionamento específico para cada uma dessas áreas — com análises, recomendações e os próximos passos para que cada pilar esteja alinhado com os seus objetivos. Este é apenas o começo.`;

  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Diagnóstico Inicial" />

      {/* ── 1. Header com score geral ────────────────────────────────────── */}
      <div
        className="doc-card"
        style={{
          background: "#F8FAFF",
          border: `1px solid ${DOC.linha}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: DOC.ink, margin: 0 }}>{nomeCliente}</p>
            <p style={{ fontSize: 10.5, color: DOC.muted, margin: "3px 0 8px" }}>Diagnóstico · {dataHoje}</p>
            {perfil && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF" }}>
                Perfil: {PERFIL_LABELS[perfil]}
              </span>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 8.5, fontWeight: 700, color: DOC.hint, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>
              Score Geral
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "center" }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: DOC.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {scores.geral !== null ? scores.geral : "—"}
              </span>
              {scores.geral !== null && <span style={{ fontSize: 13, color: DOC.hint }}>/100</span>}
            </div>
            <div style={{ marginTop: 5, display: "flex", justifyContent: "center" }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999, backgroundColor: nivelGeral.bg, color: nivelGeral.cor }}>
                {scores.geral !== null ? nivelGeral.label : "Sem análise"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. 4 gauges em grid ──────────────────────────────────────────── */}
      <div className="doc-card" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {areas.map(({ icone, nome: nomeArea, score }) => {
          const n = nivelScoreGauge(score);
          return (
            <GaugeSemiCircular
              key={nomeArea}
              score={score}
              label={nomeArea}
              icone={icone}
              nivel={n}
              compact
            />
          );
        })}
      </div>

      {/* ── 3. Texto único emocional ─────────────────────────────────────── */}
      <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "20px 0 0", whiteSpace: "pre-line" as const }}>
        {texto}
      </p>
    </PaginaDoc>
  );
}
