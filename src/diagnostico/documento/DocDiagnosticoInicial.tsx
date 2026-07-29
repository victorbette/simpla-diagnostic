import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO } from "../ativosInvestimento";
import { PaginaDoc } from "@/components/estrategia/documento/PaginaDoc";
import { HeaderSecao } from "@/components/estrategia/documento/HeaderSecao";
import { RodapePaginaDiag } from "./RodapePaginaDiag";

const TAXA_MENSAL = Math.pow(1.045, 1 / 12) - 1;

function nivelScore(score: number): { label: string; cor: string; bg: string } {
  if (score < 0)   return { label: "Não avaliado",        cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 30) return { label: "Crítico",             cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 50) return { label: "Atenção Urgente",     cor: "#C2410C", bg: "#FFEDD5" };
  if (score <= 90) return { label: "Precisa Desenvolver", cor: "#B45309", bg: "#FEF3C7" };
  return            { label: "Caminho Certo",              cor: "#15803D", bg: "#DCFCE7" };
}

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

function GaugeDiag({
  score, label, icone, nivel,
}: {
  score: number; label: string; icone: string;
  nivel: ReturnType<typeof nivelScore>;
}) {
  const W = 160, H = 90;
  const CX = W / 2, CY = H;
  const R_EXT = 72, R_INT = 52;
  const sc = Math.max(0, Math.min(100, score));
  const graus = 180 - (sc / 100) * 180;
  const rad = (graus * Math.PI) / 180;
  const xFimExt = CX + R_EXT * Math.cos(rad);
  const yFimExt = CY - R_EXT * Math.sin(rad);
  const xFimInt = CX + R_INT * Math.cos(rad);
  const yFimInt = CY - R_INT * Math.sin(rad);
  const largeArc = sc > 50 ? 1 : 0;

  const pathFundo = [
    `M ${CX - R_EXT} ${CY}`, `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY}`,
    `L ${CX + R_INT} ${CY}`, `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`, "Z",
  ].join(" ");

  const pathFill = sc > 0 ? [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFimExt} ${yFimExt}`,
    `L ${xFimInt} ${yFimInt}`,
    `A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY}`, "Z",
  ].join(" ") : "";

  return (
    <div style={{
      background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
      padding: "18px 14px 14px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} style={{ overflow: "visible" }}>
        <path d={pathFundo} fill="#F3F4F6" />
        {sc > 0 && <path d={pathFill} fill={nivel.cor} opacity={0.9} />}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="22" fontWeight="800"
          fill={score >= 0 ? nivel.cor : "#9CA3AF"}>
          {score >= 0 ? sc : "—"}
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="10" fill="#9CA3AF">/100</text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 13, color: nivel.cor }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "center" as const }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, color: nivel.cor, background: nivel.bg,
        padding: "2px 10px", borderRadius: 99, marginTop: 6,
      }}>
        {nivel.label}
      </span>
    </div>
  );
}

interface Props { lead: Lead; }

export function DocDiagnosticoInicial({ lead }: Props) {
  const { dadosColeta, dadosLF } = lead;
  const nome = lead.nome.split(" ")[0];

  // ── Score Liberdade Financeira ──
  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const idadeAtual = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;
  const patrimonioAtual  = Number(dadosLF.patrimonioInicial  ?? dadosColeta.patrimonioFinanceiro)       || 0;
  const aporteMensal     = Number(dadosLF.aporteMensal       ?? dadosColeta.aporteMensal)               || 0;
  const rendaDesejada    = Number(dadosLF.rendaDesejada      ?? dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMeta        = Number(dadosLF.idadeAlvo          ?? dadosColeta.idadeMeta)                  || 60;
  const patrimonioNec    = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const nMeses           = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const f                = nMeses > 0 ? Math.pow(1 + TAXA_MENSAL, nMeses) : 1;
  const projecao         = nMeses > 0 ? patrimonioAtual * f + aporteMensal * (f - 1) / TAXA_MENSAL : patrimonioAtual;
  const lfTemDados       = patrimonioNec > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;
  const scoreLF          = !lfTemDados ? -1 : Math.min(100, Math.round(projecao / patrimonioNec * 100));
  const pctLF            = lfTemDados ? Math.min(100, Math.round(projecao / patrimonioNec * 100)) : 0;

  // ── Score Investimentos ──
  const ativosMap    = dadosColeta.ativosInvestimento ?? {};
  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const aaTemDados   = ativosDoLead.length > 0;
  const ativosBons   = ativosDoLead.filter(a => a.qualidade === "bom");
  const ativosRuins  = ativosDoLead.filter(a => a.qualidade === "ruim");
  const temRF        = ativosBons.some(a => a.classe === "renda_fixa");
  const temRV        = ativosBons.some(a => a.classe === "renda_variavel");
  const temExt       = ativosBons.some(a => a.classe === "exterior");
  let pontos = 0;
  if (temRF)  pontos += 25;
  if (temRV)  pontos += 35;
  if (temExt) pontos += 25;
  pontos -= ativosRuins.length * 10;
  pontos = Math.max(0, Math.min(100, pontos));
  const scoreInv = !aaTemDados ? -1 : pontos;

  // ── Score Blindagem ──
  const despesas    = Number(dadosColeta.custoVidaMensal) || 0;
  const capNec      = despesas * 12 * 20;
  const capAtual    = dadosColeta.possuiSeguro === true ? (Number(dadosColeta.valorApolice) || 0) : 0;
  const blindTemDad = despesas > 0;
  const scoreBlind  = !blindTemDad ? -1 : capNec > 0 ? Math.min(100, Math.round(capAtual / capNec * 100)) : 0;

  // ── Score Geral ──
  const scoreLista = [scoreLF, scoreInv, scoreBlind].filter(s => s >= 0);
  const scoreGeral = scoreLista.length === 0 ? 0 : Math.round(scoreLista.reduce((a, b) => a + b, 0) / scoreLista.length);
  const nv = nivelScore(scoreGeral);

  // ── Textos completos (mesmas versões de DiagResultado, truncados para 220 chars) ──
  function textoLF(): string {
    if (!lfTemDados) return "A liberdade financeira começa com clareza — e clareza começa com números.\n\nA maioria das pessoas passa a vida trabalhando sem saber exatamente para quê: quanto precisa acumular para parar quando quiser, viajar sem culpa, dar a melhor educação para os filhos ou simplesmente acordar de manhã sem a pressão de ter que trabalhar por necessidade.";
    if (pctLF <= 30) return `${nome}, este número precisa ser dito com clareza: a trajetória atual coloca você em uma situação de risco real no longo prazo.\n\nPense nos projetos que você tem para a sua família — a escola dos filhos, a casa própria, as viagens que ainda não fez, a aposentadoria tranquila que imagina para você e para quem você ama.`;
    if (pctLF <= 50) return `${nome}, sua projeção atual cobre ${pctLF}% da renda que você imaginou ter na aposentadoria. Esse número tem um significado concreto: sem mudanças, você chegará nessa fase com menos da metade do que precisa para viver com o padrão que deseja.`;
    if (pctLF <= 90) return `${nome}, você está mais perto do que a maioria das pessoas — sua projeção já atinge ${pctLF}% da meta que você definiu para si mesmo. Isso é resultado de disciplina e consistência, e merece reconhecimento.`;
    return `${nome}, você chegou a um lugar que a maioria das pessoas nunca alcança: sua projeção indica que, mantendo a disciplina atual, você chegará à aposentadoria com o patrimônio necessário para gerar a renda que deseja.`;
  }

  function textoInv(): string {
    if (!aaTemDados) return "Não identificamos nenhum investimento mapeado em sua carteira. Se você ainda não começou a investir, cada mês de atraso tem um custo real e crescente — o custo dos juros compostos que poderiam estar trabalhando para você, mas não estão.";
    const nomesRuins = ativosRuins.map(a => a.label);
    const nomesBons  = ativosBons.map(a => a.label);
    if (ativosRuins.length > 0 && ativosBons.length === 0) return `A análise da sua carteira acendeu um alerta importante. Todos os produtos identificados — ${nomesRuins.join(", ")} — estão na categoria de investimentos não recomendados: produtos com taxas elevadas, baixa transparência e retornos historicamente abaixo do mercado.`;
    if (ativosRuins.length > 0) return `Sua carteira tem pontos positivos: você já investe em ${nomesBons.join(", ")}, o que demonstra que você está no caminho. No entanto, identificamos também produtos que merecem atenção: ${nomesRuins.join(", ")}.`;
    if (!temRV && !temExt) return "Você faz boas escolhas dentro da renda fixa — os produtos que identificamos são sólidos e adequados como base. Mas uma carteira concentrada apenas em renda fixa tem um custo de oportunidade real no longo prazo.";
    return `Sua carteira demonstra uma visão estratégica consistente. Com ${nomesBons.join(", ")}, você tem exposição a classes de ativos que trabalham juntas para crescer, gerar renda e proteger contra riscos.`;
  }

  function textoBlind(): string {
    if (!blindTemDad) return "Não conseguimos avaliar sua proteção patrimonial sem saber suas despesas mensais. Complete esse dado para descobrir se sua família estaria protegida em caso de imprevistos.";
    if (dadosColeta.possuiSeguro !== true) return "Esse é o ponto mais crítico do seu diagnóstico. Você não possui nenhuma apólice de seguro de vida ou invalidez — o que significa que, se algo inesperado acontecer com você amanhã, sua família enfrentaria a dor emocional e, simultaneamente, uma crise financeira devastadora.";
    return "Você já deu um passo importante ao contratar um seguro de vida — isso demonstra que você pensa no futuro da sua família.\n\nLembre-se de revisar anualmente: à medida que seu patrimônio e suas responsabilidades crescem, a cobertura também deve acompanhar esse crescimento.";
  }

  const areas = [
    { key: "lf",    score: scoreLF,   icone: "ti-beach",     titulo: "Liberdade Financeira",    texto: textoLF() },
    { key: "inv",   score: scoreInv,  icone: "ti-chart-pie", titulo: "Investimentos",            texto: textoInv() },
    { key: "blind", score: scoreBlind, icone: "ti-shield",   titulo: "Blindagem de Patrimônio",  texto: textoBlind() },
  ];

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={lead.nome} />}>
      <HeaderSecao titulo="Diagnóstico Inicial" />

      {/* Texto introdutório */}
      <p style={{
        fontSize: 12, color: "#374151",
        lineHeight: 1.9, marginBottom: 16,
        whiteSpace: "pre-line" as const,
      }}>
        {`Este diagnóstico não é apenas um documento — é um espelho da sua realidade financeira.

