import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GaugeSemiCircular, nivelScoreGauge } from "@/components/shared/GaugeSemiCircular";
import { calcularScoresAreas, gerarTextosAreas } from "@/lib/resumoAreas";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/** Página "Ponto de Partida" — resumo do diagnóstico das quatro áreas (referência v4 p.5) */
export function DocPontoDePartida({ nomeCliente, plan, resultados }: Props) {
  const scores = calcularScoresAreas(plan, resultados);
  const textos = gerarTextosAreas(plan, resultados, nomeCliente);
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const nivelGeral = nivelScoreGauge(scores.geral ?? -1);
  const dataDiagnostico = new Date().toLocaleDateString("pt-BR");

  const areas = [
    { icone: "ti-sunset",    nome: "Liberdade Financeira",  score: scores.lf,     texto: textos.lf },
    { icone: "ti-chart-pie", nome: "Asset Allocation",      score: scores.aa,     texto: textos.aa },
    { icone: "ti-shield",    nome: "Proteção e Sucessório", score: scores.ps,     texto: textos.ps },
    { icone: "ti-receipt",   nome: "Tributário",            score: scores.fiscal, texto: textos.fiscal },
  ];

  const blocos: BlocoDoc[] = [
    {
      chave: "intro-1",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
          Para que qualquer planejamento estratégico seja bem-sucedido, o passo fundamental é
          realizar um mapeamento preciso, técnico e realista do cenário atual. Antes de definirmos
          onde você vai chegar, precisamos estabelecer com clareza onde você está.
        </p>
      ),
    },
    {
      chave: "intro-2",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
          O Ponto de Partida consolida o diagnóstico das quatro áreas essenciais da sua vida
          financeira. Este raio-X evidencia as fortalezas do patrimônio que você já construiu, mas,
          acima de tudo, joga luz sobre as ineficiências e vulnerabilidades que precisam ser
          corrigidas para destravar o seu verdadeiro potencial de acumulação.
        </p>
      ),
    },
    {
      chave: "resumo",
      /* Bloco-resumo do diagnóstico */
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
                Diagnóstico · {dataDiagnostico}
              </p>
              {perfil && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                    backgroundColor: "#DBEAFE", color: "#1E40AF",
                  }}
                >
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
      /* 4 gauges semicirculares */
      node: (
        <div className="doc-card" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
          {areas.map(({ icone, nome, score }) => {
            const n = nivelScoreGauge(score);
            return (
              <GaugeSemiCircular
                key={nome}
                score={score}
                label={nome}
                icone={icone}
                nivel={n}
                compact
              />
            );
          })}
        </div>
      ),
    },
  ];

  // Cards analíticos por área — um card por bloco (texto de tamanho variável)
  areas.forEach(({ icone, nome, score, texto }) => {
    const n = nivelScoreGauge(score);
    const nomeCard = nome === "Tributário" ? "Planejamento Tributário" : nome;
    blocos.push({
      chave: `area-${nome}`,
      node: (
        <div
          className="doc-card"
          style={{ background: "white", border: `0.5px solid ${DOC.linha}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingBottom: 6, borderBottom: `0.5px solid ${DOC.linhaSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <i className={`ti ${icone}`} style={{ fontSize: 13, color: DOC.blue }} aria-hidden="true" />
              <span style={{ fontSize: 11, fontWeight: 700, color: DOC.ink }}>{nomeCard}</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: n.cor, background: n.bg, padding: "2px 9px", borderRadius: 99 }}>
              {n.label}
            </span>
          </div>
          <p style={{ fontSize: 10.5, color: DOC.texto, lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
            {texto}
          </p>
        </div>
      ),
    });
  });

  blocos.push({
    chave: "fecho",
    node: (
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginTop: 8 }}>
        Este diagnóstico não é um veredito, mas o alicerce técnico sobre o qual construiremos a sua
        estratégia. Identificar essas lacunas é o primeiro passo para corrigi-las. A partir deste
        ponto de partida, todas as soluções, realocações e próximos passos propostos neste
        relatório terão um único objetivo: transformar as ineficiências de hoje na segurança e na
        liberdade do seu amanhã.
      </p>
    ),
  });

  return <PaginaDocFluida titulo="Ponto de Partida" nomeCliente={nomeCliente} blocos={blocos} />;
}
