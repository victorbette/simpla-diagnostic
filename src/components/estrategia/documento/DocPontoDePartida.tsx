import { DOC } from "@/lib/documentoStyles";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GaugeSemiCircular, nivelScoreGauge } from "@/components/shared/GaugeSemiCircular";
import { calcularScoresAreas } from "@/lib/resumoAreas";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

const TEXTO_STYLE = {
  fontSize: 12,
  color: "#374151",
  lineHeight: 1.95,
  margin: "0",
  whiteSpace: "pre-line" as const,
  textAlign: "justify" as const,
};

/** Página "Ponto de Partida" — score geral, 4 gauges e texto único personalizado */
export function DocPontoDePartida({ nomeCliente, plan, resultados }: Props) {
  const scores     = calcularScoresAreas(plan, resultados);
  const perfil     = plan.dadosCliente.suitabilityPerfil;
  const nivelGeral = nivelScoreGauge(scores.geral ?? -1);
  const dataHoje   = new Date().toLocaleDateString("pt-BR");

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

  // ── Dados contextuais ────────────────────────────────────────────────────

  const dc           = plan.dadosCliente;
  const temFilhos    = (dc.filhos?.length ?? 0) > 0;
  const temConjuge   = ['casado', 'uniao_estavel'].includes(dc.estadoCivil ?? '');
  const objetivos    = resultados.if?.objetivos ?? [];
  const nomeObjetivos = objetivos.map(o => o.label).filter(Boolean);

  // ── Parágrafos individuais ────────────────────────────────────────────────

  const primeiroNome = nome || 'você';

  const textoIntro =
`${primeiroNome}, o que você tem em mãos não é apenas um documento. É o resultado de uma análise honesta e detalhada sobre quatro pilares que vão determinar o tipo de vida que você terá daqui a 10, 20 ou 30 anos. Pilares que a maioria das pessoas nunca para para avaliar com seriedade — porque exige coragem olhar de frente para os números e admitir onde há lacunas.

Você fez diferente. E isso já coloca você em uma posição que poucos alcançam.

Mas o diagnóstico sozinho não transforma nada. O que transforma é o que vem depois dele.`;

  const textoLF =
`A Liberdade Financeira é o pilar que define quando — e se — você vai poder um dia acordar sem a obrigação do trabalho, viver do que construiu e ter tempo para o que realmente importa. ${
  nomeObjetivos.length > 0
    ? `Você definiu objetivos concretos que fazem parte desse futuro — ${nomeObjetivos.join(', ')} — e cada um deles depende de uma trajetória bem calibrada para se tornar realidade.`
    : 'Cada mês sem uma estratégia clara para esse pilar é um mês em que a distância entre onde você está e onde quer chegar pode estar crescendo silenciosamente.'
} A análise revelou exatamente onde essa jornada está — e o quanto ela precisa evoluir para que o futuro que você imagina de fato aconteça.`;

  const textoAA =
`A Gestão de Ativos determina o ritmo com que o seu patrimônio cresce. Não é sobre encontrar o melhor produto do mês ou tentar adivinhar o mercado — é sobre ter uma estratégia coerente, diversificada e alinhada com o seu momento de vida. Uma carteira mal estruturada não gera perdas visíveis no extrato. Ela simplesmente cresce menos do que poderia — e essa diferença, composta ao longo de anos, pode significar décadas a mais de trabalho ou uma aposentadoria muito diferente da planejada.`;

  const textoProtecao =
`A Proteção Patrimonial é o pilar que ninguém quer pensar — e exatamente por isso é o mais negligenciado. Construir patrimônio sem proteção é como erguer uma casa sem fundação: funciona enquanto o tempo está bom. Um único evento inesperado — uma doença grave, uma invalidez, um falecimento prematuro — pode desfazer em meses o que levou anos para construir.${
  temFilhos
    ? ` Seus filhos contam com essa base. O futuro que você está construindo para eles depende de que essa base permaneça intacta, independente do que aconteça.`
    : ''
}${
  temConjuge
    ? ` Seu cônjuge também está dentro desse risco. A proteção adequada não é um custo — é a garantia de que a vida que vocês construíram juntos continuará protegida.`
    : ''
}`;

  const textoTributario =
`O Planejamento Tributário é a alavanca mais subestimada de todas. Pagar menos imposto de forma legal e estratégica não é um privilégio de grandes fortunas — é uma ferramenta acessível que, bem utilizada, pode representar uma diferença expressiva no patrimônio acumulado ao longo de décadas. Cada real que deixa de ir ao fisco desnecessariamente é um real que poderia estar sendo reinvestido e compondo patrimônio para o seu futuro.`;

  const textoFechamento =
`Nas páginas a seguir, você encontrará a análise completa de cada um desses pilares — com clareza sobre onde estão as oportunidades, onde estão os riscos e quais são os próximos passos para que cada área esteja alinhada com os seus objetivos.

Este é o ponto de partida. O que vem depois depende das decisões que você tomar a partir de agora.`;

  // ── Blocos ────────────────────────────────────────────────────────────────

  const blocos: BlocoDoc[] = [
    {
      chave: "resumo",
      grudaNoProximo: true,
      node: (
        <div
          className="doc-card"
          style={{
            background: "#F8FAFF",
            border: `1px solid ${DOC.linha}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: DOC.ink, margin: 0 }}>{nomeCliente}</p>
              <p style={{ fontSize: 10.5, color: DOC.muted, margin: "3px 0 8px" }}>
                Diagnóstico · {dataHoje}
              </p>
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
      ),
    },
    {
      chave: "gauges",
      grudaNoProximo: true,
      node: (
        <div className="doc-card" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
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
      ),
    },
    {
      chave: "texto-intro",
      grudaNoProximo: true,
      node: <p style={{ ...TEXTO_STYLE, marginTop: 8 }}>{textoIntro}</p>,
    },
    {
      chave: "texto-lf",
      node: <p style={{ ...TEXTO_STYLE, marginTop: 20 }}>{textoLF}</p>,
    },
    {
      chave: "texto-aa",
      node: <p style={{ ...TEXTO_STYLE, marginTop: 20 }}>{textoAA}</p>,
    },
    {
      chave: "texto-protecao",
      node: <p style={{ ...TEXTO_STYLE, marginTop: 20 }}>{textoProtecao}</p>,
    },
    {
      chave: "texto-tributario",
      node: <p style={{ ...TEXTO_STYLE, marginTop: 20 }}>{textoTributario}</p>,
    },
    {
      chave: "texto-fechamento",
      node: <p style={{ ...TEXTO_STYLE, marginTop: 20 }}>{textoFechamento}</p>,
    },
  ];

  return <PaginaDocFluida titulo="Ponto de Partida" nomeCliente={nomeCliente} blocos={blocos} />;
}
