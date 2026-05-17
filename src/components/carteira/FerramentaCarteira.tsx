import { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ativo, ItemPlanoAcao, CarteiraResultado } from "@/lib/carteira/types";
import {
  calcularPatrimonio,
  atualizarPcts,
  ativosIniciais,
  gerarPlanoAcao,
  formatBRL,
  genId,
} from "@/lib/carteira/calculos";
import { Etapa1CarteiraAtual } from "./Etapa1CarteiraAtual";
import { Etapa2CarteiraRecomendada } from "./Etapa2CarteiraRecomendada";
import { Etapa3PlanoAcao } from "./Etapa3PlanoAcao";
import { Etapa4Resultado } from "./Etapa4Resultado";

interface Props {
  clientName: string;
  clientId: string;
  clientProfile: "conservador" | "conservador_moderado" | "moderado" | "arrojado" | null;
  patrimonyInicial?: number;
  onClose: () => void;
  onSave?: (r: CarteiraResultado) => void;
}

type Etapa = 1 | 2 | 3 | 4;

const ETAPAS = [
  { n: 1 as Etapa, label: "Carteira Atual" },
  { n: 2 as Etapa, label: "Carteira Recomendada" },
  { n: 3 as Etapa, label: "Plano de Ação" },
  { n: 4 as Etapa, label: "Resultado" },
];

interface State {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  planoAcao: ItemPlanoAcao[];
  usdBrl: number;
  notaConsultor: string;
}

function makeInitial(perfil: string | null, patrimonio: number): State {
  return {
    ativosAtuais: [],
    ativosRecomendados: ativosIniciais(perfil, patrimonio),
    planoAcao: [],
    usdBrl: 5,
    notaConsultor: "",
  };
}

export function FerramentaCarteira({
  clientName, clientId, clientProfile, patrimonyInicial = 0, onClose, onSave,
}: Props) {
  const storageKey = `carteira_v2_${clientId}`;

  const [etapa, setEtapa] = useState<Etapa>(1);
  const [state, setState] = useState<State>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        return { ...makeInitial(clientProfile, patrimonyInicial), ...parsed };
      }
    } catch {}
    return makeInitial(clientProfile, patrimonyInicial);
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [state, storageKey]);

  const { ativosAtuais, ativosRecomendados, planoAcao, usdBrl, notaConsultor } = state;

  const patrimonio = useMemo(
    () => calcularPatrimonio(ativosAtuais, usdBrl) || patrimonyInicial,
    [ativosAtuais, usdBrl, patrimonyInicial],
  );

  function patch(p: Partial<State>) {
    setState((prev) => ({ ...prev, ...p }));
  }

  function handleAtivosAtuais(ativos: Ativo[]) {
    patch({ ativosAtuais: atualizarPcts(ativos, usdBrl) });
  }

  function handleUsdBrl(v: number) {
    patch({ usdBrl: v, ativosAtuais: atualizarPcts(ativosAtuais, v) });
  }

  function handleAtivosRec(ativos: Ativo[]) {
    patch({ ativosRecomendados: ativos });
  }

  function goToEtapa(n: Etapa) {
    if (n === 3) {
      const plano = gerarPlanoAcao(ativosAtuais, ativosRecomendados, patrimonio, usdBrl);
      patch({ planoAcao: plano });
    }
    setEtapa(n);
  }

  function handleNext() {
    if (etapa < 4) goToEtapa((etapa + 1) as Etapa);
  }

  function handleBack() {
    if (etapa > 1) setEtapa((etapa - 1) as Etapa);
  }

  function handleSave() {
    const resultado: CarteiraResultado = {
      clientId,
      patrimonio,
      ativosAtuais,
      ativosRecomendados,
      planoAcao,
      notaConsultor,
      dataElaboracao: new Date().toISOString(),
      usdBrl,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    } catch {}
    onSave?.(resultado);
  }

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const PERFIL_LABELS: Record<string, string> = {
    conservador: "Conservador",
    conservador_moderado: "Conservador Moderado",
    moderado: "Moderado",
    arrojado: "Arrojado",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold">Gestão de Carteira</span>
              <span className="text-muted-foreground text-sm">{clientName}</span>
              {clientProfile && (
                <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                  {PERFIL_LABELS[clientProfile] ?? clientProfile}
                </span>
              )}
            </div>
          </div>
          {patrimonio > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">Patrimônio</p>
              <p className="font-semibold text-sm">{formatBRL(patrimonio)}</p>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {ETAPAS.map((e, i) => {
              const isCurrent = e.n === etapa;
              const isDone = e.n < etapa;
              return (
                <div key={e.n} className="flex items-center">
                  <button
                    onClick={() => e.n <= etapa && goToEtapa(e.n)}
                    disabled={e.n > etapa}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      isCurrent ? "bg-primary text-primary-foreground" :
                      isDone ? "text-foreground hover:bg-muted cursor-pointer" :
                      "text-muted-foreground cursor-default",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className={cn("h-3.5 w-3.5 shrink-0", isCurrent ? "" : "opacity-40")} />
                    )}
                    {e.n}. {e.label}
                  </button>
                  {i < ETAPAS.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-0.5 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-screen-xl px-4 py-6">
          {etapa === 1 && (
            <Etapa1CarteiraAtual
              ativos={ativosAtuais}
              onAtivos={handleAtivosAtuais}
              usdBrl={usdBrl}
              onUsdBrl={handleUsdBrl}
            />
          )}
          {etapa === 2 && (
            <Etapa2CarteiraRecomendada
              ativosRec={ativosRecomendados}
              onAtivosRec={handleAtivosRec}
              ativosAtuais={ativosAtuais}
              patrimonio={patrimonio}
              clientProfile={clientProfile}
            />
          )}
          {etapa === 3 && (
            <Etapa3PlanoAcao
              planoAcao={planoAcao}
              onPlanoAcao={(p) => patch({ planoAcao: p })}
              patrimonio={patrimonio}
              notaConsultor={notaConsultor}
              onNotaConsultor={(s) => patch({ notaConsultor: s })}
            />
          )}
          {etapa === 4 && (
            <Etapa4Resultado
              ativosAtuais={ativosAtuais}
              ativosRecomendados={ativosRecomendados}
              planoAcao={planoAcao}
              patrimonio={patrimonio}
              notaConsultor={notaConsultor}
              clientName={clientName}
              clientProfile={clientProfile}
              usdBrl={usdBrl}
              onGoToEtapa3={() => setEtapa(3)}
              onSave={handleSave}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t bg-background px-4 py-3">
        <div className="mx-auto max-w-screen-xl flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={etapa === 1 ? onClose : handleBack}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {etapa === 1 ? "Fechar" : "Anterior"}
          </Button>
          <span className="text-xs text-muted-foreground">Etapa {etapa} de 4</span>
          {etapa < 4 ? (
            <Button onClick={handleNext} size="sm">
              {etapa === 3 ? "Ver resultado" : "Próxima etapa"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} size="sm">
              Salvar carteira
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// re-export so callers can use genId for temporary ativo construction
export { genId };
