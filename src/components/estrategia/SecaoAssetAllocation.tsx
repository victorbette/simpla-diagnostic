import { PieChart as PieChartIcon } from "lucide-react";
import { CardAlocacaoComparativa } from "@/components/shared/CardAlocacaoComparativa";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { formatBRL } from "@/lib/carteira/calculos";
import type { FinancialPlan } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { CarteiraResultado, CardId, Ativo } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { CardSelecaoAtivos } from "@/components/shared/CardSelecaoAtivos";

interface Props {
  plan: FinancialPlan;
  clientName: string;
  comentario: string;
  onComentarioChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  resultadoCarteira: ResultadoCarteira | null;
  onResultadoCarteira: (r: ResultadoCarteira) => void;
  onLimparCarteira?: () => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

// ── Main component ─────────────────────────────────────────────────────────────

export function SecaoAssetAllocation({
  plan,
  clientName,
  comentario,
  onComentarioChange,
  tags,
  onTagsChange,
  resultadoCarteira,
  onResultadoCarteira,
  onLimparCarteira,
}: Props) {
  const [carteiraOpen, setCarteiraOpen] = useState(false);

  function handleCarteiraSave(r: CarteiraResultado) {
    const patrimonio = r.patrimonio;

    const macroAtual: Record<string, number> = {};
    for (const cardId of CARD_ORDER) {
      const totalDoCard = r.ativosAtuais
        .filter((a) => a.card === cardId)
        .reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
      macroAtual[cardId] = patrimonio > 0 ? (totalDoCard / patrimonio) * 100 : 0;
    }

    const macroMeta: Record<string, number> = { ...(r.alocacaoMeta ?? {}) };

    const totalAportes = (r.planoAcao ?? [])
      .filter((i) => (i.acao === "aportar" || i.acao === "novo") && i.movimentacaoBRL > 0)
      .reduce((s, i) => s + i.movimentacaoBRL, 0);
    const totalResgates = (r.planoAcao ?? [])
      .filter((i) => i.acao === "resgatar_parcial" || i.acao === "resgatar_total")
      .reduce((s, i) => {
        if (i.acao === "resgatar_parcial" && i.valorResgateBRL !== undefined) return s + i.valorResgateBRL;
        return s + Math.abs(i.movimentacaoBRL);
      }, 0);

    onResultadoCarteira({
      patrimonio,
      planoAcaoCount: r.planoAcao.length,
      totalAportes,
      totalResgates,
      macroAtual,
      macroMeta,
      ativosRecomendados: r.ativosRecomendados ?? [],
      aporteDisponivel: r.aporteDisponivel,
      planoAcao: r.planoAcao.map((i) => ({
        id: i.id,
        card: i.card,
        nomeAtivo: i.nomeAtivo,
        segmento: i.segmento,
        acao: i.acao,
        tipo: i.acao,
        valorAtualBRL: i.valorAtualBRL,
        valorMetaBRL: i.valorMetaBRL,
        movimentacaoBRL: i.movimentacaoBRL,
        valorResgateBRL: i.valorResgateBRL,
        prioridade: i.prioridade,
        observacao: i.observacao,
      })),
      dataCalculo: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    });
    setCarteiraOpen(false);
  }

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  // ── Comment card (always visible) ─────────────────────────────────────────
  const commentCard = (
    <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Estratégia e Recomendações
      </p>
      <div style={{ position: "relative" }}>
        <textarea
          value={comentario}
          onChange={(e) => onComentarioChange(e.target.value)}
          placeholder="Descreva a estratégia de asset allocation recomendada: rebalanceamento, classes de ativos prioritários, instrumentos sugeridos..."
          style={{ width: "100%", minHeight: 160, padding: "10px 12px", borderRadius: 6, border: "1px solid #BFDBFE", fontSize: 13, color: "#000000", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        <span style={{ position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#9CA3AF" }}>
          {comentario.length} caracteres
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6B7280", marginRight: 4 }}>Tags:</span>
        {AVAILABLE_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, cursor: "pointer", border: "1px solid #BFDBFE", backgroundColor: tags.includes(t) ? "#2563EB" : "transparent", color: tags.includes(t) ? "white" : "#111827" }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  // ── State A — carteira not defined ────────────────────────────────────────
  if (!resultadoCarteira) {
    return (
      <>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ backgroundColor: "white", border: "2px dashed #3B82F6", borderRadius: 12, padding: "40px 32px", textAlign: "center", maxWidth: 480, width: "100%", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <PieChartIcon size={48} color="#3B82F6" strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 18, fontWeight: 700, color: "#000000", margin: "0 0 8px" }}>Carteira não definida</p>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 }}>
                Use a ferramenta de carteira para definir a alocação atual e recomendada do cliente, gerar o plano de ação e consolidar o resultado.
              </p>
              <button
                onClick={() => setCarteiraOpen(true)}
                style={{ padding: "10px 24px", backgroundColor: "#1E3A8A", color: "white", fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14 }}
              >
                Definir Carteira →
              </button>
            </div>
          </div>
          {commentCard}
        </div>
        {carteiraOpen && (
          <FerramentaCarteira
            clientName={clientName}
            clientId={plan.clientId}
            clientProfile={plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null}
            patrimonyInicial={plan.ativosAtuais.total}
            onClose={() => setCarteiraOpen(false)}
            onSave={handleCarteiraSave}
            onLimpar={onLimparCarteira}
          />
        )}
      </>
    );
  }

  // ── State B — carteira defined ────────────────────────────────────────────
  const rc = resultadoCarteira;
  const patrimonio = rc.patrimonio;
  const patrimonioMeta = patrimonio + (rc.aporteDisponivel ?? 0);

  // Proposed-only table data
  const dadosProposta = CARD_ORDER
    .map((cardId) => {
      const pctMeta = Number(rc.macroMeta[cardId]) || 0;
      const brlMeta = (pctMeta / 100) * patrimonio;
      return { cardId, label: CARD_META[cardId].label, cor: CARD_META[cardId].cor, pctMeta, brlMeta };
    })
    .filter((d) => d.pctMeta > 0);

  const totalAportes = (rc.planoAcao ?? [])
    .filter((i) => { const a = i.acao ?? i.tipo; return (a === "aportar" || a === "novo") && (i.movimentacaoBRL ?? 0) > 0; })
    .reduce((s, i) => s + (i.movimentacaoBRL ?? 0), 0);
  const totalResgates = (rc.planoAcao ?? [])
    .filter((i) => { const a = i.acao ?? i.tipo; return a === "resgatar_parcial" || a === "resgatar_total"; })
    .reduce((s, i) => {
      const a = i.acao ?? i.tipo;
      if (a === "resgatar_parcial" && i.valorResgateBRL !== undefined) return s + i.valorResgateBRL;
      return s + Math.abs(i.movimentacaoBRL ?? 0);
    }, 0);
  const saldoLiquido = totalAportes - totalResgates;

  const actionItems = rc.planoAcao ?? [];

  const groupedByCard: Record<string, typeof actionItems> = {};
  for (const item of actionItems) {
    const cardLabel = item.card && CARD_META[item.card as keyof typeof CARD_META]
      ? CARD_META[item.card as keyof typeof CARD_META].label
      : (item.card ?? "Outros");
    if (!groupedByCard[cardLabel]) groupedByCard[cardLabel] = [];
    groupedByCard[cardLabel].push(item);
  }

  return (
    <>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#15803D", backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB", borderRadius: 999, padding: "4px 12px" }}>
              ✓ Carteira definida
            </span>
            <span style={{ fontSize: 11, color: "#6B7280", backgroundColor: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 10px" }}>
              {new Date(rc.dataCalculo).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <button
            onClick={() => setCarteiraOpen(true)}
            style={{ fontSize: 12, fontWeight: 600, color: "#000000", backgroundColor: "transparent", border: "1px solid #000000", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}
          >
            Editar carteira →
          </button>
        </div>

        {/* Card 1 — Visão Geral */}
        <div style={CARD}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Visão Geral</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ backgroundColor: "#F0F7FF", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Patrimônio Financeiro</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#1E3A8A", margin: 0 }}>{formatCurrency(patrimonio)}</p>
            </div>
            <div style={{ backgroundColor: "#DCFCE7", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "#15803D", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Aportar</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(totalAportes)}</p>
            </div>
            <div style={{ backgroundColor: totalResgates > 0 ? "#FEE2E2" : "#F0F7FF", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: totalResgates > 0 ? "#B91C1C" : "#6B7280", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>Total a Resgatar</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: totalResgates > 0 ? "#B91C1C" : "#9CA3AF", margin: 0 }}>{formatCurrency(totalResgates)}</p>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, backgroundColor: saldoLiquido >= 0 ? "#DCFCE7" : "#FEE2E2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C", textTransform: "uppercase" }}>
              Saldo Líquido (Aportes − Resgates)
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C" }}>
              {saldoLiquido >= 0 ? "+" : ""}{formatCurrency(saldoLiquido)}
            </span>
          </div>
        </div>

        {/* Card 2 — Alocação Atual × Proposta */}
        <CardAlocacaoComparativa
          macroAtual={rc.macroAtual}
          macroMeta={rc.macroMeta}
          patrimonio={rc.patrimonio}
        />

        {/* Card 3 — Proposed allocation table */}
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", backgroundColor: "#F8FAFF", padding: "10px 12px", borderBottom: "0.5px solid #E5E7EB" }}>
            {(["CLASSE", "% PROPOSTA", "R$ PROPOSTO"] as const).map((h, i) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i === 0 ? "left" : "right" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {dadosProposta.map((d) => (
            <div
              key={d.cardId}
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "10px 12px", borderBottom: "0.5px solid #F9FAFB", alignItems: "center" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.cor, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{d.label}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 99, backgroundColor: `${d.cor}33`, color: d.cor }}>
                  {d.pctMeta.toFixed(0)}%
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", textAlign: "right" }}>
                {formatBRL(d.brlMeta)}
              </span>
            </div>
          ))}

          {/* Footer */}
          {dadosProposta.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "10px 12px", backgroundColor: "#F8FAFF", borderTop: "0.5px solid #E5E7EB", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase" }}>TOTAL</span>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>100%</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" }}>
                {formatBRL(patrimonio)}
              </span>
            </div>
          )}
        </div>

        {/* Card 3B — Seleção de Ativos Recomendados */}
        {(() => {
          const ativosRec = rc.ativosRecomendados ?? [];
          const ativosCarteiraFinal = (rc.planoAcao ?? [])
            .map((item) => {
              if (!item.card) return null;
              const acao = item.acao ?? item.tipo ?? "";
              let valorFinal = 0;
              switch (acao) {
                case "novo":
                case "aportar":
                  valorFinal = (item.valorAtualBRL ?? 0) + (item.movimentacaoBRL ?? 0);
                  break;
                case "manter":
                  valorFinal = item.valorAtualBRL ?? 0;
                  break;
                case "resgatar_parcial": {
                  const resgate = item.valorResgateBRL !== undefined
                    ? item.valorResgateBRL
                    : Math.abs(item.movimentacaoBRL ?? 0);
                  valorFinal = Math.max(0, (item.valorAtualBRL ?? 0) - resgate);
                  break;
                }
                case "resgatar_total":
                  return null;
                default:
                  valorFinal = item.valorAtualBRL ?? 0;
              }
              if (valorFinal <= 0) return null;
              const cardId = item.card as CardId;
              const base = ativosRec.find((a) => a.nome === item.nomeAtivo && a.card === cardId);
              return {
                id: base?.id ?? `${cardId}-${item.nomeAtivo}`,
                card: cardId,
                nome: item.nomeAtivo,
                segmento: item.segmento ?? base?.segmento ?? "",
                vencimento: base?.vencimento,
                valorBRL: valorFinal,
              } satisfies Ativo;
            })
            .filter(Boolean) as Ativo[];
          if (ativosCarteiraFinal.length === 0) return null;
          return (
            <CardSelecaoAtivos
              ativosRecomendados={ativosCarteiraFinal}
              macroMeta={rc.macroMeta ?? {}}
              patrimonio={patrimonioMeta}
              titulo="Como sua carteira deverá ficar"
              subtitulo="Seleção de ativos após execução do plano"
            />
          );
        })()}

        {/* Card 4 — Action plan */}
        <div style={CARD}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>Plano de Ação</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div style={{ backgroundColor: "#DCFCE7", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "#15803D", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total Aportes</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatCurrency(totalAportes)}</p>
            </div>
            <div style={{ backgroundColor: "#FEE2E2", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "#B91C1C", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total Resgates</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{formatCurrency(totalResgates)}</p>
            </div>
          </div>

          {Object.keys(groupedByCard).length === 0 ? (
            <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "16px 0", margin: 0 }}>Nenhuma movimentação necessária</p>
          ) : (
            Object.entries(groupedByCard).map(([cardLabel, items]) => (
              <div key={cardLabel} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px", paddingBottom: 4, borderBottom: "1px solid #BFDBFE" }}>
                  {cardLabel}
                </p>
                {items.map((item) => {
                  const acao = item.acao ?? item.tipo ?? "";
                  const badge =
                    acao === "novo"             ? { label: "✦ Novo",             bg: "#DBEAFE", color: "#1E40AF" } :
                    acao === "aportar"          ? { label: "↑ Aportar",          bg: "#DCFCE7", color: "#15803D" } :
                    acao === "manter"           ? { label: "→ Manter",           bg: "#F3F4F6", color: "#6B7280" } :
                    acao === "resgatar_parcial" ? { label: "↓ Resgatar Parcial", bg: "#FEF3C7", color: "#B45309" } :
                    acao === "resgatar_total"   ? { label: "↓ Resgatar Total",   bg: "#FEE2E2", color: "#B91C1C" } :
                                                  { label: acao || "—",          bg: "#F3F4F6", color: "#6B7280" };
                  let movTexto = "";
                  let movCor = "#111827";
                  if (acao === "manter") {
                    movTexto = "R$ 0,00";
                    movCor = "#9CA3AF";
                  } else if (acao === "resgatar_parcial") {
                    const valor = item.valorResgateBRL !== undefined
                      ? item.valorResgateBRL
                      : Math.abs(item.movimentacaoBRL ?? 0);
                    movTexto = "−" + formatBRL(valor);
                    movCor = "#B45309";
                  } else if (acao === "resgatar_total") {
                    movTexto = "−" + formatBRL(Math.abs(item.movimentacaoBRL ?? 0));
                    movCor = "#B91C1C";
                  } else if ((item.movimentacaoBRL ?? 0) > 0) {
                    movTexto = "+" + formatBRL(item.movimentacaoBRL ?? 0);
                    movCor = "#15803D";
                  } else {
                    movTexto = formatBRL(Math.abs(item.movimentacaoBRL ?? 0));
                    movCor = "#111827";
                  }
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F7FF" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: "#000000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nomeAtivo}</span>
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: movCor, flexShrink: 0, marginLeft: 12 }}>
                        {movTexto}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Card 5 — Comment */}
        {commentCard}
      </div>

      {carteiraOpen && (
        <FerramentaCarteira
          clientName={clientName}
          clientId={plan.clientId}
          clientProfile={plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null}
          patrimonyInicial={plan.ativosAtuais.total}
          onClose={() => setCarteiraOpen(false)}
          onSave={handleCarteiraSave}
        />
      )}
    </>
  );
}
