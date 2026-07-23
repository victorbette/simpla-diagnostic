export interface TextoAtivo {
  positivo?: string;
  negativo?: string;
  dica?: string;
}

export const ATIVOS_TEXTOS: Partial<Record<string, TextoAtivo>> = {

  tesouro: {
    positivo: `O Tesouro Direto é uma das melhores opções de renda fixa disponíveis no Brasil.
Emitido pelo governo federal, oferece segurança máxima, rendimento acima da inflação e
liquidez diária. É a base ideal para quem quer proteger e fazer o dinheiro crescer com segurança.`,
    dica: `Priorize o Tesouro IPCA+ para proteção de longo prazo e o Tesouro Selic para reserva de emergência.`,
  },

  cdb: {
    positivo: `CDBs de bancos sólidos são excelentes para renda fixa, com proteção do FGC até
R$250 mil por instituição. Podem render acima do CDI e são uma ótima alternativa ao Tesouro
para diversificação em renda fixa.`,
    dica: `Prefira CDBs que rendem 100% do CDI ou mais e verifique sempre a solidez do banco emissor.`,
  },

  lci_lca: {
    positivo: `LCI e LCA são isentos de Imposto de Renda para pessoas físicas, o que aumenta
o rendimento líquido. São emitidos por bancos e têm proteção do FGC. Ótima opção para
complementar a renda fixa com eficiência fiscal.`,
  },

  fundo_rf: {
    positivo: `Fundos de renda fixa de qualidade oferecem diversificação e gestão profissional
dentro da classe. São acessíveis e permitem investir em títulos que individualmente
exigiriam valores maiores.`,
    dica: `Atenção às taxas de administração — prefira fundos com taxa abaixo de 0,5% ao ano.`,
  },

  poupanca: {
    positivo: `A poupança tem alta liquidez e segurança, sendo garantida pelo FGC.`,
    negativo: `O grande problema da poupança é o rendimento muito baixo — historicamente abaixo
da inflação. Quem deixa dinheiro na poupança por muitos anos perde poder de compra ao longo
do tempo. Com as mesmas características de segurança, existem opções como CDB, LCI ou
Tesouro Selic que rendem significativamente mais.`,
    dica: `Use a poupança apenas para o dinheiro que você pode precisar de imediato. O restante
pode render muito mais em outras aplicações.`,
  },

  coe: {
    negativo: `COEs (Certificados de Operações Estruturadas) costumam ter estruturas complexas,
pouco transparentes e taxas embutidas elevadas. Na prática, a maioria não entrega o retorno
prometido e o cliente fica preso por longos períodos sem liquidez. São produtos que
beneficiam mais quem vende do que quem compra.`,
    dica: `Evite COEs e prefira investimentos mais simples e transparentes onde você entende
exatamente o que está comprando.`,
  },

  fundo_multimercado: {
    negativo: `Fundos multimercado cobram taxas de administração e performance elevadas, que
corroem o rendimento ao longo do tempo. A maioria não consegue superar o CDI de forma
consistente após os custos. O investidor paga caro por uma gestão que muitas vezes não compensa.`,
    dica: `Se quiser diversificação, considere montar você mesmo uma carteira com ativos diretos,
pagando menos taxas.`,
  },

  fundo_alternativo: {
    negativo: `Fundos alternativos como os de precatórios, direitos creditórios ou estratégias
exóticas carregam riscos difíceis de avaliar e baixa liquidez. Muitas vezes são vendidos
com promessas de altos retornos que não se concretizam. São produtos de alto risco e
baixa transparência.`,
  },

  fundo_cetipado: {
    negativo: `Fundos cetipados (fechados) não têm liquidez diária e podem ter taxa de saída
elevada. O cotista fica preso e sem poder sair quando precisa ou quando o mercado muda.
Não é a estrutura mais adequada para a maioria dos investidores.`,
  },

  cri_cra: {
    negativo: `CRI (Certificado de Recebíveis Imobiliários) e CRA (Certificado de Recebíveis do Agronegócio)
são isentos de IR, mas escondem riscos que poucos percebem: não têm proteção do FGC, possuem
baixíssima liquidez e dependem da saúde financeira dos emissores privados. Em momentos de crise,
podem ser difíceis de vender e o risco de calote é real. A isenção fiscal não compensa esses
riscos para a maioria dos investidores.`,
    dica: `Se quiser ativos isentos de IR com mais segurança, prefira LCI ou LCA que têm proteção do FGC e maior liquidez.`,
  },

  debentures: {
    negativo: `Debêntures são títulos de dívida emitidos por empresas privadas. Embora algumas debêntures
incentivadas sejam isentas de IR, o risco de crédito da empresa emissora é elevado e não há proteção
do FGC. A liquidez no mercado secundário costuma ser muito baixa, o que significa que você pode ficar
preso no ativo se precisar do dinheiro antes do vencimento. Para a maioria dos investidores, o risco
não compensa o retorno.`,
    dica: `Prefira títulos públicos ou CDBs de bancos sólidos para renda fixa. Se quiser isenção de IR, LCI e LCA são mais seguras.`,
  },

  produto_estruturado: {
    negativo: `Produtos estruturados geralmente combinam renda fixa com derivativos de forma
complexa. As taxas são altas, a transparência é baixa e o risco pode ser maior do que aparenta.
São criados para gerar margem para as instituições, não necessariamente para beneficiar
o investidor.`,
    dica: `Prefira produtos simples onde você entende completamente como o dinheiro está sendo
investido e quais são os riscos reais.`,
  },

  acoes: {
    positivo: `Ter ações na carteira é fundamental para quem quer construir patrimônio no longo
prazo. As melhores empresas do país crescem e distribuem lucros ao longo dos anos. Quem
investe com paciência e consistência tende a ter retornos superiores à renda fixa no longo prazo.`,
    dica: `Diversifique entre setores diferentes e evite concentrar demais em uma única empresa.`,
  },

  fiis: {
    positivo: `Fundos Imobiliários são excelentes para gerar renda passiva mensal, com isenção
de IR nos rendimentos. Funcionam como ser "sócio de imóveis" sem precisar comprar um imóvel
inteiro. Proporcionam exposição ao mercado imobiliário com liquidez e valores acessíveis.`,
    dica: `Prefira FIIs com histórico consistente de distribuição de rendimentos e boa qualidade
dos imóveis no portfólio.`,
  },

  etfs: {
    positivo: `ETFs (Exchange Traded Funds) permitem investir em dezenas ou centenas de ativos
com uma única compra, com taxas muito baixas. São uma das formas mais inteligentes e eficientes
de diversificar a carteira, seguindo índices de mercado com custo mínimo.`,
  },

  fundo_acoes: {
    negativo: `Fundos de ações cobram taxas de administração e performance elevadas que corroem
significativamente os retornos ao longo do tempo. A grande maioria não consegue superar o índice
de referência (Ibovespa) de forma consistente após os custos. Você paga caro por uma gestão que
estatisticamente não entrega resultado superior ao que você obteria investindo diretamente em
ações ou ETFs com custo muito menor.`,
    dica: `Invista diretamente em ações de boas empresas ou em ETFs de ações com taxa de administração baixíssima — você tende a ter resultados melhores com menos custo.`,
  },

  fiagro: {
    negativo: `FIAGROs (Fundos de Investimento nas Cadeias Produtivas do Agronegócio) são um produto
relativamente novo, com histórico curto e riscos complexos ligados ao setor agrícola — inadimplência
de produtores, variações climáticas e de commodity. Diferente dos FIIs imobiliários consolidados,
os FIAGROs têm menor transparência, menos liquidez e um risco que a maioria dos investidores tem
dificuldade de avaliar corretamente.`,
    dica: `Se quiser exposição ao agronegócio, considere ações de empresas sólidas do setor com muito mais transparência e liquidez.`,
  },

  exterior: {
    positivo: `Investir no exterior é uma das formas mais eficazes de proteger o patrimônio.
Além de acessar as maiores empresas do mundo, você se protege de crises locais e da
desvalorização do real. Um patrimônio bem estruturado sempre tem parte investida fora do Brasil.`,
    dica: `BDRs, ETFs internacionais e contas no exterior são formas acessíveis de começar
a diversificar geograficamente.`,
  },

  cripto: {
    positivo: `Criptomoedas representam uma classe de ativo nova e com alto potencial de
crescimento. Bitcoin e outras moedas digitais vêm ganhando espaço como reserva de valor
e alternativa de diversificação. Uma pequena parcela do patrimônio em cripto pode
potencializar os retornos.`,
    dica: `Mantenha a exposição em cripto dentro de um percentual que você tolera perder
temporariamente, dado que é uma classe com alta volatilidade.`,
  },
};

