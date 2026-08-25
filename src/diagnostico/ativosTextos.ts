export interface TextoAtivo {
  opiniao?: string;
  positivo?: string;
  negativo?: string;
  atencao?: string;
}

export const ATIVOS_TEXTOS: Partial<Record<string, TextoAtivo>> = {

  // ── RENDA FIXA ─────────────────────────────────────────────────────────────

  tesouro_selic: {
    opiniao: `O momento é bastante favorável para o Tesouro Selic, principalmente em carteiras de maior patrimônio, como aquelas superiores a R$ 1 milhão. Além de oferecer uma rentabilidade próxima a 100% do CDI, o título apresenta risco de crédito muito baixo, por ser emitido pelo Tesouro Nacional.\n\nEssa combinação de retorno atrativo, elevada liquidez e segurança torna o Tesouro Selic uma alternativa interessante em comparação com ativos bancários e de crédito privado, especialmente quando os emissores privados não oferecem uma remuneração suficiente para compensar o risco adicional.`,
  },

  ipca_curto: {
    opiniao: `Os títulos indexados à inflação de curto prazo sofrem menos com os efeitos da marcação a mercado. O IMA-B 5 é um exemplo ainda mais defensivo, pois possui prazo médio próximo de dois anos, o que contribui para uma volatilidade reduzida.\n\nComo o risco Brasil permanece em patamar elevado, refletido nas altas taxas oferecidas pelos títulos públicos, entendemos que este é um momento atrativo para "travar" bons prêmios acima da inflação. Um bom exemplo é a carteira do SFIX, que apresenta prêmio médio de 8,97% acima da inflação — nível de remuneração que reforça a expectativa de retornos atrativos para os próximos três a cinco anos.`,
  },

  ipca_longo: {
    opiniao: `Os títulos de inflação com vencimentos longos foram prejudicados pela piora das expectativas econômicas para o Brasil. A esperada queda da curva de juros não se concretizou e, com a abertura das taxas, a marcação a mercado pressionou o desempenho desses ativos, que renderam bem abaixo do CDI no primeiro semestre de 2026.\n\nPor isso, recomendamos cautela com títulos voltados ao ganho por marcação a mercado, como o Tesouro IPCA+ 2050. Para o carregamento até o vencimento, o Tesouro IPCA+ 2040 apresenta uma alternativa mais conservadora. Já para quem não deseja manter o investimento por cerca de 14 anos, o ETF PACL11 oferece exposição à classe com maior liquidez e flexibilidade.`,
  },

  prefixado: {
    opiniao: `Os acontecimentos de 2026 tornaram a alocação em títulos prefixados pouco atrativa. A persistência da inflação e, consequentemente, a expectativa de um ritmo mais lento de cortes na Selic reforçam a necessidade de cautela com essa classe.\n\nAlém disso, enquanto houver incerteza em relação ao resultado das eleições e à condução da política econômica, entendemos que o mais prudente é priorizar ativos pós-fixados ou títulos que ofereçam proteção contra a inflação.`,
  },

  fundo_rf: {
    opiniao: `Entendemos que os fundos de investimento são, no cenário atual, a melhor forma de exposição ao crédito privado, pois oferecem carteiras diversificadas e contam com análise profissional contínua.\n\nIsso não os torna imunes a problemas, como os observados entre fevereiro e maio de 2026. Ainda assim, consideramos essa a alternativa mais adequada para reduzir os riscos enquanto buscamos retornos acima do CDI.\n\nA depender do fundo e da estratégia escolhida, podemos esperar rentabilidades entre 103% e 115% do CDI.`,
  },

  // ── GRUPOS (textos compartilhados entre ativos da mesma classe) ────────────

  bancarios: {
    opiniao: `Atualmente, tem sido difícil encontrar taxas muito atrativas em ativos bancários. Por isso, mantemos uma recomendação neutra para a classe.\n\nEm termos de segurança, desde que seja escolhida uma instituição financeira sólida, não vemos motivos relevantes para preocupação. O principal ponto negativo, neste momento, é a baixa atratividade dos retornos oferecidos.`,
  },

  credito_privado: {
    opiniao: `Em crédito privado, é fundamental separar muito bem o joio do trigo. De maneira geral, o período prolongado de Selic elevada aumenta o risco de inadimplência das empresas, e não é coincidência o crescimento do número de recuperações judiciais anunciadas nos últimos dois anos.\n\nPor isso, recomendamos muita cautela no investimento direto em debêntures, CRIs e CRAs. O investidor deve ser bastante criterioso ao avaliar a qualidade do emissor, sua capacidade de pagamento e as garantias oferecidas.\n\nEm termos gerais, a recomendação é evitar a alocação direta nesses ativos, exceto em casos bastante específicos, envolvendo papéis emitidos por grandes empresas, com boa qualidade de crédito e riscos devidamente compreendidos.`,
  },

  acoes_rv: {
    opiniao: `Acreditávamos que as ações estariam entre as classes de investimento mais atrativas de 2026, e essa expectativa se confirmou no primeiro semestre. Nos primeiros meses do ano, a Bolsa brasileira apresentou forte valorização, impulsionada principalmente pela entrada de capital estrangeiro.\n\nEntretanto, o cenário para os próximos meses se tornou mais desafiador. O início da guerra entre Estados Unidos e Irã aumentou a aversão ao risco e provocou a saída de parte desses recursos do mercado brasileiro.\n\nAlém disso, o enfraquecimento da oposição nas eleições de 2026 aumentou a preocupação com a continuidade da atual política econômica. A percepção de menor austeridade fiscal pode manter os juros elevados por mais tempo, reduzindo a atratividade das ações.`,
  },

  fiis_geral: {
    opiniao: `O mercado de fundos imobiliários é composto majoritariamente por investidores pessoa física, o que tende a resultar em movimentos mais lentos do que os observados no mercado de ações. Além disso, a ausência de um fluxo estrangeiro relevante fez com que o IFIX não acompanhasse o desempenho positivo da renda variável no primeiro trimestre de 2026.\n\nEm contrapartida, nos últimos seis meses, os fundos imobiliários apresentaram desempenho superior ao das ações, com uma queda mais moderada. A distribuição recorrente de rendimentos também ajuda a compensar parte da volatilidade no curto prazo.\n\nPor essa razão, nossa preferência atual é levemente maior pelos FIIs do que pelas ações, especialmente para investidores que buscam geração de renda e menor oscilação da carteira.`,
  },

  cdb: {
    opiniao: `Atualmente, tem sido difícil encontrar taxas muito atrativas em ativos bancários. Por isso, mantemos uma recomendação neutra para a classe.\n\nEm termos de segurança, desde que seja escolhida uma instituição financeira sólida, não vemos motivos relevantes para preocupação. O principal ponto negativo, neste momento, é a baixa atratividade dos retornos oferecidos.`,
  },

  lci_lca: {
    opiniao: `Atualmente, tem sido difícil encontrar taxas muito atrativas em ativos bancários. Por isso, mantemos uma recomendação neutra para a classe.\n\nEm termos de segurança, desde que seja escolhida uma instituição financeira sólida, não vemos motivos relevantes para preocupação. O principal ponto negativo, neste momento, é a baixa atratividade dos retornos oferecidos — mesmo com a vantagem da isenção de IR para LCI e LCA.`,
  },

  cri_cra: {
    opiniao: `Em crédito privado, é fundamental separar muito bem o joio do trigo. De maneira geral, o período prolongado de Selic elevada aumenta o risco de inadimplência das empresas, e não é coincidência o crescimento do número de recuperações judiciais anunciadas nos últimos dois anos.\n\nPor isso, recomendamos muita cautela no investimento direto em CRIs e CRAs. O investidor deve ser bastante criterioso ao avaliar a qualidade do emissor, sua capacidade de pagamento e as garantias oferecidas. A recomendação é evitar a alocação direta nesses ativos, exceto em casos bastante específicos, envolvendo papéis emitidos por grandes empresas com boa qualidade de crédito.`,
  },

  debentures: {
    opiniao: `Em crédito privado, é fundamental separar muito bem o joio do trigo. De maneira geral, o período prolongado de Selic elevada aumenta o risco de inadimplência das empresas, e não é coincidência o crescimento do número de recuperações judiciais anunciadas nos últimos dois anos.\n\nPor isso, recomendamos muita cautela no investimento direto em debêntures. O investidor deve ser bastante criterioso ao avaliar a qualidade do emissor, sua capacidade de pagamento e as garantias oferecidas. A recomendação é evitar a alocação direta nesses ativos, exceto em casos bastante específicos, envolvendo papéis emitidos por grandes empresas com boa qualidade de crédito e riscos devidamente compreendidos.`,
  },

  poupanca: {
    negativo: `A poupança é o investimento mais popular do Brasil — mas também um dos menos eficientes. Sua rentabilidade é limitada por lei (0,5% ao mês + TR quando a Selic está acima de 8,5%), o que na prática significa perda de poder de compra em cenários de inflação mais alta. Existem alternativas igualmente seguras, com proteção do FGC, que rendem significativamente mais — como o Tesouro Selic e CDBs de liquidez diária. Migrar da poupança para essas opções é uma das mudanças mais simples e impactantes que um investidor pode fazer.`,
  },

  coe: {
    negativo: `COEs (Certificados de Operações Estruturadas) são produtos complexos que combinam renda fixa e derivativos. Na maioria dos casos, sua estrutura favorece mais a instituição emissora do que o investidor — com retornos limitados, baixa liquidez e dificuldade de avaliação real do risco. Requerem análise cuidadosa antes de qualquer aplicação.`,
  },

  // ── RENDA VARIÁVEL ──────────────────────────────────────────────────────────

  acoes: {
    opiniao: `As blue chips, empresas de maior capitalização, também sofrem com a piora do cenário macroeconômico. Entretanto, sua maior solidez financeira, menor alavancagem e maior capacidade de geração de resultados ajudam a reduzir os impactos desse ambiente.\n\nAlém disso, esse tipo de empresa costuma ser a escolha preferida dos investidores estrangeiros, o que tende a favorecer uma recuperação mais rápida em caso de melhora das expectativas.`,
  },

  small_caps: {
    opiniao: `O ambiente para empresas de menor porte permanece bastante desafiador, principalmente porque muitas delas apresentam níveis mais elevados de alavancagem. Com a Selic em patamar elevado, o aumento das despesas financeiras tem pressionado seus resultados.\n\nAlém disso, em cenários de maior aversão ao risco, empresas com menor solidez tendem a sofrer mais. As small caps também se beneficiam menos da entrada de capital estrangeiro, já que esse tipo de investidor costuma concentrar seus recursos em grandes empresas e índices. Nos últimos seis meses, o índice de small caps acumulou queda de 12,26%, ante uma desvalorização de 1,29% do Ibovespa. Apesar dos preços mais atrativos, entendemos que o momento ainda exige cautela com essa classe.`,
  },

  fiis: {
    opiniao: `Os fundos de papel voltaram a ganhar atratividade com a manutenção da Selic em patamar elevado e o aumento das expectativas de inflação. Embora o último resultado do IPCA tenha ficado abaixo das projeções, as estimativas atuais permanecem superiores às observadas no início do ano.\n\nAlém disso, a continuidade do conflito entre Estados Unidos e Irã mantém o petróleo em níveis desconfortáveis, aumentando os riscos de novas pressões inflacionárias. Nesse cenário, os fundos de papel podem ser priorizados por investidores que buscam rendimentos atrativos no curto prazo e maior proteção contra a inflação.`,
  },

  fii_tijolo: {
    opiniao: `Enquanto os fundos de papel conseguem atravessar com mais tranquilidade períodos de Selic elevada, o comportamento dos fundos de tijolo é bastante diferente. Essa classe depende mais de um ambiente de juros baixos, tanto para favorecer a redução da vacância quanto para estimular a valorização dos imóveis.\n\nOs fundos de tijolo tendem a se destacar em momentos de maior otimismo econômico, mas perdem atratividade quando o cenário exige mais cautela.`,
  },

  etfs: {
    positivo: `ETFs são uma das ferramentas mais eficientes para diversificação com baixo custo. Permitem exposição a índices inteiros — brasileiro ou internacional — com taxas de administração muito menores que fundos ativos. São excelentes para investidores que buscam eficiência e simplicidade.`,
  },

  fundo_acoes: {
    negativo: `Fundos de ações com taxas elevadas ou desempenho abaixo do Ibovespa de forma consistente destroem valor. Em muitos casos, ETFs de índice com taxas menores entregam resultados superiores no longo prazo.`,
  },

  fiagro: {
    negativo: `FIAGROs ainda são uma classe relativamente nova no mercado brasileiro. Avalie com cuidado a qualidade da carteira, a gestora e o histórico de inadimplência antes de alocar recursos.`,
  },

  // ── EXTERIOR ───────────────────────────────────────────────────────────────

  renda_fixa_eua: {
    opiniao: `É importante entender que a renda fixa dos Estados Unidos não oferece retornos tão elevados quanto a brasileira. Esse alinhamento de expectativas é fundamental, já que o investidor brasileiro está acostumado a taxas historicamente mais altas nessa classe.\n\nAinda assim, enxergamos um bom momento para alocação em renda fixa americana, tanto pelo nível atual dos juros nos Estados Unidos quanto pelo patamar do dólar. O principal cuidado está no risco de marcação a mercado negativa em títulos mais longos. Por isso, estruturamos a exposição por meio de fundos e ETFs de curtíssimo prazo, que tendem a apresentar menor volatilidade.`,
  },

  stocks: {
    opiniao: `A recomendação para stocks é uma das mais difíceis de definir no momento, pois existem fatores relevantes que apontam para direções opostas. Pelo lado positivo, temos o dólar em patamar atrativo e os fortes resultados divulgados pelas grandes empresas no primeiro trimestre de 2026.\n\nPelo lado negativo, os valuations elevados exigem resultados cada vez mais expressivos, enquanto a possibilidade de aumento dos juros nos Estados Unidos reduz a atratividade da classe. Diante desse equilíbrio entre riscos e oportunidades, adotamos uma visão neutra para stocks neste momento.`,
  },

  reits: {
    opiniao: `Um dos principais argumentos favoráveis às stocks é a possibilidade de aproveitar o avanço da inteligência artificial. Esse benefício, porém, tende a ser mais limitado nos REITs. Embora alguns segmentos imobiliários possam se beneficiar dessa tendência, o setor de tecnologia, por meio das ações, oferece um potencial de retorno mais elevado.\n\nCom isso, o investidor assume o risco da renda variável, mas com perspectivas de ganhos mais tímidas do que em outras alternativas. Além disso, o mercado imobiliário tende a sofrer mais em períodos de juros elevados, o que reforça nosso viés levemente negativo para a classe.`,
  },

  outros_paises: {
    opiniao: `Em geral, o investidor brasileiro recebe sua renda e concentra seus investimentos no Brasil, o que resulta em uma exposição elevada aos riscos de uma economia emergente. Por isso, acreditamos que os investimentos internacionais devem ser utilizados como instrumento de diversificação, priorizando países com economias mais desenvolvidas, instituições sólidas e maior segurança jurídica.\n\nEntre as alternativas disponíveis, os Estados Unidos se destacam como nossa principal escolha. Dessa forma, não vemos necessidade, neste momento, de ampliar a exposição para outras regiões.`,
  },

  // ── CRIPTO ─────────────────────────────────────────────────────────────────

  cripto: {
    opiniao: `O momento do Bitcoin é marcado por indicadores relevantes apontando para direções opostas. Pelo lado positivo, a forte queda registrada em 2026 levou o ativo a um patamar mais atrativo para compras. Além disso, no último mês, investidores de grande porte, conhecidos como baleias, aumentaram suas posições — movimento que costuma ser interpretado como um sinal favorável de entrada.\n\nEm contrapartida, a perspectiva de juros mais altos nos Estados Unidos reduz o apetite por risco. O Bitcoin também disputa capital com empresas ligadas à inteligência artificial, enquanto as vendas realizadas por Michael Saylor geram preocupação. Diante desse equilíbrio, adotamos um viés neutro, com aportes graduais.`,
  },

  // ── ALTERNATIVOS ─────────────────────────────────────────────────────────

  fundo_multimercado: {
    negativo: `Fundos multimercado com taxas elevadas (administração + performance) ou sem histórico consistente de retorno podem consumir boa parte do rendimento. A escolha do gestor é fundamental nessa categoria.`,
  },

  fundo_alternativo: {
    negativo: `Fundos alternativos pouco conhecidos ou sem histórico robusto representam risco elevado sem a contrapartida adequada de retorno. É essencial avaliar com cuidado a liquidez, as taxas e a solidez da gestora antes de alocar recursos nessa categoria.`,
  },

  fundo_cetipado: {
    negativo: `Fundos exclusivos ou restritos com liquidez limitada e taxas de administração elevadas podem não ser a melhor escolha para a maioria dos investidores. Vale comparar o retorno líquido com alternativas mais simples e transparentes.`,
  },

  produto_estruturado: {
    negativo: `Produtos estruturados geralmente possuem estruturas de remuneração complexas e pouco transparentes, com liquidez reduzida e custos embutidos que nem sempre são evidentes. Exigem análise criteriosa e devem representar apenas uma parcela pequena do portfólio.`,
  },
};
