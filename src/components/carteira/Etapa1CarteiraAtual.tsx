import { useState } from "react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER } from "@/lib/carteira/types";
import { CarteiraCard, makeNovoAtivo } from "./CarteiraCard";
import { PainelAjuda } from "@/components/shared/PainelAjuda";

const AJUDA_ETAPA1 = [
  {
    titulo: "📌 O que fazer nesta etapa?",
    conteudo: `Lance todos os ativos que o cliente possui atualmente, organizados por classe.\n\nEsta é a fotografia da carteira hoje — quanto mais precisa, mais assertivo será o plano de ação gerado nas etapas seguintes.\n\nCada ativo deve ter:\n- Nome do ativo\n- Valor atual em R$\n- Segmento (quando aplicável)\n- Vencimento (quando aplicável)\n- Liquidez (Resgate Longo ou Resgate Rápido)`,
  },
  {
    titulo: "🏦 Classes de Ativos",
    conteudo: `Os ativos são organizados por classe:\n\nResgate Rápido (Renda Fixa Curta):\nAtivos com liquidez imediata ou de curto prazo. Ex: Tesouro Selic, CDBs diários, fundos DI.\n\nResgate Longo (Renda Fixa Longa):\nAtivos com vencimento mais longo. Ex: CDBs prefixados, LCIs, LCAs, debêntures, CRIs, CRAs.\n\nAções: ações de empresas listadas na B3.\n\nFundos Imobiliários (FIIs): fundos negociados na B3 com foco em imóveis.\n\nExterior: ativos internacionais (ETFs, stocks, bonds, REITs).\n\nCripto: criptoativos.\n\nAlternativos: COE, Fundos Cetipados, Produtos Estruturados.\n\nPrevidência Privada: PGBL e VGBL.`,
  },
  {
    titulo: "🏷️ Segmento",
    conteudo: `O segmento identifica o subsetor de cada ativo dentro da classe.\n\nAções:\nBancos, Seguradora, Agronegócio, Commodities, Educação, Construção Civil, Saúde, Shopping, Telecomunicação, Energia, Diverso\n\nFIIs:\nPapel, Galpões Log., Híbrido, Lajes Corp., Shopping, Fiagro, Recebíveis, FOF\n\nExterior:\nETF RV, ETF RF, Stocks, REITs, Bonds, Mutual Funds\n\nPara outras classes, o campo de segmento é texto livre.`,
  },
  {
    titulo: "📅 Vencimento",
    conteudo: `Informe o vencimento dos ativos de Renda Fixa (Resgate Longo e Resgate Rápido) quando disponível.\n\nUse texto livre no formato que preferir:\n- Jan/2026\n- 15/03/2027\n- 2028\n\nO vencimento informado aqui aparecerá automaticamente no card "Como sua carteira deverá ficar" na página principal de Gestão de Ativos.`,
  },
  {
    titulo: "⚡ Liquidez (Resgate)",
    conteudo: `Define como o ativo pode ser resgatado:\n\nResgate Rápido:\nLiquidez imediata ou em até 2 dias úteis. Ideal para reserva de emergência e oportunidades de curto prazo.\n\nResgate Longo:\nLiquidez no vencimento ou com prazo maior. Geralmente oferece rentabilidade superior em troca de menor liquidez.\n\nA liquidez impacta a alocação entre os cards de Resgate Rápido e Resgate Longo na carteira recomendada.`,
  },
  {
    titulo: "➕ Adicionar e remover ativos",
    conteudo: `Para adicionar um ativo:\nClique no botão "+ Adicionar" dentro da classe correspondente. Um novo campo aparecerá para preenchimento.\n\nPara remover um ativo:\nClique no ícone de lixeira ao lado do ativo. A remoção é imediata dentro da sessão.\n\nOs dados são salvos automaticamente ao avançar para a próxima etapa — não é necessário salvar manualmente.`,
  },
  {
    titulo: "💡 Dicas para o consultor",
    conteudo: `• Informe todos os ativos do cliente, mesmo os que serão resgatados — o plano de ação depende da visão completa da carteira atual.\n\n• Para clientes com muitos ativos, agrupe por emissor quando fizer sentido (ex: vários CDBs do mesmo banco).\n\n• O valor total informado aqui é a base para calcular os percentuais de alocação atual.\n\n• Vencimentos de renda fixa são importantes — priorize resgates de ativos próximos ao vencimento no plano de ação.\n\n• Ativos de Previdência Privada devem ser lançados separadamente pois têm regras de resgate diferentes.`,
  },
];

interface Props {
  ativos: Ativo[];
  onAtivos: (ativos: Ativo[]) => void;
  patrimonio: number;
}

export function Etapa1CarteiraAtual({ ativos, onAtivos, patrimonio }: Props) {
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);

  function handleAdd(cardId: CardId) {
    onAtivos([...ativos, makeNovoAtivo(cardId)]);
  }

  function handleRemove(id: string) {
    onAtivos(ativos.filter((a) => a.id !== id));
  }

  function handleChange(id: string, partial: Partial<Ativo>) {
    onAtivos(ativos.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  }

  return (
    <>
      <PainelAjuda
        titulo="Etapa 1 — Carteira Atual"
        secoes={AJUDA_ETAPA1}
        aberto={painelAjudaAberto}
        onFechar={() => setPainelAjudaAberto(false)}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Carteira Atual</h3>
          <button
            onClick={() => setPainelAjudaAberto(true)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563EB" }}
          >
            <i className="ti ti-help-circle" style={{ fontSize: 13 }} />
            Ajuda
          </button>
        </div>
        {CARD_ORDER.map((cardId) => (
          <CarteiraCard
            key={cardId}
            cardId={cardId}
            ativos={ativos.filter((a) => a.card === cardId)}
            modo="atual"
            patrimonio={patrimonio}
            onAdd={() => handleAdd(cardId)}
            onRemove={handleRemove}
            onChange={handleChange}
          />
        ))}
      </div>
    </>
  );
}
