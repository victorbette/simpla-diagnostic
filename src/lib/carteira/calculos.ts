import type { Ativo, PlanoAcaoItem } from './types';
export { ALOCACAO_PADRAO } from './types';

let _seq = 0;
export function genId(): string { return `${Date.now().toString(36)}_${(++_seq).toString(36)}`; }
export const formatBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
export const formatPct = (n: number, casas = 1) => `${(n || 0).toFixed(casas).replace('.', ',')}%`;

export function gerarPlanoAcao(ativosAtuais: Ativo[], ativosRecomendados: Ativo[], patrimonio: number): PlanoAcaoItem[] {
  const plano: PlanoAcaoItem[] = [];
  const p = patrimonio || 1;

  // Process recommended ativos
  for (const rec of ativosRecomendados) {
    const atual = ativosAtuais.find(a => a.nome.trim().toLowerCase() === rec.nome.trim().toLowerCase());
    const valorAtualBRL = atual?.valorBRL ?? 0;
    const valorMetaBRL = rec.valorBRL;
    const mov = Math.round((valorMetaBRL - valorAtualBRL) * 100) / 100;

    let acao: PlanoAcaoItem['acao'] = 'manter';
    if (!atual) acao = 'novo';
    else if (mov > 100) acao = 'aportar';
    else if (mov < -100) acao = Math.abs(mov) >= valorAtualBRL * 0.95 ? 'resgatar_total' : 'resgatar_parcial';

    const abs = Math.abs(mov);
    const prioridade: PlanoAcaoItem['prioridade'] = abs > p * 0.1 ? 'alta' : abs > p * 0.03 ? 'media' : 'baixa';

    plano.push({ id: genId(), card: rec.card, nomeAtivo: rec.nome, segmento: rec.segmento, acao, valorAtualBRL, valorMetaBRL, movimentacaoBRL: mov, observacao: '', prioridade });
  }

  // Ativos only in atual (not in recommended) → resgatar_total
  for (const atual of ativosAtuais) {
    if (!ativosRecomendados.find(r => r.nome.trim().toLowerCase() === atual.nome.trim().toLowerCase())) {
      const abs = atual.valorBRL;
      plano.push({ id: genId(), card: atual.card, nomeAtivo: atual.nome, segmento: atual.segmento, acao: 'resgatar_total', valorAtualBRL: atual.valorBRL, valorMetaBRL: 0, movimentacaoBRL: -atual.valorBRL, observacao: '', prioridade: abs > p * 0.03 ? 'media' : 'baixa' });
    }
  }

  return plano;
}
