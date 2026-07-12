import { useState, useEffect, useMemo } from "react";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularProjecaoIF,
  TAXA_ACUM_ANUAL,
  TAXA_ACUM_MENSAL,
  calcularPatrimonioNecessario,
  calcularAporteMensalNecessario,
  calcularTaxaNecessaria,
  calcularIdadeComAporte,
  type ProjecaoIFParams,
  type ProjecaoIFResult,
} from "@/lib/financialFreedomCalc";
import type { PlanejamentoIF, DadosCliente } from "@/types/financialPlanning";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { GraficoIF } from "@/components/shared/GraficoIF";
import { ListaObjetivos } from "@/components/shared/ListaObjetivos";

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface Props {
  clientId: string;
  planejamentoIF: PlanejamentoIF;
  dataNascimento?: string;
  dadosCliente?: DadosCliente;
  onSave: (params: ProjecaoIFParams, objetivos: ObjetivoVida[], result: ProjecaoIFResult) => void;
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

const badgePctStyle: React.CSSProperties = {
  backgroundColor: "#1E3A8A",
  color: "white",
  borderRadius: 6,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 600,
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

/** Step 7 — migrate objectives saved in old format ({ nome, valor, idadeRealizacao }) */
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
  clientId, planejamentoIF, dataNascimento, dadosCliente, onSave,
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
    idadeAtual:          idadeAtualCalculada,
    idadeAposentadoria:  planejamentoIF.idadeMeta,
    patrimonioInicial:   patrimonioColeta || planejamentoIF.patrimonioAtual,
    aporteMensal:        aporteColeta     || planejamentoIF.aporteMensal,
    rendaDesejada:       rendaDesejadaColeta || planejamentoIF.rendaMensalDesejada,
  };

  const [params, setParams] = useState<UIParams>(initialParams);
  const [patrimonioEditado, setPatrimonioEditado] = useState(false);
  const [rendaEditada,      setRendaEditada]       = useState(false);
  const [objetivos, setObjetivos] = useState<ObjetivoVida[]>([]);
  const [sensTab, setSensTab] = useState<"aporte" | "prazo">("aporte");

  const CHAVE = `ferramenta_if_${clientId}`;
  const temDadosSalvos = localStorage.getItem(CHAVE) !== null;

  const { limpar } = useFerramentaStorage(
    CHAVE,
    { params, objetivos },
    (v) => {
      // Always override idadeAtual with current calculated value (birth date may have changed)
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
      idadeAtual:       idadeAtualCalculada,
      patrimonioInicial: !patrimonioEditado ? patrimonioColeta : prev.patrimonioInicial,
      rendaDesejada:     !rendaEditada      ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, rendaDesejadaColeta]);

  // Computed independently (uses only TAXA_RET_MENSAL+rendaDesejada+idadeAposentadoria)
  // so it can drive taxaNecessariaCalc without a circular dependency on result.
  const taxaNecessariaCalc = useMemo(
    () => calcularTaxaNecessaria({
      patrimonioAtual: params.patrimonioInicial,
      aporteMensal: params.aporteMensal,
      patrimonioAlvo: calcularPatrimonioNecessario(params.rendaDesejada, params.idadeAposentadoria),
      idadeAtual: params.idadeAtual,
      idadeAlvo: params.idadeAposentadoria,
    }),
    [params],
  );

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual: params.idadeAtual,
    idadeMeta: params.idadeAposentadoria,
    idadeMaxima: 100,
    patrimonioInicial: params.patrimonioInicial,
    aporteMensal: params.aporteMensal,
    rendaMensalDesejada: params.rendaDesejada,
    taxaRetornoAnual: TAXA_ACUM_ANUAL,
    anoNascimento,
    mesNascimento,
    objetivos,
  }), [params, objetivos, anoNascimento, mesNascimento]);

  const result = useMemo(() => {
    try {
      return calcularProjecaoIF(projecaoParams);
    } catch (err) {
      console.error("[SimuladorIF] Erro no cálculo:", err);
      return null;
    }
  }, [projecaoParams]);

  const aporteNecessarioCalc = useMemo(
    () => result ? calcularAporteMensalNecessario({
      patrimonioAtual: params.patrimonioInicial,
      patrimonioAlvo: result.patrimonioNecessario,
      idadeAtual: params.idadeAtual,
      idadeAlvo: params.idadeAposentadoria,
      taxaMensalReal: TAXA_ACUM_MENSAL,
    }) : 0,
    [result, params],
  );

  const sensAporteScenarios = useMemo(() => {
    if (!result) return [] as { pct: number; aporte: number; idadeResult: number }[];
    const base = params.aporteMensal;
    const alvo = result.patrimonioNecessario;
    return [-0.4, -0.2, 0, 0.2, 0.4].map(pct => {
      const aporte = Math.max(0, Math.round(base * (1 + pct) / 100) * 100);
      const idadeResult = calcularIdadeComAporte({
        patrimonioAtual: params.patrimonioInicial,
        aporteMensal: aporte,
        patrimonioAlvo: alvo,
        idadeAtual: params.idadeAtual,
        taxaMensalReal: TAXA_ACUM_MENSAL,
      });
      return { pct, aporte, idadeResult };
    });
  }, [result, params]);

  const sensPrazoScenarios = useMemo(() => {
    if (!result) return [] as { delta: number; idadeAlvo: number; aporte: number }[];
    const base = params.idadeAposentadoria;
    const alvo = result.patrimonioNecessario;
    return [-4, -2, 0, 2, 4].map(delta => {
      const idadeAlvo = Math.max(params.idadeAtual + 1, base + delta);
      const aporte = calcularAporteMensalNecessario({
        patrimonioAtual: params.patrimonioInicial,
        patrimonioAlvo: alvo,
        idadeAtual: params.idadeAtual,
        idadeAlvo,
        taxaMensalReal: TAXA_ACUM_MENSAL,
      });
      return { delta, idadeAlvo, aporte };
    });
  }, [result, params]);

  const mesIF = result ? result.mesInicioRetirada : (params.idadeAposentadoria - params.idadeAtual) * 12;
  const anoAtualCliente = anoNascimento + params.idadeAtual;
  const anoMetaCliente = anoNascimento + params.idadeAposentadoria;

  if (!result) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
        Preencha os parâmetros para ver a simulação.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Persistence bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", backgroundColor: "#F0F7FF",
        borderRadius: 8, border: "1px solid #BFDBFE",
      }}>
        <span style={{ fontSize: 11, color: "#3B82F6" }}>
          {temDadosSalvos ? "● Dados salvos automaticamente" : "○ Preencha os dados abaixo"}
        </span>
        {temDadosSalvos && (
          <button
            onClick={() => { if (window.confirm("Limpar todos os dados desta análise?")) limpar(); }}
            style={{
              background: "transparent", border: "1px solid rgba(0,0,0,0.15)",
              color: "#6B7280", borderRadius: 6, padding: "4px 10px",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Limpar dados
          </button>
        )}
      </div>

      {/* Top row: params + results */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Inputs */}
        <div className="space-y-5">
          <Card style={cardGreenTop}>
            <CardContent className="pt-5 space-y-4">
              <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, margin: 0 }}>
                Parâmetros da simulação
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Idade Atual — readonly, calculated from birth date */}
                <div className="flex flex-col gap-1.5">
                  <Label style={{ color: "#6B7280" }}>Idade atual</Label>
                  <div style={{ position: "relative" }}>
                    <Input
                      type="number"
                      value={params.idadeAtual}
                      readOnly
                      style={{
                        borderColor: "#BFDBFE",
                        borderLeft: "3px solid #2563EB",
                        color: "#000000",
                        backgroundColor: "#EFF6FF",
                        cursor: "not-allowed",
                      }}
                    />
                    <span style={{
                      position: "absolute", top: 8, right: 8,
                      fontSize: 10, color: "#2563EB", fontWeight: 600,
                      pointerEvents: "none",
                    }}>
                      ✓ CALCULADO
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-apos" style={{ color: "#6B7280" }}>Idade de Aposentadoria</Label>
                  <Input id="lf-apos" type="number" min={params.idadeAtual + 1} max={90}
                    value={params.idadeAposentadoria}
                    onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                    style={{ borderColor: "#BFDBFE", color: "#000000" }} />
                </div>
              </div>

              {/* Slider: Idade de Aposentadoria */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label style={{ fontSize: 13, color: "#6B7280" }}>Ajuste rápido: Aposentadoria</label>
                  <span style={badgePctStyle}>{params.idadeAposentadoria} anos</span>
                </div>
                <input
                  type="range"
                  min={params.idadeAtual + 5}
                  max={80}
                  step={1}
                  value={params.idadeAposentadoria}
                  onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: "#1E3A8A" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>{params.idadeAtual + 5} anos</span>
                  <span>80 anos</span>
                </div>
              </div>

              {/* Patrimônio Financeiro */}
              <div className="flex flex-col gap-1.5">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Label style={{ color: "#6B7280" }}>Patrimônio Financeiro</Label>
                  {patrimonioColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                  {patrimonioEditado && (
                    <button
                      onClick={() => {
                        setP({ patrimonioInicial: patrimonioColeta });
                        setPatrimonioEditado(false);
                      }}
                      style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      ↺ Restaurar
                    </button>
                  )}
                </div>
                <CurrencyInput
                  value={params.patrimonioInicial}
                  onChange={(v) => {
                    setP({ patrimonioInicial: v });
                    setPatrimonioEditado(v !== patrimonioColeta);
                  }}
                />
              </div>

              {/* Aporte Mensal */}
              <div className="flex flex-col gap-1.5">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Label style={{ color: "#6B7280" }}>Aporte mensal</Label>
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
                <CurrencyInput
                  value={params.aporteMensal}
                  onChange={(v) => setP({ aporteMensal: v })}
                />
                <input
                  type="range"
                  min={0}
                  max={Math.max(Math.round(aporteNecessarioCalc * 2 / 100) * 100, 20000)}
                  step={100}
                  value={params.aporteMensal}
                  onChange={(e) => setP({ aporteMensal: Number(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: "#15803D" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>R$ 0</span>
                  <span>{formatCurrency(Math.max(Math.round(aporteNecessarioCalc * 2 / 100) * 100, 20000))}/mês</span>
                </div>
              </div>

              {/* Renda Mensal Desejada */}
              <div className="flex flex-col gap-1.5">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Label style={{ color: "#6B7280" }}>Renda mensal desejada na Aposentadoria</Label>
                  {rendaDesejadaColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                  {rendaEditada && (
                    <button
                      onClick={() => {
                        setP({ rendaDesejada: rendaDesejadaColeta });
                        setRendaEditada(false);
                      }}
                      style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      ↺ Restaurar
                    </button>
                  )}
                </div>
                <CurrencyInput
                  value={params.rendaDesejada}
                  onChange={(v) => {
                    setP({ rendaDesejada: v });
                    setRendaEditada(v !== rendaDesejadaColeta);
                  }}
                />
              </div>

              {/* Rates info note */}
              <div style={{
                fontSize: 11,
                color: '#9CA3AF',
                background: '#F8FAFF',
                border: '0.5px solid #BFDBFE',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <i className="ti ti-info-circle" style={{ fontSize: 13, color: '#60A5FA' }} />
                <span>
                  Retirada calculada a <strong>IPCA + 4% a.a.</strong>
                  {' · '}expectativa de vida <strong>90 anos</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          <Card style={cardGreenTop}>
            <CardContent className="pt-5">
              <ListaObjetivos
                objetivos={objetivos}
                onObjetivos={setObjetivos}
                anoAtual={anoAtualCliente}
                anoMeta={anoMetaCliente}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-5">
          {/* Status badge */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{
              backgroundColor: result.ifAlcancada ? "#DCFCE7" : "#FEE2E2",
              color: result.ifAlcancada ? "#15803D" : "#B91C1C",
              border: `1px solid ${result.ifAlcancada ? "#A8C8AB" : "#C8A8A8"}`,
              borderRadius: 8,
              padding: "5px 12px", fontSize: 12, fontWeight: 600,
            }}>
              {result.ifAlcancada ? "Aposentadoria alcançada ✓" : "Meta não atingida com aportes atuais"}
            </span>
          </div>

          {/* Summary grid 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Patrimônio Necessário
                </p>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#1E40AF" }} className="tabular-nums">
                  {formatCurrency(result.patrimonioNecessario)}
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>regra dos 4%</p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Projeção Atual
                </p>
                <p style={{ fontSize: 17, fontWeight: 700, color: result.ifAlcancada ? "#15803D" : "#B91C1C" }} className="tabular-nums">
                  {formatCurrency(result.patrimonioNaIF)}
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>na aposentadoria</p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Taxa Necessária
                </p>
                <p style={{
                  fontSize: 17, fontWeight: 700,
                  color: taxaNecessariaCalc > 0.15 ? "#B91C1C" : taxaNecessariaCalc > 0.08 ? "#B45309" : "#15803D",
                }} className="tabular-nums">
                  IPCA + {formatNumber(taxaNecessariaCalc * 100, 1)}% a.a.
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>para atingir a meta</p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Renda Sustentável
                </p>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#15803D" }} className="tabular-nums">
                  {formatCurrency(result.rendaSustentavel)}/mês
                </p>
              </CardContent>
            </Card>

          </div>

          {objetivos.length > 0 && (
            <Card style={cardGreenTop}>
              <CardContent className="pt-4">
                <p style={{ color: "#000000", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
                  Impacto dos objetivos
                </p>
                <div className="space-y-1.5">
                  {objetivos.map((o) => (
                    <div key={o.id} className="flex justify-between text-sm border-b pb-1.5 last:border-0">
                      <span style={{ color: "#6B7280" }}>
                        {o.label} ({MESES_ABREV[o.mes - 1]}/{o.ano})
                      </span>
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: o.tipo !== "aportes_financeiros" ? "#B91C1C" : "#15803D" }}
                      >
                        {o.tipo !== "aportes_financeiros" ? "−" : "+"}{formatCurrency(o.valorBRL)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <button
            onClick={() => onSave(projecaoParams, objetivos, result)}
            style={{
              width: "100%", backgroundColor: "#15803D", color: "white",
              border: "none", borderRadius: 8, padding: "12px 0",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Salvar simulação
          </button>
        </div>
      </div>

      {/* Full-width chart */}
      <Card style={cardGreenTop}>
        <CardContent className="pt-5">
          <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Projeção Patrimonial
          </p>
          <GraficoIF
            projecao={result.projecao}
            curvaIdeal={result.curvaIdeal}
            objetivos={objetivos}
            height={420}
            mesIF={mesIF}
            mesNascimento={mesNascimento}
            patrimonioNecessario={result.patrimonioNecessario}
          />
        </CardContent>
      </Card>

      {/* Sensitivity table */}
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
                    borderRadius: 6,
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
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
    </div>
  );
}
