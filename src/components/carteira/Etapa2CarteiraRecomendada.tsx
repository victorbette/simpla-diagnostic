import { useState, useEffect } from "react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CarteiraCard } from "./CarteiraCard";
import { PainelRecomendacaoSimpla } from "./PainelRecomendacaoSimpla";
import { Tooltip } from "@/components/shared/Tooltip";
import { PainelAjuda } from "@/components/shared/PainelAjuda";

interface Props {
  ativos: Ativo[];
  onAtivos: (ativos: Ativo[]) => void;
  ativosAtuais: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  onAlocacaoMeta: (m: Record<CardId, number>) => void;
  patrimonio: number;
  clientProfile: string | null;
  aporteDisponivel: number;
  onAporteChange: (v: number) => void;
  onAlocacaoChange?: (completa: boolean) => void;
  comecandoDoZero?: boolean;
  patrimonioColeta?: number;
  custoVidaMensal?: number;
  onCustoVidaChange?: (v: number) => void;
  mesesReserva?: number;
  onMesesReservaChange?: (v: number) => void;
  onPlanoReset?: () => void;
}

const AJUDA_ETAPA2 = [
  {
    titulo: "O que fazer nesta etapa?",
    conteudo: `Defina a alocação ideal para o cliente — quanto (em %) cada classe de ativo deve representar na carteira final.\n\nO sistema aplica automaticamente o padrão Simpla Invest baseado no perfil do cliente. O consultor pode ajustar os percentuais conforme necessário.\n\nOs valores em R$ são calculados automaticamente com base no patrimônio atual + aporte disponível.`,
  },
  {
    titulo: "Padrão Simpla de Alocação",
    conteudo: `A alocação é carregada automaticamente ao clicar "Aplicar Recomendação Simpla":\n\nConservador:\nRL 42% | RR 50% | Ações 2% | FIIs 2% | Ext 4% | Cripto 0%\n\nConservador Moderado:\nRL 43% | RR 35% | Ações 7% | FIIs 6% | Ext 9% | Cripto 0%\n\nModerado:\nRL 41% | RR 25% | Ações 13% | FIIs 7% | Ext 13% | Cripto 1%\n\nArrojado:\nRL 37% | RR 15% | Ações 20% | FIIs 9% | Ext 17,5% | Cripto 1,5%\n\nAtenção: ao aplicar a recomendação, todos os ajustes manuais anteriores são desfeitos.`,
  },
  {
    titulo: "Aporte Disponível",
    conteudo: `Valor adicional que o cliente tem disponível para investir além do patrimônio atual.\n\nPara clientes Começando do Zero:\nPreenchido automaticamente com o Patrimônio Financeiro da Situação Atual.\n\nPara demais clientes:\nInformado manualmente pelo consultor.\n\nO aporte é somado ao patrimônio atual para calcular o patrimônio base de todas as distribuições:\nBase = Patrimônio Atual + Aporte Disponível`,
  },
  {
    titulo: "Custo de Vida Mensal",
    conteudo: `Usado para calcular o quanto da carteira deve ficar em Resgate Rápido (reserva de emergência).\n\nPadrão: pré-preenchido com o valor da Situação Atual.\n\nMeses de Reserva:\nDefine quantos meses de custo de vida devem estar disponíveis em Resgate Rápido.\n\nExemplo: custo de vida R$ 10.000 × 6 meses = R$ 60.000 em Resgate Rápido mínimo.`,
  },
  {
    titulo: "Como ajustar os percentuais",
    conteudo: `Cada classe tem um slider ou input para definir o percentual recomendado.\n\nRegras:\n- A soma de todos os percentuais deve totalizar 100%\n- O sistema avisa quando o total está diferente de 100%\n- Valores em R$ são calculados automaticamente\n\nPara adicionar ativos específicos por classe:\nUse a lista de ativos recomendados abaixo dos percentuais — Nome e Valor são definidos pelo sistema (bloqueados) e o Segmento pode ser ajustado.`,
  },
  {
    titulo: "Ativos Recomendados por Classe",
    conteudo: `Abaixo dos percentuais, cada classe exibe os ativos recomendados para compor aquela alocação.\n\nNome e Valor: bloqueados (definidos pelo sistema com base nos percentuais).\n\nSegmento: editável — use para indicar o subsetor recomendado.\n\nOs ativos desta lista são carregados automaticamente no Plano de Ação como sugestões de onde alocar os recursos.`,
  },
  {
    titulo: "Dicas para o consultor",
    conteudo: `• Aplique primeiro o padrão Simpla e ajuste pontualmente — isso é mais eficiente que montar do zero.\n\n• O total deve ser exatamente 100% antes de avançar para o Plano de Ação.\n\n• Para clientes com previdência privada significativa, considere reduzir Resgate Longo proporcionalmente.\n\n• Alternativos e Previdência Privada têm 0% no padrão Simpla — adicione apenas quando o cliente já possui esses produtos e eles fazem parte da estratégia.\n\n• Ao aplicar a recomendação Simpla após ajustes manuais, todos os ajustes são revertidos — inclusive os feitos pelo painel de redistribuição.`,
  },
];

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const CARDS_ETAPA2: CardId[] = ['resgate_longo', 'resgate_rapido', 'acoes', 'fiis', 'exterior', 'cripto'];

