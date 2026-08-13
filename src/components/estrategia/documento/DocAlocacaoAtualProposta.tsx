import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { montarCarteiraFinal } from "@/lib/carteira/carteiraFinal";
import { DOC } from "@/lib/documentoStyles";
import { empacotarPorAltura, orcamentoPagina, type ItemPaginavel } from "@/lib/paginacaoDoc";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/* ── Tabela "Como sua carteira deverá ficar" (versão print compacta) ────────── */

type LinhaTabela =
  | { tipo: "grupo"; cardId: CardId; pct: number; brlMeta: number; totalGrupo: number }
  | { tipo: "colunas"; cardId: CardId }
  | { tipo: "ativo"; cardId: CardId; ativo: Ativo };

function montarLinhas(ativos: Ativo[], macroMeta: Record<string, number>, patrimonioMeta: number): LinhaTabela[] {
  const linhas: LinhaTabela[] = [];
  for (const cardId of CARD_ORDER) {
    const doCard = ativos.filter((a) => a.card === cardId);
    if (doCard.length === 0) continue;
    const pct = Number(macroMeta[cardId]) || 0;
    linhas.push({
      tipo: "grupo",
      cardId,
      pct,
      brlMeta: (pct / 100) * patrimonioMeta,
      totalGrupo: doCard.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0),
    });
    linhas.push({ tipo: "colunas", cardId });
    for (const ativo of doCard) linhas.push({ tipo: "ativo", cardId, ativo });
  }
  return linhas;
}

/* Alturas estimadas (px) dos blocos fixos e de cada tipo de linha da tabela */
const ALTURA_CHROME_TABELA = 64;  // cabeçalho do card + paddings internos
const ALTURA_RODAPE_TOTAL = 36;   // linha "Total da carteira recomendada"

function alturaLinha(linha: LinhaTabela): number {
  if (linha.tipo === "grupo") return 34;
  if (linha.tipo === "colunas") return 24;
  // linha de ativo: nomes longos quebram em múltiplas linhas na coluna 2.5fr
  const linhasNome = Math.max(1, Math.ceil(((linha.ativo.nome ?? "").length || 1) / 42));
  return 26 + (linhasNome - 1) * 15;
}

/** Divide as linhas em blocos por página respeitando a altura da folha,
 *  sem deixar cabeçalho de grupo/colunas órfão no fim do bloco */
function dividirLinhas(linhas: LinhaTabela[]): LinhaTabela[][] {
  const itens: ItemPaginavel<LinhaTabela>[] = linhas.map((linha) => ({
    item: linha,
    altura: alturaLinha(linha),
    grudaNoProximo: linha.tipo !== "ativo",
  }));
  return empacotarPorAltura(itens, [
    orcamentoPagina(false) - ALTURA_CHROME_TABELA - ALTURA_RODAPE_TOTAL,
    orcamentoPagina(true) - ALTURA_CHROME_TABELA - ALTURA_RODAPE_TOTAL,
  ]).map((pagina) => pagina.map(({ item }) => item));
}

