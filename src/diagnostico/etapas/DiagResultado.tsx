import type { Lead } from "../types";
import { ATIVOS_INVESTIMENTO } from "../ativosInvestimento";
import { ATIVOS_TEXTOS, TEXTOS_DIVERSIFICACAO } from "../ativosTextos";

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
  if (score < 0)   return { label: "Não avaliado",      cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score === 0) return { label: "Atenção urgente",   cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 40) return { label: "Precisa melhorar",  cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 60) return { label: "Em desenvolvimento",cor: "#B45309", bg: "#FEF3C7" };
  if (score <= 80) return { label: "No caminho certo",  cor: "#2563EB", bg: "#DBEAFE" };
  return             { label: "Muito bem!",             cor: "#15803D", bg: "#DCFCE7" };
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
      return "Ainda não foram informados os investimentos. Informe na Coleta de Dados quais ativos você já possui para receber uma análise completa.";
    }

    const norm = (s: string) => s.replace(/\n/g, " ").trim();
    const partes: string[] = [];

    if (ativosBons.length > 0) {
      const linhas = ["O que você já faz bem:"];
      for (const a of ativosBons) {
        const t = ATIVOS_TEXTOS[a.id];
        const positivo = t?.positivo ? norm(t.positivo) : "";
        const dica = t?.dica ? ` ${norm(t.dica)}` : "";
        if (positivo) linhas.push(`• ${a.label}: ${positivo}${dica}`);
      }
      if (linhas.length > 1) partes.push(linhas.join("\n"));
    }

    if (ativosRuins.length > 0) {
      const linhas = ["Pontos de atenção:"];
      for (const a of ativosRuins) {
        const t = ATIVOS_TEXTOS[a.id];
        const negativo = t?.negativo ? norm(t.negativo) : "";
        const dica = t?.dica ? ` ${norm(t.dica)}` : "";
        if (negativo) linhas.push(`• ${a.label}: ${negativo}${dica}`);
      }
      if (linhas.length > 1) partes.push(linhas.join("\n"));
    }

    const totalClassesBoas = [temRF, temRV, temExt].filter(Boolean).length;
    const linhasDiversif: string[] = ["Análise da diversificação:"];
    if (!temRF)  linhasDiversif.push(norm(TEXTOS_DIVERSIFICACAO.semRF));
    if (!temRV)  linhasDiversif.push(norm(TEXTOS_DIVERSIFICACAO.semRV));
    if (!temExt) linhasDiversif.push(norm(TEXTOS_DIVERSIFICACAO.semExt));
    if (totalClassesBoas >= 3) {
      linhasDiversif.push(norm(TEXTOS_DIVERSIFICACAO.excelenteDiversificacao));
    } else if (totalClassesBoas === 2) {
      linhasDiversif.push(norm(TEXTOS_DIVERSIFICACAO.boaDiversificacao));
    }
    if (linhasDiversif.length > 1) partes.push(linhasDiversif.join("\n"));

    return partes.join("\n\n");
  }

  function gerarTexto(area: string): string {
    if (area === "lf") {
      if (!lfTemDados) {
        return "Para visualizar como está sua jornada rumo à aposentadoria, precisamos de algumas informações ainda não preenchidas. Volte à Coleta de Dados e informe seu patrimônio atual, quanto investe por mês e a renda que deseja ter no futuro.";
      }
      if (projecao >= patrimonioNecessario) {
        return "Ótima notícia! Com o ritmo atual de investimentos e o patrimônio que você já construiu, você está no caminho para ter a renda que deseja na aposentadoria.\n\nSe mantiver a consistência nos aportes mensais, a projeção indica que você chegará ao seu objetivo. O segredo agora é não parar — cada mês de investimento conta muito no longo prazo.";
      }
      const pct = Math.round(projecao / patrimonioNecessario * 100);
      return `Você já começou sua jornada de investimentos, o que é ótimo! Com o ritmo atual, você está chegando a ${pct}% da renda que deseja ter na aposentadoria.\n\nA diferença pode ser reduzida aumentando um pouco o valor investido por mês ou ajustando a data da aposentadoria. Pequenos ajustes hoje fazem uma diferença enorme lá na frente.`;
    }

    if (area === "inv") return gerarTextoInvestimentos();

    if (area === "blind") {
      if (!blindagemTemDados) {
        return "Para analisarmos sua proteção financeira, precisamos saber quanto você gasta por mês. Preencha esse dado na Coleta de Dados.";
      }
      if (capitalAtualBlindagem === 0) {
        return "Identificamos que você não possui seguro de vida ou invalidez no momento. Isso é um ponto de atenção importante: caso algo inesperado aconteça, sua família poderia enfrentar dificuldades financeiras.\n\nUm seguro de vida é uma das formas mais simples e acessíveis de proteger quem você ama. Vale muito a pena avaliar essa possibilidade.";
      }
      if (capitalAtualBlindagem < capitalNecessarioBlindagem) {
        const pct = Math.round(capitalAtualBlindagem / capitalNecessarioBlindagem * 100);
        return `Você já tem um seguro de vida — isso é muito importante e mostra que você pensa no futuro da sua família.\n\nA análise indica que a cobertura atual representa ${pct}% do valor recomendado para proteger o padrão de vida da sua família. Pode valer a pena avaliar se o valor da apólice ainda está adequado para a sua situação atual.`;
      }
      return "Excelente! Você possui uma cobertura de seguro adequada para proteger sua família. Sua blindagem patrimonial está bem estruturada.\n\nLembre-se de revisar o valor da apólice periodicamente, especialmente quando houver mudanças na sua renda ou estrutura familiar.";
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
          background: "#1E3A8A", borderRadius: 12, padding: "24px 28px",
          color: "white", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Diagnóstico Financeiro</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{lead.nome}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{scoreGeral}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>pontos de 100</div>
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: "rgba(255,255,255,0.2)",
              padding: "3px 12px", borderRadius: 99,
              marginTop: 6, display: "inline-block",
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

        {/* ── Botão imprimir ── */}
        <div className="diag-no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#1E3A8A", color: "white",
              border: "none", borderRadius: 8,
              padding: "10px 24px", fontSize: 13,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <i className="ti ti-printer" style={{ fontSize: 15 }} />
            Imprimir Diagnóstico
          </button>
        </div>

      </div>
    </>
  );
}
