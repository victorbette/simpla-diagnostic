import { useState, useEffect } from "react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META, ALOCACAO_PADRAO } from "@/lib/carteira/types";
import { formatBRL } from "@/lib/carteira/calculos";
import { CarteiraCard, makeNovoAtivo } from "./CarteiraCard";

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
}

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

function parseBRL(raw: string): number {
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  return isNaN(v) || v < 0 ? 0 : v;
}

export function Etapa2CarteiraRecomendada({
  ativos, onAtivos, ativosAtuais, alocacaoMeta, onAlocacaoMeta,
  patrimonio, clientProfile, aporteDisponivel, onAporteChange, onAlocacaoChange,
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

  useEffect(() => {
    onAlocacaoChange?.(alocacaoCompleta);
  }, [alocacaoCompleta, onAlocacaoChange]);

  function setPct(cardId: CardId, val: number) {
    onAlocacaoMeta({ ...alocacaoMeta, [cardId]: Math.max(0, Math.min(100, val)) });
  }

  function carregarPadrao() {
    const padrao = clientProfile ? ALOCACAO_PADRAO[clientProfile] : null;
    if (padrao) onAlocacaoMeta({ ...padrao });
  }

  function resetar() {
    const vazio = CARD_ORDER.reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as Record<CardId, number>);
    onAlocacaoMeta(vazio);
  }

  function handleAdd(cardId: CardId) {
    onAtivos([...ativos, makeNovoAtivo(cardId)]);
  }

  function handleRemove(id: string) {
    onAtivos(ativos.filter((a) => a.id !== id));
  }

  function handleChange(id: string, campo: keyof Ativo, valor: string | number) {
    onAtivos(ativos.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>

      {/* ── CARD ALOCAÇÃO META ── */}
      <div style={{ backgroundColor: "white", border: "0.5px solid #BFDBFE", borderRadius: 12, padding: 20, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Alocação Recomendada</span>
          {clientProfile && (
            <span style={{ backgroundColor: "#FEF3C7", color: "#B45309", fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>
              {PERFIL_LABELS[clientProfile] ?? clientProfile}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={carregarPadrao}
            disabled={!clientProfile}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #BFDBFE", backgroundColor: "transparent", cursor: clientProfile ? "pointer" : "default", color: "#374151", opacity: clientProfile ? 1 : 0.4 }}
          >
            Padrão Simpla
          </button>
          <button
            onClick={resetar}
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #BFDBFE", backgroundColor: "transparent", cursor: "pointer", color: "#374151" }}
          >
            Resetar
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          {CARD_ORDER.map((cardId) => {
            const meta = CARD_META[cardId];
            const pct = alocacaoMeta[cardId] ?? 0;
            const valorR = (pct / 100) * patrimonioMeta;
            return (
              <div key={cardId}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{meta.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={pct}
                    onChange={(e) => setPct(cardId, parseFloat(e.target.value) || 0)}
                    style={{ width: 52, textAlign: "right", fontSize: 12, border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 4px" }}
                  />
                  <span style={{ fontSize: 11, color: "#6B7280" }}>%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={pct}
                  onChange={(e) => setPct(cardId, parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: meta.cor, height: 4 }}
                />
                <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 2 }}>
                  {formatBRL(valorR)}
                </div>
              </div>
            );
          })}
        </div>

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
          <div style={{ height: 8, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(totalAlocado, 100)}%`,
              background: alocacaoCompleta ? "#15803D" : alocacaoExcede ? "#B91C1C" : "#F59E0B",
              borderRadius: 99,
              transition: "width 300ms ease, background 300ms ease",
            }} />
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
        border: "0.5px solid #BFDBFE",
        borderLeft: "4px solid #15803D",
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
          onAdd={() => handleAdd(cardId)}
          onRemove={handleRemove}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}
