import { useState } from "react";
import {
  Home, Car, BookOpen, Plane, Briefcase, Star, Heart,
  Monitor, Shield, TrendingUp, MoreHorizontal, Plus,
} from "lucide-react";
import type { ObjetivoVida, TipoObjetivo } from "@/types/objetivos";
import { OBJETIVO_META, getObjetivoMeta, isEntradaObjetivo } from "@/types/objetivos";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Car, BookOpen, Plane, Briefcase, Star, Heart,
  Monitor, Shield, TrendingUp, MoreHorizontal,
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

function TipoGrid({ tipoSel, onSelect }: { tipoSel: TipoObjetivo; onSelect: (t: TipoObjetivo) => void }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Tipo
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {TIPOS.map((t) => {
          const meta = getObjetivoMeta(t);
          const Icon = ICON_MAP[meta.icone];
          const selected = tipoSel === t;
          return (
            <button
              key={t}
              onClick={() => onSelect(t)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 4,
                padding: "8px 4px", borderRadius: 8, cursor: "pointer",
                border: selected ? `2px solid ${meta.cor}` : "1px solid #BFDBFE",
                backgroundColor: selected ? `${meta.cor}15` : "white",
                transition: "all 0.12s",
              }}
            >
              {Icon && <Icon style={{ width: 16, height: 16, color: selected ? meta.cor : "#6B7280" }} />}
              <span style={{ fontSize: 10, color: selected ? meta.cor : "#6B7280", fontWeight: selected ? 700 : 400, textAlign: "center", lineHeight: 1.2 }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormularioCampos({
  label, onLabel, valorBRL, onValor, mes, onMes, ano, onAno, anoAtual, anoMeta,
}: {
  label: string; onLabel: (v: string) => void;
  valorBRL: number; onValor: (v: number) => void;
  mes: number; onMes: (v: number) => void;
  ano: number; onAno: (v: number) => void;
  anoAtual: number; anoMeta: number;
}) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Nome
        </label>
        <input
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          style={{
            padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE",
            fontSize: 13, color: "#000000", outline: "none",
            backgroundColor: "white", boxSizing: "border-box", width: "100%",
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Valor
          </label>
          <CurrencyInput value={valorBRL} onChange={onValor} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Mês
          </label>
          <select
            value={mes}
            onChange={(e) => onMes(Number(e.target.value))}
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
            onChange={(e) => onAno(Number(e.target.value))}
            style={{
              padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE",
              fontSize: 13, color: "#000000", outline: "none",
              backgroundColor: "white", boxSizing: "border-box", width: "100%",
            }}
          />
        </div>
      </div>
    </>
  );
}

function TipoFluxoToggle({
  tipoFluxo, onChange,
}: {
  tipoFluxo: 'saida' | 'entrada';
  onChange: (v: 'saida' | 'entrada') => void;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Tipo de fluxo
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onChange('saida')}
          style={{
            flex: 1, padding: "6px",
            border: tipoFluxo !== 'entrada' ? '2px solid #B91C1C' : '1px solid #E5E7EB',
            borderRadius: 6,
            background: tipoFluxo !== 'entrada' ? '#FEE2E2' : 'white',
            color: tipoFluxo !== 'entrada' ? '#B91C1C' : '#6B7280',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ↓ Saída (gasto)
        </button>
        <button
          onClick={() => onChange('entrada')}
          style={{
            flex: 1, padding: "6px",
            border: tipoFluxo === 'entrada' ? '2px solid #15803D' : '1px solid #E5E7EB',
            borderRadius: 6,
            background: tipoFluxo === 'entrada' ? '#DCFCE7' : 'white',
            color: tipoFluxo === 'entrada' ? '#15803D' : '#6B7280',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ↑ Entrada (aporte extra)
        </button>
      </div>
    </div>
  );
}

export function ListaObjetivos({ objetivos, onObjetivos, anoAtual, anoMeta }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [tipoSel, setTipoSel] = useState<TipoObjetivo>("viagem");
  const [label, setLabel] = useState(OBJETIVO_META["viagem"].label);
  const [valorBRL, setValorBRL] = useState(0);
  const [mes, setMes] = useState(1);
  const [ano, setAno] = useState(anoAtual + 5);
  const [tipoFluxo, setTipoFluxo] = useState<'saida' | 'entrada'>('saida');

  const [repeticao, setRepeticao] = useState<NonNullable<ObjetivoVida['repeticao']>>('nenhuma');
  const [quantidadeRepeticoes, setQuantidadeRepeticoes] = useState(2);
  const [projetoAPrazo, setProjetoAPrazo] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(2);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState<TipoObjetivo>("viagem");
  const [editLabel, setEditLabel] = useState("");
  const [editValorBRL, setEditValorBRL] = useState(0);
  const [editMes, setEditMes] = useState(1);
  const [editAno, setEditAno] = useState(anoAtual + 5);
  const [editTipoFluxo, setEditTipoFluxo] = useState<'saida' | 'entrada'>('saida');
  const [editRepeticao, setEditRepeticao] = useState<NonNullable<ObjetivoVida['repeticao']>>('nenhuma');
  const [editQuantidadeRepeticoes, setEditQuantidadeRepeticoes] = useState(2);
  const [editProjetoAPrazo, setEditProjetoAPrazo] = useState(false);
  const [editNumeroParcelas, setEditNumeroParcelas] = useState(2);

  function openForm() {
    setTipoSel("viagem");
    setLabel(OBJETIVO_META["viagem"].label);
    setValorBRL(0);
    setMes(1);
    setAno(anoAtual + 5);
    setTipoFluxo('saida');
    setRepeticao('nenhuma');
    setQuantidadeRepeticoes(2);
    setProjetoAPrazo(false);
    setNumeroParcelas(2);
    setShowForm(true);
  }

  function confirm() {
    if (!label.trim() || valorBRL <= 0) return;
    onObjetivos([
      ...objetivos,
      {
        id: generateId(), tipo: tipoSel, label: label.trim(), valorBRL, mes, ano, ativo: true, tipoFluxo,
        repeticao: repeticao !== 'nenhuma' ? repeticao : undefined,
        quantidadeRepeticoes: repeticao !== 'nenhuma' ? quantidadeRepeticoes : undefined,
        projetoAPrazo: projetoAPrazo ? true : undefined,
        numeroParcelas: projetoAPrazo ? numeroParcelas : undefined,
      },
    ]);
    setShowForm(false);
  }

  function remove(id: string) {
    onObjetivos(objetivos.filter((o) => o.id !== id));
  }

  function startEdit(o: ObjetivoVida) {
    setEditandoId(o.id);
    setEditTipo(o.tipo);
    setEditLabel(o.label);
    setEditValorBRL(o.valorBRL);
    setEditMes(o.mes);
    setEditAno(o.ano);
    setEditTipoFluxo(o.tipoFluxo ?? (o.tipo === 'aportes_financeiros' ? 'entrada' : 'saida'));
    setEditRepeticao(o.repeticao ?? 'nenhuma');
    setEditQuantidadeRepeticoes(o.quantidadeRepeticoes ?? 2);
    setEditProjetoAPrazo(o.projetoAPrazo ?? false);
    setEditNumeroParcelas(o.numeroParcelas ?? 2);
  }

  function saveEdit(id: string) {
    if (!editLabel.trim() || editValorBRL <= 0) return;
    onObjetivos(
      objetivos.map((o) =>
        o.id === id
          ? {
              ...o, tipo: editTipo, label: editLabel.trim(), valorBRL: editValorBRL, mes: editMes, ano: editAno, tipoFluxo: editTipoFluxo,
              repeticao: editRepeticao !== 'nenhuma' ? editRepeticao : undefined,
              quantidadeRepeticoes: editRepeticao !== 'nenhuma' ? editQuantidadeRepeticoes : undefined,
              projetoAPrazo: editProjetoAPrazo ? true : undefined,
              numeroParcelas: editProjetoAPrazo ? editNumeroParcelas : undefined,
            }
          : o,
      ),
    );
    setEditandoId(null);
  }

  function toggleAtivo(id: string) {
    onObjetivos(objetivos.map((o) => (o.id === id ? { ...o, ativo: o.ativo === false } : o)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#000000", fontSize: 13, fontWeight: 700, margin: 0 }}>
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
          <TipoGrid
            tipoSel={tipoSel}
            onSelect={(t) => {
              setTipoSel(t);
              setLabel(OBJETIVO_META[t].label);
              if (t === 'aportes_financeiros') setTipoFluxo('entrada');
            }}
          />
          <FormularioCampos
            label={label} onLabel={setLabel}
            valorBRL={valorBRL} onValor={setValorBRL}
            mes={mes} onMes={setMes}
            ano={ano} onAno={setAno}
            anoAtual={anoAtual} anoMeta={anoMeta}
          />
          <TipoFluxoToggle tipoFluxo={tipoFluxo} onChange={setTipoFluxo} />

          {/* LINHA 1 — Repetição */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Repetição
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <select
                value={repeticao}
                onChange={(e) => setRepeticao(e.target.value as NonNullable<ObjetivoVida['repeticao']>)}
                style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE", fontSize: 13, color: "#000000", outline: "none", backgroundColor: "white" }}
              >
                <option value="nenhuma">Sem repetição</option>
                <option value="anual">Anual</option>
                <option value="semestral">Semestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="cada2anos">A cada 2 anos</option>
                <option value="cada3anos">A cada 3 anos</option>
              </select>
              {repeticao !== 'nenhuma' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 10, color: "#6B7280" }}>Ocorrências</span>
                  <input
                    type="number" min={2} max={50}
                    value={quantidadeRepeticoes}
                    onChange={(e) => setQuantidadeRepeticoes(Math.max(2, Number(e.target.value)))}
                    style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE", fontSize: 13, color: "#000000", outline: "none", backgroundColor: "white" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* LINHA 2 — Projeto a Prazo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              role="switch"
              aria-checked={projetoAPrazo}
              onClick={() => setProjetoAPrazo(v => !v)}
              style={{
                width: 30, height: 17, borderRadius: 999,
                backgroundColor: projetoAPrazo ? "#2563EB" : "#D1D5DB",
                border: "none", cursor: "pointer", padding: 2,
                display: "flex", alignItems: "center",
                justifyContent: projetoAPrazo ? "flex-end" : "flex-start",
                transition: "background-color 150ms", flexShrink: 0,
              }}
            >
              <div style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
            </button>
            <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>Parcelado</span>
            {projetoAPrazo && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number" min={2} max={360}
                  value={numeroParcelas}
                  onChange={(e) => setNumeroParcelas(Math.max(2, Number(e.target.value)))}
                  style={{ width: 64, padding: "4px 8px", borderRadius: 6, border: "1px solid #BFDBFE", fontSize: 12, color: "#000000", outline: "none", backgroundColor: "white" }}
                />
                <span style={{ fontSize: 12, color: "#6B7280" }}>parcelas mensais</span>
              </div>
            )}
          </div>

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
        const meta = getObjetivoMeta(o.tipo);
        const Icon = ICON_MAP[meta.icone];
        const dataLabel = `${MESES_ABREV[o.mes - 1]}/${o.ano}`;
        const cor = meta?.cor ?? "#2563EB";
        const ativo = o.ativo !== false;
        const entrada = isEntradaObjetivo(o);

        if (editandoId === o.id) {
          return (
            <div
              key={o.id}
              style={{
                backgroundColor: "#FFF7ED", borderRadius: 10,
                border: "1px solid #FED7AA", padding: 14,
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <TipoGrid
                tipoSel={editTipo}
                onSelect={(t) => {
                  setEditTipo(t);
                  setEditLabel(OBJETIVO_META[t].label);
                  if (t === 'aportes_financeiros') setEditTipoFluxo('entrada');
                }}
              />
              <FormularioCampos
                label={editLabel} onLabel={setEditLabel}
                valorBRL={editValorBRL} onValor={setEditValorBRL}
                mes={editMes} onMes={setEditMes}
                ano={editAno} onAno={setEditAno}
                anoAtual={anoAtual} anoMeta={anoMeta}
              />
              <TipoFluxoToggle tipoFluxo={editTipoFluxo} onChange={setEditTipoFluxo} />

              {/* LINHA 1 — Repetição */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Repetição
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <select
                    value={editRepeticao}
                    onChange={(e) => setEditRepeticao(e.target.value as NonNullable<ObjetivoVida['repeticao']>)}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #FED7AA", fontSize: 13, color: "#000000", outline: "none", backgroundColor: "white" }}
                  >
                    <option value="nenhuma">Sem repetição</option>
                    <option value="anual">Anual</option>
                    <option value="semestral">Semestral</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="cada2anos">A cada 2 anos</option>
                    <option value="cada3anos">A cada 3 anos</option>
                  </select>
                  {editRepeticao !== 'nenhuma' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 10, color: "#6B7280" }}>Ocorrências</span>
                      <input
                        type="number" min={2} max={50}
                        value={editQuantidadeRepeticoes}
                        onChange={(e) => setEditQuantidadeRepeticoes(Math.max(2, Number(e.target.value)))}
                        style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: "1px solid #FED7AA", fontSize: 13, color: "#000000", outline: "none", backgroundColor: "white" }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* LINHA 2 — Projeto a Prazo */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  role="switch"
                  aria-checked={editProjetoAPrazo}
                  onClick={() => setEditProjetoAPrazo(v => !v)}
                  style={{
                    width: 30, height: 17, borderRadius: 999,
                    backgroundColor: editProjetoAPrazo ? "#2563EB" : "#D1D5DB",
                    border: "none", cursor: "pointer", padding: 2,
                    display: "flex", alignItems: "center",
                    justifyContent: editProjetoAPrazo ? "flex-end" : "flex-start",
                    transition: "background-color 150ms", flexShrink: 0,
                  }}
                >
                  <div style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </button>
                <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>Parcelado</span>
                {editProjetoAPrazo && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number" min={2} max={360}
                      value={editNumeroParcelas}
                      onChange={(e) => setEditNumeroParcelas(Math.max(2, Number(e.target.value)))}
                      style={{ width: 64, padding: "4px 8px", borderRadius: 6, border: "1px solid #FED7AA", fontSize: 12, color: "#000000", outline: "none", backgroundColor: "white" }}
                    />
                    <span style={{ fontSize: 12, color: "#6B7280" }}>parcelas mensais</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => saveEdit(o.id)}
                  disabled={!editLabel.trim() || editValorBRL <= 0}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 6,
                    backgroundColor: editLabel.trim() && editValorBRL > 0 ? "#15803D" : "#E5E7EB",
                    color: editLabel.trim() && editValorBRL > 0 ? "white" : "#9CA3AF",
                    border: "none", cursor: editLabel.trim() && editValorBRL > 0 ? "pointer" : "default",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditandoId(null)}
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
          );
        }

        return (
          <div
            key={o.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              border: `1px solid ${ativo ? (entrada ? "#BBF7D0" : "#BFDBFE") : "#E5E7EB"}`,
              backgroundColor: ativo ? "white" : "#FAFAFA",
            }}
          >
            {/* LEFT: Switch */}
            <div style={{ flexShrink: 0 }}>
              <button
                onClick={() => toggleAtivo(o.id)}
                title={ativo ? "Remover da projeção" : "Incluir na projeção"}
                style={{
                  width: 30, height: 17, borderRadius: 999,
                  backgroundColor: ativo ? "#15803D" : "#D1D5DB",
                  border: "none", cursor: "pointer", padding: 2,
                  display: "flex", alignItems: "center",
                  justifyContent: ativo ? "flex-end" : "flex-start",
                  transition: "background-color 150ms",
                }}
              >
                <div style={{
                  width: 13, height: 13, borderRadius: "50%",
                  backgroundColor: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }} />
              </button>
            </div>

            {/* CENTER: Icon + Name + Date + Value + Badge */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                backgroundColor: entrada ? "#DCFCE7" : `${cor}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {Icon && <Icon style={{ width: 16, height: 16, color: ativo ? (entrada ? "#15803D" : cor) : "#9CA3AF" }} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <p style={{
                    fontSize: 12, fontWeight: 600,
                    color: ativo ? "#000000" : "#9CA3AF",
                    margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {o.label}
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: entrada ? '#15803D' : '#B91C1C',
                    background: entrada ? '#DCFCE7' : '#FEE2E2',
                    padding: '1px 6px', borderRadius: 99, flexShrink: 0,
                  }}>
                    {entrada ? '↑ Entrada' : '↓ Saída'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
                  {dataLabel} ·{" "}
                  <span style={{ color: entrada ? '#15803D' : '#B91C1C', fontWeight: 600 }}>
                    {entrada ? '+' : '−'}{formatCurrency(o.valorBRL)}
                  </span>
                </p>
              </div>
            </div>

            {/* RIGHT: Edit + Delete */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => startEdit(o)}
                title="Editar"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: 4, borderRadius: 4, color: "#6B7280",
                  lineHeight: 1, display: "flex", alignItems: "center",
                }}
              >
                <i className="ti ti-pencil" style={{ fontSize: 12 }} />
              </button>
              <button
                onClick={() => remove(o.id)}
                title="Excluir"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: 4, borderRadius: 4, color: "#9CA3AF",
                  lineHeight: 1, display: "flex", alignItems: "center",
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
