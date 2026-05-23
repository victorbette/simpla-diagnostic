import type { Ativo, PlanoAcaoItem } from './types';
export { ALOCACAO_PADRAO } from './types';

let _seq = 0;
export function genId(): string { return `${Date.now().toString(36)}_${(++_seq).toString(36)}`; }
export const formatBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
export const formatPct = (n: number, casas = 1) => `${(n || 0).toFixed(casas).replace('.', ',')}%`;

export function gerarPlanoAcao(ativosAtuais: Ativo[], ativosRecomendados: Ativo[], patrimonio: number): PlanoAcaoItem[] {
  const plano: PlanoAcaoItem[] = [];
  const p = patrimonio || 1;

  for (const rec of ativosRecomendados) {
    const atual = ativosAtuais.find(
      a => a.nome.trim().toLowerCase() === rec.nome.trim().toLowerCase() && a.card === rec.card
    );
    const valorAtualBRL = atual?.valorBRL ?? 0;
    const valorMetaBRL = rec.valorBRL ?? 0;
    const diff = valorMetaBRL - valorAtualBRL;

    let acao: PlanoAcaoItem['acao'];
    if (!atual || valorAtualBRL === 0) {
      acao = 'novo';
    } else if (Math.abs(diff) < 1) {
      acao = 'manter';
    } else if (diff > 0) {
      acao = 'aportar';
    } else {
      acao = Math.abs(diff) >= valorAtualBRL * 0.95 ? 'resgatar_total' : 'resgatar_parcial';
    }

    const movimentacaoBRL = acao === 'manter' ? 0 : Math.round(diff * 100) / 100;
    const abs = Math.abs(movimentacaoBRL);
    const prioridade: PlanoAcaoItem['prioridade'] = abs > p * 0.1 ? 'alta' : abs > p * 0.03 ? 'media' : 'baixa';

    plano.push({ id: genId(), card: rec.card, nomeAtivo: rec.nome, segmento: rec.segmento, acao, valorAtualBRL, valorMetaBRL, movimentacaoBRL, observacao: '', prioridade });
  }

  for (const atual of ativosAtuais) {
    const naRec = ativosRecomendados.find(
      r => r.nome.trim().toLowerCase() === atual.nome.trim().toLowerCase() && r.card === atual.card
    );
    if (!naRec) {
      const abs = atual.valorBRL;
      plano.push({ id: genId(), card: atual.card, nomeAtivo: atual.nome, segmento: atual.segmento, acao: 'resgatar_total', valorAtualBRL: atual.valorBRL, valorMetaBRL: 0, movimentacaoBRL: -atual.valorBRL, observacao: '', prioridade: abs > p * 0.03 ? 'media' : 'baixa' });
    }
  }

  return plano;
}
