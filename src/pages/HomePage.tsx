import { useState, useMemo, useEffect } from "react";
import {
  Search,
  LogOut,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FinancialPlanningPage } from "@/components/financialPlanning/FinancialPlanningPage";
import { AcompanhamentoPage } from "@/pages/AcompanhamentoPage";
import { useAuth } from "@/contexts/AuthContext";
import { useClientStore } from "@/hooks/useClientStore";
import type { Client } from "@/hooks/useClientStore";
import { toast } from "sonner";
import { OportunidadesPage } from "@/pages/OportunidadesPage";
import { ConfiguracoesPage } from "@/pages/ConfiguracoesPage";
import { detectarOportunidades } from "@/lib/detectarOportunidades";

// ─── Constants ────────────────────────────────────────────────────────────────

const DARK = "#000000";
const GOLD = "#3B82F6";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function profileConfig(perfil: string | null | undefined) {
  switch (perfil) {
    case "moderado":             return { bg: "#EFF6FF", color: "#2563EB", label: "MODERADO" };
    case "conservador":          return { bg: "#EAF0F5", color: "#1E40AF", label: "CONSERVADOR" };
    case "conservador_moderado": return { bg: "#EAF0F5", color: "#1E40AF", label: "CONS. MODERADO" };
    case "arrojado":             return { bg: "#FEE2E2", color: "#B91C1C", label: "ARROJADO" };
    default:                     return { bg: "#F3F4F6", color: "#6B7280", label: "SEM PERFIL" };
  }
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface ClientForm {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  nascimento: string;
  observacoes: string;
}

const EMPTY_FORM: ClientForm = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  nascimento: "",
  observacoes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user, signOut } = useAuth();
  const clientStore = useClientStore();

  const [clienteSelecionado, setClienteSelecionado] = useState<Client | null>(null);
  const [clienteAcompanhamento, setClienteAcompanhamento] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [mostrarOportunidades, setMostrarOportunidades] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // All hooks must be before conditional returns
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientStore.clients;
    return clientStore.clients.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clientStore.clients, search]);

  const rawPlans = useMemo((): Record<string, Record<string, unknown>> => {
    const result: Record<string, Record<string, unknown>> = {};
    for (const c of clientStore.clients) {
      if (!c.planId) continue;
      result[c.id] = {
        dados_cliente: c.planDadosCliente ?? {},
        sucessorio: c.planSucessorio ?? {},
        estrategia_inicial: c.planEstrategia ?? {},
      };
    }
    return result;
  }, [clientStore.clients]);

  useEffect(() => {
    const fechar = () => { setMenuAberto(null); setMenuPos(null); };
    if (menuAberto) {
      document.addEventListener("click", fechar);
      return () => document.removeEventListener("click", fechar);
    }
  }, [menuAberto]);

  const userEmail = user?.email ?? "";
  const userLabel = userEmail.split("@")[0] || "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  // ── Overlay ───────────────────────────────────────────────────────────────

  if (mostrarConfig) {
    return <ConfiguracoesPage onFechar={() => setMostrarConfig(false)} />;
  }

  if (mostrarOportunidades) {
    return (
      <OportunidadesPage
        clientes={clientStore.clients}
        rawPlans={rawPlans}
        onVoltar={() => setMostrarOportunidades(false)}
        onAbrirCliente={(clienteId) => {
          const found = clientStore.clients.find((cl) => cl.id === clienteId);
          if (found) setClienteSelecionado(found);
          setMostrarOportunidades(false);
        }}
      />
    );
  }

  if (clienteSelecionado) {
    return (
      <FinancialPlanningPage
        clientId={clienteSelecionado.id}
        clientName={clienteSelecionado.nome}
        onClose={() => setClienteSelecionado(null)}
      />
    );
  }

  if (clienteAcompanhamento) {
    return (
      <AcompanhamentoPage
        clienteId={clienteAcompanhamento.id}
        clienteNome={clienteAcompanhamento.nome}
        onVoltar={() => setClienteAcompanhamento(null)}
      />
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openNovoCliente() {
    setClienteEditando(null);
    setForm(EMPTY_FORM);
    setModalAberto(true);
  }

  function openEditarCliente(c: Client) {
    setClienteEditando(c);
    setForm({
      nome: c.nome,
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      cpf: "",
      nascimento: "",
      observacoes: "",
    });
    setModalAberto(true);
  }

  async function handleSalvarCliente() {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      if (clienteEditando) {
        await clientStore.atualizarCliente(clienteEditando.id, {
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          cpf: form.cpf.trim() || null,
          dataNascimento: form.nascimento.trim() || null,
          observacoes: form.observacoes.trim() || null,
        });
        toast.success("Cliente atualizado.");
      } else {
        await clientStore.criarCliente({
          nome: form.nome.trim(),
          email: form.email.trim() || undefined,
          telefone: form.telefone.trim() || undefined,
          cpf: form.cpf.trim() || undefined,
          dataNascimento: form.nascimento.trim() || undefined,
          observacoes: form.observacoes.trim() || undefined,
        });
        toast.success("Cliente adicionado.");
      }
      setModalAberto(false);
    } catch {
      toast.error("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleConfirmarExcluir() {
    if (!deleteTarget) return;
    try {
      await clientStore.deleteClient(deleteTarget.id);
      toast.success("Cliente excluído.");
    } catch {
      toast.error("Erro ao excluir cliente.");
    } finally {
      setDeleteTarget(null);
    }
  }

  function handleAbrirFP(c: Client) { setClienteSelecionado(c); }

  function abrirMenu(e: React.MouseEvent, clienteId: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(rect.right - 144, window.innerWidth - 160);
    const y = rect.bottom + 4;
    setMenuPos({ x, y });
    setMenuAberto(menuAberto === clienteId ? null : clienteId);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalClientes = clientStore.clients.length;
  const totalConcluido = clientStore.clients.filter((c) => c.planStatus === "completo").length;
  const totalAndamento = clientStore.clients.filter((c) => c.planStatus === "rascunho").length;
  const totalSemFP = clientStore.clients.filter(
    (c) => !c.planStatus || c.planStatus === "nao_iniciado"
  ).length;

  const totalOportunidades = (() => {
    let manuais: Array<{ id: string }> = [];
    let resolvidasArr: string[] = [];
    try { manuais = JSON.parse(localStorage.getItem("oportunidades_manuais") ?? "[]"); } catch { /* */ }
    try { resolvidasArr = JSON.parse(localStorage.getItem("oportunidades_resolvidas") ?? "[]"); } catch { /* */ }
    const resolvidasSet = new Set(resolvidasArr);
    const autoOps = detectarOportunidades(clientStore.clients, rawPlans);
    return [...autoOps, ...manuais].filter((op) => !resolvidasSet.has(op.id)).length;
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F7FF" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: "#1E3A8A" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          {/* Logo */}
          <div className="flex-1 flex items-center">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/diamond-icon-small.png"
                alt="Simpla Invest"
                style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }}
              />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>
                  Simpla Invest
                </span>
                <span style={{ color: "#93C5FD", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.04em" }}>
                  Financial Planning
                </span>
              </div>
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-tight">
                {userLabel}
              </p>
              <p className="text-[#9CA3AF] text-xs leading-tight">
                Consultor financeiro
              </p>
            </div>
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none"
              style={{ backgroundColor: GOLD, color: DARK }}
            >
              {userInitials}
            </div>
            <button
              onClick={() => setMostrarConfig(true)}
              title="Configurações"
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "6px 8px", borderRadius: 6, display: "flex", alignItems: "center", opacity: 0.75 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.75")}
            >
              <i className="ti ti-settings" style={{ fontSize: 18 }} />
            </button>
            <button
              onClick={signOut}
              className="text-[#9CA3AF] hover:text-white transition-colors p-1"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="flex-1">
            <p className="font-semibold uppercase tracking-widest mb-1" style={{ color: GOLD, fontSize: 11 }}>
              DASHBOARD
            </p>
            <div className="flex items-baseline gap-3">
              <h1 className="font-bold" style={{ color: DARK, fontSize: 32 }}>
                Meus Clientes
              </h1>
              <span style={{ color: "#6B7280", fontSize: 18 }}>
                ({totalClientes} {totalClientes === 1 ? "cliente" : "clientes"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9CA3AF" }} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 text-sm border border-[#BFDBFE] rounded-lg bg-white outline-none focus:ring-2 focus:ring-offset-1 transition"
                style={{ width: 280 }}
              />
            </div>
            <button
              onClick={() => setMostrarOportunidades(true)}
              className="relative flex items-center gap-2 text-white text-sm font-medium rounded-lg px-5 py-3 transition hover:opacity-90"
              style={{ backgroundColor: "#1E3A8A" }}
            >
              <i className="ti ti-bulb" style={{ fontSize: 16 }} />
              Oportunidades
              {totalOportunidades > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-white text-xs font-bold px-1"
                  style={{ backgroundColor: "#B91C1C" }}
                >
                  {totalOportunidades > 99 ? "99+" : totalOportunidades}
                </span>
              )}
            </button>
            <button
              onClick={openNovoCliente}
              className="flex items-center gap-2 text-white text-sm font-medium rounded-lg px-5 py-3 transition hover:opacity-90"
              style={{ backgroundColor: DARK }}
            >
              <UserPlus className="h-4 w-4" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total de Clientes", value: totalClientes, color: "#1E3A8A", bg: "white", border: "#BFDBFE", icon: "ti-users" },
            { label: "FP Concluído",       value: totalConcluido, color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0", icon: "ti-circle-check" },
            { label: "Em Andamento",       value: totalAndamento, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "ti-loader-2" },
            { label: "Sem FP",             value: totalSemFP,    color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", icon: "ti-file-off" },
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

        {/* Table */}
        {clientStore.loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9CA3AF" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
            Carregando clientes...
          </div>
        ) : (
          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 120px 40px", padding: "10px 20px", background: "#F8FAFF", borderBottom: "0.5px solid #E5E7EB", fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              <span>Cliente</span>
              <span>Perfil</span>
              <span>Status FP</span>
              <span>Atualização</span>
              <span>Ações</span>
              <span />
            </div>

            {/* Search empty state */}
            {filtered.length === 0 && clientStore.clients.length > 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF" }}>
                <Search className="h-10 w-10 mx-auto mb-3" style={{ color: "#D1D5DB" }} />
                <p style={{ fontSize: 13 }}>Nenhum resultado para &ldquo;{search}&rdquo;</p>
                <button onClick={() => setSearch("")} style={{ marginTop: 8, fontSize: 12, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>
                  Limpar busca
                </button>
              </div>
            )}

            {/* Data rows */}
            {filtered.map((c) => {
              const perfil = profileConfig(c.planSuitabilityPerfil);

              return (
                <div
                  key={c.id}
                  style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 120px 40px", padding: "14px 20px", borderBottom: "0.5px solid #F3F4F6", alignItems: "center", gap: 8, background: "white" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  {/* CLIENTE */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1E3A8A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(c.nome)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{c.email ?? "—"}</div>
                    </div>
                  </div>

                  {/* PERFIL */}
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: perfil.color, background: perfil.bg, padding: "3px 10px", borderRadius: 99 }}>
                      {perfil.label}
                    </span>
                  </div>

                  {/* STATUS FP */}
                  <div>
                    {(() => {
                      const s = c.planStatus;
                      const cfg =
                        s === "completo"
                          ? { label: "Concluído",    color: "#15803D", bg: "#DCFCE7" }
                          : s === "rascunho"
                          ? { label: "Em andamento", color: "#2563EB", bg: "#DBEAFE" }
                          : { label: "Não iniciado", color: "#9CA3AF", bg: "#F3F4F6" };
                      return (
                        <span style={{ fontSize: 11, fontWeight: 500, color: cfg.color, background: cfg.bg, padding: "3px 10px", borderRadius: 99 }}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* ATUALIZAÇÃO */}
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    {formatDate(c.planUpdatedAt)}
                  </div>

                  {/* AÇÕES */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={() => handleAbrirFP(c)}
                      title="Financial Planning"
                      style={{ fontSize: 11, color: "#2563EB", background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" as const }}
                    >
                      FP
                    </button>
                  </div>

                  {/* ⋮ MENU */}
                  <div>
                    <button
                      onClick={(e) => abrirMenu(e, c.id)}
                      style={{ background: "none", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <i className="ti ti-dots-vertical" style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Empty state — no clients */}
            {clientStore.clients.length === 0 && (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "#9CA3AF" }}>
                <i className="ti ti-users" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                <div style={{ fontSize: 14 }}>Nenhum cliente cadastrado</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Clique em &ldquo;+ Novo Cliente&rdquo; para começar</div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── ⋮ Dropdown (position fixed) ── */}
      {menuAberto && menuPos && (() => {
        const clienteMenu = clientStore.clients.find((c) => c.id === menuAberto);
        if (!clienteMenu) return null;
        return (
          <div
            style={{ position: "fixed", top: menuPos.y, left: menuPos.x, zIndex: 9999, background: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", minWidth: 144, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { openEditarCliente(clienteMenu); setMenuAberto(null); setMenuPos(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFF")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <i className="ti ti-pencil" style={{ fontSize: 14, color: "#6B7280" }} />
              Editar cliente
            </button>
            <div style={{ height: "0.5px", background: "#F3F4F6" }} />
            <button
              onClick={() => { setDeleteTarget(clienteMenu); setMenuAberto(null); setMenuPos(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", fontSize: 13, color: "#B91C1C", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF5F5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <i className="ti ti-trash" style={{ fontSize: 14, color: "#B91C1C" }} />
              Remover cliente
            </button>
          </div>
        );
      })()}

      {/* ── Add/Edit modal ── */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-[480px]" style={{ borderRadius: 12, padding: 32 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 20 }}>
              {clienteEditando ? "Editar cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-nome">
                Nome completo <span className="text-[#B91C1C]">*</span>
              </Label>
              <Input
                id="m-nome"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo"
                disabled={salvando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email</Label>
              <Input
                id="m-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                disabled={salvando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-tel">Telefone</Label>
              <Input
                id="m-tel"
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                placeholder="(99) 99999-9999"
                disabled={salvando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-cpf">CPF</Label>
              <Input
                id="m-cpf"
                value={form.cpf}
                onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
                placeholder="999.999.999-99"
                disabled={salvando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-nasc">Data de nascimento</Label>
              <Input
                id="m-nasc"
                type="date"
                value={form.nascimento}
                onChange={(e) => setForm((p) => ({ ...p, nascimento: e.target.value }))}
                disabled={salvando}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-obs">Observações</Label>
              <Textarea
                id="m-obs"
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                placeholder="Anotações sobre o cliente..."
                disabled={salvando}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setModalAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarCliente}
              disabled={salvando}
              style={{ backgroundColor: DARK, color: "white" }}
            >
              {salvando ? "Salvando..." : "Salvar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation modal ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md" style={{ borderRadius: 12 }}>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B7280] py-2">
            Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarExcluir}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
