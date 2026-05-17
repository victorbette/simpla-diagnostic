import type { AtivoItem, MacroAlocacao, MacroClassKey, PlanoAcaoItem } from "./types";
import { macroVazia } from "./types";

export function valorAtivoBRL(a: AtivoItem, usdBrl = 5): number {
  if (a.klass === "internacional") {
    return (Number(a.quantidade) || 0) * (Number(a.cotacaoUSD) || 0) * usdBrl;
  }
  if (a.klass === "rv") {
    return (Number(a.quantidade) || 0) * (Number(a.cotacaoBRL) || 0);
  }
  if (a.klass === "cripto") {
    const byQtde = (Number(a.quantidade) || 0) * (Number(a.cotacaoBRL) || 0);
    return byQtde > 0 ? byQtde : (Number(a.posicaoBRL) || 0);
  }
  return Number(a.posicaoBRL) || 0;
}

export function totalPatrimonioBRL(ativos: AtivoItem[], usdBrl = 5): number {
  return ativos.reduce((s, a) => s + valorAtivoBRL(a, usdBrl), 0);
}

export function derivarMacro(ativos: AtivoItem[], usdBrl = 5): MacroAlocacao {
  const result = macroVazia();
  const total = totalPatrimonioBRL(ativos, usdBrl);
  if (total <= 0) return result;
  for (const a of ativos) {
    const v = valorAtivoBRL(a, usdBrl);
    result[a.klass] = (result[a.klass] || 0) + (v / total) * 100;
  }
  (Object.keys(result) as MacroClassKey[]).forEach((k) => {
    result[k] = Math.round((result[k] || 0) * 100) / 100;
  });
  return result;
}

export function derivarMacroPorMeta(ativosMeta: AtivoItem[]): MacroAlocacao {
  const result = macroVazia();
  for (const a of ativosMeta) {
    result[a.klass] = Math.round(((result[a.klass] || 0) + a.pctMeta) * 100) / 100;
  }
  return result;
}

export function atualizarPctAtual(ativos: AtivoItem[], usdBrl = 5): AtivoItem[] {
  const total = totalPatrimonioBRL(ativos, usdBrl);
  if (total <= 0) return ativos.map((a) => ({ ...a, pctAtual: 0 }));
  return ativos.map((a) => ({
    ...a,
    pctAtual: Math.round((valorAtivoBRL(a, usdBrl) / total) * 1000) / 10,
  }));
}

export const ALOCACAO_ALVO_POR_PERFIL: Record<string, MacroAlocacao> = {
  conservador:         { rf_pos: 50, rf_inflacao: 42, multi: 0, rv: 4,  internacional: 4,    cripto: 0   },
  conservador_moderado:{ rf_pos: 35, rf_inflacao: 43, multi: 0, rv: 13, internacional: 9,    cripto: 0   },
  moderado:            { rf_pos: 25, rf_inflacao: 41, multi: 0, rv: 20, internacional: 13,   cripto: 1   },
  arrojado:            { rf_pos: 15, rf_inflacao: 37, multi: 0, rv: 29, internacional: 17.5, cripto: 1.5 },
};

export function gerarPlanoAcao(
  ativosAtuais: AtivoItem[],
  ativosMeta: AtivoItem[],
  patrimonio: number,
  usdBrl = 5,
): PlanoAcaoItem[] {
  const plano: PlanoAcaoItem[] = [];

  for (const meta of ativosMeta) {
    const atual = ativosAtuais.find(
      (a) => a.nome.trim().toLowerCase() === meta.nome.trim().toLowerCase()
    );
    const valorAtualBRL = atual ? valorAtivoBRL(atual, usdBrl) : 0;
    const valorMetaBRL = (meta.pctMeta / 100) * patrimonio;
    const movimentacao = Math.round((valorMetaBRL - valorAtualBRL) * 100) / 100;

    let acao: PlanoAcaoItem["acao"] = "manter";
    if (!atual) acao = "novo";
    else if (movimentacao > 100) acao = "aportar";
    else if (movimentacao < -100) {
      acao = Math.abs(movimentacao) >= valorAtualBRL * 0.95 ? "resgatar_total" : "resgatar_parcial";
    }

    plano.push({ ativoId: meta.id, nomeAtivo: meta.nome, klass: meta.klass, acao, valorAtualBRL, valorMetaBRL, movimentacaoBRL: movimentacao, observacao: "" });
  }

  for (const atual of ativosAtuais) {
    const naMeta = ativosMeta.find(
      (m) => m.nome.trim().toLowerCase() === atual.nome.trim().toLowerCase()
    );
    if (!naMeta) {
      const vBRL = valorAtivoBRL(atual, usdBrl);
      plano.push({ ativoId: atual.id, nomeAtivo: atual.nome, klass: atual.klass, acao: "resgatar_total", valorAtualBRL: vBRL, valorMetaBRL: 0, movimentacaoBRL: -vBRL, observacao: "" });
    }
  }

  return plano;
}

export const formatBRL = (n: number) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatPct = (n: number) => `${(Number(n) || 0).toFixed(1)}%`;
