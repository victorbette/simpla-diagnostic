import type { Lead } from "../types";
import {
  calcularProjecaoIF,
  calcularPatrimonioPerpetuidade,
  type ProjecaoIFParams,
} from "@/lib/financialFreedomCalc";
import { CardProjecaoPatrimonial } from "@/components/shared/CardProjecaoPatrimonial";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

const TAXA_ANUAL_DIAG = 0.045;
const TAXA_MENSAL_DIAG = Math.pow(1 + TAXA_ANUAL_DIAG, 1 / 12) - 1;

function corMeta(pct: number): string {
  return pct >= 91 ? "#15803D" : pct >= 51 ? "#B45309" : "#B91C1C";
}

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Props { lead: Lead; }

export function DocLFDiag({ lead }: Props) {
  const { dadosColeta, dadosLF } = lead;
  const nome = lead.nome.split(" ")[0];

  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const anoNascimento = parsed?.ano ?? (new Date().getFullYear() - 30);
  const mesNascimento = parsed?.mes ?? 1;

  const idadeAtual = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30;

  const patrimonioInicial  = Number(dadosLF.patrimonioInicial  ?? dadosColeta.patrimonioFinanceiro)       || 0;
  const aporteMensal       = Number(dadosLF.aporteMensal       ?? dadosColeta.aporteMensal)               || 0;
  const rendaDesejada      = Number(dadosLF.rendaDesejada      ?? dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMeta          = Number(dadosLF.idadeAlvo          ?? dadosColeta.idadeMeta)                  || 60;
  const patrimonioNecessario = rendaDesejada > 0 ? calcularPatrimonioPerpetuidade(rendaDesejada) : 0;

  const projecaoParams: ProjecaoIFParams = {
    idadeAtual,
    idadeMeta,
    idadeMaxima: 100,
    patrimonioInicial,
    aporteMensal,
    rendaMensalDesejada: rendaDesejada,
    taxaRetornoAnual: TAXA_ANUAL_DIAG,
    anoNascimento,
    mesNascimento,
    objetivos: [],
  };

  let result: ReturnType<typeof calcularProjecaoIF> | null = null;
  try { result = calcularProjecaoIF(projecaoParams); } catch { /* sem dados suficientes */ }

  const projecaoNaIF     = result ? result.patrimonioNaIF : 0;
  const rendaSustentavel = result ? (result.patrimonioNaIF * 0.04) / 12 : 0;
  const mesIF = result
    ? result.mesInicioRetirada
    : Math.max(1, Math.round((idadeMeta - idadeAtual) * 12));

  const lfTemDados = patrimonioNecessario > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;

  // ── Variáveis para o texto comparativo (situação atual vs ideal) ──
  const patrimonioAtual = Number(dadosColeta.patrimonioFinanceiro) || 0;
  const aporteAtual = Number(dadosColeta.aporteMensal) || 0;
  const rendaAtualColeta = Number(dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMetaColeta = Number(dadosColeta.idadeMeta) || 60;
  const idadeAtualColeta = dadosColeta.dataNascimento
    ? Math.floor((Date.now() - new Date(dadosColeta.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;
  const TAXA_MENSAL_TEXTO = Math.pow(1.04, 1 / 12) - 1;
  const nMesesTexto = Math.max(0, Math.round((idadeMetaColeta - idadeAtualColeta) * 12));
  const fTexto = Math.pow(1 + TAXA_MENSAL_TEXTO, nMesesTexto);
  const projecaoAtual = nMesesTexto > 0 && isFinite(fTexto)
    ? patrimonioAtual * fTexto + aporteAtual * (fTexto - 1) / TAXA_MENSAL_TEXTO
    : patrimonioAtual;
  const patrimonioNecTexto = rendaAtualColeta > 0 ? (rendaAtualColeta * 12) / 0.04 : 0;
  const aporteIdeal = Number(dadosLF.aporteMensal) || 0;
  const temFilhos = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;
  const lfTemDadosTexto = patrimonioNecTexto > 0 && idadeAtualColeta > 0 && idadeMetaColeta > idadeAtualColeta;

  function gerarTextoLF(): string {
    if (!lfTemDadosTexto) {
      return `Para comparar a situação atual com o cenário ideal de aposentadoria, precisamos dos dados completos na Situação Atual: patrimônio, aporte mensal, renda desejada e idade de aposentadoria.`;
    }

    const pctAtual = Math.round(projecaoAtual / patrimonioNecTexto * 100);
    const anosRestantes = idadeMetaColeta - idadeAtualColeta;
    const diferencaAporte = aporteIdeal - aporteAtual;

    if (projecaoAtual >= patrimonioNecTexto) {
      return `${nome}, a análise do cenário atual mostra uma situação muito positiva: com o ritmo atual de investimentos, a projeção indica que você chegará à aposentadoria com patrimônio suficiente para gerar a renda desejada para sempre.\n\nIsso não significa que não há nada a fazer — significa que você tem uma base sólida para otimizar. A diferença entre uma carteira bem estruturada e uma carteira apenas suficiente pode representar anos a mais de liberdade,${temFilhos ? " uma herança significativa para os seus filhos," : ""} e muito mais tranquilidade diante das oscilações da vida.\n\nNa aba de Liberdade Financeira, calculamos o cenário ideal com ajustes estratégicos que podem acelerar essa jornada e aumentar a margem de segurança. O objetivo não é apenas chegar — é chegar com folga.`;
    }

    let texto = `${nome}, a comparação entre o cenário atual e o ideal revela algo importante que precisa ser endereçado.\n\nCom o ritmo atual — patrimônio acumulado e aporte mensal de hoje — a projeção indica que você chegará à aposentadoria com ${pctAtual}% do patrimônio necessário para gerar a renda que deseja. Isso significa que, sem mudanças, a aposentadoria virá com restrições que você não planejou.`;

    if (aporteIdeal > 0 && diferencaAporte > 0) {
      texto += `\n\nNa análise da Liberdade Financeira, calculamos o que seria necessário para fechar essa lacuna: um aporte mensal de ${aporteIdeal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} — uma diferença de ${diferencaAporte.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} em relação ao que é investido hoje. Esse ajuste, feito agora, tem um impacto completamente diferente do que o mesmo ajuste feito daqui a 5 ou 10 anos.`;
    } else if (aporteIdeal > 0 && diferencaAporte <= 0) {
      texto += `\n\nA análise da Liberdade Financeira confirmou que o aporte atual está adequado. O foco agora é a eficiência: garantir que cada real investido está na melhor alocação possível para maximizar o retorno ao longo do tempo.`;
    } else {
      texto += `\n\nNa aba de Liberdade Financeira, simulamos diferentes cenários e identificamos os ajustes necessários para fechar essa lacuna. O caminho existe — o que faz a diferença é quando a decisão de seguir esse caminho é tomada.`;
    }

    texto += `\n\nO tempo é o ativo mais valioso nos investimentos — e ele trabalha de forma desproporcional: cada ano de atraso exige um esforço muito maior para compensar.${
      anosRestantes <= 15
        ? ` Com ${anosRestantes} anos até a aposentadoria planejada, o momento de agir é agora.`
        : ` Você ainda tem ${anosRestantes} anos — tempo suficiente para mudar o cenário de forma significativa, mas não tempo infinito.`
    }${
      temFilhos
        ? `\n\nOs seus filhos são parte do futuro que você está construindo. Cada decisão financeira tomada hoje molda o legado que você vai deixar para eles.`
        : ""
    }`;

    return texto;
  }

  // ── Análise de Sensibilidade ──
  const nMesesBase = Math.max(1, Math.round((idadeMeta - idadeAtual) * 12));

  const cenariosAporte = [-40, -20, 0, 20, 40].map(pctVariacao => {
    const aporteC = Math.max(0, aporteMensal * (1 + pctVariacao / 100));
    const f = Math.pow(1 + TAXA_MENSAL_DIAG, nMesesBase);
    const fv = patrimonioInicial * f + aporteC * (f - 1) / TAXA_MENSAL_DIAG;
    const pctMeta = patrimonioNecessario > 0
      ? Math.min(100, Math.round(fv / patrimonioNecessario * 100)) : 0;
    return { pctVariacao, aporteC, pctMeta };
  });

  const cenariosIdade = [-5, -2, 0, 2, 5].map(delta => {
    const idadeC = Math.max(idadeAtual + 1, idadeMeta + delta);
    const n = Math.max(1, Math.round((idadeC - idadeAtual) * 12));
    const f = Math.pow(1 + TAXA_MENSAL_DIAG, n);
    const fv = patrimonioInicial * f + aporteMensal * (f - 1) / TAXA_MENSAL_DIAG;
    const pctMeta = patrimonioNecessario > 0
      ? Math.min(100, Math.round(fv / patrimonioNecessario * 100)) : 0;
    return { delta, idadeC, pctMeta };
  });

  const blocos: BlocoDoc[] = [];

  blocos.push({
    chave: "texto",
    grudaNoProximo: result !== null,
    node: (
      <p style={{
        fontSize: 12, color: "#374151", lineHeight: 2,
        margin: "0 0 16px", whiteSpace: "pre-line" as const,
      }}>
        {gerarTextoLF()}
      </p>
    ),
  });

  if (result) {
    blocos.push({
      chave: "grafico",
      grudaNoProximo: true,
      node: (
        <div style={{ marginBottom: 10 }}>
          <CardProjecaoPatrimonial
            projecao={result.projecao}
            objetivos={[]}
            height={180}
            mesIF={mesIF}
            mesNascimento={mesNascimento}
            patrimonioNecessario={patrimonioNecessario}
            interativo={false}
          />
        </div>
      ),
    });
  }

  blocos.push({
    chave: "cards",
    grudaNoProximo: lfTemDados,
    node: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
            Projeção Atual
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: projecaoNaIF >= patrimonioNecessario && projecaoNaIF > 0 ? "#15803D" : "#111827" }}>
            {formatBRL(projecaoNaIF)}
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>Aos {idadeMeta} anos</div>
        </div>

        <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
            Renda Sustentável
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: rendaSustentavel >= rendaDesejada && rendaSustentavel > 0 ? "#15803D" : "#111827" }}>
            {rendaSustentavel > 0 ? `${formatBRL(rendaSustentavel)}/mês` : "—"}
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>Com a projeção atual</div>
        </div>
      </div>
    ),
  });

  if (lfTemDados) {
    blocos.push({
      chave: "sensibilidade",
      node: (
        <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            Análise de Sensibilidade
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                Variando Aporte
              </div>
              {cenariosAporte.map(c => (
                <div key={c.pctVariacao} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "3px 6px", borderBottom: "0.5px solid #F3F4F6",
                  background: c.pctVariacao === 0 ? "#F8FAFF" : "transparent",
                  borderRadius: c.pctVariacao === 0 ? 4 : 0,
                }}>
                  <span style={{ fontSize: 10, color: "#374151" }}>
                    {c.pctVariacao === 0 ? "Atual" : c.pctVariacao > 0 ? `+${c.pctVariacao}%` : `${c.pctVariacao}%`}
                    {" "}<span style={{ color: "#9CA3AF", fontSize: 9 }}>({formatBRL(c.aporteC)}/mês)</span>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: corMeta(c.pctMeta) }}>
                    {c.pctMeta}% da meta
                  </span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                Variando Prazo
              </div>
              {cenariosIdade.map(c => (
                <div key={c.delta} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "3px 6px", borderBottom: "0.5px solid #F3F4F6",
                  background: c.delta === 0 ? "#F8FAFF" : "transparent",
                  borderRadius: c.delta === 0 ? 4 : 0,
                }}>
                  <span style={{ fontSize: 10, color: "#374151" }}>
                    {c.delta === 0 ? "Atual" : c.delta > 0 ? `+${c.delta} anos` : `${c.delta} anos`}
                    {" "}<span style={{ color: "#9CA3AF", fontSize: 9 }}>({c.idadeC} anos)</span>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: corMeta(c.pctMeta) }}>
                    {c.pctMeta}% da meta
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      ),
    });
  }

  return (
    <PaginaDocFluidaDiag
      titulo="Liberdade Financeira"
      nomeCliente={lead.nome}
      blocos={blocos}
    />
  );
}
