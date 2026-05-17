import type { Ativo, ClasseAtivo, ItemPlanoAcao, MacroResumo } from "./types";
import { CLASSES } from "./types";

export function calcularValorBRL(ativo: Ativo, usdBrl = 5): number {
  switch (ativo.classe) {
    case "rf_rapido":
    case "rf_longo":
    case "internacional_rf":
    case "multi":
      return Number(ativo.posicaoBRL) || 0;
    case "rv_acoes":
    case "rv_fiis":
    case "cripto":
      return (Number(ativo.quantidade) || 0) * (Number(ativo.cotacaoBRL) || 0);
    case "internacional_rv":
      return (Number(ativo.quantidade) || 0) * (Number(ativo.cotacaoUSD) || 0) * usdBrl;
    default:
      return 0;
  }
}

export function calcularPatrimonio(ativos: Ativo[], usdBrl = 5): number {
  return ativos.reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
}

export function atualizarPcts(ativos: Ativo[], usdBrl = 5): Ativo[] {
  const total = calcularPatrimonio(ativos, usdBrl);
  return ativos.map((a) => {
    const valorBRL = calcularValorBRL(a, usdBrl);
    return {
      ...a,
      valorBRL,
      pctCarteira: total > 0 ? Math.round((valorBRL / total) * 1000) / 10 : 0,
    };
  });
}

export function derivarMacroResumo(ativos: Ativo[], usdBrl = 5): MacroResumo {
  const total = calcularPatrimonio(ativos, usdBrl);
  if (total <= 0) return { rendaFixa: 0, rendaVariavelBrasil: 0, internacional: 0, multimercados: 0, cripto: 0 };

  function pctClasses(classes: ClasseAtivo[]): number {
    const sum = ativos.filter((a) => classes.includes(a.classe)).reduce((s, a) => s + calcularValorBRL(a, usdBrl), 0);
    return Math.round((sum / total) * 1000) / 10;
  }

  return {
    rendaFixa: pctClasses(["rf_rapido", "rf_longo"]),
    rendaVariavelBrasil: pctClasses(["rv_acoes", "rv_fiis"]),
    internacional: pctClasses(["internacional_rv", "internacional_rf"]),
    multimercados: pctClasses(["multi"]),
    cripto: pctClasses(["cripto"]),
  };
}

type Perfil = "conservador" | "conservador_moderado" | "moderado" | "arrojado";

export const ALOCACAO_PADRAO: Record<Perfil, Record<ClasseAtivo, number>> = {
  conservador: {
    rf_rapido: 50, rf_longo: 42, rv_acoes: 2, rv_fiis: 2,
    internacional_rv: 4, internacional_rf: 0, multi: 0, cripto: 0,
  },
  conservador_moderado: {
    rf_rapido: 35, rf_longo: 43, rv_acoes: 7, rv_fiis: 6,
    internacional_rv: 9, internacional_rf: 0, multi: 0, cripto: 0,
  },
  moderado: {
    rf_rapido: 25, rf_longo: 41, rv_acoes: 13, rv_fiis: 7,
    internacional_rv: 13, internacional_rf: 0, multi: 0, cripto: 1,
  },
  arrojado: {
    rf_rapido: 15, rf_longo: 37, rv_acoes: 20, rv_fiis: 9,
    internacional_rv: 17.5, internacional_rf: 0, multi: 0, cripto: 1.5,
  },
};

export function alocacaoPadraoPorPerfil(perfil: string): Record<ClasseAtivo, number> {
  return ALOCACAO_PADRAO[perfil as Perfil] ?? {
    rf_rapido: 0, rf_longo: 0, rv_acoes: 0, rv_fiis: 0,
    internacional_rv: 0, internacional_rf: 0, multi: 0, cripto: 0,
  };
}

let _idSeq = 0;
export function genId(): string {
  return `${Date.now().toString(36)}_${(++_idSeq).toString(36)}`;
}

export function ativosIniciais(perfil: string | null, patrimonio: number): Ativo[] {
  const padrao = perfil ? alocacaoPadraoPorPerfil(perfil) : null;
  return CLASSES.filter((c) => !padrao || padrao[c.key] > 0).map((c) => ({
    id: genId(),
    classe: c.key,
    nome: c.label,
    valorBRL: padrao ? ((padrao[c.key] / 100) * patrimonio) : 0,
    pctCarteira: 0,
    pctMeta: padrao ? padrao[c.key] : 0,
    valorMetaBRL: padrao ? ((padrao[c.key] / 100) * patrimonio) : 0,
  }));
}

export function gerarPlanoAcao(
  ativosAtuais: Ativo[],
  ativosRecomendados: Ativo[],
  patrimonio: number,
  usdBrl = 5,
): ItemPlanoAcao[] {
  const plano: ItemPlanoAcao[] = [];

  for (const rec of ativosRecomendados) {
    const atual = ativosAtuais.find(
      (a) => a.nome.trim().toLowerCase() === rec.nome.trim().toLowerCase()
    );
    const valorAtualBRL = atual ? calcularValorBRL(atual, usdBrl) : 0;
    const valorMetaBRL = ((rec.pctMeta ?? 0) / 100) * patrimonio;
    const mov = Math.round((valorMetaBRL - valorAtualBRL) * 100) / 100;

    let tipo: ItemPlanoAcao["tipo"] = "manter";
    if (!atual) tipo = "novo_ativo";
    else if (mov > 100) tipo = "aportar";
    else if (mov < -100) {
      tipo = Math.abs(mov) >= valorAtualBRL * 0.95 ? "resgatar_total" : "resgatar_parcial";
    }

    const abs = Math.abs(mov);
    const prioridade: ItemPlanoAcao["prioridade"] =
      abs > patrimonio * 0.1 ? "alta" : abs > patrimonio * 0.03 ? "media" : "baixa";

    plano.push({
      id: genId(),
      classe: rec.classe,
      nomeAtivo: rec.nome,
      tipo,
      valorAtualBRL,
      valorMetaBRL,
      movimentacaoBRL: mov,
      observacao: "",
      prioridade,
    });
  }

  for (const atual of ativosAtuais) {
    const naMeta = ativosRecomendados.find(
      (r) => r.nome.trim().toLowerCase() === atual.nome.trim().toLowerCase()
    );
    if (!naMeta) {
      const vBRL = calcularValorBRL(atual, usdBrl);
      plano.push({
        id: genId(),
        classe: atual.classe,
        nomeAtivo: atual.nome,
        tipo: "resgatar_total",
        valorAtualBRL: vBRL,
        valorMetaBRL: 0,
        movimentacaoBRL: -vBRL,
        observacao: "",
        prioridade: vBRL > patrimonio * 0.03 ? "media" : "baixa",
      });
    }
  }

  return plano;
}

export const formatBRL = (n: number): string =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export const formatPct = (n: number, casas = 1): string =>
  `${(Number(n) || 0).toFixed(casas).replace(".", ",")}%`;
