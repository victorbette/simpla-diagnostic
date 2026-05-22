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
import { calcularBeneficioPGBL, getAliquotaRegressiva } from "@/lib/taxCalc";
import type { PlanejamentoFiscal } from "@/types/financialPlanning";

interface Props {
  clientId: string;
  fiscal: PlanejamentoFiscal;
  onSave: (result: ReturnType<typeof calcularBeneficioPGBL>) => void;
}

interface PGBLState {
  rendaMensalBruta: number;
  aportePGBLMensal: number;
  numeroDependentes: number;
  tipoDeclaracao: "completa" | "simplificada";
}

export function FerramentaPGBL({ clientId, fiscal, onSave }: Props) {
  const [state, setState] = useState<PGBLState>({
    rendaMensalBruta: fiscal.rendaBrutaAnual / 12,
    aportePGBLMensal: fiscal.temPGBL ? fiscal.valorPGBLAnual / 12 : 0,
    numeroDependentes: 0,
    tipoDeclaracao: fiscal.tipoDeclaracao === "nao_sei" ? "completa" : fiscal.tipoDeclaracao,
  });
  const [aporteSimulado, setAporteSimulado] = useState(state.aportePGBLMensal);

  const CHAVE = `ferramenta_pgbl_${clientId}`;
  const temDadosSalvos = localStorage.getItem(CHAVE) !== null;

  const initialState: PGBLState = {
    rendaMensalBruta: fiscal.rendaBrutaAnual / 12,
    aportePGBLMensal: fiscal.temPGBL ? fiscal.valorPGBLAnual / 12 : 0,
    numeroDependentes: 0,
    tipoDeclaracao: fiscal.tipoDeclaracao === "nao_sei" ? "completa" : fiscal.tipoDeclaracao,
  };

  const estadoCompleto = { ...state, aporteSimulado };

  const { limpar } = useFerramentaStorage(
    CHAVE,
    estadoCompleto,
    (v) => {
      setState(s => ({
        ...s,
        rendaMensalBruta: v.rendaMensalBruta ?? s.rendaMensalBruta,
        aportePGBLMensal: v.aportePGBLMensal ?? s.aportePGBLMensal,
        numeroDependentes: v.numeroDependentes ?? s.numeroDependentes,
        tipoDeclaracao: (v.tipoDeclaracao as PGBLState["tipoDeclaracao"]) ?? s.tipoDeclaracao,
      }));
      if (v.aporteSimulado !== undefined) setAporteSimulado(v.aporteSimulado);
    },
    { ...initialState, aporteSimulado: initialState.aportePGBLMensal },
  );

  const set = (patch: Partial<PGBLState>) => setState(s => ({ ...s, ...patch }));

  const result = useMemo(() => calcularBeneficioPGBL(state), [state]);
  const resultSimulado = useMemo(
    () => calcularBeneficioPGBL({ ...state, aportePGBLMensal: aporteSimulado }),
    [state, aporteSimulado]
  );

  const pgblPct = result.tetoPGBLAnual > 0
    ? Math.min(100, (result.aporteAnual / result.tetoPGBLAnual) * 100)
    : 0;
  const teto = result.tetoPGBLAnual / 12;

  // Tabela regressiva PGBL
  const tabelaRegressiva = [0, 2, 4, 6, 8, 10].map(anos => ({
    anos,
    aliquota: getAliquotaRegressiva(anos),
  }));

  return (
    <div className="space-y-6">
      {/* Persistence bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "#F0F7FF", borderRadius: 8, border: "1px solid #BFDBFE", marginBottom: 8 }}>
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
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Renda mensal bruta</Label>
              <CurrencyInput value={state.rendaMensalBruta}
                onChange={v => { set({ rendaMensalBruta: v }); setAporteSimulado(s => Math.min(s, v * 0.12)); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Aporte PGBL mensal atual</Label>
              <CurrencyInput value={state.aportePGBLMensal}
                onChange={v => { set({ aportePGBLMensal: v }); setAporteSimulado(v); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dep">Dependentes</Label>
              <Input id="dep" type="number" min={0} max={10} value={state.numeroDependentes}
                onChange={e => set({ numeroDependentes: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de declaração</Label>
              <Select value={state.tipoDeclaracao} onValueChange={v => set({ tipoDeclaracao: v as "completa" | "simplificada" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="simplificada">Simplificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado em grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Renda anual bruta", value: result.rendaAnual, isEspaco: false },
          { label: "Teto PGBL (12% da renda)", value: result.tetoPGBLAnual, isEspaco: false },
          { label: "Aporte atual no PGBL", value: result.aporteAnual, isEspaco: false },
          { label: "Espaço disponível", value: Math.max(0, result.tetoPGBLAnual - result.aporteAnual), isEspaco: true },
        ].map(({ label, value, isEspaco }) => (
          <Card key={label} style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <CardContent className="pt-4 pb-4">
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>{label}</p>
              <p
                className="tabular-nums"
                style={isEspaco
                  ? { color: "#2563EB", fontSize: 16, fontWeight: 700 }
                  : { fontSize: 16, fontWeight: 700 }}
              >
                {formatCurrency(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>IR sem PGBL</p>
            <p className="tabular-nums" style={{ color: "#B91C1C", fontSize: 16, fontWeight: 700 }}>{formatCurrency(result.irSemPGBL)}/ano</p>
          </CardContent>
        </Card>
        <Card style={{ borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>IR com PGBL</p>
            <p className="tabular-nums" style={{ color: "#15803D", fontSize: 16, fontWeight: 700 }}>{formatCurrency(result.irComPGBL)}/ano</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2" style={{ borderTop: "3px solid #15803D", borderRadius: 10, backgroundColor: "#DCFCE7" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Economia tributária</p>
            <div className="flex items-baseline gap-2">
              <p className="tabular-nums" style={{ color: "#15803D", fontSize: 24, fontWeight: 700 }}>{formatCurrency(result.economiaAnual)}/ano</p>
              <p className="text-sm" style={{ color: "#15803D" }}>{formatCurrency(result.economiaMensal)}/mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra PGBL */}
      <Card style={{ borderTop: "3px solid #2563EB" }}>
        <CardContent className="pt-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">PGBL utilizado vs. teto</span>
            <div className="flex gap-2 items-center">
              <span className="tabular-nums">{formatNumber(pgblPct, 0)}%</span>
              {result.aproveitandoTeto ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Teto atingido</Badge>
              ) : (
                <Badge variant="secondary">
                  Espaço: {formatCurrency(result.espacoDisponivelMensal)}/mês
                </Badge>
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
              max={Math.max(teto, 1)}
              step={100}
              value={aporteSimulado}
              onChange={e => setAporteSimulado(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#2563EB" }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>R$ 0</span>
              <span>{formatCurrency(teto)}/mês (teto)</span>
            </div>
          </div>
          <div style={{ border: "1px solid #60A5FA", backgroundColor: "#EFF6FF", color: "#92400E", borderRadius: 8, padding: 12, fontSize: 14 }}>
            Aportando <strong>{formatCurrency(aporteSimulado)}/mês</strong>, você economiza{" "}
            <strong>{formatCurrency(resultSimulado.economiaAnual)}/ano</strong> no IR
            ({formatCurrency(resultSimulado.economiaMensal)}/mês)
          </div>
        </CardContent>
      </Card>

      {/* Tabela regressiva */}
      {state.tipoDeclaracao === "completa" && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-semibold">Tabela regressiva do PGBL no resgate</p>
            <p className="text-xs text-muted-foreground">
              Quanto mais tempo o dinheiro fica investido, menor a alíquota no resgate. Para declaração completa, o PGBL é tributado na saída sobre o valor total (principal + rendimento).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#1E3A8A" }}>
                    <th style={{ color: "white", padding: "10px 16px", textAlign: "left" }}>Tempo de acumulação</th>
                    <th style={{ color: "white", padding: "10px 16px", textAlign: "right" }}>Alíquota no resgate</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaRegressiva.map(({ anos, aliquota }, idx) => (
                    <tr key={anos} style={{ backgroundColor: idx % 2 === 0 ? "#F9FAFB" : undefined }}>
                      <td className="py-2" style={{ padding: "8px 16px" }}>{anos === 0 ? "Até 2 anos" : anos < 10 ? `${anos}–${anos + 2} anos` : "Acima de 10 anos"}</td>
                      <td className="py-2 text-right font-semibold tabular-nums" style={{ padding: "8px 16px" }}>{aliquota}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Diferença da progressiva: a tabela progressiva tributa só os rendimentos, enquanto a regressiva tributa o montante total mas com alíquotas decrescentes com o tempo.
            </p>
          </CardContent>
        </Card>
      )}

      <button onClick={() => onSave(result)} style={{ width: "100%", backgroundColor: "#2563EB", color: "white", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Salvar análise PGBL
      </button>
    </div>
  );
}
