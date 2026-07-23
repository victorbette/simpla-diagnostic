import { PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia, ResultadoSeguro } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/** Barra horizontal necessidade vs cobertura (versão print da SecaoProtecaoSucessorio) */
function NeedBar({ label, need, coverage, total }: { label: string; need: number; coverage: number; total: number }) {
  const t = total || 1;
  const needPct = Math.min(100, (need / t) * 100);
  const covPct = Math.min(needPct, (coverage / t) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
        <span style={{ color: DOC.muted }}>{label}</span>
        <span style={{ fontWeight: 600, color: DOC.ink }}>{formatCurrency(need)}</span>
      </div>
      <div style={{ height: 6, backgroundColor: "#F0F7FF", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${needPct}%`, backgroundColor: DOC.blueBorder, borderRadius: 3 }} />
        <div style={{
          position: "absolute", top: 0, left: 0,
          height: "100%", width: `${covPct}%`,
          backgroundColor: covPct >= needPct - 1 ? DOC.verde : "#3B82F6",
          borderRadius: 3,
        }} />
      </div>
    </div>
  );
}

function CardCobertura({ titulo, total, coberto, gap }: { titulo: string; total: number; coberto: number; gap: number }) {
  return (
    <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "11px 14px" }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, color: DOC.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
        {titulo}
      </p>
      {[
        { label: "Necessário", value: total, color: DOC.ink },
        { label: "Coberto", value: coberto, color: DOC.verde },
        { label: "Gap", value: gap, color: gap > 0 ? DOC.vermelho : DOC.verde },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
          <span style={{ color: DOC.muted }}>{label}</span>
          <span style={{ fontWeight: 700, color }}>{formatCurrency(value)}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, height: 5, backgroundColor: DOC.blueBorder, borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${total > 0 ? Math.min(100, (coberto / total) * 100) : 0}%`,
            backgroundColor: gap > 0 ? "#3B82F6" : DOC.verde,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}

/** Donut Coberto × Gap — dimensões fixas, sem animação (impressão confiável) */
function DonutGap({ rs }: { rs: ResultadoSeguro }) {
  const coberto = rs.capitalAtual ?? rs.totalCoverage ?? 0;
  const gap = rs.gap ?? 0;
  const dados = [
    { name: "Coberto", value: coberto, color: DOC.verde },
    { name: "Gap", value: gap, color: DOC.vermelho },
  ].filter((d) => d.value > 0);

  if (dados.length === 0) return null;

  return (
    <div>
      <PieChart width={150} height={140}>
        <Pie
          data={dados}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={62}
          strokeWidth={2}
          stroke="white"
          isAnimationActive={false}
        >
          {dados.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
      </PieChart>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
        {dados.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: DOC.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
            {d.name}: {formatCurrency(d.value)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Página "Proteção e Sucessão" — resultado da análise de seguros + narrativa (v5 p.17) */
export function DocProtecaoSucessao({ nomeCliente, plan, resultados }: Props) {
  const rs = resultados.seguro;
  const capitalNecessario = rs?.capitalNecessario ?? rs?.totalNeed ?? 0;
  const capitalSegurado = rs?.capitalAtual ?? rs?.totalCoverage ?? 0;
  const gap = rs?.gap ?? Math.max(0, capitalNecessario - capitalSegurado);

  // Mesma semântica do card "Resultado da Análise" da ferramenta de seguros
  const coberturaPct = capitalNecessario > 0 ? Math.round((capitalSegurado / capitalNecessario) * 100) : 0;
  const adequado = capitalSegurado >= capitalNecessario && capitalNecessario > 0;
  const necessidadesImediatas = rs ? rs.capitalImediato ?? rs.immediateTotal ?? 0 : 0;
  const necessidadesContinuas = rs
    ? rs.capitalContinuo ?? (rs.ongoingTotal ?? 0) + (rs.educationTotal ?? 0)
    : 0;
  const coberturasVida = rs
    ? rs.capitalCoberturasVida ?? (rs.disabilityTotal ?? 0) + (rs.criticalIllnessTotal ?? 0)
    : 0;

  const nota = useNotaConsultor(plan.clientId, "ps");

  const blocos: BlocoDoc[] = [];

  if (rs) {
    /* Resultado da Análise — espelha a ferramenta de seguros (v5) */
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

    blocos.push({
      chave: "necessidades",
      node: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {[
            { label: "Necessidades Imediatas", value: necessidadesImediatas },
            { label: "Necessidades Contínuas", value: necessidadesContinuas },
            { label: "Coberturas em Vida",     value: coberturasVida },
          ].map(({ label, value }) => (
            <div key={label} className="doc-card" style={{ background: "#F9FAFB", borderRadius: 6, padding: "7px 11px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 9, color: DOC.hint }}>{label}</p>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: DOC.texto }}>{formatCurrency(value)}</p>
            </div>
          ))}
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

    /* Composição das necessidades — rótulo + card fluem juntos */
    blocos.push({
      chave: "composicao",
      grudaNoProximo: true,
      node: <p style={LABEL_SUBSECAO()}>Composição das Necessidades</p>,
    });
    blocos.push({
      chave: "composicao-card",
      node: (
        <div className="doc-card" style={{ display: "grid", gridTemplateColumns: "155px 1fr", gap: 18, alignItems: "center", marginBottom: 16 }}>
          <DonutGap rs={rs} />
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: DOC.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 9px" }}>
              Necessidades vs Cobertura
            </p>
            <NeedBar
              label="Necessidades imediatas"
              need={rs.immediateTotal}
              coverage={rs.totalCoverage > rs.ongoingTotal ? rs.totalCoverage - rs.ongoingTotal : 0}
              total={rs.totalNeed}
            />
            <NeedBar
              label="Necessidades contínuas"
              need={rs.ongoingTotal}
              coverage={rs.totalCoverage > rs.immediateTotal ? rs.totalCoverage - rs.immediateTotal : 0}
              total={rs.totalNeed}
            />
            {(rs.inventoryCost > 0 || rs.educationTotal > 0) && (
              <div style={{ marginTop: 6, padding: "7px 11px", backgroundColor: "#F0F7FF", borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}>
                  <span style={{ color: DOC.muted }}>↳ Custo de inventário</span>
                  <span style={{ fontWeight: 600, color: DOC.ink }}>{formatCurrency(rs.inventoryCost)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5 }}>
                  <span style={{ color: DOC.muted }}>↳ Educação dos filhos</span>
                  <span style={{ fontWeight: 600, color: DOC.ink }}>{formatCurrency(rs.educationTotal)}</span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {[
                { label: "Coberto", cor: DOC.verde },
                { label: "Parcial", cor: "#3B82F6" },
                { label: "Necessário", cor: DOC.blueBorder },
              ].map(({ label, cor }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: DOC.muted }}>
                  <span style={{ width: 10, height: 5, borderRadius: 2, backgroundColor: cor }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    });

    // Coberturas em vida
    if (rs.disabilityTotal > 0 || rs.criticalIllnessTotal > 0) {
      blocos.push({
        chave: "coberturas-vida-label",
        grudaNoProximo: true,
        node: <p style={LABEL_SUBSECAO()}>Coberturas em Vida</p>,
      });
      blocos.push({
        chave: "coberturas-vida",
        node: (
          <div className="doc-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            {rs.disabilityTotal > 0 && (
              <CardCobertura
                titulo="Invalidez"
                total={rs.disabilityTotal}
                coberto={rs.disabilityCoverage}
                gap={rs.disabilityGap}
              />
            )}
            {rs.criticalIllnessTotal > 0 && (
              <CardCobertura
                titulo="Doença Grave"
                total={rs.criticalIllnessTotal}
                coberto={rs.criticalIllnessCoverage}
                gap={rs.criticalIllnessGap}
              />
            )}
          </div>
        ),
      });
    }
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

  // Narrativa (texto da referência v4 p.13) — um parágrafo por bloco
  const narrativa = [
    "No mercado financeiro, dedicamos grande parte do nosso tempo focados na rentabilidade e na multiplicação do capital. No entanto, a construção de um patrimônio sólido é um processo assimétrico: leva-se décadas para acumular riqueza, mas ela pode ser severamente dilapidada em questão de meses devido a eventos não planejados.",
    "O pilar de Proteção e Sucessão existe para garantir que o seu planejamento financeiro seja à prova de falhas. O nosso trabalho nesta etapa não é prever o futuro, mas assegurar que você, o seu fluxo de renda e a sua família estejam blindados financeiramente caso o inesperado aconteça.",
    "A blindagem pessoal é o mecanismo pelo qual transferimos os riscos financeiros e imprevisíveis da sua vida para instituições robustas (seguradoras), protegendo a liquidez dos seus investimentos.",
    "O planejamento sucessório aborda o que acontece com o seu patrimônio na sua ausência. Sem uma estrutura pré-definida, a transição de bens no Brasil é um processo burocrático, lento e extremamente custoso.",
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
