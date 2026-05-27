import { useState, useMemo } from "react";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularBeneficioPGBL } from "@/lib/taxCalc";
import type { PlanejamentoFiscal } from "@/types/financialPlanning";

interface Props {
  clientId: string;
  fiscal: PlanejamentoFiscal;
  onSave: (result: ReturnType<typeof calcularBeneficioPGBL>) => void;
}

interface PGBLState {
  rendaBrutaAnual: number;
  aportePGBLMensal: number;
  numeroDependentes: number;
  irrf: number;
  despesas: number;
  inss: number;
  aliquotaMarginal: number;
}

export function FerramentaPGBL({ clientId, fiscal, onSave }: Props) {
  const [state, setState] = useState<PGBLState>({
    rendaBrutaAnual: fiscal.rendaBrutaAnual,
    aportePGBLMensal: fiscal.temPGBL ? fiscal.valorPGBLAnual / 12 : 0,
    numeroDependentes: 0,
    irrf: 0,
    despesas: 0,
    inss: 0,
    aliquotaMarginal: 0.275,
  });
  const [aporteSimulado, setAporteSimulado] = useState(state.aportePGBLMensal);

  const CHAVE = `ferramenta_pgbl_${clientId}`;
  const temDadosSalvos = localStorage.getItem(CHAVE) !== null;

  const initialState: PGBLState = {
    rendaBrutaAnual: fiscal.rendaBrutaAnual,
    aportePGBLMensal: fiscal.temPGBL ? fiscal.valorPGBLAnual / 12 : 0,
    numeroDependentes: 0,
    irrf: 0,
    despesas: 0,
    inss: 0,
    aliquotaMarginal: 0.275,
  };

  const { limpar } = useFerramentaStorage(
    CHAVE,
    { ...state, aporteSimulado },
    (v) => {
      setState(s => ({
        ...s,
        // backward-compat: old saves used rendaMensalBruta
        rendaBrutaAnual: v.rendaBrutaAnual ?? ((v as any).rendaMensalBruta ? (v as any).rendaMensalBruta * 12 : s.rendaBrutaAnual),
        aportePGBLMensal: v.aportePGBLMensal ?? s.aportePGBLMensal,
        numeroDependentes: v.numeroDependentes ?? s.numeroDependentes,
        irrf: v.irrf ?? 0,
        despesas: v.despesas ?? 0,
        inss: v.inss ?? 0,
        aliquotaMarginal: v.aliquotaMarginal ?? s.aliquotaMarginal,
      }));
      if (v.aporteSimulado !== undefined) setAporteSimulado(v.aporteSimulado);
    },
    { ...initialState, aporteSimulado: initialState.aportePGBLMensal },
  );

  const set = (patch: Partial<PGBLState>) => setState(s => ({ ...s, ...patch }));

  const result = useMemo(() => calcularBeneficioPGBL(state), [state]);
  const resultSimulado = useMemo(
    () => calcularBeneficioPGBL({ ...state, aportePGBLMensal: aporteSimulado }),
    [state, aporteSimulado],
  );

  const pgblPct = result.tetoPGBLAnual > 0
    ? Math.min(100, (result.aporteAnual / result.tetoPGBLAnual) * 100)
    : 0;
  const tetoMensal = result.tetoPGBLAnual / 12;
  const beneficioMarginal = Math.max(0, result.aporteEfetivo * state.aliquotaMarginal);

  return (
    <div className="space-y-6">
      {/* Barra de persistência */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "#F0F7FF", borderRadius: 8, border: "1px solid #BFDBFE" }}>
        <span style={{ fontSize: 11, color: "#3B82F6", display: "flex", alignItems: "center", gap: 4 }}>
          {temDadosSalvos ? "● Dados salvos automaticamente" : "○ Preencha os dados abaixo"}
        </span>
        {temDadosSalvos && (
          <button
            onClick={() => { if (window.confirm("Limpar todos os dados desta análise?")) { limpar(); setAporteSimulado(initialState.aportePGBLMensal); } }}
            style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.15)", color: "#6B7280", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
          >
            Limpar dados
          </button>
        )}
      </div>

      {/* Inputs */}
      <Card style={{ borderTop: "3px solid #2563EB", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <CardContent className="pt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Renda Bruta */}
            <div className="flex flex-col gap-1.5">
              <Label>Renda Bruta Tributável Anual (R$)</Label>
              <CurrencyInput
                value={state.rendaBrutaAnual}
                onChange={v => { set({ rendaBrutaAnual: v }); setAporteSimulado(s => Math.min(s, v * 0.12 / 12)); }}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Soma de salários, pró-labore, aluguéis</p>
            </div>
            {/* IRRF */}
            <div className="flex flex-col gap-1.5">
              <Label>IRRF Retido na Fonte (R$)</Label>
              <CurrencyInput value={state.irrf} onChange={v => set({ irrf: v })} />
            </div>
            {/* INSS */}
            <div className="flex flex-col gap-1.5">
              <Label>INSS Pago no Ano (R$)</Label>
              <CurrencyInput value={state.inss} onChange={v => set({ inss: v })} />
            </div>
            {/* Despesas */}
            <div className="flex flex-col gap-1.5">
              <Label>Despesas Dedutíveis (R$)</Label>
              <CurrencyInput value={state.despesas} onChange={v => set({ despesas: v })} />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Educação, saúde, pensão alimentícia</p>
            </div>
            {/* Dependentes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dep">Nº de Dependentes</Label>
              <Input id="dep" type="number" min={0} max={10} value={state.numeroDependentes}
                onChange={e => set({ numeroDependentes: Number(e.target.value) })} />
            </div>
            {/* Alíquota Marginal */}
            <div className="flex flex-col gap-1.5">
              <Label>Alíquota Marginal de IR (%)</Label>
              <Select value={String(state.aliquotaMarginal)} onValueChange={v => set({ aliquotaMarginal: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.275">27,5%</SelectItem>
                  <SelectItem value="0.225">22,5%</SelectItem>
                  <SelectItem value="0.15">15%</SelectItem>
                  <SelectItem value="0.075">7,5%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Aporte */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Aporte PGBL mensal atual</Label>
              <CurrencyInput value={state.aportePGBLMensal}
                onChange={v => { set({ aportePGBLMensal: v }); setAporteSimulado(v); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas PGBL */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Renda anual bruta", value: result.rendaAnual, highlight: false },
          { label: "Teto PGBL (12%)", value: result.tetoPGBLAnual, highlight: false },
          { label: "Aporte PGBL anual", value: result.aporteAnual, highlight: false },
          { label: "Espaço disponível", value: Math.max(0, result.tetoPGBLAnual - result.aporteAnual), highlight: true },
        ].map(({ label, value, highlight }) => (
          <Card key={label} style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <CardContent className="pt-4 pb-4">
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>{label}</p>
              <p className="tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: highlight ? "#2563EB" : undefined }}>
                {formatCurrency(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Simulação IRPF — 2 colunas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card style={{ borderTop: "3px solid #B91C1C", borderRadius: 12 }}>
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-semibold" style={{ color: "#B91C1C" }}>Sem PGBL</p>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#6B7280" }}>Base de cálculo</span>
              <span className="tabular-nums font-semibold">{formatCurrency(result.baseSemPGBL)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#6B7280" }}>IR devido</span>
              <span className="tabular-nums font-semibold" style={{ color: "#B91C1C" }}>{formatCurrency(result.irSemPGBL)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span style={{ color: "#6B7280" }}>{result.resultadoSem >= 0 ? "IR a pagar" : "Restituição"}</span>
              <span className="tabular-nums font-semibold" style={{ color: result.resultadoSem >= 0 ? "#B91C1C" : "#15803D" }}>
                {formatCurrency(Math.abs(result.resultadoSem))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#6B7280" }}>Alíq. efetiva</span>
              <span className="tabular-nums font-semibold">{formatNumber(result.aliqEfetivaSem, 1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderTop: "3px solid #15803D", borderRadius: 12 }}>
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-semibold" style={{ color: "#15803D" }}>Com PGBL</p>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#6B7280" }}>Base de cálculo</span>
              <span className="tabular-nums font-semibold">{formatCurrency(result.baseComPGBL)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#6B7280" }}>IR devido</span>
              <span className="tabular-nums font-semibold" style={{ color: "#15803D" }}>{formatCurrency(result.irComPGBL)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span style={{ color: "#6B7280" }}>{result.resultadoCom >= 0 ? "IR a pagar" : "Restituição"}</span>
              <span className="tabular-nums font-semibold" style={{ color: result.resultadoCom >= 0 ? "#B91C1C" : "#15803D" }}>
                {formatCurrency(Math.abs(result.resultadoCom))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#6B7280" }}>Alíq. efetiva</span>
              <span className="tabular-nums font-semibold">{formatNumber(result.aliqEfetivaCom, 1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Economia */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card style={{ borderTop: "3px solid #15803D", borderRadius: 10, backgroundColor: "#DCFCE7" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Economia tributária (tabela progressiva)</p>
            <div className="flex items-baseline gap-2">
              <p className="tabular-nums" style={{ color: "#15803D", fontSize: 22, fontWeight: 700 }}>{formatCurrency(result.economiaAnual)}/ano</p>
              <p style={{ color: "#15803D", fontSize: 13 }}>{formatCurrency(result.economiaMensal)}/mês</p>
            </div>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 10 }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>
              Diferimento marginal ({formatNumber(state.aliquotaMarginal * 100, 1)}%)
            </p>
            <p className="tabular-nums" style={{ color: "#2563EB", fontSize: 18, fontWeight: 700 }}>{formatCurrency(beneficioMarginal)}/ano</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>aporte efetivo × alíquota marginal</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra PGBL utilizado */}
      <Card style={{ borderTop: "3px solid #2563EB" }}>
        <CardContent className="pt-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">PGBL utilizado vs. teto</span>
            <div className="flex gap-2 items-center">
              <span className="tabular-nums">{formatNumber(pgblPct, 0)}%</span>
              {result.aproveitandoTeto ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Teto atingido</Badge>
              ) : (
                <Badge variant="secondary">Espaço: {formatCurrency(result.espacoDisponivelMensal)}/mês</Badge>
              )}
            </div>
          </div>
          <Progress value={pgblPct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {formatCurrency(result.aporteAnual)} / {formatCurrency(result.tetoPGBLAnual)} anuais
          </p>
        </CardContent>
      </Card>

      {/* Simulador de otimização */}
      <Card style={{ borderTop: "3px solid #2563EB" }}>
        <CardContent className="pt-5 space-y-4">
          <p className="text-sm font-semibold">Simulador de otimização</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aporte mensal simulado</span>
              <span className="tabular-nums font-medium">{formatCurrency(aporteSimulado)}/mês</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(tetoMensal, 1)}
              step={100}
              value={aporteSimulado}
              onChange={e => setAporteSimulado(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#2563EB" }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>R$ 0</span>
              <span>{formatCurrency(tetoMensal)}/mês (teto)</span>
            </div>
          </div>
          <div style={{ border: "1px solid #60A5FA", backgroundColor: "#EFF6FF", borderRadius: 8, padding: 12, fontSize: 14, color: "#1E40AF" }}>
            Aportando <strong>{formatCurrency(aporteSimulado)}/mês</strong>, você economiza{" "}
            <strong>{formatCurrency(resultSimulado.economiaAnual)}/ano</strong> no IR
            ({formatCurrency(resultSimulado.economiaMensal)}/mês)
          </div>
        </CardContent>
      </Card>

      <button
        onClick={() => onSave(result)}
        style={{ width: "100%", backgroundColor: "#2563EB", color: "white", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
      >
        Salvar análise
      </button>
    </div>
  );
}
