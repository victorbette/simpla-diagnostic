import { useState } from "react";
import type { Lead } from "./types";

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

const INPUT: React.CSSProperties = {
  width: "100%", border: "1px solid #E5E7EB", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "#111827",
  boxSizing: "border-box", outline: "none", fontFamily: "inherit",
};

interface Props {
  leads: Lead[];
  onSelecionar: (lead: Lead) => void;
  onCadastrar: (lead: Lead) => void;
  onAtualizar: (lead: Lead) => void;
  onExcluir: (id: string) => void;
  onVoltar: () => void;
  onConverterCliente: (lead: Lead) => Promise<void>;
}

export function LeadsList({ leads, onSelecionar, onCadastrar, onAtualizar, onExcluir, onVoltar, onConverterCliente }: Props) {
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [convertendoId, setConvertendoId] = useState<string | null>(null);
  const [erroConversao, setErroConversao] = useState<string | null>(null);

  const realizados = leads.filter(l => !!l.relatorioSalvo).length;
  const convertidos = leads.filter(l => !!l.convertido).length;
  const pendentes = leads.filter(l => !l.relatorioSalvo).length;

  function abrirEdicao(lead: Lead) {
    setEditando(lead);
    setEditNome(lead.nome);
    setEditEmail(lead.email);
    setEditTelefone(lead.telefone);
  }

  function salvarEdicao() {
    if (!editando || !editNome.trim()) return;
    onAtualizar({ ...editando, nome: editNome.trim(), email: editEmail.trim(), telefone: editTelefone.trim() });
    setEditando(null);
  }

  function handleCadastrar() {
    if (!nome.trim()) return;
    const novoLead: Lead = {
      id: crypto.randomUUID(),
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      dataCriacao: new Date().toISOString(),
      dadosColeta: {},
      dadosLF: {},
    };
    onCadastrar(novoLead);
    setMostrarCadastro(false);
    setNome(""); setEmail(""); setTelefone("");
  }

  async function handleConverter(lead: Lead) {
    if (lead.convertido || convertendoId) return;
    setConvertendoId(lead.id);
    setErroConversao(null);
    try {
      await onConverterCliente(lead);
    } catch {
      setErroConversao("Erro ao converter lead. Tente novamente.");
    } finally {
      setConvertendoId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8F9FA" }}>

      {/* Header */}
      <header style={{ backgroundColor: "#1E3A8A", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={onVoltar}
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
        >
          ← Voltar
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: 16, flex: 1 }}>
          Diagnóstico Financeiro
        </span>
        <button
          onClick={() => setMostrarCadastro(true)}
          style={{ background: "white", border: "none", color: "#1E3A8A", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} />
          Novo Lead
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#1E3A8A", lineHeight: 1 }}>{realizados}</span>
            <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Diagnósticos Realizados</span>
          </div>
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#059669", lineHeight: 1 }}>{convertidos}</span>
            <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Leads Convertidos</span>
          </div>
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#D97706", lineHeight: 1 }}>{pendentes}</span>
            <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Diagnósticos Pendentes</span>
          </div>
        </div>

        {erroConversao && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#B91C1C" }}>
            {erroConversao}
          </div>
        )}

        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2.4fr", padding: "10px 20px", background: "#F8FAFF", borderBottom: "0.5px solid #E5E7EB", fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            <span>Lead</span><span>Contato</span><span>Cadastro</span><span>Ações</span>
          </div>

          {leads.length === 0 && (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "#9CA3AF" }}>
              <i className="ti ti-users" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
              <div style={{ fontSize: 14 }}>Nenhum lead cadastrado.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Clique em "+ Novo Lead" para começar.</div>
            </div>
          )}

          {[...leads].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((lead) => (
            <div
              key={lead.id}
              style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2.4fr", padding: "14px 20px", borderBottom: "0.5px solid #F3F4F6", alignItems: "center", gap: 8, background: "white" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: lead.convertido ? "#059669" : "#1E3A8A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(lead.nome)}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{lead.nome}</span>
                  {lead.convertido && (
                    <span style={{ display: "block", fontSize: 10, color: "#059669", fontWeight: 600 }}>Convertido</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#374151" }}>{lead.email || "—"}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{lead.telefone || "—"}</div>
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{formatDate(lead.dataCriacao)}</div>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "nowrap" as const }}>
                {lead.convertido ? (
                  <span style={{ fontSize: 11, color: "#059669", background: "#ECFDF5", border: "0.5px solid #A7F3D0", borderRadius: 6, padding: "4px 10px", fontWeight: 600, whiteSpace: "nowrap" as const }}>
                    ✓ Cliente
                  </span>
                ) : (
                  <button
                    onClick={() => void handleConverter(lead)}
                    disabled={!!convertendoId}
                    title="Converter em cliente do Financial Planning"
                    style={{ fontSize: 12, color: convertendoId === lead.id ? "#6B7280" : "#059669", background: convertendoId === lead.id ? "#F9FAFB" : "#ECFDF5", border: `0.5px solid ${convertendoId === lead.id ? "#E5E7EB" : "#A7F3D0"}`, borderRadius: 6, padding: "5px 10px", cursor: convertendoId ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, opacity: convertendoId && convertendoId !== lead.id ? 0.5 : 1 }}
                  >
                    {convertendoId === lead.id ? "Convertendo..." : "Cliente"}
                  </button>
                )}
                <button
                  onClick={() => onSelecionar(lead)}
                  style={{ fontSize: 12, color: "#2563EB", background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap" as const }}
                >
                  Diagnóstico →
                </button>
                <button
                  onClick={() => abrirEdicao(lead)}
                  style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, cursor: "pointer", color: "#6B7280", padding: "4px 6px" }}
                  title="Editar lead"
                >
                  <i className="ti ti-pencil" style={{ fontSize: 15 }} />
                </button>
                <button
                  onClick={() => setDeleteTarget(lead.id)}
                  style={{ background: "none", border: "1px solid #FCA5A5", borderRadius: 6, cursor: "pointer", color: "#B91C1C", padding: "4px 6px" }}
                  title="Excluir lead"
                >
                  <i className="ti ti-trash" style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal — Novo Lead */}
      {mostrarCadastro && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 12, padding: 32, width: 440, maxWidth: "90vw" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#111827" }}>Novo Lead</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Nome completo *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do lead" style={INPUT} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" style={INPUT} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Telefone</label>
                <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(99) 99999-9999" style={INPUT} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setMostrarCadastro(false)} style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button
                onClick={handleCadastrar}
                disabled={!nome.trim()}
                style={{ background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: nome.trim() ? "pointer" : "not-allowed", opacity: nome.trim() ? 1 : 0.6, fontFamily: "inherit" }}
              >
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Editar */}
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 12, padding: 32, width: 440, maxWidth: "90vw" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#111827" }}>Editar Lead</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Nome completo *</label>
                <input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome do lead" style={INPUT} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@exemplo.com" style={INPUT} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Telefone</label>
                <input type="tel" value={editTelefone} onChange={e => setEditTelefone(e.target.value)} placeholder="(99) 99999-9999" style={INPUT} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button onClick={() => setEditando(null)} style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button
                onClick={salvarEdicao}
                disabled={!editNome.trim()}
                style={{ background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: editNome.trim() ? "pointer" : "not-allowed", opacity: editNome.trim() ? 1 : 0.6, fontFamily: "inherit" }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Excluir */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 12, padding: 28, width: 380, maxWidth: "90vw" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#111827" }}>Excluir lead?</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Todos os dados serão removidos permanentemente.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button
                onClick={() => { onExcluir(deleteTarget); setDeleteTarget(null); }}
                style={{ background: "#B91C1C", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
