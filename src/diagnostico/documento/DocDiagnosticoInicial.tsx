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

  const temFilhos = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;

  const pilarBlindagem = temFilhos
    ? ", e a proteção que você tem para garantir que sua família esteja segura independente do que aconteça"
    : ", e a blindagem do patrimônio que você está construindo";

  const paragrafoFinal = temFilhos
    ? `Pense nos seus filhos. Pense no futuro que você quer construir para eles — a educação, a segurança, a tranquilidade de saber que, aconteça o que acontecer, eles estarão protegidos. Esse futuro não se constrói sozinho. Ele é resultado de decisões tomadas hoje, com consistência e com acompanhamento.`
    : `Pense no futuro que você quer construir — a liberdade de acordar sem a pressão do trabalho por obrigação, de tomar decisões com base no que deseja, não no que precisa. Esse futuro não se constrói sozinho. Ele é resultado de decisões tomadas hoje, com consistência e com acompanhamento.`;

  const textoEmocional = `${nome}, você está segurando em mãos algo que poucas pessoas têm coragem de buscar: a verdade sobre a própria situação financeira.

A maioria das pessoas vive anos — décadas — sem jamais parar para olhar de frente para os números que vão definir o futuro delas. Evitam essa conversa porque ela exige honestidade. Porque ela revela que o tempo passa, que as decisões têm consequências, e que adiar é uma escolha — com um custo real que ninguém coloca no extrato.

Você fez diferente.

Este diagnóstico analisou três pilares fundamentais da sua vida financeira: a sua jornada rumo à liberdade financeira, a qualidade e a eficiência dos seus investimentos${pilarBlindagem}. Cada um desses pilares tem um impacto direto no tipo de vida que você terá daqui a 10, 20 ou 30 anos.

O resultado que você vê acima não é um julgamento. É uma bússola. Ele mostra onde você está hoje — e mais importante do que isso, revela o caminho para onde você precisa chegar. A pontuação não é o destino: é o ponto de partida.

Mas aqui está o que mais importa: clareza sem ação não transforma nada. O maior erro que alguém pode cometer após um diagnóstico como este é guardar esse documento na gaveta e continuar exatamente como estava. Cada semana sem uma estratégia estruturada é uma semana em que os juros compostos não estão trabalhando para você da forma que poderiam. Cada mês de atraso tem um custo que não aparece em nenhum extrato — mas que se acumula silenciosamente e se torna cada vez mais difícil de recuperar.

${paragrafoFinal}

Os próximos passos estão mapeados neste documento. A jornada começa agora.`;

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={lead.nome} />}>
      <HeaderSecao titulo="Diagnóstico Inicial" />

      {/* Card score geral */}
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

      {/* Grid 3 gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 0 }}>
        <GaugeDiag score={scoreLF}    label="Liberdade Financeira"    icone="ti-beach"     nivel={nivelScore(scoreLF)} />
        <GaugeDiag score={scoreInv}   label="Investimentos"           icone="ti-chart-pie" nivel={nivelScore(scoreInv)} />
        <GaugeDiag score={scoreBlind} label="Blindagem de Patrimônio" icone="ti-shield"    nivel={nivelScore(scoreBlind)} />
      </div>

      {/* Texto emocional */}
      <p style={{
        fontSize: 12,
        color: "#374151",
        lineHeight: 2,
        margin: "20px 0 0",
        whiteSpace: "pre-line" as const,
      }}>
        {textoEmocional}
      </p>
    </PaginaDoc>
  );
}
