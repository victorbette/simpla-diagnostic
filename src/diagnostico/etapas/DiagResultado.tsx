import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO } from "../ativosInvestimento";

const TAXA_MENSAL_SCORE = Math.pow(1.045, 1 / 12) - 1;

interface Props {
  lead: Lead;
  onAtualizar?: (patch: Partial<Lead>) => void;
}

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

function nivelScore(score: number): { label: string; cor: string; bg: string } {
  if (score < 0)  return { label: "Não avaliado",       cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 30) return { label: "Crítico",            cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 50) return { label: "Atenção Urgente",    cor: "#C2410C", bg: "#FFEDD5" };
  if (score <= 90) return { label: "Precisa Desenvolver", cor: "#B45309", bg: "#FEF3C7" };
  return            { label: "Caminho Certo",             cor: "#15803D", bg: "#DCFCE7" };
}

function GaugeDiag({
  score,
  label,
  icone,
  nivel,
}: {
  score: number;
  label: string;
  icone: string;
  nivel: ReturnType<typeof nivelScore>;
}) {
  const W = 160, H = 90;
  const CX = W / 2, CY = H;
  const R_EXT = 72, R_INT = 52;
  const scoreClamped = Math.max(0, Math.min(100, score));
  const graus = 180 - (scoreClamped / 100) * 180;
  const rad = (graus * Math.PI) / 180;
  const xFimExt = CX + R_EXT * Math.cos(rad);
  const yFimExt = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);
  const largeArc = scoreClamped > 50 ? 1 : 0;

  const pathFundo = [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY}`,
    `L ${CX + R_INT} ${CY}`,
    `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ");

  const pathPreenchido = scoreClamped > 0 ? [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFimExt} ${yFimExt}`,
    `L ${xFimInt} ${yFimInt}`,
    `A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ") : "";

  return (
    <div style={{
      background: "white",
      border: "0.5px solid #E5E7EB",
      borderRadius: 12,
      padding: "20px 16px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} style={{ overflow: "visible" }}>
        <path d={pathFundo} fill="#F3F4F6" />
        {scoreClamped > 0 && (
          <path d={pathPreenchido} fill={nivel.cor} opacity={0.9} />
        )}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="22" fontWeight="800" fill={score >= 0 ? nivel.cor : "#9CA3AF"}>
          {score >= 0 ? scoreClamped : "—"}
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="10" fill="#9CA3AF">
          /100
        </text>
      </svg>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 13, color: nivel.cor }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "center" }}>
          {label}
        </span>
      </div>

      <span style={{
        fontSize: 10, fontWeight: 600,
        color: nivel.cor, background: nivel.bg,
        padding: "2px 10px", borderRadius: 99,
        marginTop: 6,
      }}>
        {nivel.label}
      </span>
    </div>
  );
}

