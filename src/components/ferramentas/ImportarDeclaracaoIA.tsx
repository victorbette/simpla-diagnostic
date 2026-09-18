import { useRef, useState } from "react";
import {
  extrairDadosFiscais,
  prepararArquivo,
  prepararTexto,
  ehPdf,
  ehImagem,
  MAX_FONTES_FISCAL,
  type FontePreparada,
  type DadosFiscaisExtraidos,
  type CampoExtraido,
} from "@/lib/importarDeclaracao";

export interface ValoresFiscaisImportados {
  rendaAnualBruta?: number;
  inssPago?: number;
  irRetidoFonte?: number;
  dependentes?: number;
  despesasMedicas?: number;
  despesasInstrucao?: number;
  pensaoAlimenticia?: number;
}

interface Props {
  onAplicar: (valores: ValoresFiscaisImportados) => void;
  onFechar: () => void;
}

type Etapa = "upload" | "processando" | "revisao";

interface CampoRevisao {
  key: keyof DadosFiscaisExtraidos;
  label: string;
  isInt?: boolean;
  prefixo?: string;
}

const CAMPOS: CampoRevisao[] = [
  { key: "rendaAnualBruta",   label: "Renda Anual Bruta",          prefixo: "R$" },
  { key: "inssPago",          label: "INSS Pago no Ano",            prefixo: "R$" },
  { key: "irRetidoFonte",     label: "IR Retido na Fonte",          prefixo: "R$" },
  { key: "dependentes",       label: "Número de Dependentes",       isInt: true },
  { key: "despesasMedicas",   label: "Despesas Médicas",            prefixo: "R$" },
  { key: "despesasInstrucao", label: "Despesas de Instrução",       prefixo: "R$" },
  { key: "pensaoAlimenticia", label: "Pensão Alimentícia",          prefixo: "R$" },
];

function formatarBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(s: string): number {
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : Math.max(0, n);
}

function badgeConfianca(c: CampoExtraido["confianca"], encontrado: boolean) {
  if (!encontrado) return <span style={{ fontSize: 11, color: "#6B7280" }}>não encontrado</span>;
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    alta:  { bg: "#DCFCE7", color: "#15803D", label: "alta" },
    media: { bg: "#FEF9C3", color: "#92400E", label: "média" },
    baixa: { bg: "#FEE2E2", color: "#B91C1C", label: "baixa" },
  };
  const s = colors[c] ?? colors.baixa;
  return (
    <span style={{
      fontSize: 11, padding: "1px 8px", borderRadius: 999,
      backgroundColor: s.bg, color: s.color, fontWeight: 600,
    }}>
      {s.label}
    </span>
  );
}

