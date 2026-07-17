import { formatCurrency } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GraficoIF } from "@/components/shared/GraficoIF";
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

/** Formata a taxa real anual como "IPCA+X%" sem zeros à direita */
function formatTaxa(taxaDecimal: number): string {
  const pct = taxaDecimal * 100;
  const texto = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace(".", ",");
  return `IPCA+${texto}%`;
}

export function DocLiberdadeFinanceira({ nomeCliente, plan, resultados }: Props) {
  const pi = plan.planejamentoIF;
  const rif = resultados.if;

  const simplesIF = !rif && pi.rendaMensalDesejada > 0 ? calcularIF(pi) : null;
  const patrimonioNecessario = rif?.patrimonioNecessario ?? simplesIF?.patrimonioNecessario ?? 0;
  const patrimonioNaIF = rif?.patrimonioAposentadoria ?? simplesIF?.patrimonioProjetado ?? 0;
  const rendaSustentavel = rif?.rendaSustentavel ?? 0;
  const aporteNecessario = rif?.aporteAjustado ?? rif?.aporteAtual ?? pi.aporteMensal;
  const idadeMeta = rif?.idadeMeta ?? pi.idadeMeta;
  const taxaRetorno = rif?.taxaRetorno ?? (pi.taxaRetornoAnual ?? 0) / 100;
  const objetivos = rif?.objetivos ?? [];
  const temDados = patrimonioNecessario > 0 || rif !== null;

  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Liberdade Financeira" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        A estruturação da sua Liberdade Financeira é o pilar central do nosso planejamento. A
        importância desta etapa reside em transformar as suas expectativas de futuro em um mapa
        matemático claro e executável. Sem um destino financeiro definido e um diagnóstico preciso
        do seu custo de vida, a acumulação de capital perde eficiência. Nosso objetivo é garantir a
        gestão estratégica dos seus recursos hoje, estabelecendo metas reais para que você atinja a
        independência financeira com previsibilidade, segurança e controle absoluto sobre o seu
        tempo.
      </p>

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
        Com base no seu cenário atual, elaboramos uma projeção estratégica detalhada para
        viabilizar a sua transição para a liberdade financeira na idade alvo estipulada, garantindo
        uma renda mensal sustentável e protegida da perda de poder de compra:{" "}
        <strong style={{ color: DOC.ink }}>
          Aporte {formatCurrency(aporteNecessario)} / Data da Aposentadoria {idadeMeta} anos / Taxa
          Necessária {formatTaxa(taxaRetorno)}
        </strong>
      </p>

      {temDados ? (
        <>
          {/* Métricas principais */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div className="doc-card" style={{ ...CARD, background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}` }}>
              <p style={LABEL_CARD}>Patrimônio na LF</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: DOC.blue, margin: 0 }}>
                {formatCurrency(patrimonioNaIF)}
              </p>
            </div>
            <div className="doc-card" style={{ ...CARD, background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}` }}>
              <p style={LABEL_CARD}>Renda Sustentável</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: DOC.verde, margin: 0 }}>
                {rendaSustentavel > 0 ? `${formatCurrency(rendaSustentavel)}/mês` : "—"}
              </p>
            </div>
          </div>
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
            Execute a simulação de Liberdade Financeira para ver as projeções detalhadas.
          </p>
        </div>
      )}

      {/* Projeção patrimonial */}
      {rif?.projecao && rif.projecao.length > 0 ? (
        <div style={{ marginBottom: 4 }}>
          <div
            className="doc-card"
            style={{
              background: "#FBFCFE",
              border: `1px solid ${DOC.linha}`,
              borderRadius: 10,
              padding: "10px 8px 4px",
              overflow: "hidden",
            }}
          >
            <GraficoIF
              projecao={rif.projecao}
              objetivos={objetivos}
              height={205}
              mesIF={rif.mesInicioRetirada}
              interativo={false}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            ...CARD,
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
            textAlign: "center",
            padding: "26px 20px",
          }}
        >
          <p style={{ ...TEXTO_CORPO, color: DOC.muted }}>
            Execute o simulador de Liberdade Financeira para ver o gráfico de projeção.
          </p>
        </div>
      )}

      {/* Objetivos de vida */}
      {objetivos.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={LABEL_SUBSECAO()}>Objetivos de Vida</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {objetivos.slice(0, 5).map((obj) => (
              <div
                key={obj.id}
                className="doc-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 14px",
                  background: "white",
                  borderRadius: 7,
                  border: `1px solid ${DOC.linha}`,
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: DOC.ink, fontWeight: 500 }}>
                  {obj.label}
                </span>
                <span style={{ fontSize: 11, color: DOC.muted }}>
                  {String(obj.mes).padStart(2, "0")}/{obj.ano}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: DOC.blue }}>
                  {formatCurrency(obj.valorBRL)}
                </span>
              </div>
            ))}
            {objetivos.length > 5 && (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: DOC.hint }}>
                + {objetivos.length - 5} outros objetivos considerados na projeção
              </p>
            )}
          </div>
        </div>
      )}

      <CalloutConsultor clientId={plan.clientId} secao="lf" />
    </PaginaDoc>
  );
}
