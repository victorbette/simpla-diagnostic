import type { Lead } from "../types";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Props { lead: Lead; }

export function DocBlindagemPatrimonial({ lead }: Props) {
  const { dadosColeta } = lead;

  const temFilhos       = Array.isArray(dadosColeta.filhos) && dadosColeta.filhos.length > 0;
  const temSeguro       = dadosColeta.possuiSeguro === true;
  const temPrevidencia  = dadosColeta.temPrevidencia === true;
  const saldoPrevidencia = Number(dadosColeta.saldoPrevidencia) || 0;
  const estadoCivil     = dadosColeta.estadoCivil ?? "";
  const temConjuge      = estadoCivil === "casado" || estadoCivil === "uniao_estavel";

  const despesas          = Number(dadosColeta.custoVidaMensal) || 0;
  const capitalNecessario = despesas * 12 * 20;
  const capitalAtual      = temSeguro ? (Number(dadosColeta.valorApolice) || 0) : 0;
  const blindagemTemDados = despesas > 0;
  const coberturaPct      = blindagemTemDados && capitalNecessario > 0
    ? Math.min(100, Math.round(capitalAtual / capitalNecessario * 100))
    : 0;

  function gerarTextoBlindagem(): string {
    let texto = "";

    texto += `Construir patrimônio é um ato de disciplina e visão de longo prazo. Mas existe uma verdade que poucos planejamentos financeiros abordam com a profundidade que merece: de nada adianta construir por décadas se tudo o que foi erguido pode desmoronar em questão de meses — ou até de dias — por falta de proteção adequada.

A blindagem patrimonial não é um luxo. É a fundação que sustenta tudo o que você está construindo. É o que garante que um diagnóstico inesperado, um acidente ou uma fatalidade não transforme anos de esforço em uma crise financeira devastadora para quem você mais ama.`;

    if (temConjuge) {
      texto += `\n\nPense no seu cônjuge. Em caso de falecimento, quem manteria o padrão de vida da família? Quem pagaria as contas, o financiamento, os planos que vocês construíram juntos? A ausência de proteção adequada transforma o luto em uma crise financeira simultânea — um peso que ninguém deveria carregar no momento mais difícil da vida.`;
    }

    if (temFilhos) {
      texto += `\n\nSeus filhos dependem de você — não apenas emocionalmente, mas financeiramente. A educação, o desenvolvimento, os sonhos que você tem para eles: tudo isso tem um custo que não para quando a vida para. Um seguro de vida adequado é o que garante que, independente do que aconteça com você, os seus filhos terão a continuidade que merecem — sem precisar abrir mão de nada que foi planejado.`;
    }

    texto += `\n\nMas o maior risco não é necessariamente o falecimento. A probabilidade de sofrer uma invalidez permanente ou ser diagnosticado com uma doença grave ao longo da vida é significativamente maior do que a de falecer prematuramente. E nesses casos, a situação pode ser ainda mais complexa: você continua presente, mas sem a capacidade de gerar renda — enquanto as despesas continuam, e muitas vezes aumentam, com tratamentos e cuidados que demandam recursos que a maioria das pessoas não tem reservados.

Uma cobertura por invalidez garante o capital necessário para manter o padrão de vida sem depender exclusivamente da renda ativa. Uma cobertura para doenças graves permite que o diagnóstico seja tratado sem comprometer anos de patrimônio acumulado. Essas proteções não são sobre pessimismo — são sobre inteligência financeira.`;

    if (temPrevidencia && saldoPrevidencia > 0) {
      texto += `\n\nVocê já possui previdência privada — e isso é um ponto positivo importante. O saldo acumulado representa um patrimônio que, em caso de necessidade, pode oferecer algum suporte. No entanto, previdência privada não substitui a proteção de um seguro de vida ou invalidez: são instrumentos complementares, cada um com um papel específico na sua estratégia.`;
    } else if (!temPrevidencia) {
      texto += `\n\nAlém das coberturas de seguro, a previdência privada desempenha um papel fundamental na blindagem patrimonial: ela acumula capital ao longo do tempo com benefícios fiscais e, em muitos casos, pode ser utilizada como um complemento de renda em situações de necessidade. A ausência de uma reserva previdenciária aumenta a dependência exclusiva do patrimônio investido — o que pode representar um risco em momentos de adversidade.`;
    }

    if (temSeguro) {
      texto += `\n\nO fato de você já possuir um seguro de vida é muito positivo — você entendeu a importância dessa proteção. O passo seguinte é garantir que o valor segurado ainda reflete a sua realidade atual: família, patrimônio, dívidas e padrão de vida tendem a crescer ao longo dos anos, e a cobertura precisa acompanhar esse crescimento. Uma revisão periódica das apólices é fundamental para manter a proteção adequada.`;
    } else {
      texto += `\n\nNeste momento, não identificamos nenhuma apólice de seguro de vida ou invalidez em vigor. Essa é a lacuna mais crítica do seu diagnóstico — e a que exige ação mais imediata. O custo de não ter proteção nunca aparece em nenhum extrato. Mas quando ele se manifesta, ele aparece de uma só vez: em um momento de vulnerabilidade, quando a família mais precisa de apoio e estabilidade.

Um seguro de vida adequado é uma das decisões mais importantes — e mais acessíveis — que você pode tomar. O custo mensal é significativamente menor do que o custo de não estar protegido.`;
    }

    texto += `\n\nPor fim, existe a dimensão sucessória: o que acontece com o patrimônio que você construiu após o seu falecimento. No Brasil, o processo de inventário é burocrático, lento e extremamente custoso — com impostos, custas cartorárias e honorários advocatícios que podem consumir uma parcela significativa do que foi construído ao longo de toda uma vida. Um planejamento sucessório estruturado protege esse legado e garante que a transmissão do patrimônio aconteça da forma mais eficiente e menos traumática possível para a família.`;

    return texto;
  }

  const blocos: BlocoDoc[] = [];

  blocos.push({
    chave: "texto",
    grudaNoProximo: blindagemTemDados,
    node: (
      <p style={{
        fontSize: 12,
        color: "#374151",
        lineHeight: 2,
        margin: 0,
        whiteSpace: "pre-line" as const,
      }}>
        {gerarTextoBlindagem()}
      </p>
    ),
  });

  if (blindagemTemDados) {
    blocos.push({
      chave: "cards",
      grudaNoProximo: !temSeguro,
      node: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 20 }}>
          <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
              Despesa Mensal
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
              {formatBRL(despesas)}/mês
            </div>
            <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>Custo de vida atual</div>
          </div>

          <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
              Capital Necessário
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
              {formatBRL(capitalNecessario)}
            </div>
            <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>20 anos de despesas</div>
          </div>

          <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
              Cobertura Atual
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: temSeguro && coberturaPct >= 80 ? "#15803D" : "#B91C1C" }}>
              {temSeguro ? `${formatBRL(capitalAtual)}` : "Não possui"}
            </div>
            <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>
              {temSeguro ? `${coberturaPct}% do necessário` : "Sem cobertura"}
            </div>
          </div>
        </div>
      ),
    });
  }

  if (!temSeguro) {
    blocos.push({
      chave: "alerta",
      node: (
        <div style={{
          background: "#FFF5F5", border: "0.5px solid #FCA5A5",
          borderRadius: 8, padding: "12px 16px", marginTop: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#B91C1C", marginBottom: 6 }}>
            ⚠ Atenção — Família desprotegida
          </div>
          <div style={{ fontSize: 11, color: "#374151" }}>
            Sem seguro de vida, qualquer imprevisto pode comprometer permanentemente o futuro financeiro da sua família. Esta é uma prioridade imediata.
          </div>
        </div>
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
