import { useState, useRef } from "react";
import { Upload, X, Sparkles, Check } from "lucide-react";
import type { Ativo, CardId } from "@/lib/carteira/types";
import { CARD_META, CARD_ORDER } from "@/lib/carteira/types";
import { genId } from "@/lib/carteira/calculos";

interface Props {
  onConfirmar: (ativos: Ativo[]) => void;
  modo: "atual" | "recomendada";
}

type Stage = "banner" | "analisando" | "confirmacao";

const VALID_CARDS: CardId[] = ["resgate_longo", "resgate_rapido", "acoes", "fiis", "exterior", "cripto"];

interface ItemConfirm {
  checked: boolean;
  nome: string;
  valorBRL: number;
  card: CardId;
  segmento: string;
  vencimento?: string;
}

const SYSTEM_PROMPT = `Você é um especialista em extrair dados de carteiras de investimento brasileiras. Analise o arquivo e extraia TODOS os ativos com nome e valor atual em R$.

Classifique cada ativo em um dos cards:
- resgate_longo: Tesouro IPCA+, NTN-B, CRI, CRA, LCI/LCA longo prazo, fundos RF, fundos MM, COE, debêntures
- resgate_rapido: Tesouro Selic, CDB liquidez diária, LCI/LCA curto prazo, fundo DI
- acoes: ações brasileiras (ticker com 4 letras + dígito)
- fiis: fundos imobiliários (ticker com 4 letras + 11)
- exterior: ETFs, stocks, REITs internacionais (VOO, QQQ...)
- cripto: Bitcoin, Ethereum e outros criptoativos

Para RF, identifique o segmento:
Pós-fixado | Inflação | Prefixado | Fundos RF | Fundos MM | COE

Para Exterior: Renda Variável | Renda Fixa

Retorne APENAS JSON válido sem markdown:
{
  "ativos": [
    {
      "nome": "Tesouro IPCA+ 2035",
      "card": "resgate_longo",
      "segmento": "Inflação",
      "vencimento": "15/05/2035",
      "valorBRL": 85000.00
    }
  ]
}`;

function getMediaType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif",
    pdf: "application/pdf",
    csv: "text/plain", txt: "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildContentBlock(file: File): Promise<Record<string, any>[]> {
  const mt = getMediaType(file);
  if (mt.startsWith("image/")) {
    const b64 = await fileToBase64(file);
    return [{ type: "image", source: { type: "base64", media_type: mt, data: b64 } }];
  }
  if (mt === "application/pdf") {
    const b64 = await fileToBase64(file);
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }];
  }
  try {
    const text = await fileToText(file);
    return [{ type: "text", text: `Arquivo: ${file.name}\n\n${text}` }];
  } catch {
    const b64 = await fileToBase64(file);
    return [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }];
  }
}

interface AIAtivo {
  nome: string;
  card: string;
  segmento?: string;
  vencimento?: string;
  valorBRL: number;
}

