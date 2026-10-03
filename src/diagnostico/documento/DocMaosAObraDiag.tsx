import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { nomeCliente: string; }

export function DocMaosAObraDiag({ nomeCliente }: Props) {
  const primeiroNome = nomeCliente.split(" ")[0];

  const paragrafos = [
    `Este relatório percorreu três dimensões do seu planejamento: onde a sua trajetória atual te leva em termos de independência financeira, como a sua carteira está calibrada para os objetivos que você declarou e o quanto a sua proteção patrimonial acompanha o que você já construiu. Cada uma dessas dimensões tem um impacto direto sobre a outra — e é a combinação das três que define, ao final, se o futuro que você imagina vai se concretizar ou ficar no campo das intenções.`,

    `Ter esse diagnóstico em mãos é um privilégio que a maioria das pessoas nunca teve. A maioria chega aos 60 anos sem jamais ter parado para olhar de frente para os números que vão definir o resto da vida. Você fez isso agora — e isso conta. Mas o diagnóstico não transforma nada sozinho. O que transforma é a decisão que vem depois dele.`,

    `Adiar a ação depois de uma análise como esta não é neutralidade — é uma escolha ativa, com um custo muito concreto. Cada mês sem uma estratégia de investimentos calibrada é um mês em que os juros compostos não estão trabalhando com a eficiência que deveriam. Cada mês sem a blindagem correta é um mês em que um único evento inesperado pode desfazer anos de esforço. E cada mês sem um planejamento sucessório é um mês em que parte do que você construiu está sujeito a ser consumido por um processo que você tinha como evitar.`,

    `O trabalho de análise está feito. O cenário está mapeado, os números estão na mesa e os pontos de atenção estão identificados. O que falta não é mais informação — é a estruturação da estratégia que vai transformar esse diagnóstico em resultado. E essa é exatamente a próxima etapa: montar o plano que conecta onde você está hoje ao futuro que você quer construir, com cada peça no lugar certo.`,

    `A jornada começa agora. Não quando as condições forem perfeitas, não quando o mercado estiver "mais calmo", não quando sobrar tempo. Agora — porque o tempo é o único recurso que, uma vez desperdiçado, não tem como ser reposto.`,
  ];

  const blocos: BlocoDoc[] = [
    {
      chave: "conteudo",
      node: (
        <>
          <p style={{ fontSize: 18, fontWeight: 700, color: DOC.ink, margin: "6px 0 22px" }}>
            Olá, {primeiroNome}!
          </p>

          {paragrafos.map((texto, i) => (
            <p key={i} style={{
              ...TEXTO_CORPO,
              fontSize: 13,
              textAlign: "justify" as const,
              marginTop: i === 0 ? 0 : 18,
              marginBottom: 0,
            }}>
              {texto}
            </p>
          ))}
        </>
      ),
    },
  ];

  return (
    <PaginaDocFluidaDiag
      titulo="Mãos à Obra"
      nomeCliente={nomeCliente}
      blocos={blocos}
    />
  );
}
