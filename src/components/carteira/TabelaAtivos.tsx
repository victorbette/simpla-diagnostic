import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import type { SimplaCard } from "@/lib/carteira/segmentos";
import { segmentoPadrao } from "@/lib/carteira/segmentos";
import { calcularValorBRL, genId, formatBRL, formatPct } from "@/lib/carteira/calculos";
import type { Ativo } from "@/lib/carteira/types";
import { SegmentoSelect } from "./SegmentoSelect";

interface Props {
  card: SimplaCard;
  ativos: Ativo[];
  onChange: (ativos: Ativo[]) => void;
  patrimonio: number;
  usdBrl?: number;
  modo: "atual" | "recomendada";
  ativosAtuaisRef?: Ativo[];
  disabled?: boolean;
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        border: `0.5px solid ${focused ? "#2563EB" : "#BFDBFE"}`,
        borderRadius: 6,
        padding: "5px 8px",
        fontSize: 12,
        backgroundColor: "white",
        color: "#111827",
        outline: "none",
        width: "100%",
        boxSizing: "border-box" as const,
        boxShadow: focused ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
        transition: "border-color 150ms, box-shadow 150ms",
        ...props.style,
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function LabelCell({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{children}</span>
  );
}

function ReadonlyVal({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{children}</span>
  );
}

function MutedVal({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: "#6B7280" }}>{children}</span>
  );
}

function RemoveBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 24, height: 24, border: "none", backgroundColor: "transparent",
        cursor: disabled ? "default" : "pointer", color: "#9CA3AF", borderRadius: 4,
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.color = "#B91C1C"; }}
      onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}
    >
      <Trash2 style={{ width: 13, height: 13 }} />
    </button>
  );
}

function AtivoRow({ template, children }: { template: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: template,
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderTop: "0.5px solid #BFDBFE",
        backgroundColor: hov ? "#F8FAFC" : "white",
        transition: "background-color 150ms",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </div>
  );
}

function HeaderRow({ template, children }: { template: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: template,
        gap: 8,
        padding: "4px 16px",
        backgroundColor: "#F8FAFC",
        borderTop: "0.5px solid #BFDBFE",
      }}
    >
      {children}
    </div>
  );
}

function AddBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "8px 16px", fontSize: 12, color: "#2563EB",
        border: "none", backgroundColor: hov ? "#F8FAFC" : "transparent",
        cursor: disabled ? "default" : "pointer", width: "100%",
        opacity: disabled ? 0.5 : 1, transition: "background-color 150ms",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Plus style={{ width: 14, height: 14 }} />
      {label}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function TabelaAtivos({
  card,
  ativos,
  onChange,
  patrimonio,
  usdBrl = 5,
  modo,
  ativosAtuaisRef = [],
  disabled = false,
}: Props) {
  function addAtivo() {
    const novo: Ativo = {
      id: genId(),
      card: card.id,
      segmento: segmentoPadrao(card.id),
      nome: "",
      valorBRL: 0,
      pctCarteira: 0,
      pctMeta: 0,
      valorMetaBRL: 0,
    };
    onChange([...ativos, novo]);
  }

  function updateAtivo(id: string, patch: Partial<Ativo>) {
    const updated = ativos.map((a) => (a.id === id ? { ...a, ...patch } : a));
    const withValues = updated.map((a) => ({
      ...a,
      valorBRL: calcularValorBRL(a, usdBrl),
    }));
    onChange(withValues);
  }

  function removeAtivo(id: string) {
    onChange(ativos.filter((a) => a.id !== id));
  }

  const subtotal = ativos.reduce((s, a) => s + a.valorBRL, 0);
  const subtotalPct = ativos.reduce((s, a) => s + a.pctCarteira, 0);
  const totalPctMeta = ativos.reduce((s, a) => s + (a.pctMeta ?? 0), 0);

  // ── MODO ATUAL ─────────────────────────────────────────────────────────────

  if (modo === "atual") {

    // posicao_brl (resgate_rapido, resgate_longo)
    if (card.inputTipo === "posicao_brl") {
      const tpl = "2fr 1fr 0.8fr 1fr 0.8fr 24px";
      return (
        <div>
          <HeaderRow template={tpl}>
            <LabelCell>Ativo / Fundo</LabelCell>
            <LabelCell>Segmento</LabelCell>
            <LabelCell>Vencimento</LabelCell>
            <LabelCell>Posição R$</LabelCell>
            <LabelCell>% Cart.</LabelCell>
            <span />
          </HeaderRow>

          {ativos.length === 0 && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF", borderTop: "0.5px solid #BFDBFE" }}>
              Nenhum ativo — clique em "+ Adicionar" abaixo.
            </div>
          )}

          {ativos.map((a) => (
            <AtivoRow key={a.id} template={tpl}>
              <SInput
                value={a.nome}
                onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                placeholder="Nome do ativo"
                disabled={disabled}
              />
              <SegmentoSelect cardId={card.id} value={a.segmento} onChange={(v) => updateAtivo(a.id, { segmento: v })} disabled={disabled} />
              <SInput
                value={a.vencimento ?? ""}
                onChange={(e) => updateAtivo(a.id, { vencimento: e.target.value })}
                placeholder="D+1, 15/05/29"
                disabled={disabled}
              />
              <SInput
                type="number"
                value={a.posicaoBRL ?? ""}
                onChange={(e) => updateAtivo(a.id, { posicaoBRL: parseFloat(e.target.value) || 0 })}
                style={{ textAlign: "right" }}
                disabled={disabled}
              />
              <MutedVal>{formatPct(a.pctCarteira)}</MutedVal>
              <RemoveBtn onClick={() => removeAtivo(a.id)} disabled={disabled} />
            </AtivoRow>
          ))}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid #BFDBFE" }}>
            <AddBtn label={`Adicionar ${card.label}`} onClick={addAtivo} disabled={disabled} />
            <span style={{ fontSize: 11, color: "#6B7280", padding: "0 16px" }}>
              {formatBRL(subtotal)} · {formatPct(subtotalPct)}
            </span>
          </div>
        </div>
      );
    }

    // qtde_cotacao_brl (acoes, fiis, cripto)
    if (card.inputTipo === "qtde_cotacao_brl") {
      const tpl = "2fr 1fr 1fr 1fr 0.8fr 24px";
      return (
        <div>
          <HeaderRow template={tpl}>
            <LabelCell>Ticker / Nome</LabelCell>
            <LabelCell>Cotação R$</LabelCell>
            <LabelCell>Quantidade</LabelCell>
            <LabelCell>Valor R$</LabelCell>
            <LabelCell>% Cart.</LabelCell>
            <span />
          </HeaderRow>

          {ativos.length === 0 && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF", borderTop: "0.5px solid #BFDBFE" }}>
              Nenhum ativo — clique em "+ Adicionar" abaixo.
            </div>
          )}

          {ativos.map((a) => (
            <AtivoRow key={a.id} template={tpl}>
              <SInput
                value={a.nome}
                onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
                placeholder="Nome do ativo"
                disabled={disabled}
              />
              <SInput
                type="number"
                value={a.cotacaoBRL ?? ""}
                onChange={(e) => updateAtivo(a.id, { cotacaoBRL: parseFloat(e.target.value) || 0 })}
                style={{ textAlign: "right" }}
                disabled={disabled}
              />
              <SInput
                type="number"
                value={a.quantidade ?? ""}
                onChange={(e) => updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })}
                style={{ textAlign: "right" }}
                disabled={disabled}
              />
              <ReadonlyVal>{formatBRL(a.valorBRL)}</ReadonlyVal>
              <MutedVal>{formatPct(a.pctCarteira)}</MutedVal>
              <RemoveBtn onClick={() => removeAtivo(a.id)} disabled={disabled} />
            </AtivoRow>
          ))}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid #BFDBFE" }}>
            <AddBtn label={`Adicionar ${card.label}`} onClick={addAtivo} disabled={disabled} />
            <span style={{ fontSize: 11, color: "#6B7280", padding: "0 16px" }}>
              {formatBRL(subtotal)} · {formatPct(subtotalPct)}
            </span>
          </div>
        </div>
      );
    }

    // qtde_cotacao_usd (exterior)
    const tplUsd = "2fr 1fr 1fr 1fr 1fr 0.8fr 24px";
    return (
      <div>
        <HeaderRow template={tplUsd}>
          <LabelCell>Ticker / Nome</LabelCell>
          <LabelCell>Segmento</LabelCell>
          <LabelCell>Cotação USD</LabelCell>
          <LabelCell>Quantidade</LabelCell>
          <LabelCell>Valor R$</LabelCell>
          <LabelCell>% Cart.</LabelCell>
          <span />
        </HeaderRow>

        {ativos.length === 0 && (
          <div style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF", borderTop: "0.5px solid #BFDBFE" }}>
            Nenhum ativo — clique em "+ Adicionar" abaixo.
          </div>
        )}

        {ativos.map((a) => (
          <AtivoRow key={a.id} template={tplUsd}>
            <SInput
              value={a.nome}
              onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
              placeholder="Nome do ativo"
              disabled={disabled}
            />
            <SegmentoSelect cardId={card.id} value={a.segmento} onChange={(v) => updateAtivo(a.id, { segmento: v })} disabled={disabled} />
            <SInput
              type="number"
              value={a.cotacaoUSD ?? ""}
              onChange={(e) => updateAtivo(a.id, { cotacaoUSD: parseFloat(e.target.value) || 0 })}
              style={{ textAlign: "right" }}
              disabled={disabled}
            />
            <SInput
              type="number"
              value={a.quantidade ?? ""}
              onChange={(e) => updateAtivo(a.id, { quantidade: parseFloat(e.target.value) || 0 })}
              style={{ textAlign: "right" }}
              disabled={disabled}
            />
            <ReadonlyVal>{formatBRL(a.valorBRL)}</ReadonlyVal>
            <MutedVal>{formatPct(a.pctCarteira)}</MutedVal>
            <RemoveBtn onClick={() => removeAtivo(a.id)} disabled={disabled} />
          </AtivoRow>
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid #BFDBFE" }}>
          <AddBtn label={`Adicionar ${card.label}`} onClick={addAtivo} disabled={disabled} />
          <span style={{ fontSize: 11, color: "#6B7280", padding: "0 16px" }}>
            {formatBRL(subtotal)} · {formatPct(subtotalPct)}
          </span>
        </div>
      </div>
    );
  }

  // ── MODO RECOMENDADA ────────────────────────────────────────────────────────

  const tplRec = "2fr 1.2fr 0.8fr 1fr 0.8fr 1fr 24px";
  return (
    <div>
      <HeaderRow template={tplRec}>
        <LabelCell>Ativo / Fundo</LabelCell>
        <LabelCell>Segmento</LabelCell>
        <LabelCell>% Meta</LabelCell>
        <LabelCell>R$ Meta</LabelCell>
        <LabelCell>% Atual</LabelCell>
        <LabelCell>Dif. R$</LabelCell>
        <span />
      </HeaderRow>

      {ativos.length === 0 && (
        <div style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF", borderTop: "0.5px solid #BFDBFE" }}>
          Nenhum ativo — clique em "+ Adicionar" abaixo.
        </div>
      )}

      {ativos.map((a) => {
        const ref = ativosAtuaisRef.find(
          (r) => r.nome.trim().toLowerCase() === a.nome.trim().toLowerCase()
        );
        const pctAtual = ref?.pctCarteira ?? null;
        const valorAtualBRL = ref?.valorBRL ?? 0;
        const dif = (a.valorMetaBRL ?? 0) - valorAtualBRL;

        return (
          <AtivoRow key={a.id} template={tplRec}>
            <SInput
              value={a.nome}
              onChange={(e) => updateAtivo(a.id, { nome: e.target.value })}
              placeholder="Nome do ativo"
              disabled={disabled}
            />
            <SegmentoSelect cardId={card.id} value={a.segmento} onChange={(v) => updateAtivo(a.id, { segmento: v })} disabled={disabled} />
            <SInput
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={a.pctMeta ?? ""}
              onChange={(e) => {
                const newPct = parseFloat(e.target.value) || 0;
                updateAtivo(a.id, { pctMeta: newPct, valorMetaBRL: (newPct / 100) * patrimonio });
              }}
              style={{ textAlign: "right" }}
              disabled={disabled}
            />
            <MutedVal>{formatBRL(a.valorMetaBRL ?? 0)}</MutedVal>
            <MutedVal>{pctAtual !== null ? formatPct(pctAtual) : "—"}</MutedVal>
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: dif > 100 ? "#15803D" : dif < -100 ? "#B91C1C" : "#9CA3AF",
            }}>
              {Math.abs(dif) <= 100 ? "—" : `${dif > 0 ? "+" : ""}${formatBRL(dif)}`}
            </span>
            <RemoveBtn onClick={() => removeAtivo(a.id)} disabled={disabled} />
          </AtivoRow>
        );
      })}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid #BFDBFE" }}>
        <AddBtn label={`Adicionar ${card.label}`} onClick={addAtivo} disabled={disabled} />
        <span style={{ fontSize: 11, color: "#6B7280", padding: "0 16px" }}>
          Subtotal {formatBRL(subtotal)} · Meta {formatPct(totalPctMeta)}
        </span>
      </div>
    </div>
  );
}
