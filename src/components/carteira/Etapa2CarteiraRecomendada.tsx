import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_ORDER, CARD_META, ALOCACAO_PADRAO } from "@/lib/carteira/types";
import { formatBRL, formatPct } from "@/lib/carteira/calculos";
import { CarteiraCard, makeNovoAtivo } from "./CarteiraCard";
import { ImportarIA } from "./ImportarIA";

interface Props {
  ativos: Ativo[];
  onAtivos: (ativos: Ativo[]) => void;
  ativosAtuais: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  onAlocacaoMeta: (m: Record<CardId, number>) => void;
  patrimonio: number;
  clientProfile: string | null;
}

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

export function Etapa2CarteiraRecomendada({ ativos, onAtivos, ativosAtuais, alocacaoMeta, onAlocacaoMeta, patrimonio, clientProfile }: Props) {
  const totalPct = CARD_ORDER.reduce((s, c) => s + (alocacaoMeta[c] ?? 0), 0);
  const totalOk = Math.abs(totalPct - 100) < 0.5;

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

  function handleIA(novos: Ativo[]) {
    onAtivos([...ativos, ...novos]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 800 }}>

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
            const valorR = (pct / 100) * patrimonio;
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

        {/* Total indicator */}
        <div style={{ marginTop: 16, padding: "8px 12px", borderRadius: 8, backgroundColor: totalOk ? "#DCFCE7" : "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: totalOk ? "#15803D" : "#B45309" }}>
            {totalOk ? "✓ Alocação completa" : "Ajuste necessário"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: totalOk ? "#15803D" : "#B45309" }}>
            {formatPct(totalPct, 1)}
          </span>
        </div>
      </div>

      {/* ── IA IMPORT ── */}
      <ImportarIA onConfirmar={handleIA} modo="recomendada" />

      {/* ── CARDS DE ATIVOS ── */}
      {CARD_ORDER.map((cardId) => (
        <CarteiraCard
          key={cardId}
          cardId={cardId}
          ativos={ativos.filter((a) => a.card === cardId)}
          modo="recomendada"
          patrimonio={patrimonio}
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