Pouquíssimas pessoas param para olhar de frente para os números que definem o seu futuro. Você fez diferente. E isso já coloca você à frente da maioria.

Mas a clareza que este diagnóstico traz só tem valor se for seguida de ação. Cada área analisada aqui representa uma alavanca: quando bem ajustada, ela acelera a construção da sua liberdade financeira. Quando ignorada, ela silenciosamente compromete o futuro que você imagina para si e para sua família.

A Liberdade Financeira não é um destino reservado para poucos. É o resultado de decisões consistentes, tomadas com clareza e acompanhamento adequado. Este diagnóstico é o primeiro passo dessa jornada. O próximo passo é seu.`}
      </p>

      {/* Header com score geral */}
      <div style={{
        background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
        padding: "20px 24px", marginBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
            Diagnóstico Financeiro
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{lead.nome}</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: nv.cor }}>{scoreGeral}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>de 100 pontos</div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: nv.cor, background: nv.bg,
            padding: "2px 10px", borderRadius: 99, display: "inline-block",
          }}>
            {nv.label}
          </span>
        </div>
      </div>

      {/* 3 Gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <GaugeDiag score={scoreLF}   label="Liberdade Financeira"    icone="ti-beach"     nivel={nivelScore(scoreLF)} />
        <GaugeDiag score={scoreInv}  label="Investimentos"           icone="ti-chart-pie" nivel={nivelScore(scoreInv)} />
        <GaugeDiag score={scoreBlind} label="Blindagem de Patrimônio" icone="ti-shield"   nivel={nivelScore(scoreBlind)} />
      </div>

      {/* 3 cards de texto — layout horizontal com ícone à esquerda */}
      {areas.map(({ key, score, icone, titulo, texto }) => (
        <div key={key} style={{
          border: "0.5px solid #E5E7EB", borderRadius: 8,
          padding: "12px 16px", marginBottom: 8,
          display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <i
            className={`ti ${icone}`}
            style={{ fontSize: 16, color: nivelScore(score).cor, marginTop: 2, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
              {titulo}
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: nivelScore(score).cor, background: nivelScore(score).bg,
                padding: "1px 8px", borderRadius: 99, marginLeft: 8,
              }}>
                {nivelScore(score).label}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.6, margin: 0 }}>
              {texto.slice(0, 220).trim()}…
            </p>
          </div>
        </div>
      ))}
    </PaginaDoc>
  );
}
