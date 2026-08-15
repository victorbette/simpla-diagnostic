import { useState, useMemo, useEffect } from "react";
import type { PlanoAcaoItem, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Tooltip } from "@/components/shared/Tooltip";
import { PainelAjuda } from "@/components/shared/PainelAjuda";

interface Props {
  planoAcao: PlanoAcaoItem[];
  onPlanoAcao: (p: PlanoAcaoItem[]) => void;
  notasConsultor: string;
  onNotasConsultor: (s: string) => void;
  patrimonio: number;
  aporteDisponivel: number;
  macroMeta: Record<CardId, number>;
}

type Filtro = "todos" | "aportar" | "resgatar" | "manter" | "novo";

const AJUDA_ETAPA3 = [
  {
    titulo: "O que é o Plano de Ação?",
    conteudo: `O Plano de Ação define as movimentações necessárias para transformar a carteira atual na carteira recomendada.\n\nO sistema gera automaticamente as sugestões com base na comparação entre Etapa 1 (atual) e Etapa 2 (recomendada).\n\nO consultor pode revisar e ajustar cada movimentação antes de avançar para o Resultado.`,
  },
  {
    titulo: "Tipos de Ação",
    conteudo: `Cada ativo recebe uma ação sugerida:\n\nManter:\nO ativo está dentro da meta — nenhuma movimentação necessária.\n\nResgatar Total:\nO ativo deve ser totalmente resgatado e os recursos realocados em outras classes.\n\nResgatar Parcial:\nApenas parte do ativo deve ser resgatada. O valor de resgate pode ser ajustado manualmente.\n\nAportar:\nO ativo está abaixo da meta — deve receber novos recursos.\n\nNovo:\nAtivo que não existe na carteira atual mas deve ser adicionado conforme a recomendação.`,
  },
  {
    titulo: "Conferência por Classe",
    conteudo: `Painel que mostra o desvio de cada classe em relação à meta após as movimentações:\n\n% Atual: percentual atual da classe\n% Meta: percentual alvo definido na Etapa 2\n% Final: percentual após todas as movimentações\nSaldo vs Meta: diferença em R$ entre o final e a meta\n\nVerde: dentro da tolerância (desvio ≤ 2%)\nAmarelo: atenção (desvio entre 2% e 5%)\nVermelho: rebalanceamento necessário (desvio > 5%)`,
  },
  {
    titulo: "Sugerir Ajustes por Classe",
    conteudo: `Botão que analisa automaticamente os desvios dentro de cada classe e sugere ajustes nos aportes.\n\nComo funciona:\n- Classe acima da meta → reduz proporcionalmente os aportes dos ativos daquela classe\n- Classe abaixo da meta → aumenta proporcionalmente os aportes dos ativos daquela classe\n\nA redistribuição acontece DENTRO de cada classe — não move recursos entre classes.\n\nO consultor pode confirmar classe por classe ou confirmar todos de uma vez. Ativos ajustados são marcados com badge verde "✓ Ajustado".`,
  },
  {
    titulo: "Vencimento",
    conteudo: `Campo de texto livre para informar o vencimento de ativos de renda fixa no plano de ação.\n\nUse o formato que preferir:\n- Jan/2026\n- 15/03/2027\n- 2028\n\nO vencimento informado aqui tem prioridade sobre o vencimento da Etapa 1 e aparece no card "Como sua carteira deverá ficar".`,
  },
  {
    titulo: "Observações",
    conteudo: `Campo para registrar justificativas ou instruções específicas para cada movimentação.\n\nObrigatório apenas para:\n- Ativos adicionados manualmente pelo consultor\n\nPara ativos recomendados (vindos da Etapa 2), a observação é opcional mesmo quando o valor é editado.\n\nAs observações aparecem no relatório PDF na seção de Gestão de Ativos.`,
  },
  {
    titulo: "Adicionar ativo manualmente",
    conteudo: `O consultor pode adicionar ativos que não estavam na carteira atual nem na recomendação:\n\n1. Clique em "+ Adicionar ativo" dentro da classe desejada\n2. Informe o nome, valor e justificativa\n3. O ativo aparece marcado como "Manual" no plano\n\nAtivos adicionados manualmente exigem observação obrigatória para justificar a inclusão.`,
  },
  {
    titulo: "Dicas para o consultor",
    conteudo: `• Verifique a Conferência por Classe antes de avançar — garante que todas as classes estão próximas da meta.\n\n• Use "Sugerir Ajustes por Classe" para redistribuir automaticamente valores dentro de cada classe com desvio.\n\n• Ativos com vencimento próximo são bons candidatos a resgate total — os recursos podem ser realocados mais eficientemente.\n\n• Ao aplicar a Recomendação Simpla na Etapa 2 após edições aqui, o plano de ação é regenerado e os ajustes são perdidos.\n\n• Os dados são salvos automaticamente ao avançar para a Etapa 4.`,
  },
];

