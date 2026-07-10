import { useMemo } from "react";
import { Save } from "lucide-react";
import type { Ativo, PlanoAcaoItem, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CardSelecaoAtivos } from "@/components/shared/CardSelecaoAtivos";
import { CardAlocacaoComparativa } from "@/components/shared/CardAlocacaoComparativa";

interface Props {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  patrimonio: number;
  aporteDisponivel?: number;
  onSave: () => void;
}

function calcularValorFinal(item: PlanoAcaoItem): number {
  switch (item.acao) {
    case "manter":
      return item.valorAtualBRL;
    case "aportar":
    case "novo":
      return item.valorAtualBRL + item.movimentacaoBRL;
    case "resgatar_total":
      return 0;
    case "resgatar_parcial": {
      const resgate = item.valorResgateBRL !== undefined
        ? item.valorResgateBRL
        : Math.abs(item.movimentacaoBRL);
      return Math.max(0, item.valorAtualBRL - resgate);
    }
    default:
      return item.valorAtualBRL;
  }
}

export function Etapa4Resultado({ ativosAtuais, ativosRecomendados, alocacaoMeta, planoAcao, patrimonio, aporteDisponivel = 0, onSave }: Props) {
  const patrimonioMeta = patrimonio + aporteDisponivel;

  const patrimonioTotal = ativosAtuais.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);

  const macroAtualCalc = useMemo(
    () => CARD_ORDER.reduce((acc, id) => {
      const total = ativosAtuais
        .filter((a) => a.card === id)
        .reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
      acc[id] = patrimonioTotal > 0 ? (total / patrimonioTotal) * 100 : 0;
      return acc;
    }, {} as Record<string, number>),
    [ativosAtuais, patrimonioTotal]
  );

  const totalAportes = planoAcao.filter((p) => p.acao !== 'manter' && p.movimentacaoBRL > 0).reduce((s, p) => s + p.movimentacaoBRL, 0);
  const totalResgates = planoAcao
    .filter((p) => p.acao !== 'manter' && p.movimentacaoBRL < 0)
    .reduce((s, p) => {
      if (p.acao === 'resgatar_parcial' && p.valorResgateBRL !== undefined) return s + p.valorResgateBRL;
      return s + Math.abs(p.movimentacaoBRL);
    }, 0);

  const aportes = planoAcao.filter((p) => p.acao === "aportar" || p.acao === "novo");
  const resgates = planoAcao.filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total");
  const mantidos = planoAcao.filter((p) => p.acao === "manter");

  // Per card: atual = soma ativos atuais; meta = alocacaoMeta % × (patrimônio + aporte)
  const cardTotais = useMemo(
    () => CARD_ORDER.map((cardId) => {
      const atual = ativosAtuais.filter((a) => a.card === cardId).reduce((s, a) => s + a.valorBRL, 0);
      const pctMeta = alocacaoMeta[cardId] ?? 0;
      const meta = (pctMeta / 100) * patrimonioMeta;
      return { cardId, atual, meta, dif: meta - atual };
    }),
    [ativosAtuais, alocacaoMeta, patrimonioMeta]
  );

  const cardStyle = (_accent?: string): React.CSSProperties => ({
    border: "0.5px solid #E5E7EB",
    borderRadius: 10, backgroundColor: "white", overflow: "hidden",
  });

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Visão Geral */}
      <div style={cardStyle("#1E3A8A")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Visão Geral
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            { label: "Patrimônio Total", value: formatBRL(patrimonioMeta), color: "#1E3A8A" },
            { label: "Total Aportes",    value: formatBRL(totalAportes), color: "#15803D" },
            { label: "Total Resgates",   value: formatBRL(totalResgates), color: "#B91C1C" },
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{ padding: 16, borderLeft: i > 0 ? "1px solid #BFDBFE" : "none" }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alocação Atual vs Proposta */}
      <CardAlocacaoComparativa
        macroAtual={macroAtualCalc}
        macroMeta={alocacaoMeta}
        patrimonio={patrimonioMeta}
      />

      {/* Comparativo por Card */}
      <div style={cardStyle("#2563EB")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Comparativo por Classe
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#1E3A8A" }}>
              <tr>
                {["Classe", "R$ Atual", "R$ Proposta", "Diferença"].map((h) => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: h === "Classe" ? "left" : "right", color: "white", fontWeight: 600, fontSize: 11 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cardTotais.map(({ cardId, atual, meta, dif }, i) => (
                <tr key={cardId} style={{ backgroundColor: i % 2 === 0 ? "#F0F7FF" : "white" }}>
                  <td style={{ padding: "8px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: CARD_META[cardId].cor, display: "inline-block" }} />
                      {CARD_META[cardId].label}
                    </div>
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right", color: "#6B7280" }}>{formatBRL(atual)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right" }}>{formatBRL(meta)}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, color: dif > 0 ? "#15803D" : dif < 0 ? "#B91C1C" : "#9CA3AF" }}>
                    {dif === 0 ? "—" : `${dif > 0 ? "+" : ""}${formatBRL(dif)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimentações */}
      <div style={cardStyle("#15803D")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Movimentações
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {[
            { title: "Aportar", items: aportes, color: "#15803D", getVal: (it: PlanoAcaoItem) => it.movimentacaoBRL },
            { title: "Resgatar", items: resgates, color: "#B91C1C", getVal: (it: PlanoAcaoItem) => it.acao === "resgatar_parcial" && it.valorResgateBRL !== undefined ? -it.valorResgateBRL : it.movimentacaoBRL },
            { title: "Manter", items: mantidos, color: "#6B7280", getVal: (it: PlanoAcaoItem) => it.valorAtualBRL },
          ].map(({ title, items, color, getVal }, ci) => (
            <div key={title} style={{ padding: 14, borderLeft: ci > 0 ? "1px solid #BFDBFE" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color, margin: 0 }}>{title}</p>
              {items.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Nenhum</p>
              ) : (
                <>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                        <span style={{
                          backgroundColor: CARD_META[item.card].cor + "18",
                          color: CARD_META[item.card].cor,
                          borderRadius: 4, padding: "1px 5px", fontSize: 10, flexShrink: 0,
                        }}>
                          {CARD_META[item.card].label}
                        </span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nomeAtivo}</span>
                      </div>
                      <span style={{ color, fontWeight: 500, flexShrink: 0 }}>{formatBRL(Math.abs(getVal(item)))}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #BFDBFE", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                    <span>Total</span>
                    <span style={{ color }}>{formatBRL(Math.abs(items.reduce((s, it) => s + getVal(it), 0)))}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Seleção de Ativos Recomendados */}
      {(() => {
        const ativosCarteiraFinal = planoAcao
          .map((item) => {
            const valorFinal = calcularValorFinal(item);
            if (valorFinal <= 0) return null;
            const ativoRec = ativosRecomendados.find((a) => a.nome === item.nomeAtivo && a.card === item.card);
            const ativoAtual = ativosAtuais.find((a) => a.nome === item.nomeAtivo && a.card === item.card);
            const base = ativoRec ?? ativoAtual;
            if (!base) return null;
            return { ...base, valorBRL: valorFinal, nome: item.nomeAtivo, card: item.card };
          })
          .filter(Boolean) as Ativo[];
        return (
          <CardSelecaoAtivos
            ativosRecomendados={ativosCarteiraFinal}
            macroMeta={alocacaoMeta}
            patrimonio={patrimonioMeta}
            titulo="Seleção de Ativos Recomendados"
            subtitulo="Carteira final após execução do plano de ação"
          />
        );
      })()}

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
        <button
          onClick={onSave}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: "#15803D", color: "white",
            border: "none", borderRadius: 8,
            padding: "12px 40px", fontSize: 15, fontWeight: 500, cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#166534")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#15803D")}
        >
          <Save size={18} />
          Salvar carteira
        </button>
      </div>
    </div>
  );
}
