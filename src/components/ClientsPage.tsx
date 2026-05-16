import { useState } from "react";
import { toast } from "sonner";
import { Users, MoreVertical, Trash2, Activity, ChevronDown, ChevronUp, Plus, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Client, Simulation } from "@/hooks/useClientStore";
import { formatDate } from "@/lib/format";

// ─── helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-orange-500",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientsPageProps {
  clients: Client[];
  addClient: (nome: string, email?: string, telefone?: string) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  getClientSimulations: (clientId: string) => Simulation[];
  deleteSimulation: (id: string) => Promise<void>;
  onLoadSimulation: (simulation: Simulation) => void;
  onGeneratePdf: (clientId: string) => void;
  onNewDiagnostic: (clientId: string) => void;
}

// ─── Add client dialog ────────────────────────────────────────────────────────

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (nome: string, email: string, telefone: string) => Promise<void>;
}

function AddClientDialog({ open, onOpenChange, onSubmit }: AddClientDialogProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setNome("");
    setEmail("");
    setTelefone("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      await onSubmit(nome.trim(), email.trim(), telefone.trim());
      reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-nome">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">E-mail</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-telefone">Telefone</Label>
            <Input
              id="client-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !nome.trim()}>
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Simulation list row ──────────────────────────────────────────────────────

function SimulationRow({
  sim,
  onDelete,
}: {
  sim: Simulation;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        Simulação de {formatDate(sim.dataSimulacao)}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Client card ─────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: Client;
  simulations: Simulation[];
  expanded: boolean;
  onToggle: () => void;
  onDeleteClient: () => void;
  onDeleteSim: (id: string) => void;
  onLoadSimulation: (sim: Simulation) => void;
  onNewDiagnostic: () => void;
  onGeneratePdf: () => void;
}

function ClientCard({
  client,
  simulations,
  expanded,
  onToggle,
  onDeleteClient,
  onDeleteSim,
  onLoadSimulation,
  onNewDiagnostic,
  onGeneratePdf,
}: ClientCardProps) {
  function handleNewSimulation() {
    onLoadSimulation({
      id: "",
      clientId: client.id,
      dadosInput: {},
      resultadosCalc: {},
      dataSimulacao: new Date().toISOString(),
    });
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* main row */}
        <div className="flex items-center gap-3 p-4">
          {/* avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className={`${avatarColor(client.nome)} text-white text-sm font-semibold`}>
              {initials(client.nome)}
            </AvatarFallback>
          </Avatar>

          {/* info */}
          <button
            className="min-w-0 flex-1 text-left"
            onClick={onToggle}
          >
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{client.nome}</span>
              {simulations.length > 0 && (
                <Badge variant="secondary" className="shrink-0">
                  {simulations.length} sim.
                </Badge>
              )}
            </div>
            {(client.email || client.telefone) && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[client.email, client.telefone].filter(Boolean).join(" · ")}
              </p>
            )}
          </button>

          {/* expand toggle */}
          <button
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleNewSimulation}>
                <FileBarChart className="mr-2 h-4 w-4" />
                Nova simulação
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewDiagnostic}>
                <Activity className="mr-2 h-4 w-4" />
                Novo diagnóstico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onGeneratePdf}>
                <FileBarChart className="mr-2 h-4 w-4" />
                Gerar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (window.confirm(`Excluir ${client.nome}? Todos os dados serão removidos.`)) {
                    onDeleteClient();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* expanded simulations */}
        {expanded && (
          <div className="border-t px-4 pb-4 pt-3">
            {simulations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma simulação registrada.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Simulações
                </p>
                {simulations.map((sim) => (
                  <SimulationRow
                    key={sim.id}
                    sim={sim}
                    onDelete={() => {
                      if (window.confirm("Excluir esta simulação?")) onDeleteSim(sim.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientsPage({
  clients,
  addClient,
  deleteClient,
  getClientSimulations,
  deleteSimulation,
  onLoadSimulation,
  onGeneratePdf,
  onNewDiagnostic,
}: ClientsPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddClient(nome: string, email: string, telefone: string) {
    await addClient(nome, email || undefined, telefone || undefined);
    toast.success("Cliente cadastrado com sucesso!");
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {/* empty state */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Nenhum cliente cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Clique em "Novo cliente" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              simulations={getClientSimulations(client.id)}
              expanded={expandedIds.has(client.id)}
              onToggle={() => toggleExpand(client.id)}
              onDeleteClient={async () => {
                try {
                  await deleteClient(client.id);
                  toast.success("Cliente excluído.");
                } catch {
                  toast.error("Erro ao excluir cliente.");
                }
              }}
              onDeleteSim={async (id) => {
                try {
                  await deleteSimulation(id);
                  toast.success("Simulação excluída.");
                } catch {
                  toast.error("Erro ao excluir simulação.");
                }
              }}
              onLoadSimulation={onLoadSimulation}
              onNewDiagnostic={() => onNewDiagnostic(client.id)}
              onGeneratePdf={() => onGeneratePdf(client.id)}
            />
          ))}
        </div>
      )}

      <AddClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddClient}
      />
    </div>
  );
}
