import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import {
  calcularProjecaoIF,
  calcularPatrimonioPerpetuidade,
  type ProjecaoIFParams,
} from "@/lib/financialFreedomCalc";
import type { DadosColetaDiag, DadosLFDiag } from "../types";
import { CardProjecaoPatrimonial } from "@/components/shared/CardProjecaoPatrimonial";

const TAXA_ANUAL_DIAG = 0.045;
const TAXA_MENSAL_DIAG = Math.pow(1 + TAXA_ANUAL_DIAG, 1 / 12) - 1;

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
  onSalvar: () => void;
}

function BotaoSalvar({ onSalvar, rotulo = "Salvar" }: { onSalvar: () => void; rotulo?: string }) {
  const [estado, setEstado] = useState<"idle" | "salvando" | "salvo">("idle");
  const handleClick = () => {
    setEstado("salvando");
    onSalvar();
    setTimeout(() => {
      setEstado("salvo");
      setTimeout(() => setEstado("idle"), 2000);
    }, 400);
  };
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 0 4px" }}>
      <button
        onClick={handleClick}
        disabled={estado === "salvando"}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: estado === "salvo" ? "#15803D" : "#2563EB",
          color: "white", border: "none", borderRadius: 8,
          padding: "10px 24px", fontSize: 13, fontWeight: 600,
          cursor: estado === "salvando" ? "not-allowed" : "pointer",
          transition: "background 300ms", fontFamily: "inherit",
        }}
      >
        {estado === "salvando" && <i className="ti ti-loader-2" style={{ fontSize: 14 }} />}
        {estado === "salvo" && <i className="ti ti-circle-check" style={{ fontSize: 14 }} />}
        {estado === "idle" && <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />}
        {estado === "salvando" ? "Salvando..." : estado === "salvo" ? "Salvo!" : rotulo}
      </button>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "0.5px solid #E5E7EB",
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

