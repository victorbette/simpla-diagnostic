import { useMemo, useState } from "react";
import type { ResultadoCarteira, PlanoAcaoItem } from "@/types/estrategiaResultados";
import { CARD_ORDER, CARD_META, HIERARQUIA_CLASSES } from "@/lib/carteira/types";
import type { CardId, Ativo } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CardSelecaoAtivos } from "@/components/shared/CardSelecaoAtivos";
import { Rebalanceamento } from "./Rebalanceamento";

interface Props {
  carteira: ResultadoCarteira | null;
}

type SubTab = "investimentos" | "rebalanceamento";

const ACAO_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  manter:           { bg: "#F3F4F6", color: "#6B7280", label: "→ Manter" },
  aportar:          { bg: "#DCFCE7", color: "#15803D", label: "↑ Aportar" },
  resgatar_parcial: { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar" },
  resgatar_total:   { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar tudo" },
  novo:             { bg: "#DBEAFE", color: "#1E40AF", label: "✦ Novo" },
};

function calcularValorFinalItem(item: PlanoAcaoItem): number {
  const acao = item.acao || item.tipo || "manter";
  switch (acao) {
    case "aportar":
    case "novo":
      return (Number(item.valorAtualBRL) || 0) + (item.movimentacaoEditada ?? Math.abs(item.movimentacaoBRL ?? 0));
    case "manter":
      return Number(item.valorAtualBRL) || 0;
    case "resgatar_parcial":
      return Math.max(0, (Number(item.valorAtualBRL) || 0) - (item.valorResgateBRL ?? Math.abs(item.movimentacaoBRL ?? 0)));
    case "resgatar_total":
      return 0;
    default:
      return Number(item.valorAtualBRL) || 0;
  }
}

export function GestaoInvestimentos({ carteira }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("investimentos");

  if (!carteira) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
        <i className="ti ti-chart-pie-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
        Dados de carteira não disponíveis.<br />
        Salve a carteira no Financial Planning primeiro.
      </div>
    );
  }

  const savedAt = carteira.savedAt ? new Date(carteira.savedAt).toLocaleDateString("pt-BR") : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Sub-tab bar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #BFDBFE" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {([
            ["investimentos", "Investimentos"],
            ["rebalanceamento", "Rebalanceamento"],
          ] as [SubTab, string][]).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setSubTab(s)}
              style={{
                padding: "10px 24px",
                fontSize: 13, fontWeight: 500,
                border: "none", cursor: "pointer",
                backgroundColor: "transparent",
                color: subTab === s ? "#1E3A8A" : "#6B7280",
                borderBottom: `2px solid ${subTab === s ? "#1E3A8A" : "transparent"}`,
                marginBottom: -2,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {subTab === "investimentos" && <Investimentos carteira={carteira} savedAt={savedAt} />}
      {subTab === "rebalanceamento" && <Rebalanceamento carteira={carteira} />}
    </div>
  );
}

