import { useState, useMemo } from "react";
import {
  Search,
  LogOut,
  MoreHorizontal,
  UserPlus,
  Plus,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FinancialPlanningPage } from "@/components/financialPlanning/FinancialPlanningPage";
import { ClientCardSkeleton } from "@/components/ui/ClientCardSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useClientStore } from "@/hooks/useClientStore";
import type { Client } from "@/hooks/useClientStore";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const DARK = "#000000";
const GOLD = "#BBA866";

const AVATAR_COLORS = [
  "bg-purple-200 text-[#8A7A45]",
  "bg-teal-200 text-[#8A7A45]",
  "bg-green-200 text-[#3D6B41]",
  "bg-amber-200 text-[#8A7A45]",
  "bg-red-200 text-[#7A3535]",
  "bg-indigo-200 text-indigo-700",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColorByIndex(idx: number): string {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

type FPStatus = "nao_iniciado" | "em_andamento" | "concluido";

interface ProfileConfig {
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  label: string;
}

function profileConfig(perfil: string | null | undefined): ProfileConfig {
  switch (perfil) {
    case "moderado":
      return {
        borderColor: "#8A7A45",
        badgeBg: "#F5F0E0",
        badgeText: "#8A7A45",
        dotColor: "#8A7A45",
        label: "MODERADO",
      };
    case "conservador":
    case "conservador_moderado":
      return {
        borderColor: "#BBA866",
        badgeBg: "#EAF0F5",
        badgeText: "#2A4F6A",
        dotColor: "#BBA866",
        label: perfil === "conservador_moderado" ? "CONS. MODERADO" : "CONSERVADOR",
      };
    case "arrojado":
      return {
        borderColor: "#7A3535",
        badgeBg: "#F2EBEB",
        badgeText: "#7A3535",
        dotColor: "#7A3535",
        label: "ARROJADO",
      };
    default:
      return {
        borderColor: "#9E9070",
        badgeBg: "#F5F3EE",
        badgeText: "#6B6347",
        dotColor: "#E2DCC8",
        label: "SEM PERFIL",
      };
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
  const [search, setSearch] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

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

  const userEmail = user?.email ?? "";
  const userLabel = userEmail.split("@")[0] || "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  // ── Overlay ───────────────────────────────────────────────────────────────

  if (clienteSelecionado) {
    return (
      <FinancialPlanningPage
        clientId={clienteSelecionado.id}
        clientName={clienteSelecionado.nome}
        onClose={() => setClienteSelecionado(null)}
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

  // ── Render ────────────────────────────────────────────────────────────────

  const totalClientes = clientStore.clients.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3EE" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40"
        style={{ backgroundColor: "#000000" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          {/* Logo */}
          <div className="flex-1 flex items-center">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/logo-icon.png"
                alt="Simpla Wealth"
                style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 4 }}
              />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15 }}>
                  Simpla Wealth
                </span>
                <span style={{ color: "#BBA866", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.05em" }}>
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
              <p className="text-[#9E9070] text-xs leading-tight">
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
              onClick={signOut}
              className="text-[#9E9070] hover:text-white transition-colors p-1"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {clientStore.loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ClientCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Title row ── */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-8">
              <div className="flex-1">
                <p
                  className="font-semibold uppercase tracking-widest mb-1"
                  style={{ color: GOLD, fontSize: 11 }}
                >
                  DASHBOARD
                </p>
                <div className="flex items-baseline gap-3">
                  <h1
                    className="font-bold"
                    style={{ color: DARK, fontSize: 32 }}
                  >
                    Meus Clientes
                  </h1>
                  <span style={{ color: "#6B6347", fontSize: 18 }}>
                    ({totalClientes} {totalClientes === 1 ? "cliente" : "clientes"})
                  </span>
                </div>
              </div>

              {/* Search + button */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: "#9E9070" }}
                  />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2.5 text-sm border border-[#E2DCC8] rounded-lg bg-white outline-none focus:ring-2 focus:ring-offset-1 transition"
                    style={{ width: 280 }}
                  />
                </div>
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

            {/* ── Grid ── */}
            {clientStore.clients.length === 0 ? (
              /* Empty — no clients at all */
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <Users className="h-16 w-16" style={{ color: "#9E9070" }} />
                <h2 className="text-xl font-semibold" style={{ color: "#3D3520" }}>
                  Nenhum cliente cadastrado
                </h2>
                <p className="text-sm" style={{ color: "#6B6347" }}>
                  Adicione seu primeiro cliente para começar
                </p>
                <button
                  onClick={openNovoCliente}
                  className="mt-2 flex items-center gap-2 text-white text-sm font-medium rounded-lg px-6 py-3 transition hover:opacity-90"
                  style={{ backgroundColor: DARK }}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar primeiro cliente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              /* Empty — search no results */
              <div className="flex flex-col items-center gap-4 py-24 text-center">
                <Search className="h-14 w-14" style={{ color: "#9E9070" }} />
                <h2 className="text-lg font-semibold" style={{ color: "#3D3520" }}>
                  Nenhum cliente encontrado para &ldquo;{search}&rdquo;
                </h2>
                <button
                  onClick={() => setSearch("")}
                  className="mt-2 border border-[#C8C0A0] text-sm font-medium rounded-lg px-5 py-2.5 bg-white hover:bg-[#F5F3EE] transition"
                  style={{ color: "#3D3520" }}
                >
                  Limpar busca
                </button>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{ gap: 24 }}
              >
                {filtered.map((c, idx) => {
                  const perfil = c.planSuitabilityPerfil ?? null;
                  const pc = profileConfig(perfil);

                  const fpStatus: FPStatus =
                    c.planStatus === "nao_iniciado"
                      ? "nao_iniciado"
                      : c.planStatus === "completo"
                      ? "concluido"
                      : "em_andamento";

                  const ultimoContato = c.planUpdatedAt ?? c.dataCriacao;

                  return (
                    <div
                      key={c.id}
                      className="bg-white flex flex-col"
                      style={{
                        borderRadius: 12,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        borderLeft: `4px solid ${pc.borderColor}`,
                        padding: 20,
                        minHeight: 240,
                      }}
                    >
                      {/* Row 1: profile badge + menu */}
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: pc.badgeBg, color: pc.badgeText }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: pc.dotColor }}
                          />
                          {pc.label}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[#EDE9DC] transition-colors"
                              style={{ color: "#9E9070" }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditarCliente(c)}>
                              Editar cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(c)}
                              className="text-[#7A3535] focus:text-[#7A3535]"
                            >
                              Excluir cliente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Row 2: avatar + name + date */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none ${avatarColorByIndex(idx)}`}
                        >
                          {getInitials(c.nome)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="font-semibold truncate"
                            style={{ fontSize: 16, color: "#000000" }}
                          >
                            {c.nome}
                          </p>
                          <p style={{ fontSize: 12, color: "#9E9070" }}>
                            Cadastrado em {formatDate(c.dataCriacao)}
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ height: 1, backgroundColor: "#F5F3EE", marginBottom: 16 }} />

                      {/* Row 3: metrics */}
                      <div className="grid grid-cols-2 gap-4 mb-5 flex-1">
                        <div>
                          <p
                            className="uppercase tracking-wide mb-1"
                            style={{ fontSize: 10, color: "#9E9070", fontWeight: 600 }}
                          >
                            ÚLTIMO CONTATO
                          </p>
                          <p
                            className="font-semibold"
                            style={{ fontSize: 13, color: "#3D3520" }}
                          >
                            {ultimoContato ? formatDate(ultimoContato) : "—"}
                          </p>
                        </div>
                        <div>
                          <p
                            className="uppercase tracking-wide mb-1"
                            style={{ fontSize: 10, color: "#9E9070", fontWeight: 600 }}
                          >
                            FINANCIAL PLANNING
                          </p>
                          <div className="flex items-center gap-1.5">
                            {fpStatus === "em_andamento" && (
                              <>
                                <span
                                  className="h-2 w-2 rounded-full inline-block shrink-0"
                                  style={{ backgroundColor: "#BBA866" }}
                                />
                                <span
                                  className="font-semibold"
                                  style={{ fontSize: 13, color: "#0891B2" }}
                                >
                                  Em andamento
                                </span>
                              </>
                            )}
                            {fpStatus === "concluido" && (
                              <>
                                <span
                                  className="h-2 w-2 rounded-full inline-block shrink-0"
                                  style={{ backgroundColor: "#3D6B41" }}
                                />
                                <span
                                  className="font-semibold"
                                  style={{ fontSize: 13, color: "#3D6B41" }}
                                >
                                  Concluído
                                </span>
                              </>
                            )}
                            {fpStatus === "nao_iniciado" && (
                              <>
                                <span
                                  className="h-2 w-2 rounded-full inline-block shrink-0"
                                  style={{ backgroundColor: "#E2DCC8" }}
                                />
                                <span
                                  className="font-semibold"
                                  style={{ fontSize: 13, color: "#6B6347" }}
                                >
                                  Não iniciado
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 4: CTA button */}
                      {fpStatus === "concluido" ? (
                        <button
                          onClick={() => setClienteSelecionado(c)}
                          className="w-full font-medium rounded-lg transition hover:opacity-80"
                          style={{
                            border: `1.5px solid ${DARK}`,
                            color: DARK,
                            backgroundColor: "transparent",
                            padding: "10px 0",
                            fontSize: 14,
                          }}
                        >
                          Ver plano →
                        </button>
                      ) : fpStatus === "em_andamento" ? (
                        <button
                          onClick={() => setClienteSelecionado(c)}
                          className="w-full font-medium rounded-lg text-white transition hover:opacity-90"
                          style={{
                            backgroundColor: DARK,
                            padding: "10px 0",
                            fontSize: 14,
                          }}
                        >
                          Continuar Financial Planning →
                        </button>
                      ) : (
                        <button
                          onClick={() => setClienteSelecionado(c)}
                          className="w-full font-medium rounded-lg transition hover:opacity-80 flex items-center justify-center gap-2"
                          style={{
                            border: `1.5px solid ${DARK}`,
                            color: DARK,
                            backgroundColor: "transparent",
                            padding: "10px 0",
                            fontSize: 14,
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Iniciar Financial Planning
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

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
                Nome completo <span className="text-[#7A3535]">*</span>
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
          <p className="text-sm text-[#6B6347] py-2">
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
