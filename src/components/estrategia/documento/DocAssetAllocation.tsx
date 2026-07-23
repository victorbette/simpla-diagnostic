import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan, PerfilRisco } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { HIERARQUIA_CLASSES, ALOCACAO_PADRAO } from "@/lib/carteira/types";
import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/** Descrição da estratégia por perfil de investidor (parágrafo da referência v4 p.9) */
const DESCRICAO_PERFIL: Record<PerfilRisco, string> = {
  conservador:
    "foi estruturado para priorizar a máxima preservação do seu capital e a garantia de liquidez. Com uma baixa tolerância a oscilações de mercado e exposição a risco, a estratégia central foca em blindar o seu patrimônio contra a inflação, garantindo segurança extrema.",
  conservador_moderado:
    "foi estruturado para priorizar a preservação do capital, permitindo uma exposição controlada a ativos de maior potencial de retorno. A estratégia central busca proteger o seu patrimônio da inflação, capturando ganhos moderados com disciplina e segurança.",
  moderado:
    "foi estruturado para equilibrar segurança e crescimento patrimonial. Com uma tolerância intermediária a oscilações de mercado, a estratégia central combina a proteção contra a inflação com uma exposição diversificada a ativos de maior potencial de valorização.",
  arrojado:
    "foi estruturado para maximizar o crescimento do seu patrimônio no longo prazo. Com uma maior tolerância a oscilações de mercado, a estratégia central amplia a exposição a ativos de risco, mantendo uma base sólida de proteção e liquidez.",
};

function fmtPct(v: number) {
  return `${Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")}%`;
}