async function analisarArquivos(arquivos: File[], onProgress: (s: string) => void): Promise<ItemConfirm[]> {
  const apiKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ?? "";
  if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY não configurada.");

  onProgress("Preparando arquivos...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: Record<string, any>[] = [];
  for (const file of arquivos) {
    onProgress(`Processando ${file.name}...`);
    const blocks = await buildContentBlock(file);
    contentBlocks.push(...blocks);
  }
  contentBlocks.push({ type: "text", text: "Extraia todos os ativos da carteira e retorne o JSON." });

  onProgress("Analisando com IA...");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Erro na API (${response.status}): ${err}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido.");
  const parsed = JSON.parse(jsonMatch[0]) as { ativos: AIAtivo[] };
  if (!Array.isArray(parsed.ativos)) throw new Error("Formato inesperado na resposta da IA.");

  return parsed.ativos.map((a) => {
    const card: CardId = VALID_CARDS.includes(a.card as CardId) ? (a.card as CardId) : "resgate_rapido";
    const segmento = a.segmento && CARD_META[card].segmentos.includes(a.segmento as never)
      ? a.segmento
      : CARD_META[card].segmentos[0] ?? "";
    return {
      checked: true,
      nome: String(a.nome ?? ""),
      valorBRL: Number(a.valorBRL) || 0,
      card,
      segmento,
      vencimento: a.vencimento,
    };
  });
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
    try {
      const resultado = await analisarArquivos(arquivos, setProgress);
      setItems(resultado);
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
        ...(it.vencimento ? { vencimento: it.vencimento } : {}),
      }));
    onConfirmar(novos);
    setStage("banner");
    setArquivos([]);
    setItems([]);
  }

  function updateItem(i: number, patch: Partial<ItemConfirm>) {
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      // reset segmento when card changes
      if (patch.card && patch.card !== it.card) {
        next.segmento = CARD_META[patch.card].segmentos[0] ?? "";
      }
      return next;
    }));
  }

  // ── Banner ───────────────────────────────────────────────────────────────────
  if (stage === "banner") {
    return (
      <div style={{
        backgroundColor: "white", border: "0.5px solid #BFDBFE", borderRadius: 12,
        overflow: "hidden", marginBottom: 4,
      }}>
        <div style={{ padding: "10px 14px", borderBottom: arquivos.length > 0 ? "1px solid #EFF6FF" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={14} color="#2563EB" />
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Importar com IA</span>
                <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>extratos, prints, PDF ou planilhas</span>
              </div>
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
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />

        {arquivos.length > 0 && (
          <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            {arquivos.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <button
                  onClick={() => setArquivos((prev) => prev.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0, display: "flex" }}
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

  // ── Analisando ───────────────────────────────────────────────────────────────
  if (stage === "analisando") {
    return (
      <div style={{
        backgroundColor: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 12,
        padding: "16px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 4,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          border: "2px solid #2563EB", borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Analisando arquivos com IA...</span>
          {progress && <span style={{ fontSize: 12, color: "#6B7280" }}>{progress}</span>}
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>
            {arquivos.map((f, i) => <span key={i} style={{ marginRight: 8 }}>{f.name}</span>)}
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmação ──────────────────────────────────────────────────────────────
  const checked = items.filter((it) => it.checked).length;
  return (
    <div style={{
      backgroundColor: "white", border: "2px solid #2563EB", borderRadius: 12,
      overflow: "hidden", marginBottom: 4,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px", borderBottom: "1px solid #EFF6FF",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>
          Ativos identificados pela IA
        </span>
        <span style={{
          backgroundColor: "#DBEAFE", color: "#1E40AF",
          fontSize: 11, padding: "2px 8px", borderRadius: 999,
        }}>
          {items.length} ativos encontrados
        </span>
        <button
          onClick={() => { setStage("banner"); setItems([]); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex" }}
        >
          <X size={16} />
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#6B7280", margin: "6px 14px" }}>
        Revise e corrija antes de adicionar à carteira
      </p>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ backgroundColor: "#1E3A8A" }}>
              {["✓", "Ativo", "Card", "Segmento", "R$ Atual"].map((h, i) => (
                <th key={i} style={{
                  color: "white", padding: "6px 10px", fontSize: 11,
                  textAlign: i >= 4 ? "right" : i === 0 ? "center" : "left",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid #F3F4F6",
                  backgroundColor: i % 2 === 0 ? "#F8FAFF" : "white",
                  opacity: it.checked ? 1 : 0.4,
                }}
              >
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
                <td style={{ padding: "5px 10px" }}>
                  <select
                    value={it.card}
                    onChange={(e) => updateItem(i, { card: e.target.value as CardId })}
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
                <td style={{ padding: "5px 10px", textAlign: "right" }}>
                  <input
                    type="number"
                    value={it.valorBRL}
                    onChange={(e) => updateItem(i, { valorBRL: parseFloat(e.target.value) || 0 })}
                    style={{ border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 6px", fontSize: 12, width: 100, textAlign: "right", outline: "none" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #EFF6FF" }}>
        <span style={{ fontSize: 12, color: "#6B7280" }}>{checked} de {items.length} ativos selecionados</span>
        <div style={{ display: "flex", gap: 8 }}>
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
              backgroundColor: "#2563EB", color: "white",
              border: "none", borderRadius: 6, padding: "5px 14px",
              fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}
          >
            <Check size={13} />
            Adicionar selecionados →
          </button>
        </div>
      </div>
    </div>
  );
}
