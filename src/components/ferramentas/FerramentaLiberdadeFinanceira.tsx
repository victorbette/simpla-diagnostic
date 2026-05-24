import { useState, useMemo } from "react";
import { useFerramentaStorage } from "@/hooks/useFerramentaStorage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  simularLiberdadeFinanceira,
  type SimulationParams,
  type SimulationResult,
  type LifeGoal,
} from "@/lib/financialFreedomCalc";
import type { PlanejamentoIF } from "@/types/financialPlanning";
import type { ObjetivoVida } from "@/types/objetivos";
import { OBJETIVO_META } from "@/types/objetivos";
import { GraficoIF } from "@/components/shared/GraficoIF";
import { ListaObjetivos } from "@/components/shared/ListaObjetivos";

interface Props {
  clientId: string;
  planejamentoIF: PlanejamentoIF;
  onSave: (params: SimulationParams, objetivos: ObjetivoVida[], result: SimulationResult) => void;
}

const cardGreenTop: React.CSSProperties = {
  borderTop: "3px solid #15803D",
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

const VALID_TIPOS = new Set(Object.keys(OBJETIVO_META));

export function FerramentaLiberdadeFinanceira({ clientId, planejamentoIF, onSave }: Props) {
  const initialParams: SimulationParams = {
    idadeAtual: planejamentoIF.idadeAtual,
    idadeAposentadoria: planejamentoIF.idadeMeta,
    expectativaVida: 90,
    patrimonioInicial: planejamentoIF.patrimonioAtual,
    aporteMensal: planejamentoIF.aporteMensal,
    rendaDesejada: planejamentoIF.rendaMensalDesejada,
    rentabilidadeAnual: planejamentoIF.taxaRetornoAnual / 100,
    inflacaoAnual: planejamentoIF.inflacaoAnual / 100,
  };

  const [params, setParams] = useState<SimulationParams>(initialParams);
  const [objetivos, setObjetivos] = useState<ObjetivoVida[]>([]);

  const CHAVE = `ferramenta_if_${clientId}`;
  const temDadosSalvos = localStorage.getItem(CHAVE) !== null;

  const { limpar } = useFerramentaStorage(
    CHAVE,
    { params, objetivos },
    (v) => {
      if (v.params) setParams({ ...initialParams, ...v.params });
      if (v.objetivos) {
        setObjetivos((v.objetivos as ObjetivoVida[]).filter((o) => VALID_TIPOS.has(o.tipo)));
      }
    },
    { params: initialParams, objetivos: [] },
  );

  const setP = (patch: Partial<SimulationParams>) => setParams((p) => ({ ...p, ...patch }));

  const result = useMemo(() => {
    const lifeGoals: LifeGoal[] = objetivos.map((o) => ({
      id: o.id,
      nome: o.nome,
      valor: o.valor,
      idadeRealizacao: o.idadeRealizacao,
      tipo: OBJETIVO_META[o.tipo].tipo,
    }));
    return simularLiberdadeFinanceira({ ...params, objetivos: lifeGoals });
  }, [params, objetivos]);

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

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-idade-atual" style={{ color: "#6B7280" }}>Idade atual</Label>
                  <Input id="lf-idade-atual" type="number" min={18} max={80}
                    value={params.idadeAtual} onChange={(e) => setP({ idadeAtual: Number(e.target.value) })}
                    style={{ borderColor: "#BFDBFE", color: "#000000" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-apos" style={{ color: "#6B7280" }}>Idade IF</Label>
                  <Input id="lf-apos" type="number" min={params.idadeAtual + 1} max={90}
                    value={params.idadeAposentadoria} onChange={(e) => setP({ idadeAposentadoria: Number(e.target.value) })}
                    style={{ borderColor: "#BFDBFE", color: "#000000" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lf-vida" style={{ color: "#6B7280" }}>Expectativa</Label>
                  <Input id="lf-vida" type="number" min={params.idadeAposentadoria + 1} max={110}
                    value={params.expectativaVida} onChange={(e) => setP({ expectativaVida: Number(e.target.value) })}
                    style={{ borderColor: "#BFDBFE", color: "#000000" }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label style={{ color: "#6B7280" }}>Patrimônio atual</Label>
                <CurrencyInput value={params.patrimonioInicial} onChange={(v) => setP({ patrimonioInicial: v })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label style={{ color: "#6B7280" }}>Aporte mensal</Label>
                <CurrencyInput value={params.aporteMensal} onChange={(v) => setP({ aporteMensal: v })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label style={{ color: "#6B7280" }}>Renda mensal desejada na IF</Label>
                <CurrencyInput value={params.rendaDesejada} onChange={(v) => setP({ rendaDesejada: v })} />
              </div>

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

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label style={{ color: "#6B7280" }}>Inflação anual</Label>
                  <span style={badgePctStyle}>{formatNumber(params.inflacaoAnual * 100, 1)}%</span>
                </div>
                <input
                  type="range" min={2} max={10} step={0.5}
                  value={params.inflacaoAnual * 100}
                  onChange={(e) => setP({ inflacaoAnual: Number(e.target.value) / 100 })}
                  className="w-full"
                  style={{ accentColor: "#000000" }}
                />
                <div className="flex justify-between" style={{ fontSize: 11, color: "#9CA3AF" }}>
                  <span>2%</span><span>10%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={cardGreenTop}>
            <CardContent className="pt-5">
              <ListaObjetivos
                objetivos={objetivos}
                onObjetivos={setObjetivos}
                idadeAtual={params.idadeAtual}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Patrimônio na IF
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#000000" }} className="tabular-nums">
                  {formatCurrency(result.patrimonioAposentadoria)}
                </p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Renda sustentável
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#000000" }} className="tabular-nums">
                  {formatCurrency(result.rendaSustentavel)}
                </p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4">
                <p style={{ fontSize: 10, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: "0.06em", marginBottom: 4 }}>
                  {result.gapRenda >= 0 ? "Superávit de renda" : "Gap de renda"}
                </p>
                <p
                  style={{ fontSize: 20, fontWeight: 700, color: result.gapRenda >= 0 ? "#15803D" : "#B91C1C" }}
                  className="tabular-nums"
                >
                  {formatCurrency(Math.abs(result.gapRenda))}
                </p>
              </CardContent>
            </Card>

            <Card style={cardGreenTop}>
              <CardContent className="pt-4 pb-4 flex items-center justify-center">
                {result.liberdadeAlcancada ? (
                  <span style={{
                    backgroundColor: "#DCFCE7", color: "#15803D",
                    border: "1px solid #A8C8AB", borderRadius: 8,
                    padding: "6px 14px", fontSize: 13, fontWeight: 600,
                  }}>
                    Liberdade alcançada ✓
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: "#FEE2E2", color: "#B91C1C",
                    border: "1px solid #C8A8A8", borderRadius: 8,
                    padding: "6px 14px", fontSize: 13, fontWeight: 600,
                  }}>
                    Gap: {formatCurrency(Math.abs(result.gapRenda))}
                  </span>
                )}
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
                      <span style={{ color: "#6B7280" }}>{o.nome} (idade {o.idadeRealizacao})</span>
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: OBJETIVO_META[o.tipo].tipo === "despesa" ? "#B91C1C" : "#15803D" }}
                      >
                        {OBJETIVO_META[o.tipo].tipo === "despesa" ? "−" : "+"}{formatCurrency(o.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <button
            onClick={() => onSave(params, objetivos, result)}
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
            objetivos={objetivos}
            height={300}
            idadeMeta={params.idadeAposentadoria}
          />
        </CardContent>
      </Card>
    </div>
  );
}
