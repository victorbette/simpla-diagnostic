import { formatCurrency } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { GraficoIF } from "@/components/shared/GraficoIF";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, VALOR_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

function CardMetrica({
  label,
  valor,
  sub,
  cor,
}: {
  label: string;
  valor: string;
  sub?: string;
  cor?: string;
}) {
  return (
    <div className="doc-card" style={CARD}>
      <p style={LABEL_CARD}>{label}</p>
      <p style={{ ...VALOR_CARD, color: cor ?? DOC.ink }}>{valor}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 10.5, color: DOC.hint }}>{sub}</p>}
    </div>
  );
}

export function DocLiberdadeFinanceira({ nomeCliente, plan, resultados }: Props) {
  const primeiroNome = nomeCliente.split(" ")[0];
  const pi = plan.planejamentoIF;
  const rif = resultados.if;

  const simplesIF = !rif && pi.rendaMensalDesejada > 0 ? calcularIF(pi) : null;
  const patrimonioNecessario = rif?.patrimonioNecessario ?? simplesIF?.patrimonioNecessario ?? 0;
  const patrimonioNaIF = rif?.patrimonioAposentadoria ?? simplesIF?.patrimonioProjetado ?? 0;
  const rendaSustentavel = rif?.rendaSustentavel ?? 0;
  const gapRenda = rif?.gapRenda ?? 0;
  const aporteAtual = rif?.aporteAtual ?? pi.aporteMensal;
  const aporteNecessario = rif?.aporteAjustado ?? aporteAtual;
  const rendaDesejada = rif?.rendaMensalDesejada ?? pi.rendaMensalDesejada;
  const idadeMeta = rif?.idadeMeta ?? pi.idadeMeta;
  const objetivos = rif?.objetivos ?? [];
  const temDados = patrimonioNecessario > 0 || rif !== null;

  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.lf} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Liberdade Financeira" />

      <p style={{ ...TEXTO_CORPO, marginBottom: 20 }}>
        <strong>{primeiroNome}</strong>, com base na sua situação atual e objetivos, elaboramos uma
        projeção para que você alcance a liberdade financeira aos <strong>{idadeMeta} anos</strong>
        {rendaDesejada > 0
          ? <>, com uma renda mensal sustentável de <strong>{formatCurrency(rendaDesejada)}</strong>.</>
          : "."}
      </p>

      {temDados ? (
        <>
          {/* Métricas principais */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <CardMetrica label="Patrimônio na IF" valor={formatCurrency(patrimonioNaIF)} />
            <CardMetrica
              label="Patrimônio Necessário"
              valor={formatCurrency(patrimonioNecessario)}
              sub="regra dos 4%"
              cor={DOC.blue}
            />
            {rif && (
              <>
                <CardMetrica
                  label="Renda Sustentável"
                  valor={`${formatCurrency(rendaSustentavel)}/mês`}
                  cor={DOC.verde}
                />
                <CardMetrica
                  label="Gap de Renda"
                  valor={gapRenda > 0 ? `${formatCurrency(gapRenda)}/mês` : "Sem gap"}
                  cor={gapRenda > 0 ? DOC.vermelho : DOC.verde}
                />
              </>
            )}
          </div>

          {/* Aporte necessário */}
          <div
            className="doc-card"
            style={{
              ...CARD,
              border: `1px solid ${DOC.blueBorder}`,
              borderTop: `3px solid ${DOC.navy}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div>
              <p style={LABEL_CARD}>Aporte Necessário</p>
              <p style={{ ...VALOR_CARD, fontSize: 22, color: DOC.navy }}>
                {formatCurrency(aporteNecessario)}
                <span style={{ fontSize: 12, fontWeight: 500, color: DOC.muted }}>/mês</span>
              </p>
            </div>
            <span
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                background: aporteNecessario > aporteAtual ? DOC.vermelhoBg : DOC.verdeBg,
                color: aporteNecessario > aporteAtual ? DOC.vermelho : DOC.verde,
                fontSize: 12.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Atual: {formatCurrency(aporteAtual)}
            </span>
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
          <p style={LABEL_SUBSECAO()}>Simulação de Liberdade Financeira</p>
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
              curvaIdeal={rif.curvaIdeal}
              objetivos={objetivos}
              height={205}
              mesNascimento={rif.mesNascimento}
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
            {objetivos.slice(0, 4).map((obj) => (
              <div
                key={obj.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 14px",
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
                <span style={{ fontSize: 12, fontWeight: 700, color: DOC.navy }}>
                  {formatCurrency(obj.valorBRL)}
                </span>
              </div>
            ))}
            {objetivos.length > 4 && (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: DOC.hint }}>
                + {objetivos.length - 4} outros objetivos considerados na projeção
              </p>
            )}
          </div>
        </div>
      )}

      <CalloutConsultor clientId={plan.clientId} secao="lf" />
    </PaginaDoc>
  );
}
