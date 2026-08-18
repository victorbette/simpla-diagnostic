import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER } from "@/lib/carteira/types";
import { CarteiraCard, makeNovoAtivo } from "./CarteiraCard";
import { ImportarCarteiraIA } from "./ImportarCarteiraIA";
import { PainelAjuda } from "@/components/shared/PainelAjuda";

const AJUDA_ETAPA1 = [
  {
    titulo: "O que fazer nesta etapa?",
    conteudo: `Lance todos os ativos que o cliente possui atualmente, organizados por classe.\n\nEsta é a fotografia da carteira hoje — quanto mais precisa, mais assertivo será o plano de ação gerado nas etapas seguintes.\n\nCada ativo deve ter:\n- Nome do ativo\n- Valor atual em R$\n- Segmento (quando aplicável)\n- Vencimento (quando aplicável)\n- Liquidez (Resgate Longo ou Resgate Rápido)`,
  },
  {
    titulo: "Classes de Ativos",
    conteudo: `Os ativos são organizados por classe:\n\nResgate Rápido (Renda Fixa Curta):\nAtivos com liquidez imediata ou de curto prazo. Ex: Tesouro Selic, CDBs diários, fundos DI.\n\nResgate Longo (Renda Fixa Longa):\nAtivos com vencimento mais longo. Ex: Tesouro IPCA+, Tesouro Prefixado, CDBs prefixados, LCIs, LCAs, debêntures, CRIs, CRAs.\n\nA régua entre os dois é a LIQUIDEZ, não o indexador: Tesouro Selic 2029 é Resgate Rápido (resgate diário) mesmo tendo ano no nome, enquanto um CDB 110% do CDI com vencimento em 2028 é Resgate Longo.\n\nAções: ações de empresas listadas na B3.\n\nFundos Imobiliários (FIIs): fundos negociados na B3 com foco em imóveis.\n\nExterior: ativos internacionais (ETFs, stocks, bonds, REITs).\n\nCripto: criptoativos.\n\nAlternativos: COE, Fundos Cetipados, Produtos Estruturados.\n\nPrevidência Privada: PGBL e VGBL.`,
  },
  {
    titulo: "Segmento",
    conteudo: `O segmento identifica o subsetor de cada ativo dentro da classe.\n\nAções:\nBancos, Seguradora, Agronegócio, Commodities, Educação, Construção Civil, Saúde, Shopping, Telecomunicação, Energia, Diverso\n\nFIIs:\nPapel, Galpões Log., Híbrido, Lajes Corp., Shopping, Fiagro, Recebíveis, FOF\n\nExterior:\nETF RV, ETF RF, Stocks, REITs, Bonds, Mutual Funds\n\nPara outras classes, o campo de segmento é texto livre.`,
  },
  {
    titulo: "Vencimento",
    conteudo: `Informe o vencimento dos ativos de Renda Fixa (Resgate Longo e Resgate Rápido) quando disponível.\n\nUse texto livre no formato que preferir:\n- Jan/2026\n- 15/03/2027\n- 2028\n\nO vencimento informado aqui aparecerá automaticamente no card "Como sua carteira deverá ficar" na página principal de Gestão de Ativos.`,
  },
  {
    titulo: "Liquidez (Resgate)",
    conteudo: `Define como o ativo pode ser resgatado:\n\nResgate Rápido:\nLiquidez imediata ou em até 2 dias úteis. Ideal para reserva de emergência e oportunidades de curto prazo.\n\nResgate Longo:\nLiquidez no vencimento ou com prazo maior. Geralmente oferece rentabilidade superior em troca de menor liquidez.\n\nA liquidez impacta a alocação entre os cards de Resgate Rápido e Resgate Longo na carteira recomendada.`,
  },
  {
    titulo: "Adicionar e remover ativos",
    conteudo: `Para adicionar um ativo:\nClique no botão "+ Adicionar" dentro da classe correspondente. Um novo campo aparecerá para preenchimento.\n\nPara remover um ativo:\nClique no ícone de lixeira ao lado do ativo. A remoção é imediata dentro da sessão.\n\nOs dados são salvos automaticamente ao avançar para a próxima etapa — não é necessário salvar manualmente.`,
  },
  {
    titulo: "Importar de print (IA)",
    conteudo: `O botão "Importar de print (IA)" no topo desta etapa lê prints da carteira do cliente (home broker, app do banco, extrato, planilha) e propõe uma linha por ativo.\n\nComo usar:\n1. Clique em "Importar de print (IA)".\n2. Anexe até 6 imagens — clique, arraste ou cole com Ctrl+V.\n3. Clique em "Extrair com IA" e aguarde (10 a 30 segundos).\n4. Revise cada linha: nome, classe e valor são editáveis, e dá para desmarcar, excluir ou adicionar linhas manualmente.\n5. Clique em "Aplicar na carteira".\n\nNada é lançado sem a sua validação. Por padrão os ativos importados são ADICIONADOS aos que já estão na tela — marque "Substituir" para trocar a carteira inteira.\n\nLinhas que a IA não conseguiu classificar aparecem como "Não identificado" e só entram depois que você escolher a classe.\n\nSegmento e vencimento são preenchidos quando visíveis no print; confira nos cards depois de aplicar.\n\nRenda fixa: a IA separa Resgate Rápido de Resgate Longo pela liquidez, e os títulos públicos são posicionados pelo nome (Tesouro Selic e poupança em Resgate Rápido; Tesouro IPCA+, Prefixado, Renda+ e Educa+ em Resgate Longo). Se ela errar, é só trocar a classe na própria revisão.\n\nValores em moeda estrangeira NÃO são convertidos — a revisão avisa quando detecta US$.`,
  },
  {
    titulo: "Dicas para o consultor",
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
  const [importadorAberto, setImportadorAberto] = useState(false);

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
      <ImportarCarteiraIA
        aberto={importadorAberto}
        ativosAtuais={ativos}
        onFechar={() => setImportadorAberto(false)}
        onAplicar={(novos, qtdItens) => {
          onAtivos(novos);
          toast.success(
            `${qtdItens} ativo${qtdItens === 1 ? "" : "s"} aplicado${qtdItens === 1 ? "" : "s"} na carteira atual.`,
          );
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Carteira Atual</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setImportadorAberto(true)}
              title="Anexe prints da carteira e a IA lança os ativos"
              style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563EB" }}
            >
              <Sparkles size={12} />
              Importar de print (IA)
            </button>
            <button
              onClick={() => setPainelAjudaAberto(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563EB" }}
            >
              <i className="ti ti-help-circle" style={{ fontSize: 13 }} />
              Ajuda
            </button>
          </div>
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
