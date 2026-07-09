import { useState, useEffect, useMemo } from "react";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularProjecaoIF,
  calcularTaxaReal,
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
  rentabilidadeAnual: number; // nominal, decimal
  inflacaoAnual: number;      // decimal
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
    rentabilidadeAnual:  planejamentoIF.taxaRetornoAnual / 100,
    inflacaoAnual:       planejamentoIF.inflacaoAnual / 100,
  };

  const [params, setParams] = useState<UIParams>(initialParams);
  const [patrimonioEditado, setPatrimonioEditado] = useState(false);
  const [aporteEditado,     setAporteEditado]     = useState(false);
  const [rendaEditada,      setRendaEditada]       = useState(false);
  const [objetivos, setObjetivos] = useState<ObjetivoVida[]>([]);

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
      aporteMensal:      !aporteEditado     ? aporteColeta     : prev.aporteMensal,
      rendaDesejada:     !rendaEditada      ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, aporteColeta, rendaDesejadaColeta]);

  const taxaRetornoReal = calcularTaxaReal(params.rentabilidadeAnual, params.inflacaoAnual);

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual: params.idadeAtual,
    idadeMeta: params.idadeAposentadoria,
    idadeMaxima: 100,
    patrimonioInicial: params.patrimonioInicial,
    aporteMensal: params.aporteMensal,
    rendaMensalDesejada: params.rendaDesejada,
    taxaRetornoAnual: taxaRetornoReal,
    anoNascimento,
    mesNascimento,
    objetivos,
  }), [params, objetivos, taxaRetornoReal, anoNascimento, mesNascimento]);

  const result = useMemo(() => {
    try {
      return calcularProjecaoIF(projecaoParams);
    } catch (err) {
      console.error("[SimuladorIF] Erro no cálculo:", err);
      return null;
    }
  }, [projecaoParams]);

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
                  <Label htmlFor="lf-apos" style={{ color: "#6B7280" }}>Idade IF</Label>
                  <Input id="lf-apos" type="number" min={params.idadeAtual + 1} max={90}
                    value={params.idadeAposentadoria}
                    onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                    style={{ borderColor: "#BFDBFE", color: "#000000" }} />
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
                  {aporteColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                  {aporteEditado && (
                    <button
                      onClick={() => {
                        setP({ aporteMensal: aporteColeta });
                        setAporteEditado(false);
                      }}
                      style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      ↺ Restaurar
                    </button>
                  )}
                </div>
                <CurrencyInput
                  value={params.aporteMensal}
                  onChange={(v) => {
                    setP({ aporteMensal: v });
                    setAporteEditado(v !== aporteColeta);
                  }}
                />
              </div>

              {/* Renda Mensal Desejada */}
              <div className="flex flex-col gap-1.5">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Label style={{ color: "#6B7280" }}>Renda mensal desejada na IF</Label>
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

              {/* Nominal return slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label style={{ color: "#6B7280" }}>Rentabilidade nominal anual</Label>
                  <span style={badgePctStyle}>{formatNumber(params.rentabilidadeAnual * 100, 1)}%</span>
                </div>
                <input
                  type="range" min={3} max={15} step={0.5}
                  value={params.rentabilidadeAnual * 100}
                  onChange={(e) => setP({ rentabilidadeAnual: Number(e.target.value) / 100 })}
                  className="w-full"
                  style={{ accentColor: "#000000" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>3% (conservador)</span><span>15% (arrojado)</span>
                </div>
              </div>

              {/* Inflation slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Label style={{ color: "#6B7280" }}>Inflação anual</Label>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                      → real: {formatNumber(taxaRetornoReal * 100, 1)}%
                    </span>
                  </div>
                  <span style={badgePctStyle}>{formatNumber(params.inflacaoAnual * 100, 1)}%</span>
                </div>
                <input
                  type="range" min={0} max={10} step={0.5}
                  value={params.inflacaoAnual * 100}
                  onChange={(e) => setP({ inflacaoAnual: Number(e.target.value) / 100 })}
                  className="w-full"
                  style={{ accentColor: "#000000" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>0%</span><span>10%</span>
                </div>
              </div>

              {/* Withdrawal rate note */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, color: "#2563EB",
                backgroundColor: "#EFF6FF", borderRadius: 8,
                border: "1px solid #BFDBFE", padding: "8px 12px",
              }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>ℹ</span>
                <span>Na aposentadoria é adotada a taxa de <strong>4% a.a. real</strong> — padrão conservador para carteiras de retirada</span>
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
          {/* KPI grid — 2×2 + full-width aporte */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Patrimônio na IF
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#000000" }} className="tabular-nums">
                  {formatCurrency(result.patrimonioNaIF)}
                </p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Patrimônio necessário
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1E40AF" }} className="tabular-nums">
                  {formatCurrency(result.patrimonioNecessario)}
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>regra dos 4%</p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Renda sustentável
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#15803D" }} className="tabular-nums">
                  {formatCurrency(result.rendaSustentavel)}/mês
                </p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  {result.gapRenda > 0 ? "Gap de renda" : "Superávit de renda"}
                </p>
                <p
                  style={{ fontSize: 18, fontWeight: 700, color: result.gapRenda > 0 ? "#B91C1C" : "#15803D" }}
                  className="tabular-nums"
                >
                  {formatCurrency(Math.abs(result.gapRenda))}/mês
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Aporte necessário — full width highlight */}
          {(() => {
            const comObj = result.aporteNecessario;
            const semObj = result.aporteNecessarioSemObjetivos;
            const delta = comObj - semObj;
            const temObjs = objetivos.length > 0;
            const aporteAtual = params.aporteMensal;
            const suficiente = aporteAtual >= comObj;
            return (
              <Card style={{ ...cardGreenTop }}>
                <CardContent className="pt-4 pb-4">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                        {temObjs ? "Aporte necessário (com objetivos)" : "Aporte necessário para atingir Aposentadoria"}
                      </p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: "#1E3A8A", margin: 0 }} className="tabular-nums">
                        {formatCurrency(comObj)}/mês
                      </p>

                      {temObjs && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            Sem objetivos: {formatCurrency(semObj)}/mês
                          </span>
                          {delta > 0 && (
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              backgroundColor: "#FEF3C7", color: "#92400E",
                              border: "1px solid #FDE68A", borderRadius: 6,
                              padding: "1px 7px",
                            }}>
                              +{formatCurrency(delta)}/mês pelos objetivos
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      {result.ifAlcancada ? (
                        <span style={{
                          backgroundColor: "#DCFCE7", color: "#15803D",
                          border: "1px solid #A8C8AB", borderRadius: 8,
                          padding: "5px 12px", fontSize: 12, fontWeight: 600,
                        }}>
                          IF alcançada ✓
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: suficiente ? "#DCFCE7" : "#FEE2E2",
                          color: suficiente ? "#15803D" : "#B91C1C",
                          border: `1px solid ${suficiente ? "#A8C8AB" : "#C8A8A8"}`,
                          borderRadius: 8,
                          padding: "5px 12px", fontSize: 12, fontWeight: 600,
                        }}>
                          Atual: {formatCurrency(aporteAtual)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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
          />
        </CardContent>
      </Card>
    </div>
  );
}
