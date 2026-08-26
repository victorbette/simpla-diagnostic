import type { Lead } from "../types";
import {
  calcularProjecaoIF,
  calcularPatrimonioPerpetuidade,
  type ProjecaoIFParams,
} from "@/lib/financialFreedomCalc";
import { CardProjecaoPatrimonial } from "@/components/shared/CardProjecaoPatrimonial";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";
import { calcularIdade } from "@/lib/parseDate";
import { TAXA_LF_PADRAO, taxaMensalDe } from "@/lib/taxasDiag";

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

  const idadeAtual = calcularIdade(dadosColeta.dataNascimento) || 30;

  const patrimonioInicial  = Number(dadosLF.patrimonioInicial  ?? dadosColeta.patrimonioFinanceiro)       || 0;
  const aporteMensal       = Number(dadosLF.aporteMensal       ?? dadosColeta.aporteMensal)               || 0;
  const rendaDesejada      = Number(dadosLF.rendaDesejada      ?? dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMeta          = Number(dadosLF.idadeAlvo          ?? dadosColeta.idadeMeta)                  || 0;
  const patrimonioNecessario = rendaDesejada > 0 ? calcularPatrimonioPerpetuidade(rendaDesejada) : 0;

  // ── Ajustes: mesma lógica da aba LF ──
  const dadosAjustes    = dadosLF.ajustes;
  const usarTaxaCustom  = dadosAjustes?.usarTaxaCustom ?? false;
  const taxaCustomAnual = dadosAjustes?.taxaCustomAnual ?? 6.0;

  const TAXA_ANUAL  = usarTaxaCustom ? Math.max(3, taxaCustomAnual) / 100 : TAXA_LF_PADRAO;
  const TAXA_MENSAL = taxaMensalDe(TAXA_ANUAL);
  const taxaLabel = usarTaxaCustom
    ? `IPCA + ${taxaCustomAnual.toFixed(2).replace(".", ",")}%`
    : "IPCA + 6,00%";

  const nMesesBase = Math.max(1, Math.round((idadeMeta - idadeAtual) * 12));

  const calcularProjecao = (): number => {
    const f = Math.pow(1 + TAXA_MENSAL, nMesesBase);
    return patrimonioInicial * f + aporteMensal * (f - 1) / TAXA_MENSAL;
  };

  const projecaoNaIF     = Math.max(0, Math.round(calcularProjecao()));
  const rendaSustentavel = (projecaoNaIF * 0.04) / 12;

  const projecaoParams: ProjecaoIFParams = {
    idadeAtual,
    idadeMeta,
    idadeMaxima: 100,
    patrimonioInicial,
    aporteMensal,
    rendaMensalDesejada: rendaDesejada,
    taxaRetornoAnual: TAXA_ANUAL,
    anoNascimento,
    mesNascimento,
    objetivos: [],
  };

  let result: ReturnType<typeof calcularProjecaoIF> | null = null;
  try { result = calcularProjecaoIF(projecaoParams); } catch { /* sem dados suficientes */ }

  const mesIF = result
    ? result.mesInicioRetirada
    : nMesesBase;

  const projecaoGrafico = result?.projecao ?? [];

  const lfTemDados = patrimonioNecessario > 0 && idadeAtual > 0 && idadeMeta > 0 && idadeMeta > idadeAtual;

  const temFilhos = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;

  // Aporte necessário calculado com a mesma taxa e parâmetros do gráfico (TAXA_MENSAL / nMesesBase)
  const aporteIdealCalc = (() => {
    if (nMesesBase <= 0 || patrimonioNecessario <= 0) return 0;
    const fA = Math.pow(1 + TAXA_MENSAL, nMesesBase);
    if (!isFinite(fA) || fA <= 1) return 0;
    if (patrimonioInicial * fA >= patrimonioNecessario) return 0;
    return Math.ceil((patrimonioNecessario - patrimonioInicial * fA) * TAXA_MENSAL / (fA - 1));
  })();

  function gerarTextoLF(): string {
    if (!lfTemDados) {
      return `Para uma análise completa de Liberdade Financeira, precisamos dos dados na Situação Atual: patrimônio financeiro, aporte mensal, renda desejada na aposentadoria e idade planejada para se aposentar.`;
    }

    const pct = patrimonioNecessario > 0 ? Math.round(projecaoNaIF / patrimonioNecessario * 100) : 0;
    const anosRestantes = idadeMeta - idadeAtual;
    const atingeMeta = projecaoNaIF >= patrimonioNecessario;

    if (atingeMeta) {
      let t = `${nome}, com ${formatBRL(patrimonioInicial)} de patrimônio e ${formatBRL(aporteMensal)}/mês de aporte, a projeção indica ${formatBRL(projecaoNaIF)} aos ${idadeMeta} anos — suficiente para gerar ${formatBRL(rendaSustentavel)}/mês de forma sustentável. Sua meta de ${formatBRL(rendaDesejada)}/mês está dentro do alcance com a trajetória atual.`;
      t += `\n\nEsse resultado coloca você em uma posição que a maioria das pessoas nunca alcança — mas chegar é só metade do trabalho. Uma carteira mal posicionada ou uma rentabilidade abaixo do potencial por alguns anos pode comprometer o que levou décadas para construir.${temFilhos ? ` Cada ponto percentual a mais de rentabilidade tem impacto exponencial no legado que você constrói para seus filhos.` : ""}`;
      t += `\n\nA análise de sensibilidade abaixo mostra como variações no aporte ou no prazo impactam o resultado. O objetivo não é apenas chegar à meta — é chegar com folga e com a estrutura certa para se manter lá.`;
      return t;
    }

    const diferencaRenda = rendaDesejada > rendaSustentavel ? rendaDesejada - rendaSustentavel : 0;
    const rendaSustStr = rendaSustentavel > 0 ? `${formatBRL(rendaSustentavel)}/mês` : "abaixo do necessário";

    let texto = `${nome}, com ${formatBRL(patrimonioInicial)} de patrimônio e ${formatBRL(aporteMensal)}/mês de aporte, a projeção indica ${formatBRL(projecaoNaIF)} aos ${idadeMeta} anos — ${pct}% do necessário. Seu patrimônio geraria ${rendaSustStr} de forma sustentável${diferencaRenda > 0 ? `, ${formatBRL(diferencaRenda)}/mês abaixo da meta de ${formatBRL(rendaDesejada)}` : ""}. Fechar essa diferença exigiria ${formatBRL(aporteIdealCalc)}/mês${aporteIdealCalc > aporteMensal ? ` — ${formatBRL(aporteIdealCalc - aporteMensal)}/mês a mais do ritmo atual` : ""}.`;

    texto += `\n\nAporte não é o único caminho: uma carteira mais eficiente pode aumentar a rentabilidade real e encurtar essa distância sem necessariamente investir mais. A análise de sensibilidade abaixo mostra que cada ano de atraso aumenta o esforço de forma desproporcional — ${anosRestantes <= 15 ? `com ${anosRestantes} anos até a aposentadoria, a janela existe, mas se fecha mais rápido do que parece` : `você tem ${anosRestantes} anos para mudar o cenário de forma significativa, mas não tempo infinito`}.`;

    if (temFilhos) {
      texto += `\n\nSeus filhos são parte do que está sendo construído aqui. Cada ajuste feito hoje não é só sobre a sua aposentadoria — é sobre a estabilidade e o legado que você deixa para eles.`;
    }

    return texto;
  }

  // ── Análise de Sensibilidade — mesmos parâmetros da aba LF ──
  const calcularFV = (nMeses: number, aporteC: number): number => {
    const f = Math.pow(1 + TAXA_MENSAL, nMeses);
    return patrimonioInicial * f + aporteC * (f - 1) / TAXA_MENSAL;
  };

  const cenariosAporte = [-40, -20, 0, 20, 40].map(pctVariacao => {
    const aporteC = Math.max(0, aporteMensal * (1 + pctVariacao / 100));
    const fv = calcularFV(nMesesBase, aporteC);
    const pctMeta = patrimonioNecessario > 0
      ? Math.min(100, Math.round(fv / patrimonioNecessario * 100)) : 0;
    return { pctVariacao, aporteC, pctMeta };
  });

  const cenariosIdade = [-5, -2, 0, 2, 5].map(delta => {
    const idadeC = Math.max(idadeAtual + 1, idadeMeta + delta);
    const n = Math.max(1, Math.round((idadeC - idadeAtual) * 12));
    const fv = calcularFV(n, aporteMensal);
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
        textAlign: "justify" as const,
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
            projecao={projecaoGrafico}
            objetivos={[]}
            height={260}
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
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
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
        <div style={{ fontSize: 8, color: "#9CA3AF", textAlign: "right" as const, marginBottom: 10 }}>
          Taxa de retorno: {taxaLabel}
        </div>
      </>
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
