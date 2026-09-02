import type { Lead } from "../types";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { lead: Lead; }

export function DocBlindagemPatrimonial({ lead }: Props) {
  const { dadosColeta } = lead;

  const temFilhos        = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;
  const temSeguro        = dadosColeta.possuiSeguro === true;
  const estadoCivil      = dadosColeta.estadoCivil ?? "";
  const temConjuge       = estadoCivil === "casado" || estadoCivil === "uniao_estavel";

  function gerarTextoBlindagem(): string {
    let texto = "";

    texto += `Construir patrimônio é um ato de disciplina. Mas de nada adianta construir por décadas se tudo pode desmoronar por falta de proteção. A blindagem patrimonial é a fundação que sustenta tudo o que você está construindo.`;

    if (temConjuge) {
      texto += `\n\nEm caso de falecimento, quem manteria o padrão de vida da família? A ausência de proteção transforma o luto em uma crise financeira simultânea.`;
    }

    if (temFilhos) {
      texto += `\n\nSeus filhos dependem de você financeiramente. Um seguro de vida adequado garante que, independente do que aconteça, eles terão a continuidade que merecem.`;
    }

    texto += `\n\nA probabilidade de sofrer uma invalidez ou doença grave ao longo da vida é maior do que a de falecer prematuramente. Nesses casos, você continua presente mas sem gerar renda — enquanto as despesas aumentam com tratamentos. Coberturas em vida são proteção inteligente, não pessimismo.`;

    if (temSeguro) {
      texto += `\n\nVocê já possui seguro de vida — ótimo. O próximo passo é garantir que a cobertura ainda reflete sua realidade atual, já que família e patrimônio crescem ao longo dos anos.`;
    } else {
      texto += `\n\nNo momento, não identificamos nenhuma apólice de seguro em vigor. Essa é a lacuna mais crítica do seu diagnóstico. O custo de não ter proteção nunca aparece no extrato — mas quando se manifesta, aparece de uma só vez, no pior momento.`;
    }

    texto += `\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado protege o legado e garante que a transmissão do patrimônio aconteça da forma mais eficiente possível.`;

    return texto;
  }

  const paragrafos = gerarTextoBlindagem().split("\n\n").filter(p => p.trim().length > 0);
  const blocos: BlocoDoc[] = [];
  for (let i = 0; i < paragrafos.length; i += 2) {
    const par1 = paragrafos[i];
    const par2 = paragrafos[i + 1];
    const texto = par2 ? `${par1}\n\n${par2}` : par1;
    blocos.push({
      chave: `texto_${i}`,
      node: (
        <p style={{
          fontSize: 12,
          color: "#374151",
          lineHeight: 2,
          margin: i === 0 ? 0 : "16px 0 0",
          whiteSpace: "pre-line" as const,
          textAlign: "justify" as const,
        }}>
          {texto}
        </p>
      ),
    });
  }

  return (
    <PaginaDocFluidaDiag
      titulo="Blindagem Patrimonial"
      nomeCliente={lead.nome}
      blocos={blocos}
    />
  );
}
