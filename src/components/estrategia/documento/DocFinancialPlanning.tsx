import { TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
}

/** Página institucional de abertura — texto fixo da referência v4 (p.3) */
export function DocFinancialPlanning({ nomeCliente }: Props) {
  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Financial Planning" />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          A verdadeira riqueza não se mede apenas pelo saldo acumulado em uma conta bancária, mas
          pela liberdade, segurança e tranquilidade que esse capital é capaz de proporcionar ao
          longo da vida. Alcançar esse patamar, no entanto, não é fruto do acaso ou da simples
          escolha de produtos financeiros isolados. Exige clareza, estratégia e execução
          disciplinada.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          É exatamente aqui que entra o seu <strong>Financial Planning</strong>.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Mais do que um documento, o Financial Planning é o seu mapa estratégico definitivo.
          Trata-se de um planejamento financeiro integral e personalizado, desenvolvido sob um
          modelo de consultoria independente, transparente e absolutamente livre de conflitos de
          interesse. Nosso foco exclusivo é sentar do mesmo lado da mesa que você, garantindo que
          cada decisão técnica tomada hoje esteja milimetricamente alinhada com as suas
          expectativas para o amanhã.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          O mercado financeiro e a economia são ambientes complexos e dinâmicos. Sem um
          direcionamento claro, é comum que investidores percam eficiência ao longo do tempo — seja
          por excesso de impostos, alocações inadequadas ao seu perfil de risco, ou pela falta de
          blindagem contra imprevistos.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Números, planilhas e rentabilidades são apenas ferramentas; o objetivo final do Financial
          Planning é a vida real. Seja para garantir a educação de excelência dos seus filhos,
          estruturar a compra de um novo imóvel, realizar viagens memoráveis, ou garantir uma
          transição segura para a independência financeira em uma idade específica, este plano é o
          motor que viabilizará essas realizações.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Ao adotar este planejamento, você passa a fazer parte de um grupo seleto de investidores
          que detêm o controle total do próprio dinheiro, trabalhando de forma inteligente para
          preservar e multiplicar o seu patrimônio ao longo das gerações.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Em última análise, o propósito do nosso trabalho é cuidar da complexidade técnica do seu
          capital para permitir que você tenha mais tempo livre. Nosso objetivo é que você possa
          direcionar sua energia para o que realmente importa: aumentar a sua renda profissional,
          desfrutar das suas conquistas e, acima de tudo, dedicar-se plenamente à sua família.
        </p>
      </div>
    </PaginaDoc>
  );
}
