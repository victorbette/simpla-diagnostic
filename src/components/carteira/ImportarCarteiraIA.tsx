import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Sparkles, Loader2, AlertTriangle, Trash2, Plus, ImageIcon } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import {
  extrairCarteira, prepararImagem, totaisPorClasse, aplicarNaCarteira, itensAplicaveis, reclassificar,
  CLASSES_REVISAO, CLASSE_NAO_IDENTIFICADA, MAX_IMAGENS,
  type ClasseExtraida, type ItemRevisao,
} from "@/lib/importarCarteira";
import type { Ativo } from "@/lib/carteira/types";

interface Props {
  aberto: boolean;
  ativosAtuais: Ativo[];
  onFechar: () => void;
  onAplicar: (ativos: Ativo[], qtdItens: number) => void;
}

interface Anexo {
  file: File;
  previewUrl: string;
}

let seqId = 0;
const novoId = () => `linha-${++seqId}`;

type Etapa = "upload" | "processando" | "revisao";

/**
 * Modal de importação da carteira atual a partir de prints (Etapa 1 de Gestão
 * de Carteira). A IA (Edge Function extract-portfolio) lê as imagens e propõe
 * uma linha por ativo; o consultor revisa valor e classe antes de qualquer
 * coisa virar ativo nos cards.
 */