function TabelaCarteiraFinal({
  linhas,
  rodapeTotal,
  totalSomaMeta,
}: {
  linhas: LinhaTabela[];
  rodapeTotal: boolean;
  totalSomaMeta: number;
}) {
  return (
    <div className="doc-card" style={{ border: `1px solid ${DOC.linha}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `0.5px solid ${DOC.linha}` }}>
        <i className="ti ti-list-check" style={{ fontSize: 13, color: DOC.blue }} aria-hidden="true" />
        <div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: DOC.ink, display: "block" }}>
            Como sua carteira deverá ficar
          </span>
          <span style={{ fontSize: 9.5, color: DOC.muted }}>Seleção de ativos após execução do plano</span>
        </div>
      </div>

      <div style={{ padding: "4px 14px 10px" }}>
        {linhas.map((linha, idx) => {
          if (linha.tipo === "grupo") {
            const meta = CARD_META[linha.cardId];
            return (
              <div
                key={`g-${linha.cardId}-${idx}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0 5px", borderBottom: `0.5px solid ${DOC.linhaSoft}`, marginTop: 4 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <i className={`ti ${meta.icone}`} style={{ fontSize: 12, color: meta.cor }} aria-hidden="true" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: DOC.ink }}>{meta.label}</span>
                  <span style={{ fontSize: 8.5, color: DOC.muted, background: DOC.linhaSoft, padding: "1px 7px", borderRadius: 99 }}>
                    {linha.pct.toFixed(1)}% · {formatCurrency(linha.brlMeta)}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: DOC.texto }}>{formatCurrency(linha.totalGrupo)}</span>
              </div>
            );
          }
          if (linha.tipo === "colunas") {
            const isRF = linha.cardId === "resgate_longo" || linha.cardId === "resgate_rapido";
            const cols = isRF ? "2.5fr 1.2fr 1fr 1fr" : "2.5fr 1.5fr 1fr";
            return (
              <div
                key={`c-${linha.cardId}-${idx}`}
                style={{ display: "grid", gridTemplateColumns: cols, padding: "3px 6px", fontSize: 8.5, color: DOC.hint, textTransform: "uppercase", letterSpacing: "0.05em", background: "#F8FAFF", borderRadius: 5, margin: "4px 0 2px" }}
              >
                <span>Ativo</span>
                <span>Segmento</span>
                {isRF && <span>Vencimento</span>}
                <span style={{ textAlign: "right" }}>R$ Meta</span>
              </div>
            );
          }
          const isRF = linha.cardId === "resgate_longo" || linha.cardId === "resgate_rapido";
          const cols = isRF ? "2.5fr 1.2fr 1fr 1fr" : "2.5fr 1.5fr 1fr";
          const a = linha.ativo;
          return (
            <div
              key={`a-${a.id}-${idx}`}
              style={{ display: "grid", gridTemplateColumns: cols, padding: "5px 6px", borderBottom: "0.5px solid #F9FAFB", alignItems: "center" }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, color: DOC.ink }}>{a.nome || "—"}</span>
              <span style={{ fontSize: 8.5, color: DOC.texto, background: DOC.linhaSoft, padding: "1px 7px", borderRadius: 99, display: "inline-block", maxWidth: "fit-content" }}>
                {a.segmento || "—"}
              </span>
              {isRF && <span style={{ fontSize: 10, color: DOC.muted }}>{a.vencimento || "—"}</span>}
              <span style={{ fontSize: 11, fontWeight: 500, color: DOC.ink, textAlign: "right" }}>
                {formatCurrency(Number(a.valorBRL) || 0)}
              </span>
            </div>
          );
        })}

        {rodapeTotal && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${DOC.linha}`, paddingTop: 9, marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: DOC.texto }}>Total da carteira recomendada</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: DOC.ink }}>{formatCurrency(totalSomaMeta)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Página "Carteira Final" — tabela de ativos recomendados após execução do plano (v4 p.10) */
export function DocAlocacaoAtualProposta({ nomeCliente, resultados }: Props) {
  const rc = resultados.carteira;
  if (!rc) return null;

  const patrimonio = rc.patrimonio;
  const patrimonioMeta = patrimonio + (rc.aporteDisponivel ?? 0);

  const ativosFinal = montarCarteiraFinal(rc.planoAcao ?? [], rc.ativosRecomendados ?? []);
  const totalSomaMeta = ativosFinal.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
  const linhas = montarLinhas(ativosFinal, rc.macroMeta ?? {}, patrimonioMeta);
  const blocos = linhas.length > 0 ? dividirLinhas(linhas) : [];

  return (
    <>
      <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
        <HeaderSecao titulo="Alocação Atual x Proposta" />

        {blocos.length > 0 && (
          <TabelaCarteiraFinal
            linhas={blocos[0]}
            rodapeTotal={blocos.length === 1}
            totalSomaMeta={totalSomaMeta}
          />
        )}
      </PaginaDoc>

      {blocos.slice(1).map((bloco, i) => (
        <PaginaDoc key={`cont-${i}`} rodape={<RodapePagina nomeCliente={nomeCliente} />}>
          <HeaderSecao titulo="Alocação Atual x Proposta" subtitulo="continuação" />
          <TabelaCarteiraFinal
            linhas={bloco}
            rodapeTotal={i === blocos.length - 2}
            totalSomaMeta={totalSomaMeta}
          />
        </PaginaDoc>
      ))}
    </>
  );
}
