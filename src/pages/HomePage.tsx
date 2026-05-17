import { useState, useMemo } from "react";
import { Search, Plus, LogOut, MoreHorizontal, Pencil, Trash2, FileBarChart, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { EstrategiaInicialPage } from "@/components/estrategia/EstrategiaInicialPage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useClientStore } from "@/hooks/useClientStore";
import type { Client } from "@/hooks/useClientStore";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import { toast } from "sonner";

// ─── Avatar colors ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function avatarColor(nome: string): string {
  const sum = nome.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getInitials(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ─── Perfil labels ────────────────────────────────────────────────────────────

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

// ─── Modal form ───────────────────────────────────────────────────────────────

interface ClientForm {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  nascimento: string;
  observacoes: string;
}

const EMPTY_FORM: ClientForm = {
  nome: "", email: "", telefone: "", cpf: "", nascimento: "", observacoes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

type Overlay = "fp" | "estrategia" | null;

export function HomePage() {
  const { user, signOut } = useAuth();
  const clientStore = useClientStore();
  const planStore = useFinancialPlanStore();

  const [clienteSelecionado, setClienteSelecionado] = useState<Client | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [search, setSearch] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);

  // useMemo MUST be before any conditional return — Rules of Hooks
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientStore.clients;
    return clientStore.clients.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clientStore.clients, search]);

  const userLabel = user?.email?.split("@")[0] ?? "Consultor";
  const userInitials = userLabel.slice(0, 2).toUpperCase();

  // ── Helpers ──────────────────────────────────────────────────────────────

  function openNovoCliente() {
    setClienteEditando(null);
    setForm(EMPTY_FORM);
    setModalAberto(true);
  }

  function openEditarCliente(c: Client) {
    setClienteEditando(c);
    setForm({ nome: c.nome, email: c.email ?? "", telefone: c.telefone ?? "", cpf: "", nascimento: "", observacoes: "" });
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
        // update — clientStore doesn't have updateClient yet; use addClient workaround
        // For now: delete and re-add is destructive; just notify user
        toast.info("Edição de dados básicos ainda não sincroniza com o servidor.");
      } else {
        await clientStore.addClient(
          form.nome.trim(),
          form.email.trim() || undefined,
          form.telefone.trim() || undefined,
        );
        toast.success("Cliente adicionado.");
      }
      setModalAberto(false);
    } catch {
      toast.error("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirCliente(c: Client) {
    if (!confirm(`Excluir ${c.nome}? Esta ação não pode ser desfeita.`)) return;
    try {
      await clientStore.deleteClient(c.id);
      toast.success("Cliente excluído.");
    } catch {
      toast.error("Erro ao excluir cliente.");
    }
  }

  function handleAbrirFP(c: Client) {
    setClienteSelecionado(c);
    setOverlay("fp");
  }

  function handleAbrirEstrategia(c: Client) {
    setClienteSelecionado(c);
    setOverlay("estrategia");
  }

  // ── Navigation overlays — conditional returns AFTER all hooks ─────────────

  if (clienteSelecionado && overlay === "fp") {
    return (
      <FinancialPlanningPage
        clientId={clienteSelecionado.id}
        clientName={clienteSelecionado.nome}
        onClose={() => { setClienteSelecionado(null); setOverlay(null); }}
      />
    );
  }

  if (clienteSelecionado && overlay === "estrategia") {
    const plan = planStore.getLatestPlan(clienteSelecionado.id);
    if (plan) {
      return (
        <EstrategiaInicialPage
          plan={plan}
          clientName={clienteSelecionado.nome}
          onClose={() => { setClienteSelecionado(null); setOverlay(null); }}
        />
      );
    }
    // No plan yet — render FP directly (never call setState during render)
    return (
      <FinancialPlanningPage
        clientId={clienteSelecionado.id}
        clientName={clienteSelecionado.nome}
        onClose={() => { setClienteSelecionado(null); setOverlay(null); }}
      />
    );
  }

  // ── CRM view ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <span className="text-lg font-bold tracking-tight">
              Simpla{" "}
              <span className="font-light text-muted-foreground">Financial Planning</span>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold select-none">
                {userInitials}
              </div>
              <span className="hidden sm:block text-sm text-muted-foreground">{userLabel}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {clientStore.loading ? (
          <LoadingSpinner text="Carregando clientes..." />
        ) : (
          <>
            {/* Toolbar */}
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={openNovoCliente} className="shrink-0">
                <Plus className="h-4 w-4 mr-1.5" />
                Novo Cliente
              </Button>
            </div>

            {/* Count */}
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length === 0
                ? "Nenhum cliente encontrado"
                : `${filtered.length} cliente${filtered.length !== 1 ? "s" : ""}`}
            </p>

            {/* Grid */}
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((c) => {
                  const plan = planStore.getLatestPlan(c.id);
                  const perfil = plan?.suitability?.perfil;
                  const fpLabel =
                    !plan ? "Iniciar Financial Planning"
                    : plan.status === "completo" ? "Ver Financial Planning"
                    : "Continuar Financial Planning";

                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border bg-card p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none ${avatarColor(c.nome)}`}
                          >
                            {getInitials(c.nome)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{c.nome}</p>
                            {c.email && (
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                            )}
                          </div>
                        </div>

                        {/* More menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditarCliente(c)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirFP(c)}>
                              <FileBarChart className="h-3.5 w-3.5 mr-2" />
                              Financial Planning
                            </DropdownMenuItem>
                            {plan && (
                              <DropdownMenuItem onClick={() => handleAbrirEstrategia(c)}>
                                <ClipboardList className="h-3.5 w-3.5 mr-2" />
                                Estratégia Inicial
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleExcluirCliente(c)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {perfil && (
                          <Badge variant="secondary" className="text-xs">
                            {PERFIL_LABELS[perfil] ?? perfil}
                          </Badge>
                        )}
                        {plan && (
                          <Badge
                            className={
                              plan.status === "completo"
                                ? "bg-emerald-100 text-emerald-700 text-xs"
                                : "bg-amber-100 text-amber-700 text-xs"
                            }
                          >
                            {plan.status === "completo" ? "FP Completo" : "FP em andamento"}
                          </Badge>
                        )}
                        {!plan && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Sem plano
                          </Badge>
                        )}
                      </div>

                      {/* CTA */}
                      <Button
                        size="sm"
                        variant={plan ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleAbrirFP(c)}
                      >
                        <FileBarChart className="h-3.5 w-3.5 mr-1.5" />
                        {fpLabel}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              clientStore.clients.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold">Nenhum cliente ainda</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Adicione seu primeiro cliente para iniciar o planejamento financeiro.
                  </p>
                  <Button onClick={openNovoCliente}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo Cliente
                  </Button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Add/Edit modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{clienteEditando ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo"
                disabled={salvando}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                disabled={salvando}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                disabled={salvando}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  disabled={salvando}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nascimento">Nascimento</Label>
                <Input
                  id="nascimento"
                  type="date"
                  value={form.nascimento}
                  onChange={(e) => setForm((p) => ({ ...p, nascimento: e.target.value }))}
                  disabled={salvando}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarCliente} disabled={salvando}>
              {salvando ? "Salvando..." : clienteEditando ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