export function ImportarCarteiraIA({ aberto, ativosAtuais, onFechar, onAplicar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [itens, setItens] = useState<ItemRevisao[]>([]);
  const [observacoes, setObservacoes] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [substituir, setSubstituir] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const limpar = useCallback(() => {
    setAnexos((atuais) => {
      atuais.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
    setItens([]);
    setObservacoes([]);
    setErro(null);
    setSubstituir(false);
    setEtapa("upload");
  }, []);

  // Reset ao abrir: cada importação começa do zero
  useEffect(() => { if (aberto) limpar(); }, [aberto, limpar]);

  // Libera os object URLs pendentes só na desmontagem (o ref evita revogar
  // previews ainda em uso a cada mudança da lista)
  const anexosRef = useRef<Anexo[]>([]);
  useEffect(() => { anexosRef.current = anexos; }, [anexos]);
  useEffect(() => () => { anexosRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl)); }, []);

  const adicionarArquivos = useCallback((lista: FileList | File[] | null) => {
    if (!lista) return;
    const imagens = Array.from(lista).filter((f) => f.type.startsWith("image/"));
    if (imagens.length === 0) {
      setErro("Envie arquivos de imagem (print da tela, foto ou PNG/JPEG).");
      return;
    }
    setErro(null);
    setAnexos((atuais) => {
      const espaco = MAX_IMAGENS - atuais.length;
      if (espaco <= 0) {
        setErro(`Máximo de ${MAX_IMAGENS} imagens por importação.`);
        return atuais;
      }
      if (imagens.length > espaco) {
        setErro(`Só cabem mais ${espaco} imagem(ns) — o excedente foi ignorado.`);
      }
      const novos = imagens.slice(0, espaco).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...atuais, ...novos];
    });
  }, []);

  // Ctrl+V com print na área de transferência é o caminho mais rápido
  useEffect(() => {
    if (!aberto || etapa !== "upload") return;
    function handlePaste(e: ClipboardEvent) {
      const arquivos = Array.from(e.clipboardData?.files ?? []);
      if (arquivos.length) {
        e.preventDefault();
        adicionarArquivos(arquivos);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [aberto, etapa, adicionarArquivos]);

  // Esc fecha (menos durante o processamento, para não perder a chamada em curso)
  useEffect(() => {
    if (!aberto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && etapa !== "processando") onFechar();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [aberto, etapa, onFechar]);

  function removerAnexo(idx: number) {
    setAnexos((atuais) => {
      URL.revokeObjectURL(atuais[idx].previewUrl);
      return atuais.filter((_, i) => i !== idx);
    });
  }

  async function processar() {
    if (anexos.length === 0) return;
    setEtapa("processando");
    setErro(null);
    try {
      const imagens = await Promise.all(anexos.map((a) => prepararImagem(a.file)));
      const resultado = await extrairCarteira(imagens);

      const linhas: ItemRevisao[] = resultado.itens.map((it) => ({
        ...it, id: novoId(), incluir: true,
      }));
      const avisos = [...resultado.observacoes];
      resultado.erros.forEach((e) => avisos.push(`Imagem ${e.imagem + 1} falhou: ${e.erro}`));
      if (resultado.moedas.some((m) => m !== "BRL")) {
        avisos.push("Valores em moeda estrangeira detectados — confira se precisam ser convertidos para reais.");
      }
      setObservacoes(avisos);

      if (linhas.length === 0) {
        setErro("A IA não encontrou posições nas imagens. Tente um print mais nítido, com a coluna de valor visível.");
        setEtapa("upload");
        return;
      }
      setItens(linhas);
      setEtapa("revisao");
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEtapa("upload");
    }
  }

  function atualizarItem(id: string, campos: Partial<ItemRevisao>) {
    setItens((atuais) => atuais.map((it) => (it.id === id ? { ...it, ...campos } : it)));
  }

  function mudarClasse(id: string, classe: ClasseExtraida) {
    setItens((atuais) => atuais.map((it) => (it.id === id ? reclassificar(it, classe) : it)));
  }

  function removerItem(id: string) {
    setItens((atuais) => atuais.filter((it) => it.id !== id));
  }

  function adicionarLinha() {
    setItens((atuais) => [...atuais, {
      id: novoId(), ativo: "", descricao: "", segmento: "", vencimento: "", valor: 0,
      classe: "resgate_rapido", confianca: "alta", imagem: -1, incluir: true,
    }]);
  }

  function aplicar() {
    const incluidos = itensAplicaveis(itens);
    onAplicar(aplicarNaCarteira(ativosAtuais, itens, substituir), incluidos.length);
    onFechar();
  }

  if (!aberto) return null;

  const totais = totaisPorClasse(itens);
  const totalImportado = CLASSES_REVISAO
    .filter((c) => c.key !== CLASSE_NAO_IDENTIFICADA)
    .reduce((acc, c) => acc + (totais[c.key] ?? 0), 0);
  const totalNaoIdentificado = totais[CLASSE_NAO_IDENTIFICADA] ?? 0;
  const qtdIncluidos = itensAplicaveis(itens).length;

  return (
    <div
      onClick={etapa === "processando" ? undefined : onFechar}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(12, 29, 66, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importar carteira de print"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 14,
          width: etapa === "revisao" ? 880 : 560,
          maxWidth: "100%", maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(12, 29, 66, 0.35)",
          fontFamily: "inherit",
        }}
      >
        {/* Cabeçalho */}
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #F0F7FF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={18} color="#2563EB" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0C1D42" }}>
              Importar carteira de print
            </h2>
            <button
              onClick={onFechar}
              disabled={etapa === "processando"}
              aria-label="Fechar"
              style={{
                marginLeft: "auto", background: "none", border: "none",
                cursor: etapa === "processando" ? "not-allowed" : "pointer",
                color: "#9CA3AF", padding: 4, lineHeight: 0,
              }}
            >
              <X size={18} />
            </button>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#6B7280", lineHeight: 1.6 }}>
            {etapa === "revisao"
              ? "Confira ativo, valor e classe antes de aplicar. Nada é preenchido sem a sua validação."
              : "Anexe prints da carteira (home broker, app do banco, extrato). A IA lê cada ativo e o patrimônio atual."}
          </p>
        </div>

        {/* Corpo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
          {erro && (
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
              padding: "10px 12px", marginBottom: 14, fontSize: 12.5, color: "#B91C1C",
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{erro}</span>
            </div>
          )}

          {etapa === "upload" && (
            <>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); adicionarArquivos(e.dataTransfer.files); }}
                style={{
                  border: "2px dashed #BFDBFE", borderRadius: 12, background: "#F8FBFF",
                  padding: "28px 20px", textAlign: "center", cursor: "pointer",
                }}
              >
                <Upload size={22} color="#2563EB" style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#1E40AF" }}>
                  Clique, arraste ou cole (Ctrl+V) os prints
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#9CA3AF" }}>
                  PNG, JPEG ou WEBP — até {MAX_IMAGENS} imagens
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ""; }}
                  style={{ display: "none" }}
                />
              </div>

              {anexos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                  {anexos.map((a, i) => (
                    <div key={a.previewUrl} style={{ position: "relative" }}>
                      <img
                        src={a.previewUrl}
                        alt={a.file.name}
                        style={{
                          width: 108, height: 76, objectFit: "cover",
                          borderRadius: 8, border: "1px solid #E5E7EB", display: "block",
                        }}
                      />
                      <button
                        onClick={() => removerAnexo(i)}
                        aria-label={`Remover ${a.file.name}`}
                        style={{
                          position: "absolute", top: -6, right: -6,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#111827", color: "white", border: "none",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {etapa === "processando" && (
            <div style={{ padding: "44px 0", textAlign: "center" }}>
              <Loader2 size={26} color="#2563EB" style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ margin: "12px 0 0", fontSize: 13.5, fontWeight: 600, color: "#1E40AF" }}>
                Lendo {anexos.length} imagem{anexos.length > 1 ? "ns" : ""}…
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9CA3AF" }}>
                Costuma levar de 10 a 30 segundos.
              </p>
              <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
            </div>
          )}

          {etapa === "revisao" && (
            <>
              {observacoes.length > 0 && (
                <div style={{
                  background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8,
                  padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#92400E",
                }}>
                  {observacoes.map((o, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: i ? 6 : 0 }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{o}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela de revisão */}
              <div style={{ border: "1px solid #F0F7FF", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "28px 1.6fr 1.3fr 1fr 32px",
                  gap: 8, backgroundColor: "#F0F7FF", borderBottom: "1px solid #E5E7EB",
                  padding: "9px 12px", alignItems: "center",
                }}>
                  <span />
                  {["Ativo", "Classe", "Valor (R$)"].map((h) => (
                    <p key={h} style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", margin: 0 }}>
                      {h}
                    </p>
                  ))}
                  <span />
                </div>

                {itens.map((it) => {
                  const suspeito = it.classe === CLASSE_NAO_IDENTIFICADA || it.confianca === "baixa" || it.valor === 0;
                  // Segmento e vencimento acompanham o ativo até os cards da Etapa 1;
                  // aqui só aparecem como referência para o consultor conferir.
                  const detalhes = [
                    it.descricao,
                    it.segmento,
                    it.vencimento && `vence ${it.vencimento}`,
                    it.confianca === "baixa" && "leitura incerta",
                  ].filter(Boolean).join(" · ");
                  return (
                    <div
                      key={it.id}
                      style={{
                        display: "grid", gridTemplateColumns: "28px 1.6fr 1.3fr 1fr 32px",
                        gap: 8, borderBottom: "1px solid #F0F7FF", padding: "8px 12px",
                        alignItems: "center",
                        background: !it.incluir ? "#FAFAFA" : suspeito ? "#FFFBEB" : "white",
                        opacity: it.incluir ? 1 : 0.55,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={it.incluir}
                        onChange={(e) => atualizarItem(it.id, { incluir: e.target.checked })}
                        aria-label={`Incluir ${it.ativo || "linha"}`}
                        style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer" }}
                      />

                      <div style={{ minWidth: 0 }}>
                        <input
                          value={it.ativo}
                          onChange={(e) => atualizarItem(it.id, { ativo: e.target.value })}
                          placeholder="Ativo"
                          style={{
                            width: "100%", border: "none", background: "transparent",
                            fontSize: 13, fontWeight: 600, color: "#111827",
                            padding: 0, fontFamily: "inherit", outline: "none",
                          }}
                        />
                        <p style={{
                          margin: 0, fontSize: 10.5, color: "#9CA3AF",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {detalhes || (it.imagem >= 0 ? `Imagem ${it.imagem + 1}` : "Adicionado manualmente")}
                        </p>
                      </div>

                      <select
                        value={it.classe}
                        onChange={(e) => mudarClasse(it.id, e.target.value as ClasseExtraida)}
                        aria-label="Classe de ativo"
                        style={{
                          width: "100%", fontSize: 12.5, padding: "6px 8px",
                          borderRadius: 7, border: "1px solid #E5E7EB",
                          background: "white", color: it.classe === CLASSE_NAO_IDENTIFICADA ? "#B45309" : "#111827",
                          fontFamily: "inherit", cursor: "pointer",
                        }}
                      >
                        {CLASSES_REVISAO.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>

                      <CurrencyInput
                        value={it.valor}
                        onChange={(v) => atualizarItem(it.id, { valor: v })}
                        className="h-8 text-xs"
                      />

                      <button
                        onClick={() => removerItem(it.id)}
                        aria-label={`Excluir ${it.ativo || "linha"}`}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#D1D5DB", padding: 4, lineHeight: 0,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={adicionarLinha}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%",
                    background: "white", border: "none", borderBottom: "1px solid #F0F7FF",
                    padding: "9px 12px", cursor: "pointer", fontSize: 12,
                    color: "#2563EB", fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  <Plus size={14} /> Adicionar linha manualmente
                </button>
              </div>

              {/* Resumo por classe */}
              <p style={{
                fontSize: 10.5, fontWeight: 700, color: "#9CA3AF",
                textTransform: "uppercase", letterSpacing: "0.05em", margin: "18px 0 8px",
              }}>
                Resumo por classe
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {CLASSES_REVISAO.filter((c) => (totais[c.key] ?? 0) > 0).map((c) => {
                  const naoId = c.key === CLASSE_NAO_IDENTIFICADA;
                  return (
                    <div
                      key={c.key}
                      style={{
                        border: `1px solid ${naoId ? "#FDE68A" : "#F0F7FF"}`,
                        background: naoId ? "#FFFBEB" : "#F8FBFF",
                        borderRadius: 8, padding: "8px 10px",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 11, color: naoId ? "#92400E" : "#6B7280" }}>{c.label}</p>
                      <p style={{
                        margin: "2px 0 0", fontSize: 13.5, fontWeight: 700,
                        color: naoId ? "#B45309" : "#0C1D42", fontVariantNumeric: "tabular-nums",
                      }}>
                        {formatCurrency(totais[c.key] ?? 0)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {totalNaoIdentificado > 0 && (
                <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#B45309" }}>
                  {formatCurrency(totalNaoIdentificado)} em "Não identificado" não serão aplicados — escolha a
                  classe correta ou desmarque essas linhas.
                </p>
              )}

              {ativosAtuais.length > 0 && (
                <label style={{
                  display: "flex", alignItems: "center", gap: 8, marginTop: 16,
                  fontSize: 12.5, color: "#374151", cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={substituir}
                    onChange={(e) => setSubstituir(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: "#2563EB", cursor: "pointer" }}
                  />
                  {ativosAtuais.length === 1
                    ? "Substituir o ativo já lançado"
                    : `Substituir os ${ativosAtuais.length} ativos já lançados`}
                  {" "}(por padrão os importados são adicionados)
                </label>
              )}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div style={{
          borderTop: "1px solid #F0F7FF", padding: "14px 24px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {etapa === "revisao" ? (
            <p style={{ margin: 0, fontSize: 12.5, color: "#6B7280" }}>
              <strong style={{ color: "#0C1D42" }}>{formatCurrency(totalImportado)}</strong>
              {" "}em {qtdIncluidos} ativo{qtdIncluidos === 1 ? "" : "s"}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 6 }}>
              <ImageIcon size={13} />
              {anexos.length}/{MAX_IMAGENS} imagens
            </p>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={onFechar}
              disabled={etapa === "processando"}
              style={{
                background: "white", border: "1px solid #E5E7EB", borderRadius: 8,
                padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#374151",
                cursor: etapa === "processando" ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
            {etapa === "revisao" ? (
              <button
                onClick={aplicar}
                disabled={qtdIncluidos === 0}
                style={{
                  background: qtdIncluidos === 0 ? "#93C5FD" : "#2563EB",
                  color: "white", border: "none", borderRadius: 8,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600,
                  cursor: qtdIncluidos === 0 ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                Aplicar na carteira
              </button>
            ) : (
              <button
                onClick={processar}
                disabled={anexos.length === 0 || etapa === "processando"}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: anexos.length === 0 || etapa === "processando" ? "#93C5FD" : "#2563EB",
                  color: "white", border: "none", borderRadius: 8,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600,
                  cursor: anexos.length === 0 || etapa === "processando" ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Sparkles size={14} />
                {etapa === "processando" ? "Lendo…" : "Extrair com IA"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
