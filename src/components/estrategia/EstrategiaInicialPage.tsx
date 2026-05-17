import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  PieChart as PieChartIcon,
  Sunset,
  Shield,
  Receipt,
  GitBranch,
  ListChecks,
  ClipboardCheck,
  Save,
  Printer,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { FinancialPlan } from "@/types/financialPlanning";
import { SecaoCapa } from "./SecaoCapa";
import { SecaoAssetAllocation } from "./SecaoAssetAllocation";
import { SecaoAposentadoria } from "./SecaoAposentadoria";
import { SecaoProtecao } from "./SecaoProtecao";
import { SecaoFiscal } from "./SecaoFiscal";
import { SecaoSucessorio } from "./SecaoSucessorio";
import { SecaoProximosPassos } from "./SecaoProximosPassos";
import { SecaoRevisao } from "./SecaoRevisao";
import { EstrategiaPrintAssessor, EstrategiaPrintCliente } from "./EstrategiaPrint";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionStatus = "pendente" | "revisando" | "concluido";

export type SecaoAtiva =
  | "capa"
  | "assetAllocation"
  | "aposentadoria"
  | "protecao"
  | "fiscal"
  | "sucessorio"
  | "proximosPassos"
  | "revisao";

export interface PassoItem {
  id: string;
  prioridade: "alta" | "media" | "baixa";
  texto: string;
  prazo: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_SECTIONS: SecaoAtiva[] = [
  "capa",
  "assetAllocation",
  "aposentadoria",
  "protecao",
  "fiscal",
  "sucessorio",
  "proximosPassos",
];

const DEFAULT_STATUS: Record<SecaoAtiva, SectionStatus> = {
  capa: "pendente",
  assetAllocation: "pendente",
  aposentadoria: "pendente",
  protecao: "pendente",
  fiscal: "pendente",
  sucessorio: "pendente",
  proximosPassos: "pendente",
  revisao: "pendente",
};

const DEFAULT_COMENTARIOS: Record<SecaoAtiva, string> = {
  capa: "",
  assetAllocation: "",
  aposentadoria: "",
  protecao: "",
  fiscal: "",
  sucessorio: "",
  proximosPassos: "",
  revisao: "",
};

interface NavItem {
  id: SecaoAtiva;
  label: string;
  Icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: "capa", label: "Capa e apresentação", Icon: FileText },
  { id: "assetAllocation", label: "Asset Allocation", Icon: PieChartIcon },
  { id: "aposentadoria", label: "Aposentadoria / IF", Icon: Sunset },
  { id: "protecao", label: "Proteção e seguros", Icon: Shield },
  { id: "fiscal", label: "Planejamento fiscal", Icon: Receipt },
  { id: "sucessorio", label: "Planejamento sucessório", Icon: GitBranch },
  { id: "proximosPassos", label: "Próximos passos", Icon: ListChecks },
  { id: "revisao", label: "Revisão final", Icon: ClipboardCheck },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function getStorageKey(plan: FinancialPlan): string {
  return `estrategia_${plan.clientId}_${plan.id || "novo"}`;
}

interface StoredState {
  comentarios: Record<SecaoAtiva, string>;
  statusSecoes: Record<SecaoAtiva, SectionStatus>;
  logoBase64: string | null;
  nomeAssessor: string;
  apresentacao: string;
  proximosPassos: PassoItem[];
  dataProximaReuniao: string;
  consideracoesFinais: string;
}

function loadFromStorage(key: string): Partial<StoredState> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as Partial<StoredState>;
  } catch {
    // ignore parse errors
  }
  return {};
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  plan: FinancialPlan;
  clientName: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EstrategiaInicialPage({ plan, clientName, onClose }: Props) {
  const storageKey = getStorageKey(plan);
  const saved = loadFromStorage(storageKey);

  const [comentarios, setComentarios] = useState<Record<SecaoAtiva, string>>(
    () => ({ ...DEFAULT_COMENTARIOS, ...saved.comentarios })
  );
  const [statusSecoes, setStatusSecoes] = useState<Record<SecaoAtiva, SectionStatus>>(
    () => ({ ...DEFAULT_STATUS, ...saved.statusSecoes })
  );
  const [logoBase64, setLogoBase64] = useState<string | null>(
    () => saved.logoBase64 ?? null
  );
  const [nomeAssessor, setNomeAssessor] = useState<string>(
    () => saved.nomeAssessor ?? ""
  );
  const [apresentacao, setApresentacao] = useState<string>(
    () => saved.apresentacao ?? ""
  );
  const [proximosPassos, setProximosPassos] = useState<PassoItem[]>(
    () => saved.proximosPassos ?? []
  );
  const [dataProximaReuniao, setDataProximaReuniao] = useState<string>(
    () => saved.dataProximaReuniao ?? ""
  );
  const [consideracoesFinais, setConsideracoesFinais] = useState<string>(
    () => saved.consideracoesFinais ?? ""
  );

  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>("capa");
  const [printMode, setPrintMode] = useState<"assessor" | "cliente" | null>(null);

  // ─── Debounced autosave ───────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const persistState = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            comentarios,
            statusSecoes,
            logoBase64,
            nomeAssessor,
            apresentacao,
            proximosPassos,
            dataProximaReuniao,
            consideracoesFinais,
          })
        );
      } catch {
        // ignore storage errors
      }
    }, 1000);
  }, [
    storageKey,
    comentarios,
    statusSecoes,
    logoBase64,
    nomeAssessor,
    apresentacao,
    proximosPassos,
    dataProximaReuniao,
    consideracoesFinais,
  ]);

  useEffect(() => {
    persistState();
    return () => clearTimeout(debounceRef.current);
  }, [persistState]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function setComentario(secao: SecaoAtiva, v: string) {
    setComentarios((prev) => ({ ...prev, [secao]: v }));
  }

  function setStatus(secao: SecaoAtiva, s: SectionStatus) {
    setStatusSecoes((prev) => ({ ...prev, [secao]: s }));
  }

  function handleSave() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          comentarios,
          statusSecoes,
          logoBase64,
          nomeAssessor,
          apresentacao,
          proximosPassos,
          dataProximaReuniao,
          consideracoesFinais,
        })
      );
    } catch {
      // ignore
    }
  }

  function handlePrint(type: "assessor" | "cliente") {
    setPrintMode(type);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 300);
  }

  const completedCount = STATUS_SECTIONS.filter(
    (s) => statusSecoes[s] === "concluido"
  ).length;

  const printProps = {
    plan,
    clientName,
    logoBase64,
    nomeAssessor,
    apresentacao,
    comentarios,
    statusSecoes,
    proximosPassos,
    dataProximaReuniao,
    consideracoesFinais,
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-3 shrink-0 gap-3">
        <h1 className="text-base font-semibold truncate min-w-0">
          Estratégia Inicial · {clientName}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1.5" />
            Salvar rascunho
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrint("assessor")}>
            <Printer className="h-4 w-4 mr-1.5" />
            PDF Assessor
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrint("cliente")}>
            <Printer className="h-4 w-4 mr-1.5" />
            PDF Cliente
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r overflow-y-auto">
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{completedCount} de 7 seções</span>
              </div>
              <Progress value={(completedCount / 7) * 100} className="h-2" />
            </div>

            <nav className="space-y-0.5">
              {NAV_ITEMS.map(({ id, label, Icon }) => {
                const active = secaoAtiva === id;
                const status = statusSecoes[id];
                return (
                  <button
                    key={id}
                    onClick={() => setSecaoAtiva(id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {id !== "revisao" && (
                      status === "concluido" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      ) : status === "revisando" ? (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 opacity-30" />
                      )
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {secaoAtiva === "capa" && (
            <SecaoCapa
              plan={plan}
              logoBase64={logoBase64}
              onLogoChange={setLogoBase64}
              nomeAssessor={nomeAssessor}
              onNomeAssessorChange={setNomeAssessor}
              apresentacao={apresentacao}
              onApresentacaoChange={setApresentacao}
              status={statusSecoes.capa}
              onStatusChange={(s) => setStatus("capa", s)}
            />
          )}

          {secaoAtiva === "assetAllocation" && (
            <SecaoAssetAllocation
              plan={plan}
              comentario={comentarios.assetAllocation}
              onComentarioChange={(v) => setComentario("assetAllocation", v)}
              status={statusSecoes.assetAllocation}
              onStatusChange={(s) => setStatus("assetAllocation", s)}
            />
          )}

          {secaoAtiva === "aposentadoria" && (
            <SecaoAposentadoria
              plan={plan}
              comentario={comentarios.aposentadoria}
              onComentarioChange={(v) => setComentario("aposentadoria", v)}
              status={statusSecoes.aposentadoria}
              onStatusChange={(s) => setStatus("aposentadoria", s)}
            />
          )}

          {secaoAtiva === "protecao" && (
            <SecaoProtecao
              plan={plan}
              comentario={comentarios.protecao}
              onComentarioChange={(v) => setComentario("protecao", v)}
              status={statusSecoes.protecao}
              onStatusChange={(s) => setStatus("protecao", s)}
            />
          )}

          {secaoAtiva === "fiscal" && (
            <SecaoFiscal
              plan={plan}
              comentario={comentarios.fiscal}
              onComentarioChange={(v) => setComentario("fiscal", v)}
              status={statusSecoes.fiscal}
              onStatusChange={(s) => setStatus("fiscal", s)}
            />
          )}

          {secaoAtiva === "sucessorio" && (
            <SecaoSucessorio
              plan={plan}
              comentario={comentarios.sucessorio}
              onComentarioChange={(v) => setComentario("sucessorio", v)}
              status={statusSecoes.sucessorio}
              onStatusChange={(s) => setStatus("sucessorio", s)}
            />
          )}

          {secaoAtiva === "proximosPassos" && (
            <SecaoProximosPassos
              plan={plan}
              comentario={comentarios.proximosPassos}
              onComentarioChange={(v) => setComentario("proximosPassos", v)}
              status={statusSecoes.proximosPassos}
              onStatusChange={(s) => setStatus("proximosPassos", s)}
              proximosPassos={proximosPassos}
              onProximosPassosChange={setProximosPassos}
              dataProximaReuniao={dataProximaReuniao}
              onDataProximaReuniaoChange={setDataProximaReuniao}
              consideracoesFinais={consideracoesFinais}
              onConsideracoesFinaisChange={setConsideracoesFinais}
            />
          )}

          {secaoAtiva === "revisao" && (
            <SecaoRevisao
              statusSecoes={statusSecoes}
              comentarios={comentarios}
              onNavigate={setSecaoAtiva}
              onGerarDocumento={() => handlePrint("assessor")}
            />
          )}
        </main>
      </div>

      {/* Print layers */}
      {printMode === "assessor" && <EstrategiaPrintAssessor {...printProps} />}
      {printMode === "cliente" && <EstrategiaPrintCliente {...printProps} />}
    </div>
  );
}
