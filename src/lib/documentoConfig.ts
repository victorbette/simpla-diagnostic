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
