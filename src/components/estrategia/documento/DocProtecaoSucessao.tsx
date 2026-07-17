import { PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia, ResultadoSeguro } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

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

/** Página "Proteção e Sucessão" — resultado da análise de seguros + narrativa (v4 p.13) */
export function DocProtecaoSucessao({ nomeCliente, plan, resultados }: Props) {
  const rs = resultados.seguro;
  const capitalNecessario = rs?.capitalNecessario ?? rs?.totalNeed ?? 0;
  const capitalSegurado = rs?.capitalAtual ?? rs?.totalCoverage ?? 0;
  const gap = rs?.gap ?? Math.max(0, capitalNecessario - capitalSegurado);

  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Proteção e Sucessão" />

      {rs ? (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div className="doc-card" style={{ ...CARD, padding: "10px 14px", background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}` }}>
              <p style={LABEL_CARD}>Capital Necessário</p>
              <p style={{ fontSize: 14.5, fontWeight: 700, color: DOC.navy, margin: 0 }}>{formatCurrency(capitalNecessario)}</p>
            </div>
            <div className="doc-card" style={{ ...CARD, padding: "10px 14px", background: DOC.verdeBg, border: "1px solid #BBF7D0" }}>
              <p style={LABEL_CARD}>Capital Segurado</p>
              <p style={{ fontSize: 14.5, fontWeight: 700, color: DOC.verde, margin: 0 }}>{formatCurrency(capitalSegurado)}</p>
            </div>
            <div className="doc-card" style={{ ...CARD, padding: "10px 14px", background: DOC.vermelhoBg, border: "1px solid #FECACA" }}>
              <p style={LABEL_CARD}>Gap de Cobertura</p>
              <p style={{ fontSize: 14.5, fontWeight: 700, color: DOC.vermelho, margin: 0 }}>{formatCurrency(gap)}</p>
            </div>
          </div>

          {/* Composição das necessidades */}
          <p style={LABEL_SUBSECAO()}>Composição das Necessidades</p>
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

          {/* Coberturas em vida */}
          {(rs.disabilityTotal > 0 || rs.criticalIllnessTotal > 0) && (
            <>
              <p style={LABEL_SUBSECAO()}>Coberturas em Vida</p>
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
            </>
          )}
        </>
      ) : (
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
      )}

      {/* Narrativa (texto da referência v4 p.13) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ ...TEXTO_CORPO, fontSize: 12.5 }}>
          No mercado financeiro, dedicamos grande parte do nosso tempo focados na rentabilidade e
          na multiplicação do capital. No entanto, a construção de um patrimônio sólido é um
          processo assimétrico: leva-se décadas para acumular riqueza, mas ela pode ser severamente
          dilapidada em questão de meses devido a eventos não planejados.
        </p>
        <p style={{ ...TEXTO_CORPO, fontSize: 12.5 }}>
          O pilar de Proteção e Sucessão existe para garantir que o seu planejamento financeiro
          seja à prova de falhas. O nosso trabalho nesta etapa não é prever o futuro, mas assegurar
          que você, o seu fluxo de renda e a sua família estejam blindados financeiramente caso o
          inesperado aconteça.
        </p>
        <p style={{ ...TEXTO_CORPO, fontSize: 12.5 }}>
          A blindagem pessoal é o mecanismo pelo qual transferimos os riscos financeiros e
          imprevisíveis da sua vida para instituições robustas (seguradoras), protegendo a liquidez
          dos seus investimentos.
        </p>
        <p style={{ ...TEXTO_CORPO, fontSize: 12.5 }}>
          O planejamento sucessório aborda o que acontece com o seu patrimônio na sua ausência. Sem
          uma estrutura pré-definida, a transição de bens no Brasil é um processo burocrático,
          lento e extremamente custoso.
        </p>
        <p style={{ ...TEXTO_CORPO, fontSize: 12.5 }}>
          Esse plano garante que as turbulências da vida não destruam o que você levou uma vida
          inteira para construir. É a tranquilidade de saber que, não importa o cenário, a sua
          dignidade e o bem-estar daqueles que você mais ama estão absolutamente garantidos.
        </p>
      </div>

      <CalloutConsultor clientId={plan.clientId} secao="ps" />
    </PaginaDoc>
  );
}