const TIPO_CONFIG: Record<PlanoAcaoItem["acao"], { bg: string; color: string; label: string }> = {
  manter:           { bg: "#F3F4F6", color: "#6B7280", label: "→ Manter" },
  aportar:          { bg: "#DCFCE7", color: "#15803D", label: "↑ Aportar" },
  resgatar_parcial: { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar" },
  resgatar_total:   { bg: "#FEE2E2", color: "#B91C1C", label: "↓ Resgatar tudo" },
  novo:             { bg: "#DBEAFE", color: "#1E40AF", label: "✦ Novo" },
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #BFDBFE", borderRadius: 6,
  padding: "3px 6px", fontSize: 12,
  backgroundColor: "white", color: "#111827",
  cursor: "pointer", outline: "none",
};

function formatInputBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(text: string): number {
  const clean = text
    .replace(/R\$\s?/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

interface SugestaoClasse {
  cardId: string;
  label: string;
  valorAtual: number;
  valorMeta: number;
  desvio: number;
  sugestoes: {
    ativoId: string;
    ativoNome: string;
    movimentacaoAtual: number;
    movimentacaoSugerida: number;
    delta: number;
  }[];
  podeAjustar: boolean;
  mensagem?: string;
}

function movEfetivo(item: PlanoAcaoItem): number {
  if (item.acao === "aportar" || item.acao === "novo") {
    return item.movimentacaoEditada ?? item.movimentacaoBRL;
  }
  if (item.acao === "resgatar_parcial" && item.valorResgateBRL !== undefined) {
    return -item.valorResgateBRL;
  }
  return item.movimentacaoBRL;
}

function exigeObservacao(item: PlanoAcaoItem): boolean {
  return item.adicionadoManualmente === true || item.acao === "manter" || item.acao === "resgatar_parcial";
}

function placeholderObservacao(item: PlanoAcaoItem): string {
  if (item.acao === "novo") return "Justifique a inclusão deste ativo na carteira recomendada...";
  if (item.acao === "manter") {
    if ((item.valorMetaBRL ?? 0) === 0) return "Ativo não consta na carteira recomendada — justifique a manutenção...";
    return "Justifique por que está mantendo o ativo fora da alocação ideal...";
  }
  if (item.acao === "resgatar_parcial") return "Justifique o resgate parcial em vez do total recomendado...";
  return "Motivo da alteração do valor sugerido...";
}

export function Etapa3PlanoAcao({
  planoAcao, onPlanoAcao, notasConsultor, onNotasConsultor, patrimonio, aporteDisponivel, macroMeta,
}: Props) {
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editandoMovId, setEditandoMovId] = useState<string | null>(null);
  const [editandoMovVal, setEditandoMovVal] = useState<string>("");
  const [adicionandoAtivo, setAdicionandoAtivo] = useState(false);
  const [novoAtivo, setNovoAtivo] = useState({
    nome: "",
    card: "",
    segmento: "",
    valorBRL: 0,
    observacao: "",
  });

  function resetNovoAtivo() {
    setNovoAtivo({ nome: "", card: "", segmento: "", valorBRL: 0, observacao: "" });
  }

  const [editandoManualId, setEditandoManualId] = useState<string | null>(null);
  const [editandoManual, setEditandoManual] = useState({
    nome: "",
    card: "",
    segmento: "",
    valorBRL: 0,
    observacao: "",
  });

  const [ativosAjustados, setAtivosAjustados] = useState<Set<string>>(new Set());
  const [sugestoes, setSugestoes] = useState<SugestaoClasse[]>([]);

  // Reconstruct ativosAjustados from persisted flag whenever plan changes
  useEffect(() => {
    if (planoAcao.length > 0) {
      setAtivosAjustados(new Set(planoAcao.filter((i) => i.ajustadoPorRedistribuicao).map((i) => i.id)));
    }
  }, [planoAcao]);

  function updateItem(id: string, patch: Partial<PlanoAcaoItem>) {
    onPlanoAcao(planoAcao.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (patch.acao === "manter") {
        next.movimentacaoBRL = 0;
        next.valorResgateBRL = undefined;
        next.movimentacaoEditada = undefined;
      } else if (patch.acao === "resgatar_parcial") {
        if (p.acao === "manter") {
          next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
        }
        if (next.valorResgateBRL === undefined) {
          next.valorResgateBRL = Math.abs(next.movimentacaoBRL);
        }
        next.movimentacaoEditada = undefined;
      } else if (patch.acao === "resgatar_total") {
        next.movimentacaoEditada = undefined;
        if (p.acao === "manter") {
          next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
        }
      } else if (patch.acao !== undefined && p.acao === "manter") {
        next.movimentacaoBRL = Math.round((p.valorMetaBRL - p.valorAtualBRL) * 100) / 100;
      }
      return next;
    }));
  }

  const { totalAportes, totalResgates, saldoLiquido, nMovs } = useMemo(() => {
    const ap = planoAcao
      .filter((p) => p.acao === "aportar" || p.acao === "novo")
      .reduce((s, p) => s + movEfetivo(p), 0);
    const re = planoAcao
      .filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total")
      .reduce((s, p) => {
        if (p.acao === "resgatar_parcial" && p.valorResgateBRL !== undefined) {
          return s + p.valorResgateBRL;
        }
        return s + Math.abs(p.movimentacaoBRL);
      }, 0);
    return {
      totalAportes: ap,
      totalResgates: re,
      saldoLiquido: ap - re,
      nMovs: planoAcao.filter((p) => p.acao !== "manter").length,
    };
  }, [planoAcao]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return planoAcao;
    if (filtro === "resgatar") return planoAcao.filter((p) => p.acao === "resgatar_parcial" || p.acao === "resgatar_total");
    return planoAcao.filter((p) => p.acao === filtro);
  }, [planoAcao, filtro]);

  const cardsComItens = CARD_ORDER.filter((k) => filtrados.some((p) => p.card === k));

  const resumoPorClasse = useMemo(() => {
    return CARD_ORDER.map((cardId) => {
      const itensDaClasse = planoAcao.filter((i) => i.card === cardId);
      const valorAtual = itensDaClasse.reduce((s, i) => s + (Number(i.valorAtualBRL) || 0), 0);
      const valorFinal = itensDaClasse.reduce((s, i) => {
        let vf = 0;
        switch (i.acao) {
          case "aportar":
          case "novo":
            vf = (Number(i.valorAtualBRL) || 0) + (i.movimentacaoEditada ?? Math.abs(i.movimentacaoBRL ?? 0));
            break;
          case "manter":
            vf = Number(i.valorAtualBRL) || 0;
            break;
          case "resgatar_parcial":
            vf = Math.max(0, (Number(i.valorAtualBRL) || 0) - (i.valorResgateBRL ?? Math.abs(i.movimentacaoBRL ?? 0)));
            break;
          case "resgatar_total":
            vf = 0;
            break;
          default:
            vf = Number(i.valorAtualBRL) || 0;
        }
        return s + vf;
      }, 0);
      const pctMeta = Number(macroMeta[cardId]) || 0;
      const patrimonioBase = patrimonio + aporteDisponivel;
      const valorMeta = (pctMeta / 100) * patrimonioBase;
      const pctFinal = patrimonioBase > 0 ? (valorFinal / patrimonioBase) * 100 : 0;
      const desvio = pctFinal - pctMeta;
      const movLiquida = valorFinal - valorAtual;
      return {
        cardId,
        label: CARD_META[cardId].label,
        cor: CARD_META[cardId].cor,
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
  }, [planoAcao, macroMeta, patrimonio, aporteDisponivel]);

  function calcularSugestoesPorClasse(): SugestaoClasse[] {
    const patrimonioBase = patrimonio + aporteDisponivel;
    const resultado: SugestaoClasse[] = [];

    CARD_ORDER.forEach((cardId) => {
      const pctMeta = Number(macroMeta[cardId]) || 0;
      if (pctMeta === 0) return;

      const valorMeta = (pctMeta / 100) * patrimonioBase;
      const itensClasse = planoAcao.filter((i) => i.card === cardId);
      const valorFinalClasse = itensClasse.reduce((s, i) => {
        let vf = 0;
        switch (i.acao) {
          case "aportar": case "novo":
            vf = (Number(i.valorAtualBRL) || 0) + (i.movimentacaoEditada ?? Math.abs(i.movimentacaoBRL ?? 0));
            break;
          case "manter":
            vf = Number(i.valorAtualBRL) || 0;
            break;
          case "resgatar_parcial":
            vf = Math.max(0, (Number(i.valorAtualBRL) || 0) - (i.valorResgateBRL ?? Math.abs(i.movimentacaoBRL ?? 0)));
            break;
          case "resgatar_total":
            vf = 0;
            break;
          default:
            vf = Number(i.valorAtualBRL) || 0;
        }
        return s + vf;
      }, 0);

      const desvio = valorFinalClasse - valorMeta;
      if (Math.abs(desvio) < 100) return;

      const ativosAjustaveis = itensClasse.filter((i) => i.acao === "aportar" || i.acao === "novo");
      const totalMovAtual = ativosAjustaveis.reduce((s, i) => {
        const mov = i.movimentacaoEditada !== undefined ? Number(i.movimentacaoEditada) : Number(i.movimentacaoBRL) || 0;
        return s + Math.abs(mov);
      }, 0);

      const sugs: SugestaoClasse["sugestoes"] = [];
      let podeAjustar = false;
      let mensagem: string | undefined;

      if (desvio > 0) {
        if (ativosAjustaveis.length > 0 && totalMovAtual >= desvio) {
          podeAjustar = true;
          ativosAjustaveis.forEach((item) => {
            const movAtual = item.movimentacaoEditada !== undefined ? Number(item.movimentacaoEditada) : Number(item.movimentacaoBRL) || 0;
            const proporcao = totalMovAtual > 0 ? Math.abs(movAtual) / totalMovAtual : 1 / ativosAjustaveis.length;
            const novoMov = Math.max(0, Math.abs(movAtual) - desvio * proporcao);
            sugs.push({ ativoId: item.id, ativoNome: item.nomeAtivo, movimentacaoAtual: Math.abs(movAtual), movimentacaoSugerida: Math.round(novoMov * 100) / 100, delta: Math.round((novoMov - Math.abs(movAtual)) * 100) / 100 });
          });
        } else {
          mensagem = ativosAjustaveis.length === 0
            ? "Nenhum aporte para reduzir. Considere resgatar ativos desta classe."
            : "Aportes insuficientes para cobrir o excesso. Reduza resgates ou adicione resgate parcial.";
        }
      } else {
        const falta = Math.abs(desvio);
        if (ativosAjustaveis.length > 0) {
          podeAjustar = true;
          ativosAjustaveis.forEach((item) => {
            const movAtual = item.movimentacaoEditada !== undefined ? Number(item.movimentacaoEditada) : Number(item.movimentacaoBRL) || 0;
            const proporcao = totalMovAtual > 0 ? Math.abs(movAtual) / totalMovAtual : 1 / ativosAjustaveis.length;
            const acrescimo = falta * proporcao;
            const novoMov = Math.abs(movAtual) + acrescimo;
            sugs.push({ ativoId: item.id, ativoNome: item.nomeAtivo, movimentacaoAtual: Math.abs(movAtual), movimentacaoSugerida: Math.round(novoMov * 100) / 100, delta: Math.round(acrescimo * 100) / 100 });
          });
        } else {
          mensagem = "Nenhum ativo disponível para aportar nesta classe.";
        }
      }

      resultado.push({ cardId, label: CARD_META[cardId]?.label ?? cardId, valorAtual: valorFinalClasse, valorMeta, desvio, sugestoes: sugs, podeAjustar, mensagem });
    });

    return resultado;
  }

  const COLS = "2fr 1fr 1fr 1fr 1fr 1.5fr 0.8fr 0.8fr";

  return (
    <>
    <PainelAjuda
      titulo="Etapa 3 — Plano de Ação"
      secoes={AJUDA_ETAPA3}
      aberto={painelAjudaAberto}
      onFechar={() => setPainelAjudaAberto(false)}
    />
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Plano de Ação</h3>
        <button
          onClick={() => setPainelAjudaAberto(true)}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563EB" }}
        >
          <i className="ti ti-help-circle" style={{ fontSize: 13 }} />
          Ajuda
        </button>
      </div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total Aportes",  value: formatBRL(totalAportes),  color: "#15803D" },
          { label: "Total Resgates", value: formatBRL(totalResgates),  color: "#B91C1C" },
          { label: "Saldo Líquido",  value: formatBRL(saldoLiquido),   color: saldoLiquido >= 0 ? "#15803D" : "#B91C1C" },
          { label: "Movimentações",  value: String(nMovs),             color: "#111827" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            border: "0.5px solid #E5E7EB",
            borderRadius: 8, padding: "12px 14px", backgroundColor: "white",
          }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Aporte badge */}
      {aporteDisponivel > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          backgroundColor: "#DCFCE7", border: "1px solid #A7C9AB",
          borderRadius: 8, padding: "8px 14px",
        }}>
          <i className="ti ti-cash" style={{ fontSize: 16, color: "#15803D" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#15803D" }}>
            Aporte de {formatBRL(aporteDisponivel)} incluído nos cálculos
          </span>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          ["todos", "Todos"],
          ["aportar", "Aportar"],
          ["resgatar", "Resgatar"],
          ["manter", "Manter"],
          ["novo", "Novo"],
        ] as [Filtro, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "4px 12px", borderRadius: 6,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: filtro === f ? "none" : "1px solid #BFDBFE",
              backgroundColor: filtro === f ? "#1E3A8A" : "white",
              color: filtro === f ? "white" : "#6B7280",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Painel de Conferência por Classe */}
      {resumoPorClasse.length > 0 && (
        <div style={{
          background: "white",
          border: "0.5px solid #E5E7EB",
          borderRadius: 12,
          padding: "20px 24px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #F3F4F6",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-layout-grid" style={{ fontSize: 16, color: "#2563EB" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Conferência por Classe</span>
              <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>após execução do plano</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Tooltip posicao="top" texto={`Redistribui automaticamente os aportes dentro de cada classe para minimizar desvios da meta.\nNão move recursos entre classes.`} />
              <button
                onClick={() => setSugestoes(calcularSugestoesPorClasse())}
                style={{
                  background: "#2563EB", color: "white",
                  border: "none", borderRadius: 8,
                  padding: "7px 14px", fontSize: 12,
                  fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <i className="ti ti-adjustments-horizontal" style={{ fontSize: 13 }} />
                Sugerir ajustes por classe
              </button>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 80px 80px 80px 100px",
            padding: "6px 8px",
            background: "#F8FAFF",
            borderRadius: 6,
            marginBottom: 6,
            fontSize: 9,
            color: "#9CA3AF",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            <span>Classe</span>
            <span style={{ textAlign: "right" }}>% Atual</span>
            <span style={{ textAlign: "right" }}>% Meta</span>
            <span style={{ textAlign: "right" }}>% Final</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
              <Tooltip posicao="left" texto={`Diferença em R$ entre o valor final e a meta da classe.\nPositivo: acima da meta.\nNegativo: abaixo da meta.`} />
              <span>Saldo vs Meta</span>
            </div>
          </div>

          {resumoPorClasse.map((c) => {
            const saldoVsMeta = c.valorFinal - c.valorMeta;
            return (
              <div key={c.cardId} style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 80px 80px 80px 100px",
                padding: "8px 8px",
                borderBottom: "0.5px solid #F9FAFB",
                alignItems: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{c.label}</span>
                </div>
                <span style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                  {c.pctAtual.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                  {c.pctMeta.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.adequado ? "#15803D" : "#B45309", textAlign: "right" }}>
                  {c.pctFinal.toFixed(1)}%
                </span>
                <div style={{ textAlign: "right" }}>
                  {saldoVsMeta === 0 ? (
                    <span style={{ fontSize: 10, color: "#15803D", background: "#DCFCE7", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                      Na meta
                    </span>
                  ) : saldoVsMeta > 0 ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#B45309" }}>
                        +{saldoVsMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: 9, color: "#9CA3AF" }}>acima da meta</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#B91C1C" }}>
                        {saldoVsMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </div>
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
              <div style={{
                marginTop: 12, padding: "10px 8px",
                background: classesComDesvio.length === 0 ? "#F0FDF4" : "#FFF7ED",
                borderRadius: 8,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: classesComDesvio.length === 0 ? "#15803D" : "#B45309",
                }}>
                  {classesComDesvio.length === 0
                    ? "✓ Todas as classes dentro da meta"
                    : `${classesComDesvio.length} classe(s) com desvio`}
                </span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>
                  Movimentação total:{" "}
                  <strong style={{ marginLeft: 4, color: totalMov >= 0 ? "#15803D" : "#B91C1C" }}>
                    {totalMov >= 0 ? "+" : ""}
                    {totalMov.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </strong>
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Painel de Sugestões por Classe */}
      {sugestoes.length > 0 && (
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            background: "#F8FAFF", padding: "12px 16px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
              Sugestões de ajuste por classe
            </span>
            <button
              onClick={() => setSugestoes([])}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 16 }}
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {sugestoes.map((s) => (
            <div key={s.cardId} style={{ padding: "14px 16px", borderBottom: "0.5px solid #F3F4F6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{s.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    color: s.desvio > 0 ? "#B91C1C" : "#B45309",
                    background: s.desvio > 0 ? "#FEE2E2" : "#FEF3C7",
                  }}>
                    {s.desvio > 0 ? "▲ Acima" : "▼ Abaixo"} da meta em {formatBRL(Math.abs(s.desvio))}
                  </span>
                </div>
                {s.podeAjustar && (
                  <button
                    onClick={() => {
                      onPlanoAcao(planoAcao.map((item) => {
                        const sug = s.sugestoes.find((x) => x.ativoId === item.id);
                        if (!sug) return item;
                        return { ...item, movimentacaoEditada: sug.movimentacaoSugerida, ajustadoPorRedistribuicao: true };
                      }));
                      setSugestoes((prev) => prev.filter((x) => x.cardId !== s.cardId));
                    }}
                    style={{
                      background: "#15803D", color: "white", border: "none",
                      borderRadius: 8, padding: "6px 14px", fontSize: 11,
                      fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    ✓ Confirmar ajuste
                  </button>
                )}
              </div>

              {!s.podeAjustar && s.mensagem && (
                <div style={{ fontSize: 11, color: "#B45309", background: "#FEF3C7", padding: "8px 12px", borderRadius: 6 }}>
                  ⚠ {s.mensagem}
                </div>
              )}

              {s.sugestoes.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Ativo", "Atual", "Ajuste", "Sugerido"].map((h) => (
                        <th key={h} style={{
                          fontSize: 9, color: "#9CA3AF", fontWeight: 600,
                          padding: "4px 8px",
                          textAlign: h === "Ativo" ? "left" : "right",
                        } as React.CSSProperties}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.sugestoes.map((sug, i) => (
                      <tr key={i}>
                        <td style={{ padding: "6px 8px", fontSize: 12, color: "#111827" }}>{sug.ativoNome}</td>
                        <td style={{ padding: "6px 8px", fontSize: 12, color: "#6B7280", textAlign: "right" }}>{formatBRL(sug.movimentacaoAtual)}</td>
                        <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, textAlign: "right", color: sug.delta < 0 ? "#B91C1C" : "#15803D" } as React.CSSProperties}>
                          {sug.delta >= 0 ? "+" : ""}{formatBRL(sug.delta)}
                        </td>
                        <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" } as React.CSSProperties}>
                          {formatBRL(sug.movimentacaoSugerida)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {sugestoes.some((s) => s.podeAjustar) && (
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end", gap: 8, background: "#F8FAFF" }}>
              <button
                onClick={() => setSugestoes([])}
                style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", color: "#6B7280" }}
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const todasSugs = sugestoes.filter((s) => s.podeAjustar).flatMap((s) => s.sugestoes);
                  onPlanoAcao(planoAcao.map((item) => {
                    const sug = todasSugs.find((x) => x.ativoId === item.id);
                    if (!sug) return item;
                    return { ...item, movimentacaoEditada: sug.movimentacaoSugerida, ajustadoPorRedistribuicao: true };
                  }));
                  setSugestoes([]);
                }}
                style={{ background: "#2563EB", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Confirmar todos os ajustes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Groups by card */}
      {cardsComItens.map((cardId) => {
        const meta = CARD_META[cardId];
        const groupItems = filtrados.filter((p) => p.card === cardId);
        const groupTotal = groupItems.reduce((s, p) => s + movEfetivo(p) * (p.acao === "resgatar_parcial" || p.acao === "resgatar_total" ? -1 : 1), 0);

        return (
          <div key={cardId} style={{ border: "1px solid #BFDBFE", borderRadius: 8, overflow: "hidden", backgroundColor: "white" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "#F8FAFC", padding: "8px 16px",
              borderBottom: "1px solid #BFDBFE",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: meta.cor, display: "inline-block" }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{meta.label}</span>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6,
                backgroundColor: groupTotal > 0 ? "#DCFCE7" : groupTotal < 0 ? "#FEE2E2" : "#F0F7FF",
                color: groupTotal > 0 ? "#15803D" : groupTotal < 0 ? "#B91C1C" : "#9CA3AF",
              }}>
                {groupTotal === 0 ? "—" : `${groupTotal > 0 ? "+" : ""}${formatBRL(groupTotal)}`}
              </span>
            </div>

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: COLS,
              gap: 8, padding: "6px 14px", backgroundColor: "#1E3A8A",
              alignItems: "center",
            }}>
              <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Ativo</span>
              <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Atual R$</span>
              <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Meta R$</span>
              <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Movimentação</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Ação</span>
                <Tooltip posicao="top" texto={`Manter: sem movimentação.\nResgatar Total: liquidar o ativo.\nResgatar Parcial: resgatar parte.\nAportar: adicionar recursos.\nNovo: criar posição nova.`} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Observação</span>
                <Tooltip posicao="top" texto={`Obrigatória apenas para ativos adicionados manualmente.\nOpcional para ativos recomendados, mesmo com valor editado.`} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Vencimento</span>
                <Tooltip posicao="top" texto={`Texto livre: "Jan/2026", "15/03/2027".\nTem prioridade sobre o vencimento da Etapa 1.\nAparece no card final da carteira.`} />
              </div>
              <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>Prioridade</span>
            </div>

            {groupItems.map((item) => {
              // ── Modo edição inline para ativos manuais ──
              if (editandoManualId === item.id) {
                const camposEditOk =
                  editandoManual.nome.trim() !== "" &&
                  editandoManual.card !== "" &&
                  editandoManual.observacao.trim() !== "" &&
                  editandoManual.valorBRL > 0;
                return (
                  <div key={item.id} style={{ borderTop: "1px solid #F3F4F6", padding: 12, background: "#F8FAFF" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", marginBottom: 10 }}>
                      Editando: {item.nomeAtivo}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Classe</label>
                        <select
                          value={editandoManual.card}
                          onChange={(e) => setEditandoManual((p) => ({ ...p, card: e.target.value }))}
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", fontSize: 12, backgroundColor: "white", outline: "none", boxSizing: "border-box" as const }}
                        >
                          <option value="">Selecionar...</option>
                          {CARD_ORDER.map((id) => (
                            <option key={id} value={id}>{CARD_META[id].label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Nome do ativo</label>
                        <input
                          type="text"
                          value={editandoManual.nome}
                          onChange={(e) => setEditandoManual((p) => ({ ...p, nome: e.target.value }))}
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Valor a aportar (R$)</label>
                        <CurrencyInput
                          value={editandoManual.valorBRL}
                          onChange={(v) => setEditandoManual((p) => ({ ...p, valorBRL: v }))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Segmento</label>
                        <input
                          type="text"
                          value={editandoManual.segmento}
                          onChange={(e) => setEditandoManual((p) => ({ ...p, segmento: e.target.value }))}
                          placeholder="Ex: Petróleo, Inflação, ETF..."
                          style={{ width: "100%", border: "1px solid #E5E7EB", borderRadius: 6, padding: "6px 10px", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 3 }}>Justificativa (obrigatória)</label>
                      <input
                        type="text"
                        value={editandoManual.observacao}
                        onChange={(e) => setEditandoManual((p) => ({ ...p, observacao: e.target.value }))}
                        placeholder="Justifique a inclusão deste ativo fora da alocação recomendada..."
                        style={{
                          width: "100%",
                          border: editandoManual.observacao.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                          borderRadius: 6, padding: "6px 10px", fontSize: 12,
                          background: editandoManual.observacao.trim() ? "#F0FDF4" : "#FFF5F5",
                          outline: "none", boxSizing: "border-box" as const,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                      <button
                        onClick={() => setEditandoManualId(null)}
                        style={{ fontSize: 12, color: "#6B7280", background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={!camposEditOk}
                        onClick={() => {
                          if (!camposEditOk) return;
                          onPlanoAcao(planoAcao.map((i) =>
                            i.id === editandoManualId
                              ? {
                                  ...i,
                                  nomeAtivo: editandoManual.nome,
                                  card: editandoManual.card as CardId,
                                  segmento: editandoManual.segmento,
                                  movimentacaoBRL: editandoManual.valorBRL,
                                  observacao: editandoManual.observacao,
                                }
                              : i
                          ));
                          setEditandoManualId(null);
                        }}
                        style={{
                          fontSize: 12, fontWeight: 600, color: "white",
                          background: camposEditOk ? "#2563EB" : "#9CA3AF",
                          border: "none", borderRadius: 6, padding: "5px 14px",
                          cursor: camposEditOk ? "pointer" : "not-allowed",
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                );
              }

              const isMovEditable = item.acao === "aportar" || item.acao === "novo";
              const movEditado = isMovEditable && item.movimentacaoEditada !== undefined && item.movimentacaoEditada !== item.movimentacaoBRL;
              const exige = exigeObservacao(item);
              const efetivo = movEfetivo(item);
              const obsNeedsFill = exige && !item.observacao?.trim();

              return (
                <div
                  key={item.id}
                  style={{
                    borderTop: "1px solid #F3F4F6",
                    backgroundColor: ativosAjustados.has(item.id) ? "#F0FDF4" : "white",
                    borderLeft: ativosAjustados.has(item.id) ? "3px solid #22C55E" : "none",
                    transition: "background 300ms, border-left 300ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ativosAjustados.has(item.id) ? "#F0FDF4" : "white")}
                >
                  <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 14px", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{
                          backgroundColor: TIPO_CONFIG[item.acao].bg,
                          color: TIPO_CONFIG[item.acao].color,
                          fontSize: 10, borderRadius: 4, padding: "1px 5px", flexShrink: 0,
                        }}>
                          {TIPO_CONFIG[item.acao].label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                        {item.adicionadoManualmente && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: "#7C3AED",
                            background: "#F5F3FF", padding: "1px 6px",
                            borderRadius: 99, flexShrink: 0,
                          }}>MANUAL</span>
                        )}
                        {obsNeedsFill && (
                          <span style={{
                            fontSize: 10, color: "#B91C1C", background: "#FEE2E2",
                            padding: "1px 6px", borderRadius: 99, flexShrink: 0,
                          }}>⚠ pendente</span>
                        )}
                        {ativosAjustados.has(item.id) && (
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: "#15803D",
                            background: "#DCFCE7",
                            border: "0.5px solid #86EFAC",
                            padding: "2px 8px",
                            borderRadius: 99,
                            marginLeft: 4,
                            whiteSpace: "nowrap" as const,
                          }}>
                            ✓ Ajustado
                          </span>
                        )}
                      </div>
                      {item.segmento && (
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{meta.label} · {item.segmento}</span>
                      )}
                    </div>

                    <span style={{ fontSize: 12, color: "#6B7280" }}>{formatBRL(item.valorAtualBRL)}</span>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                      {item.acao === "manter" ? formatBRL(item.valorAtualBRL) : formatBRL(item.valorMetaBRL)}
                    </span>

                    {/* Movimentação — click-to-edit for aportar/novo */}
                    {isMovEditable && editandoMovId === item.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editandoMovVal}
                        onChange={(e) => setEditandoMovVal(e.target.value)}
                        onBlur={() => {
                          const valor = Math.max(0, parseBRL(editandoMovVal));
                          updateItem(item.id, { movimentacaoEditada: valor, ajustadoPorRedistribuicao: false });
                          setEditandoMovId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setEditandoMovId(null);
                        }}
                        style={{
                          border: "1px solid #BFDBFE", borderRadius: 4, padding: "3px 6px",
                          fontSize: 12, fontWeight: 600, color: "#15803D",
                          width: "100%", boxSizing: "border-box", outline: "none",
                        }}
                      />
                    ) : isMovEditable ? (
                      <div
                        title="Clique para editar"
                        onClick={() => { setEditandoMovId(item.id); setEditandoMovVal(formatInputBRL(efetivo)); }}
                        style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}
                      >
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: efetivo > 0 ? "#15803D" : "#9CA3AF",
                        }}>
                          {efetivo > 0 ? `+${formatBRL(efetivo)}` : formatBRL(0)}
                        </span>
                        <span style={{ fontSize: 10, color: movEditado ? "#B45309" : "#D1D5DB" }} title={movEditado ? "Valor editado" : "Editar"}>✎</span>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: item.acao === "manter" ? "#9CA3AF" : item.movimentacaoBRL > 0 ? "#15803D" : item.movimentacaoBRL < 0 ? "#B91C1C" : "#9CA3AF",
                      }}>
                        {item.acao === "manter" || item.movimentacaoBRL === 0
                          ? formatBRL(0)
                          : `${item.movimentacaoBRL > 0 ? "+" : "−"}${formatBRL(Math.abs(item.movimentacaoBRL))}`
                        }
                      </span>
                    )}

                    <select
                      value={item.acao}
                      onChange={(e) => updateItem(item.id, { acao: e.target.value as PlanoAcaoItem["acao"] })}
                      style={selectStyle}
                    >
                      <option value="manter">Manter</option>
                      <option value="aportar">Aportar</option>
                      <option value="resgatar_parcial">Resgatar parcialmente</option>
                      <option value="resgatar_total">Resgatar tudo</option>
                      <option value="novo">Novo</option>
                    </select>

                    <input
                      value={item.observacao}
                      onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                      placeholder={obsNeedsFill ? "obrigatório..." : "observação..."}
                      style={{
                        border: `1px solid ${exige ? (item.observacao?.trim() ? "#15803D" : "#B91C1C") : "#BFDBFE"}`,
                        borderRadius: 6, padding: "3px 6px",
                        fontSize: 12, backgroundColor: "white", color: "#111827", outline: "none",
                        width: "100%", boxSizing: "border-box",
                      }}
                    />

                    <input
                      type="text"
                      value={item.vencimento ?? ""}
                      onChange={(e) => updateItem(item.id, { vencimento: e.target.value })}
                      placeholder="Ex: Jan/2026"
                      style={{
                        border: "1px solid #E5E7EB",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 11,
                        color: "#374151",
                        background: "white",
                        width: 90,
                        boxSizing: "border-box" as const,
                        outline: "none",
                      }}
                    />

                    {item.adicionadoManualmente ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => {
                            setEditandoManualId(item.id);
                            setEditandoManual({
                              nome: item.nomeAtivo,
                              card: item.card,
                              segmento: item.segmento,
                              valorBRL: item.movimentacaoBRL,
                              observacao: item.observacao ?? "",
                            });
                          }}
                          title="Editar"
                          style={{
                            background: "none", border: "1px solid #E5E7EB",
                            borderRadius: 6, padding: "4px 8px",
                            cursor: "pointer", color: "#6B7280",
                          }}
                        >
                          <i className="ti ti-pencil" style={{ fontSize: 13 }} />
                        </button>
                        <button
                          onClick={() => onPlanoAcao(planoAcao.filter((i) => i.id !== item.id))}
                          title="Excluir"
                          style={{
                            background: "none", border: "1px solid #FCA5A5",
                            borderRadius: 6, padding: "4px 8px",
                            cursor: "pointer", color: "#B91C1C",
                          }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <select
                          value={item.prioridade ?? "baixa"}
                          onChange={(e) => updateItem(item.id, { prioridade: e.target.value as PlanoAcaoItem["prioridade"] })}
                          style={selectStyle}
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                        <button
                          onClick={() => onPlanoAcao(planoAcao.filter((i) => i.id !== item.id))}
                          title="Remover ativo do plano"
                          style={{
                            background: "none", border: "1px solid #FCA5A5",
                            borderRadius: 6, padding: "4px 8px",
                            cursor: "pointer", color: "#B91C1C", flexShrink: 0,
                          }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {item.acao === "resgatar_parcial" && (
                    <div style={{ padding: "0 14px 8px" }}>
                      <div style={{
                        padding: "8px 10px",
                        background: "#FFF5F5",
                        border: "0.5px solid #FECACA",
                        borderRadius: 6,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#B91C1C", flexShrink: 0 }}>
                            Valor a resgatar:
                          </span>
                          <div style={{ flex: 1 }}>
                            <CurrencyInput
                              value={item.valorResgateBRL ?? Math.abs(item.movimentacaoBRL)}
                              onChange={(v) => {
                                const valorValido = Math.min(Math.max(0, v), item.valorAtualBRL);
                                updateItem(item.id, { valorResgateBRL: valorValido });
                              }}
                              placeholder="R$ 0,00"
                            />
                          </div>
                          <span style={{ fontSize: 11, color: "#6B7280", flexShrink: 0 }}>
                            de {formatBRL(item.valorAtualBRL)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
                          Saldo após resgate:{" "}
                          <strong style={{ color: "#374151" }}>
                            {formatBRL(Math.max(0, item.valorAtualBRL - (item.valorResgateBRL ?? Math.abs(item.movimentacaoBRL))))}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observação obrigatória contextual */}
                  {exige && (
                    <div style={{ padding: "0 14px 10px" }}>
                      <div style={{
                        display: "flex", flexDirection: "column", gap: 6,
                        padding: "8px 10px",
                        background: item.observacao?.trim() ? "#F0FDF4" : "#FFFBEB",
                        border: `0.5px solid ${item.observacao?.trim() ? "#BBF7D0" : "#FDE68A"}`,
                        borderRadius: 6,
                      }}>
                        <div style={{ fontSize: 10, color: "#B45309" }}>
                          {item.acao === "manter" && ((item.valorMetaBRL ?? 0) === 0 ? "Ativo fora da carteira recomendada — " : "Ativo mantido fora da alocação ideal — ")}
                          {item.acao === "resgatar_parcial" && "Resgate parcial — "}
                          {item.acao === "novo" && "Ativo novo na recomendada — "}
                          {item.acao === "aportar" && item.movimentacaoEditada !== undefined && "Valor alterado — "}
                          observação obrigatória
                        </div>
                        <input
                          type="text"
                          value={item.observacao ?? ""}
                          onChange={(e) => updateItem(item.id, { observacao: e.target.value })}
                          placeholder={placeholderObservacao(item)}
                          style={{
                            width: "100%",
                            border: item.observacao?.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                            borderRadius: 6, padding: "6px 10px", fontSize: 12,
                            color: "#374151",
                            background: item.observacao?.trim() ? "#F0FDF4" : "#FFF5F5",
                            boxSizing: "border-box", outline: "none",
                          }}
                        />
                        {!item.observacao?.trim() && (
                          <div style={{ fontSize: 10, color: "#B91C1C" }}>
                            Preencha a observação para continuar
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {filtrados.length === 0 && (
        <div style={{
          border: "1px solid #BFDBFE", borderRadius: 8, padding: 32,
          textAlign: "center", fontSize: 13, color: "#9CA3AF", backgroundColor: "white",
        }}>
          {planoAcao.length === 0
            ? "Plano de ação vazio. Defina a carteira recomendada na etapa anterior."
            : "Nenhum item corresponde ao filtro selecionado."}
        </div>
      )}

      {/* Adicionar ativo fora da recomendação */}
      {!adicionandoAtivo && (
        <button
          onClick={() => setAdicionandoAtivo(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "1px dashed #BFDBFE",
            borderRadius: 8, padding: "10px 16px",
            fontSize: 13, color: "#2563EB",
            cursor: "pointer", width: "100%", justifyContent: "center",
            marginTop: 8,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Adicionar ativo fora da recomendação
        </button>
      )}

      {adicionandoAtivo && (() => {
        const camposOk =
          novoAtivo.nome.trim() !== "" &&
          novoAtivo.card !== "" &&
          novoAtivo.observacao.trim() !== "" &&
          novoAtivo.valorBRL > 0;
        return (
          <div style={{
            background: "#F8FAFF", border: "1px solid #BFDBFE",
            borderRadius: 10, padding: 16, marginTop: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", marginBottom: 12 }}>
              Novo ativo fora da recomendação
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Classe */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Classe</label>
                <select
                  value={novoAtivo.card}
                  onChange={(e) => setNovoAtivo((p) => ({ ...p, card: e.target.value }))}
                  style={{
                    width: "100%", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    backgroundColor: "white", color: "#111827",
                    cursor: "pointer", outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Selecionar...</option>
                  {CARD_ORDER.map((id) => (
                    <option key={id} value={id}>{CARD_META[id].label}</option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Nome do ativo</label>
                <input
                  type="text"
                  value={novoAtivo.nome}
                  onChange={(e) => setNovoAtivo((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: PETR4, Tesouro IPCA+ 2035..."
                  style={{
                    width: "100%", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Valor */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Valor a aportar (R$)</label>
                <CurrencyInput
                  value={novoAtivo.valorBRL}
                  onChange={(v) => setNovoAtivo((p) => ({ ...p, valorBRL: v }))}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Segmento */}
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Segmento</label>
                <input
                  type="text"
                  value={novoAtivo.segmento}
                  onChange={(e) => setNovoAtivo((p) => ({ ...p, segmento: e.target.value }))}
                  placeholder="Ex: Petróleo, Inflação, ETF..."
                  style={{
                    width: "100%", border: "1px solid #E5E7EB",
                    borderRadius: 8, padding: "8px 12px", fontSize: 13,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Observação obrigatória */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>
                Justificativa (obrigatória)
              </label>
              <input
                type="text"
                value={novoAtivo.observacao}
                onChange={(e) => setNovoAtivo((p) => ({ ...p, observacao: e.target.value }))}
                placeholder="Justifique a inclusão deste ativo fora da alocação recomendada..."
                style={{
                  width: "100%",
                  border: novoAtivo.observacao.trim() ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                  borderRadius: 8, padding: "8px 12px", fontSize: 13,
                  background: novoAtivo.observacao.trim() ? "#F0FDF4" : "#FFF5F5",
                  outline: "none", boxSizing: "border-box" as const,
                }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={() => { setAdicionandoAtivo(false); resetNovoAtivo(); }}
                style={{
                  fontSize: 12, color: "#6B7280", background: "white",
                  border: "1px solid #E5E7EB", borderRadius: 6,
                  padding: "6px 14px", cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                disabled={!camposOk}
                onClick={() => {
                  if (!camposOk) return;
                  const itemNovo: PlanoAcaoItem = {
                    id: crypto.randomUUID(),
                    nomeAtivo: novoAtivo.nome,
                    card: novoAtivo.card as CardId,
                    segmento: novoAtivo.segmento,
                    acao: "novo",
                    valorAtualBRL: 0,
                    valorMetaBRL: 0,
                    movimentacaoBRL: novoAtivo.valorBRL,
                    adicionadoManualmente: true,
                    observacao: novoAtivo.observacao,
                    prioridade: "baixa",
                  };
                  onPlanoAcao([...planoAcao, itemNovo]);
                  setAdicionandoAtivo(false);
                  resetNovoAtivo();
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: "white",
                  background: camposOk ? "#2563EB" : "#9CA3AF",
                  border: "none", borderRadius: 6, padding: "6px 16px",
                  cursor: camposOk ? "pointer" : "not-allowed",
                }}
              >
                Adicionar ao plano
              </button>
            </div>
          </div>
        );
      })()}

      {/* Notas do consultor */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Notas e justificativas do plano</label>
        <textarea
          value={notasConsultor}
          onChange={(e) => onNotasConsultor(e.target.value)}
          placeholder="Explique os pontos principais do plano, justifique as movimentações relevantes..."
          style={{
            minHeight: 120, padding: "8px 10px", borderRadius: 8,
            border: "1px solid #BFDBFE", fontSize: 13, color: "#111827",
            resize: "vertical", outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", width: "100%",
          }}
        />
      </div>
    </div>
    </>
  );
}
