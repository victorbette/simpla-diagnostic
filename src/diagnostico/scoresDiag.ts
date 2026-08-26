import { ATIVOS_INVESTIMENTO } from "./ativosInvestimento";
import type { DadosColetaDiag, DadosLFDiag } from "./types";
import { calcularIdade } from "@/lib/parseDate";
import { TAXA_LF_PADRAO, taxaMensalDe } from "@/lib/taxasDiag";

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
  nRuinsCount: number;
  pontoDiversificacao: number;
  pontoQualidade: number;
  pilarRF: boolean;
  pilarAcoes: boolean;
  pilarFIIs: boolean;
  pilarGlobal: boolean;
  blindagemTemDados: boolean;
  possuiSeguro: boolean;
  possuiPrevidencia: boolean;
  comecandoDoZero: boolean;
}

export function calcularScoresDiag(
  dadosColeta: DadosColetaDiag,
  dadosLF?: DadosLFDiag,
): ScoresDiag {
  // ── Score Liberdade Financeira ──
  // Usa a mesma lógica e mesma ordem de prioridade de dados que DocLFDiag.tsx
  const idadeAtual    = calcularIdade(dadosColeta.dataNascimento);
  const patrimonioAtual = Number(dadosLF?.patrimonioInicial  ?? dadosColeta.patrimonioFinanceiro) || 0;
  const aporteMensal    = Number(dadosLF?.aporteMensal       ?? dadosColeta.aporteMensal)          || 0;
  const rendaDesejada   = Number(dadosLF?.rendaDesejada      ?? dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMeta       = Number(dadosLF?.idadeAlvo          ?? dadosColeta.idadeMeta)             || 0;

  // Mesma taxa que o relatório LF: IPCA+6% padrão, ou customizada via dadosLF.ajustes
  const usarTaxaCustom  = dadosLF?.ajustes?.usarTaxaCustom ?? false;
  const taxaCustomAnual = dadosLF?.ajustes?.taxaCustomAnual ?? 6.0;
  const TAXA_ANUAL  = usarTaxaCustom ? Math.max(3, taxaCustomAnual) / 100 : TAXA_LF_PADRAO;
  const TAXA_MENSAL = taxaMensalDe(TAXA_ANUAL);

  const patrimonioNec = rendaDesejada > 0 ? (rendaDesejada * 12) / 0.04 : 0;
  const nMeses        = Math.max(0, Math.round((idadeMeta - idadeAtual) * 12));
  const f             = nMeses > 0 ? Math.pow(1 + TAXA_MENSAL, nMeses) : 1;
  const projecao      = nMeses > 0 && isFinite(f)
    ? patrimonioAtual * f + aporteMensal * (f - 1) / TAXA_MENSAL
    : patrimonioAtual;
  const lfTemDados = rendaDesejada > 0 && patrimonioNec > 0 && idadeAtual > 0 && idadeMeta > 0 && idadeMeta > idadeAtual;
  const pctIF      = lfTemDados ? Math.min(100, Math.round(projecao / patrimonioNec * 100)) : 0;
  const scoreLF    = !lfTemDados ? -1 : pctIF;

  // ── Score Investimentos ──
  const comecandoDoZero = dadosColeta.comecandoDoZero === true;
  const ativosMap    = dadosColeta.ativosInvestimento ?? {};
  const ativosDoLead = ATIVOS_INVESTIMENTO.filter(a => ativosMap[a.id] === true);
  const aaTemDados   = comecandoDoZero || ativosDoLead.length > 0;
  const tem = (id: string) => ativosMap[id] === true;

  // Componente 1 — Diversificação (0-40 pts): 4 pilares Simpla, 10 pts cada
  const pilarRF     = tem("tesouro_selic") || tem("fundo_rf") || tem("lci_lca");
  const pilarAcoes  = tem("acoes");
  const pilarFIIs   = tem("fiis");
  const pilarGlobal = tem("renda_fixa_eua") || tem("stocks") || tem("reits") || tem("etfs_exterior") || tem("cripto");
  const pontoDiversificacao = (pilarRF ? 10 : 0) + (pilarAcoes ? 10 : 0) + (pilarFIIs ? 10 : 0) + (pilarGlobal ? 10 : 0);

  // Componente 2 — Qualidade dos Ativos (0-60 pts): começa em 60, desconta por ativos ruins
  const ativosPouco = ativosDoLead.filter(a => a.qualidade === "pouco_atrativo");
  const ativosNada  = ativosDoLead.filter(a => a.qualidade === "nada_atrativo");
  const pontoQualidade = Math.max(0, 60 - ativosPouco.length * 8 - ativosNada.length * 15);
  const nRuinsCount = ativosPouco.length + ativosNada.length;

  const pontos = Math.min(100, pontoDiversificacao + pontoQualidade);
  const scoreInvestimentos = comecandoDoZero ? 0 : (!aaTemDados ? -1 : pontos);

  // ── Score Blindagem ──
  const possuiSeguro      = dadosColeta.possuiSeguro === true;
  const possuiPrevidencia = dadosColeta.temPrevidencia === true;
  const blindagemTemDados = dadosColeta.possuiSeguro !== undefined || dadosColeta.temPrevidencia !== undefined;

  let scoreBlindagem: number;
  if (!blindagemTemDados) {
    scoreBlindagem = -1;                       // não avaliado
  } else if (possuiSeguro && possuiPrevidencia) {
    scoreBlindagem = 80;                       // ambos → Precisa Desenvolver (tamanho das coberturas a revisar)
  } else if (possuiSeguro && !possuiPrevidencia) {
    scoreBlindagem = 40;                       // só seguro → Atenção Urgente
  } else if (!possuiSeguro && possuiPrevidencia) {
    scoreBlindagem = 30;                       // só previdência → Crítico
  } else {
    scoreBlindagem = 0;                        // nenhum → Crítico
  }

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
    nRuinsCount,
    pontoDiversificacao,
    pontoQualidade,
    pilarRF,
    pilarAcoes,
    pilarFIIs,
    pilarGlobal,
    blindagemTemDados,
    possuiSeguro,
    possuiPrevidencia,
    comecandoDoZero,
  };
}
