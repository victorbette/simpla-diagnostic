import { useState, useEffect, useMemo, useRef } from "react";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import {
  calcularProjecaoIF,
  calcularProjecao,
  calcularPatrimonioPerpetuidade,
  calcularAporteMensalNecessario,
  calcularIdadeComAporte,
  TAXA_ACUM_ANUAL,
  TAXA_ACUM_MENSAL,
  type ProjecaoIFParams,
  type ProjecaoIFResult,
} from "@/lib/financialFreedomCalc";
import type { PlanejamentoIF, DadosCliente } from "@/types/financialPlanning";
import type { ResultadoIF } from "@/types/estrategiaResultados";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { GraficoIF } from "@/components/shared/GraficoIF";
import { ListaObjetivos } from "@/components/shared/ListaObjetivos";

interface Props {
  clientId: string;
  planejamentoIF: PlanejamentoIF;
  dataNascimento?: string;
  dadosCliente?: DadosCliente;
  resultadoIF?: ResultadoIF | null;
  onSave: (params: ProjecaoIFParams, objetivos: ObjetivoVida[], result: ProjecaoIFResult, taxaTravadaInfo: { taxaTravada: boolean; taxaTravadaValor: number | null }) => Promise<void>;
}

interface UIParams {
  idadeAtual: number;
  idadeAposentadoria: number;
  patrimonioInicial: number;
  aporteMensal: number;
  rendaDesejada: number;
}

