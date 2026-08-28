import { useState, useMemo, useEffect } from "react";
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

type FiltroLead = "todos" | "realizados" | "convertidos" | "pendentes";
type OrdemLead = "nome" | "recente";

interface Props {
  leads: Lead[];
  onSelecionar: (lead: Lead) => void;
  onCadastrar: (lead: Lead) => void;
  onAtualizar: (lead: Lead) => void;
  onExcluir: (id: string) => void;
  onVoltar: () => void;
  onConverterCliente: (lead: Lead) => Promise<void>;
}

function getStatusBadge(lead: Lead): { label: string; color: string; bg: string } {
  if (lead.convertido) return { label: "Convertido", color: "#7C3AED", bg: "#F5F3FF" };
  if (lead.relatorioSalvo) return { label: "Realizado", color: "#15803D", bg: "#DCFCE7" };
  return { label: "Pendente", color: "#9CA3AF", bg: "#F3F4F6" };
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
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroLead>("todos");
  const [ordem, setOrdem] = useState<OrdemLead>("nome");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const totalLeads = leads.length;
  const qtdRealizados = leads.filter(l => !!l.relatorioSalvo).length;
  const qtdConvertidos = leads.filter(l => !!l.convertido).length;
  const qtdPendentes = leads.filter(l => !l.relatorioSalvo).length;

  const leadsExibidos = useMemo(() => {
    let lista = [...leads];
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(l => l.nome.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
    }
    if (filtro === "realizados") lista = lista.filter(l => !!l.relatorioSalvo);
    else if (filtro === "convertidos") lista = lista.filter(l => !!l.convertido);
    else if (filtro === "pendentes") lista = lista.filter(l => !l.relatorioSalvo);
    if (ordem === "nome") lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    else lista.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
    return lista;
  }, [leads, busca, filtro, ordem]);

  useEffect(() => {
    const fechar = () => { setMenuAberto(null); setMenuPos(null); };
    if (menuAberto) {
      document.addEventListener("click", fechar);
      return () => document.removeEventListener("click", fechar);
    }
  }, [menuAberto]);

  function abrirEdicao(lead: Lead) {
    setEditando(lead);
    setEditNome(lead.nome);
    setEditEmail(lead.email);
    setEditTelefone(lead.telefone);
    setMenuAberto(null);
    setMenuPos(null);
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

  function abrirMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.right - 144, window.innerWidth - 160);
    const y = rect.bottom + 4;
    setMenuPos({ x, y });
    setMenuAberto(menuAberto === id ? null : id);
  }

  const COLS = "2.5fr 1fr 1fr 180px 40px";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8F9FA" }}>

      {/* Minimal nav header */}
      <header style={{ backgroundColor: "#1E3A8A", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={onVoltar}
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "5px 13px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
        >
          ← Voltar
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/diamond-icon-small.png" alt="Simpla" style={{ height: 28, width: 28, objectFit: "contain", borderRadius: 3 }} />
          <span style={{ color: "white", fontWeight: 700, fontSize: 14, fontFamily: "Poppins, sans-serif" }}>Simpla Invest</span>
          <span style={{ color: "#93C5FD", fontSize: 11, fontFamily: "Poppins, sans-serif" }}>Financial Planning</span>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>

        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <p style={{ color: "#3B82F6", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 4px" }}>
              DASHBOARD
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, color: "#000000", margin: 0, lineHeight: 1.1 }}>
                Diagnóstico Financeiro
              </h1>
              <span style={{ color: "#6B7280", fontSize: 18 }}>
                ({totalLeads} {totalLeads === 1 ? "lead" : "leads"})
              </span>
            </div>
          </div>

          <button
            onClick={() => setMostrarCadastro(true)}
            style={{ backgroundColor: "#000000", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}
          >
            <i className="ti ti-user-plus" style={{ fontSize: 16 }} />
            Novo Lead
          </button>
        </div>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total de Leads",           value: totalLeads,    color: "#1E3A8A", bg: "white",   border: "#BFDBFE", icon: "ti-users" },
            { label: "Diagnósticos Realizados",  value: qtdRealizados, color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", icon: "ti-circle-check" },
            { label: "Leads Convertidos",        value: qtdConvertidos,color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "ti-user-check" },
            { label: "Diagnósticos Pendentes",   value: qtdPendentes,  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "ti-clock" },
          ].map(({ label, value, color, bg, border, icon }) => (
            <div key={label} style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 18, color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {erroConversao && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#B91C1C" }}>
            {erroConversao}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" as const }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 15, pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, border: "1px solid #BFDBFE", borderRadius: 8, background: "white", outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", color: "#111827" }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {([
              ["todos",      "Todos"],
              ["realizados", "Realizados"],
              ["convertidos","Convertidos"],
              ["pendentes",  "Pendentes"],
            ] as [FiltroLead, string][]).map(([key, label]) => {
              const ativo = filtro === key;
              return (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 99, border: ativo ? "1.5px solid #2563EB" : "0.5px solid #E5E7EB", background: ativo ? "#EFF6FF" : "white", color: ativo ? "#2563EB" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {([
              ["nome",    "Nome A-Z",     "ti-sort-a-z"],
              ["recente", "Mais recente", "ti-clock"],
            ] as [OrdemLead, string, string][]).map(([key, label, icon]) => {
              const ativo = ordem === key;
              return (
                <button
                  key={key}
                  onClick={() => setOrdem(key)}
                  style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, border: ativo ? "1.5px solid #2563EB" : "0.5px solid #E5E7EB", background: ativo ? "#1E3A8A" : "white", color: ativo ? "white" : "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
                >
                  <i className={`ti ${icon}`} style={{ fontSize: 12 }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "10px 20px", background: "#F8FAFF", borderBottom: "0.5px solid #E5E7EB", fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
            <span>Lead</span>
            <span>Status</span>
            <span>Cadastro</span>
            <span>Ações</span>
            <span />
          </div>

          {/* Search empty state */}
          {leadsExibidos.length === 0 && leads.length > 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF" }}>
              <i className="ti ti-search" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Nenhum resultado encontrado</p>
              <button onClick={() => { setBusca(""); setFiltro("todos"); }} style={{ marginTop: 8, fontSize: 12, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Limpar filtros
              </button>
            </div>
          )}

          {/* Rows */}
          {leadsExibidos.map((lead) => {
            const status = getStatusBadge(lead);
            return (
              <div
                key={lead.id}
                style={{ display: "grid", gridTemplateColumns: COLS, padding: "14px 20px", borderBottom: "0.5px solid #F3F4F6", alignItems: "center", gap: 8, background: "white" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                {/* Lead */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: lead.convertido ? "#7C3AED" : "#1E3A8A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(lead.nome)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{lead.nome}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{lead.email || "—"}</div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: status.color, background: status.bg, padding: "3px 10px", borderRadius: 99 }}>
                    {status.label}
                  </span>
                </div>

                {/* Cadastro */}
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  {formatDate(lead.dataCriacao)}
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => onSelecionar(lead)}
                    style={{ fontSize: 11, color: "#2563EB", background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit" }}
                  >
                    Diagnóstico →
                  </button>

                  {lead.convertido ? (
                    <span style={{ fontSize: 11, color: "#7C3AED", background: "#F5F3FF", border: "0.5px solid #DDD6FE", borderRadius: 6, padding: "4px 10px", fontWeight: 600, whiteSpace: "nowrap" as const }}>
                      ✓ Cliente
                    </span>
                  ) : (
                    <button
                      onClick={() => void handleConverter(lead)}
                      disabled={!!convertendoId}
                      style={{ fontSize: 11, color: convertendoId === lead.id ? "#6B7280" : "#15803D", background: convertendoId === lead.id ? "#F9FAFB" : "#ECFDF5", border: `0.5px solid ${convertendoId === lead.id ? "#E5E7EB" : "#A7F3D0"}`, borderRadius: 6, padding: "5px 12px", cursor: convertendoId ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const, opacity: convertendoId && convertendoId !== lead.id ? 0.5 : 1, fontFamily: "inherit" }}
                    >
                      {convertendoId === lead.id ? "Convertendo..." : "Cliente"}
                    </button>
                  )}
                </div>

                {/* Menu ⋮ */}
                <div>
                  <button
                    onClick={(e) => abrirMenu(e, lead.id)}
                    style={{ background: "none", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F3F4F6")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state — no leads at all */}
          {leads.length === 0 && (
            <div style={{ padding: "56px 20px", textAlign: "center", color: "#9CA3AF" }}>
              <i className="ti ti-users" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
              <div style={{ fontSize: 14 }}>Nenhum lead cadastrado.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Clique em "Novo Lead" para começar.</div>
            </div>
          )}
        </div>
      </main>

      {/* ⋮ Dropdown menu */}
      {menuAberto && menuPos && (() => {
        const leadMenu = leads.find(l => l.id === menuAberto);
        if (!leadMenu) return null;
        return (
          <div
            style={{ position: "fixed", top: menuPos.y, left: menuPos.x, zIndex: 9999, background: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 144, overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => abrirEdicao(leadMenu)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFF")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <i className="ti ti-pencil" style={{ fontSize: 14, color: "#6B7280" }} />
              Editar lead
            </button>
            <div style={{ height: "0.5px", background: "#F3F4F6" }} />
            <button
              onClick={() => { setDeleteTarget(leadMenu.id); setMenuAberto(null); setMenuPos(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", fontSize: 13, color: "#B91C1C", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FFF5F5")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <i className="ti ti-trash" style={{ fontSize: 14, color: "#B91C1C" }} />
              Remover lead
            </button>
          </div>
        );
      })()}

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
                style={{ background: "#000000", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: nome.trim() ? "pointer" : "not-allowed", opacity: nome.trim() ? 1 : 0.6, fontFamily: "inherit" }}
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
                style={{ background: "#000000", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: editNome.trim() ? "pointer" : "not-allowed", opacity: editNome.trim() ? 1 : 0.6, fontFamily: "inherit" }}
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
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#111827" }}>Remover lead?</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Todos os dados serão removidos permanentemente.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button
                onClick={() => { onExcluir(deleteTarget); setDeleteTarget(null); }}
                style={{ background: "#B91C1C", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
