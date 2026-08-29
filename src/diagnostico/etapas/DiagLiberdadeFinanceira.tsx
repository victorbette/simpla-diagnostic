import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import {
  calcularPatrimonioPerpetuidade,
  calcularPatrimonioNecessario,
  type PontoProjecao,
} from "@/lib/financialFreedomCalc";
import type { DadosColetaDiag, DadosLFDiag } from "../types";
import { CardProjecaoPatrimonial } from "@/components/shared/CardProjecaoPatrimonial";

import { TAXA_LF_RETIRO, taxaMensalDe } from "@/lib/taxasDiag";

const TAXA_PADRAO_DIAG = 6.0; // IPCA+6% padrão da seção LF — acumulação
const TAXA_MENSAL_RETIRO = taxaMensalDe(TAXA_LF_RETIRO); // IPCA+4% — fase de retirada

interface Ajustes {
  usarTaxaCustom: boolean;
  taxaCustomAnual: number;
}

const initialAjustes: Ajustes = {
  usarTaxaCustom: false,
  taxaCustomAnual: TAXA_PADRAO_DIAG,
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
  const { user } = useAuth();
  const isFeatureUser = user?.email === "victor.bette@simplawealth.com";

  const parsed = parseDateNasc(dadosColeta.dataNascimento ?? "");
  const mesNascimento = parsed?.mes ?? 1;

  const idadeAtualCalculada = parsed
    ? Math.floor((Date.now() - new Date(parsed.ano, parsed.mes - 1).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 30;

  const patrimonioColeta    = Number(dadosColeta.patrimonioFinanceiro) || 0;
  const aporteColeta        = Number(dadosColeta.aporteMensal) || 0;
  const rendaDesejadaColeta = Number(dadosColeta.rendaDesejadaAposentadoria) || 0;
  const idadeMetaColeta     = Number(dadosColeta.idadeMeta) || 0;

  const initialParams: UIParams = {
    idadeAtual:         idadeAtualCalculada,
    idadeAposentadoria: Number(dadosLF.idadeAlvo) || idadeMetaColeta || 65,
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
  const [idadeAposentadoriaEditada, setIdadeAposentadoriaEditada] = useState(
    Number(dadosLF.idadeAlvo) > 0 && Number(dadosLF.idadeAlvo) !== idadeMetaColeta
  );

  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [ajustes, setAjustes] = useState<Ajustes>(() => {
    if (dadosLF.ajustes) {
      return { ...initialAjustes, usarTaxaCustom: dadosLF.ajustes.usarTaxaCustom, taxaCustomAnual: dadosLF.ajustes.taxaCustomAnual };
    }
    return initialAjustes;
  });
  const [campoFocado, setCampoFocado] = useState<string | null>(null);

  const isFirstRender       = useRef(true);
  const isAjustesFirstRender = useRef(true);
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
    if (isAjustesFirstRender.current) { isAjustesFirstRender.current = false; return; }
    onChangeRef.current({ ajustes });
  }, [ajustes]);

  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      idadeAtual:         idadeAtualCalculada,
      idadeAposentadoria: !idadeAposentadoriaEditada && idadeMetaColeta > 0
        ? idadeMetaColeta
        : prev.idadeAposentadoria,
      patrimonioInicial:  !patrimonioEditado ? patrimonioColeta : prev.patrimonioInicial,
      aporteMensal:       !aporteEditado     ? aporteColeta     : prev.aporteMensal,
      rendaDesejada:      !rendaEditada      ? rendaDesejadaColeta : prev.rendaDesejada,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idadeAtualCalculada, patrimonioColeta, aporteColeta, rendaDesejadaColeta, idadeMetaColeta]);

  const setP = (patch: Partial<UIParams>) => setParams((p) => ({ ...p, ...patch }));

  // ── Taxa efetiva ─────────────────────────────────────────────────────────
  const taxaAnualEfetiva = ajustes.usarTaxaCustom
    ? ajustes.taxaCustomAnual / 100
    : TAXA_PADRAO_DIAG / 100;

  const taxaLabel = ajustes.usarTaxaCustom
    ? `Acumulação: IPCA + ${ajustes.taxaCustomAnual.toFixed(2).replace(".", ",")}% · Retirada: IPCA + 4%`
    : "Acumulação: IPCA + 6% · Retirada: IPCA + 4%";

  const taxaMensal = useMemo(
    () => Math.pow(1 + taxaAnualEfetiva, 1 / 12) - 1,
    [taxaAnualEfetiva]
  );

  // ── Projeção FV simples ───────────────────────────────────────────────────
  const patrimonioPerpetuidade = useMemo(() => {
    if (!params.rendaDesejada || params.rendaDesejada <= 0) return 0;
    return calcularPatrimonioPerpetuidade(params.rendaDesejada);
  }, [params.rendaDesejada]);

  const metaIF = useMemo(() => {
    if (!isFeatureUser || !params.rendaDesejada || params.rendaDesejada <= 0) return patrimonioPerpetuidade;
    return calcularPatrimonioNecessario(params.rendaDesejada, params.idadeAposentadoria);
  }, [isFeatureUser, patrimonioPerpetuidade, params.rendaDesejada, params.idadeAposentadoria]);

  const curvaIdealDiag = useMemo((): (number | null)[] | undefined => {
    if (!isFeatureUser || !params.rendaDesejada || metaIF <= 0) return undefined;
    const nMeses = Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    const f = Math.pow(1 + taxaMensal, nMeses);
    const aporteIdeal = f > 1 && params.patrimonioInicial * f < metaIF
      ? Math.max(0, (metaIF - params.patrimonioInicial * f) * taxaMensal / (f - 1))
      : 0;
    const anosTotal = Math.max(0, 90 - params.idadeAtual);
    const arr: (number | null)[] = new Array(anosTotal * 12 + 1).fill(null);
    for (let i = 0; i <= anosTotal; i++) {
      const m = i * 12;
      if (m >= arr.length) break;
      let val: number;
      if (m < nMeses) {
        const fi = Math.pow(1 + taxaMensal, m);
        val = m === 0
          ? params.patrimonioInicial
          : Math.round(params.patrimonioInicial * fi + aporteIdeal * (fi - 1) / taxaMensal);
      } else if (m === nMeses) {
        val = metaIF;
      } else {
        const mr = m - nMeses;
        const fr = Math.pow(1 + TAXA_MENSAL_RETIRO, mr);
        val = Math.max(0, Math.round(metaIF * fr - params.rendaDesejada * (fr - 1) / TAXA_MENSAL_RETIRO));
      }
      arr[m] = val;
    }
    return arr;
  }, [isFeatureUser, metaIF, params.patrimonioInicial, params.idadeAtual, params.idadeAposentadoria, params.rendaDesejada, taxaMensal]);

  const patrimonioProjetado = useMemo(() => {
    const meses = Math.max(0, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    if (meses === 0) return params.patrimonioInicial;
    const f = Math.pow(1 + taxaMensal, meses);
    if (!isFinite(f)) return params.patrimonioInicial;
    return Math.max(0, Math.round(
      params.patrimonioInicial * f + params.aporteMensal * (f - 1) / taxaMensal
    ));
  }, [params.patrimonioInicial, params.aporteMensal, params.idadeAtual, params.idadeAposentadoria, taxaMensal]);

  const rendaSustentavel = useMemo(() => {
    if (patrimonioProjetado <= 0) return 0;
    return (patrimonioProjetado * 0.04) / 12;
  }, [patrimonioProjetado]);

  // projecaoSimples é anual (índice = anos desde a idade atual), não mensal
  const mesIF = Math.max(0, Math.round(params.idadeAposentadoria - params.idadeAtual));

  // Projeção simples — sempre renderizável, mesmo se calcularProjecaoIF lançar
  const projecaoSimples: PontoProjecao[] = useMemo(() => {
    const IDADE_MAXIMA = 90;
    const anosTotal    = Math.max(0, IDADE_MAXIMA - params.idadeAtual);
    const anoAtual     = new Date().getFullYear();
    const mesesIF      = Math.max(0, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    // Patrimônio no momento da aposentadoria (início da fase de retirada)
    const fIF = mesesIF > 0 ? Math.pow(1 + taxaMensal, mesesIF) : 1;
    const patrimonioIF = isFinite(fIF)
      ? Math.round(params.patrimonioInicial * fIF + (mesesIF > 0 ? params.aporteMensal * (fIF - 1) / taxaMensal : 0))
      : params.patrimonioInicial;
    const retiradaMensal = params.rendaDesejada || 0;

    return Array.from({ length: anosTotal + 1 }, (_, i) => {
      const meses       = i * 12;
      const naAcumulacao = meses <= mesesIF;
      let patrimonio: number;
      if (naAcumulacao) {
        const f = meses > 0 ? Math.pow(1 + taxaMensal, meses) : 1;
        patrimonio = isFinite(f)
          ? Math.round(params.patrimonioInicial * f + (meses > 0 ? params.aporteMensal * (f - 1) / taxaMensal : 0))
          : params.patrimonioInicial;
      } else {
        const mesesRetira = meses - mesesIF;
        const f = Math.pow(1 + TAXA_MENSAL_RETIRO, mesesRetira);
        patrimonio = isFinite(f)
          ? Math.round(patrimonioIF * f - retiradaMensal * (f - 1) / TAXA_MENSAL_RETIRO)
          : patrimonioIF;
      }
      return {
        mes:       meses,
        ano:       anoAtual + i,
        mesDoAno:  mesNascimento,
        idade:     params.idadeAtual + i,
        patrimonio: Math.max(0, patrimonio),
        fase:      naAcumulacao ? ("acumulacao" as const) : ("decumulacao" as const),
      };
    });
  }, [params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, params.aporteMensal, params.rendaDesejada, taxaMensal, mesNascimento]);

  // ── Análise de Sensibilidade ──────────────────────────────────────────────
  const cenariosAporte = useMemo(() => [-40, -20, 0, 20, 40].map(pct => {
    const aporteC = Math.max(0, params.aporteMensal * (1 + pct / 100));
    const n = Math.max(1, Math.round((params.idadeAposentadoria - params.idadeAtual) * 12));
    const f = Math.pow(1 + taxaMensal, n);
    const fv = isFinite(f) ? params.patrimonioInicial * f + aporteC * (f - 1) / taxaMensal : params.patrimonioInicial;
    const pctMeta = metaIF > 0
      ? Math.min(100, Math.round(fv / metaIF * 100)) : 0;
    return { pctVariacao: pct, aporteC, fv, pctMeta };
  }), [params.aporteMensal, params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, metaIF, taxaMensal]);

  const cenariosIdade = useMemo(() => [-5, -2, 0, 2, 5].map(delta => {
    const idadeC = Math.max(params.idadeAtual + 1, params.idadeAposentadoria + delta);
    const n = Math.max(1, Math.round((idadeC - params.idadeAtual) * 12));
    const f = Math.pow(1 + taxaMensal, n);
    const fv = isFinite(f) ? params.patrimonioInicial * f + params.aporteMensal * (f - 1) / taxaMensal : params.patrimonioInicial;
    const pctMeta = metaIF > 0
      ? Math.min(100, Math.round(fv / metaIF * 100)) : 0;
    return { delta, idadeC, fv, pctMeta };
  }), [params.idadeAposentadoria, params.idadeAtual, params.patrimonioInicial, params.aporteMensal, metaIF, taxaMensal]);

  const corMeta = (pct: number) =>
    pct >= 100 ? "#15803D" : pct >= 51 ? "#B45309" : "#B91C1C";

  const ifAlcancada = patrimonioProjetado >= metaIF && metaIF > 0;

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
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>Aposentadoria</label>
                  {idadeAposentadoriaEditada && (
                    <button
                      onClick={() => { setP({ idadeAposentadoria: idadeMetaColeta || 65 }); setIdadeAposentadoriaEditada(false); }}
                      style={{ fontSize: 10, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >↺</button>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                  {params.idadeAposentadoria ?? 65} anos
                </span>
              </div>
              <input
                type="range"
                min={40} max={90} step={1}
                value={params.idadeAposentadoria ?? 65}
                onChange={(e) => { setP({ idadeAposentadoria: Number(e.target.value) }); setIdadeAposentadoriaEditada(true); }}
                style={{ width: "100%", accentColor: "#2563EB" }}
              />
              <input
                type="number"
                min={40} max={90} step={1}
                value={params.idadeAposentadoria ?? 65}
                onChange={(e) => { setP({ idadeAposentadoria: e.target.value === "" ? 65 : Number(e.target.value) }); setIdadeAposentadoriaEditada(true); }}
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

          {/* Ajustes avançados — apenas taxa custom */}
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

                {ajustes.usarTaxaCustom && (
                  <div style={{ padding: "8px 12px", background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8, fontSize: 11, color: "#1E40AF" }}>
                    Taxa efetiva anual: <strong>{(taxaAnualEfetiva * 100).toFixed(2)}% a.a.</strong>
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
            projecao={projecaoSimples}
            objetivos={[]}
            height={420}
            mesIF={mesIF}
            mesNascimento={mesNascimento}
            patrimonioNecessario={isFeatureUser ? undefined : metaIF}
            curvaIdeal={curvaIdealDiag}
            taxaLabel={taxaLabel}
            mostrarZoom={false}
          />
        </div>
      </div>

      {/* ── 3. Cards de resultado ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
              {isFeatureUser ? "Aposentadoria Ideal" : "Patrimônio Necessário"}
            </p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1E40AF" }} className="tabular-nums">{formatCurrency(metaIF)}</p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>
              {isFeatureUser ? `Para ${fmtBRL(params.rendaDesejada)}/mês até os 90 anos` : "perpetuidade (regra dos 4%)"}
            </p>
          </CardContent>
        </Card>

        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
              {isFeatureUser ? "Patrimônio Total Projetado" : "Projeção Atual"}
            </p>
            <p style={{ fontSize: 17, fontWeight: 700, color: ifAlcancada ? "#15803D" : "#B91C1C" }} className="tabular-nums">{formatCurrency(patrimonioProjetado)}</p>
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0" }}>na aposentadoria</p>
          </CardContent>
        </Card>

        <Card style={cardStyle}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 }}>Renda Sustentável</p>
            <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: rendaSustentavel >= params.rendaDesejada ? "#15803D" : "#111827" }} className="tabular-nums">
              {rendaSustentavel > 0 ? fmtBRL(rendaSustentavel) : "—"}
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
                  {fmtBRL(c.fv)}
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
                  {fmtBRL(c.fv)}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