function Investimentos({ carteira, savedAt }: { carteira: ResultadoCarteira; savedAt: string }) {
  const patrimonioBase = carteira.patrimonio + (carteira.aporteDisponivel ?? 0);
  const macroMeta = carteira.macroMeta;

  const planoFiltrado = carteira.planoAcao.filter(
    (i) => (i.acao || i.tipo) !== "manter"
  );

  const cardsComItens = CARD_ORDER.filter((k) =>
    carteira.planoAcao.some((p) => p.card === k)
  );

  // ── Conferência por Classe ──────────────────────────────────────────────────
  const resumoPorClasse = useMemo(() => {
    return CARD_ORDER.map((cardId) => {
      const itensDaClasse = carteira.planoAcao.filter((i) => i.card === cardId);
      const valorAtual = itensDaClasse.reduce((s, i) => s + (Number(i.valorAtualBRL) || 0), 0);
      const valorFinal = itensDaClasse.reduce((s, i) => s + calcularValorFinalItem(i), 0);
      const pctMeta = Number(macroMeta[cardId]) || 0;
      const valorMeta = (pctMeta / 100) * patrimonioBase;
      const pctFinal = patrimonioBase > 0 ? (valorFinal / patrimonioBase) * 100 : 0;
      const desvio = pctFinal - pctMeta;
      const movLiquida = valorFinal - valorAtual;
      return {
        cardId,
        label: CARD_META[cardId as CardId].label,
        cor: CARD_META[cardId as CardId].cor,
        valorAtual,
        valorFinal,
        valorMeta,
        pctAtual: patrimonioBase > 0 ? (valorAtual / patrimonioBase) * 100 : 0,
        pctFinal,
        pctMeta,
        desvio,
        movLiquida,
        adequado: Math.abs(desvio) <= 2,
      };
    }).filter((c) => c.valorAtual > 0 || c.valorMeta > 0 || c.valorFinal > 0);
  }, [carteira.planoAcao, macroMeta, carteira.patrimonio, carteira.aporteDisponivel]);

  // ── Como sua carteira deverá ficar ─────────────────────────────────────────
  const carteiraFinal = useMemo((): Ativo[] => {
    const ativosAtuais = carteira.ativosAtuais ?? [];
    return carteira.planoAcao
      .map((item) => {
        const valorFinal = calcularValorFinalItem(item);
        if (valorFinal <= 0) return null;
        const ativoAtual = ativosAtuais.find(
          (a) => a.id === item.id || (a.nome === item.nomeAtivo && a.card === item.card)
        );
        const vencimento = item.vencimento?.trim()
          ? item.vencimento
          : ativoAtual?.vencimento?.trim()
            ? ativoAtual.vencimento
            : undefined;
        return {
          id: item.id,
          nome: item.nomeAtivo,
          card: item.card,
          segmento: item.segmento ?? "",
          valorBRL: valorFinal,
          vencimento,
          adicionadoManualmente: item.adicionadoManualmente,
          observacao: item.observacao,
        } as Ativo;
      })
      .filter(Boolean) as Ativo[];
  }, [carteira.planoAcao, carteira.ativosAtuais]);

  const COLS = "2fr 1fr 1fr 1fr 1fr";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Patrimônio",     value: formatBRL(carteira.patrimonio),    color: "#1E3A8A" },
          { label: "Total Aportes",  value: formatBRL(carteira.totalAportes),  color: "#15803D" },
          { label: "Total Resgates", value: formatBRL(carteira.totalResgates), color: "#B91C1C" },
          { label: "Movimentações",  value: String(planoFiltrado.length),       color: "#111827" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 17, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Alocação Proposta por Classe ────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB" }}>
          <i className="ti ti-layout-list" style={{ fontSize: 16, color: "#2563EB" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Alocação Proposta por Classe</span>
          <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>Salvo em {savedAt}</span>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", backgroundColor: "#F8FAFF", padding: "8px 16px", borderBottom: "0.5px solid #E5E7EB" }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>CLASSE / SUBCLASSE</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em" }}>R$</span>
          </div>
        </div>

        {HIERARQUIA_CLASSES.map((grupo) => {
          const subsData = grupo.subclasses.map((sub) => ({
            ...sub,
            pct: Number(macroMeta[sub.cardId]) || 0,
            brl: ((Number(macroMeta[sub.cardId]) || 0) / 100) * patrimonioBase,
          }));
          const grupoPct = subsData.reduce((s, d) => s + d.pct, 0);
          const grupoBrl = subsData.reduce((s, d) => s + d.brl, 0);
          if (grupoPct === 0) return null;
          return (
            <div key={grupo.id}>
              {/* Group row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "8px 16px", backgroundColor: grupo.corBg, borderBottom: "0.5px solid #E5E7EB" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`ti ${grupo.icone}`} style={{ fontSize: 13, color: grupo.cor }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: grupo.cor }}>{grupo.label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: grupo.cor }}>{grupoPct.toFixed(1)}%</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: grupo.cor }}>{formatBRL(grupoBrl)}</span>
                </div>
              </div>
              {/* Subclass rows */}
              {subsData.filter((s) => s.pct > 0).map((sub) => (
                <div key={sub.cardId} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "7px 16px 7px 36px", borderBottom: "0.5px solid #F9FAFB" }}>
                  <span style={{ fontSize: 12, color: "#374151" }}>{sub.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{sub.pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(sub.brl)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "10px 16px", backgroundColor: "#F8FAFF", borderTop: "0.5px solid #E5E7EB" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>TOTAL</span>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>100%</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{formatBRL(patrimonioBase)}</span>
          </div>
        </div>
      </div>

      {/* ── Conferência por Classe ──────────────────────────────────────────── */}
      {resumoPorClasse.length > 0 && (
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6" }}>
            <i className="ti ti-layout-grid" style={{ fontSize: 16, color: "#2563EB" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Conferência por Classe</span>
            <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>após execução do plano</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 80px 80px 100px", padding: "6px 8px", background: "#F8FAFF", borderRadius: 6, marginBottom: 6, fontSize: 9, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span>Classe</span>
            <span style={{ textAlign: "right" }}>% Atual</span>
            <span style={{ textAlign: "right" }}>% Meta</span>
            <span style={{ textAlign: "right" }}>% Final</span>
            <span style={{ textAlign: "right" }}>Saldo vs Meta</span>
          </div>

          {resumoPorClasse.map((c) => {
            const saldoVsMeta = c.valorFinal - c.valorMeta;
            return (
              <div key={c.cardId} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 80px 80px 100px", padding: "8px 8px", borderBottom: "0.5px solid #F9FAFB", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{c.label}</span>
                </div>
                <span style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>{c.pctAtual.toFixed(1)}%</span>
                <span style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>{c.pctMeta.toFixed(1)}%</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.adequado ? "#15803D" : "#B45309", textAlign: "right" }}>{c.pctFinal.toFixed(1)}%</span>
                <div style={{ textAlign: "right" }}>
                  {saldoVsMeta === 0 ? (
                    <span style={{ fontSize: 10, color: "#15803D", background: "#DCFCE7", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Na meta</span>
                  ) : saldoVsMeta > 0 ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#B45309" }}>+{saldoVsMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: 9, color: "#9CA3AF" }}>acima da meta</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#B91C1C" }}>{saldoVsMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: 9, color: "#9CA3AF" }}>abaixo da meta</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(() => {
            const classesComDesvio = resumoPorClasse.filter((c) => !c.adequado && c.pctMeta > 0);
            const totalMov = resumoPorClasse.reduce((s, c) => s + c.movLiquida, 0);
            return (
              <div style={{ marginTop: 12, padding: "10px 8px", background: classesComDesvio.length === 0 ? "#F0FDF4" : "#FFF7ED", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: classesComDesvio.length === 0 ? "#15803D" : "#B45309" }}>
                  {classesComDesvio.length === 0 ? "✓ Todas as classes dentro da meta" : `${classesComDesvio.length} classe(s) com desvio`}
                </span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>
                  Movimentação total: <strong>{totalMov > 0 ? "+" : ""}{totalMov.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</strong>
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Como sua carteira deverá ficar ─────────────────────────────────── */}
      {carteiraFinal.length > 0 && (
        <CardSelecaoAtivos
          ativosRecomendados={carteiraFinal}
          macroMeta={macroMeta}
          patrimonio={patrimonioBase}
          titulo="Como sua carteira deverá ficar"
          subtitulo="Seleção de ativos após execução do plano"
        />
      )}

      {/* ── Plano de Ação Salvo ─────────────────────────────────────────────── */}
      {cardsComItens.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Plano de Ação Salvo</span>

          {cardsComItens.map((cardId: CardId) => {
            const meta = CARD_META[cardId];
            const items: PlanoAcaoItem[] = carteira.planoAcao.filter((p) => p.card === cardId);
            const groupTotal = items.reduce((s, p) => s + p.movimentacaoBRL, 0);

            return (
              <div key={cardId} style={{ backgroundColor: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC", padding: "8px 16px", borderBottom: "1px solid #BFDBFE" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block" }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{meta.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6, backgroundColor: groupTotal > 0 ? "#DCFCE7" : groupTotal < 0 ? "#FEE2E2" : "#F0F7FF", color: groupTotal > 0 ? "#15803D" : groupTotal < 0 ? "#B91C1C" : "#9CA3AF" }}>
                    {groupTotal === 0 ? "—" : `${groupTotal > 0 ? "+" : ""}${formatBRL(groupTotal)}`}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "6px 14px", backgroundColor: "#1E3A8A" }}>
                  {["Ativo", "Ação", "Atual R$", "Meta R$", "Movimentação"].map((h) => (
                    <span key={h} style={{ color: "white", fontSize: 11, fontWeight: 600 }}>{h}</span>
                  ))}
                </div>

                {items.map((item) => {
                  const acaoEfetiva = item.acao || item.tipo || "manter";
                  const cfg = ACAO_CONFIG[acaoEfetiva] ?? ACAO_CONFIG["manter"];
                  return (
                    <div
                      key={item.id}
                      style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 14px", borderTop: "1px solid #F3F4F6", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                        {item.segmento && <span style={{ display: "block", fontSize: 11, color: "#9CA3AF" }}>{item.segmento}</span>}
                      </div>
                      <span style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: 10, borderRadius: 4, padding: "1px 5px", display: "inline-block", width: "fit-content" }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorAtualBRL)}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {acaoEfetiva === "manter" ? formatBRL(item.valorAtualBRL) : formatBRL(item.valorMetaBRL)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: acaoEfetiva === "manter" ? "#9CA3AF" : item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF" }}>
                        {acaoEfetiva === "manter" || item.movimentacaoBRL === 0
                          ? formatBRL(0)
                          : `${item.movimentacaoBRL > 0 ? "+" : "−"}${formatBRL(Math.abs(item.movimentacaoBRL))}`
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
