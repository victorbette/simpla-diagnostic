import { formatCurrency } from "@/lib/format";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia, PlanoAcaoItem } from "@/types/estrategiaResultados";
import { DOC, LABEL_SUBSECAO, TEXTO_CORPO, CARD } from "@/lib/documentoStyles";
import { PaginaDocFluida, type BlocoDoc } from "./PaginaDocFluida";
import { blocosNotaConsultor, useNotaConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

const PRIO_BADGE: Record<string, { label: string; cor: string; bg: string }> = {
  alta:  { label: "Alta",  cor: DOC.vermelho, bg: DOC.vermelhoBg },
  media: { label: "Média", cor: DOC.ambar,    bg: DOC.ambarBg },
  baixa: { label: "Baixa", cor: DOC.muted,    bg: DOC.linhaSoft },
};

function valorMovimentacao(item: PlanoAcaoItem): number {
  const acao = item.acao ?? item.tipo ?? "";
  if (acao === "resgatar_parcial" && item.valorResgateBRL !== undefined) return item.valorResgateBRL;
  return Math.abs(item.movimentacaoBRL ?? 0);
}

function LinhaMovimentacao({ item }: { item: PlanoAcaoItem }) {
  const acao = item.acao ?? item.tipo ?? "";
  const aportar = acao === "aportar" || acao === "novo";
  const badge = aportar
    ? { label: "Aportar", cor: DOC.verde, bg: DOC.verdeBg }
    : { label: "Resgatar", cor: DOC.vermelho, bg: DOC.vermelhoBg };

  return (
    <div
      className="doc-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 14px",
        background: "white",
        borderRadius: 8,
        border: `1px solid ${DOC.linha}`,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 9px",
          borderRadius: 999,
          background: badge.bg,
          color: badge.cor,
          flexShrink: 0,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {badge.label}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: DOC.ink, fontWeight: 500 }}>{item.nomeAtivo}</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: badge.cor,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatCurrency(valorMovimentacao(item))}
      </span>
    </div>
  );
}

function CardObservacao({ item }: { item: PlanoAcaoItem }) {
  const prio = item.prioridade ? PRIO_BADGE[item.prioridade] : null;
  return (
    <div
      className="doc-card"
      style={{
        background: "#FBFCFE",
        border: `1px solid ${DOC.linha}`,
        borderRadius: 8,
        padding: "8px 14px",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: DOC.muted }}>
          {(item.acao ?? item.tipo) === "manter" ? "→ Manter" : "Observação"}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: DOC.ink }}>{item.nomeAtivo}</span>
        {prio && (
          <span style={{ fontSize: 8.5, fontWeight: 700, padding: "1px 8px", borderRadius: 999, background: prio.bg, color: prio.cor }}>
            {prio.label}
          </span>
        )}
      </div>
      {(item.observacao ?? "").trim().length > 0 && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: DOC.texto, lineHeight: 1.5 }}>
          {item.observacao}
        </p>
      )}
    </div>
  );
}

/** Página "Movimentações Recomendadas" — todas as movimentações do plano (v4 p.11) */
export function DocMovimentacoes({ nomeCliente, plan, resultados }: Props) {
  const rc = resultados.carteira;
  const nota = useNotaConsultor(plan.clientId, "aa_mov");
  if (!rc) return null;

  const planoAcao = rc.planoAcao ?? [];
  const movimentacoes = planoAcao.filter((item) => {
    const acao = item.acao ?? item.tipo ?? "";
    return (acao === "aportar" || acao === "novo" || acao === "resgatar_parcial" || acao === "resgatar_total")
      && valorMovimentacao(item) > 0;
  });
  const observacoes = planoAcao.filter((item) => {
    const acao = item.acao ?? item.tipo ?? "";
    return acao === "manter" || (item.observacao ?? "").trim().length > 0;
  });

  const blocos: BlocoDoc[] = [];
  if (movimentacoes.length === 0) {
    blocos.push({
      chave: "vazio",
      node: (
        <div style={{ ...CARD, background: DOC.verdeBg, border: "1px solid #BBF7D0" }}>
          <p style={{ ...TEXTO_CORPO, fontWeight: 600, color: DOC.verde }}>
            Nenhuma movimentação necessária — carteira alinhada à estratégia definida.
          </p>
        </div>
      ),
    });
  } else {
    for (const mov of movimentacoes) {
      blocos.push({
        chave: `mov-${mov.id}`,
        node: (
          <div style={{ marginBottom: 6 }}>
            <LinhaMovimentacao item={mov} />
          </div>
        ),
      });
    }
  }

  if (observacoes.length > 0) {
    blocos.push({
      chave: "obs-header",
      grudaNoProximo: true,
      node: (
        <p style={{ ...LABEL_SUBSECAO(), marginTop: 20 }}>Observações do Plano de Ação</p>
      ),
    });
    for (const obs of observacoes) {
      blocos.push({ chave: `obs-${obs.id}`, node: <CardObservacao item={obs} /> });
    }
  }

  blocos.push(...blocosNotaConsultor(plan.clientId, "aa_mov", nota));

  return (
    <PaginaDocFluida titulo="Movimentações Recomendadas" nomeCliente={nomeCliente} blocos={blocos} />
  );
}
