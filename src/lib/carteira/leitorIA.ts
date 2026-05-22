import type { SimplaCardId } from "./segmentos";

export interface AtivoExtraido {
  nome: string;
  valorBRL: number;
  cardInferido?: SimplaCardId;
}

interface ExtractedResponse {
  ativos: { nome: string; valorBRL: number; cardInferido?: string }[];
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

function isImage(file: File): boolean {
  return getMediaType(file).startsWith("image/");
}

function isPDF(file: File): boolean {
  return getMediaType(file) === "application/pdf";
}

function isText(file: File): boolean {
  const mt = getMediaType(file);
  return mt.startsWith("text/") || file.name.endsWith(".csv") || file.name.endsWith(".txt");
}

const SYSTEM_PROMPT = `Você é um especialista em extrair dados de carteiras de investimento.
Analise o(s) arquivo(s) e extraia TODOS os ativos com seus valores atuais em R$.
Retorne APENAS um JSON válido, sem markdown, sem explicações:
{
  "ativos": [
    {
      "nome": "nome ou ticker exato do ativo",
      "valorBRL": 15000.00,
      "cardInferido": "resgate_rapido"
    }
  ]
}

Cards válidos para cardInferido (padrão Simpla Invest):
- "resgate_rapido": CDB, LCI, LCA, Tesouro Selic, fundos DI, poupança (liquidez imediata)
- "resgate_longo": Tesouro IPCA+, NTN-B, CRI, CRA, debêntures IPCA, Tesouro Prefixado (prazo longo)
- "acoes": ações BR (PETR4, VALE3, BBAS3, ITUB4 etc.)
- "fiis": fundos imobiliários (HGLG11, XPML11, MXRF11 etc.)
- "exterior": ativos internacionais em USD (ETFs: VOO, QQQM, VNQ; stocks; bonds; treasuries)
- "cripto": Bitcoin (BTC), Ethereum (ETH), demais criptoativos

Regras importantes:
- Se valor estiver em USD, converta pela taxa ~5.0 (ou use o valor em BRL se disponível)
- Inclua TODOS os ativos visíveis, não deixe nenhum de fora
- Se não souber o card, omita cardInferido
- valorBRL deve ser número (sem R$ ou formatação)`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentBlock = Record<string, any>;

async function buildContentBlock(file: File): Promise<ContentBlock[]> {
  if (isImage(file)) {
    const b64 = await fileToBase64(file);
    return [{ type: "image", source: { type: "base64", media_type: getMediaType(file), data: b64 } }];
  }
  if (isPDF(file)) {
    const b64 = await fileToBase64(file);
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }];
  }
  if (isText(file)) {
    const text = await fileToText(file);
    return [{ type: "text", text: `Arquivo: ${file.name}\n\n${text}` }];
  }
  try {
    const text = await fileToText(file);
    return [{ type: "text", text: `Arquivo: ${file.name}\n\n${text}` }];
  } catch {
    const b64 = await fileToBase64(file);
    return [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }];
  }
}

export async function lerCarteiraClaude(
  arquivos: File[],
  onProgress?: (msg: string) => void,
): Promise<AtivoExtraido[]> {
  if (arquivos.length === 0) throw new Error("Nenhum arquivo fornecido.");

  onProgress?.("Preparando arquivos...");

  const contentBlocks: ContentBlock[] = [];
  for (const file of arquivos) {
    onProgress?.(`Processando ${file.name}...`);
    const blocks = await buildContentBlock(file);
    contentBlocks.push(...blocks);
  }
  contentBlocks.push({ type: "text", text: "Extraia todos os ativos da carteira dos arquivos acima e retorne o JSON conforme instruído." });

  onProgress?.("Analisando com IA...");

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY não configurada.");

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
    throw new Error(`Erro na API Anthropic (${response.status}): ${err}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";

  onProgress?.("Interpretando resposta...");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido.");

  const parsed = JSON.parse(jsonMatch[0]) as ExtractedResponse;
  if (!Array.isArray(parsed.ativos)) throw new Error("Formato inesperado na resposta da IA.");

  const VALID_CARDS: SimplaCardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];

  return parsed.ativos.map((a) => ({
    nome: String(a.nome ?? ""),
    valorBRL: Number(a.valorBRL) || 0,
    cardInferido: VALID_CARDS.includes(a.cardInferido as SimplaCardId)
      ? (a.cardInferido as SimplaCardId)
      : undefined,
  }));
}
