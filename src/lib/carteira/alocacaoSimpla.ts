// ============================================================================
// Motor de alocação Simpla — réplica da lógica da planilha de alocação.
// Ver docs/planilha-alocacao-mapeamento.md para a engenharia reversa completa.
//
// Dados vêm das tabelas allocation_* do Supabase (última versão publicada);
// este módulo é 100% puro — recebe o modelo e os inputs, devolve a carteira.
// ============================================================================

import type { Ativo, CardId } from './types';
import { genId } from './calculos';

// ─── Tipos do modelo (espelho das tabelas allocation_*) ──────────────────────
export interface AllocationBand { nome: string; min_patrimonio: number; ordem: number }
export interface AllocationMatrixRow { faixa: string; perfil: string; classe: string; pct: number }
export interface AllocationProduct { faixa: string; perfil: string; classe: string; nome: string; is_fundo: boolean; ordem: number }
export interface AssetPrice { ticker: string; classe: string; preco_teto: number | null; preco_hoje: number | null }

export interface AllocationModel {
  versionId: string;
  publishedAt: string;
  bands: AllocationBand[];
  matrix: AllocationMatrixRow[];
  products: AllocationProduct[];
  prices: AssetPrice[];
}

// ─── Classes canônicas e mapeamentos ─────────────────────────────────────────
export const CLASSES = [
  'Renda Fixa pós curta', 'Renda fixa pós longa', 'IPCA Curto', 'IPCA Longo',
  'Infra IPCA', 'Infra CDI', 'Prefixado', 'Ações', 'FIIs', 'Exterior', 'Bitcoin',
] as const;
export type Classe = typeof CLASSES[number];

const CLASSES_COM_PRECO = new Set<string>(['Ações', 'FIIs']);

// Planilha usa rótulos com espaço; o suitability do app usa snake_case.
const PERFIL_APP_TO_PLANILHA: Record<string, string> = {
  conservador: 'Conservador',
  conservador_moderado: 'Conservador Moderado',
  moderado: 'Moderado',
  arrojado: 'Arrojado',
};

// 11 classes da planilha → 6 cards da ferramenta de carteira.
export const CLASSE_TO_CARD: Record<Classe, CardId> = {
  'Renda Fixa pós curta': 'resgate_rapido',
  'Renda fixa pós longa': 'resgate_longo',
  'IPCA Curto':           'resgate_longo',
  'IPCA Longo':           'resgate_longo',
  'Infra IPCA':           'resgate_longo',
  'Infra CDI':            'resgate_longo',
  'Prefixado':            'resgate_longo',
  'Ações':                'acoes',
  'FIIs':                 'fiis',
  'Exterior':             'exterior',
  'Bitcoin':              'cripto',
};

// Segmento sugerido para os ativos gerados, por classe (ver CARD_META.segmentos).
const CLASSE_TO_SEGMENTO: Record<Classe, string> = {
  'Renda Fixa pós curta': 'Pós-fixado',
  'Renda fixa pós longa': 'Pós-fixado',
  'IPCA Curto':           'Inflação',
  'IPCA Longo':           'Inflação',
  'Infra IPCA':           'Inflação',
  'Infra CDI':            'Pós-fixado',
  'Prefixado':            'Prefixado',
  'Ações':                '',
  'FIIs':                 '',
  'Exterior':             'Renda Variável',
  'Bitcoin':              '',
};

// ─── Resultado do cálculo ─────────────────────────────────────────────────────
export type RecomendacaoPreco = 'comprar' | 'aguardar' | 'nao_cadastrado';

export interface ProdutoRecomendado {
  nome: string;
  classe: Classe;
  card: CardId;
  segmento: string;
  pctNaClasse: number;      // 0..1 dentro da classe
  valorBRL: number;
  recomendacao?: RecomendacaoPreco;  // só para Ações/FIIs
}

export interface ClasseRecomendada {
  classe: Classe;
  card: CardId;
  pct: number;              // 0..1 do patrimônio investido
  valorBRL: number;
  produtos: ProdutoRecomendado[];
}

export interface RecomendacaoSimpla {
  ok: true;
  faixa: string;
  perfilPlanilha: string;
  reservaEmergencia: number;
  patrimonioInvestido: number;
  classes: ClasseRecomendada[];
}

export interface RecomendacaoErro {
  ok: false;
  motivo: 'abaixo_minimo' | 'perfil_indisponivel' | 'perfil_invalido';
  mensagem: string;
  faixa?: string;
}

export interface InputRecomendacao {
  patrimonioTotal: number;       // patrimônio total do cliente (define a faixa)
  perfil: string;                // snake_case do suitability do app
  custoVidaMensal?: number;
  mesesReserva?: number;
}

// ─── Regras da planilha ───────────────────────────────────────────────────────

/** Faixa pelo patrimônio TOTAL: maior mínimo ≤ patrimônio (LOOKUP do Painel). */
export function determinarFaixa(patrimonioTotal: number, bands: AllocationBand[]): string | null {
  const ordenadas = [...bands].sort((a, b) => a.min_patrimonio - b.min_patrimonio);
  let atual: string | null = null;
  for (const b of ordenadas) {
    if (patrimonioTotal >= b.min_patrimonio) atual = b.nome;
  }
  return atual;
}

/** Recomendação Comprar/Aguardar de um ticker (Preço Teto > Preço de Hoje). */
export function recomendacaoTicker(nome: string, prices: AssetPrice[]): RecomendacaoPreco {
  const p = prices.find((x) => x.ticker === nome);
  if (!p || p.preco_teto == null || p.preco_hoje == null) return 'nao_cadastrado';
  return p.preco_teto > p.preco_hoje ? 'comprar' : 'aguardar';
}

