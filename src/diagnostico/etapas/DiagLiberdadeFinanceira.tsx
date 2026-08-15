import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import {
  calcularProjecaoIF,
  calcularPatrimonioPerpetuidade,
  type ProjecaoIFParams,
  type PontoProjecao,
} from "@/lib/financialFreedomCalc";
import type { DadosColetaDiag, DadosLFDiag } from "../types";
import { CardProjecaoPatrimonial } from "@/components/shared/CardProjecaoPatrimonial";

const TAXA_PADRAO_DIAG = 6.0; // IPCA + 6%
const TAXA_RET_MENSAL  = Math.pow(1.04, 1 / 12) - 1;

interface Ajustes {
  usarTaxaCustom: boolean;
  taxaCustomAnual: number;
  usarCrescimentoAportes: boolean;
  crescimentoAportesAnual: number;
}

const initialAjustes: Ajustes = {
  usarTaxaCustom: false,
  taxaCustomAnual: TAXA_PADRAO_DIAG,
  usarCrescimentoAportes: false,
  crescimentoAportesAnual: 3.0,
};

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
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function DiagLiberdadeFinanceira({ dadosColeta, dadosLF, onChange, onSalvar }: Props) {
  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const anoNascimento = parsed?.ano ?? (new Date().getFullYear() - 30);
  const mesNascimento = parsed?.mes ?? 1;

  const idadeAtualCalculada = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30;

  const patrimonioColeta    = Number(dadosColeta.patrimonioFinanceiro) || 0;
  const aporteColeta        = Number(dadosColeta.aporteMensal) || 0;
  const rendaDesejadaColeta = Number(dadosColeta.rendaDesejadaAposentadoria) || 0;

  const initialParams: UIParams = {
    idadeAtual:         idadeAtualCalculada,
    idadeAposentadoria: Number(dadosLF.idadeAlvo) || Number(dadosColeta.idadeMeta) || 60,
    patrimonioInicial:  Number(dadosLF.patrimonioInicial) || patrimonioColeta,
    aporteMensal:       Number(dadosLF.aporteMensal) || aporteColeta,
    rendaDesejada:      Number(dadosLF.rendaDesejada) || rendaDesejadaColeta,
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

  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [ajustes, setAjustes] = useState<Ajustes>(() =>
    dadosLF.ajustes ? { ...initialAjustes, ...dadosLF.ajustes } : initialAjustes
  );
  const [campoFocado, setCampoFocado] = useState<string | null>(null);

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
    onChangeRef.current({ ajustes });
  }, [ajustes]);

  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      idadeAtual: idadeAtualCalculada,
      patrimonioInicial: !patrimonioEditado ? patrimonioColeta : prev.patrimonioInicial,
      aporteMensal:      !aporteEditado     ? aporteColeta     : prev.aporteMensal,
      rendaDesejada:     !rendaEditada      ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, aporteColeta, rendaDesejadaColeta]);

  const setP = (patch: Partial<UIParams>) => setParams((p) => ({ ...p, ...patch }));

  // ── Taxa efetiva ─────────────────────────────────────────────────────────
  const taxaAnualEfetiva = ajustes.usarTaxaCustom
    ? ajustes.taxaCustomAnual / 100
    : TAXA_PADRAO_DIAG / 100;

  const taxaLabel = ajustes.usarTaxaCustom
    ? `IPCA + ${ajustes.taxaCustomAnual.toFixed(2).replace(".", ",")}%`
    : "IPCA + 6,00%";

  // ── Ajustes avançados — derived rates ────────────────────────────────────
  const ajustesCalc = useMemo(() => {
    const taxaMensal = Math.pow(1 + taxaAnualEfetiva, 1 / 12) - 1;
    const crescimentoMensal = ajustes.usarCrescimentoAportes
      ? Math.pow(1 + ajustes.crescimentoAportesAnual / 100, 1 / 12) - 1
      : 0;
    return { taxaMensal, crescimentoMensal };
  }, [taxaAnualEfetiva, ajustes.usarCrescimentoAportes, ajustes.crescimentoAportesAnual]);

  const patrimonioPerpetuidade = useMemo(() => {
    if (!params.rendaDesejada || params.rendaDesejada <= 0) return 0;
    return calcularPatrimonioPerpetuidade(params.rendaDesejada);
  }, [params.rendaDesejada]);

  const projecaoParams: ProjecaoIFParams = useMemo(() => ({
    idadeAtual:          params.idadeAtual,
    idadeMeta:           params.idadeAposentadoria,
    idadeMaxima:         100,
    patrimonioInicial:   params.patrimonioInicial,
    aporteMensal:        params.aporteMensal,
    rendaMensalDesejada: params.rendaDesejada,
    taxaRetornoAnual:    taxaAnualEfetiva,
    anoNascimento,
    mesNascimento,
    objetivos:           [],
  }), [params, anoNascimento, mesNascimento, taxaAnualEfetiva]);

  const result = useMemo(() => {
    try { return calcularProjecaoIF(projecaoParams); }
    catch { return null; }
  }, [projecaoParams]);

  const patrimonioProjetado = useMemo(() => {
    if (!ajustes.usarCrescimentoAportes) {
      return result?.patrimonioNaIF ?? 0;
    }
    const meses = Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    let saldo = params.patrimonioInicial;
    let aporte = params.aporteMensal;
    for (let m = 0; m < meses; m++) {
      saldo = saldo * (1 + ajustesCalc.taxaMensal) + aporte;
      aporte *= (1 + ajustesCalc.crescimentoMensal);
    }
    return Math.max(0, Math.round(saldo));
  }, [
    ajustes.usarCrescimentoAportes, result,
    params.patrimonioInicial, params.aporteMensal,
    params.idadeAtual, params.idadeAposentadoria,
    ajustesCalc,
  ]);

  const rendaSustentavel = useMemo(() => {
    if (patrimonioProjetado <= 0) return 0;
    return (patrimonioProjetado * 0.04) / 12;
  }, [patrimonioProjetado]);

  const mesIF = result
    ? result.mesInicioRetirada
    : Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));

  const projecaoGrafico = useMemo((): PontoProjecao[] => {
    if (!result) return [];
    if (!ajustes.usarCrescimentoAportes) return result.projecao;

    const p0 = result.projecao[0];
    if (!p0) return result.projecao;

    let anoAtual = p0.ano;
    let mesAtual = p0.mesDoAno;
    let patrimonio = params.patrimonioInicial;
    let aporte = params.aporteMensal;

    const pontos: PontoProjecao[] = [
      { mes: 0, ano: anoAtual, mesDoAno: mesAtual, idade: p0.idade, patrimonio: Math.round(patrimonio), fase: "acumulacao" },
    ];

    const totalMeses = result.projecao.length - 1;
    for (let m = 1; m <= totalMeses; m++) {
      mesAtual++;
      if (mesAtual > 12) { mesAtual = 1; anoAtual++; }
      const idadeNoMes = Math.round((p0.idade + m / 12) * 10) / 10;
      if (m <= mesIF) {
        patrimonio = patrimonio * (1 + ajustesCalc.taxaMensal) + aporte;
        aporte *= (1 + ajustesCalc.crescimentoMensal);
        pontos.push({ mes: m, ano: anoAtual, mesDoAno: mesAtual, idade: idadeNoMes, patrimonio: Math.max(0, Math.round(patrimonio)), fase: "acumulacao" });
      } else {
        patrimonio = Math.max(0, patrimonio * (1 + TAXA_RET_MENSAL) - params.rendaDesejada);
        pontos.push({ mes: m, ano: anoAtual, mesDoAno: mesAtual, idade: idadeNoMes, patrimonio: Math.round(patrimonio), fase: "decumulacao" });
      }
    }
    return pontos;
  }, [result, ajustes.usarCrescimentoAportes, params.patrimonioInicial, params.aporteMensal, params.rendaDesejada, ajustesCalc.taxaMensal, ajustesCalc.crescimentoMensal, mesIF]);

  // ── Análise de Sensibilidade ──────────────────────────────────────────────
  const cenariosAporte = useMemo(() => [-40, -20, 0, 20, 40].map(pct => {
    const aporteC = Math.max(0, params.aporteMensal * (1 + pct / 100));
    const n = Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    const f = Math.pow(1 + ajustesCalc.taxaMensal, n);
    let fv: number;
    if (ajustes.usarCrescimentoAportes) {
      let saldo = params.patrimonioInicial;
      let ap = aporteC;
      for (let m = 0; m < n; m++) {
        saldo = saldo * (1 + ajustesCalc.taxaMensal) + ap;
        ap *= (1 + ajustesCalc.crescimentoMensal);
      }
      fv = saldo;
    } else {
      fv = params.patrimonioInicial * f + aporteC * (f - 1) / ajustesCalc.taxaMensal;
    }
    const pctMeta = patrimonioPerpetuidade > 0
      ? Math.min(100, Math.round(fv / patrimonioPerpetuidade * 100)) : 0;
    return { pctVariacao: pct, aporteC, pctMeta };
  }), [params.aporteMensal, params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, patrimonioPerpetuidade, ajustesCalc, ajustes.usarCrescimentoAportes]);

  const cenariosIdade = useMemo(() => [-5, -2, 0, 2, 5].map(delta => {
    const idadeC = Math.max(params.idadeAtual + 1, params.idadeAposentadoria + delta);
    const n = Math.max(1, Math.round((idadeC - params.idadeAtual) * 12));
    const f = Math.pow(1 + ajustesCalc.taxaMensal, n);
    let fv: number;
    if (ajustes.usarCrescimentoAportes) {
      let saldo = params.patrimonioInicial;
      let ap = params.aporteMensal;
      for (let m = 0; m < n; m++) {
        saldo = saldo * (1 + ajustesCalc.taxaMensal) + ap;
        ap *= (1 + ajustesCalc.crescimentoMensal);
      }
      fv = saldo;
    } else {
      fv = params.patrimonioInicial * f + params.aporteMensal * (f - 1) / ajustesCalc.taxaMensal;
    }
    const pctMeta = patrimonioPerpetuidade > 0
      ? Math.min(100, Math.round(fv / patrimonioPerpetuidade * 100)) : 0;
    return { delta, idadeC, pctMeta };
  }), [params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, params.aporteMensal, patrimonioPerpetuidade, ajustesCalc, ajustes.usarCrescimentoAportes]);

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

      {/* ── 1+2. PARÂMETROS + GRÁFICO LADO A LADO ──────────────────────────── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* Card estreito — Parâmetros */}
        <div style={{
          flex: "0 0 300px", width: 300,
          background: "white", border: "0.5px solid #E5E7EB",
          borderRadius: 12, padding: "16px 18px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>
            Parâmetros da Simulação
          </p>

          {/* 4 campos em coluna */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>

            {/* Renda Desejada */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Renda Desejada</label>
                  {rendaEditada && (
                    <button
                      onClick={() => { setP({ rendaDesejada: rendaDesejadaColeta }); setRendaEditada(false); }}
                      style={{ fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >↺</button>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  {fmtBRL(params.rendaDesejada ?? 0)}
                </span>
              </div>
              <input
                type="range"
                min={0} max={200000} step={500}
                value={params.rendaDesejada ?? 0}
                onChange={(e) => { const v = Number(e.target.value); setP({ rendaDesejada: v }); setRendaEditada(v !== rendaDesejadaColeta); }}
                style={{ width: "100%", accentColor: "#2563EB" }}
              />
              <input
                type="text"
                inputMode="numeric"
                value={campoFocado === "rendaDesejada" ? String(params.rendaDesejada ?? 0) : fmtBRL(params.rendaDesejada ?? 0)}
                onFocus={() => setCampoFocado("rendaDesejada")}
                onBlur={() => setCampoFocado(null)}
                onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9]/g, "")) || 0; setP({ rendaDesejada: v }); setRendaEditada(v !== rendaDesejadaColeta); }}
                style={{ width: "100%", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#111827", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", marginTop: 4, background: "white", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            {/* Aporte Mensal */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aporte Mensal</label>
                  {aporteEditado && (
                    <button
                      onClick={() => { setP({ aporteMensal: aporteColeta }); setAporteEditado(false); }}
                      style={{ fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >↺</button>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  {fmtBRL(params.aporteMensal ?? 0)}
                </span>
              </div>
              <input
                type="range"
                min={0} max={200000} step={500}
                value={params.aporteMensal ?? 0}
                onChange={(e) => { const v = Number(e.target.value); setP({ aporteMensal: v }); setAporteEditado(v !== aporteColeta); }}
                style={{ width: "100%", accentColor: "#2563EB" }}
              />
              <input
                type="text"
                inputMode="numeric"
                value={campoFocado === "aporteMensal" ? String(params.aporteMensal ?? 0) : fmtBRL(params.aporteMensal ?? 0)}
                onFocus={() => setCampoFocado("aporteMensal")}
                onBlur={() => setCampoFocado(null)}
                onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9]/g, "")) || 0; setP({ aporteMensal: v }); setAporteEditado(v !== aporteColeta); }}
                style={{ width: "100%", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#111827", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", marginTop: 4, background: "white", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            {/* Aposentadoria */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aposentadoria</label>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  {params.idadeAposentadoria ?? 60} anos
                </span>
              </div>
              <input
                type="range"
                min={40} max={90} step={1}
                value={params.idadeAposentadoria ?? 60}
                onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "#2563EB" }}
              />
              <input
                type="number"
                min={40} max={90} step={1}
                value={params.idadeAposentadoria ?? 60}
                onChange={(e) => setP({ idadeAposentadoria: e.target.value === "" ? 60 : Number(e.target.value) })}
                style={{ width: "100%", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#111827", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", marginTop: 4, background: "white", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            {/* Patrimônio */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Patrimônio</label>
                  {patrimonioEditado && (
                    <button
                      onClick={() => { setP({ patrimonioInicial: patrimonioColeta }); setPatrimonioEditado(false); }}
                      style={{ fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >↺</button>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  {fmtBRL(params.patrimonioInicial ?? 0)}
                </span>
              </div>
              <input
                type="range"
                min={0} max={10000000} step={10000}
                value={params.patrimonioInicial ?? 0}
                onChange={(e) => { const v = Number(e.target.value); setP({ patrimonioInicial: v }); setPatrimonioEditado(v !== patrimonioColeta); }}
                style={{ width: "100%", accentColor: "#2563EB" }}
              />
              <input
                type="text"
                inputMode="numeric"
                value={campoFocado === "patrimonioInicial" ? String(params.patrimonioInicial ?? 0) : fmtBRL(params.patrimonioInicial ?? 0)}
                onFocus={() => setCampoFocado("patrimonioInicial")}
                onBlur={() => setCampoFocado(null)}
                onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9]/g, "")) || 0; setP({ patrimonioInicial: v }); setPatrimonioEditado(v !== patrimonioColeta); }}
                style={{ width: "100%", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#111827", border: "1px solid #E5E7EB", borderRadius: 6, padding: "3px 6px", marginTop: 4, background: "white", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

          </div>

          {/* Ajustes avançados */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "0.5px solid #F3F4F6" }}>
            <button
              onClick={() => setMostrarAjustes(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", padding: 0,
                cursor: "pointer", fontSize: 12,
                color: mostrarAjustes ? "#2563EB" : "#6B7280",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }} />
              Ajustes avançados
              <i className={`ti ti-chevron-${mostrarAjustes ? "up" : "down"}`} style={{ fontSize: 11, marginLeft: 2 }} />
              {ajustes.usarTaxaCustom && (
                <span style={{ fontSize: 9, color: "#2563EB", background: "#DBEAFE", padding: "1px 6px", borderRadius: 99, marginLeft: 4 }}>
                  IPCA+{ajustes.taxaCustomAnual}%
                </span>
              )}
              {ajustes.usarCrescimentoAportes && (
                <span style={{ fontSize: 9, color: "#2563EB", background: "#DBEAFE", padding: "1px 6px", borderRadius: 99, marginLeft: 4 }}>
                  Crescimento {ajustes.crescimentoAportesAnual}%
                </span>
              )}
            </button>

            {mostrarAjustes && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Taxa de retorno personalizada */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      role="switch"
                      aria-checked={ajustes.usarTaxaCustom}
                      onClick={() => setAjustes(a => ({ ...a, usarTaxaCustom: !a.usarTaxaCustom }))}
                      style={{
                        width: 36, height: 20, borderRadius: 9999, flexShrink: 0,
                        background: ajustes.usarTaxaCustom ? "#2563EB" : "#D1D5DB",
                        border: "none", cursor: "pointer", position: "relative",
                      }}
                    >
                      <span style={{ position: "absolute", top: 2, left: ajustes.usarTaxaCustom ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white" }} />
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Taxa de retorno personalizada</span>
                  </div>
                  {ajustes.usarTaxaCustom && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 44 }}>
                      <Input
                        type="number" min={0} max={30} step={0.1}
                        value={ajustes.taxaCustomAnual}
                        onChange={(e) => setAjustes(a => ({ ...a, taxaCustomAnual: Number(e.target.value) }))}
                        style={{ width: 80, padding: "4px 8px", fontSize: 12, borderColor: "#BFDBFE" }}
                      />
                      <span style={{ fontSize: 12, color: "#6B7280" }}>% a.a. real</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>(padrão: {TAXA_PADRAO_DIAG.toFixed(1)}%)</span>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "0.5px solid #F3F4F6" }} />

                {/* Crescimento real de aportes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      role="switch"
                      aria-checked={ajustes.usarCrescimentoAportes}
                      onClick={() => setAjustes(a => ({ ...a, usarCrescimentoAportes: !a.usarCrescimentoAportes }))}
                      style={{
                        width: 36, height: 20, borderRadius: 9999, flexShrink: 0,
                        background: ajustes.usarCrescimentoAportes ? "#2563EB" : "#D1D5DB",
                        border: "none", cursor: "pointer", position: "relative",
                      }}
                    >
                      <span style={{ position: "absolute", top: 2, left: ajustes.usarCrescimentoAportes ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white" }} />
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Crescimento real de aportes</span>
                  </div>
                  {ajustes.usarCrescimentoAportes && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 44 }}>
                      <Input
                        type="number" min={0} max={20} step={0.1}
                        value={ajustes.crescimentoAportesAnual}
                        onChange={(e) => setAjustes(a => ({ ...a, crescimentoAportesAnual: Number(e.target.value) }))}
                        style={{ width: 80, padding: "4px 8px", fontSize: 12, borderColor: "#BFDBFE" }}
                      />
                      <span style={{ fontSize: 12, color: "#6B7280" }}>% a.a. real</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>crescimento anual do aporte</span>
                    </div>
                  )}
                </div>

                {(ajustes.usarTaxaCustom || ajustes.usarCrescimentoAportes) && (
                  <div style={{ padding: "8px 12px", background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8, fontSize: 11, color: "#1E40AF" }}>
                    Taxa efetiva anual: <strong>{(taxaAnualEfetiva * 100).toFixed(2)}% a.a.</strong>
                    {ajustes.usarCrescimentoAportes && (
                      <> · Crescimento do aporte: <strong>{ajustes.crescimentoAportesAnual.toFixed(1)}% a.a.</strong></>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <BotaoSalvar onSalvar={onSalvar} rotulo="Salvar Liberdade Financeira" />
        </div>

        {/* Card largo — Gráfico */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CardProjecaoPatrimonial
            projecao={projecaoGrafico}
            objetivos={[]}
            height={420}
            mesIF={mesIF}
            mesNascimento={mesNascimento}
            patrimonioNecessario={patrimonioPerpetuidade}
            taxaLabel={taxaLabel}
          />
        </div>
      </div>

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
            <p style={{ fontSize: 17, fontWeight: 700, color: result.ifAlcancada ? "#15803D" : "#B91C1C" }} className="tabular-nums">{formatCurrency(patrimonioProjetado)}</p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>na aposentadoria</p>
          </CardContent>
        </Card>

        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 }}>Renda Sustentável</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#111827" }} className="tabular-nums">
              {rendaSustentavel > 0
                ? fmtBRL(rendaSustentavel)
                : "—"}
            </p>
            <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>/mês com a projeção atual</p>
            {params.rendaDesejada > 0 && rendaSustentavel > 0 && (
              <p style={{ fontSize: 10, marginTop: 4, fontWeight: 500, color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#B91C1C" }}>
                {rendaSustentavel >= params.rendaDesejada
                  ? `✓ Meta de ${fmtBRL(params.rendaDesejada)}/mês atingida`
                  : `Meta: ${fmtBRL(params.rendaDesejada)}/mês`}
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

    </div>
  );
}
