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
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + R_EXT} ${CY}`,
    `L ${CX + R_INT} ${CY}`,
    `A ${R_INT} ${R_INT} 0 0 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ");

  const pathFill = sc > 0 ? [
    `M ${CX - R_EXT} ${CY}`,
    `A ${R_EXT} ${R_EXT} 0 ${largeArc} 1 ${xFimExt} ${yFimExt}`,
    `L ${xFimInt} ${yFimInt}`,
    `A ${R_INT} ${R_INT} 0 ${largeArc} 0 ${CX - R_INT} ${CY}`,
    "Z",
  ].join(" ") : "";

  return (
    <div style={{
      background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
      padding: "18px 14px 14px", display: "flex", flexDirection: "column",
      alignItems: "center",
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

  // ── Score Liberdade Financeira ──
  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const idadeAtual = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;
  const patrimonioAtual  = Number(dadosLF.patrimonioInicial  ?? dadosColeta.patrimonioFinanceiro)        || 0;
  const aporteMensal     = Number(dadosLF.aporteMensal       ?? dadosColeta.aporteMensal)                || 0;
  const rendaDesejada    = Number(dadosLF.rendaDesejada      ?? dadosColeta.rendaDesejadaAposentadoria)  || 0;
  const idadeMeta        = Number(dadosLF.idadeAlvo          ?? dadosColeta.idadeMeta)                   || 60;
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
  const scores = [scoreLF, scoreInv, scoreBlind].filter(s => s >= 0);
  const scoreGeral = scores.length === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // ── Textos resumidos ──
  function textoLF(): string {
    if (!lfTemDados) return "Dados insuficientes para calcular a projeção de liberdade financeira. Complete as informações de patrimônio, aporte mensal e renda desejada na aposentadoria.";
    const pct = Math.min(100, Math.round(projecao / patrimonioNec * 100));
    if (pct <= 30) return `A projeção atual cobre apenas ${pct}% do patrimônio necessário. A trajetória exige ajustes significativos para garantir a renda desejada na aposentadoria.`;
    if (pct <= 50) return `Com cobertura de ${pct}% da meta, há um gap importante a endereçar. Uma estratégia estruturada pode acelerar significativamente a jornada rumo à liberdade financeira.`;
    if (pct <= 90) return `A projeção atinge ${pct}% da meta — bom progresso. O foco deve ser na otimização da carteira e na proteção do patrimônio já construído.`;
    return "A projeção indica que a meta de liberdade financeira será alcançada com a disciplina atual. O próximo passo é proteger e otimizar o patrimônio já construído.";
  }

  function textoInv(): string {
    if (!aaTemDados)                             return "Nenhum investimento mapeado. Cada mês sem estratégia tem um custo real de rentabilidade não obtida.";
    if (ativosRuins.length > 0 && ativosBons.length === 0) return "A carteira contém apenas produtos com taxas elevadas e baixa eficiência. Uma revisão estratégica pode melhorar significativamente os resultados.";
    if (ativosRuins.length > 0)                  return "A carteira tem pontos positivos, mas contém produtos que reduzem sua eficiência. Uma curadoria estratégica pode otimizar os resultados sem alterar o perfil de risco.";
    if (!temRV && !temExt)                       return "A concentração em renda fixa limita o potencial de crescimento de longo prazo. A diversificação em renda variável e exterior pode ampliar os retornos.";
    return "A carteira demonstra boa diversificação entre as principais classes de ativos, com exposição a crescimento e proteção simultâneos.";
  }

  function textoBlind(): string {
    if (!blindTemDad)                    return "Sem dados de despesas mensais, não foi possível avaliar a proteção patrimonial. Complete esse campo para uma análise completa.";
    if (dadosColeta.possuiSeguro !== true) return "Sem cobertura de seguro identificada. A família fica exposta a riscos financeiros graves em caso de imprevistos com o provedor de renda.";
    return "A existência de seguro de vida é um passo importante para a proteção da família. Revisar as coberturas periodicamente garante que acompanhem o crescimento do patrimônio.";
  }

  const nv = nivelScore(scoreGeral);

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={lead.nome} />}>
      <HeaderSecao titulo="Diagnóstico Inicial" />

      {/* Header com score geral */}
      <div style={{
        background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12,
        padding: "18px 22px", marginBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>
            Diagnóstico Financeiro
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{lead.nome}</div>
          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>
            {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, color: nv.cor }}>{scoreGeral}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 5 }}>de 100 pontos</div>
          <span style={{
            fontSize: 9, fontWeight: 700, color: nv.cor, background: nv.bg,
            padding: "3px 10px", borderRadius: 99, display: "inline-block",
          }}>
            {nv.label}
          </span>
        </div>
      </div>

      {/* 3 Gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <GaugeDiag score={scoreLF}  label="Liberdade Financeira"    icone="ti-beach"     nivel={nivelScore(scoreLF)} />
        <GaugeDiag score={scoreInv} label="Investimentos"           icone="ti-chart-pie" nivel={nivelScore(scoreInv)} />
        <GaugeDiag score={scoreBlind} label="Blindagem de Patrimônio" icone="ti-shield"  nivel={nivelScore(scoreBlind)} />
      </div>

      {/* 3 Cards analíticos resumidos */}
      {[
        { area: "lf",    score: scoreLF,   icone: "ti-beach",     titulo: "Liberdade Financeira",    texto: textoLF() },
        { area: "inv",   score: scoreInv,  icone: "ti-chart-pie", titulo: "Investimentos",            texto: textoInv() },
        { area: "blind", score: scoreBlind, icone: "ti-shield",   titulo: "Blindagem de Patrimônio",  texto: textoBlind() },
      ].map(({ area, score, icone, titulo, texto }) => (
        <div key={area} style={{
          background: "white", border: "0.5px solid #E5E7EB", borderRadius: 10,
          padding: "12px 16px", marginBottom: 10,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 8, paddingBottom: 8, borderBottom: "0.5px solid #F3F4F6",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <i className={`ti ${icone}`} style={{ fontSize: 14, color: "#2563EB" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{titulo}</span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: nivelScore(score).cor, background: nivelScore(score).bg,
              padding: "2px 8px", borderRadius: 99,
            }}>
              {nivelScore(score).label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: 0 }}>{texto}</p>
        </div>
      ))}
    </PaginaDoc>
  );
}
