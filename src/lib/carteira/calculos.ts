import type { Ativo, PlanoAcaoItem, CardId } from './types';
export { ALOCACAO_PADRAO } from './types';

// ── ID generator ─────────────────────────────────────────────────────────────
let _seq = 0;
export function genId(): string { return `${Date.now().toString(36)}_${(++_seq).toString(36)}`; }

// ── Formatadores ─────────────────────────────────────────────────────────────
export function formatBRL(n: number): string {
  return Number(n || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export function formatPct(n: number, casas = 1): string {
  return `${Number(n || 0).toFixed(casas).replace('.', ',')}%`;
}

// ── Patrimônio total ──────────────────────────────────────────────────────────
export function calcularPatrimonio(ativos: Ativo[]): number {
  return ativos.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
}

// ── Total de um card ──────────────────────────────────────────────────────────
export function totalCard(ativos: Ativo[], cardId: CardId): number {
  return ativos
    .filter(a => a.card === cardId)
    .reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
}

// ── % de um card no patrimônio ────────────────────────────────────────────────
export function pctCard(ativos: Ativo[], cardId: CardId, patrimonio: number): number {
  if (!patrimonio || patrimonio <= 0) return 0;
  return (totalCard(ativos, cardId) / patrimonio) * 100;
}

// ── % de um ativo no patrimônio ───────────────────────────────────────────────
export function pctAtivo(ativo: Ativo, patrimonio: number): number {
  if (!patrimonio || patrimonio <= 0) return 0;
  return ((Number(ativo.valorBRL) || 0) / patrimonio) * 100;
}

// ── Alocação macro (% por grupo) ──────────────────────────────────────────────
export function calcularAlocacaoMacro(ativos: Ativo[], patrimonio: number) {
  const p = patrimonio > 0 ? patrimonio : 1;
  return {
    rendaFixa:     ((totalCard(ativos, 'resgate_longo') + totalCard(ativos, 'resgate_rapido')) / p) * 100,
    rvBrasil:      ((totalCard(ativos, 'acoes') + totalCard(ativos, 'fiis')) / p) * 100,
    internacional: (totalCard(ativos, 'exterior') / p) * 100,
    cripto:        (totalCard(ativos, 'cripto') / p) * 100,
  };
}

// ── Resumo do plano ───────────────────────────────────────────────────────────
export function resumoPlano(plano: PlanoAcaoItem[]) {
  const semManter = plano.filter(i => i.acao !== 'manter');

  const totalAportes = semManter
    .filter(i => i.movimentacaoBRL > 0)
    .reduce((s, i) => s + i.movimentacaoBRL, 0);

  const totalResgates = semManter
    .filter(i => i.movimentacaoBRL < 0)
    .reduce((s, i) => s + Math.abs(i.movimentacaoBRL), 0);

  return {
    totalAportes,
    totalResgates,
    saldoLiquido: totalAportes - totalResgates,
    numMovimentacoes: semManter.length,
  };
}

// ── Plano de ação ─────────────────────────────────────────────────────────────
export function gerarPlanoAcao(
  ativosAtuais: Ativo[],
  ativosRecomendados: Ativo[],
  patrimonio = 0,
): PlanoAcaoItem[] {
  const plano: PlanoAcaoItem[] = [];
  const p = patrimonio > 0 ? patrimonio : calcularPatrimonio(ativosAtuais) || 1;

  for (const rec of ativosRecomendados) {
    if (!rec.nome?.trim()) continue;

    const atual = ativosAtuais.find(a =>
      a.nome.trim().toLowerCase() === rec.nome.trim().toLowerCase() &&
      a.card === rec.card
    );

    const valorAtualBRL = Number(atual?.valorBRL) || 0;
    const valorMetaBRL  = Number(rec.valorBRL)    || 0;
    const diff          = valorMetaBRL - valorAtualBRL;

    let acao: PlanoAcaoItem['acao'];
    let movimentacaoBRL: number;

    if (!atual || valorAtualBRL === 0) {
      acao = 'novo';
      movimentacaoBRL = valorMetaBRL;
    } else if (Math.abs(diff) < 1) {
      acao = 'manter';
      movimentacaoBRL = 0;
    } else if (diff > 0) {
      acao = 'aportar';
      movimentacaoBRL = Math.round(diff * 100) / 100;
    } else {
      const pctResgate = Math.abs(diff) / valorAtualBRL;
      acao = pctResgate >= 0.95 ? 'resgatar_total' : 'resgatar_parcial';
      movimentacaoBRL = Math.round(diff * 100) / 100;
    }

    const abs = Math.abs(movimentacaoBRL);
    const prioridade: PlanoAcaoItem['prioridade'] = abs > p * 0.1 ? 'alta' : abs > p * 0.03 ? 'media' : 'baixa';

    plano.push({
      id: genId(),
      card: rec.card,
      nomeAtivo: rec.nome,
      segmento: rec.segmento,
      acao,
      valorAtualBRL,
      valorMetaBRL,
      movimentacaoBRL,
      observacao: '',
      prioridade,
    });
  }

  // Ativos atuais sem correspondente na recomendada → resgatar_total
  for (const atual of ativosAtuais) {
    if (!atual.nome?.trim()) continue;
    const naRec = ativosRecomendados.find(r =>
      r.nome.trim().toLowerCase() === atual.nome.trim().toLowerCase() &&
      r.card === atual.card
    );
    if (!naRec) {
      const abs = Number(atual.valorBRL) || 0;
      plano.push({
        id: genId(),
        card: atual.card,
        nomeAtivo: atual.nome,
        segmento: atual.segmento,
        acao: 'resgatar_total',
        valorAtualBRL: atual.valorBRL,
        valorMetaBRL: 0,
        movimentacaoBRL: -atual.valorBRL,
        observacao: '',
        prioridade: abs > p * 0.03 ? 'media' : 'baixa',
      });
    }
  }

  return plano;
}
