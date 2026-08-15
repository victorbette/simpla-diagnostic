import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import type { Ativo, PlanoAcaoItem, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CardSelecaoAtivos } from "@/components/shared/CardSelecaoAtivos";
import { CardAlocacaoComparativa } from "@/components/shared/CardAlocacaoComparativa";
import { Tooltip } from "@/components/shared/Tooltip";
import { PainelAjuda } from "@/components/shared/PainelAjuda";

interface Props {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  patrimonio: number;
  aporteDisponivel?: number;
  onSalvar: () => void;
  salvando: boolean;
  salvo: boolean;
}

const AJUDA_ETAPA4 = [
  {
    titulo: "O que é o Resultado?",
    conteudo: "A Etapa 4 consolida tudo que foi planejado: mostra o patrimônio atual, os aportes e resgates previstos, a alocação por classe antes e depois, e como a carteira ficará após a execução do plano.",
  },
  {
    titulo: "Patrimônio Atual",
    conteudo: "Soma de todos os ativos informados na Etapa 1 — Carteira Atual. É o ponto de partida do planejamento.",
  },
  {
    titulo: "Patrimônio Final",
    conteudo: "Estimativa do patrimônio após a execução do plano: soma dos ativos mantidos + aportes realizados − resgates efetuados. Reflete o resultado esperado da carteira proposta.",
  },
  {
    titulo: "Total de Aportes",
    conteudo: "Soma de todos os valores de aporte e novos investimentos definidos no Plano de Ação. Representa o capital novo que será aplicado.",
  },
  {
    titulo: "Total de Resgates",
    conteudo: "Soma de todos os resgates (parciais e totais) previstos no Plano de Ação. Representa o capital que será retirado da carteira.",
  },
  {
    titulo: "Comparativo por Classe",
    conteudo: "Tabela que mostra, para cada classe de ativo, o valor atual versus o valor proposto após o plano, e a diferença em reais. Positivo = aumento de exposição; negativo = redução.",
  },
  {
    titulo: "Como salvar",
    conteudo: "Clique em 'Salvar carteira' para registrar o planejamento completo. Após salvar, o diagnóstico fica disponível para consulta e impressão. Você pode voltar às etapas anteriores e salvar novamente para atualizar.",
  },
];