export const TEXTOS_DIVERSIFICACAO = {
  semRV: `Sua carteira não possui ativos de renda variável (ações ou fundos imobiliários). Isso
significa que, no longo prazo, o crescimento do patrimônio tende a ser limitado. A renda
fixa protege e preserva, mas são os ativos de renda variável que multiplicam o patrimônio
ao longo dos anos.`,

  semExt: `Não ter investimentos fora do Brasil deixa o patrimônio mais exposto a riscos
locais — crise política, econômica ou desvalorização do real afetam diretamente quem está
100% no mercado brasileiro. Diversificar internacionalmente é uma proteção importante.`,

  semRF: `Não ter uma base em renda fixa é arriscado. A renda fixa funciona como a âncora
da carteira — é ela que garante liquidez para emergências e estabilidade nos momentos de
crise nos mercados.`,

  boaDiversificacao: `Sua carteira já mostra uma boa diversificação entre diferentes classes
de ativos. Isso é muito positivo — cada classe tem um papel diferente: renda fixa protege,
ações crescem, FIIs geram renda e exterior diversifica. Juntos, formam uma carteira mais resiliente.`,

  excelenteDiversificacao: `Parabéns pela diversificação! Você já tem ativos em todas as principais
classes — renda fixa, renda variável, fundos imobiliários e exterior. Essa é a estrutura que
os melhores investidores utilizam para construir e proteger patrimônio no longo prazo.`,
};
