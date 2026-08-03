import { ATIVOS_INVESTIMENTO } from "./ativosInvestimento";
import type { DadosColetaDiag } from "./types";

const TAXA_MENSAL = Math.pow(1.04, 1 / 12) - 1;

export function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

export function nivelScore(score: number): { label: string; cor: string; bg: string } {
  if (score < 0)   return { label: "Não avaliado",        cor: "#9CA3AF", bg: "#F3F4F6" };
  if (score <= 30) return { label: "Crítico",             cor: "#B91C1C", bg: "#FEE2E2" };
  if (score <= 50) return { label: "Atenção Urgente",     cor: "#C2410C", bg: "#FFEDD5" };
  if (score <= 90) return { label: "Precisa Desenvolver", cor: "#B45309", bg: "#FEF3C7" };
  return            { label: "Caminho Certo",              cor: "#15803D", bg: "#DCFCE7" };
}

export interface ScoresDiag {
  scoreLF: number;
  scoreInvestimentos: number;
  scoreBlindagem: number;
  scoreGeral: number;
  lfTemDados: boolean;
  pctIF: number;
  aaTemDados: boolean;
  ativosBonsLabels: string[];
  ativosRuinsLabels: string[];
  nBonsCount: number;
  nRuinsCount: number;
  temRF: boolean;
  temRV: boolean;
  temExt: boolean;
  blindagemTemDados: boolean;
  possuiSeguro: boolean;
  comecandoDoZero: boolean;
}

export function calcularScoresDiag(
  dadosColeta: DadosColetaDiag,
): ScoresDiag {
  // ── Score Liberdade Financeira ──
  const dataNasc = dadosColeta.dataNascimento ?? "";
  const birthDate = dataNasc ? new Date(dataNasc) : null;
  const idadeAtual = birthDate && isFinite(birthDate.getTime())
    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;
  const patrimonioAtual = Number(dadosColeta.patrimonioFinanceiro) || 0;
  const aporteMensal    = Number(dadosColeta.aporteMensal)           || 0;
  const rendaDesejada   = Number(dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMeta       = Number(dadosColeta.idadeMeta) || 60;
  const patrimonioNec   = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const nMeses          = Math.max(0, (idadeMeta - idadeAtual) * 12);
  const f               = nMeses > 0 ? Math.pow(1 + TAXA_MENSAL, nMeses) : 1;
  const projecao        = nMeses > 0 && isFinite(f)
    ? patrimonioAtual * f + aporteMensal * (f - 1) / TAXA_MENSAL
    : patrimonioAtual;
  const lfTemDados = rendaDesejada > 0 && patrimonioNec > 0 && idadeAtual > 0 && idadeMeta > idadeAtual;
  const pctIF      = lfTemDados ? Math.min(100, Math.round(projecao / patrimonioNec * 100)) : 0;
  const scoreLF    = !lfTemDados ? -1 : pctIF;

  // ── Score Investimentos ──
  const comecandoDoZero = dadosColeta.comecandoDoZero === true;
  const ativosMap    = dadosColeta.ativosInvestimento ?? {};
  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const aaTemDados   = comecandoDoZero || ativosDoLead.length > 0;
  const ativosBons   = ativosDoLead.filter(a => a.qualidade === "bom");
  const ativosRuins  = ativosDoLead.filter(a => a.qualidade === "ruim");
  const temRF  = ativosBons.some(a => a.classe === "renda_fixa");
  const temRV  = ativosBons.some(a => a.classe === "renda_variavel");
  const temExt = ativosBons.some(a => a.classe === "exterior");
  let pontos = 0;
  if (temRF)  pontos += 30;
  if (temRV)  pontos += 40;
  if (temExt) pontos += 30;
  pontos -= ativosRuins.length * 10;
  pontos = Math.max(0, Math.min(100, pontos));
  const scoreInvestimentos = comecandoDoZero ? 0 : (!aaTemDados ? -1 : pontos);

  // ── Score Blindagem ──
  // valorApolice não é coletado no UI; usa possuiSeguro como proxy qualitativo
  const despesas = Number(dadosColeta.custoVidaMensal) || 0;
  const possuiSeguro = dadosColeta.possuiSeguro === true;
  const blindagemTemDados = despesas > 0;
  const scoreBlindagem = !blindagemTemDados
    ? -1
    : possuiSeguro
      ? 40  // tem seguro mas sem valor exato → parcialmente protegido
      : 0;  // sem seguro → descoberto

  // ── Score Geral ──
  const lista = [scoreLF, scoreInvestimentos, scoreBlindagem].filter(s => s >= 0);
  const scoreGeral = lista.length === 0 ? 0 : Math.round(lista.reduce((a, b) => a + b, 0) / lista.length);

  return {
    scoreLF,
    scoreInvestimentos,
    scoreBlindagem,
    scoreGeral,
    lfTemDados,
    pctIF,
    aaTemDados,
    ativosBonsLabels: ativosBons.map(a => a.label),
    ativosRuinsLabels: ativosRuins.map(a => a.label),
    nBonsCount: ativosBons.length,
    nRuinsCount: ativosRuins.length,
    temRF,
    temRV,
    temExt,
    blindagemTemDados,
    possuiSeguro,
    comecandoDoZero,
  };
}
