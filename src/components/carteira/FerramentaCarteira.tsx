import { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AtivoItem, PlanoAcaoItem, CarteiraResultado } from "@/lib/carteira/types";
import {
  derivarMacro,
  derivarMacroPorMeta,
  atualizarPctAtual,
  totalPatrimonioBRL,
  gerarPlanoAcao,
  formatBRL,
} from "@/lib/carteira/calculos";
import { Etapa1AlocacaoAtual } from "./Etapa1AlocacaoAtual";
import { Etapa2AlocacaoIdeal } from "./Etapa2AlocacaoIdeal";
import { Etapa3PlanoAcao } from "./Etapa3PlanoAcao";
import { Etapa4Resultado } from "./Etapa4Resultado";

interface Props {
  clientName: string;
  clientId: string;
  clientProfile: string | null;
  patrimonyInicial: number;
  onClose: () => void;
  onSave: (resultado: CarteiraResultado) => void;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Carteira atual", "Alocação ideal", "Plano de ação", "Resultado"];

interface CarteiraState {
  step: Step;
  ativosAtuais: AtivoItem[];
  ativosMeta: AtivoItem[];
  planoAcao: PlanoAcaoItem[];
  usdBrl: number;
  observacoesGerais: string;
}

function makeInitialState(): CarteiraState {
  return {
    step: 1,
    ativosAtuais: [],
    ativosMeta: [],
    planoAcao: [],
    usdBrl: 5,
    observacoesGerais: "",
  };
}

export function FerramentaCarteira({
  clientName, clientId, clientProfile, patrimonyInicial, onClose, onSave,
}: Props) {
  const storageKey = `carteira_${clientId}`;

  const [state, setState] = useState<CarteiraState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...makeInitialState(), ...JSON.parse(raw) };
    } catch {}
    return makeInitialState();
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {}
    }, 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [state, storageKey]);

  const { step, ativosAtuais, ativosMeta, planoAcao, usdBrl, observacoesGerais } = state;

  const patrimonio = useMemo(
    () => totalPatrimonioBRL(ativosAtuais, usdBrl) || patrimonyInicial,
    [ativosAtuais, usdBrl, patrimonyInicial],
  );

  const macroAtual = useMemo(() => derivarMacro(ativosAtuais, usdBrl), [ativosAtuais, usdBrl]);
  const macroMeta = useMemo(() => derivarMacroPorMeta(ativosMeta), [ativosMeta]);

  function patch(p: Partial<CarteiraState>) {
    setState((prev) => ({ ...prev, ...p }));
  }

  function handleAtivosAtuaisChange(ativos: AtivoItem[]) {
    patch({ ativosAtuais: atualizarPctAtual(ativos, usdBrl) });
  }

  function handleUsdBrlChange(v: number) {
    patch({ usdBrl: v, ativosAtuais: atualizarPctAtual(ativosAtuais, v) });
  }

  function handleAtivosMeta(ativos: AtivoItem[]) {
    patch({ ativosMeta: ativos });
  }

  function goToStep(s: Step) {
    if (s === 3) {
      const newPlano = gerarPlanoAcao(ativosAtuais, ativosMeta, patrimonio, usdBrl);
      patch({ step: s, planoAcao: newPlano });
    } else {
      patch({ step: s });
    }
  }

  function handleNext() {
    if (step < 4) goToStep((step + 1) as Step);
  }

  function handleBack() {
    if (step > 1) patch({ step: (step - 1) as Step });
  }

  function handleSave() {
    const resultado: CarteiraResultado = {
      patrimonio,
      ativosAtuais,
      ativosMeta,
      macroAtual,
      macroMeta: derivarMacroPorMeta(ativosMeta),
      planoAcao,
      observacoes: observacoesGerais,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    } catch {}
    onSave(resultado);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-sm">Gestão de Carteira</span>
              <span className="text-muted-foreground text-sm">{clientName}</span>
              {clientProfile && (
                <span className="text-xs text-muted-foreground capitalize">· {clientProfile}</span>
              )}
              {patrimonio > 0 && (
                <span className="text-xs text-muted-foreground">· {formatBRL(patrimonio)}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step indicators */}
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEP_LABELS.map((label, i) => {
              const s = (i + 1) as Step;
              const isCurrent = s === step;
              const isDone = s < step;
              return (
                <button
                  key={s}
                  onClick={() => s <= step && goToStep(s)}
                  disabled={s > step}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "text-foreground hover:bg-muted cursor-pointer"
                      : "text-muted-foreground cursor-default",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className={cn("h-3.5 w-3.5 shrink-0", isCurrent ? "opacity-100" : "opacity-40")} />
                  )}
                  {s}. {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {step === 1 && (
            <Etapa1AlocacaoAtual
              ativos={ativosAtuais}
              onAtivos={handleAtivosAtuaisChange}
              usdBrl={usdBrl}
              onUsdBrl={handleUsdBrlChange}
            />
          )}
          {step === 2 && (
            <Etapa2AlocacaoIdeal
              ativosMeta={ativosMeta}
              onAtivosMeta={handleAtivosMeta}
              ativosAtuais={ativosAtuais}
              patrimonio={patrimonio}
              clientProfile={clientProfile}
              macroAtual={macroAtual}
              usdBrl={usdBrl}
            />
          )}
          {step === 3 && (
            <Etapa3PlanoAcao
              planoAcao={planoAcao}
              onPlanoAcao={(p) => patch({ planoAcao: p })}
              patrimonio={patrimonio}
              observacoes={observacoesGerais}
              onObservacoes={(s) => patch({ observacoesGerais: s })}
            />
          )}
          {step === 4 && (
            <Etapa4Resultado
              ativosAtuais={ativosAtuais}
              ativosMeta={ativosMeta}
              macroAtual={macroAtual}
              macroMeta={macroMeta}
              planoAcao={planoAcao}
              patrimonio={patrimonio}
              clientName={clientName}
              clientProfile={clientProfile}
              observacoes={observacoesGerais}
              onSave={handleSave}
            />
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="shrink-0 border-t bg-background px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Button variant="ghost" size="sm" onClick={step === 1 ? onClose : handleBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {step === 1 ? "Fechar" : "Anterior"}
          </Button>
          <div className="flex items-center gap-2">
            {step < 4 && (
              <Button onClick={handleNext}>
                {step === 3 ? "Ver resultado" : "Próximo"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleSave}>Salvar carteira</Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
