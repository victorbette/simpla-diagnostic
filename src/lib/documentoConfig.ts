/* ── Seções opcionais do documento final ─────────────────────────
 * O consultor escolhe, no modal antes de gerar o PDF, quais áreas
 * entram no documento. Capa, sumário, introdução, mãos à obra,
 * disclaimer e contracapa são fixas. O sumário se ajusta à seleção.
 */
export const AREAS_DOCUMENTO = [
  { id: "ponto_partida",           label: "Ponto de Partida",        icone: "ti-map-pin" },
  { id: "liberdade_financeira",    label: "Liberdade Financeira",    icone: "ti-sunset" },
  { id: "asset_allocation",        label: "Asset Allocation",        icone: "ti-chart-pie" },
  { id: "protecao_sucessao",       label: "Proteção e Sucessão",     icone: "ti-shield" },
  { id: "planejamento_tributario", label: "Planejamento Tributário", icone: "ti-receipt" },
  { id: "plano_acao",              label: "Plano de Ação",           icone: "ti-list-check" },
] as const;

export type AreaDocumentoId = (typeof AREAS_DOCUMENTO)[number]["id"];

export type SelecaoSecoes = Record<AreaDocumentoId, boolean>;

export const SELECAO_SECOES_DEFAULT: SelecaoSecoes = Object.fromEntries(
  AREAS_DOCUMENTO.map((a) => [a.id, true]),
) as SelecaoSecoes;

/** Carrega a seleção persistida do cliente, mesclada com o default
 *  (áreas novas adicionadas depois entram marcadas) */
export function carregarSelecaoSecoes(clientId: string): SelecaoSecoes {
  try {
    const salvo = localStorage.getItem(`doc_secoes_${clientId}`);
    if (salvo) return { ...SELECAO_SECOES_DEFAULT, ...(JSON.parse(salvo) as Partial<SelecaoSecoes>) };
  } catch { /**/ }
  return { ...SELECAO_SECOES_DEFAULT };
}

export function salvarSelecaoSecoes(clientId: string, selecao: SelecaoSecoes): void {
  try { localStorage.setItem(`doc_secoes_${clientId}`, JSON.stringify(selecao)); } catch { /**/ }
}

export interface ConfigConsultor {
  nomeCompleto: string;
  credenciais: string;
  descricao: string;
  textoDisclaimer: string;
}

export const CONFIG_CONSULTOR_DEFAULT: ConfigConsultor = {
  nomeCompleto: "Victor Hugo Sudre Bette (CEA)",
  credenciais: "CEA · Consultor de Valores Mobiliários CVM",
  descricao:
    "Victor Bette é Especialista em Investimentos CEA e Consultor de Valores Mobiliários, autorizado pela CVM (Comissão de Valores Mobiliários), além de ser formado em Gestão Financeira com MBA de Expert em Investimentos e Banker pela UNIFATEC.",
  textoDisclaimer:
    "Todas as recomendações aqui apresentadas foram elaboradas pelo consultor de valores mobiliários Victor Hugo Sudre Bette (CEA), com objetivo de orientar e auxiliar o investidor em suas decisões de investimento; portanto, o material não se constitui em oferta de compra e venda de nenhum título ou valor imobiliário contido. O investidor será responsável, de forma exclusiva, pelas suas decisões de investimento e implementação de estratégias financeiras.\n\nO consultor responsável pela elaboração deste relatório declara que segue as regras de conduta expressas nos termos da Resolução CVM nº 19/2021. Além disso, não está em situação que possa afetar a imparcialidade do relatório ou que possa configurar conflito de interesse.\n\nA elaboração desse material se deu de maneira independente e individualizada, e o conteúdo nele divulgado não pode ser copiado, reproduzido ou distribuído, no todo ou em parte, a terceiros, sem autorização prévia.",
};
