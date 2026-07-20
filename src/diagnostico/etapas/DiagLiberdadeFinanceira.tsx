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
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { ListaObjetivos } from "@/components/shared/ListaObjetivos";
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

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
}

const cardStyle: React.CSSProperties = {
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
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, objetivos]);

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
    objetivos: objetivosAtivos,
  }), [params, objetivosAtivos, anoNascimento, mesNascimento]);

  const result = useMemo(() => {
    try {
      return calcularProjecaoIF(projecaoParams);
    } catch {
      return null;
    }
  }, [projecaoParams]);

  const rendaSustentavel = useMemo(() => {
    if (!result || result.patrimonioNaIF <= 0) return 0;
    return (result.patrimonioNaIF * 0.04) / 12;
  }, [result]);

  const anoAtualCliente = anoNascimento + params.idadeAtual;
  const anoMetaCliente = anoNascimento + params.idadeAposentadoria;

  const dadosGrafico = useMemo(() => {
    const dados: {
      ano: number;
      idade: number;
      patrimonioProjeto: number;
      patrimonioComObjetivos: number;
      temObjetivo: boolean;
    }[] = [];
    const anoAtual = new Date().getFullYear();
    const nAnos = Math.max(0, params.idadeAposentadoria - params.idadeAtual);

    let patrimonioSemObjetivos = params.patrimonioInicial;
    let patrimonioComObj = params.patrimonioInicial;
    const fatorAnual = Math.pow(1 + TAXA_MENSAL_DIAG, 12);
    const aporteAnual = params.aporteMensal * 12;

    for (let ano = 0; ano <= nAnos; ano++) {
      const idadeAno = params.idadeAtual + ano;
      const anoCalendario = anoAtual + ano;

      const objetivosAno = objetivos.filter(o =>
        o.ativo !== false &&
        Number(o.ano) === anoCalendario
      );

      if (ano > 0) {
        patrimonioSemObjetivos = patrimonioSemObjetivos * fatorAnual + aporteAnual;
        patrimonioComObj = patrimonioComObj * fatorAnual + aporteAnual;
        objetivosAno.forEach(o => {
          patrimonioComObj = Math.max(0, patrimonioComObj - (Number(o.valorBRL) || 0));
        });
      }

      dados.push({
        ano: anoCalendario,
        idade: idadeAno,
        patrimonioProjeto: Math.round(patrimonioSemObjetivos),
        patrimonioComObjetivos: Math.round(patrimonioComObj),
        temObjetivo: objetivosAno.length > 0,
      });
    }
    return dados;
  }, [params.patrimonioInicial, params.aporteMensal, params.idadeAtual, params.idadeAposentadoria, objetivos]);

  if (!result) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
        Preencha os parâmetros para ver a simulação.
      </div>
    );
  }

  const temObjetivosAtivos = objetivosAtivos.length > 0;

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

      {/* ── Cards de resultado ── */}
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

      {/* ── Gráfico ── */}
      <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>
          Projeção Patrimonial
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={dadosGrafico}
            margin={{ top: 10, right: 20, bottom: 0, left: 20 }}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F3F4F6"
              vertical={false}
            />

            <XAxis
              dataKey="idade"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickFormatter={(v) => `${v}a`}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickFormatter={(v: number) => {
                if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
                return `R$${v}`;
              }}
              axisLine={false}
              tickLine={false}
              width={70}
            />

            <Tooltip
              formatter={(value, name) => [
                (value as number).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                }),
                name === "patrimonioProjeto"
                  ? "Patrimônio Projetado"
                  : "Com Objetivos de Vida",
              ]}
              labelFormatter={(v) => `Idade: ${v} anos`}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "0.5px solid #E5E7EB",
              }}
            />

            <Legend
              formatter={(value) =>
                value === "patrimonioProjeto"
                  ? "Patrimônio Projetado"
                  : "Com Objetivos de Vida"
              }
              wrapperStyle={{ fontSize: 12 }}
            />

            <ReferenceLine
              y={patrimonioPerpetuidade}
              stroke="#15803D"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{
                value: "Meta",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#15803D",
              }}
            />

            <Bar
              dataKey="patrimonioProjeto"
              fill="#BFDBFE"
              stroke="#93C5FD"
              strokeWidth={0.5}
              radius={[3, 3, 0, 0]}
              name="patrimonioProjeto"
            />

            {temObjetivosAtivos && (
              <Line
                type="monotone"
                dataKey="patrimonioComObjetivos"
                stroke="#15803D"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#15803D",
                  stroke: "white",
                  strokeWidth: 2,
                }}
                name="patrimonioComObjetivos"
              />
            )}

          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