const cardGreenTop: React.CSSProperties = {
  border: "0.5px solid #E5E7EB",
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const badgeColetaStyle: React.CSSProperties = {
  backgroundColor: "#DBEAFE",
  color: "#1E40AF",
  borderRadius: 9999,
  padding: "2px 6px",
  fontSize: 10,
  fontWeight: 600,
  marginLeft: 6,
};

const VALID_TIPOS = new Set(Object.keys(OBJETIVO_META));

/** Parse "YYYY-MM-DD" or "DD/MM/YYYY" → { ano, mes } */
function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

/** Migrate objectives saved in old format ({ nome, valor, idadeRealizacao }) */
function migrateObjetivo(
  o: Record<string, unknown>,
  anoNascimento: number,
  mesNascimento: number,
): ObjetivoVida {
  if (typeof o.mes === "number" && typeof o.ano === "number" && typeof o.valorBRL === "number") {
    return o as unknown as ObjetivoVida;
  }
  const idadeReal = Number(o.idadeRealizacao) || 0;
  return {
    id: String(o.id ?? Math.random().toString(36).substring(2, 9)),
    tipo: o.tipo as ObjetivoVida["tipo"],
    label: String(o.nome ?? o.label ?? "Objetivo"),
    mes: mesNascimento,
    ano: anoNascimento + Math.floor(idadeReal),
    valorBRL: Number(o.valor ?? o.valorBRL ?? 0),
  };
}

export function FerramentaLiberdadeFinanceira({
  clientId, planejamentoIF, dataNascimento, dadosCliente, resultadoIF, onSave,
}: Props) {
  // ── Birth date → age + anoNascimento/mesNascimento ─────────────────────────
  const parsed = parseDateNasc(dataNascimento ?? "");
  const anoNascimento = parsed?.ano ?? (new Date().getFullYear() - planejamentoIF.idadeAtual);
  const mesNascimento = parsed?.mes ?? 1;

  const idadeAtualCalculada = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : (planejamentoIF.idadeAtual || 0);

  // ── "Da coleta" reference values ───────────────────────────────────────────
  const patrimonioColeta    = Number(dadosCliente?.patrimonioFinanceiroEstimado) || 0;
  const aporteColeta        = Number(dadosCliente?.aportesMensalMedio)           || 0;
  const rendaDesejadaColeta = Number(planejamentoIF.rendaMensalDesejada)         || 0;

  const initialParams: UIParams = {
    idadeAtual:         idadeAtualCalculada,
    idadeAposentadoria: planejamentoIF.idadeMeta,
    patrimonioInicial:  patrimonioColeta || planejamentoIF.patrimonioAtual,
    aporteMensal:       aporteColeta     || planejamentoIF.aporteMensal,
    rendaDesejada:      rendaDesejadaColeta || planejamentoIF.rendaMensalDesejada,
  };

  const [params, setParams] = useState<UIParams>(initialParams);
  const [patrimonioEditado, setPatrimonioEditado] = useState(false);
  const [rendaEditada,      setRendaEditada]       = useState(false);
  const [objetivos, setObjetivos] = useState<ObjetivoVida[]>([]);
  const [sensTab, setSensTab] = useState<"aporte" | "prazo">("aporte");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const CHAVE = `ferramenta_if_${clientId}`;

  useFerramentaStorage(
    CHAVE,
    { params, objetivos },
    (v) => {
      if (v.params) setParams({ ...initialParams, ...v.params, idadeAtual: idadeAtualCalculada });
      if (v.objetivos) {
        const migrados = (v.objetivos as unknown as Record<string, unknown>[])
          .map((o) => migrateObjetivo(o, anoNascimento, mesNascimento))
          .filter((o) => VALID_TIPOS.has(o.tipo));
        setObjetivos(migrados);
      }
    },
    { params: initialParams, objetivos: [] },
  );

  const setP = (patch: Partial<UIParams>) => setParams((p) => ({ ...p, ...patch }));

  // ── Sync coleta changes to un-edited fields ────────────────────────────────
  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      idadeAtual:        idadeAtualCalculada,
      patrimonioInicial: !patrimonioEditado ? patrimonioColeta : prev.patrimonioInicial,
      rendaDesejada:     !rendaEditada      ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, rendaDesejadaColeta]);

  // ── Initialize from Supabase data when it first arrives ───────────────────
  const initializedFromSupabaseRef = useRef(false);
  useEffect(() => {
    if (resultadoIF && !initializedFromSupabaseRef.current) {
      initializedFromSupabaseRef.current = true;
      setParams((prev) => ({
        ...prev,
        idadeAposentadoria: resultadoIF.idadeMeta,
        patrimonioInicial:  resultadoIF.patrimonioAtual,
        aporteMensal:       resultadoIF.aporteAtual,
        rendaDesejada:      resultadoIF.rendaMensalDesejada,
      }));
      setPatrimonioEditado(resultadoIF.patrimonioAtual !== patrimonioColeta);
      setRendaEditada(resultadoIF.rendaMensalDesejada !== rendaDesejadaColeta);
      if (resultadoIF.objetivos) setObjetivos(resultadoIF.objetivos);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultadoIF]);

  // Only objectives with ativo !== false impact the projection
  const objetivosAtivos = useMemo(() => objetivos.filter(o => o.ativo !== false), [objetivos]);

  const patrimonioPerpetuidade = useMemo(() => {
    if (!params.rendaDesejada || params.rendaDesejada <= 0) return 0;
    return calcularPatrimonioPerpetuidade(params.rendaDesejada);
  }, [params.rendaDesejada]);

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual:           params.idadeAtual,
    idadeMeta:            params.idadeAposentadoria,
    idadeMaxima:          100,
    patrimonioInicial:    params.patrimonioInicial,
    aporteMensal:         params.aporteMensal,
    rendaMensalDesejada:  params.rendaDesejada,
    taxaRetornoAnual:     TAXA_ACUM_ANUAL,
    anoNascimento,
    mesNascimento,
    objetivos:            objetivosAtivos,
  }), [
    params.idadeAtual, params.idadeAposentadoria, params.patrimonioInicial,
    params.aporteMensal, params.rendaDesejada,
    objetivosAtivos, anoNascimento, mesNascimento,
  ]);

  const result = useMemo(() => {
    try {
      return calcularProjecaoIF(projecaoParams);
    } catch (err) {
      console.error("[SimuladorIF] Erro no cálculo:", err);
      return null;
    }
  }, [projecaoParams]);

  const aporteNecessario = useMemo(() => {
    if (patrimonioPerpetuidade <= 0) return 0;
    const n = Math.max(1, (params.idadeAposentadoria - params.idadeAtual) * 12);
    const f = Math.pow(1 + TAXA_ACUM_MENSAL, n);
    const fvSemAporte = params.patrimonioInicial * f;
    const anoCard = new Date().getFullYear();
    const mesCard = new Date().getMonth() + 1;
    const vpObjetivos = objetivosAtivos.reduce((soma, obj) => {
      const mesesAteObj = Math.max(0, (obj.ano - anoCard) * 12 + (obj.mes - mesCard));
      return soma + (Number(obj.valorBRL) || 0) / Math.pow(1 + TAXA_ACUM_MENSAL, mesesAteObj);
    }, 0);
    const metaAjustada = Math.max(0, patrimonioPerpetuidade + vpObjetivos);
    if (metaAjustada <= fvSemAporte) return 0;
    return Math.max(0, (metaAjustada - fvSemAporte) * TAXA_ACUM_MENSAL / (f - 1));
  }, [params.patrimonioInicial, params.idadeAtual, params.idadeAposentadoria,
      patrimonioPerpetuidade, objetivosAtivos]);

  const projecaoComAporteAtual = useMemo(() =>
    calcularProjecao({
      patrimonioAtual: params.patrimonioInicial,
      aporteMensal:    params.aporteMensal,
      idadeAtual:      params.idadeAtual,
      idadeAlvo:       params.idadeAposentadoria,
    }),
    [params.patrimonioInicial, params.aporteMensal, params.idadeAtual, params.idadeAposentadoria],
  );

  const rendaSustentavel = useMemo(() => {
    if (projecaoComAporteAtual <= 0) return 0;
    return (projecaoComAporteAtual * 0.04) / 12;
  }, [projecaoComAporteAtual]);

  const dadosGrafico = useMemo(
    () => result?.projecao ?? [],
    [result, params.aporteMensal],
  );

  const sensAporteScenarios = useMemo(() => {
    if (!result) return [] as { pct: number; aporte: number; idadeResult: number }[];
    const base = params.aporteMensal;
    const alvo = patrimonioPerpetuidade;
    return [-0.4, -0.2, 0, 0.2, 0.4].map(pct => {
      const aporte = Math.max(0, Math.round(base * (1 + pct) / 100) * 100);
      const idadeResult = calcularIdadeComAporte({
        patrimonioAtual: params.patrimonioInicial,
        aporteMensal:    aporte,
        patrimonioAlvo:  alvo,
        idadeAtual:      params.idadeAtual,
        taxaMensalReal:  TAXA_ACUM_MENSAL,
        objetivos:       objetivosAtivos,
      });
      return { pct, aporte, idadeResult };
    });
  }, [result, params, objetivosAtivos, patrimonioPerpetuidade]);

  const sensPrazoScenarios = useMemo(() => {
    if (!result) return [] as { delta: number; idadeAlvo: number; aporte: number }[];
    const base = params.idadeAposentadoria;
    const alvo = patrimonioPerpetuidade;
    return [-4, -2, 0, 2, 4].map(delta => {
      const idadeAlvo = Math.max(params.idadeAtual + 1, base + delta);
      const aporte = calcularAporteMensalNecessario({
        patrimonioAtual: params.patrimonioInicial,
        patrimonioAlvo:  alvo,
        idadeAtual:      params.idadeAtual,
        idadeAlvo,
        taxaMensalReal:  TAXA_ACUM_MENSAL,
        objetivos:       objetivosAtivos,
      });
      return { delta, idadeAlvo, aporte };
    });
  }, [result, params, objetivosAtivos, patrimonioPerpetuidade]);

  const mesIF = result ? result.mesInicioRetirada : (params.idadeAposentadoria - params.idadeAtual) * 12;
  const anoAtualCliente = anoNascimento + params.idadeAtual;
  const anoMetaCliente  = anoNascimento + params.idadeAposentadoria;

  const handleSalvar = async () => {
    if (!result) return;
    setSalvando(true);
    try {
      await onSave(projecaoParams, objetivos, result, { taxaTravada: false, taxaTravadaValor: null });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  };

  const sliderAporteMax = Math.max(Math.round(aporteNecessario * 2 / 100) * 100, 20000);

  if (!result) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
        Preencha os parâmetros para ver a simulação.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. GRID 2 COLUNAS: Parâmetros | Objetivos ─────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Parâmetros da Simulação */}
        <div style={{
          background: "white", border: "0.5px solid #E5E7EB",
          borderRadius: 12, padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 10px" }}>
            Parâmetros da simulação
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Idade Atual + Aposentadoria */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Idade atual</label>
                <div style={{ position: "relative" }}>
                  <Input
                    type="number"
                    value={params.idadeAtual}
                    readOnly
                    style={{
                      borderColor: "#BFDBFE", borderLeft: "3px solid #2563EB",
                      color: "#000000", backgroundColor: "#EFF6FF",
                      cursor: "not-allowed", padding: "6px 10px", fontSize: 12,
                    }}
                  />
                  <span style={{
                    position: "absolute", top: 7, right: 6,
                    fontSize: 9, color: "#2563EB", fontWeight: 600, pointerEvents: "none",
                  }}>✓</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aposentadoria</label>
                <Input
                  id="lf-apos"
                  type="number"
                  min={params.idadeAtual + 1}
                  max={90}
                  value={params.idadeAposentadoria}
                  onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                  style={{ borderColor: "#BFDBFE", color: "#000000", padding: "6px 10px", fontSize: 12 }}
                />
                <input
                  type="range"
                  min={params.idadeAtual + 1}
                  max={80}
                  step={1}
                  value={params.idadeAposentadoria}
                  onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: "#2563EB", marginTop: 4 }}
                />
                <div className="flex justify-between" style={{ fontSize: 10, color: "#9CA3AF" }}>
                  <span>{params.idadeAtual + 1} anos</span>
                  <span>80 anos</span>
                </div>
              </div>
            </div>

            {/* Patrimônio Financeiro */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Patrimônio Financeiro</label>
                {patrimonioColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                {patrimonioEditado && (
                  <button
                    onClick={() => { setP({ patrimonioInicial: patrimonioColeta }); setPatrimonioEditado(false); }}
                    style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput
                value={params.patrimonioInicial}
                onChange={(v) => { setP({ patrimonioInicial: v }); setPatrimonioEditado(v !== patrimonioColeta); }}
              />
            </div>

            {/* Aporte Mensal */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aporte mensal</label>
                {aporteColeta > 0 && params.aporteMensal === aporteColeta && <span style={badgeColetaStyle}>Da coleta</span>}
                {aporteColeta > 0 && params.aporteMensal !== aporteColeta && (
                  <button
                    onClick={() => setP({ aporteMensal: aporteColeta })}
                    style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput value={params.aporteMensal} onChange={(v) => setP({ aporteMensal: v })} />
              <input
                type="range"
                min={0}
                max={sliderAporteMax}
                step={100}
                value={params.aporteMensal}
                onChange={(e) => setP({ aporteMensal: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: "#2563EB", marginTop: 4 }}
              />
              <div className="flex justify-between" style={{ fontSize: 10, color: "#9CA3AF" }}>
                <span>R$ 0</span>
                <span>{formatCurrency(sliderAporteMax)}/mês</span>
              </div>
            </div>

            {/* Renda Mensal Desejada */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Renda desejada</label>
                {rendaDesejadaColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                {rendaEditada && (
                  <button
                    onClick={() => { setP({ rendaDesejada: rendaDesejadaColeta }); setRendaEditada(false); }}
                    style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput
                value={params.rendaDesejada}
                onChange={(v) => { setP({ rendaDesejada: v }); setRendaEditada(v !== rendaDesejadaColeta); }}
              />
            </div>
          </div>
        </div>

        {/* Objetivos de Vida */}
        <div style={{
          background: "white", border: "0.5px solid #E5E7EB",
          borderRadius: 12, padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <ListaObjetivos
            objetivos={objetivos}
            onObjetivos={setObjetivos}
            anoAtual={anoAtualCliente}
            anoMeta={anoMetaCliente}
          />
        </div>
      </div>

      {/* ── 2. CARDS DE RESULTADO 2×2 ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card style={cardGreenTop}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
              Patrimônio Necessário
            </p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1E40AF" }} className="tabular-nums">
              {formatCurrency(patrimonioPerpetuidade)}
            </p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>
              {params.rendaDesejada > 0
                ? `Para gerar ${params.rendaDesejada.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês`
                : "Preencha a renda desejada"
              }
            </p>
          </CardContent>
        </Card>

        <Card style={cardGreenTop}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
              Projeção Atual
            </p>
            <p style={{ fontSize: 17, fontWeight: 700, color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#B91C1C" }} className="tabular-nums">
              {formatCurrency(projecaoComAporteAtual)}
            </p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>na aposentadoria</p>
          </CardContent>
        </Card>

        <Card style={{ ...cardGreenTop, border: `0.5px solid ${aporteNecessario <= params.aporteMensal && patrimonioPerpetuidade > 0 ? "#BBF7D0" : "#E5E7EB"}` }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 }}>
              Aporte Necessário
            </p>
            <p style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              color: aporteNecessario <= params.aporteMensal ? "#15803D" : "#B91C1C",
            }} className="tabular-nums">
              {aporteNecessario > 0
                ? aporteNecessario.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + "/mês"
                : "Meta atingível"
              }
            </p>
            <p style={{ fontSize: 10, color: aporteNecessario <= params.aporteMensal ? "#15803D" : "#9CA3AF", marginTop: 4 }}>
              {aporteNecessario <= params.aporteMensal
                ? "Aporte atual suficiente"
                : `Faltam ${(aporteNecessario - params.aporteMensal).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês`
              }
            </p>
            {objetivosAtivos.length > 0 && (
              <p style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                Inclui {objetivosAtivos.length} objetivo(s) de vida
              </p>
            )}
          </CardContent>
        </Card>

        <Card style={cardGreenTop}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 }}>
              Renda Sustentável
            </p>
            <p style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#111827",
            }} className="tabular-nums">
              {rendaSustentavel > 0
                ? rendaSustentavel.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                : "—"
              }
            </p>
            <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
              /mês com a projeção atual
            </p>
            {params.rendaDesejada > 0 && rendaSustentavel > 0 && (
              <p style={{
                fontSize: 10, marginTop: 4, fontWeight: 500,
                color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#B91C1C",
              }}>
                {rendaSustentavel >= params.rendaDesejada
                  ? `✓ Meta de ${params.rendaDesejada.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês atingida`
                  : `Meta: ${params.rendaDesejada.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês`
                }
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 4. GRÁFICO ──────────────────────────────────────────────────────── */}
      <Card style={cardGreenTop}>
        <CardContent className="pt-5">
          <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Projeção Patrimonial
          </p>
          <GraficoIF
            projecao={dadosGrafico}
            objetivos={objetivosAtivos}
            height={420}
            mesIF={mesIF}
            mesNascimento={mesNascimento}
            patrimonioNecessario={patrimonioPerpetuidade}
          />
        </CardContent>
      </Card>

      {/* ── 5. ANÁLISE DE SENSIBILIDADE ─────────────────────────────────────── */}
      <Card style={cardGreenTop}>
        <CardContent className="pt-5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ color: "#000000", fontSize: 15, fontWeight: 700, margin: 0 }}>
              Análise de Sensibilidade
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              {(["aporte", "prazo"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSensTab(tab)}
                  style={{
                    fontSize: 12,
                    fontWeight: sensTab === tab ? 600 : 400,
                    color: sensTab === tab ? "#2563EB" : "#9CA3AF",
                    background: sensTab === tab ? "#DBEAFE" : "transparent",
                    border: sensTab === tab ? "0.5px solid #BFDBFE" : "0.5px solid #E5E7EB",
                    borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {tab === "aporte" ? "Variando o Aporte" : "Variando o Prazo"}
                </button>
              ))}
            </div>
          </div>

          {sensTab === "aporte" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Variação</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aporte Mensal</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aposentadoria</span>
              </div>
              {sensAporteScenarios.map(({ pct, aporte, idadeResult }) => {
                const isBase = pct === 0;
                const atingiu = idadeResult <= params.idadeAposentadoria + 0.1;
                return (
                  <div
                    key={pct}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                      padding: "7px 6px", borderBottom: "0.5px solid #F3F4F6",
                      background: isBase ? "#F0F7FF" : "transparent",
                      borderRadius: isBase ? 6 : 0,
                    }}
                  >
                    <span style={{ fontSize: 12, color: isBase ? "#2563EB" : "#374151", fontWeight: isBase ? 600 : 400 }}>
                      {pct === 0 ? "Atual" : pct > 0 ? `+${Math.round(pct * 100)}%` : `${Math.round(pct * 100)}%`}
                    </span>
                    <span style={{ fontSize: 12, color: "#374151" }} className="tabular-nums">{formatCurrency(aporte)}/mês</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: atingiu ? "#059669" : "#B91C1C" }} className="tabular-nums">
                      {idadeResult >= params.idadeAtual + 49.9 ? ">50 anos" : `${Math.floor(idadeResult)} anos`}
                    </span>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, fontStyle: "italic" }}>
                Idade estimada para atingir o patrimônio necessário com cada aporte.
              </p>
            </div>
          )}

          {sensTab === "prazo" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Variação</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aposentadoria</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Aporte Necessário</span>
              </div>
              {sensPrazoScenarios.map(({ delta, idadeAlvo, aporte }) => {
                const isBase = delta === 0;
                return (
                  <div
                    key={delta}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                      padding: "7px 6px", borderBottom: "0.5px solid #F3F4F6",
                      background: isBase ? "#F0F7FF" : "transparent",
                      borderRadius: isBase ? 6 : 0,
                    }}
                  >
                    <span style={{ fontSize: 12, color: isBase ? "#2563EB" : "#374151", fontWeight: isBase ? 600 : 400 }}>
                      {delta === 0 ? "Atual" : delta > 0 ? `+${delta} anos` : `${delta} anos`}
                    </span>
                    <span style={{ fontSize: 12, color: "#374151" }} className="tabular-nums">{idadeAlvo} anos</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1E3A8A" }} className="tabular-nums">{formatCurrency(aporte)}/mês</span>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, fontStyle: "italic" }}>
                Aporte mensal necessário para cada data-alvo de aposentadoria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 6. BOTÃO SALVAR ─────────────────────────────────────────────────── */}
      <style>{`@keyframes lf-spin { to { transform: rotate(360deg); } }`}</style>
      <button
        onClick={handleSalvar}
        disabled={salvando}
        style={{
          width: "100%", backgroundColor: "#15803D", color: "white",
          border: "none", borderRadius: 8, padding: "12px 0",
          fontSize: 14, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          opacity: salvando ? 0.85 : 1,
        }}
      >
        {salvando ? (
          <>
            <i className="ti ti-loader-2" style={{ fontSize: 16, display: "inline-block", animation: "lf-spin 1s linear infinite" }} />
            Salvando…
          </>
        ) : salvo ? (
          <>
            <i className="ti ti-circle-check" style={{ fontSize: 16, color: "#86EFAC" }} />
            Salvo!
          </>
        ) : (
          <>
            <i className="ti ti-device-floppy" style={{ fontSize: 16 }} />
            Salvar simulação
          </>
        )}
      </button>
    </div>
  );
}
