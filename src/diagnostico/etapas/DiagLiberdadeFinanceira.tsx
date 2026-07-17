import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularProjecaoIF,
  calcularPatrimonioPerpetuidade,
  calcularAporteMensalNecessario,
  calcularTaxaNecessaria,
  calcularIdadeComAporte,
  type ProjecaoIFParams,
} from "@/lib/financialFreedomCalc";
import type { DadosColetaDiag, DadosLFDiag } from "../types";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { GraficoIF } from "@/components/shared/GraficoIF";
import { ListaObjetivos } from "@/components/shared/ListaObjetivos";

interface UIParams {
  idadeAtual: number;
  idadeAposentadoria: number;
  patrimonioInicial: number;
  aporteMensal: number;
  rendaDesejada: number;
}

interface Props {
  dadosColeta: DadosColetaDiag;
  dadosLF: DadosLFDiag;
  onChange: (patch: Partial<DadosLFDiag>) => void;
}

const cardStyle: React.CSSProperties = {
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

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

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

export function DiagLiberdadeFinanceira({ dadosColeta, dadosLF, onChange }: Props) {
  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const anoNascimento = parsed?.ano ?? (new Date().getFullYear() - 30);
  const mesNascimento = parsed?.mes ?? 1;

  const idadeAtualCalculada = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30;

  const patrimonioColeta = Number(dadosColeta.patrimonioFinanceiro) || 0;
  const aporteColeta = Number(dadosColeta.aporteMensal) || 0;
  const rendaDesejadaColeta = Number(dadosColeta.rendaDesejadaAposentadoria) || 0;

  const initialParams: UIParams = {
    idadeAtual: idadeAtualCalculada,
    idadeAposentadoria: Number(dadosLF.idadeAlvo) || Number(dadosColeta.idadeMeta) || 60,
    patrimonioInicial: Number(dadosLF.patrimonioInicial) || patrimonioColeta,
    aporteMensal: Number(dadosLF.aporteMensal) || aporteColeta,
    rendaDesejada: Number(dadosLF.rendaDesejada) || rendaDesejadaColeta,
  };

  const [params, setParams] = useState<UIParams>(initialParams);
  const [patrimonioEditado, setPatrimonioEditado] = useState(false);
  const [rendaEditada, setRendaEditada] = useState(false);
  const [objetivos, setObjetivos] = useState<ObjetivoVida[]>(() => {
    const raw = dadosLF.objetivos ?? [];
    return (raw as Record<string, unknown>[])
      .map((o) => migrateObjetivo(o, anoNascimento, mesNascimento))
      .filter((o) => VALID_TIPOS.has(o.tipo));
  });
  const [sensTab, setSensTab] = useState<"aporte" | "prazo">("aporte");
  const [taxaTravada, setTaxaTravada] = useState(() => !!dadosLF.taxaTravada);
  const [taxaTravadaValor, setTaxaTravadaValor] = useState<number | null>(() => dadosLF.taxaTravadaValor ?? null);

  const isFirstRender = useRef(true);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    onChangeRef.current({
      patrimonioInicial: params.patrimonioInicial,
      aporteMensal: params.aporteMensal,
      idadeAlvo: params.idadeAposentadoria,
      rendaDesejada: params.rendaDesejada,
      objetivos: objetivos as unknown[],
      taxaTravada,
      taxaTravadaValor,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, objetivos, taxaTravada, taxaTravadaValor]);

  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      idadeAtual: idadeAtualCalculada,
      patrimonioInicial: !patrimonioEditado ? patrimonioColeta : prev.patrimonioInicial,
      rendaDesejada: !rendaEditada ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, rendaDesejadaColeta]);

  const setP = (patch: Partial<UIParams>) => setParams((p) => ({ ...p, ...patch }));

  const objetivosAtivos = useMemo(() => objetivos.filter(o => o.ativo !== false), [objetivos]);

  const patrimonioPerpetuidade = useMemo(() => {
    if (!params.rendaDesejada || params.rendaDesejada <= 0) return 0;
    return calcularPatrimonioPerpetuidade(params.rendaDesejada);
  }, [params.rendaDesejada]);

  const taxaNecessariaCalc = useMemo(() => {
    if (patrimonioPerpetuidade <= 0) return 0.03;
    return calcularTaxaNecessaria({
      patrimonioAtual: params.patrimonioInicial,
      aporteMensal: params.aporteMensal,
      patrimonioAlvo: patrimonioPerpetuidade,
      idadeAtual: params.idadeAtual,
      idadeAlvo: params.idadeAposentadoria,
      objetivos: objetivosAtivos,
    });
  }, [params, objetivosAtivos, patrimonioPerpetuidade]);

  const taxaEfetiva = useMemo(
    () => taxaTravada && taxaTravadaValor !== null ? taxaTravadaValor : taxaNecessariaCalc,
    [taxaTravada, taxaTravadaValor, taxaNecessariaCalc],
  );

  const taxaMensalEfetiva = useMemo(
    () => Math.pow(1 + Math.max(taxaEfetiva, 0.03), 1 / 12) - 1,
    [taxaEfetiva],
  );

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual: params.idadeAtual,
    idadeMeta: params.idadeAposentadoria,
    idadeMaxima: 100,
    patrimonioInicial: params.patrimonioInicial,
    aporteMensal: params.aporteMensal,
    rendaMensalDesejada: params.rendaDesejada,
    taxaRetornoAnual: Math.max(taxaEfetiva, 0.03),
    anoNascimento,
    mesNascimento,
    objetivos: objetivosAtivos,
  }), [params, objetivosAtivos, anoNascimento, mesNascimento, taxaEfetiva]);

  const result = useMemo(() => {
    try {
      return calcularProjecaoIF(projecaoParams);
    } catch {
      return null;
    }
  }, [projecaoParams]);

  const aporteNecessarioCalc = useMemo(() => {
    if (!result || patrimonioPerpetuidade <= 0) return 0;
    return calcularAporteMensalNecessario({
      patrimonioAtual: params.patrimonioInicial,
      patrimonioAlvo: patrimonioPerpetuidade,
      idadeAtual: params.idadeAtual,
      idadeAlvo: params.idadeAposentadoria,
      taxaMensalReal: taxaMensalEfetiva,
    });
  }, [result, params, patrimonioPerpetuidade, taxaMensalEfetiva]);

  const rendaSustentavel = useMemo(() => {
    if (!result || result.patrimonioNaIF <= 0) return 0;
    return (result.patrimonioNaIF * 0.04) / 12;
  }, [result]);

  const sensAporteScenarios = useMemo(() => {
    if (!result) return [] as { pct: number; aporte: number; idadeResult: number }[];
    const base = params.aporteMensal;
    const alvo = patrimonioPerpetuidade;
    return [-0.4, -0.2, 0, 0.2, 0.4].map(pct => {
      const aporte = Math.max(0, Math.round(base * (1 + pct) / 100) * 100);
      const idadeResult = calcularIdadeComAporte({
        patrimonioAtual: params.patrimonioInicial,
        aporteMensal: aporte,
        patrimonioAlvo: alvo,
        idadeAtual: params.idadeAtual,
        taxaMensalReal: taxaMensalEfetiva,
        objetivos: objetivosAtivos,
      });
      return { pct, aporte, idadeResult };
    });
  }, [result, params, objetivosAtivos, patrimonioPerpetuidade, taxaMensalEfetiva]);

  const sensPrazoScenarios = useMemo(() => {
    if (!result) return [] as { delta: number; idadeAlvo: number; aporte: number }[];
    const base = params.idadeAposentadoria;
    const alvo = patrimonioPerpetuidade;
    return [-4, -2, 0, 2, 4].map(delta => {
      const idadeAlvo = Math.max(params.idadeAtual + 1, base + delta);
      const aporte = calcularAporteMensalNecessario({
        patrimonioAtual: params.patrimonioInicial,
        patrimonioAlvo: alvo,
        idadeAtual: params.idadeAtual,
        idadeAlvo,
        taxaMensalReal: taxaMensalEfetiva,
        objetivos: objetivosAtivos,
      });
      return { delta, idadeAlvo, aporte };
    });
  }, [result, params, objetivosAtivos, patrimonioPerpetuidade, taxaMensalEfetiva]);

  const mesIF = result ? result.mesInicioRetirada : (params.idadeAposentadoria - params.idadeAtual) * 12;
  const anoAtualCliente = anoNascimento + params.idadeAtual;
  const anoMetaCliente = anoNascimento + params.idadeAposentadoria;
  const sliderAporteMax = Math.max(Math.round(aporteNecessarioCalc * 2 / 100) * 100, 20000);

  if (!result) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
        Preencha os parâmetros para ver a simulação.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Parâmetros | Objetivos ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 10px" }}>
            Parâmetros da simulação
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Idade atual</label>
                <div style={{ position: "relative" }}>
                  <Input
                    type="number"
                    value={params.idadeAtual}
                    readOnly
                    style={{ borderColor: "#BFDBFE", borderLeft: "3px solid #2563EB", color: "#000000", backgroundColor: "#EFF6FF", cursor: "not-allowed", padding: "6px 10px", fontSize: 12 }}
                  />
                  <span style={{ position: "absolute", top: 7, right: 6, fontSize: 9, color: "#2563EB", fontWeight: 600, pointerEvents: "none" }}>✓</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aposentadoria</label>
                <Input
                  type="number"
                  min={params.idadeAtual + 1}
                  max={90}
                  value={params.idadeAposentadoria}
                  onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                  style={{ borderColor: "#BFDBFE", color: "#000000", padding: "6px 10px", fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Patrimônio Financeiro</label>
                {patrimonioColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                {patrimonioEditado && (
                  <button onClick={() => { setP({ patrimonioInicial: patrimonioColeta }); setPatrimonioEditado(false); }}
                    style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput
                value={params.patrimonioInicial}
                onChange={(v) => { setP({ patrimonioInicial: v }); setPatrimonioEditado(v !== patrimonioColeta); }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aporte mensal</label>
                {aporteColeta > 0 && params.aporteMensal === aporteColeta && <span style={badgeColetaStyle}>Da coleta</span>}
                {aporteColeta > 0 && params.aporteMensal !== aporteColeta && (
                  <button onClick={() => setP({ aporteMensal: aporteColeta })}
                    style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                    ↺ Restaurar
                  </button>
                )}
              </div>
              <CurrencyInput value={params.aporteMensal} onChange={(v) => setP({ aporteMensal: v })} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Renda desejada</label>
                {rendaDesejadaColeta > 0 && <span style={badgeColetaStyle}>Da coleta</span>}
                {rendaEditada && (
                  <button onClick={() => { setP({ rendaDesejada: rendaDesejadaColeta }); setRendaEditada(false); }}
                    style={{ marginLeft: 8, fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
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

        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <ListaObjetivos
            objetivos={objetivos}
            onObjetivos={setObjetivos}
            anoAtual={anoAtualCliente}
            anoMeta={anoMetaCliente}
          />
        </div>
      </div>

      {/* ── Sliders ── */}
      <Card style={cardStyle}>
        <CardContent className="pt-4 pb-4">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: "#6B7280" }}>Ajuste: Aposentadoria</label>
                <span style={badgePctStyle}>{params.idadeAposentadoria} anos</span>
              </div>
              <input type="range" min={params.idadeAtual + 5} max={80} step={1} value={params.idadeAposentadoria}
                onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                className="w-full" style={{ accentColor: "#1E3A8A" }} />
              <div className="flex justify-between" style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                <span>{params.idadeAtual + 5} anos</span><span>80 anos</span>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: "#6B7280" }}>Ajuste: Aporte mensal</label>
                <span style={{ ...badgePctStyle, backgroundColor: "#15803D" }}>{formatCurrency(params.aporteMensal)}/mês</span>
              </div>
              <input type="range" min={0} max={sliderAporteMax} step={100} value={params.aporteMensal}
                onChange={(e) => setP({ aporteMensal: Number(e.target.value) })}
                className="w-full" style={{ accentColor: "#15803D" }} />
              <div className="flex justify-between" style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                <span>R$ 0</span><span>{formatCurrency(sliderAporteMax)}/mês</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cards de resultado 2×2 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>Patrimônio Necessário</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1E40AF" }} className="tabular-nums">{formatCurrency(patrimonioPerpetuidade)}</p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>perpetuidade (regra dos 4%)</p>
          </CardContent>
        </Card>

        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>Projeção Atual</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: result.ifAlcancada ? "#15803D" : "#B91C1C" }} className="tabular-nums">{formatCurrency(result.patrimonioNaIF)}</p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>na aposentadoria</p>
          </CardContent>
        </Card>

        <Card style={{ ...cardStyle, ...(taxaTravada ? { border: "1px solid #F59E0B" } : {}) }}>
          <CardContent className="pt-4 pb-4">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", margin: 0 }}>Taxa Necessária</p>
              <button
                onClick={() => {
                  if (taxaTravada) { setTaxaTravada(false); setTaxaTravadaValor(null); }
                  else { setTaxaTravada(true); setTaxaTravadaValor(taxaNecessariaCalc); }
                }}
                style={{ fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", borderRadius: 6, padding: "2px 8px", fontFamily: "inherit", background: taxaTravada ? "#FEF3C7" : "#F3F4F6", color: taxaTravada ? "#92400E" : "#6B7280" }}>
                {taxaTravada ? "Travado" : "Travar"}
              </button>
            </div>
            {taxaTravada && taxaTravadaValor !== null ? (
              <>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#B45309" }} className="tabular-nums">IPCA + {formatNumber(taxaTravadaValor * 100, 1)}% a.a.</p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>taxa travada · necessária: IPCA + {formatNumber(taxaNecessariaCalc * 100, 1)}%</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 17, fontWeight: 700, color: taxaNecessariaCalc > 0.15 ? "#B91C1C" : taxaNecessariaCalc > 0.08 ? "#B45309" : "#15803D" }} className="tabular-nums">
                  IPCA + {formatNumber(taxaNecessariaCalc * 100, 1)}% a.a.
                </p>
                <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>para atingir a meta</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 }}>Renda Sustentável</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#111827" }} className="tabular-nums">
              {rendaSustentavel > 0
                ? rendaSustentavel.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                : "—"}
            </p>
            <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>/mês com a projeção atual</p>
            {params.rendaDesejada > 0 && rendaSustentavel > 0 && (
              <p style={{ fontSize: 10, marginTop: 4, fontWeight: 500, color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#B91C1C" }}>
                {rendaSustentavel >= params.rendaDesejada
                  ? `✓ Meta de ${params.rendaDesejada.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês atingida`
                  : `Meta: ${params.rendaDesejada.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/mês`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Gráfico ── */}
      <Card style={cardStyle}>
        <CardContent className="pt-5">
          <p style={{ color: "#000000", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Projeção Patrimonial</p>
          <GraficoIF
            projecao={result.projecao}
            objetivos={objetivosAtivos}
            height={420}
            mesIF={mesIF}
            mesNascimento={mesNascimento}
            patrimonioNecessario={patrimonioPerpetuidade}
          />
        </CardContent>
      </Card>

      {/* ── Análise de Sensibilidade ── */}
      <Card style={cardStyle}>
        <CardContent className="pt-5">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ color: "#000000", fontSize: 15, fontWeight: 700, margin: 0 }}>Análise de Sensibilidade</p>
            <div style={{ display: "flex", gap: 4 }}>
              {(["aporte", "prazo"] as const).map(tab => (
                <button key={tab} onClick={() => setSensTab(tab)}
                  style={{ fontSize: 12, fontWeight: sensTab === tab ? 600 : 400, color: sensTab === tab ? "#2563EB" : "#9CA3AF", background: sensTab === tab ? "#DBEAFE" : "transparent", border: sensTab === tab ? "0.5px solid #BFDBFE" : "0.5px solid #E5E7EB", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                  {tab === "aporte" ? "Variando o Aporte" : "Variando o Prazo"}
                </button>
              ))}
            </div>
          </div>

          {sensTab === "aporte" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Variação</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Aporte Mensal</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Aposentadoria</span>
              </div>
              {sensAporteScenarios.map(({ pct, aporte, idadeResult }) => {
                const isBase = pct === 0;
                const atingiu = idadeResult <= params.idadeAposentadoria + 0.1;
                return (
                  <div key={pct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "7px 6px", borderBottom: "0.5px solid #F3F4F6", background: isBase ? "#F0F7FF" : "transparent", borderRadius: isBase ? 6 : 0 }}>
                    <span style={{ fontSize: 12, color: isBase ? "#2563EB" : "#374151", fontWeight: isBase ? 600 : 400 }}>{pct === 0 ? "Atual" : pct > 0 ? `+${Math.round(pct * 100)}%` : `${Math.round(pct * 100)}%`}</span>
                    <span style={{ fontSize: 12, color: "#374151" }} className="tabular-nums">{formatCurrency(aporte)}/mês</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: atingiu ? "#059669" : "#B91C1C" }} className="tabular-nums">{idadeResult >= params.idadeAtual + 49.9 ? ">50 anos" : `${Math.floor(idadeResult)} anos`}</span>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, fontStyle: "italic" }}>Idade estimada para atingir o patrimônio necessário com cada aporte.</p>
            </div>
          )}

          {sensTab === "prazo" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #F3F4F6", paddingBottom: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Variação</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Aposentadoria</span>
                <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Aporte Necessário</span>
              </div>
              {sensPrazoScenarios.map(({ delta, idadeAlvo, aporte }) => {
                const isBase = delta === 0;
                return (
                  <div key={delta} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "7px 6px", borderBottom: "0.5px solid #F3F4F6", background: isBase ? "#F0F7FF" : "transparent", borderRadius: isBase ? 6 : 0 }}>
                    <span style={{ fontSize: 12, color: isBase ? "#2563EB" : "#374151", fontWeight: isBase ? 600 : 400 }}>{delta === 0 ? "Atual" : delta > 0 ? `+${delta} anos` : `${delta} anos`}</span>
                    <span style={{ fontSize: 12, color: "#374151" }} className="tabular-nums">{idadeAlvo} anos</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1E3A8A" }} className="tabular-nums">{formatCurrency(aporte)}/mês</span>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8, fontStyle: "italic" }}>Aporte mensal necessário para cada data-alvo de aposentadoria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
