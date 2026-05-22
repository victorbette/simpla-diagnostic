import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DiagnosticForm } from "@/components/DiagnosticForm";
import { DiagnosticResultView } from "@/components/DiagnosticResultView";
import { DiagnosticPrintAdvisor, DiagnosticPrintClient } from "@/components/DiagnosticPrint";
import type { Client, Simulation } from "@/hooks/useClientStore";
import {
  calculateDiagnostic,
  initialAnswers,
  type DiagnosticAnswers,
  type DiagnosticResult,
} from "@/hooks/useDiagnosticEngine";
import { useDiagnosticStore, type DiagnosticRecord } from "@/hooks/useDiagnosticStore";
import { formatDate } from "@/lib/format";

// ─── Risk badge helper ────────────────────────────────────────────────────────

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: "Risco alto", className: "bg-[#E8D4D4] text-red-800 dark:bg-red-900 dark:text-red-200" },
  medium: { label: "Atenção", className: "bg-[#DBEAFE] text-[#1E40AF] dark:bg-amber-900 dark:text-amber-200" },
  low: { label: "Adequado", className: "bg-[#DCFCE7] text-green-800 dark:bg-green-900 dark:text-green-200" },
};

type View = "select" | "form" | "result";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DiagnosticPageProps {
  clients: Client[];
  getClientSimulations: (clientId: string) => Simulation[];
  initialClientId?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DiagnosticPage({
  clients,
  getClientSimulations,
  initialClientId,
}: DiagnosticPageProps) {
  const store = useDiagnosticStore();

  const [view, setView] = useState<View>("select");
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ?? "");
  const [selectedSimId, setSelectedSimId] = useState("");
  const [answers, setAnswers] = useState<DiagnosticAnswers>(initialAnswers);
  const [currentResult, setCurrentResult] = useState<DiagnosticResult | null>(null);
  const [savedRecord, setSavedRecord] = useState<DiagnosticRecord | null>(null);
  const [printMode, setPrintMode] = useState<"advisor" | "client" | null>(null);

  // Sync when initialClientId changes (navigating from ClientsPage)
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
      setView("select");
      setAnswers(initialAnswers);
      setCurrentResult(null);
      setSavedRecord(null);
    }
  }, [initialClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientSimulations = selectedClientId ? getClientSimulations(selectedClientId) : [];
  const clientDiagnostics = selectedClientId
    ? store.getClientDiagnostics(selectedClientId)
    : [];

  function handleChange<K extends keyof DiagnosticAnswers>(
    key: K,
    value: DiagnosticAnswers[K]
  ) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleFinish() {
    const result = calculateDiagnostic(answers);
    setCurrentResult(result);
    setView("result");
  }

  async function handleSave() {
    if (!currentResult || !selectedClientId) return;
    try {
      const record = await store.saveDiagnostic(
        selectedClientId,
        answers as unknown as Record<string, unknown>,
        currentResult as unknown as Record<string, unknown>,
        selectedSimId || undefined
      );
      setSavedRecord(record);
      toast.success("Diagnóstico salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar diagnóstico.");
    }
  }

  function handlePrintAdvisor() {
    setPrintMode("advisor");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

  function handlePrintClient() {
    setPrintMode("client");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

  function loadRecord(record: DiagnosticRecord) {
    setAnswers(record.answers as unknown as DiagnosticAnswers);
    setCurrentResult(record.result as unknown as DiagnosticResult);
    setSavedRecord(record);
    setView("result");
  }

  async function handleDeleteRecord(id: string) {
    if (!window.confirm("Excluir este diagnóstico?")) return;
    try {
      await store.deleteDiagnostic(id);
      toast.success("Diagnóstico excluído.");
    } catch {
      toast.error("Erro ao excluir diagnóstico.");
    }
  }

  // ── View: form ──────────────────────────────────────────────────────────────

  if (view === "form") {
    return (
      <div className="flex justify-center">
        <DiagnosticForm
          answers={answers}
          onChange={handleChange}
          onFinish={handleFinish}
          onCancel={() => setView("select")}
        />
      </div>
    );
  }

  // ── View: result ────────────────────────────────────────────────────────────

  if (view === "result" && currentResult && selectedClient) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView("select")}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>

        <DiagnosticResultView
          result={currentResult}
          answers={answers}
          clientName={selectedClient.nome}
          onRedo={() => setView("form")}
          onSave={savedRecord ? () => {} : handleSave}
          onPrintAdvisor={handlePrintAdvisor}
          onPrintClient={handlePrintClient}
        />

        {/* Print layers — hidden on screen, visible on print */}
        {printMode === "advisor" && (
          <DiagnosticPrintAdvisor
            result={currentResult}
            answers={answers}
            clientName={selectedClient.nome}
          />
        )}
        {printMode === "client" && (
          <DiagnosticPrintClient
            result={currentResult}
            clientName={selectedClient.nome}
          />
        )}
      </div>
    );
  }

  // ── View: select ────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Novo diagnóstico financeiro</h2>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Client select */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={selectedClientId}
              onValueChange={(v) => {
                setSelectedClientId(v);
                setSelectedSimId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Simulation link (optional) */}
          {selectedClientId && clientSimulations.length > 0 && (
            <div className="space-y-1.5">
              <Label>Vincular simulação (opcional)</Label>
              <Select value={selectedSimId} onValueChange={setSelectedSimId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma simulação vinculada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {clientSimulations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Simulação de {formatDate(s.dataSimulacao)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSimId && (
                <p className="text-xs text-muted-foreground">
                  Dados de proteção preenchidos automaticamente.
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!selectedClientId}
            onClick={() => {
              setAnswers(initialAnswers);
              setSavedRecord(null);
              setCurrentResult(null);
              setView("form");
            }}
          >
            Iniciar diagnóstico
          </Button>
        </CardContent>
      </Card>

      {/* Previous diagnostics */}
      {selectedClientId && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Diagnósticos anteriores
          </h3>

          {store.loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : clientDiagnostics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum diagnóstico realizado para este cliente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clientDiagnostics.map((rec) => {
                const result = rec.result as unknown as DiagnosticResult;
                const risk = result?.overallRisk ?? "medium";
                const score = result?.overallScore ?? 0;
                const badge = RISK_BADGE[risk] ?? RISK_BADGE.medium;

                return (
                  <Card key={rec.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                          >
                            {score}% · {badge.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(rec.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => loadRecord(rec)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRecord(rec.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