export function ImportarDeclaracaoIA({ onAplicar, onFechar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [fontes, setFontes] = useState<FontePreparada[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState<DadosFiscaisExtraidos | null>(null);
  const [incluir, setIncluir] = useState<Record<keyof DadosFiscaisExtraidos, boolean>>({
    rendaAnualBruta: true, inssPago: true, irRetidoFonte: true, dependentes: true,
    despesasMedicas: true, despesasInstrucao: true, pensaoAlimenticia: true, observacoes: false,
  });
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  async function adicionarArquivos(files: File[]) {
    setErro("");
    const novos: FontePreparada[] = [];
    for (const f of files) {
      if (!ehPdf(f) && !ehImagem(f)) {
        setErro(`"${f.name}" não é suportado. Use PDF, PNG ou JPEG.`);
        return;
      }
      if (fontes.length + novos.length >= MAX_FONTES_FISCAL) {
        setErro(`Máximo de ${MAX_FONTES_FISCAL} arquivos.`);
        break;
      }
      try {
        novos.push(await prepararArquivo(f));
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
        return;
      }
    }
    setFontes((prev) => [...prev, ...novos]);
  }

  async function processar() {
    setErro("");
    const todasFontes: FontePreparada[] = [...fontes];
    if (texto.trim()) {
      try {
        todasFontes.push(prepararTexto(texto.trim(), "Texto colado"));
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
        return;
      }
    }
    if (todasFontes.length === 0) {
      setErro("Envie ao menos um arquivo ou cole o texto do documento.");
      return;
    }

    setEtapa("processando");
    try {
      const resultado = await extrairDadosFiscais(todasFontes);
      const d = resultado.dados;
      setDados(d);
      // Pré-preencher valores editados
      const vals: Record<string, string> = {};
      for (const campo of CAMPOS) {
        const c = d[campo.key] as CampoExtraido;
        if (c.encontrado) {
          vals[campo.key] = campo.isInt
            ? String(Math.round(c.valor))
            : formatarBRL(c.valor);
        }
      }
      setValoresEditados(vals);
      // Desmarcar campos não encontrados
      const inc = { ...incluir };
      for (const campo of CAMPOS) {
        const c = d[campo.key] as CampoExtraido;
        inc[campo.key] = c.encontrado;
      }
      setIncluir(inc);
      setEtapa("revisao");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEtapa("upload");
    }
  }

  function aplicar() {
    if (!dados) return;
    const valores: ValoresFiscaisImportados = {};
    for (const campo of CAMPOS) {
      if (!incluir[campo.key]) continue;
      const raw = valoresEditados[campo.key] ?? "";
      const num = campo.isInt
        ? Math.round(Math.max(0, parseFloat(raw) || 0))
        : parseBRL(raw);
      (valores as Record<string, number>)[campo.key] = num;
    }
    onAplicar(valores);
    onFechar();
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 560,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 14px", borderBottom: "1px solid #F3F4F6",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111827" }}>
              Importar com IA
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              Informe de Rendimentos, DIRF, holerite ou qualquer documento fiscal
            </p>
          </div>
          <button
            onClick={onFechar}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9CA3AF", fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── UPLOAD ─────────────────────────────────────────────────────── */}
          {etapa === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={async (e) => {
                  e.preventDefault(); setArrastando(false);
                  await adicionarArquivos([...e.dataTransfer.files]);
                }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${arrastando ? "#2563EB" : "#D1D5DB"}`,
                  borderRadius: 10, padding: "28px 20px", textAlign: "center",
                  cursor: "pointer", transition: "border-color 0.15s",
                  backgroundColor: arrastando ? "#EFF6FF" : "#F9FAFB",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Arraste arquivos ou clique para selecionar
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>
                  PDF, PNG, JPEG — até {MAX_FONTES_FISCAL} arquivos
                </p>
              </div>
              <input
                ref={fileRef} type="file" multiple accept=".pdf,image/*" hidden
                onChange={async (e) => {
                  if (e.target.files) await adicionarArquivos([...e.target.files]);
                  e.target.value = "";
                }}
              />

              {fontes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {fontes.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", backgroundColor: "#F0FDF4", borderRadius: 8,
                      border: "1px solid #BBF7D0",
                    }}>
                      <span style={{ fontSize: 13, color: "#166534" }}>✓ {f.nome}</span>
                      <button
                        onClick={() => setFontes((prev) => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 16 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
                  OU COLE O TEXTO DO DOCUMENTO
                </p>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Cole aqui o conteúdo do Informe de Rendimentos, extrato ou qualquer documento fiscal..."
                  style={{
                    width: "100%", minHeight: 100, padding: "10px 12px", borderRadius: 8,
                    border: "1px solid #D1D5DB", fontSize: 13, resize: "vertical",
                    boxSizing: "border-box", fontFamily: "inherit", color: "#111827",
                    outline: "none",
                  }}
                />
              </div>

              {erro && (
                <div style={{ padding: "10px 14px", backgroundColor: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#DC2626" }}>{erro}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSANDO ─────────────────────────────────────────────────── */}
          {etapa === "processando" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "4px solid #E5E7EB", borderTopColor: "#2563EB",
                animation: "spin 0.8s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", fontWeight: 600 }}>
                Analisando documento...
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {/* ── REVISÃO ──────────────────────────────────────────────────────── */}
          {etapa === "revisao" && dados && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151" }}>
                Revise os dados extraídos. Desmarque campos que não deseja aplicar ou corrija os valores.
              </p>

              {CAMPOS.map((campo) => {
                const c = dados[campo.key] as CampoExtraido;
                const marcado = incluir[campo.key as keyof DadosFiscaisExtraidos];
                const valAtual = valoresEditados[campo.key] ?? "";

                return (
                  <div key={campo.key} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8,
                    backgroundColor: marcado ? "#F9FAFB" : "#F3F4F6",
                    border: `1px solid ${marcado ? "#E5E7EB" : "#F3F4F6"}`,
                    opacity: marcado ? 1 : 0.55,
                  }}>
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={(e) =>
                        setIncluir((prev) => ({ ...prev, [campo.key]: e.target.checked }))
                      }
                      style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
                          {campo.label}
                        </span>
                        {badgeConfianca(c.confianca, c.encontrado)}
                      </div>
                      {marcado && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {campo.prefixo && (
                            <span style={{ fontSize: 13, color: "#9CA3AF", flexShrink: 0 }}>
                              {campo.prefixo}
                            </span>
                          )}
                          <input
                            type="text"
                            inputMode={campo.isInt ? "numeric" : "decimal"}
                            value={valAtual}
                            placeholder={campo.isInt ? "0" : "0,00"}
                            onChange={(e) =>
                              setValoresEditados((prev) => ({ ...prev, [campo.key]: e.target.value }))
                            }
                            style={{
                              flex: 1, padding: "5px 8px", border: "1px solid #D1D5DB",
                              borderRadius: 6, fontSize: 13, outline: "none",
                              backgroundColor: "white",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {dados.observacoes && (
                <div style={{ marginTop: 8, padding: "10px 14px", backgroundColor: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#92400E" }}>
                    <strong>Observação da IA:</strong> {dados.observacoes}
                  </p>
                </div>
              )}

              {erro && (
                <div style={{ marginTop: 8, padding: "10px 14px", backgroundColor: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#DC2626" }}>{erro}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid #F3F4F6",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          {etapa === "upload" && (
            <>
              <button
                onClick={onFechar}
                style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB",
                  backgroundColor: "white", cursor: "pointer", fontSize: 13, color: "#374151",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={processar}
                disabled={fontes.length === 0 && !texto.trim()}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  backgroundColor: fontes.length > 0 || texto.trim() ? "#2563EB" : "#9CA3AF",
                  color: "white", cursor: fontes.length > 0 || texto.trim() ? "pointer" : "not-allowed",
                  fontSize: 13, fontWeight: 600,
                }}
              >
                Analisar
              </button>
            </>
          )}

          {etapa === "revisao" && (
            <>
              <button
                onClick={() => { setEtapa("upload"); setDados(null); setErro(""); }}
                style={{
                  padding: "9px 18px", borderRadius: 8, border: "1px solid #D1D5DB",
                  backgroundColor: "white", cursor: "pointer", fontSize: 13, color: "#374151",
                }}
              >
                Voltar
              </button>
              <button
                onClick={aplicar}
                disabled={!CAMPOS.some((c) => incluir[c.key as keyof DadosFiscaisExtraidos])}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  backgroundColor: "#2563EB", color: "white",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                Aplicar nos campos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