function parseDateNasc(s: string): { ano: number; mes: number } | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { ano: Number(iso[1]), mes: Number(iso[2]) };
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return { ano: Number(br[3]), mes: Number(br[2]) };
  return null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function DiagLiberdadeFinanceira({ dadosColeta, dadosLF, onChange, onSalvar }: Props) {
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
  const [patrimonioEditado, setPatrimonioEditado] = useState(
    Number(dadosLF.patrimonioInicial) > 0 && Number(dadosLF.patrimonioInicial) !== patrimonioColeta
  );
  const [aporteEditado, setAporteEditado] = useState(
    Number(dadosLF.aporteMensal) > 0 && Number(dadosLF.aporteMensal) !== aporteColeta
  );
  const [rendaEditada, setRendaEditada] = useState(
    Number(dadosLF.rendaDesejada) > 0 && Number(dadosLF.rendaDesejada) !== rendaDesejadaColeta
  );

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
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      idadeAtual: idadeAtualCalculada,
      patrimonioInicial: !patrimonioEditado ? patrimonioColeta : prev.patrimonioInicial,
      aporteMensal: !aporteEditado ? aporteColeta : prev.aporteMensal,
      rendaDesejada: !rendaEditada ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, aporteColeta, rendaDesejadaColeta]);

  const setP = (patch: Partial<UIParams>) => setParams((p) => ({ ...p, ...patch }));

  const patrimonioPerpetuidade = useMemo(() => {
    if (!params.rendaDesejada || params.rendaDesejada <= 0) return 0;
    return calcularPatrimonioPerpetuidade(params.rendaDesejada);
  }, [params.rendaDesejada]);

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual: params.idadeAtual,
    idadeMeta: params.idadeAposentadoria,
    idadeMaxima: 100,
    patrimonioInicial: params.patrimonioInicial,
    aporteMensal: params.aporteMensal,
    rendaMensalDesejada: params.rendaDesejada,
    taxaRetornoAnual: TAXA_ANUAL_DIAG,
    anoNascimento,
    mesNascimento,
    objetivos: [],
  }), [params, anoNascimento, mesNascimento]);

  const result = useMemo(() => {
    try { return calcularProjecaoIF(projecaoParams); }
    catch { return null; }
  }, [projecaoParams]);

  const rendaSustentavel = useMemo(() => {
    if (!result || result.patrimonioNaIF <= 0) return 0;
    return (result.patrimonioNaIF * 0.04) / 12;
  }, [result]);

  const mesIF = result
    ? result.mesInicioRetirada
    : Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));

  // ── Análise de Sensibilidade ──
  const cenariosAporte = useMemo(() => [-40, -20, 0, 20, 40].map(pct => {
    const aporteC = Math.max(0, params.aporteMensal * (1 + pct / 100));
    const n = Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    const f = Math.pow(1 + TAXA_MENSAL_DIAG, n);
    const fv = params.patrimonioInicial * f + aporteC * (f - 1) / TAXA_MENSAL_DIAG;
    const pctMeta = patrimonioPerpetuidade > 0
      ? Math.min(100, Math.round(fv / patrimonioPerpetuidade * 100)) : 0;
    return { pctVariacao: pct, aporteC, pctMeta };
  }), [params.aporteMensal, params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, patrimonioPerpetuidade]);

  const cenariosIdade = useMemo(() => [-5, -2, 0, 2, 5].map(delta => {
    const idadeC = Math.max(params.idadeAtual + 1, params.idadeAposentadoria + delta);
    const n = Math.max(1, Math.round((idadeC - params.idadeAtual) * 12));
    const f = Math.pow(1 + TAXA_MENSAL_DIAG, n);
    const fv = params.patrimonioInicial * f + params.aporteMensal * (f - 1) / TAXA_MENSAL_DIAG;
    const pctMeta = patrimonioPerpetuidade > 0
      ? Math.min(100, Math.round(fv / patrimonioPerpetuidade * 100)) : 0;
    return { delta, idadeC, pctMeta };
  }), [params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, params.aporteMensal, patrimonioPerpetuidade]);

  if (!result) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
        Preencha os parâmetros para ver a simulação.
      </div>
    );
  }

  const corMeta = (pct: number) =>
    pct >= 91 ? "#15803D" : pct >= 51 ? "#B45309" : "#B91C1C";

  return (
    <div className="flex flex-col gap-6">

      {/* ── 1. Parâmetros ── */}
      <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#000000", margin: "0 0 12px" }}>
          Parâmetros da simulação
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, minHeight: 14, lineHeight: 1 }}>Idade atual</label>
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
            <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, minHeight: 14, lineHeight: 1 }}>Aposentadoria</label>
            <Input
              type="number"
              min={params.idadeAtual + 1}
              max={90}
              value={params.idadeAposentadoria}
              onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
              style={{ borderColor: "#BFDBFE", color: "#000000", padding: "6px 10px", fontSize: 12 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", minHeight: 14 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, lineHeight: 1 }}>Patrimônio</label>
              {patrimonioEditado && (
                <button onClick={() => { setP({ patrimonioInicial: patrimonioColeta }); setPatrimonioEditado(false); }}
                  style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  ↺
                </button>
              )}
            </div>
            <CurrencyInput
              value={params.patrimonioInicial}
              onChange={(v) => { setP({ patrimonioInicial: v }); setPatrimonioEditado(v !== patrimonioColeta); }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", minHeight: 14 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, lineHeight: 1 }}>Aporte mensal</label>
              {aporteEditado && (
                <button onClick={() => { setP({ aporteMensal: aporteColeta }); setAporteEditado(false); }}
                  style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  ↺
                </button>
              )}
            </div>
            <CurrencyInput value={params.aporteMensal} onChange={(v) => { setP({ aporteMensal: v }); setAporteEditado(v !== aporteColeta); }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", minHeight: 14 }}>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, lineHeight: 1 }}>Renda desejada</label>
              {rendaEditada && (
                <button onClick={() => { setP({ rendaDesejada: rendaDesejadaColeta }); setRendaEditada(false); }}
                  style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  ↺
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

      {/* ── 2. Gráfico ── */}
      <CardProjecaoPatrimonial
        projecao={result.projecao}
        objetivos={[]}
        height={320}
        mesIF={mesIF}
        mesNascimento={mesNascimento}
        patrimonioNecessario={patrimonioPerpetuidade}
      />

      {/* ── 3. Cards de resultado ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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

      {/* ── 4. Análise de Sensibilidade ── */}
      <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
          Análise de Sensibilidade
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Variando Aporte */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Variando Aporte
            </div>
            {cenariosAporte.map(c => (
              <div key={c.pctVariacao} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 8px", borderBottom: "0.5px solid #F3F4F6",
                background: c.pctVariacao === 0 ? "#F8FAFF" : "transparent",
                borderRadius: c.pctVariacao === 0 ? 4 : 0,
              }}>
                <span style={{ fontSize: 11, color: "#374151" }}>
                  {c.pctVariacao === 0 ? "Atual" : c.pctVariacao > 0 ? `+${c.pctVariacao}%` : `${c.pctVariacao}%`}
                  {" "}
                  <span style={{ color: "#9CA3AF", fontSize: 10 }}>({fmtBRL(c.aporteC)}/mês)</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: corMeta(c.pctMeta) }}>
                  {c.pctMeta}% da meta
                </span>
              </div>
            ))}
          </div>

          {/* Variando Prazo */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
              Variando Prazo
            </div>
            {cenariosIdade.map(c => (
              <div key={c.delta} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 8px", borderBottom: "0.5px solid #F3F4F6",
                background: c.delta === 0 ? "#F8FAFF" : "transparent",
                borderRadius: c.delta === 0 ? 4 : 0,
              }}>
                <span style={{ fontSize: 11, color: "#374151" }}>
                  {c.delta === 0 ? "Atual" : c.delta > 0 ? `+${c.delta} anos` : `${c.delta} anos`}
                  {" "}
                  <span style={{ color: "#9CA3AF", fontSize: 10 }}>({c.idadeC} anos)</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: corMeta(c.pctMeta) }}>
                  {c.pctMeta}% da meta
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      <BotaoSalvar onSalvar={onSalvar} rotulo="Salvar Liberdade Financeira" />
    </div>
  );
}
