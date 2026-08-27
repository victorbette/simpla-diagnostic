import { useState, useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import type { ResultadoIF } from "@/types/estrategiaResultados";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RegistroPatrimonio {
  id: string;
  ano: number;
  mes: number;
  valor: number;
}

interface ChartPoint {
  label: string;
  ano: number;
  mes: number;
  planed: number | null;
  bandUpper: number | null;
  bandLower: number | null;
  realizado: number | null;
  isHoje: boolean;
}

interface Impacto {
  metaOriginal: number;
  anoMeta: number;
  mesMeta: number;
  patrimonioFinalNaData: number;
  mesesAntecipados: number;
  revisoAno: number;
  revisoMes: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MES_LABELS = ["Jan.", "Fev.", "Mar.", "Abr.", "Mai.", "Jun.", "Jul.", "Ago.", "Set.", "Out.", "Nov.", "Dez."];
const BAND_PCT = 0.047;
const STORAGE_KEY = (id: string) => `patrimonio_historico_${id}`;

// ── Persistence ────────────────────────────────────────────────────────────────

function loadRegistros(clienteId: string): RegistroPatrimonio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(clienteId));
    if (raw) return JSON.parse(raw) as RegistroPatrimonio[];
  } catch { /**/ }
  return [];
}

function saveRegistros(clienteId: string, registros: RegistroPatrimonio[]): void {
  try { localStorage.setItem(STORAGE_KEY(clienteId), JSON.stringify(registros)); } catch { /**/ }
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatM(v: number): string {
  const abs = Math.abs(v);
  const prefix = v < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${prefix}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `${prefix}R$ ${(abs / 1_000).toFixed(0)}k`;
  return `${prefix}R$ ${abs.toFixed(0)}`;
}

function formatMes(ano: number, mes: number): string {
  return `${MES_LABELS[mes - 1]}/${String(ano).slice(2)}`;
}

function parseValorInput(raw: string): number {
  // Accept: "12.1M", "12,1M", "12100000", "12.1", numbers with thousand separators
  const s = raw.trim();
  const multiplier = /[Mm]$/.test(s) ? 1_000_000 : /[Kk]$/.test(s) ? 1_000 : 1;
  const num = parseFloat(s.replace(/[MmKk]$/, "").replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? NaN : num * multiplier;
}

// ── Planned-line builder ───────────────────────────────────────────────────────
//
// Usa os valores exatos de resultadoIF.projecao (os mesmos do gráfico LF).
// Para meses anteriores ao início da projeção, extrapola para trás:
//   P(t-1) = (P(t) − aporte) / (1 + taxaMensal)

function buildPlanedMap(
  resultadoIF: ResultadoIF,
  meses: { ano: number; mes: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  if (!resultadoIF.projecao?.length || !meses.length) return map;

  const taxaMensal = Math.pow(1 + Math.max(0, resultadoIF.taxaRetorno), 1 / 12) - 1;
  const aporte = resultadoIF.aporteAtual ?? 0;

  // Indexa todos os pontos da projeção por ano-mes
  const projecaoMap = new Map<string, number>();
  resultadoIF.projecao.forEach(p =>
    projecaoMap.set(`${p.ano}-${p.mesDoAno}`, p.patrimonio),
  );

  // Ponto mais antigo da projeção (normalmente = hoje na data do cálculo LF)
  const sorted = [...resultadoIF.projecao].sort(
    (a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mesDoAno - b.mesDoAno,
  );
  const startPt = sorted[0];

  for (const { ano, mes } of meses) {
    const key = `${ano}-${mes}`;
    if (projecaoMap.has(key)) {
      // Mês presente na projeção LF: usa valor exato
      map.set(key, projecaoMap.get(key)!);
    } else {
      // Mês anterior ao início da projeção: extrapola para trás
      const mesesAntes = (startPt.ano - ano) * 12 + (startPt.mesDoAno - mes);
      if (mesesAntes > 0) {
        let p = startPt.patrimonio;
        for (let i = 0; i < mesesAntes; i++) {
          p = taxaMensal > 0
            ? (p - aporte) / (1 + taxaMensal)
            : p - aporte;
        }
        map.set(key, Math.max(0, Math.round(p)));
      }
    }
  }

  return map;
}

// ── Chart data builder ─────────────────────────────────────────────────────────

function buildChartData(
  registros: RegistroPatrimonio[],
  resultadoIF: ResultadoIF | null,
  anoAtual: number,
  mesAtual: number,
): ChartPoint[] {
  if (registros.length === 0) return [];

  const primeiro = registros[0];
  const ultimo  = registros[registros.length - 1];

  // O gráfico vai do primeiro registro até o maior entre "hoje" e o último registro
  const fimAno = ultimo.ano > anoAtual || (ultimo.ano === anoAtual && ultimo.mes > mesAtual)
    ? ultimo.ano : anoAtual;
  const fimMes = fimAno === anoAtual && ultimo.ano === anoAtual
    ? Math.max(mesAtual, ultimo.mes)
    : (fimAno > anoAtual ? ultimo.mes : mesAtual);

  const meses: { ano: number; mes: number }[] = [];
  let a = primeiro.ano, m = primeiro.mes;
  for (;;) {
    meses.push({ ano: a, mes: m });
    if (a === fimAno && m === fimMes) break;
    m++;
    if (m > 12) { m = 1; a++; }
    if (a > anoAtual + 10) break; // safety cap
  }

  const realizadoMap = new Map<string, number>();
  registros.forEach(r => realizadoMap.set(`${r.ano}-${r.mes}`, r.valor));

  // Valores exatos da projeção LF (+ extrapolação retroativa para meses históricos)
  const planedMap = resultadoIF
    ? buildPlanedMap(resultadoIF, meses)
    : new Map<string, number>();

  return meses.map(({ ano, mes }) => {
    const realizado = realizadoMap.get(`${ano}-${mes}`) ?? null;
    // PL planejado só exibe onde há registro realizado
    const rawPlaned = realizado != null ? (planedMap.get(`${ano}-${mes}`) ?? null) : null;
    return {
      label: formatMes(ano, mes),
      ano, mes,
      planed: rawPlaned,
      bandUpper: rawPlaned != null ? rawPlaned * (1 + BAND_PCT) : null,
      bandLower: rawPlaned != null ? rawPlaned * (1 - BAND_PCT) : null,
      realizado,
      isHoje: ano === anoAtual && mes === mesAtual,
    };
  });
}

// ── Impact calculator ──────────────────────────────────────────────────────────

function calcularImpacto(
  r: ResultadoIF,
  patrimonioAtual: number,
  anoHoje: number,
  mesHoje: number,
): Impacto | null {
  if (!r.idadeMeta) return null;

  // Usa o ponto exato da projeção LF (mesInicioRetirada) para garantir que
  // a data meta coincide com o que é exibido na aba de Liberdade Financeira.
  const idxRetirada = r.mesInicioRetirada ?? null;
  const pontoRetirada = idxRetirada != null ? r.projecao?.[idxRetirada] : null;

  const anoMeta = pontoRetirada?.ano
    ?? (r.anoNascimento ? r.anoNascimento + Math.floor(r.idadeMeta) : anoHoje + Math.floor(r.anosRestantes ?? 0));
  const mesMeta = pontoRetirada?.mesDoAno
    ?? (r.mesNascimento ?? mesHoje);

  const mesesParaMeta = Math.max(1, (anoMeta - anoHoje) * 12 + (mesMeta - mesHoje));

  const taxaMensal = Math.pow(1 + r.taxaRetorno, 1 / 12) - 1;
  if (taxaMensal <= 0) return null;

  const aporte = r.aporteAtual;

  // Project actual patrimony to original retirement date
  const patrimonioFinalNaData =
    patrimonioAtual * Math.pow(1 + taxaMensal, mesesParaMeta) +
    aporte * (Math.pow(1 + taxaMensal, mesesParaMeta) - 1) / taxaMensal;

  // Find how many months from today to reach the meta
  let p = patrimonioAtual;
  let n = 0;
  const META = r.patrimonioNecessario;
  while (p < META && n < 600) {
    p = p * (1 + taxaMensal) + aporte;
    n++;
  }

  const mesesAntecipados = mesesParaMeta - n;

  let revisoMes = mesHoje + (n % 12);
  let revisoAno = anoHoje + Math.floor(n / 12);
  if (revisoMes > 12) { revisoMes -= 12; revisoAno++; }

  return { metaOriginal: META, anoMeta, mesMeta, patrimonioFinalNaData, mesesAntecipados, revisoAno, revisoMes };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ width: 32, height: 3, background: "#1E3A8A", borderRadius: 2, marginBottom: 10 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{title}</p>
        {subtitle && <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, subColor, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  accent?: boolean;
}) {
  return (
    <div style={{
      background: "white",
      border: accent ? "1.5px solid #15803D" : "0.5px solid #E5E7EB",
      borderRadius: 10,
      padding: "16px 20px",
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", margin: "0 0 4px", lineHeight: 1.15 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: subColor ?? "#6B7280", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function ChartLegend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: "center", marginTop: 8 }}>
      {[
        { label: "PL planejado", color: "#94A3B8", dashed: true },
        { label: "Banda esperada", color: "rgba(148,163,184,0.4)", box: true },
        { label: "PL realizado", color: "#1E3A8A", dashed: false },
      ].map(({ label, color, dashed, box }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {box ? (
            <div style={{ width: 20, height: 10, background: color, borderRadius: 2 }} />
          ) : (
            <svg width={22} height={10}>
              <line x1={0} y1={5} x2={22} y2={5} stroke={color} strokeWidth={dashed ? 1.5 : 2}
                strokeDasharray={dashed ? "4 2" : undefined} />
            </svg>
          )}
          <span style={{ fontSize: 11, color: "#6B7280" }}>{label}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width={12} height={12}>
          <circle cx={6} cy={6} r={5} fill="#1E3A8A" stroke="white" strokeWidth={1.5} />
        </svg>
        <span style={{ fontSize: 11, color: "#6B7280" }}>Hoje</span>
      </div>
    </div>
  );
}

// ── Timeline component ─────────────────────────────────────────────────────────

function Timeline({ impacto, anoHoje }: { impacto: Impacto; anoHoje: number }) {
  const mesesAnt = impacto.mesesAntecipados;
  const ahead = mesesAnt >= 0;

  // Positions on a 0..1 scale
  const hojePos = 0.12;
  const metaPos = 0.78;
  const revisoPos = ahead ? metaPos - 0.08 : metaPos + 0.1;

  return (
    <div style={{ padding: "8px 0" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 20px" }}>
        Linha do Tempo da Aposentadoria
      </p>
      <div style={{ position: "relative", height: 60 }}>
        {/* Base line */}
        <div style={{ position: "absolute", top: 20, left: "0%", right: "0%", height: 1, background: "#D1D5DB" }} />

        {/* Hoje */}
        <div style={{ position: "absolute", top: 13, left: `${hojePos * 100}%`, transform: "translateX(-50%)" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#E5E7EB", border: "2px solid #9CA3AF", margin: "0 auto" }} />
          <p style={{ fontSize: 10, color: "#9CA3AF", margin: "4px 0 0", textAlign: "center", whiteSpace: "nowrap" }}>Hoje · {anoHoje}</p>
        </div>

        {/* Meta original */}
        <div style={{ position: "absolute", top: 13, left: `${metaPos * 100}%`, transform: "translateX(-50%)" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "white", border: "2px solid #374151", margin: "0 auto" }} />
          <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: "4px 0 0", textAlign: "center", whiteSpace: "nowrap" }}>
            {MES_LABELS[impacto.mesMeta - 1].replace(".", "")}/{impacto.anoMeta}
          </p>
          <p style={{ fontSize: 10, color: "#9CA3AF", margin: "2px 0 0", textAlign: "center", whiteSpace: "nowrap" }}>Meta original</p>
        </div>

        {/* Revisão */}
        <div style={{ position: "absolute", top: 13, left: `${Math.min(0.95, Math.max(0.2, revisoPos)) * 100}%`, transform: "translateX(-50%)" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: ahead ? "#15803D" : "#B91C1C", border: "none", margin: "0 auto" }} />
          <p style={{ fontSize: 10, color: ahead ? "#15803D" : "#B91C1C", fontWeight: 600, margin: "4px 0 0", textAlign: "center", whiteSpace: "nowrap" }}>
            {MES_LABELS[impacto.revisoMes - 1].replace(".", "")}/{impacto.revisoAno}
          </p>
          <p style={{ fontSize: 10, color: ahead ? "#15803D" : "#B91C1C", margin: "2px 0 0", textAlign: "center", whiteSpace: "nowrap" }}>
            {ahead ? `−${Math.abs(mesesAnt)} meses` : `+${Math.abs(mesesAnt)} meses`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number | null; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const realizado = payload.find(p => p.dataKey === "realizado")?.value;
  const planed = payload.find(p => p.dataKey === "planed")?.value;
  return (
    <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>{label}</p>
      {realizado != null && <p style={{ color: "#1E3A8A", margin: "2px 0", fontWeight: 600 }}>Realizado: {formatM(realizado)}</p>}
      {planed != null && <p style={{ color: "#94A3B8", margin: "2px 0" }}>Planejado: {formatM(planed)}</p>}
    </div>
  );
}

// ── Add/Edit form ──────────────────────────────────────────────────────────────

function AddForm({
  anoAtual,
  formAno, setFormAno,
  formMes, setFormMes,
  formValor, setFormValor,
  onSave, onCancel,
}: {
  anoAtual: number;
  formAno: string; setFormAno: (v: string) => void;
  formMes: string; setFormMes: (v: string) => void;
  formValor: string; setFormValor: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ background: "#F0F7FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
      <div>
        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Mês</label>
        <select value={formMes} onChange={e => setFormMes(e.target.value)}
          style={{ fontSize: 13, border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "6px 10px", color: "#111827", background: "white" }}>
          {MES_LABELS.map((l, i) => <option key={i} value={String(i + 1)}>{l}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Ano</label>
        <select value={formAno} onChange={e => setFormAno(e.target.value)}
          style={{ fontSize: 13, border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "6px 10px", color: "#111827", background: "white" }}>
          {Array.from({ length: 14 }, (_, i) => anoAtual - 4 + i).map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Patrimônio (ex: 1.2M ou 1200000)</label>
        <input
          type="text"
          value={formValor}
          onChange={e => setFormValor(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSave()}
          placeholder="R$ 1,2M"
          style={{ fontSize: 13, border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "6px 10px", color: "#111827", width: "100%", boxSizing: "border-box", outline: "none" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSave}
          style={{ fontSize: 12, fontWeight: 600, background: "#1E3A8A", color: "white", border: "none", borderRadius: 6, padding: "7px 16px", cursor: "pointer" }}>
          Salvar
        </button>
        <button onClick={onCancel}
          style={{ fontSize: 12, color: "#6B7280", background: "white", border: "0.5px solid #E5E7EB", borderRadius: 6, padding: "7px 12px", cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

interface Props {
  clienteId: string;
  resultadoIF: ResultadoIF | null;
}

export function EvolucaoPatrimonio({ clienteId, resultadoIF }: Props) {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const [registros, setRegistros] = useState<RegistroPatrimonio[]>(() => loadRegistros(clienteId));
  const [showAdd, setShowAdd] = useState(false);
  const [formAno, setFormAno] = useState(String(anoAtual));
  const [formMes, setFormMes] = useState(String(mesAtual));
  const [formValor, setFormValor] = useState("");

  const registrosOrdenados = useMemo(
    () => [...registros].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes),
    [registros],
  );

  const chartData = useMemo(
    () => buildChartData(registrosOrdenados, resultadoIF, anoAtual, mesAtual),
    [registrosOrdenados, resultadoIF, anoAtual, mesAtual],
  );

  const primeiro = registrosOrdenados[0];
  const ultimo = registrosOrdenados[registrosOrdenados.length - 1];

  const planedHoje = useMemo(() => {
    if (!resultadoIF) return null;
    const m = buildPlanedMap(resultadoIF, [{ ano: anoAtual, mes: mesAtual }]);
    return m.get(`${anoAtual}-${mesAtual}`) ?? null;
  }, [resultadoIF, anoAtual, mesAtual]);

  const desvio = (ultimo && planedHoje != null) ? ultimo.valor - planedHoje : null;

  const impacto = useMemo(() => {
    if (!resultadoIF || !ultimo) return null;
    return calcularImpacto(resultadoIF, ultimo.valor, anoAtual, mesAtual);
  }, [resultadoIF, ultimo, anoAtual, mesAtual]);

  function handleSave() {
    const valor = parseValorInput(formValor);
    if (!valor || isNaN(valor) || valor <= 0) return;
    const ano = parseInt(formAno);
    const mes = parseInt(formMes);
    const existingIdx = registros.findIndex(r => r.ano === ano && r.mes === mes);
    let next: RegistroPatrimonio[];
    if (existingIdx >= 0) {
      next = registros.map((r, i) => i === existingIdx ? { ...r, valor } : r);
    } else {
      next = [...registros, { id: `${ano}-${mes}-${Date.now()}`, ano, mes, valor }];
    }
    setRegistros(next);
    saveRegistros(clienteId, next);
    setShowAdd(false);
    setFormValor("");
  }

  function handleDelete(id: string) {
    const next = registros.filter(r => r.id !== id);
    setRegistros(next);
    saveRegistros(clienteId, next);
  }

  // Y domain with headroom
  const allVals = chartData.flatMap(d =>
    [d.realizado, d.bandUpper, d.bandLower].filter((v): v is number => v != null)
  );
  const minVal = allVals.length ? Math.min(...allVals) * 0.93 : 0;
  const maxVal = allVals.length ? Math.max(...allVals) * 1.04 : 1;

  const tickInterval = chartData.length > 18 ? Math.ceil(chartData.length / 10) - 1 : 1;

  const ultimoChartPt = chartData.filter(d => d.realizado != null).at(-1);

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (registros.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle title="Evolução do Patrimônio" />
          <button onClick={() => setShowAdd(true)}
            style={{ fontSize: 12, fontWeight: 600, background: "#1E3A8A", color: "white", border: "none", borderRadius: 6, padding: "7px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} />
            Adicionar registro
          </button>
        </div>
        {showAdd && (
          <AddForm
            anoAtual={anoAtual}
            formAno={formAno} setFormAno={setFormAno}
            formMes={formMes} setFormMes={setFormMes}
            formValor={formValor} setFormValor={setFormValor}
            onSave={handleSave} onCancel={() => setShowAdd(false)}
          />
        )}
        <div style={{ textAlign: "center", padding: "64px 0", color: "#9CA3AF" }}>
          <i className="ti ti-chart-line" style={{ fontSize: 40, display: "block", marginBottom: 12, color: "#BFDBFE" }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "#6B7280", margin: "0 0 4px" }}>Nenhum registro de patrimônio ainda</p>
          <p style={{ fontSize: 12, margin: 0 }}>Adicione o PL mensal do cliente para visualizar a evolução comparada ao plano</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── PL Realizado vs. Planejado ──────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <SectionTitle
            title="PL Realizado vs. Planejado"
            subtitle={`Banda cinza = oscilação esperada (±${(BAND_PCT * 100).toFixed(1).replace(".", ",")}%)`}
          />
          <button onClick={() => setShowAdd(v => !v)}
            style={{ fontSize: 12, fontWeight: 600, background: showAdd ? "#F3F4F6" : "#1E3A8A", color: showAdd ? "#6B7280" : "white", border: showAdd ? "0.5px solid #E5E7EB" : "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <i className={`ti ${showAdd ? "ti-x" : "ti-plus"}`} style={{ fontSize: 13 }} />
            {showAdd ? "Cancelar" : "Adicionar"}
          </button>
        </div>

        {showAdd && (
          <div style={{ marginBottom: 16 }}>
            <AddForm
              anoAtual={anoAtual}
              formAno={formAno} setFormAno={setFormAno}
              formMes={formMes} setFormMes={setFormMes}
              formValor={formValor} setFormValor={setFormValor}
              onSave={handleSave} onCancel={() => setShowAdd(false)}
            />
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <StatCard
            label="PL no início do período"
            value={formatM(primeiro.valor)}
            sub={`${MES_LABELS[primeiro.mes - 1]} ${primeiro.ano}`}
          />
          <StatCard
            label="PL Atual"
            value={formatM(ultimo.valor)}
            sub={`${MES_LABELS[ultimo.mes - 1]} ${ultimo.ano}`}
          />
          <StatCard
            label="PL Planejado para hoje"
            value={planedHoje != null ? formatM(planedHoje) : "—"}
            sub={desvio != null
              ? `${desvio >= 0 ? "+" : ""}${formatM(desvio)} de desvio`
              : resultadoIF ? "Sem projeção para este mês" : "Plano LF não calculado"}
            subColor={desvio != null ? (desvio >= 0 ? "#15803D" : "#B91C1C") : "#9CA3AF"}
            accent={desvio != null && desvio > 0}
          />
        </div>

        {/* Aviso quando não há dados LF */}
        {!resultadoIF && (
          <div style={{ background: "#FFFBEB", border: "0.5px solid #FDE68A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 16, color: "#D97706", flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#92400E", margin: 0 }}>
              A linha <strong>PL planejado</strong> usa a projeção da aba <strong>Liberdade Financeira</strong>.
              Abra essa aba, ajuste os parâmetros e clique em <strong>Salvar simulação</strong> para ativar a comparação.
            </p>
          </div>
        )}
        {resultadoIF && !resultadoIF.projecao?.length && (
          <div style={{ background: "#FFF7ED", border: "0.5px solid #FED7AA", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#EA580C", flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#7C2D12", margin: 0 }}>
              A projeção salva não contém dados. Verifique os parâmetros de Liberdade Financeira (idade meta, renda desejada, taxa de retorno) e salve novamente.
            </p>
          </div>
        )}

        {/* Chart */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "24px 16px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center", margin: "0 0 20px" }}>
            PL Realizado vs. Planejado
            {planedHoje != null && <span style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF", marginLeft: 10 }}>Banda cinza = oscilação esperada (±{(BAND_PCT * 100).toFixed(1).replace(".", ",")}%)</span>}
          </p>

          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 64, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
                interval={tickInterval}
              />
              <YAxis
                tickFormatter={v => formatM(v)}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                domain={[minVal, maxVal]}
                width={68}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Band: upper → fills from chart bottom to bandUpper */}
              <Area
                type="monotone"
                dataKey="bandUpper"
                fill="rgba(148,163,184,0.15)"
                stroke="none"
                fillOpacity={1}
                connectNulls
                isAnimationActive={false}
              />
              {/* Band: lower → paints white from chart bottom to bandLower (clips the band below) */}
              <Area
                type="monotone"
                dataKey="bandLower"
                fill="white"
                stroke="none"
                fillOpacity={1}
                connectNulls
                isAnimationActive={false}
              />

              {/* Planned (dashed) */}
              <Line
                type="monotone"
                dataKey="planed"
                stroke="#94A3B8"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
                name="PL planejado"
              />

              {/* Realized (solid) */}
              <Line
                type="monotone"
                dataKey="realizado"
                stroke="#1E3A8A"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
                name="PL realizado"
              />

              {/* "Hoje" dot */}
              {ultimoChartPt?.realizado != null && (
                <ReferenceDot
                  x={ultimoChartPt.label}
                  y={ultimoChartPt.realizado}
                  r={7}
                  fill="#1E3A8A"
                  stroke="white"
                  strokeWidth={2.5}
                  label={{
                    value: formatM(ultimoChartPt.realizado),
                    position: "right",
                    style: { fontSize: 11, fontWeight: 700, fill: "#1E3A8A" },
                  }}
                />
              )}

              {/* "Planejado" label on right edge — reflects last registro's planned value */}
              {ultimoChartPt?.planed != null && (
                <ReferenceDot
                  x={ultimoChartPt.label}
                  y={ultimoChartPt.planed}
                  r={0}
                  label={{
                    value: `${formatM(ultimoChartPt.planed)} plan.`,
                    position: "right",
                    style: { fontSize: 10, fill: "#94A3B8" },
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          <ChartLegend />
        </div>
      </div>

      {/* ── Impacto na Re-Projeção ──────────────────────────────────────────────── */}
      {impacto && resultadoIF && (
        <div>
          <SectionTitle title="Impacto na Re-Projeção" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            {/* Meta original */}
            <StatCard
              label="Meta Original"
              value={formatM(impacto.metaOriginal)}
              sub={`Aposentadoria em ${MES_LABELS[impacto.mesMeta - 1].toLowerCase()}/${impacto.anoMeta}`}
            />

            {/* Mantendo a data */}
            <StatCard
              label={`Mantendo a data · ${impacto.anoMeta}`}
              value={formatM(impacto.patrimonioFinalNaData)}
              sub={(() => {
                const diff = impacto.patrimonioFinalNaData - impacto.metaOriginal;
                const pct = (diff / impacto.metaOriginal * 100).toFixed(1).replace(".", ",");
                return diff >= 0
                  ? `+${formatM(diff)} · ${pct}% acima do planejado`
                  : `${formatM(diff)} · ${pct}% abaixo do planejado`;
              })()}
              subColor={impacto.patrimonioFinalNaData >= impacto.metaOriginal ? "#15803D" : "#B91C1C"}
              accent={impacto.patrimonioFinalNaData >= impacto.metaOriginal}
            />

            {/* Mantendo a meta */}
            <StatCard
              label={`Mantendo a meta · ${formatM(impacto.metaOriginal)}`}
              value={`${impacto.mesesAntecipados >= 0 ? "−" : "+"}${Math.abs(impacto.mesesAntecipados)} ${Math.abs(impacto.mesesAntecipados) === 1 ? "mês" : "meses"} de ${impacto.mesesAntecipados >= 0 ? "antecipação" : "atraso"}`}
              sub={`Aposentadoria em ${MES_LABELS[impacto.revisoMes - 1].toLowerCase()}/${impacto.revisoAno}`}
              subColor={impacto.mesesAntecipados >= 0 ? "#15803D" : "#B91C1C"}
              accent={impacto.mesesAntecipados > 0}
            />
          </div>

          <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 28px" }}>
            <Timeline impacto={impacto} anoHoje={anoAtual} />
          </div>
        </div>
      )}

      {/* ── Histórico de registros ──────────────────────────────────────────────── */}
      <div>
        <SectionTitle title="Histórico de Registros" />
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", padding: "8px 18px", background: "#F8FAFF", borderBottom: "0.5px solid #E5E7EB", fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>Período</span>
            <span>Patrimônio</span>
            <span>Planejado</span>
            <span />
          </div>
          {registrosOrdenados.map((r) => {
            const planed = resultadoIF
              ? buildPlanedMap(resultadoIF, [{ ano: r.ano, mes: r.mes }]).get(`${r.ano}-${r.mes}`) ?? null
              : null;
            const diff = planed != null ? r.valor - planed : null;
            return (
              <div
                key={r.id}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", padding: "11px 18px", borderBottom: "0.5px solid #F3F4F6", alignItems: "center" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                  {MES_LABELS[r.mes - 1]} {r.ano}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{formatM(r.valor)}</span>
                <span style={{ fontSize: 12, color: "#6B7280" }}>
                  {planed != null ? (
                    <>
                      {formatM(planed)}
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: diff! >= 0 ? "#15803D" : "#B91C1C" }}>
                        {diff! >= 0 ? "+" : ""}{formatM(diff!)}
                      </span>
                    </>
                  ) : "—"}
                </span>
                <button
                  onClick={() => handleDelete(r.id)}
                  title="Remover"
                  style={{ background: "none", border: "none", color: "#D1D5DB", cursor: "pointer", padding: 4, borderRadius: 4, fontSize: 14 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#D1D5DB")}
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
