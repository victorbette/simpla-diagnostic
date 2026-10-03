import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { nomeCliente: string; }

export function DocMaosAObraDiag({ nomeCliente }: Props) {
  const primeiroNome = nomeCliente.split(" ")[0];

  const blocos: BlocoDoc[] = [
    {
      chave: "conteudo",
      node: (
        <>
          <p style={{ fontSize: 18, fontWeight: 700, color: DOC.ink, margin: "6px 0 22px" }}>
            Olá, {primeiroNome}!
          </p>

          <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
            O diagnóstico nos deu clareza absoluta: temos exatamente o tamanho da rota para a sua independência financeira e encontramos o ponto cego da sua proteção patrimonial. A partir de agora, o meu trabalho é estruturar a estratégia de investimentos para acelerar a sua meta e desenhar a blindagem correta para que nenhum imprevisto tire esse plano do trilho. É exatamente esse plano de execução que vamos desenhar a quatro mãos a partir de hoje.
          </p>
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
