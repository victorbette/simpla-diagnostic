export interface TextoAtivo {
  positivo?: string;
  negativo?: string;
  atencao?: string;
}

export const ATIVOS_TEXTOS: Partial<Record<string, TextoAtivo>> = {

  // ── RENDA FIXA ─────────────────────────────────────────────────────────────

  tesouro: {
    positivo: `O Tesouro Direto é uma das opções mais seguras e eficientes do mercado brasileiro. Emitido pelo Governo Federal, oferece garantia máxima, boa liquidez e rentabilidade transparente. É uma excelente base para a reserva de segurança e para objetivos de médio e longo prazo.`,
  },

  cdb: {
    atencao: `CDBs são bons ativos de renda fixa, desde que emitidos por instituições sólidas e confiáveis. Prefira sempre emissores com boa classificação de risco e evite concentrar recursos em bancos pequenos ou pouco conhecidos, mesmo que ofereçam taxas mais atrativas. A proteção do FGC cobre até R$ 250 mil por CPF por instituição, o que torna a diversificação entre emissores uma prática recomendada.`,
  },

  lci_lca: {
    positivo: `LCI e LCA são ativos isentos de Imposto de Renda para pessoa física — o que aumenta significativamente o retorno líquido. São uma excelente opção para quem busca eficiência fiscal dentro da renda fixa.`,
  },

  fundo_rf: {
    positivo: `Fundos de renda fixa bem selecionados oferecem diversificação e gestão profissional. Verifique sempre as taxas de administração — fundos com taxas acima de 0,5% ao ano tendem a prejudicar o retorno líquido no longo prazo.`,
    negativo: `Fundos de renda fixa com taxas de administração elevadas ou com gestão pouco eficiente podem render abaixo do CDI. Em muitos casos, investir diretamente em Tesouro ou CDBs de boa qualidade seria mais vantajoso.`,
  },

  poupanca: {
    negativo: `A poupança é o investimento mais popular do Brasil — mas também um dos menos eficientes. Sua rentabilidade é limitada por lei (0,5% ao mês + TR quando a Selic está acima de 8,5%), o que na prática significa perda de poder de compra em cenários de inflação mais alta.

Existem alternativas igualmente seguras, com proteção do FGC, que rendem significativamente mais — como o Tesouro Selic e CDBs de liquidez diária. Migrar da poupança para essas opções é uma das mudanças mais simples e impactantes que um investidor pode fazer.`,
  },

  coe: {
    negativo: `COEs (Certificados de Operações Estruturadas) são produtos complexos que combinam renda fixa e derivativos. Na maioria dos casos, sua estrutura favorece mais a instituição emissora do que o investidor — com retornos limitados, baixa liquidez e dificuldade de avaliação real do risco. Requerem análise cuidadosa antes de qualquer aplicação.`,
  },

  fundo_multimercado: {
    positivo: `Fundos multimercado de qualidade, com gestores consistentes e histórico comprovado, podem agregar diversificação e retornos acima do CDI. São uma boa opção para quem busca exposição a diferentes estratégias com gestão profissional.`,
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

  cri_cra: {
    positivo: `CRIs e CRAs são títulos de renda fixa isentos de IR para pessoa física, com lastro em recebíveis imobiliários ou do agronegócio. Oferecem boa rentabilidade e isenção fiscal, mas exigem atenção à qualidade do emissor e à liquidez, que tende a ser menor que outros ativos.`,
    negativo: `CRIs e CRAs não contam com proteção do FGC e têm liquidez reduzida no mercado secundário. A análise criteriosa do emissor e do risco de crédito é fundamental — a isenção fiscal só agrega valor quando o risco é adequadamente remunerado.`,
  },

  debentures: {
    positivo: `Debêntures incentivadas são isentas de IR e podem oferecer rentabilidades atrativas. A qualidade do emissor é fundamental — prefira empresas com boa classificação de risco e verifique sempre a liquidez no mercado secundário.`,
    negativo: `Debêntures sem isenção fiscal ou de emissores com risco elevado podem não compensar frente a alternativas mais seguras. Avaliar o rating de crédito e a liquidez é essencial antes de investir.`,
  },

  // ── RENDA VARIÁVEL ──────────────────────────────────────────────────────────

  fundo_acoes: {
    positivo: `Fundos de ações com gestão ativa e histórico consistente podem ser uma boa forma de ter exposição à renda variável com gestão profissional. Avalie sempre as taxas de administração e performance em relação ao benchmark.`,
    negativo: `Fundos de ações com taxas elevadas ou desempenho abaixo do Ibovespa de forma consistente destroem valor. Em muitos casos, ETFs de índice com taxas menores entregam resultados superiores no longo prazo.`,
  },

  fiagro: {
    positivo: `FIAGROs são fundos voltados para o agronegócio, com distribuição mensal de rendimentos isentos de IR para pessoa física. São uma forma de diversificar em ativos reais com geração de renda.`,
    negativo: `FIAGROs ainda são uma classe relativamente nova no mercado brasileiro. Avalie com cuidado a qualidade da carteira, a gestora e o histórico de inadimplência antes de alocar recursos.`,
  },

  acoes: {
    positivo: `Ter ações na carteira é fundamental para quem busca crescimento patrimonial no longo prazo. Empresas sólidas, com bons fundamentos e posição competitiva, tendem a criar valor consistente ao longo dos anos. A chave é a seleção criteriosa e a diversificação.`,
  },

  fiis: {
    positivo: `FIIs (Fundos Imobiliários) são uma excelente forma de ter exposição ao mercado imobiliário com liquidez e distribuição mensal de rendimentos isentos de IR. São um componente importante de carteiras que buscam renda passiva.`,
  },

  etfs: {
    positivo: `ETFs são uma das ferramentas mais eficientes para diversificação com baixo custo. Permitem exposição a índices inteiros — brasileiro ou internacional — com taxas de administração muito menores que fundos ativos. São excelentes para investidores que buscam eficiência e simplicidade.`,
  },

  // ── EXTERIOR ───────────────────────────────────────────────────────────────

  exterior: {
    positivo: `Ter exposição ao exterior é essencial para uma carteira verdadeiramente diversificada. Além de acessar as maiores empresas e mercados do mundo, protege o patrimônio contra os riscos específicos do Brasil — inflação, câmbio e instabilidade política.`,
  },

  // ── CRIPTO ─────────────────────────────────────────────────────────────────

  cripto: {
    positivo: `Uma alocação pequena em criptoativos pode agregar diversificação a carteiras com perfil mais arrojado. Bitcoin e Ethereum, em particular, têm ganhado reconhecimento como reservas de valor alternativas. O importante é manter a exposição dentro de um percentual adequado ao seu perfil.`,
  },
};