/**
 * Pesos dos produtos dentro de uma classe:
 * - Ações/FIIs: só quem está "comprar" recebe peso (igualitário entre eles);
 * - demais classes: se há fundos (is_fundo) E não-fundos, fundos dividem 70% e
 *   os demais 30%; caso contrário, divisão igualitária.
 */
export function pesosNaClasse(
  produtos: AllocationProduct[], classe: string, prices: AssetPrice[],
): { produto: AllocationProduct; pct: number; recomendacao?: RecomendacaoPreco }[] {
  if (produtos.length === 0) return [];

  if (CLASSES_COM_PRECO.has(classe)) {
    const recs = produtos.map((p) => ({ produto: p, recomendacao: recomendacaoTicker(p.nome, prices) }));
    const nComprar = recs.filter((r) => r.recomendacao === 'comprar').length;
    return recs.map((r) => ({
      ...r,
      pct: r.recomendacao === 'comprar' && nComprar > 0 ? 1 / nComprar : 0,
    }));
  }

  const fundos = produtos.filter((p) => p.is_fundo);
  const outros = produtos.filter((p) => !p.is_fundo);
  if (fundos.length > 0 && outros.length > 0) {
    return produtos.map((p) => ({
      produto: p,
      pct: p.is_fundo ? 0.7 / fundos.length : 0.3 / outros.length,
    }));
  }
  return produtos.map((p) => ({ produto: p, pct: 1 / produtos.length }));
}

/** Fluxo completo Painel → Resultado Final da planilha. */
export function calcularRecomendacao(
  model: AllocationModel, input: InputRecomendacao,
): RecomendacaoSimpla | RecomendacaoErro {
  const perfilPlanilha = PERFIL_APP_TO_PLANILHA[input.perfil];
  if (!perfilPlanilha) {
    return { ok: false, motivo: 'perfil_invalido', mensagem: `Perfil desconhecido: ${input.perfil}` };
  }

  const faixa = determinarFaixa(input.patrimonioTotal, model.bands);
  if (!faixa) {
    const minimo = Math.min(...model.bands.map((b) => b.min_patrimonio));
    return {
      ok: false, motivo: 'abaixo_minimo',
      mensagem: `Patrimônio abaixo do mínimo atendido (R$ ${minimo.toLocaleString('pt-BR')}).`,
    };
  }

  const linhas = model.matrix.filter((m) => m.faixa === faixa && m.perfil === perfilPlanilha);
  if (linhas.length === 0) {
    return {
      ok: false, motivo: 'perfil_indisponivel', faixa,
      mensagem: `Combinação não disponível para esta faixa (${faixa} × ${perfilPlanilha}) — escolha outro perfil.`,
    };
  }

  const reservaEmergencia = Math.max(0, (input.custoVidaMensal ?? 0) * (input.mesesReserva ?? 0));
  const patrimonioInvestido = Math.max(0, input.patrimonioTotal - reservaEmergencia);

  const classes: ClasseRecomendada[] = CLASSES.map((classe) => {
    const pct = linhas.find((l) => l.classe === classe)?.pct ?? 0;
    const valorBRL = pct * patrimonioInvestido;
    const card = CLASSE_TO_CARD[classe];
    const bloco = model.products
      .filter((p) => p.faixa === faixa && p.perfil === perfilPlanilha && p.classe === classe)
      .sort((a, b) => a.ordem - b.ordem);
    const produtos = pesosNaClasse(bloco, classe, model.prices).map((r) => ({
      nome: r.produto.nome,
      classe,
      card,
      segmento: CLASSE_TO_SEGMENTO[classe],
      pctNaClasse: r.pct,
      valorBRL: r.pct * valorBRL,
      recomendacao: r.recomendacao,
    }));
    return { classe, card, pct, valorBRL, produtos };
  });

  return { ok: true, faixa, perfilPlanilha, reservaEmergencia, patrimonioInvestido, classes };
}

// ─── Adaptação para a ferramenta de carteira (6 cards) ────────────────────────

/**
 * Converte a recomendação em alocacaoMeta (% por card sobre o patrimônio META
 * da ferramenta). A reserva de emergência é somada ao Resgate Rápido — na
 * planilha ela fica fora da alocação; aqui o total precisa fechar 100%.
 */
export function paraAlocacaoMeta(
  rec: RecomendacaoSimpla, patrimonioMeta: number,
): Record<CardId, number> {
  const meta: Record<CardId, number> = {
    resgate_longo: 0, resgate_rapido: 0, acoes: 0, fiis: 0, exterior: 0, cripto: 0,
  };
  if (patrimonioMeta <= 0) return meta;
  for (const c of rec.classes) {
    meta[c.card] += (c.valorBRL / patrimonioMeta) * 100;
  }
  meta.resgate_rapido += (rec.reservaEmergencia / patrimonioMeta) * 100;
  for (const k of Object.keys(meta) as CardId[]) meta[k] = Math.round(meta[k] * 100) / 100;
  return meta;
}

/** Gera os ativos recomendados (um por produto com peso > 0) para os cards. */
export function paraAtivosRecomendados(rec: RecomendacaoSimpla): Ativo[] {
  const ativos: Ativo[] = [];
  for (const classe of rec.classes) {
    for (const p of classe.produtos) {
      if (p.pctNaClasse <= 0 || p.valorBRL <= 0) continue;
      ativos.push({
        id: genId(),
        card: p.card,
        nome: p.nome,
        segmento: p.segmento,
        valorBRL: Math.round(p.valorBRL * 100) / 100,
      });
    }
  }
  return ativos;
}