export function DiagResultado({ lead }: Props) {
  const { dadosColeta, dadosLF } = lead;

  // ── Score Liberdade Financeira ──
  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const idadeAtual = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  // Prefer values edited in the LF tab; fall back to Coleta values
  const patrimonioAtual = Number(dadosLF.patrimonioInicial ?? dadosColeta.patrimonioFinanceiro) || 0;
  const aporteMensal = Number(dadosLF.aporteMensal ?? dadosColeta.aporteMensal) || 0;
  const rendaDesejada = Number(dadosLF.rendaDesejada ?? dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMeta = Number(dadosLF.idadeAlvo ?? dadosColeta.idadeMeta) || 60;

  const patrimonioNecessario = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;

  const nMeses = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const f = nMeses > 0 ? Math.pow(1 + TAXA_MENSAL_SCORE, nMeses) : 1;
  const projecao = nMeses > 0
    ? patrimonioAtual * f + aporteMensal * (f - 1) / TAXA_MENSAL_SCORE
    : patrimonioAtual;

  const lfTemDados = patrimonioNecessario > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;

  const scoreLF = !lfTemDados ? -1
    : Math.min(100, Math.round(projecao / patrimonioNecessario * 100));

  // ── Score Investimentos ──
  const ativosMap = dadosColeta.ativosInvestimento ?? {};
  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const aaTemDados = ativosDoLead.length > 0;

  const ativosBons  = ativosDoLead.filter(a => a.qualidade === "bom");
  const ativosRuins = ativosDoLead.filter(a => a.qualidade === "ruim");

  const temRF  = ativosBons.some(a => a.classe === "renda_fixa");
  const temRV  = ativosBons.some(a => a.classe === "renda_variavel");
  const temExt = ativosBons.some(a => a.classe === "exterior");

  let pontos = 0;
  if (temRF)  pontos += 25;
  if (temRV)  pontos += 35;
  if (temExt) pontos += 25;
  pontos -= ativosRuins.length * 10;
  pontos = Math.max(0, Math.min(100, pontos));

  const scoreInvestimentos = !aaTemDados ? -1 : pontos;

  // ── Score Blindagem ──
  const despesas = Number(dadosColeta.custoVidaMensal) || 0;
  const capitalNecessarioBlindagem = despesas * 12 * 20;
  const capitalAtualBlindagem = dadosColeta.possuiSeguro === true
    ? (Number(dadosColeta.valorApolice) || 0)
    : 0;
  const blindagemTemDados = despesas > 0;

  const scoreBlindagem = !blindagemTemDados ? -1
    : capitalNecessarioBlindagem > 0
      ? Math.min(100, Math.round(capitalAtualBlindagem / capitalNecessarioBlindagem * 100))
      : 0;

  // ── Score Geral ──
  const scoreGeral = (() => {
    const scores = [scoreLF, scoreInvestimentos, scoreBlindagem].filter(s => s >= 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  })();

  // ── Textos humanizados ──
  function gerarTextoInvestimentos(): string {
    if (!aaTemDados) {
      return "Não identificamos nenhum investimento em sua carteira. Se você ainda não começou a investir, cada mês de atraso tem um custo real — o custo dos juros compostos trabalhando para outros em vez de para você. Se você já investe mas não sabe exatamente onde, isso é igualmente preocupante: dinheiro sem estratégia raramente cresce como deveria.";
    }

    if (ativosRuins.length > 0 && ativosBons.length === 0) {
      return `Identificamos apenas produtos considerados não recomendados em sua carteira: ${ativosRuins.map(a => a.label).join(", ")}. Esses produtos costumam beneficiar mais quem os vende do que quem os compra — com taxas elevadas, baixa transparência e retornos abaixo do mercado.\n\nIsso significa que, enquanto você trabalha para construir patrimônio, uma parcela significativa do rendimento pode estar sendo consumida por custos desnecessários. Uma revisão completa da carteira pode fazer uma diferença enorme no longo prazo.`;
    }

    if (ativosRuins.length > 0 && ativosBons.length > 0) {
      return `Você já tem boas escolhas na carteira (${ativosBons.map(a => a.label).join(", ")}), mas identificamos também produtos que merecem atenção: ${ativosRuins.map(a => a.label).join(", ")}. Uma revisão estratégica pode elevar significativamente a eficiência da sua carteira.`;
    }

    if (ativosRuins.length === 0 && !temRV && !temExt) {
      return "Sua carteira está em produtos de qualidade, mas muito concentrada em renda fixa. Sem ativos de crescimento (ações, FIIs) e sem diversificação internacional, o patrimônio tende a crescer abaixo do potencial no longo prazo. Uma estratégia completa combina proteção com crescimento.";
    }

    const partes: string[] = [];
    if (ativosBons.length > 0) {
      partes.push(`Você já tem excelentes produtos na carteira: ${ativosBons.map(a => a.label).join(", ")}.`);
    }
    if (!temRV)  partes.push("Incluir ativos de renda variável (ações, FIIs, ETFs) pode aumentar significativamente o potencial de crescimento do seu patrimônio no longo prazo.");
    if (!temExt) partes.push("A diversificação internacional protege contra riscos específicos do Brasil e abre oportunidades em mercados globais.");
    return partes.join(" ");
  }

  function gerarTexto(area: string): string {
    if (area === "lf") {
      if (!lfTemDados) {
        return "Ainda não conseguimos calcular sua projeção de aposentadoria — e isso, por si só, já é um sinal importante. Quem não sabe para onde está indo financeiramente tende a chegar a algum lugar que não planejou. Complete os dados de patrimônio, aporte mensal e renda desejada para descobrir onde você realmente está.";
      }
      const pct = Math.round(projecao / patrimonioNecessario * 100);
      if (projecao >= patrimonioNecessario) {
        return "Parabéns — você está no grupo seleto de pessoas que, mantendo a disciplina atual, chegará à aposentadoria com patrimônio suficiente para gerar a renda que deseja para sempre.\n\nO desafio agora é proteger o que construiu, otimizar a rentabilidade e garantir que nenhum imprevisto desfaça o que anos de dedicação construíram. Uma estratégia bem estruturada protege e acelera esse resultado.";
      }
      if (pct < 30) {
        return `Esse resultado exige atenção imediata. Com a trajetória atual, você chegará à aposentadoria com apenas ${pct}% do patrimônio necessário para manter seu padrão de vida — o que significa depender de terceiros, reduzir drasticamente o estilo de vida ou continuar trabalhando por muito mais tempo do que deseja.\n\nA boa notícia é que você tem tempo para mudar isso — mas o tempo é o seu ativo mais valioso agora. Cada mês que passa sem ajustar a estratégia representa uma diferença enorme lá na frente. Pequenas mudanças hoje geram resultados enormes em 10, 15 ou 20 anos.\n\nEsse é exatamente o momento de agir.`;
      }
      if (pct < 70) {
        return `Você está no caminho, mas ainda há uma lacuna significativa a preencher. Com a estratégia atual, sua projeção atinge ${pct}% da renda que você deseja ter na aposentadoria.\n\nIsso significa que, sem ajustes, parte do seu futuro ainda depende de circunstâncias fora do seu controle. A diferença entre chegar lá com tranquilidade ou com aperto está nas decisões que você toma nos próximos meses.\n\nUma estratégia bem estruturada pode mudar esse cenário completamente.`;
      }
      return `Você já construiu uma base sólida — está a ${pct}% da meta de aposentadoria que definiu para si mesmo. Isso demonstra disciplina e consistência.\n\nAgora é hora de otimizar: pequenos ajustes na rentabilidade da carteira ou no valor dos aportes podem antecipar em anos a sua data de liberdade financeira. Você está próximo — e com a estratégia certa, pode chegar muito antes do que imagina.`;
    }

    if (area === "inv") return gerarTextoInvestimentos();

    if (area === "blind") {
      if (!blindagemTemDados) {
        return "Não conseguimos avaliar sua proteção patrimonial sem saber suas despesas mensais. Complete esse dado para descobrir se sua família estaria protegida em caso de imprevistos.";
      }
      if (dadosColeta.possuiSeguro !== true) {
        return "Esse é o ponto mais crítico do seu diagnóstico. Você não possui nenhuma apólice de seguro de vida ou invalidez — o que significa que, se algo inesperado acontecer com você amanhã, sua família enfrentaria a dor emocional e, simultaneamente, uma crise financeira devastadora.\n\nPense nisso de forma concreta: em caso de falecimento, quem pagaria o aluguel, a escola dos filhos, as contas do dia a dia? Em caso de invalidez — que é estatisticamente mais provável do que o falecimento precoce — como sua família manteria o padrão de vida por meses ou anos sem a sua renda?\n\nUm seguro de vida adequado é uma das decisões mais importantes e mais acessíveis que você pode tomar hoje. O custo de não ter é infinitamente maior do que o custo de ter.";
      }
      return "Você já deu um passo importante ao contratar um seguro de vida — isso demonstra que você pensa no futuro da sua família.\n\nLembre-se de revisar anualmente: à medida que seu patrimônio e suas responsabilidades crescem, a cobertura também deve acompanhar esse crescimento. Avaliar a inclusão de coberturas em vida — invalidez e doenças graves — pode adicionar uma camada extra de segurança para o que você mais valoriza.";
    }

    return "";
  }

  return (
    <>
      <style>{`
        @media print {
          .diag-no-print { display: none !important; }
          body { background: white !important; }
          .diag-print-root { padding: 0 !important; }
        }
      `}</style>

      <div className="diag-print-root">

        {/* ── Header com score geral ── */}
        <div style={{
          background: "linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)",
          borderRadius: 16,
          padding: "28px 32px",
          color: "white",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 24px rgba(30,58,138,0.18)",
        }}>
          <div>
            <div style={{
              fontSize: 11, opacity: 0.7,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}>
              Diagnóstico Financeiro
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
              {lead.nome}
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
              {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ textAlign: "center" as const }}>
            <div style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1,
              color: scoreGeral >= 91 ? "#4ADE80" : scoreGeral >= 51 ? "#FCD34D" : scoreGeral >= 31 ? "#FB923C" : "#F87171",
            }}>
              {scoreGeral}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
              de 100 pontos
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: "rgba(255,255,255,0.15)",
              padding: "4px 14px", borderRadius: 99,
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              {nivelScore(scoreGeral).label}
            </span>
          </div>
        </div>

        {/* ── 3 Gauges ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          <GaugeDiag score={scoreLF}           label="Liberdade Financeira"   icone="ti-beach"     nivel={nivelScore(scoreLF)} />
          <GaugeDiag score={scoreInvestimentos} label="Investimentos"          icone="ti-chart-pie" nivel={nivelScore(scoreInvestimentos)} />
          <GaugeDiag score={scoreBlindagem}     label="Blindagem de Patrimônio" icone="ti-shield"    nivel={nivelScore(scoreBlindagem)} />
        </div>

        {/* ── 3 Cards analíticos ── */}
        {[
          { area: "lf",    score: scoreLF,           icone: "ti-beach",     titulo: "Liberdade Financeira" },
          { area: "inv",   score: scoreInvestimentos, icone: "ti-chart-pie", titulo: "Investimentos" },
          { area: "blind", score: scoreBlindagem,     icone: "ti-shield",    titulo: "Blindagem de Patrimônio" },
        ].map(({ area, score, icone, titulo }) => (
          <div key={area} style={{
            background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
            padding: "20px 24px", marginBottom: 16,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${icone}`} style={{ fontSize: 18, color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{titulo}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: nivelScore(score).cor, background: nivelScore(score).bg,
                padding: "3px 10px", borderRadius: 99,
              }}>
                {nivelScore(score).label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.9, margin: 0, whiteSpace: "pre-line" }}>
              {gerarTexto(area)}
            </p>
          </div>
        ))}


      </div>
    </>
  );
}