/** Fluxo de 3 etapas com chevrons (Estratégia Inicial → Novos Aportes → Acompanhamento) */
function FluxoRebalanceamento() {
  const etapas = [
    { titulo: "Estratégia Inicial", sub: "Estratégia Macro de Alocação" },
    { titulo: "Novos Aportes", sub: "" },
    { titulo: "Acompanhamento", sub: "Indicação de ativos para rebalanceamento da carteira" },
  ];
  return (
    <div className="doc-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, margin: "22px 0" }}>
      {etapas.map((etapa, i) => (
        <div key={etapa.titulo} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 150, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: DOC.ink }}>{etapa.titulo}</p>
            {etapa.sub && (
              <p style={{ margin: "4px 0 0", fontSize: 11.5, color: DOC.texto, lineHeight: 1.45 }}>{etapa.sub}</p>
            )}
          </div>
          {i < etapas.length - 1 && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: DOC.navyInk,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-chevron-right" style={{ fontSize: 20, color: "white" }} aria-hidden="true" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Página "Asset Allocation" — narrativa + tabela hierárquica da alocação proposta (v4 p.9) */
export function DocAssetAllocation({ nomeCliente, plan, resultados }: Props) {
  const perfil = plan.dadosCliente.suitabilityPerfil;
  const perfilLabel = perfil ? PERFIL_LABELS[perfil] : "não definido";
  const rc = resultados.carteira;

  // Alocação meta: carteira salva; fallback = alocação-modelo do perfil
  const macroMeta: Record<string, number> | null =
    rc?.macroMeta && Object.keys(rc.macroMeta).length > 0
      ? rc.macroMeta
      : perfil
      ? ALOCACAO_PADRAO[perfil]
      : null;
  const usandoModelo = !(rc?.macroMeta && Object.keys(rc.macroMeta).length > 0);
  const patrimonioMeta = (rc?.patrimonio ?? plan.ativosAtuais.total) + (rc?.aporteDisponivel ?? 0);

  const nota = useNotaConsultor(plan.clientId, "aa");

  const blocos: BlocoDoc[] = [
    {
      chave: "intro",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
          A alocação do seu portfólio foi desenhada sob um modelo de consultoria independente,
          transparente e livre de conflitos de interesse, respeitando estritamente o seu perfil de
          investidor e a sua tolerância ao risco.
        </p>
      ),
    },
  ];

  if (perfil) {
    blocos.push({
      chave: "perfil",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
          O perfil <strong style={{ color: DOC.blue }}>{perfilLabel}</strong>{" "}
          {DESCRICAO_PERFIL[perfil]}
        </p>
      ),
    });
  }

  blocos.push({
    chave: "estatistica",
    node: (
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        Estatisticamente, a estratégia de Asset Allocation (alocação estrutural de ativos) é a
        principal responsável pela performance de uma carteira no longo prazo. Classes de ativos
        descorrelacionadas trazem uma relação de risco x retorno mais inteligente, algo fundamental
        para o investidor.
      </p>
    ),
  });

  blocos.push({
    chave: "abaixo",
    grudaNoProximo: true,
    node: (
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        Abaixo temos a sua alocação de ativos ideal, de acordo com os percentuais definidos após a
        análise dos dados para construção do portfólio meta:
      </p>
    ),
  });

  // Tabela hierárquica — Alocação Proposta por Classe
  blocos.push({
    chave: "tabela",
    node: macroMeta ? (
      <div className="doc-card" style={{ border: `1px solid ${DOC.linha}`, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `0.5px solid ${DOC.linha}` }}>
          <i className="ti ti-layout-list" style={{ fontSize: 13, color: DOC.blue }} aria-hidden="true" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: DOC.ink }}>
            Alocação Proposta por Classe
            {usandoModelo ? " (alocação-modelo do perfil)" : ""}
          </span>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", backgroundColor: "#F8FAFF", padding: "6px 12px", borderBottom: `0.5px solid ${DOC.linha}` }}>
          {(["CLASSE / SUBCLASSE", "%", "R$"] as const).map((h, i) => (
            <span key={h} style={{ fontSize: 9, fontWeight: 600, color: DOC.hint, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i === 0 ? "left" : "right" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Groups */}
        {HIERARQUIA_CLASSES.map((grupo) => {
          const subsData = grupo.subclasses.map((sub) => ({
            ...sub,
            pct: Number(macroMeta[sub.cardId]) || 0,
            brl: ((Number(macroMeta[sub.cardId]) || 0) / 100) * patrimonioMeta,
          }));
          const totalPct = subsData.reduce((s, sub) => s + sub.pct, 0);
          const totalBrl = subsData.reduce((s, sub) => s + sub.brl, 0);
          if (totalPct === 0) return null;
          const visibleSubs = subsData.filter((sub) => sub.pct > 0);

          return (
            <div key={grupo.id}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "8px 12px", backgroundColor: grupo.corBg, borderBottom: `0.5px solid ${DOC.linha}`, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: grupo.cor, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${grupo.icone}`} style={{ fontSize: 10, color: "white" }} aria-hidden="true" />
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: grupo.cor }}>{grupo.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: grupo.cor }}>{fmtPct(totalPct)}</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: grupo.cor, textAlign: "right" }}>
                  {formatCurrency(totalBrl)}
                </span>
              </div>

              {visibleSubs.map((sub) => (
                <div key={sub.cardId} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "6px 12px 6px 16px", borderBottom: "0.5px solid #F9FAFB", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 14, borderLeft: `1.5px solid ${grupo.cor}40`, borderBottom: `1.5px solid ${grupo.cor}40`, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: DOC.texto }}>{sub.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 99, backgroundColor: `${grupo.cor}22`, color: grupo.cor }}>
                      {fmtPct(sub.pct)}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: DOC.muted, textAlign: "right" }}>
                    {formatCurrency(sub.brl)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "8px 12px", backgroundColor: "#F8FAFF", borderTop: `0.5px solid ${DOC.linha}`, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: DOC.ink, textTransform: "uppercase" }}>Total</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: DOC.ink }}>100%</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: DOC.ink, textAlign: "right" }}>
            {formatCurrency(patrimonioMeta)}
          </span>
        </div>
      </div>
    ) : (
      <div
        className="doc-card"
        style={{ background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}`, borderRadius: 10, padding: "16px 18px", marginBottom: 6 }}
      >
        <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
          Defina o perfil do investidor e a carteira na Etapa 2 para ver a alocação proposta.
        </p>
      </div>
    ),
  });

  blocos.push({
    chave: "rebalanceamento-intro",
    node: (
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginTop: 14 }}>
        Uma vez definida a estratégia de alocação de ativos em termos percentuais, ela será nossa
        referência para realizar o rebalanceamento. Com os novos aportes, vamos sempre realizar o
        investimento naquela classe de ativos que está mais distante do percentual ideal.
      </p>
    ),
  });

  blocos.push({ chave: "fluxo", node: <FluxoRebalanceamento /> });

  blocos.push({
    chave: "manter",
    node: (
      <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
        Essa estratégia inicial deve ser mantida enquanto julgarmos que continua refletindo suas
        preferências, aderência ao risco, perfil e objetivos de longo prazo.
      </p>
    ),
  });

  blocos.push(...blocosNotaConsultor(plan.clientId, "aa", nota));

  return <PaginaDocFluida titulo="Asset Allocation" nomeCliente={nomeCliente} blocos={blocos} />;
}
