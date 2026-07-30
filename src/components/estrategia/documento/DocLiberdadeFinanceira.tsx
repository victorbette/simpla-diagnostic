import { useMemo, type CSSProperties } from "react";
import { formatCurrency } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import { calcularProjecaoIF, TAXA_ACUM_ANUAL, type PontoProjecao } from "@/lib/financialFreedomCalc";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";
import { CardProjecaoPatrimonial } from "@/components/shared/CardProjecaoPatrimonial";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

const fmtInteiro = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function DocLiberdadeFinanceira({ nomeCliente, plan, resultados }: Props) {
  const pi = plan.planejamentoIF;
  const rif = resultados.if;

  const nota = useNotaConsultor(plan.clientId, "lf");

  const projecaoData = useMemo((): { projecao: PontoProjecao[]; mesIF?: number } => {
    if (rif?.projecao && rif.projecao.length > 0) {
      return { projecao: rif.projecao, mesIF: rif.mesInicioRetirada };
    }
    if (!pi.rendaMensalDesejada || !pi.idadeMeta) return { projecao: [] };

    const parsed = parseDateNasc(plan.dadosCliente.dataNascimento);
    const anoNasc = parsed?.ano ?? (new Date().getFullYear() - (pi.idadeAtual || 35));
    const mesNasc = parsed?.mes ?? 1;
    const idadeAtual = parsed
      ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
      : (pi.idadeAtual || 35);

    if (pi.idadeMeta <= idadeAtual) return { projecao: [] };

    try {
      const result = calcularProjecaoIF({
        idadeAtual,
        idadeMeta: pi.idadeMeta,
        idadeMaxima: 90,
        patrimonioInicial: pi.patrimonioAtual,
        aporteMensal: pi.aporteMensal,
        rendaMensalDesejada: pi.rendaMensalDesejada,
        taxaRetornoAnual: TAXA_ACUM_ANUAL,
        anoNascimento: anoNasc,
        mesNascimento: mesNasc,
        objetivos: [],
      });
      return { projecao: result.projecao, mesIF: result.mesInicioRetirada };
    } catch {
      return { projecao: [] };
    }
  }, [rif, pi, plan.dadosCliente.dataNascimento]);

  const mesNascimento = parseDateNasc(plan.dadosCliente.dataNascimento)?.mes;

  const rendaDesejada = rif?.rendaMensalDesejada ?? pi.rendaMensalDesejada;
  const patrimonioNecessario = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const simplesIF = !rif && !projecaoData.projecao.length && pi.rendaMensalDesejada > 0
    ? calcularIF(pi) : null;
  const patrimonioNaIF = rif?.patrimonioAposentadoria
    ?? (projecaoData.mesIF !== undefined && projecaoData.mesIF < projecaoData.projecao.length
        ? (projecaoData.projecao[projecaoData.mesIF]?.patrimonio ?? 0)
        : (simplesIF?.patrimonioProjetado ?? 0));
  const rendaSustentavel = (patrimonioNaIF * 0.04) / 12;
  const aporteNecessario = rif?.aporteAjustado ?? rif?.aporteAtual ?? pi.aporteMensal;
  const aporteAtual = rif?.aporteAtual ?? pi.aporteMensal;
  const objetivos = rif?.objetivos ?? [];
  const temDados = patrimonioNecessario > 0 || projecaoData.projecao.length > 0;

  const metaAtingida = rendaDesejada > 0 && rendaSustentavel >= rendaDesejada;
  const aporteOk = aporteNecessario <= aporteAtual;

  const blocos: BlocoDoc[] = [
    {
      chave: "intro-1",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
          A estruturação da sua Liberdade Financeira é o pilar central do nosso planejamento. A
          importância desta etapa reside em transformar as suas expectativas de futuro em um mapa
          matemático claro e executável. Sem um destino financeiro definido e um diagnóstico preciso
          do seu custo de vida, a acumulação de capital perde eficiência. Nosso objetivo é garantir a
          gestão estratégica dos seus recursos hoje, estabelecendo metas reais para que você atinja a
          independência financeira com previsibilidade, segurança e controle absoluto sobre o seu
          tempo.
        </p>
      ),
    },
    {
      chave: "intro-2",
      node: (
        <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
          Com base no seu cenário atual, elaboramos uma projeção estratégica detalhada para
          viabilizar a sua transição para a liberdade financeira na idade alvo estipulada, garantindo
          uma renda mensal sustentável e protegida da perda de poder de compra:
        </p>
      ),
    },
    {
      chave: "metricas",
      node: temDados ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Patrimônio Necessário</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: DOC.blue, margin: 0 }}>
              {formatCurrency(patrimonioNecessario)}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>
              perpetuidade (regra dos 4%)
            </p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Projeção Atual</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: metaAtingida ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {formatCurrency(patrimonioNaIF)}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>na aposentadoria</p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Aporte Necessário</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: aporteOk ? DOC.verde : DOC.vermelho, margin: 0 }}>
              {aporteNecessario > 0 ? `${fmtInteiro.format(aporteNecessario)}/mês` : "Meta atingível"}
            </p>
            <p style={{ fontSize: 9.5, color: aporteOk ? DOC.verde : DOC.hint, margin: "3px 0 0" }}>
              {aporteOk
                ? "Aporte atual suficiente"
                : `Faltam ${fmtInteiro.format(aporteNecessario - aporteAtual)}/mês`}
              {objetivos.length > 0 && ` · inclui ${objetivos.length} objetivo(s) de vida`}
            </p>
          </div>

          <div className="doc-card" style={{ ...CARD, padding: "10px 14px" }}>
            <p style={LABEL_CARD}>Renda Sustentável</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: metaAtingida ? DOC.verde : DOC.ink, margin: 0 }}>
              {rendaSustentavel > 0 ? fmtInteiro.format(rendaSustentavel) : "—"}
            </p>
            <p style={{ fontSize: 9.5, color: DOC.hint, margin: "3px 0 0" }}>
              /mês com a projeção atual
            </p>
            {rendaDesejada > 0 && rendaSustentavel > 0 && (
              <p style={{ fontSize: 9.5, fontWeight: 600, color: metaAtingida ? DOC.verde : DOC.vermelho, margin: "3px 0 0" }}>
                {metaAtingida
                  ? `✓ Meta de ${fmtInteiro.format(rendaDesejada)}/mês atingida`
                  : `Meta: ${fmtInteiro.format(rendaDesejada)}/mês`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}`, marginBottom: 18 }}>
          <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
            Execute a simulação de Liberdade Financeira para ver as projeções detalhadas.
          </p>
        </div>
      ),
    },
    {
      chave: "grafico",
      node: projecaoData.projecao.length > 0 ? (
        <div
          className="no-page-break"
          style={{
            marginBottom: 4,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          } as CSSProperties}
        >
          <CardProjecaoPatrimonial
            projecao={projecaoData.projecao}
            patrimonioNecessario={patrimonioNecessario}
            mesIF={projecaoData.mesIF}
            mesNascimento={mesNascimento}
            objetivos={objetivos}
            height={260}
            interativo={false}
          />
        </div>
      ) : (
        <div style={{ ...CARD, background: DOC.blueSoft, border: `1px solid ${DOC.blueBorder}`, textAlign: "center", padding: "26px 20px" }}>
          <p style={{ ...TEXTO_CORPO, color: DOC.muted }}>
            Execute o simulador de Liberdade Financeira para ver o gráfico de projeção.
          </p>
        </div>
      ),
    },
  ];

  if (objetivos.length > 0) {
    blocos.push({
      chave: "objetivos",
      node: (
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
                <span style={{ flex: 1, fontSize: 12, color: DOC.ink, fontWeight: 500 }}>{obj.label}</span>
                <span style={{ fontSize: 11, color: DOC.muted }}>{String(obj.mes).padStart(2, "0")}/{obj.ano}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: DOC.blue }}>{formatCurrency(obj.valorBRL)}</span>
              </div>
            ))}
            {objetivos.length > 5 && (
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: DOC.hint }}>
                + {objetivos.length - 5} outros objetivos considerados na projeção
              </p>
            )}
          </div>
        </div>
      ),
    });
  }

  blocos.push(...blocosNotaConsultor(plan.clientId, "lf", nota));

  return <PaginaDocFluida titulo="Liberdade Financeira" nomeCliente={nomeCliente} blocos={blocos} />;
}
