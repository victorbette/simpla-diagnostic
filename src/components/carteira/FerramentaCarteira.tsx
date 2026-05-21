import { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ativo, ItemPlanoAcao, CarteiraResultado, SimplaCardId } from "@/lib/carteira/types";
import {
  calcularPatrimonio,
  atualizarPcts,
  ativosIniciais,
  gerarPlanoAcao,
  formatBRL,
  genId,
} from "@/lib/carteira/calculos";

const VALID_CARDS: SimplaCardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrarAtivo(a: any): Ativo {
  const rawCard = a.card ?? a.classe ?? a.klass;
  const card: SimplaCardId = VALID_CARDS.includes(rawCard) ? rawCard : "resgate_rapido";
  return {
    ...a,
    card,
    segmento: a.segmento ?? "",
    valorBRL: Number(a.valorBRL) || 0,
    pctCarteira: Number(a.pctCarteira) || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrarItemPlano(p: any): ItemPlanoAcao {
  const rawCard = p.card ?? p.classe ?? p.klass;
  const card: SimplaCardId = VALID_CARDS.includes(rawCard) ? rawCard : "resgate_rapido";
  return { ...p, card, segmento: p.segmento ?? "" };
}
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = JSON.parse(raw) as any;
        const base = makeInitial(clientProfile, patrimonyInicial);
        return {
          ...base,
          ...parsed,
          ativosAtuais: Array.isArray(parsed.ativosAtuais)
            ? parsed.ativosAtuais.map(migrarAtivo)
            : base.ativosAtuais,
          ativosRecomendados: Array.isArray(parsed.ativosRecomendados)
            ? parsed.ativosRecomendados.map(migrarAtivo)
            : base.ativosRecomendados,
          planoAcao: Array.isArray(parsed.planoAcao)
            ? parsed.planoAcao.map(migrarItemPlano)
            : base.planoAcao,
        };
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#F5F3EE" }}>
      {/* Header */}
      <header className="shrink-0" style={{ backgroundColor: "#000000" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-white" style={{ fontSize: "18px" }}>
                Gestão de Carteira
              </span>
              <span className="text-sm font-medium" style={{ color: "#BBA866" }}>
                {clientName}
              </span>
              {clientProfile && (
                <span
                  className="rounded-full text-xs px-2 py-0.5 text-white"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  {PERFIL_LABELS[clientProfile] ?? clientProfile}
                </span>
              )}
            </div>
          </div>
          {patrimonio > 0 && (
            <div
              className="shrink-0 text-right rounded-md px-3 py-1.5 border"
              style={{ borderColor: "#BBA866" }}
            >
              <p className="text-xs" style={{ color: "#BBA866" }}>Patrimônio</p>
              <p className="font-semibold text-sm text-white">{formatBRL(patrimonio)}</p>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex items-center min-w-max">
            {ETAPAS.map((e, i) => {
              const isCurrent = e.n === etapa;
              const isDone = e.n < etapa;
              return (
                <div key={e.n} className="flex items-center">
                  <button
                    onClick={() => e.n <= etapa && goToEtapa(e.n)}
                    disabled={e.n > etapa}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 transition-colors rounded",
                      e.n > etapa ? "cursor-default" : "cursor-pointer",
                    )}
                  >
                    {/* Circle indicator */}
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
                      style={
                        isDone
                          ? { backgroundColor: "#3D6B41", color: "#fff" }
                          : isCurrent
                          ? { backgroundColor: "#fff", color: "#000000" }
                          : { backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", border: "1.5px solid rgba(255,255,255,0.3)" }
                      }
                    >
                      {isDone ? "✓" : e.n}
                    </span>
                    {/* Label */}
                    <span
                      className="text-xs font-medium whitespace-nowrap"
                      style={
                        isCurrent
                          ? { color: "#fff" }
                          : isDone
                          ? { color: "rgba(255,255,255,0.7)" }
                          : { color: "rgba(255,255,255,0.35)" }
                      }
                    >
                      {e.label}
                    </span>
                  </button>
                  {i < ETAPAS.length - 1 && (
                    <div
                      className="mx-1 shrink-0"
                      style={{
                        width: "24px",
                        height: "1.5px",
                        backgroundColor: isDone ? "#3D6B41" : "rgba(255,255,255,0.2)",
                      }}
                    />
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
      <footer
        className="shrink-0 px-4 py-3 border-t"
        style={{ backgroundColor: "#fff", borderColor: "#E2DCC8" }}
      >
        <div className="mx-auto max-w-screen-xl flex items-center justify-between">
          <button
            onClick={etapa === 1 ? onClose : handleBack}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ borderColor: "#000000", color: "#000000", backgroundColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(4,26,32,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ChevronLeft className="h-4 w-4" />
            {etapa === 1 ? "Fechar" : "Anterior"}
          </button>
          <span className="text-xs" style={{ color: "#6B6347" }}>Etapa {etapa} de 4</span>
          {etapa < 4 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#000000" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0a2e38")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#000000")}
            >
              {etapa === 3 ? "Ver resultado" : "Próxima etapa"}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#000000" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0a2e38")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#000000")}
            >
              Salvar carteira
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

// re-export so callers can use genId for temporary ativo construction
export { genId };
