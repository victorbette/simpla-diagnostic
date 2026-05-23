import { useState, useRef } from "react";
import { Upload, X, Sparkles, Check } from "lucide-react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { genId } from "@/lib/carteira/calculos";
import { lerCarteiraClaude } from "../../lib/carteira/leitorIA";
import type { AtivoExtraido } from "../../lib/carteira/leitorIA";

interface Props {
  onConfirmar: (ativos: Ativo[]) => void;
  modo: "atual" | "recomendada";
}

type Stage = "banner" | "analisando" | "confirmacao";

const VALID_CARDS: CardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];

interface ItemConfirm {
  checked: boolean;
  nome: string;
  valorBRL: number;
  card: CardId;
  segmento: string;
}

export function ImportarIA({ onConfirmar, modo: _modo }: Props) {
  const [stage, setStage] = useState<Stage>("banner");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [progress, setProgress] = useState("");
  const [erro, setErro] = useState("");
  const [items, setItems] = useState<ItemConfirm[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setArquivos((prev) => [...prev, ...Array.from(files)]);
  }

  async function handleAnalisar() {
    if (arquivos.length === 0) return;
    setStage("analisando");
    setErro("");
    setProgress("Preparando...");
    try {
      const resultado: AtivoExtraido[] = await lerCarteiraClaude(arquivos, setProgress);
      const mapped: ItemConfirm[] = resultado.map((r) => {
        const card: CardId = VALID_CARDS.includes(r.cardInferido as CardId)
          ? (r.cardInferido as CardId)
          : "resgate_rapido";
        const segmento = CARD_META[card].segmentos[0] ?? "";
        return { checked: true, nome: r.nome, valorBRL: r.valorBRL, card, segmento };
      });
      setItems(mapped);
      setStage("confirmacao");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao analisar.");
      setStage("banner");
    }
  }

  function handleConfirmar() {
    const novos: Ativo[] = items
      .filter((it) => it.checked && it.nome.trim())
      .map((it) => ({
        id: genId(),
        card: it.card,
        nome: it.nome,
        segmento: it.segmento,
        valorBRL: it.valorBRL,
      }));
    onConfirmar(novos);
    setStage("banner");
    setArquivos([]);
    setItems([]);
  }

  function updateItem(i: number, patch: Partial<ItemConfirm>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  // ── Banner stage ──────────────────────────────────────────────────────────────
  if (stage === "banner") {
    return (
      <div style={{
        border: "1px solid #BFDBFE", borderRadius: 10, backgroundColor: "white",
        overflow: "hidden",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: arquivos.length > 0 ? "1px solid #EFF6FF" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={15} color="#2563EB" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Importar com IA</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>extratos, prints, PDF ou planilhas</span>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 12, color: "#2563EB", backgroundColor: "#EFF6FF",
                border: "1px solid #BFDBFE", borderRadius: 6,
                padding: "4px 10px", cursor: "pointer",
              }}
            >
              <Upload size={12} />
              Carregar arquivo →
            </button>
          </div>
          {erro && <p style={{ fontSize: 12, color: "#B91C1C", margin: "6px 0 0" }}>{erro}</p>}
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />

        {arquivos.length > 0 && (
          <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            {arquivos.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <button
                  onClick={() => setArquivos((prev) => prev.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAnalisar}
              style={{
                marginTop: 4, alignSelf: "flex-start",
                backgroundColor: "#2563EB", color: "white",
                border: "none", borderRadius: 6, padding: "5px 12px",
                fontSize: 12, cursor: "pointer", fontWeight: 600,
              }}
            >
              Analisar com IA
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Analisando stage ──────────────────────────────────────────────────────────
  if (stage === "analisando") {
    return (
      <div style={{
        border: "1px solid #BFDBFE", borderRadius: 10, backgroundColor: "white",
        padding: "16px 14px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          border: "2px solid #2563EB", borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Analisando arquivos...</span>
          {progress && <span style={{ fontSize: 12, color: "#6B7280" }}>{progress}</span>}
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>
            {arquivos.map((f, i) => <span key={i} style={{ marginRight: 8 }}>{f.name}</span>)}
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmacao stage ─────────────────────────────────────────────────────────
  return (
    <div style={{
      border: "1px solid #BFDBFE", borderRadius: 10, backgroundColor: "white",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid #EFF6FF",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
          {items.length} ativo(s) extraído(s) — revise e confirme
        </span>
        <button
          onClick={() => { setStage("banner"); setItems([]); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A8A" }}>
              <th style={{ color: "white", padding: "6px 10px", width: 32 }}></th>
              <th style={{ color: "white", padding: "6px 10px", textAlign: "left" }}>Nome</th>
              <th style={{ color: "white", padding: "6px 10px", textAlign: "right" }}>Valor R$</th>
              <th style={{ color: "white", padding: "6px 10px", textAlign: "left" }}>Card</th>
              <th style={{ color: "white", padding: "6px 10px", textAlign: "left" }}>Segmento</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F3F4F6", backgroundColor: it.checked ? "white" : "#FAFAFA" }}>
                <td style={{ padding: "5px 10px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={it.checked}
                    onChange={(e) => updateItem(i, { checked: e.target.checked })}
                  />
                </td>
                <td style={{ padding: "5px 10px" }}>
                  <input
                    value={it.nome}
                    onChange={(e) => updateItem(i, { nome: e.target.value })}
                    style={{ border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 6px", fontSize: 12, width: "100%", minWidth: 120, outline: "none" }}
                  />
                </td>
                <td style={{ padding: "5px 10px", textAlign: "right" }}>
                  <input
                    type="number"
                    value={it.valorBRL}
                    onChange={(e) => updateItem(i, { valorBRL: parseFloat(e.target.value) || 0 })}
                    style={{ border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 6px", fontSize: 12, width: 100, textAlign: "right", outline: "none" }}
                  />
                </td>
                <td style={{ padding: "5px 10px" }}>
                  <select
                    value={it.card}
                    onChange={(e) => {
                      const c = e.target.value as CardId;
                      const seg = CARD_META[c].segmentos[0] ?? "";
                      updateItem(i, { card: c, segmento: seg });
                    }}
                    style={{ border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 4px", fontSize: 11, outline: "none", cursor: "pointer" }}
                  >
                    {CARD_ORDER.map((c) => <option key={c} value={c}>{CARD_META[c].label}</option>)}
                  </select>
                </td>
                <td style={{ padding: "5px 10px" }}>
                  {CARD_META[it.card].segmentos.length > 0 ? (
                    <select
                      value={it.segmento}
                      onChange={(e) => updateItem(i, { segmento: e.target.value })}
                      style={{ border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 4px", fontSize: 11, outline: "none", cursor: "pointer" }}
                    >
                      {CARD_META[it.card].segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "10px 14px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => { setStage("banner"); setItems([]); }}
          style={{
            border: "1px solid #BFDBFE", borderRadius: 6, padding: "5px 12px",
            fontSize: 12, cursor: "pointer", backgroundColor: "white", color: "#374151",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirmar}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            backgroundColor: "#1E3A8A", color: "white",
            border: "none", borderRadius: 6, padding: "5px 14px",
            fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}
        >
          <Check size={13} />
          Adicionar {items.filter((it) => it.checked).length} ativo(s)
        </button>
      </div>
    </div>
  );
}
