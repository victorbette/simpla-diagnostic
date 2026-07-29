import type { Lead } from "../types";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Props { lead: Lead; }

export function DocBlindagemPatrimonial({ lead }: Props) {
  const { dadosColeta } = lead;

  const despesas              = Number(dadosColeta.custoVidaMensal) || 0;
  const capitalNecessario     = despesas * 12 * 20;
  const possuiSeguro          = dadosColeta.possuiSeguro === true;
  const capitalAtual          = possuiSeguro ? (Number(dadosColeta.valorApolice) || 0) : 0;
  const blindagemTemDados     = despesas > 0;
  const coberturaPct          = blindagemTemDados && capitalNecessario > 0
    ? Math.min(100, Math.round(capitalAtual / capitalNecessario * 100))
    : 0;

  function gerarTextoBlind(): string {
    if (!blindagemTemDados) {
      return "Não conseguimos avaliar sua proteção patrimonial sem saber suas despesas mensais. Complete esse dado para descobrir se sua família estaria protegida em caso de imprevistos.";
    }
    if (!possuiSeguro) {
      return "Esse é o ponto mais crítico do seu diagnóstico. Você não possui nenhuma apólice de seguro de vida ou invalidez — o que significa que, se algo inesperado acontecer com você amanhã, sua família enfrentaria a dor emocional e, simultaneamente, uma crise financeira devastadora.\n\nPense nisso de forma concreta: em caso de falecimento, quem pagaria o aluguel, a escola dos filhos, as contas do dia a dia? Em caso de invalidez — que é estatisticamente mais provável do que o falecimento precoce — como sua família manteria o padrão de vida por meses ou anos sem a sua renda?\n\nUm seguro de vida adequado é uma das decisões mais importantes e mais acessíveis que você pode tomar hoje. O custo de não ter é infinitamente maior do que o custo de ter.";
    }
    return "Você já deu um passo importante ao contratar um seguro de vida — isso demonstra que você pensa no futuro da sua família.\n\nLembre-se de revisar anualmente: à medida que seu patrimônio e suas responsabilidades crescem, a cobertura também deve acompanhar esse crescimento. Avaliar a inclusão de coberturas em vida — invalidez e doenças graves — pode adicionar uma camada extra de segurança para o que você mais valoriza.";
  }

  const blocos: BlocoDoc[] = [];

  blocos.push({
    chave: "texto",
    grudaNoProximo: blindagemTemDados,
    node: (
      <p style={{
        fontSize: 12, color: "#374151", lineHeight: 1.8,
        marginBottom: 20, whiteSpace: "pre-line" as const,
      }}>
        {gerarTextoBlind()}
      </p>
    ),
  });

  if (blindagemTemDados) {
    blocos.push({
      chave: "cards",
      grudaNoProximo: !possuiSeguro,
      node: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
            <div style={{ fontSize: 15, fontWeight: 800, color: possuiSeguro && coberturaPct >= 80 ? "#15803D" : "#B91C1C" }}>
              {possuiSeguro ? `${formatBRL(capitalAtual)}` : "Não possui"}
            </div>
            <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2 }}>
              {possuiSeguro ? `${coberturaPct}% do necessário` : "Sem cobertura"}
            </div>
          </div>
        </div>
      ),
    });
  }

  if (!possuiSeguro) {
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
