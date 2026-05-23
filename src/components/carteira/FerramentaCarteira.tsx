import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Save } from "lucide-react";
import type { Ativo, CardId, CarteiraResultado, PlanoAcaoItem } from "@/lib/carteira/types";
import { CARD_ORDER, ALOCACAO_PADRAO } from "@/lib/carteira/types";
import { gerarPlanoAcao, formatBRL } from "@/lib/carteira/calculos";
import { Etapa1CarteiraAtual } from "./Etapa1CarteiraAtual";
import { Etapa2CarteiraRecomendada } from "./Etapa2CarteiraRecomendada";
import { Etapa3PlanoAcao } from "./Etapa3PlanoAcao";
import { Etapa4Resultado } from "./Etapa4Resultado";

interface Props {
  clientId: string;
  clientName: string;
  clientProfile: string | null;
  patrimonyInicial?: number;
  onClose: () => void;
  onSave?: (r: CarteiraResultado) => void;
  onLimpar?: () => void;
}

type Etapa = 1 | 2 | 3 | 4;

const ETAPAS = [
  { n: 1 as Etapa, label: "Carteira Atual" },
  { n: 2 as Etapa, label: "Recomendada" },
  { n: 3 as Etapa, label: "Plano de Ação" },
  { n: 4 as Etapa, label: "Resultado" },
];

