import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/** Página "Proteção e Sucessão" — resultado da análise de seguros + narrativa */
export function DocProtecaoSucessao({ nomeCliente, plan, resultados }: Props) {
  const rs = resultados.seguro;
  const capitalNecessario = rs?.capitalNecessario ?? rs?.totalNeed ?? 0;
  const capitalSegurado   = rs?.capitalAtual ?? rs?.totalCoverage ?? 0;
  const gap               = rs?.gap ?? Math.max(0, capitalNecessario - capitalSegurado);
  const coberturaPct      = capitalNecessario > 0 ? Math.round((capitalSegurado / capitalNecessario) * 100) : 0;
  const adequado          = capitalSegurado >= capitalNecessario && capitalNecessario > 0;

  // Breakdown fields — new canonical fields, fallback to legacy aliases
  const totalImediato        = rs?.capitalImediato ?? rs?.immediateTotal ?? 0;
  const totalContinuoFamilia = rs?.totalContinuoFamilia ?? rs?.ongoingTotal ?? 0;
  const totalFilhos          = rs?.totalFilhos ?? rs?.educationTotal ?? rs?.capitalFilhos ?? 0;
  const saldoPrevidencia     = rs?.saldoPrevidencia ?? 0;
  const subtotalContinuo     = rs?.capitalContinuo ?? 0;
  const capitalInvalidez     = rs?.capitalInvalidezEfetivo ?? rs?.disabilityTotal ?? 0;
  const capitalDoencaGrave   = rs?.capitalDoencaGraveEfetivo ?? rs?.criticalIllnessTotal ?? 0;
  const totalCoberturasVida  = rs?.capitalCoberturasVida ?? (rs?.disabilityTotal ?? 0) + (rs?.criticalIllnessTotal ?? 0);
  const seguroVidaNecessario = totalImediato + subtotalContinuo;

  const nota = useNotaConsultor(plan.clientId, "ps");

  const blocos: BlocoDoc[] = [];

  if (rs) {
    /* ── Resultado da Análise — KPI tiles ── */
    blocos.push({
      chave: "resultado",
      node: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
          <div className="doc-card" style={{ background: "#F8FAFF", borderRadius: 8, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Capital Necessário</p>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: DOC.ink, margin: 0 }}>{formatCurrency(capitalNecessario)}</p>
          </div>
          <div className="doc-card" style={{ background: adequado ? "#F0FDF4" : "#FFF5F5", borderRadius: 8, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Capital Atual</p>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: adequado ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {formatCurrency(capitalSegurado)}
            </p>
          </div>
          <div className="doc-card" style={{ background: "#F8FAFF", borderRadius: 8, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Cobertura</p>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: adequado ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {coberturaPct}%
            </p>
          </div>
        </div>
      ),
    });

    if (capitalNecessario > 0) {
      blocos.push({
        chave: "gap-alert",
        node: (
          <div
            className="doc-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: adequado ? DOC.verdeBg : DOC.vermelhoBg,
              border: `1px solid ${adequado ? "#A7C9AB" : "#FCA5A5"}`,
              borderRadius: 8,
              padding: "9px 14px",
              marginBottom: 16,
            }}
          >
            <i
              className={`ti ${adequado ? "ti-circle-check" : "ti-alert-circle"}`}
              style={{ fontSize: 16, color: adequado ? DOC.verde : DOC.vermelho, flexShrink: 0 }}
              aria-hidden="true"
            />
            <div>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: adequado ? DOC.verde : DOC.vermelho }}>
                {adequado ? "Cobertura adequada" : `Gap de ${formatCurrency(gap)}`}
              </p>
              <p style={{ margin: "1px 0 0", fontSize: 10.5, color: adequado ? "#166534" : "#991B1B" }}>
                {adequado
                  ? `Sua apólice cobre ${coberturaPct}% do capital necessário. Revise periodicamente.`
                  : `A cobertura atual (${coberturaPct}%) é insuficiente. Avalie a contratação de seguro adicional.`}
              </p>
            </div>
          </div>
        ),
      });
    }

    /* ── Composição das Necessidades ── */
    blocos.push({
      chave: "composicao",
      grudaNoProximo: true,
      node: <p style={LABEL_SUBSECAO()}>Composição das Necessidades</p>,
    });
    blocos.push({
      chave: "composicao-card",
      node: (
        <div className="doc-card" style={{ marginBottom: 16 }}>
          {/* Bloco azul — Seguro de Vida */}
          <div style={{ background: "#F8FAFF", border: `0.5px solid ${DOC.blueBorder}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF" }}>Seguro de Vida</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF" }}>{formatCurrency(seguroVidaNecessario)}</span>
            </div>
            <div style={{ borderTop: `0.5px solid ${DOC.blueBorder}`, paddingTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DOC.muted }}>
                <span>Custo de Inventário</span><span>{formatCurrency(totalImediato)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DOC.muted }}>
                <span>Família</span><span>{formatCurrency(totalContinuoFamilia)}</span>
              </div>
              {totalFilhos > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DOC.muted }}>
                  <span>Educação dos Filhos</span><span>{formatCurrency(totalFilhos)}</span>
                </div>
              )}
              {saldoPrevidencia > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DOC.verde }}>
                  <span>(-) Saldo Previdência</span><span>-{formatCurrency(saldoPrevidencia)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bloco âmbar — Coberturas em Vida */}
          <div style={{ background: "#FFFBEB", border: "0.5px solid #FCD34D", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#B45309" }}>Coberturas em Vida</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#B45309" }}>{formatCurrency(totalCoberturasVida)}</span>
            </div>
            <div style={{ borderTop: "0.5px solid #FDE68A", paddingTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DOC.muted }}>
                <span>Invalidez Permanente</span><span>{formatCurrency(capitalInvalidez)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DOC.muted }}>
                <span>Doenças Graves</span><span>{formatCurrency(capitalDoencaGrave)}</span>
              </div>
            </div>
          </div>

          {/* Total geral */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F0F7FF", borderRadius: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: DOC.ink }}>Capital Total Necessário</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#1E3A8A" }}>{formatCurrency(capitalNecessario)}</span>
          </div>
        </div>
      ),
    });
  } else {
    blocos.push({
      chave: "vazio",
      node: (
        <div
          style={{
            ...CARD,
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
            marginBottom: 18,
          }}
        >
          <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
            Execute a análise de proteção na Etapa 2 para ver o mapa de coberturas.
          </p>
        </div>
      ),
    });
  }

  // Narrativa
  const narrativa = [
    "No mercado financeiro, dedicamos grande parte do nosso tempo focados na rentabilidade e na multiplicação do capital. No entanto, a construção de um patrimônio sólido é um processo assimétrico: leva-se décadas para acumular riqueza, mas ela pode ser severamente dilapidada em questão de meses devido a eventos não planejados.",
    "O pilar de Proteção e Sucessão existe para garantir que o seu planejamento financeiro seja à prova de falhas. O nosso trabalho nesta etapa não é prever o futuro, mas assegurar que você, o seu fluxo de renda e a sua família estejam blindados financeiramente caso o inesperado aconteça.",
    "A blindagem pessoal é o mecanismo pelo qual transferimos os riscos financeiros e imprevisíveis da sua vida para instituições robustas (seguradoras), protegendo a liquidez dos seus investimentos.",
    "Esse plano garante que as turbulências da vida não destruam o que você levou uma vida inteira para construir. É a tranquilidade de saber que, não importa o cenário, a sua dignidade e o bem-estar daqueles que você mais ama estão absolutamente garantidos.",
  ];
  narrativa.forEach((texto, i) => {
    blocos.push({
      chave: `narrativa-${i}`,
      node: <p style={{ ...TEXTO_CORPO, fontSize: 12.5, marginBottom: 12 }}>{texto}</p>,
    });
  });

  blocos.push(...blocosNotaConsultor(plan.clientId, "ps", nota));

  return <PaginaDocFluida titulo="Proteção e Sucessão" nomeCliente={nomeCliente} blocos={blocos} />;
}
