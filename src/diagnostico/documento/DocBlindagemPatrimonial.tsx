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

    const introBlindagem = `Existe uma regra pétrea no planejamento financeiro: não adianta desenharmos a melhor estratégia de investimentos do mundo se a base sobre a qual ela está construída for vulnerável. Um único evento inesperado não planejado pode desmanchar anos de acumulação em poucos meses. Por isso, analisamos a sua blindagem patrimonial.`;

    if (temSeguro) {
      const notaSeguroProfissao = ehEmpresario
        ? `\n\nComo empresário, há um ponto adicional que muitas vezes passa despercebido: o seguro de vida pessoal raramente cobre o risco que a sua ausência representa para a empresa — sócios, funcionários, contratos em andamento. Um seguro de pessoa-chave, estruturado corretamente, protege tanto a família quanto a continuidade do negócio.`
        : ehAutonomo
          ? `\n\nComo autônomo, além da cobertura de vida, a proteção de renda por incapacidade temporária é especialmente crítica — sem você trabalhando, não há renda entrando. Verifique se a sua apólice inclui cobertura de invalidez parcial e DIT (Diária de Incapacidade Temporária).`
          : "";

      return `${introBlindagem}\n\n${nome}, você já deu um passo importante ao ter uma apólice contratada. O nosso foco agora é calibrar: será que o capital segurado contratado lá atrás ainda acompanha o custo de vida e o patrimônio que você tem hoje? Na idade ativa, é mais comum um imprevisto afastar alguém do trabalho do que tirá-lo de cena — e é exatamente esse cenário que muitas apólices não cobrem adequadamente.${notaSeguroProfissao}\n\nAlém disso, é fundamental verificar se a sua cobertura vai além do falecimento e inclui invalidez, doenças graves e DIT (Diária de Incapacidade Temporária). Ter a ferramenta certa descalibrada dá uma falsa sensação de segurança.\n\nPor fim, no Brasil o processo de inventário é burocrático, lento e custoso. Um planejamento sucessório estruturado garante que o patrimônio seja transmitido da forma mais eficiente possível.`;
    }

    // Sem seguro
    const notaRendaVariavel = rendaVariavel
      ? `\n\nComo ${ehEmpresario ? "empresário" : "autônomo"}, se você para, a receita para junto — sem salário garantido nem afastamento remunerado pelo empregador.${ehEmpresario ? " Há um risco adicional: a sua ausência pode comprometer a empresa inteira — sócios, contratos, funcionários. Um seguro de pessoa-chave protege tanto a família quanto a continuidade do negócio." : " Uma apólice com DIT (Diária de Incapacidade Temporária) e cobertura de invalidez parcial é o que garante renda quando você não pode trabalhar."}`
      : ehServidor
        ? `\n\nComo servidor público, você tem estabilidade — mas em casos de doença grave ou invalidez permanente, os limites do regime público costumam surpreender negativamente. Coberturas complementares fazem a diferença entre manter o padrão de vida ou ter que renegociá-lo por completo.`
        : "";

    if (temFilhos) {
      return `${introBlindagem}\n\n${nome}, hoje você não possui uma apólice de blindagem. Se amanhã um imprevisto grave tirar a sua capacidade de gerar renda ou tirar você de cena, quem paga a escola ${filhos.length === 1 ? "das crianças" : "das crianças"} no mês seguinte? Quem banca as contas fixas da casa enquanto as coisas se reorganizam? Sem uma cobertura estruturada, a família é obrigada a torrar as reservas e liquidar investimentos na pressa.${notaRendaVariavel}\n\nTerceirizar esse risco para uma seguradora é o pilar mais urgente antes de qualquer aporte.`;
    }

    if (casado) {
      return `${introBlindagem}\n\nHoje o patrimônio de vocês não tem blindagem. Se um evento de saúde afastar você do trabalho por um ano, o dinheiro que você e ${conjugeRef || "sua família"} juntaram para construir a vida a dois começará a ser drenado imediatamente para pagar tratamentos e despesas correntes. O que era projeto de independência vira fundo de sobrevivência médica.${notaRendaVariavel}\n\nUma apólice estruturada serve exatamente para impedir que ${conjugeRef || "sua família"} fique desamparado${conjugeRef ? "" : "a"}.`;
    }

    return `${introBlindagem}\n\n${nome}, mesmo sem dependentes, a ausência de seguro é o maior risco da sua independência financeira. Se um acidente ou diagnóstico grave te impedir de trabalhar temporariamente, de onde sairá o dinheiro para pagar seu custo de vida e os médicos? Dos investimentos que você suou anos para acumular.${notaRendaVariavel}\n\nA blindagem pessoal de DIT e doenças graves existe para garantir que você nunca precise queimar o seu próprio patrimônio para se manter em pé.`;
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