const PERFIL_LABELS: Record<string, string> = {
  conservador: "Conservador",
  conservador_moderado: "Cons. Moderado",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

function defaultAlocacao(profile: string | null): Record<CardId, number> {
  if (profile && ALOCACAO_PADRAO[profile]) return { ...ALOCACAO_PADRAO[profile] };
  return { resgate_longo: 0, resgate_rapido: 0, acoes: 0, fiis: 0, exterior: 0, cripto: 0 };
}

interface SavedState {
  ativosAtuais: Ativo[];
  ativosRecomendados: Ativo[];
  alocacaoMeta: Record<CardId, number>;
  planoAcao: PlanoAcaoItem[];
  notasConsultor: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateAtivo(a: any): Ativo {
  const VALID: CardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];
  const card: CardId = VALID.includes(a.card) ? a.card : "resgate_rapido";
  return {
    id: String(a.id ?? Math.random()),
    card,
    nome: String(a.nome ?? ""),
    segmento: String(a.segmento ?? ""),
    vencimento: a.vencimento ? String(a.vencimento) : undefined,
    valorBRL: Number(a.valorBRL) || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateItemPlano(p: any): PlanoAcaoItem {
  const VALID: CardId[] = ["resgate_rapido", "resgate_longo", "acoes", "fiis", "exterior", "cripto"];
  const VALID_TIPO = ["manter", "aportar", "resgatar_parcial", "resgatar_total", "novo"];
  const card: CardId = VALID.includes(p.card) ? p.card : "resgate_rapido";
  const tipo: PlanoAcaoItem["tipo"] = VALID_TIPO.includes(p.tipo) ? p.tipo : "manter";
  return {
    id: String(p.id ?? Math.random()),
    card,
    nomeAtivo: String(p.nomeAtivo ?? p.nome ?? ""),
    segmento: String(p.segmento ?? ""),
    tipo,
    valorAtualBRL: Number(p.valorAtualBRL) || 0,
    valorMetaBRL: Number(p.valorMetaBRL) || 0,
    movimentacaoBRL: Number(p.movimentacaoBRL) || 0,
    observacao: String(p.observacao ?? ""),
    prioridade: ["alta", "media", "baixa"].includes(p.prioridade) ? p.prioridade : "baixa",
  };
}

export function FerramentaCarteira({ clientId, clientName, clientProfile, patrimonyInicial = 0, onClose, onSave, onLimpar }: Props) {
  const storageKey = `carteira_v3_${clientId}`;

  const [etapa, setEtapa] = useState<Etapa>(1);

  const [ativosAtuais, setAtivosAtuais] = useState<Ativo[]>([]);
  const [ativosRecomendados, setAtivosRecomendados] = useState<Ativo[]>([]);
  const [alocacaoMeta, setAlocacaoMeta] = useState<Record<CardId, number>>(() => defaultAlocacao(clientProfile));
  const [planoAcao, setPlanoAcao] = useState<PlanoAcaoItem[]>([]);
  const [notasConsultor, setNotasConsultor] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = JSON.parse(raw) as any;
        if (Array.isArray(parsed.ativosAtuais)) setAtivosAtuais(parsed.ativosAtuais.map(migrateAtivo));
        if (Array.isArray(parsed.ativosRecomendados)) setAtivosRecomendados(parsed.ativosRecomendados.map(migrateAtivo));
        if (parsed.alocacaoMeta && typeof parsed.alocacaoMeta === "object") setAlocacaoMeta({ ...defaultAlocacao(clientProfile), ...parsed.alocacaoMeta });
        if (Array.isArray(parsed.planoAcao)) setPlanoAcao(parsed.planoAcao.map(migrateItemPlano));
        if (typeof parsed.notasConsultor === "string") setNotasConsultor(parsed.notasConsultor);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      try {
        const s: SavedState = { ativosAtuais, ativosRecomendados, alocacaoMeta, planoAcao, notasConsultor };
        localStorage.setItem(storageKey, JSON.stringify(s));
      } catch { /* ignore */ }
    }, 800);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [ativosAtuais, ativosRecomendados, alocacaoMeta, planoAcao, notasConsultor, storageKey, loaded]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const patrimonio = ativosAtuais.reduce((s, a) => s + a.valorBRL, 0) || patrimonyInicial;

  function goToEtapa(n: Etapa) {
    if (n === 3) {
      const novo = gerarPlanoAcao(ativosAtuais, ativosRecomendados, patrimonio);
      setPlanoAcao(novo);
    }
    setEtapa(n);
  }

  function handleNext() { if (etapa < 4) goToEtapa((etapa + 1) as Etapa); }
  function handleBack() { if (etapa > 1) setEtapa((etapa - 1) as Etapa); }

  function handleSave() {
    const resultado: CarteiraResultado = {
      patrimonio,
      ativosAtuais,
      ativosRecomendados,
      alocacaoMeta,
      planoAcao,
    };
    try { localStorage.setItem(storageKey, JSON.stringify({ ativosAtuais, ativosRecomendados, alocacaoMeta, planoAcao, notasConsultor, savedAt: new Date().toISOString() })); } catch { /* ignore */ }
    onSave?.(resultado);
  }

  function handleLimpar() {
    if (window.confirm("Limpar todos os dados da carteira?\n\nIsso removerá também os dados de Asset Allocation da Estratégia.")) {
      setAtivosAtuais([]);
      setAtivosRecomendados([]);
      setAlocacaoMeta(defaultAlocacao(clientProfile));
      setPlanoAcao([]);
      setNotasConsultor("");
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      onLimpar?.();
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", backgroundColor: "#F0F7FF" }}>

      {/* ── HEADER ── */}
      <header style={{ backgroundColor: "#1E3A8A", flexShrink: 0, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
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
          <span style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#93C5FD", borderRadius: 999, fontSize: 11, padding: "2px 8px", flexShrink: 0 }}>
            {PERFIL_LABELS[clientProfile] ?? clientProfile}
          </span>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ color: "#93C5FD", fontSize: 11, flexShrink: 0 }}>● Dados salvos automaticamente</span>

        <button
          onClick={handleLimpar}
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
          <div style={{ backgroundColor: "#2563EB", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
            Patrimônio {formatBRL(patrimonio)}
          </div>
        )}
      </header>

      {/* ── STEPPER ── */}
      <div style={{ flexShrink: 0, padding: "10px 20px", backgroundColor: "white", borderBottom: "1px solid #BFDBFE", overflowX: "auto" }}>
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
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: isPending ? "default" : "pointer", background: "none", border: "none", padding: "2px 6px" }}
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
                    fontSize: 12, whiteSpace: "nowrap",
                    ...(isDone ? { color: "#15803D" } : isCurrent ? { color: "#2563EB", fontWeight: 500 } : { color: "#9CA3AF" }),
                  }}>
                    {e.label}
                  </span>
                </button>
                {i < ETAPAS.length - 1 && (
                  <div style={{ width: 28, height: 0, margin: "0 4px", flexShrink: 0, borderTop: `1.5px ${isPending ? "dashed" : "solid"} ${isDone ? "#15803D" : "#BFDBFE"}` }} />
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
            onAtivos={setAtivosAtuais}
            patrimonio={patrimonio}
          />
        )}
        {etapa === 2 && (
          <Etapa2CarteiraRecomendada
            ativos={ativosRecomendados}
            onAtivos={setAtivosRecomendados}
            ativosAtuais={ativosAtuais}
            alocacaoMeta={alocacaoMeta}
            onAlocacaoMeta={setAlocacaoMeta}
            patrimonio={patrimonio}
            clientProfile={clientProfile}
          />
        )}
        {etapa === 3 && (
          <Etapa3PlanoAcao
            planoAcao={planoAcao}
            onPlanoAcao={setPlanoAcao}
            notasConsultor={notasConsultor}
            onNotasConsultor={setNotasConsultor}
            patrimonio={patrimonio}
          />
        )}
        {etapa === 4 && (
          <Etapa4Resultado
            ativosAtuais={ativosAtuais}
            ativosRecomendados={ativosRecomendados}
            alocacaoMeta={alocacaoMeta}
            planoAcao={planoAcao}
            patrimonio={patrimonio}
            onSave={handleSave}
          />
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ flexShrink: 0, backgroundColor: "white", borderTop: "1px solid #BFDBFE", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={etapa === 1 ? onClose : handleBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            border: "1px solid #BFDBFE", borderRadius: 6, padding: "6px 12px",
            fontSize: 13, fontWeight: 500, color: "#374151", backgroundColor: "transparent", cursor: "pointer",
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
              border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
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
              border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
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

// Re-export for consumers that import genId from here
export { genId } from "@/lib/carteira/calculos";

// Re-export CARD_ORDER for any existing consumers
export { CARD_ORDER };
