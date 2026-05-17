import { useState } from "react";
import { Users, Activity, LogOut, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientsPage } from "@/components/ClientsPage";
import { DiagnosticPage } from "@/components/DiagnosticPage";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FinancialPlanningPage } from "@/components/financialPlanning/FinancialPlanningPage";
import { EstrategiaInicialPage } from "@/components/estrategia/EstrategiaInicialPage";
import { useAuth } from "@/contexts/AuthContext";
import { useClientStore } from "@/hooks/useClientStore";
import type { Simulation } from "@/hooks/useClientStore";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActiveTab = "simulator" | "clients" | "diagnostic" | "financial-planning" | "estrategia";

export function HomePage() {
  const { signOut } = useAuth();
  const clientStore = useClientStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("clients");
  const [diagnosticClientId, setDiagnosticClientId] = useState<string | undefined>(undefined);
  const [fpClientId, setFpClientId] = useState<string | undefined>(undefined);
  const [fpClientName, setFpClientName] = useState<string>("");
  const [estrategiaClientId, setEstrategiaClientId] = useState<string | undefined>(undefined);
  const [estrategiaClientName, setEstrategiaClientName] = useState<string>("");

  function handleNewDiagnostic(clientId: string) {
    setDiagnosticClientId(clientId);
    setActiveTab("diagnostic");
  }

  function handleLoadSimulation(_sim: Simulation) {
    setActiveTab("simulator");
  }

  function handleNewFinancialPlan(clientId: string, clientName: string) {
    setFpClientId(clientId);
    setFpClientName(clientName);
    setActiveTab("financial-planning");
  }

  function handleNewEstrategia(clientId: string, clientName: string) {
    setEstrategiaClientId(clientId);
    setEstrategiaClientName(clientName);
    setActiveTab("estrategia");
  }

  function handleFpClientSelect(clientId: string) {
    const client = clientStore.clients.find((c) => c.id === clientId);
    if (client) {
      setFpClientId(clientId);
      setFpClientName(client.nome);
    }
  }

  const navItems: { id: ActiveTab; label: string; Icon: React.ElementType }[] = [
    { id: "clients", label: "Clientes", Icon: Users },
    { id: "diagnostic", label: "Diagnóstico", Icon: Activity },
    { id: "financial-planning", label: "Planejamento", Icon: FileBarChart },
  ];

  // FinancialPlanningPage takes over the full viewport when active
  if (activeTab === "financial-planning" && fpClientId) {
    return (
      <FinancialPlanningPage
        clientId={fpClientId}
        clientName={fpClientName}
        onClose={() => setActiveTab("clients")}
      />
    );
  }

  // EstrategiaInicialPage takes over the full viewport when active
  if (activeTab === "estrategia" && estrategiaClientId) {
    return (
      <EstrategiaInicialPage
        clientId={estrategiaClientId}
        clientName={estrategiaClientName}
        financialPlan={null}
        onClose={() => setActiveTab("clients")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Fixed header ── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          {/* Logo */}
          <div className="mr-4 shrink-0">
            <span className="text-lg font-bold tracking-tight">
              Simpla{" "}
              <span className="font-light text-muted-foreground">· Diagnóstico</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-1 items-center gap-1">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="mr-1.5 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {clientStore.loading ? (
          <LoadingSpinner text="Carregando dados..." />
        ) : (
          <>
            {activeTab === "clients" && (
              <ClientsPage
                clients={clientStore.clients}
                addClient={clientStore.addClient}
                deleteClient={clientStore.deleteClient}
                getClientSimulations={clientStore.getClientSimulations}
                deleteSimulation={clientStore.deleteSimulation}
                onLoadSimulation={handleLoadSimulation}
                onGeneratePdf={() => {}}
                onNewDiagnostic={handleNewDiagnostic}
                onNewFinancialPlan={handleNewFinancialPlan}
                onNewEstrategia={handleNewEstrategia}
              />
            )}

            {activeTab === "diagnostic" && (
              <DiagnosticPage
                key={diagnosticClientId ?? "default"}
                clients={clientStore.clients}
                getClientSimulations={clientStore.getClientSimulations}
                initialClientId={diagnosticClientId}
              />
            )}

            {activeTab === "financial-planning" && !fpClientId && (
              <div className="flex flex-col items-center gap-4 py-16">
                <FileBarChart className="h-10 w-10 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Planejamento financeiro</h2>
                <p className="text-sm text-muted-foreground">
                  Selecione um cliente para iniciar o planejamento
                </p>
                {clientStore.clients.length > 0 ? (
                  <Select onValueChange={handleFpClientSelect}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientStore.clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Nenhum cliente cadastrado"
                    description="Cadastre um cliente na aba Clientes primeiro."
                  />
                )}
              </div>
            )}

            {activeTab === "simulator" && (
              <EmptyState
                icon={Activity}
                title="Selecione Clientes para gerenciar seus clientes"
                description="ou Diagnóstico para iniciar uma nova avaliação financeira."
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
