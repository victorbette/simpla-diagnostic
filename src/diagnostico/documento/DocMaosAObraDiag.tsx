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

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
              Você chegou até aqui — e isso já diz muito sobre quem você é. Muitas pessoas passam a vida inteira sem parar para olhar de verdade para a situação financeira. Você fez diferente. Você teve coragem de encarar os números, entender onde está e o que precisa mudar.
            </p>

            <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
              Mas esse é apenas o começo.
            </p>

            <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
              O diagnóstico que você tem em mãos é uma fotografia do presente. O que vem a seguir é a construção do futuro — e essa é a parte mais importante. Cada dia que passa sem uma estratégia clara é um dia que os juros compostos não estão trabalhando para você da forma que poderiam. Cada mês de atraso na decisão tem um custo real, que não aparece em nenhum extrato, mas que se acumula silenciosamente ao longo dos anos.
            </p>

            <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
              A diferença entre as pessoas que chegam à aposentadoria com liberdade e as que chegam com restrições não está na sorte, nem no salário — está na consistência das decisões tomadas ao longo do caminho. Está em ter um plano e seguir, mesmo quando o mercado oscila, mesmo quando surgem imprevistos, mesmo quando a vida acontece.
            </p>

            <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
              Você tem o diagnóstico. Você tem a clareza. Agora você tem uma escolha: continuar como está, ou dar o próximo passo.
            </p>

            <p style={{ ...TEXTO_CORPO, fontSize: 13, textAlign: "justify" as const }}>
              Estamos aqui para caminhar com você.
            </p>
          </div>
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