function calcularValorFinal(item: PlanoAcaoItem): number {
  switch (item.acao) {
    case "manter":
      return item.valorAtualBRL;
    case "aportar":
    case "novo":
      return item.valorAtualBRL + (item.movimentacaoEditada ?? Math.abs(item.movimentacaoBRL ?? 0));
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

export function Etapa4Resultado({ ativosAtuais, alocacaoMeta, planoAcao, patrimonio, aporteDisponivel = 0, onSalvar, salvando, salvo }: Props) {
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);
  const patrimonioTotal = ativosAtuais.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
  const patrimonioBase  = patrimonioTotal + aporteDisponivel;
  // kept for prop-pass compat (CardAlocacaoComparativa, CardSelecaoAtivos)
  const patrimonioMeta  = patrimonio + aporteDisponivel;

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

  const totalAportes = planoAcao
    .filter((p) => p.acao === 'aportar' || p.acao === 'novo')
    .reduce((s, p) => {
      const mov = p.movimentacaoEditada !== undefined
        ? Number(p.movimentacaoEditada)
        : Number(p.movimentacaoBRL) || 0;
      return s + Math.abs(mov);
    }, 0);
  const totalResgates = planoAcao
    .filter((p) => p.acao === 'resgatar_total' || p.acao === 'resgatar_parcial')
    .reduce((s, p) => {
      if (p.acao === 'resgatar_total') return s + (Number(p.valorAtualBRL) || 0);
      return s + (Number(p.valorResgateBRL) || 0);
    }, 0);

  const aportes = planoAcao.filter((p) => p.acao === "aportar" || p.acao === "novo");
  const resgates = planoAcao.filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total");
  const mantidos = planoAcao.filter((p) => p.acao === "manter");

  // Per card: atual = soma ativos atuais; meta = alocacaoMeta % × (patrimônioTotal + aporte)
  const cardTotais = useMemo(
    () => CARD_ORDER.map((cardId) => {
      const atual = ativosAtuais.filter((a) => a.card === cardId).reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);
      const pctMeta = alocacaoMeta[cardId] ?? 0;
      const meta = (pctMeta / 100) * patrimonioBase;
      return { cardId, atual, meta, dif: meta - atual };
    }),
    [ativosAtuais, alocacaoMeta, patrimonioBase]
  );

  const carteiraFinal = useMemo(() =>
    planoAcao
      .map((item) => {
        const valorFinal = calcularValorFinal(item);
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
      .filter(Boolean) as Ativo[],
    [planoAcao, ativosAtuais]
  );

  const patrimonioFinal = carteiraFinal.reduce((s, a) => s + (Number(a.valorBRL) || 0), 0);

  const cardStyle = (_accent?: string): React.CSSProperties => ({
    border: "0.5px solid #E5E7EB",
    borderRadius: 10, backgroundColor: "white", overflow: "hidden",
  });

  return (
    <>
      <PainelAjuda
        titulo="Resultado — Ajuda"
        secoes={AJUDA_ETAPA4}
        aberto={painelAjudaAberto}
        onFechar={() => setPainelAjudaAberto(false)}
      />

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Resultado</span>
        <button
          onClick={() => setPainelAjudaAberto(true)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, color: "#2563EB", background: "#EFF6FF",
            border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "4px 10px", cursor: "pointer",
          }}
        >
          <i className="ti ti-help-circle" style={{ fontSize: 14 }} />
          Ajuda
        </button>
      </div>

    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Visão Geral */}
      <div style={cardStyle("#1E3A8A")}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #BFDBFE", fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Visão Geral
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {/* Patrimônio Atual */}
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>Patrimônio Atual</p>
              <Tooltip posicao="right" texto="Soma de todos os ativos da Carteira Atual (Etapa 1). Ponto de partida do planejamento." />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#1E3A8A", margin: 0 }}>{formatBRL(patrimonioTotal)}</p>
          </div>
          {/* Patrimônio Final */}
          <div style={{ padding: 16, borderLeft: "1px solid #BFDBFE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>Patrimônio Final</p>
              <Tooltip posicao="right" texto="Estimativa após execução do plano: ativos mantidos + aportes − resgates. Reflete o resultado esperado da carteira proposta." />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#2563EB", margin: 0 }}>{formatBRL(patrimonioFinal)}</p>
          </div>
          {/* Total Aportes */}
          <div style={{ padding: 16, borderLeft: "1px solid #BFDBFE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>Total Aportes</p>
              <Tooltip posicao="right" texto="Soma de todos os aportes e novos investimentos definidos no Plano de Ação. Capital novo a ser aplicado." />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#15803D", margin: 0 }}>{formatBRL(totalAportes)}</p>
          </div>
          {/* Total Resgates */}
          <div style={{ padding: 16, borderLeft: "1px solid #BFDBFE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <p style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>Total Resgates</p>
              <Tooltip posicao="right" texto="Soma de todos os resgates (parciais e totais) previstos no Plano de Ação. Capital a ser retirado da carteira." />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#B91C1C", margin: 0 }}>{formatBRL(totalResgates)}</p>
          </div>
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
                <th style={{ padding: "8px 14px", textAlign: "left", color: "white", fontWeight: 600, fontSize: 11 }}>Classe</th>
                <th style={{ padding: "8px 14px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>R$ Atual</th>
                <th style={{ padding: "8px 14px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                    R$ Proposta
                    <Tooltip posicao="top" texto="Valor alvo por classe: % meta × (patrimônio + aporte disponível). É o quanto deveria haver nessa classe após o plano." />
                  </div>
                </th>
                <th style={{ padding: "8px 14px", textAlign: "right", color: "white", fontWeight: 600, fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                    Diferença
                    <Tooltip posicao="top" texto="Proposta − Atual. Positivo = aumentar exposição nessa classe; negativo = reduzir." />
                  </div>
                </th>
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
      <CardSelecaoAtivos
        ativosRecomendados={carteiraFinal}
        macroMeta={alocacaoMeta}
        patrimonio={patrimonioMeta}
        titulo="Como sua carteira deverá ficar"
        subtitulo="Seleção de ativos após execução do plano"
      />

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, paddingBottom: 8 }}>
        <Tooltip posicao="top" texto="Salva o planejamento completo. Após salvar, o diagnóstico fica disponível para consulta e impressão. Você pode voltar às etapas anteriores e salvar novamente para atualizar." />
        <button
          onClick={onSalvar}
          disabled={salvando}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: salvo ? "#166534" : "#15803D", color: "white",
            border: "none", borderRadius: 8,
            padding: "12px 40px", fontSize: 15, fontWeight: 500,
            cursor: salvando ? "wait" : "pointer",
            opacity: salvando ? 0.85 : 1,
          }}
          onMouseEnter={(e) => { if (!salvando) e.currentTarget.style.backgroundColor = "#166534"; }}
          onMouseLeave={(e) => { if (!salvando) e.currentTarget.style.backgroundColor = salvo ? "#166534" : "#15803D"; }}
        >
          <Save size={18} />
          {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar carteira"}
        </button>
      </div>
    </div>
    </>
  );
}
