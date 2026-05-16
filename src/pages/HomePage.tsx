import { useState } from "react";
import { Users, Activity, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientsPage } from "@/components/ClientsPage";
import { DiagnosticPage } from "@/components/DiagnosticPage";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useClientStore } from "@/hooks/useClientStore";
import type { Simulation } from "@/hooks/useClientStore";
import { cn } from "@/lib/utils";

type ActiveTab = "simulator" | "clients" | "diagnostic";

export function HomePage() {
  const { signOut } = useAuth();
  const clientStore = useClientStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("clients");
  const [diagnosticClientId, setDiagnosticClientId] = useState<string | undefined>(undefined);

  function handleNewDiagnostic(clientId: string) {
    setDiagnosticClientId(clientId);
    setActiveTab("diagnostic");
  }

  function handleLoadSimulation(_sim: Simulation) {
    setActiveTab("simulator");
  }

  const navItems: { id: ActiveTab; label: string; Icon: React.ElementType }[] = [
    { id: "clients", label: "Clientes", Icon: Users },
    { id: "diagnostic", label: "Diagnóstico", Icon: Activity },
  ];

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
        {/* Global loading state while client data is fetching */}
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
