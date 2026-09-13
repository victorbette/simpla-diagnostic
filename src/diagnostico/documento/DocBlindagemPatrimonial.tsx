import type { Lead } from "../types";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { lead: Lead; }

export function DocBlindagemPatrimonial({ lead }: Props) {
  const { dadosColeta } = lead;
  const nome = lead.nome.split(" ")[0];

  const temFilhos   = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;
  const filhos      = Array.isArray(dadosColeta.filhos) ? dadosColeta.filhos : [];
  const temSeguro   = dadosColeta.possuiSeguro === true;
  const estadoCivil = dadosColeta.estadoCivil ?? "";
  const casado      = estadoCivil === "casado" || estadoCivil === "uniao_estavel";
  const conjuge     = dadosColeta.nomeConjuge?.trim() || "";
  const conjugeRef  = conjuge || (casado ? "sua família" : "");

  const vinculos: string[] = Array.isArray(dadosColeta.vinculoProfissional)
    ? dadosColeta.vinculoProfissional
    : dadosColeta.vinculoProfissional ? [dadosColeta.vinculoProfissional] : [];
  const ehAutonomo   = vinculos.includes("autonomo");
  const ehEmpresario = vinculos.includes("empresario");
  const ehServidor   = vinculos.includes("servidor");
  const rendaVariavel = ehAutonomo || ehEmpresario;

  function gerarTextoBlindagem(): string {
    const nFilhosStr = filhos.length === 1
      ? (filhos[0].nome || "seu filho")
      : filhos.length > 1 ? `seus ${filhos.length} filhos` : "seus filhos";

    if (temSeguro) {
      const familiaRef = casado && temFilhos
        ? `${conjugeRef} e ${nFilhosStr}`
        : casado ? conjugeRef : temFilhos ? nFilhosStr : "sua família";

      const notaSeguroProfissao = ehEmpresario
        ? `\n\nComo empresário, há um ponto adicional que muitas vezes passa despercebido: o seguro de vida pessoal raramente cobre o risco que a sua ausência representa para a empresa — sócios, funcionários, contratos em andamento. Um seguro de pessoa-chave, estruturado corretamente, protege tanto a família quanto a continuidade do negócio.`
        : ehAutonomo
          ? `\n\nComo autônomo, além da cobertura de vida, a proteção de renda por incapacidade temporária é especialmente crítica — sem você trabalhando, não há renda entrando. Verifique se a sua apólice inclui cobertura de invalidez parcial e DIT (Diária de Incapacidade Temporária).`
          : "";

      return `${nome}, você já deu um passo muito importante ao ter um seguro de vida — isso demonstra consciência sobre a proteção ${casado || temFilhos ? "da sua família" : "do seu patrimônio"} e coloca você à frente da maioria das pessoas, que jamais estruturam esse pilar.\n\nO próximo passo é garantir que a cobertura ainda reflete a sua realidade atual. Família cresce, patrimônio aumenta, responsabilidades mudam — e um seguro contratado há alguns anos pode ter um capital segurado que já não é adequado para os compromissos de hoje${casado || temFilhos ? ` com ${familiaRef}` : ""}.${notaSeguroProfissao}\n\nAlém da cobertura por falecimento, ${casado || temFilhos ? `${familiaRef} ${filhos.length > 1 || casado ? "precisam" : "precisa"}` : "você precisa"} estar protegido também contra invalidez total ou parcial e doenças graves — coberturas que muitas apólices não incluem por padrão. Uma revisão completa garante que a proteção está calibrada para o que ${casado || temFilhos ? "vocês realmente precisam" : "você realmente precisa"}.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado garante que o patrimônio${casado || temFilhos ? ` que você construiu seja transmitido para ${familiaRef}` : " seja transmitido"} da forma mais eficiente possível.`;
    }

    // Sem seguro
    const notaRendaVariavel = rendaVariavel
      ? `\n\nComo ${ehEmpresario ? "empresário" : "autônomo"}, se você para, a receita para junto — sem salário garantido nem afastamento remunerado pelo empregador.${ehEmpresario ? " Há um risco adicional: a sua ausência pode comprometer a empresa inteira — sócios, contratos, funcionários. Um seguro de pessoa-chave protege tanto a família quanto a continuidade do negócio." : " Verifique se a sua apólice inclui DIT (Diária de Incapacidade Temporária) e cobertura de invalidez parcial."}`
      : ehServidor
        ? `\n\nComo servidor público, você tem estabilidade — mas em casos de doença grave ou invalidez permanente, os limites do regime público costumam surpreender negativamente. Coberturas complementares fazem a diferença entre manter o padrão de vida ou ter que renegociá-lo por completo.`
        : "";

    if (casado && temFilhos) {
      return `${nome}, imagine dois cenários: um acidente ou doença grave que te incapacita de trabalhar, ou um falecimento precoce. Em ambos, a pergunta é a mesma — o que acontece com ${conjugeRef} e ${nFilhosStr}?\n\nQuem paga as contas no mês que vem? Quem garante a escola ${filhos.length === 1 ? "deles" : "deles"}? Quem mantém o padrão de vida enquanto tudo é reorganizado? Hoje, a resposta é: ninguém — porque você não tem seguro de vida montado.${notaRendaVariavel}\n\nUm seguro de vida bem estruturado cobre os dois cenários: garante um capital para ${conjugeRef} e ${nFilhosStr} em caso de falecimento, e protege a renda em caso de invalidez e doenças graves — riscos distintos que precisam estar cobertos.\n\nA probabilidade de sofrer uma invalidez ao longo da vida é maior do que a de falecer prematuramente. Nesses casos, você continua presente mas sem gerar renda — enquanto as despesas aumentam. Coberturas em vida são proteção inteligente, não pessimismo.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado protege o legado e garante que a transmissão do patrimônio aconteça da forma mais eficiente possível.`;
    }

    if (casado) {
      return `${nome}, você e ${conjugeRef} construíram muito juntos — uma vida, uma rotina, um futuro que estão planejando. Mas esse futuro está sendo construído sobre uma base sem proteção.\n\nSe um falecimento precoce, uma invalidez ou uma doença grave tirar você de cena — temporária ou definitivamente — o que acontece com ${conjugeRef}? O patrimônio pode cobrir algum tempo, mas sem uma cobertura estruturada, ele começa a ser consumido rapidamente.${notaRendaVariavel}\n\nSem seguro de vida, você está deixando ${conjugeRef} exposto a um risco que não precisa existir. Um seguro adequado cobre tanto o falecimento — garantindo um capital para a continuidade da vida de vocês — quanto invalidez e doenças graves, igualmente devastadoras.\n\nA probabilidade de sofrer uma invalidez ao longo da vida é maior do que a de falecer prematuramente. Nesses casos, você continua presente mas sem gerar renda — enquanto as despesas aumentam. Coberturas em vida são proteção inteligente, não pessimismo.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado protege o legado e garante que a transmissão do patrimônio aconteça da forma mais eficiente possível.`;
    }

    if (temFilhos) {
      return `${nome}, você é o principal pilar financeiro de ${nFilhosStr} — e essa responsabilidade hoje está completamente desprotegida.\n\nImagine dois cenários: um acidente ou doença grave que te incapacita de trabalhar, ou um falecimento precoce. Em ambos, quem garante o sustento ${filhos.length === 1 ? "dele" : "deles"}? Quem paga a escola, as despesas do dia a dia? Hoje, não há resposta — porque você não tem seguro de vida montado.${notaRendaVariavel}\n\nUm seguro de vida cobre os dois lados: garante um capital em caso de falecimento e protege a renda em caso de invalidez e doenças graves. A ausência de qualquer um desses lados deixa ${nFilhosStr} exposto.\n\nA probabilidade de sofrer uma invalidez ao longo da vida é maior do que a de falecer prematuramente. Nesses casos, você continua presente mas sem gerar renda — enquanto as despesas aumentam. Coberturas em vida são proteção inteligente, não pessimismo.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado protege o legado e garante que a transmissão do patrimônio aconteça da forma mais eficiente possível.`;
    }

    return `${nome}, mesmo sem dependentes diretos, a ausência de proteção cria uma vulnerabilidade que pode destruir décadas de trabalho em um único evento.\n\nFalecimento precoce, invalidez permanente, doença grave — não são riscos abstratos. Um seguro de vida bem estruturado cobre os três: garante um capital em caso de morte e protege a renda em caso de invalidez ou doenças que tiram a capacidade de trabalhar sem tirar a vida. Sem essa cobertura, o patrimônio começa a ser consumido por despesas que uma apólice cobriria por fração do custo.${notaRendaVariavel}\n\nEsse é o pilar que mais pessoas negligenciam e que, quando faz falta, não pode mais ser contratado nas mesmas condições. Quanto mais cedo for estruturado, menor o custo e maior a proteção.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado garante que o patrimônio seja transmitido da forma mais eficiente possível.`;
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
