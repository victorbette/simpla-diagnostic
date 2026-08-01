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
  const pct = lfTemDados && patrimonioNecessario > 0
    ? Math.min(100, Math.round(projecaoNaIF / patrimonioNecessario * 100))
    : 0;

  function gerarTextoLF(): string {
    if (!lfTemDados) {
      return "A liberdade financeira começa com clareza — e clareza começa com números.\n\nA maioria das pessoas passa a vida trabalhando sem saber exatamente para quê: quanto precisa acumular para parar quando quiser, viajar sem culpa, dar a melhor educação para os filhos ou simplesmente acordar de manhã sem a pressão de ter que trabalhar por necessidade.\n\nEssa falta de clareza não é inocente — ela tem um custo enorme. Cada ano sem um plano definido é um ano em que os juros compostos poderiam estar trabalhando a seu favor, mas não estão. Complete os seus dados e descubra onde você realmente está e o que precisa mudar para construir a vida que você imagina para a sua família.";
    }
    if (pct <= 30) {
      return `${nome}, este número precisa ser dito com clareza: a trajetória atual coloca você em uma situação de risco real no longo prazo.\n\nPense nos projetos que você tem para a sua família — a escola dos filhos, a casa própria, as viagens que ainda não fez, a aposentadoria tranquila que imagina para você e para quem você ama. Tudo isso depende de um patrimônio que, com o ritmo atual, chegará a apenas ${pct}% do necessário. Isso significa escolhas dolorosas no futuro: abrir mão de projetos, reduzir o padrão de vida ou continuar trabalhando por obrigação muito além do que desejaria.\n\nO que dói mais não é a realidade dos números — é saber que isso ainda pode ser mudado, mas que cada mês de atraso torna a mudança mais difícil e mais cara. O tempo nos investimentos é insubstituível. Quem começa a agir hoje, mesmo com pequenos ajustes, tem uma vantagem enorme sobre quem decide esperar o "momento certo" — que raramente chega sozinho.\n\nVocê ainda tem tempo de reescrever esse cenário. Mas essa decisão precisa ser tomada agora — não amanhã, não no próximo mês. Agora.`;
    }
    if (pct <= 50) {
      return `${nome}, sua projeção atual cobre ${pct}% da renda que você imaginou ter na aposentadoria. Esse número tem um significado concreto: sem mudanças, você chegará nessa fase com menos da metade do que precisa para viver com o padrão que deseja — e isso se traduz em escolhas que você não quer fazer.\n\nPense nos sonhos que você tem para a sua família. A viagem que sempre adiou. A faculdade dos filhos em uma boa instituição. A possibilidade de se aposentar quando quiser, não quando for obrigado. Todos esses projetos têm um preço — e esse preço precisa estar no plano.\n\nA boa notícia é que você está em um momento em que ainda é possível mudar de forma significativa. Mas a janela vai se fechando. Cada ano que passa sem uma estratégia clara aumenta o esforço necessário para chegar ao mesmo resultado — e reduz as opções disponíveis.\n\nUma estratégia bem estruturada pode acelerar essa jornada de forma surpreendente. Pequenos ajustes no valor investido, na rentabilidade da carteira ou na forma como o patrimônio está alocado podem fazer uma diferença enorme em 10 ou 15 anos. O caminho existe — o que falta é traçar o plano e começar a seguir.`;
    }
    if (pct <= 90) {
      return `${nome}, você está mais perto do que a maioria das pessoas — sua projeção já atinge ${pct}% da meta que você definiu para si mesmo. Isso é resultado de disciplina e consistência, e merece reconhecimento.\n\nMas "quase lá" sem a estratégia certa pode custar caro. São os últimos percentuais que mais exigem atenção: uma carteira mal diversificada, uma rentabilidade abaixo do potencial por alguns anos, ou uma decisão errada em um momento de volatilidade — e o que levou anos para construir pode demorar muito mais para recuperar.\n\nPense no que esse resultado representa para a sua família: a diferença entre uma aposentadoria com liberdade total — para viajar, para estar presente, para apoiar os filhos nos projetos deles — e uma aposentadoria com restrições que você não planejou. Esse intervalo entre ${pct}% e 100% é exatamente o que separa esses dois cenários.`;
    }
    return `${nome}, você chegou a um lugar que a maioria das pessoas nunca alcança: sua projeção indica que, mantendo a disciplina atual, você chegará à aposentadoria com o patrimônio necessário para gerar a renda que deseja — para sempre.\n\nIsso significa liberdade de verdade: acordar de manhã e escolher como usar o seu tempo, não por obrigação, mas por vontade. Significa poder estar presente nos momentos que importam para a sua família, apoiar os projetos dos seus filhos, viver as experiências que sempre planejou — sem a pressão financeira que acompanha a maioria das pessoas ao longo da vida.\n\nMas construir é só metade do trabalho. Quem chegou tão longe tem muito a proteger — e esse é exatamente o momento em que os riscos mudam de natureza. Decisões erradas, falta de proteção adequada, carteira mal posicionada para o próximo ciclo econômico: esses são os desafios reais de quem já construiu.\n\nUma estratégia completa garante não apenas que você chegue lá, mas que se mantenha lá — com eficiência, proteção e a tranquilidade de saber que o futuro da sua família está resguardado, independente do que aconteça.`;
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
        fontSize: 12, color: "#374151", lineHeight: 1.8,
        marginBottom: 10, whiteSpace: "pre-line" as const,
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
