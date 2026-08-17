import { PieChart as PieChartIcon } from "lucide-react";
import { CardAlocacaoComparativa } from "@/components/shared/CardAlocacaoComparativa";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { PainelAjuda } from "@/components/shared/PainelAjuda";
import { formatBRL, formatPct } from "@/lib/carteira/calculos";
import type { FinancialPlan, PerfilRisco } from "@/types/financialPlanning";
import { FerramentaCarteira } from "@/components/carteira";
import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { CarteiraResultado } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META, HIERARQUIA_CLASSES } from "@/lib/carteira/types";
import { montarCarteiraFinal } from "@/lib/carteira/carteiraFinal";
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
  onUpdate?: (patch: Partial<FinancialPlan>) => void;
}

const CARD: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const AVAILABLE_TAGS = ["Rebalanceamento", "ETFs", "Renda Fixa", "Renda Variável", "Internacional"];

const PERFIS: { id: PerfilRisco; label: string; descricao: string; cor: string; bg: string }[] = [
  { id: "conservador",          label: "Conservador",           descricao: "Prioriza segurança e liquidez",       cor: "#1E40AF", bg: "#EFF6FF" },
  { id: "conservador_moderado", label: "Conservador Moderado",  descricao: "Equilíbrio com mais segurança",       cor: "#1D4ED8", bg: "#EFF6FF" },
  { id: "moderado",             label: "Moderado",              descricao: "Equilíbrio entre risco e retorno",    cor: "#2563EB", bg: "#DBEAFE" },
  { id: "arrojado",             label: "Arrojado",              descricao: "Aceita mais risco por mais retorno",  cor: "#B91C1C", bg: "#FEE2E2" },
];

