import { useState } from "react";
import {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal, Plus, Trash2,
} from "lucide-react";
import type { ObjetivoVida, TipoObjetivo } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Hammer, Heart,
  Baby, Shield, TrendingUp, MoreHorizontal,
};

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const TIPOS = Object.keys(OBJETIVO_META) as TipoObjetivo[];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

interface Props {
  objetivos: ObjetivoVida[];
  onObjetivos: (v: ObjetivoVida[]) => void;
  anoAtual: number;
  anoMeta: number;
}

export function ListaObjetivos({ objetivos, onObjetivos, anoAtual, anoMeta }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [tipoSel, setTipoSel] = useState<TipoObjetivo>("imovel");
  const [label, setLabel] = useState(OBJETIVO_META["imovel"].label);
  const [valorBRL, setValorBRL] = useState(0);
  const [mes, setMes] = useState(1);
  const [ano, setAno] = useState(anoAtual + 5);

  function selectTipo(t: TipoObjetivo) {
    setTipoSel(t);
    setLabel(OBJETIVO_META[t].label);
  }

  function openForm() {
    setTipoSel("imovel");
    setLabel(OBJETIVO_META["imovel"].label);
    setValorBRL(0);
    setMes(1);
    setAno(anoAtual + 5);
    setShowForm(true);
  }

  function confirm() {
    if (!label.trim() || valorBRL <= 0) return;
    onObjetivos([
      ...objetivos,
      { id: generateId(), tipo: tipoSel, label: label.trim(), valorBRL, mes, ano },
    ]);
    setShowForm(false);
  }

  function remove(id: string) {
    onObjetivos(objetivos.filter((o) => o.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, margin: 0 }}>
          Objetivos de vida
        </p>
        {!showForm && (
          <button
            onClick={openForm}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              border: "1px solid #000000", color: "#000000",
              backgroundColor: "transparent", borderRadius: 6,
              padding: "4px 12px", cursor: "pointer", fontSize: 13,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Adicionar
          </button>
        )}
      </div>

      {showForm && (
        <div style={{
          backgroundColor: "#F0F7FF", borderRadius: 10,
          border: "1px solid #BFDBFE", padding: 14,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Icon grid */}
          <div>
            <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Tipo
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {TIPOS.map((t) => {
                const meta = OBJETIVO_META[t];
                const Icon = ICON_MAP[meta.iconName];
                const selected = tipoSel === t;
                return (
                  <button
                    key={t}
                    onClick={() => selectTipo(t)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", gap: 4,
                      padding: "8px 4px", borderRadius: 8, cursor: "pointer",
                      border: selected ? `2px solid ${meta.color}` : "1px solid #BFDBFE",
                      backgroundColor: selected ? `${meta.color}15` : "white",
                      transition: "all 0.12s",
                    }}
                  >
                    <Icon style={{ width: 16, height: 16, color: selected ? meta.color : "#6B7280" }} />
                    <span style={{ fontSize: 10, color: selected ? meta.color : "#6B7280", fontWeight: selected ? 700 : 400, textAlign: "center", lineHeight: 1.2 }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Label */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Nome
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE",
                fontSize: 13, color: "#000000", outline: "none",
                backgroundColor: "white", boxSizing: "border-box", width: "100%",
              }}
            />
          </div>

          {/* Valor + Mês + Ano row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Valor
              </label>
              <CurrencyInput value={valorBRL} onChange={setValorBRL} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Mês
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                style={{
                  padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE",
                  fontSize: 13, color: "#000000", outline: "none",
                  backgroundColor: "white", boxSizing: "border-box", width: "100%",
                }}
              >
                {MESES_LABEL.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Ano
              </label>
              <input
                type="number"
                min={anoAtual}
                max={anoMeta + 50}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                style={{
                  padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE",
                  fontSize: 13, color: "#000000", outline: "none",
                  backgroundColor: "white", boxSizing: "border-box", width: "100%",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={confirm}
              disabled={!label.trim() || valorBRL <= 0}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 6,
                backgroundColor: label.trim() && valorBRL > 0 ? "#1E3A8A" : "#E5E7EB",
                color: label.trim() && valorBRL > 0 ? "white" : "#9CA3AF",
                border: "none", cursor: label.trim() && valorBRL > 0 ? "pointer" : "default",
                fontSize: 13, fontWeight: 600,
              }}
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: "8px 16px", borderRadius: 6,
                backgroundColor: "transparent", color: "#6B7280",
                border: "1px solid #BFDBFE", cursor: "pointer", fontSize: 13,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {objetivos.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: "#9CA3AF" }}>Nenhum objetivo cadastrado.</p>
      )}

      {objetivos.map((o) => {
        const meta = OBJETIVO_META[o.tipo];
        const Icon = ICON_MAP[meta.iconName];
        const dataLabel = `${MESES_ABREV[o.mes - 1]}/${o.ano}`;
        return (
          <div
            key={o.id}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              border: "1px solid #BFDBFE", backgroundColor: "white",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              backgroundColor: `${meta.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: 16, height: 16, color: meta.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.label}
              </p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
                {dataLabel} · {formatCurrency(o.valorBRL)}
                {meta.tipo === "aporte" && (
                  <span style={{ marginLeft: 4, color: "#15803D", fontWeight: 600 }}>· entrada</span>
                )}
              </p>
            </div>
            <button
              onClick={() => remove(o.id)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 4, borderRadius: 4, color: "#9CA3AF", flexShrink: 0,
              }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