const GRUPOS = [
  { label: "Renda Fixa",        cor: "#1E40AF", cards: ["resgate_longo", "resgate_rapido"] as CardId[] },
  { label: "Renda Variável",    cor: "#15803D", cards: ["acoes", "fiis"] as CardId[] },
  { label: "Internacional",     cor: "#B45309", cards: ["exterior"] as CardId[] },
  { label: "Cripto",            cor: "#1D4ED8", cards: ["cripto"] as CardId[] },
];

function parseBRL(raw: string): number {
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  return isNaN(v) || v < 0 ? 0 : v;
}

export function Etapa2CarteiraRecomendada({
  ativos, onAtivos, ativosAtuais, alocacaoMeta, onAlocacaoMeta,
  patrimonio, clientProfile, aporteDisponivel, onAporteChange, onAlocacaoChange,
  comecandoDoZero = false, patrimonioColeta = 0,
  custoVidaMensal = 0, onCustoVidaChange,
  mesesReserva = 0, onMesesReservaChange,
  onPlanoReset,
}: Props) {
  const [aporteText, setAporteText] = useState(
    aporteDisponivel > 0 ? formatBRL(aporteDisponivel) : ""
  );
  const [painelAjudaAberto, setPainelAjudaAberto] = useState(false);

  useEffect(() => {
    if (aporteDisponivel > 0) {
      setAporteText((prev) => prev === "" ? formatBRL(aporteDisponivel) : prev);
    }
  }, [aporteDisponivel]);

  const patrimonioMeta = patrimonio + aporteDisponivel;
  const totalAlocado = CARDS_ETAPA2.reduce((s, c) => s + (alocacaoMeta[c] ?? 0), 0);
  const totalAlocadoBRL = (totalAlocado / 100) * patrimonioMeta;
  const diferencaBRL = patrimonioMeta - totalAlocadoBRL;
  const diferencaPct = 100 - totalAlocado;
  const alocacaoCompleta = Math.abs(diferencaPct) < 0.1;
  const alocacaoExcede   = totalAlocado > 100.1;
  const alocacaoFalta    = totalAlocado < 99.9;

  useEffect(() => {
    onAlocacaoChange?.(alocacaoCompleta);
  }, [alocacaoCompleta, onAlocacaoChange]);

  function setPct(cardId: CardId, val: number) {
    onAlocacaoMeta({ ...alocacaoMeta, [cardId]: Math.max(0, Math.min(100, val)) });
  }

  function handleChange(id: string, partial: Partial<Ativo>) {
    onAtivos(ativos.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  }

  return (
    <>
    <PainelAjuda
      titulo="Etapa 2 — Recomendada"
      secoes={AJUDA_ETAPA2}
      aberto={painelAjudaAberto}
      onFechar={() => setPainelAjudaAberto(false)}
    />
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Carteira Recomendada</h3>
        <button
          onClick={() => setPainelAjudaAberto(true)}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#2563EB" }}
        >
          <i className="ti ti-help-circle" style={{ fontSize: 13 }} />
          Ajuda
        </button>
      </div>

      {/* ── RECOMENDAÇÃO SIMPLA (planilha de alocação) ── */}
      <PainelRecomendacaoSimpla
        clientProfile={clientProfile}
        patrimonioMeta={patrimonioMeta}
        temAtivosRecomendados={ativos.length > 0}
        onAplicar={(meta, novosAtivos) => {
          onAlocacaoMeta(meta);
          onAtivos(novosAtivos);
          onPlanoReset?.();
        }}
        custoVidaInicial={custoVidaMensal}
        onCustoVidaChange={onCustoVidaChange}
        mesesReserva={mesesReserva}
        onMesesReservaChange={onMesesReservaChange}
      />

      {/* ── CARD ALOCAÇÃO META ── */}
      <div style={{ backgroundColor: "white", border: "0.5px solid #BFDBFE", borderRadius: 12, padding: 20, marginBottom: 4 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Alocação Recomendada</span>
          {clientProfile && (
            <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>
              {PERFIL_LABELS[clientProfile] ?? clientProfile}
            </span>
          )}
        </div>

        {/* Grouped sliders */}
        {GRUPOS.map((grupo) => {
          const grupoPct = grupo.cards.reduce((s, id) => s + (alocacaoMeta[id] ?? 0), 0);
          const grupoBRL = (grupoPct / 100) * patrimonioMeta;
          return (
            <div key={grupo.label} style={{ marginBottom: 14 }}>
              {/* Group header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                paddingBottom: 6, borderBottom: "0.5px solid #F3F4F6", marginBottom: 8,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: grupo.cor,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {grupo.label}
                </span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>
                  {grupoPct.toFixed(1)}% · {formatBRL(grupoBRL)}
                </span>
              </div>

              {/* Card sliders */}
              {grupo.cards.map((cardId) => {
                const meta = CARD_META[cardId];
                const pct = alocacaoMeta[cardId] ?? 0;
                const brl = (pct / 100) * patrimonioMeta;
                return (
                  <div key={cardId} style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 72px 90px",
                    alignItems: "center",
                    gap: 10,
                    paddingLeft: 12,
                    marginBottom: 8,
                  }}>
                    {/* Label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: meta.cor, flexShrink: 0 }} />
                      {meta.label}
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.5}
                      value={pct}
                      onChange={(e) => setPct(cardId, parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: grupo.cor, height: 8 }}
                    />

                    {/* % input */}
                    <div style={{ display: "flex", alignItems: "center", borderRadius: 99, background: `${grupo.cor}18`, padding: "3px 8px", gap: 0 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={pct}
                        onChange={(e) => setPct(cardId, parseFloat(e.target.value) || 0)}
                        style={{
                          width: 52, textAlign: "right", fontSize: 13, fontWeight: 700,
                          border: "none", background: "transparent",
                          color: grupo.cor, outline: "none", padding: 0,
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: grupo.cor }}>%</span>
                    </div>

                    {/* R$ meta */}
                    <div style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                      {formatBRL(brl)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Barra de progresso de alocação */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#6B7280" }}>Total alocado</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Tooltip posicao="left" texto={`A soma de todos os percentuais deve ser exatamente 100% antes de avançar.\nO sistema avisa quando o total está divergente.`} />
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: alocacaoCompleta ? "#15803D" : alocacaoExcede ? "#B91C1C" : "#B45309",
              }}>
                {totalAlocado.toFixed(1)}%
              </span>
            </div>
          </div>
          <div style={{
            borderRadius: 99, padding: 3,
            background: alocacaoCompleta ? "#DCFCE7" : alocacaoExcede ? "#FEE2E2" : "#FEF3C7",
            border: `1px solid ${alocacaoCompleta ? "#BBF7D0" : alocacaoExcede ? "#FECACA" : "#FDE68A"}`,
          }}>
            <div style={{ height: 6, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(totalAlocado, 100)}%`,
                background: alocacaoCompleta ? "#15803D" : alocacaoExcede ? "#B91C1C" : "#F59E0B",
                borderRadius: 99,
                transition: "width 300ms ease, background 300ms ease",
              }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {alocacaoCompleta && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803D" }}>
                <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
                100% alocado — carteira recomendada completa
              </div>
            )}
            {alocacaoFalta && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#FEF3C7", border: "0.5px solid #FCD34D",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: "#B45309",
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14, flexShrink: 0 }} />
                <span>
                  Faltam <strong>{formatBRL(Math.abs(diferencaBRL))}</strong> para alocar ({Math.abs(diferencaPct).toFixed(1)}% restante). Distribua entre os cards acima.
                </span>
              </div>
            )}
            {alocacaoExcede && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#FEE2E2", border: "0.5px solid #FCA5A5",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: "#B91C1C",
              }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} />
                <span>
                  Alocação excede em <strong>{formatBRL(Math.abs(diferencaBRL))}</strong> ({(totalAlocado - 100).toFixed(1)}% acima de 100%). Reduza algum card.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD APORTE DISPONÍVEL ── */}
      <div style={{
        backgroundColor: "white",
        border: "0.5px solid #E5E7EB",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 8,
            backgroundColor: "#DCFCE7",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-cash" style={{ fontSize: 20, color: "#15803D" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Aporte Disponível</p>
              <Tooltip posicao="right" texto={`Valor adicional para investir além do patrimônio atual.\nSomado ao patrimônio para calcular as metas em R$.\nPré-preenchido para clientes Começando do Zero.`} />
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
              Valor a ser distribuído na carteira recomendada
            </p>
            {aporteDisponivel > 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#15803D" }}>
                Patrimônio após aporte: {formatBRL(patrimonioMeta)}
              </p>
            )}
            {comecandoDoZero && patrimonioColeta > 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "#2563EB" }}>
                Pré-preenchido com o patrimônio financeiro da Situação Atual — editável pelo consultor
              </p>
            )}
          </div>
        </div>

        <input
          type="text"
          value={aporteText}
          placeholder="R$ 0,00"
          onChange={(e) => {
            setAporteText(e.target.value);
            onAporteChange(parseBRL(e.target.value));
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => {
            const v = parseBRL(aporteText);
            onAporteChange(v);
            setAporteText(v > 0 ? formatBRL(v) : "");
          }}
          style={{
            type: "text",
            textAlign: "right",
            fontSize: 18,
            fontWeight: 600,
            color: "#15803D",
            border: "1px solid #BFDBFE",
            borderRadius: 8,
            padding: "8px 14px",
            width: 180,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          } as React.CSSProperties}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#86EFAC")}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget)
              e.currentTarget.style.borderColor = "#BFDBFE";
          }}
        />
      </div>

      {/* ── CARDS DE ATIVOS ── */}
      {CARDS_ETAPA2.map((cardId) => (
        <CarteiraCard
          key={cardId}
          cardId={cardId}
          ativos={ativos.filter((a) => a.card === cardId)}
          modo="recomendada"
          patrimonio={patrimonioMeta}
          metaPct={alocacaoMeta[cardId] ?? 0}
          ativosAtuaisRef={ativosAtuais}
          onChange={handleChange}
        />
      ))}
    </div>
    </>
  );
}
