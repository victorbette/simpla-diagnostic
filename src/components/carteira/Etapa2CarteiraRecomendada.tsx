import { useState, useEffect } from "react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CarteiraCard, makeNovoAtivo } from "./CarteiraCard";
import { PainelRecomendacaoSimpla } from "./PainelRecomendacaoSimpla";

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
  usdBrl?: number;
  onUsdBrlChange?: (v: number) => void;
}

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const GRUPOS = [
  { label: "Renda Fixa",     cor: "#1E40AF", cards: ["resgate_longo", "resgate_rapido"] as CardId[] },
  { label: "Renda Variável", cor: "#15803D", cards: ["acoes", "fiis"] as CardId[] },
  { label: "Internacional",  cor: "#B45309", cards: ["exterior"] as CardId[] },
  { label: "Cripto",         cor: "#1D4ED8", cards: ["cripto"] as CardId[] },
];

function parseBRL(raw: string): number {
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  return isNaN(v) || v < 0 ? 0 : v;
}

export function Etapa2CarteiraRecomendada({
  ativos, onAtivos, ativosAtuais, alocacaoMeta, onAlocacaoMeta,
  patrimonio, clientProfile, aporteDisponivel, onAporteChange, onAlocacaoChange,
  usdBrl, onUsdBrlChange,
}: Props) {
  const [aporteText, setAporteText] = useState(
    aporteDisponivel > 0 ? formatBRL(aporteDisponivel) : ""
  );

  const patrimonioMeta = patrimonio + aporteDisponivel;
  const totalAlocado = CARD_ORDER.reduce((s, c) => s + (alocacaoMeta[c] ?? 0), 0);
  const totalAlocadoBRL = (totalAlocado / 100) * patrimonioMeta;
  const diferencaBRL = patrimonioMeta - totalAlocadoBRL;
  const diferencaPct = 100 - totalAlocado;
  const alocacaoCompleta = Math.abs(diferencaPct) < 0.1;
  const alocacaoExcede   = totalAlocado > 100.1;
  const alocacaoFalta    = totalAlocado < 99.9;

  const ativosManuaisSemObservacao = ativos.filter(
    (a) => a.adicionadoManualmente === true && !a.observacao?.trim()
  );
  const podeAvancar = alocacaoCompleta && ativosManuaisSemObservacao.length === 0;

  useEffect(() => {
    onAlocacaoChange?.(podeAvancar);
  }, [podeAvancar, onAlocacaoChange]);

  function setPct(cardId: CardId, val: number) {
    onAlocacaoMeta({ ...alocacaoMeta, [cardId]: Math.max(0, Math.min(100, val)) });
  }

  function handleAdd(cardId: CardId) {
    onAtivos([...ativos, { ...makeNovoAtivo(cardId), adicionadoManualmente: true }]);
  }

  function handleRemove(id: string) {
    onAtivos(ativos.filter((a) => a.id !== id));
  }

  function handleChange(id: string, partial: Partial<Ativo>) {
    onAtivos(ativos.map((a) => (a.id === id ? { ...a, ...partial } : a)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>

      {/* ── RECOMENDAÇÃO SIMPLA (planilha de alocação) ── */}
      <PainelRecomendacaoSimpla
        clientProfile={clientProfile}
        patrimonioMeta={patrimonioMeta}
        temAtivosRecomendados={ativos.length > 0}
        onAplicar={(meta, novosAtivos) => {
          onAlocacaoMeta(meta);
          onAtivos(novosAtivos);
        }}
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
                      style={{ width: "100%", accentColor: grupo.cor, height: 4 }}
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
                          width: 38, textAlign: "right", fontSize: 12, fontWeight: 700,
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
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: alocacaoCompleta ? "#15803D" : alocacaoExcede ? "#B91C1C" : "#B45309",
            }}>
              {totalAlocado.toFixed(1)}%
            </span>
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
            {podeAvancar && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#15803D" }}>
                <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
                100% alocado — carteira recomendada completa
              </div>
            )}
            {alocacaoCompleta && ativosManuaisSemObservacao.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#FEE2E2", border: "0.5px solid #FCA5A5",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: "#B91C1C",
              }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} />
                <span>
                  {ativosManuaisSemObservacao.length === 1
                    ? "1 ativo adicionado manualmente precisa de observação antes de avançar."
                    : `${ativosManuaisSemObservacao.length} ativos adicionados manualmente precisam de observação antes de avançar.`}
                </span>
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
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Aporte Disponível</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
              Valor a ser distribuído na carteira recomendada
            </p>
            {aporteDisponivel > 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#15803D" }}>
                Patrimônio após aporte: {formatBRL(patrimonioMeta)}
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
      {CARD_ORDER.map((cardId) => (
        <CarteiraCard
          key={cardId}
          cardId={cardId}
          ativos={ativos.filter((a) => a.card === cardId)}
          modo="recomendada"
          patrimonio={patrimonioMeta}
          metaPct={alocacaoMeta[cardId] ?? 0}
          ativosAtuaisRef={ativosAtuais}
          usdBrl={usdBrl}
          onUsdBrlChange={onUsdBrlChange}
          onAdd={() => handleAdd(cardId)}
          onRemove={handleRemove}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}
