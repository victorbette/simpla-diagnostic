import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Save, RefreshCw, Loader2 } from "lucide-react";
import { useCotacoes } from "../../hooks/useCotacoes";
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
  return { ...a, card, segmento: a.segmento ?? "", valorBRL: Number(a.valorBRL) || 0, pctCarteira: Number(a.pctCarteira) || 0 };
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
  { n: 2 as Etapa, label: "Recomendada" },
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

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

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
          ...base, ...parsed,
          ativosAtuais: Array.isArray(parsed.ativosAtuais) ? parsed.ativosAtuais.map(migrarAtivo) : base.ativosAtuais,
          ativosRecomendados: Array.isArray(parsed.ativosRecomendados) ? parsed.ativosRecomendados.map(migrarAtivo) : base.ativosRecomendados,
          planoAcao: Array.isArray(parsed.planoAcao) ? parsed.planoAcao.map(migrarItemPlano) : base.planoAcao,
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

  // ── Cotações em tempo real ──────────────────────────────────────────────────
  const { cotacoes, carregando: carregandoCotacoes, erro: erroCotacoes, buscarCotacoes, limparCache } = useCotacoes();

  const atualizarCotacoes = useCallback(() => {
    const tickers = ativosAtuais
      .filter((a) => {
        const nome = (a.nome ?? "").trim();
        return ["acoes", "fiis", "exterior", "cripto"].includes(a.card) && nome.length >= 2;
      })
      .map((a) => ({
        ticker: (a.nome ?? "").trim(),
        tipo: a.card as "acoes" | "fiis" | "exterior" | "cripto",
      }));
    if (tickers.length > 0) buscarCotacoes(tickers);
  }, [ativosAtuais, buscarCotacoes]);

  const handleAtualizarCotacoes = useCallback(() => {
    limparCache();
    atualizarCotacoes();
  }, [limparCache, atualizarCotacoes]);

  // Dispara busca com debounce sempre que nomes de ativos mudam (etapas 1 e 2)
  const nomesAtivos = ativosAtuais
    .map((a) => (a.nome ?? "").trim())
    .filter((n) => n.length >= 2)
    .join(",");

  const cotacoesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (etapa !== 1 && etapa !== 2) return;
    if (cotacoesDebounceRef.current) clearTimeout(cotacoesDebounceRef.current);
    cotacoesDebounceRef.current = setTimeout(() => {
      atualizarCotacoes();
    }, 1000);
    return () => {
      if (cotacoesDebounceRef.current) clearTimeout(cotacoesDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, nomesAtivos]);

  // ────────────────────────────────────────────────────────────────────────────

  function patch(p: Partial<State>) { setState((prev) => ({ ...prev, ...p })); }
  function handleAtivosAtuais(ativos: Ativo[]) { patch({ ativosAtuais: atualizarPcts(ativos, usdBrl) }); }
  function handleUsdBrl(v: number) { patch({ usdBrl: v, ativosAtuais: atualizarPcts(ativosAtuais, v) }); }
  function handleAtivosRec(ativos: Ativo[]) { patch({ ativosRecomendados: ativos }); }

  function goToEtapa(n: Etapa) {
    if (n === 3) {
      const plano = gerarPlanoAcao(ativosAtuais, ativosRecomendados, patrimonio, usdBrl);
      patch({ planoAcao: plano });
    }
    setEtapa(n);
  }

  function handleNext() { if (etapa < 4) goToEtapa((etapa + 1) as Etapa); }
  function handleBack() { if (etapa > 1) setEtapa((etapa - 1) as Etapa); }

  function handleSave() {
    const resultado: CarteiraResultado = {
      clientId, patrimonio, ativosAtuais, ativosRecomendados, planoAcao, notaConsultor,
      dataElaboracao: new Date().toISOString(), usdBrl,
    };
    try { localStorage.setItem(storageKey, JSON.stringify({ ...state, savedAt: new Date().toISOString() })); } catch {}
    onSave?.(resultado);
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", backgroundColor: "#F0F7FF" }}>

      {/* ── HEADER ── */}
      <header style={{
        backgroundColor: "#1E3A8A", flexShrink: 0,
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: "50%",
            border: "none", cursor: "pointer", flexShrink: 0,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
        >
          <X style={{ width: 16, height: 16, color: "#93C5FD" }} />
        </button>

        <span style={{ color: "white", fontSize: 15, fontWeight: 500, flexShrink: 0 }}>Gestão de Carteira</span>
        <span style={{ color: "#93C5FD", fontSize: 13, flexShrink: 0 }}>{clientName}</span>
        {clientProfile && (
          <span style={{
            backgroundColor: "rgba(255,255,255,0.15)", color: "#93C5FD",
            borderRadius: 999, fontSize: 11, padding: "2px 8px", flexShrink: 0,
          }}>
            {PERFIL_LABELS[clientProfile] ?? clientProfile}
          </span>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ color: "#93C5FD", fontSize: 11, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          ● Dados salvos automaticamente
        </span>

        {/* Atualizar cotações — visível nas etapas 1 e 2 */}
        {etapa <= 2 && (
          <>
            <button
              onClick={handleAtualizarCotacoes}
              disabled={carregandoCotacoes}
              style={{
                background: "transparent",
                border: "0.5px solid rgba(255,255,255,0.3)",
                color: "#93C5FD", borderRadius: 6,
                padding: "4px 10px", fontSize: 11,
                cursor: carregandoCotacoes ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                opacity: carregandoCotacoes ? 0.7 : 1,
              }}
            >
              {carregandoCotacoes
                ? <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />Atualizando...</>
                : <><RefreshCw style={{ width: 12, height: 12 }} />Atualizar cotações</>
              }
            </button>
            {erroCotacoes && (
              <span style={{ fontSize: 11, color: "#FCA5A5", flexShrink: 0 }}>⚠ Erro ao buscar cotações</span>
            )}
          </>
        )}

        <button
          onClick={() => {
            if (window.confirm("Limpar todos os dados da carteira?")) {
              setState(makeInitial(clientProfile, patrimonyInicial));
              try { localStorage.removeItem(storageKey); } catch {}
            }
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.2)", color: "white",
            backgroundColor: "rgba(255,255,255,0.08)", fontSize: 11,
            padding: "4px 10px", borderRadius: 6, cursor: "pointer", flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
        >
          Limpar dados
        </button>
        {patrimonio > 0 && (
          <div style={{
            backgroundColor: "#2563EB", color: "white",
            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, flexShrink: 0,
          }}>
            Patrimônio {formatBRL(patrimonio)}
          </div>
        )}
      </header>

      {/* ── STEPPER ── */}
      <div style={{
        flexShrink: 0, padding: "10px 20px",
        backgroundColor: "white", borderBottom: "0.5px solid #BFDBFE",
        overflowX: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: "max-content", gap: 0 }}>
          {ETAPAS.map((e, i) => {
            const isCurrent = e.n === etapa;
            const isDone = e.n < etapa;
            const isPending = e.n > etapa;
            return (
              <div key={e.n} style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => !isPending && goToEtapa(e.n)}
                  disabled={isPending}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    cursor: isPending ? "default" : "pointer",
                    background: "none", border: "none", padding: "2px 6px",
                  }}
                >
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, fontSize: 12,
                    ...(isDone
                      ? { backgroundColor: "#15803D", color: "white" }
                      : isCurrent
                      ? { backgroundColor: "#2563EB", color: "white", fontWeight: 500 }
                      : { border: "1.5px solid #BFDBFE", color: "#9CA3AF" }),
                  }}>
                    {isDone ? "✓" : e.n}
                  </span>
                  <span style={{
                    fontSize: 12, whiteSpace: "nowrap" as const,
                    ...(isDone
                      ? { color: "#15803D" }
                      : isCurrent
                      ? { color: "#2563EB", fontWeight: 500 }
                      : { color: "#9CA3AF" }),
                  }}>
                    {e.label}
                  </span>
                </button>
                {i < ETAPAS.length - 1 && (
                  <div style={{
                    width: 28, height: 0, margin: "0 4px", flexShrink: 0,
                    borderTop: `1.5px ${isPending ? "dashed" : "solid"} ${isDone ? "#15803D" : "#BFDBFE"}`,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {etapa === 1 && (
          <Etapa1CarteiraAtual
            ativos={ativosAtuais}
            onAtivos={handleAtivosAtuais}
            usdBrl={usdBrl}
            onUsdBrl={handleUsdBrl}
            cotacoes={cotacoes}
            carregandoCotacoes={carregandoCotacoes}
            onBuscarCotacao={buscarCotacoes}
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

      {/* ── FOOTER ── */}
      <footer style={{
        flexShrink: 0, backgroundColor: "white",
        borderTop: "0.5px solid #BFDBFE", padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={etapa === 1 ? onClose : handleBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            border: "1px solid #BFDBFE", borderRadius: 6,
            padding: "6px 12px", fontSize: 13, fontWeight: 500,
            color: "#374151", backgroundColor: "transparent", cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0F7FF")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          {etapa === 1 ? "Fechar" : "Anterior"}
        </button>

        <span style={{ fontSize: 12, color: "#6B7280" }}>Etapa {etapa} de 4</span>

        {etapa < 4 ? (
          <button
            onClick={handleNext}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              backgroundColor: "#2563EB", color: "white",
              border: "none", borderRadius: 6,
              padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D4ED8")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
          >
            {etapa === 3 ? "Ver resultado" : "Próxima etapa"}
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              backgroundColor: "#15803D", color: "white",
              border: "none", borderRadius: 6,
              padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#166534")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#15803D")}
          >
            <Save style={{ width: 14, height: 14 }} />
            Salvar carteira
          </button>
        )}
      </footer>
    </div>
  );
}

// re-export so callers can use genId for temporary ativo construction
export { genId };