const AJUDA_GESTAO_ATIVOS = [
  {
    titulo: "O que é a Gestão de Ativos?",
    conteudo: `A Gestão de Ativos é a seção onde estruturamos a carteira de investimentos do cliente, comparamos a situação atual com a alocação ideal e definimos o plano de ação para rebalanceamento.\n\nO processo é dividido em 4 etapas dentro da Ferramenta de Gestão de Carteira:\n1. Carteira Atual — o que o cliente tem hoje\n2. Recomendada — o que deveria ter (% por classe)\n3. Plano de Ação — como chegar lá\n4. Resultado — visão final da carteira`,
  },
  {
    titulo: "Alocação Atual × Proposta",
    conteudo: `O gráfico de pizza compara a distribuição atual da carteira do cliente com a alocação proposta (meta).\n\nAlocação Atual:\nCalculada com base nos ativos informados na Etapa 1 (Carteira Atual), distribuídos por classe.\n\nAlocação Proposta:\nDefinida na Etapa 2 (Recomendada) com base no perfil do cliente e no padrão Simpla Invest.\n\nComeçando do Zero:\nQuando o cliente não tem carteira, exibe apenas a pizza da Alocação Proposta centralizada.`,
  },
  {
    titulo: "Como sua carteira deverá ficar",
    conteudo: `Tabela com a composição final da carteira após a execução do Plano de Ação.\n\nMostra cada ativo com:\n- Nome e classe\n- Segmento\n- Vencimento (quando aplicável)\n- Valor final em R$\n\nO Total da carteira recomendada é a soma dos valores meta por classe, calculado como:\n% Meta × (Patrimônio + Aporte Disponível)\n\nEsta tabela é atualizada automaticamente após salvar a carteira na Etapa 4.`,
  },
  {
    titulo: "Alocação Proposta por Classe",
    conteudo: `Tabela resumida com os percentuais e valores recomendados para cada classe de ativo.\n\nClasses disponíveis:\n- Resgate Longo (Renda Fixa longa)\n- Resgate Rápido (Renda Fixa curta/liquidez)\n- Ações\n- Fundos Imobiliários (FIIs)\n- Exterior\n- Cripto\n- Alternativos\n- Previdência Privada\n\nOs percentuais são definidos na Etapa 2 e os valores são calculados sobre o patrimônio base (atual + aporte).\n\n*Os valores são meramente ilustrativos.`,
  },
  {
    titulo: "Como usar a Ferramenta de Carteira",
    conteudo: `Clique em "Abrir Ferramenta de Carteira" para acessar as 4 etapas:\n\nEtapa 1 — Carteira Atual:\nLance todos os ativos que o cliente possui hoje, com valor, segmento e vencimento.\n\nEtapa 2 — Recomendada:\nDefina os percentuais de alocação ideal por classe. O sistema calcula automaticamente os valores com base no patrimônio e aporte disponível.\n\nEtapa 3 — Plano de Ação:\nVisualize e ajuste as movimentações sugeridas (resgates e aportes) para chegar à alocação recomendada.\n\nEtapa 4 — Resultado:\nVisualize a carteira final e salve. Os dados são persistidos no Supabase e refletidos nesta página.`,
  },
  {
    titulo: "Padrão Simpla de Alocação",
    conteudo: `A Simpla Invest segue uma alocação padrão por perfil de risco:\n\nConservador:\nRL 42% | RR 50% | Ações 2% | FIIs 2% | Ext 4% | Cripto 0%\n\nConservador Moderado:\nRL 43% | RR 35% | Ações 7% | FIIs 6% | Ext 9% | Cripto 0%\n\nModerado:\nRL 41% | RR 25% | Ações 13% | FIIs 7% | Ext 13% | Cripto 1%\n\nArrojado:\nRL 37% | RR 15% | Ações 20% | FIIs 9% | Ext 17,5% | Cripto 1,5%\n\nEsses percentuais são aplicados automaticamente na Etapa 2 e podem ser ajustados pelo consultor.`,
  },
  {
    titulo: "Dicas para o consultor",
    conteudo: `• Lance todos os ativos do cliente na Etapa 1 antes de definir a recomendação — isso garante uma comparação precisa.\n\n• O aporte disponível pré-preenche automaticamente quando o cliente está Começando do Zero.\n\n• Use o botão "Sugerir ajustes por classe" no Plano de Ação para redistribuir valores automaticamente dentro de cada classe.\n\n• Os dados são salvos automaticamente ao navegar entre etapas — não é necessário clicar "Salvar" a cada passo.\n\n• O salvamento definitivo (Supabase) ocorre ao clicar "Salvar Carteira" na Etapa 4.\n\n• Vencimentos informados na Etapa 1 aparecem automaticamente no card "Como sua carteira deverá ficar".`,
  },
];

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
  onUpdate,
}: Props) {
  const [carteiraOpen, setCarteiraOpen] = useState(false);
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);

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
      .filter((i) => (i.acao === "aportar" || i.acao === "novo"))
      .reduce((s, i) => s + (i.movimentacaoEditada ?? i.movimentacaoBRL), 0);
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
      ativosAtuais: r.ativosAtuais,
      ativosRecomendados: r.ativosRecomendados ?? [],
      alocacaoMeta: r.alocacaoMeta,
      aporteDisponivel: r.aporteDisponivel,
      custoVidaMensal: r.custoVidaMensal,
      mesesReserva: r.mesesReserva,
      notasConsultor: r.notasConsultor,
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
        movimentacaoEditada: i.movimentacaoEditada,
        vencimento: i.vencimento,
        valorResgateBRL: i.valorResgateBRL,
        prioridade: i.prioridade,
        observacao: i.observacao,
        adicionadoManualmente: i.adicionadoManualmente,
      })),
      dataCalculo: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    });
    setCarteiraOpen(false);
  }

  function toggleTag(t: string) {
    onTagsChange(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  }

  // ── Perfil card (always visible) ──────────────────────────────────────────
  const perfilAtual = plan.dadosCliente.suitabilityPerfil ?? "";

  function handlePerfilChange(novoPerfil: PerfilRisco) {
    onUpdate?.({ dadosCliente: { ...plan.dadosCliente, suitabilityPerfil: novoPerfil } });
  }

  const perfilCard = (
    <div style={{ ...CARD, border: "0.5px solid #E5E7EB" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Perfil do Investidor
      </p>
      <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
        Selecione o perfil de risco do cliente
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {PERFIS.map(({ id, label, descricao, cor, bg }) => {
          const selected = perfilAtual === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handlePerfilChange(id)}
              style={{ border: selected ? `2px solid ${cor}` : "1.5px solid #BFDBFE", borderRadius: 10, padding: "14px 16px", backgroundColor: selected ? bg : "white", cursor: "pointer", textAlign: "left", position: "relative", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 6 }}
            >
              {selected && (
                <span style={{ position: "absolute", top: 10, right: 12, width: 20, height: 20, borderRadius: "50%", backgroundColor: cor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>✓</span>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: selected ? cor : "#111827" }}>{label}</span>
              <span style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>{descricao}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

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
          placeholder="Descreva a estratégia de gestão de ativos recomendada: rebalanceamento, classes de ativos prioritários, instrumentos sugeridos..."
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
        <PainelAjuda
          titulo="Gestão de Ativos"
          secoes={AJUDA_GESTAO_ATIVOS}
          aberto={painelAjudaAberto}
          onFechar={() => setPainelAjudaAberto(false)}
        />
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Gestão de Ativos</h2>
            <button
              onClick={() => setPainelAjudaAberto(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-help-circle" style={{ fontSize: 14 }} />
              Ajuda
            </button>
          </div>
          {perfilCard}
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
            resultadoCarteira={resultadoCarteira}
            onClose={() => setCarteiraOpen(false)}
            onSave={handleCarteiraSave}
            onLimpar={onLimparCarteira}
            comecandoDoZero={plan.dadosCliente.comecandoDoZero === true}
            patrimonioColeta={Number(plan.dadosCliente.patrimonioFinanceiroEstimado) || 0}
            custoVidaColeta={Number(plan.dadosCliente.custoDeVidaMensal) || 0}
          />
        )}
      </>
    );
  }

  // ── State B — carteira defined ────────────────────────────────────────────
  const rc = resultadoCarteira;
  const patrimonio = rc.patrimonio;
  const patrimonioMeta = patrimonio + (rc.aporteDisponivel ?? 0);

  const totalAportes = (rc.planoAcao ?? [])
    .filter((i) => { const a = i.acao ?? i.tipo; return a === "aportar" || a === "novo"; })
    .reduce((s, i) => s + (i.movimentacaoEditada ?? i.movimentacaoBRL ?? 0), 0);
  const totalResgates = (rc.planoAcao ?? [])
    .filter((i) => { const a = i.acao ?? i.tipo; return a === "resgatar_parcial" || a === "resgatar_total"; })
    .reduce((s, i) => {
      const a = i.acao ?? i.tipo;
      if (a === "resgatar_parcial" && i.valorResgateBRL !== undefined) return s + i.valorResgateBRL;
      return s + Math.abs(i.movimentacaoBRL ?? 0);
    }, 0);
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
      <PainelAjuda
        titulo="Gestão de Ativos"
        secoes={AJUDA_GESTAO_ATIVOS}
        aberto={painelAjudaAberto}
        onFechar={() => setPainelAjudaAberto(false)}
      />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>

        {perfilCard}

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Gestão de Ativos</h2>
            <button
              onClick={() => setPainelAjudaAberto(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563EB" }}
            >
              <i className="ti ti-help-circle" style={{ fontSize: 13 }} />
              Ajuda
            </button>
          </div>
          <button
            onClick={() => setCarteiraOpen(true)}
            style={{ fontSize: 12, fontWeight: 600, color: "#000000", backgroundColor: "transparent", border: "1px solid #000000", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}
          >
            Editar carteira →
          </button>
        </div>

        {/* Card 2 — Alocação Atual × Proposta */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Alocação Atual × Proposta</span>
          </div>
          <CardAlocacaoComparativa
            macroAtual={rc.macroAtual}
            macroMeta={rc.macroMeta}
            patrimonio={rc.patrimonio}
          />
        </div>

        {/* Card 3 — Alocação Proposta por Classe (hierarchical) */}
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "0.5px solid #E5E7EB" }}>
            <i className="ti ti-layout-list" style={{ fontSize: 16, color: "#2563EB" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Alocação Proposta por Classe</span>
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", backgroundColor: "#F8FAFF", padding: "8px 12px", borderBottom: "0.5px solid #E5E7EB" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>CLASSE / SUBCLASSE</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>R$</span>
            </div>
          </div>

          {/* Groups */}
          {HIERARQUIA_CLASSES.map((grupo) => {
            const subsData = grupo.subclasses.map((sub) => ({
              ...sub,
              pct: Number(rc.macroMeta[sub.cardId]) || 0,
              brl: ((Number(rc.macroMeta[sub.cardId]) || 0) / 100) * patrimonioMeta,
            }));
            const totalPct = subsData.reduce((s, sub) => s + sub.pct, 0);
            const totalBrl = subsData.reduce((s, sub) => s + sub.brl, 0);
            if (totalPct === 0) return null;
            const visibleSubs = subsData.filter((sub) => sub.pct > 0);

            return (
              <div key={grupo.id}>
                {/* Group row */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "10px 12px", backgroundColor: grupo.corBg, borderBottom: "0.5px solid #E5E7EB", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: grupo.cor, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${grupo.icone}`} style={{ fontSize: 12, color: "white" }} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: grupo.cor }}>{grupo.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: grupo.cor }}>{formatPct(totalPct)}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: grupo.cor, textAlign: "right" }}>
                    {formatBRL(totalBrl)}
                  </span>
                </div>

                {/* Subclass rows */}
                {visibleSubs.map((sub) => (
                  <div key={sub.cardId} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "8px 12px 8px 16px", borderBottom: "0.5px solid #F9FAFB", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 18, borderLeft: `1.5px solid ${grupo.cor}40`, borderBottom: `1.5px solid ${grupo.cor}40`, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#374151" }}>{sub.label}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, backgroundColor: `${grupo.cor}22`, color: grupo.cor }}>
                        {formatPct(sub.pct)}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "#6B7280", textAlign: "right" }}>
                      {formatBRL(sub.brl)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "10px 12px", backgroundColor: "#F8FAFF", borderTop: "0.5px solid #E5E7EB", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase" }}>TOTAL</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>100%</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right" }}>
              {formatBRL(patrimonioMeta)}
            </span>
          </div>
        </div>

        {/* Card 3B — Seleção de Ativos Recomendados */}
        {(() => {
          const ativosCarteiraFinal = montarCarteiraFinal(rc.planoAcao ?? [], rc.ativosRecomendados ?? [], rc.ativosAtuais ?? []);
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
                  } else {
                    const mov = item.movimentacaoEditada ?? item.movimentacaoBRL ?? 0;
                    movTexto = mov > 0 ? "+" + formatBRL(mov) : formatBRL(Math.abs(mov));
                    movCor = mov > 0 ? "#15803D" : "#111827";
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

        {/* Card 5 — Observações do Plano de Ação */}
        {(() => {
          const itensComObs = (rc.planoAcao ?? []).filter((i) => i.observacao && i.observacao.trim());
          if (itensComObs.length === 0) return null;
          return (
            <div style={CARD}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#000000", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Observações do Plano de Ação
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {itensComObs.map((item) => {
                  const acao = item.acao ?? item.tipo ?? "";
                  const badge =
                    acao === "novo"             ? { label: "✦ Novo",             bg: "#DBEAFE", color: "#1E40AF" } :
                    acao === "aportar"          ? { label: "↑ Aportar",          bg: "#DCFCE7", color: "#15803D" } :
                    acao === "manter"           ? { label: "→ Manter",           bg: "#F3F4F6", color: "#6B7280" } :
                    acao === "resgatar_parcial" ? { label: "↓ Resgatar Parcial", bg: "#FEF3C7", color: "#B45309" } :
                    acao === "resgatar_total"   ? { label: "↓ Resgatar Total",   bg: "#FEE2E2", color: "#B91C1C" } :
                                                  { label: acao || "—",          bg: "#F3F4F6", color: "#6B7280" };
                  return (
                    <div key={item.id} style={{ padding: "10px 12px", backgroundColor: "#F8FAFC", borderRadius: 8, border: "0.5px solid #E5E7EB" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, backgroundColor: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.nomeAtivo}</span>
                        {item.prioridade && (
                          <span style={{
                            fontSize: 10, padding: "1px 6px", borderRadius: 999, flexShrink: 0,
                            backgroundColor: item.prioridade === "alta" ? "#FEE2E2" : item.prioridade === "media" ? "#FEF3C7" : "#F0F7FF",
                            color: item.prioridade === "alta" ? "#B91C1C" : item.prioridade === "media" ? "#B45309" : "#6B7280",
                          }}>
                            {item.prioridade === "alta" ? "Alta" : item.prioridade === "media" ? "Média" : "Baixa"}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.5, textAlign: "justify" as const }}>{item.observacao}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Card 6 — Comment */}
        {commentCard}
      </div>

      {carteiraOpen && (
        <FerramentaCarteira
          clientName={clientName}
          clientId={plan.clientId}
          clientProfile={plan.dadosCliente.suitabilityPerfil ?? plan.suitability?.perfil ?? null}
          patrimonyInicial={plan.ativosAtuais.total}
          resultadoCarteira={resultadoCarteira}
          onClose={() => setCarteiraOpen(false)}
          onSave={handleCarteiraSave}
          comecandoDoZero={plan.dadosCliente.comecandoDoZero === true}
          patrimonioColeta={Number(plan.dadosCliente.patrimonioFinanceiroEstimado) || 0}
          custoVidaColeta={Number(plan.dadosCliente.custoDeVidaMensal) || 0}
        />
      )}
    </>
  );
}
