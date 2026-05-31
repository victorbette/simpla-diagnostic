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
import { formatCurrency, formatNumber, calcularIdade } from "@/lib/format";
import {
  calcularPGBL,
  calcularINSSMensalCLT,
  type ResultadoPGBL,
} from "@/lib/calculoIRPF";
import type { PlanejamentoFiscal, DadosCliente } from "@/types/financialPlanning";

interface Props {
  clientId: string;
  fiscal: PlanejamentoFiscal;
  dadosCliente: DadosCliente;
  idadeMeta: number;
  onSave: (result: ResultadoPGBL) => void;
}

interface PGBLState {
  rendaMensalBruta: number;
  tipoDeclaracao: "completa" | "simplificada";
  numeroDependentes: number;
  contribuicaoINSSMensal: number;
  despesasInstrucaoAnual: number;
  aporteAnualPGBL: number;
  rentabilidadeAnual: number;
  nAnos: number;
}

export function FerramentaPGBL({
  clientId,
  fiscal,
  dadosCliente,
  idadeMeta,
  onSave,
}: Props) {
  const rendaMensalColeta =
    (dadosCliente?.rendaMensal ?? 0) + (dadosCliente?.rendaImovelMensal ?? 0);
  const isCLT = dadosCliente?.tipoTrabalho === "clt";
  const inssColeta = isCLT
    ? calcularINSSMensalCLT(rendaMensalColeta)
    : (dadosCliente?.valorINSS ?? 0);
  const tipoDeclaracaoColeta: "completa" | "simplificada" =
    fiscal.tipoDeclaracao === "nao_sei"
      ? "completa"
      : (fiscal.tipoDeclaracao as "completa" | "simplificada");
  const dependentesColeta = dadosCliente?.filhos?.length ?? 0;
  const nAnosColeta = dadosCliente?.dataNascimento
    ? Math.max(1, idadeMeta - calcularIdade(dadosCliente.dataNascimento))
    : 20;

  const CHAVE = `ferramenta_pgbl_${clientId}`;
  const temDadosSalvos = localStorage.getItem(CHAVE) !== null;

  const initialState: PGBLState = {
    rendaMensalBruta: rendaMensalColeta,
    tipoDeclaracao: tipoDeclaracaoColeta,
    numeroDependentes: dependentesColeta,
    contribuicaoINSSMensal: inssColeta,
    despesasInstrucaoAnual: 0,
    aporteAnualPGBL: fiscal.temPGBL ? fiscal.valorPGBLAnual : 0,
    rentabilidadeAnual: 8,
    nAnos: nAnosColeta,
  };

  const [state, setState] = useState<PGBLState>(initialState);

  const { limpar } = useFerramentaStorage<PGBLState>(
    CHAVE,
    state,
    setState,
    initialState,
  );

  const set = (patch: Partial<PGBLState>) => setState((s) => ({ ...s, ...patch }));

  const resultado = useMemo((): ResultadoPGBL | null => {
    if (!state.rendaMensalBruta) return null;
    return calcularPGBL({
      rendaMensalBruta: state.rendaMensalBruta,
      tipoDeclaracao: state.tipoDeclaracao,
      numeroDependentes: state.numeroDependentes,
      despesasInstrucao: state.despesasInstrucaoAnual,
      contribuicaoINSS: state.contribuicaoINSSMensal * 12,
      aporteAnualPGBL: state.aporteAnualPGBL,
      rentabilidadeAnual: state.rentabilidadeAnual / 100,
      nAnos: state.nAnos,
    });
  }, [state]);

  const tetoPGBL = state.rendaMensalBruta * 12 * 0.12;
  const pgblPct =
    tetoPGBL > 0 ? Math.min(100, (state.aporteAnualPGBL / tetoPGBL) * 100) : 0;
  const espacoMensal = Math.max(0, tetoPGBL - state.aporteAnualPGBL) / 12;

  return (
    <div className="space-y-6">
      {/* Persistence bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "#FFFBEB",
          borderRadius: 8,
          border: "1px solid #FCD34D",
        }}
      >
        <span style={{ fontSize: 11, color: "#92400E" }}>
          {temDadosSalvos ? "● Dados salvos automaticamente" : "○ Preencha os dados abaixo"}
        </span>
        {temDadosSalvos && (
          <button
            onClick={() => {
              if (window.confirm("Limpar todos os dados desta análise?")) limpar();
            }}
            style={{
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.15)",
              color: "#6B7280",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Limpar dados
          </button>
        )}
      </div>

      {/* Card 1 — Dados do Contribuinte */}
      <Card
        style={{
          borderLeft: "4px solid #F59E0B",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <CardContent className="pt-5 space-y-4">
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#92400E",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            Dados do Contribuinte
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Renda Mensal Bruta (R$)</Label>
              <CurrencyInput
                value={state.rendaMensalBruta}
                onChange={(v) => set({ rendaMensalBruta: v })}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                Salário + pró-labore + aluguéis
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tipo de Declaração</Label>
              <Select
                value={state.tipoDeclaracao}
                onValueChange={(v) =>
                  set({ tipoDeclaracao: v as "completa" | "simplificada" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completa">Completa</SelectItem>
                  <SelectItem value="simplificada">Simplificada</SelectItem>
                </SelectContent>
              </Select>
              {state.tipoDeclaracao === "simplificada" && (
                <p style={{ fontSize: 11, color: "#B45309", margin: 0 }}>
                  PGBL não gera benefício fiscal na declaração simplificada
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dep">Nº de Dependentes</Label>
              <Input
                id="dep"
                type="number"
                min={0}
                max={10}
                value={state.numeroDependentes}
                onChange={(e) => set({ numeroDependentes: Number(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label>INSS Mensal (R$)</Label>
                {isCLT && (
                  <Badge
                    variant="outline"
                    style={{ fontSize: 10, color: "#15803D", borderColor: "#86EFAC" }}
                  >
                    Calculado (CLT)
                  </Badge>
                )}
              </div>
              <CurrencyInput
                value={state.contribuicaoINSSMensal}
                onChange={(v) => set({ contribuicaoINSSMensal: v })}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                Teto 2025: {formatCurrency(908.86)}/mês
              </p>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Despesas de Instrução / Ano (R$)</Label>
              <CurrencyInput
                value={state.despesasInstrucaoAnual}
                onChange={(v) => set({ despesasInstrucaoAnual: v })}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                Educação própria + dependentes — limite {formatCurrency(3561.5)} por pessoa/ano
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Contribuição PGBL */}
      <Card
        style={{
          borderLeft: "4px solid #2563EB",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <CardContent className="pt-5 space-y-4">
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1E40AF",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            Contribuição PGBL
          </p>

          <div
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <span style={{ color: "#3B82F6" }}>Teto PGBL (12% da renda bruta anual)</span>
            <span style={{ fontWeight: 700, color: "#1D4ED8" }}>
              {formatCurrency(tetoPGBL)}/ano
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Aporte Anual PGBL (R$)</Label>
              <CurrencyInput
                value={state.aporteAnualPGBL}
                onChange={(v) => set({ aporteAnualPGBL: Math.min(v, tetoPGBL) })}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                ≈ {formatCurrency(state.aporteAnualPGBL / 12)}/mês
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rent">Rentabilidade Anual (%)</Label>
              <Input
                id="rent"
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={state.rentabilidadeAnual}
                onChange={(e) => set({ rentabilidadeAnual: Number(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="anos">Prazo (anos)</Label>
              <Input
                id="anos"
                type="number"
                min={1}
                max={50}
                value={state.nAnos}
                onChange={(e) => set({ nAnos: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PGBL utilizado vs. teto</span>
              <div className="flex gap-2 items-center">
                <span className="tabular-nums">{formatNumber(pgblPct, 0)}%</span>
                {pgblPct >= 100 ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                    Teto atingido
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Espaço: {formatCurrency(espacoMensal)}/mês
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={pgblPct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {formatCurrency(state.aporteAnualPGBL)} / {formatCurrency(tetoPGBL)} anuais
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Resultado */}
      {resultado && (
        <Card
          style={{
            borderLeft: "4px solid #15803D",
            borderRadius: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <CardContent className="pt-5 space-y-4">
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#14532D",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              Resultado — IRPF 2025
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                style={{ border: "1px solid #FECACA", borderRadius: 10, padding: "14px 16px" }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#B91C1C",
                    textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}
                >
                  Sem PGBL
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base de cálculo</span>
                    <span className="tabular-nums font-medium">
                      {formatCurrency(resultado.baseCalculo_sem)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IR devido</span>
                    <span
                      className="tabular-nums font-bold"
                      style={{ color: "#B91C1C" }}
                    >
                      {formatCurrency(resultado.IR_sem)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alíq. efetiva</span>
                    <span className="tabular-nums">
                      {formatNumber(resultado.aliquotaEfetiva_sem, 1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{ border: "1px solid #BBF7D0", borderRadius: 10, padding: "14px 16px" }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#15803D",
                    textTransform: "uppercase",
                    margin: "0 0 10px",
                  }}
                >
                  Com PGBL
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base de cálculo</span>
                    <span className="tabular-nums font-medium">
                      {formatCurrency(resultado.baseCalculo_com)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IR devido</span>
                    <span
                      className="tabular-nums font-bold"
                      style={{ color: "#15803D" }}
                    >
                      {formatCurrency(resultado.IR_com)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alíq. efetiva</span>
                    <span className="tabular-nums">
                      {formatNumber(resultado.aliquotaEfetiva_com, 1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#DCFCE7",
                border: "1px solid #86EFAC",
                borderRadius: 10,
                padding: "16px 20px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "#166534",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 4px",
                }}
              >
                Economia Fiscal Anual
              </p>
              <p
                style={{ fontSize: 28, fontWeight: 800, color: "#15803D", margin: 0 }}
              >
                {formatCurrency(resultado.economiaAnual)}/ano
              </p>
              <p style={{ fontSize: 13, color: "#16A34A", margin: "4px 0 0" }}>
                {formatCurrency(resultado.economiaMensal)}/mês
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 4 — Projeção Acumulada */}
      {resultado && state.nAnos > 0 && (
        <Card
          style={{
            borderLeft: "4px solid #7C3AED",
            borderRadius: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <CardContent className="pt-5 space-y-4">
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#5B21B6",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              Projeção em {state.nAnos} anos ({formatNumber(state.rentabilidadeAnual, 1)}% a.a.)
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    label: "Saldo PGBL bruto",
                    value: resultado.saldoPGBL_bruto,
                    color: "#7C3AED",
                  },
                  {
                    label: "IR no resgate (15%)",
                    value: resultado.IR_resgate,
                    color: "#B91C1C",
                  },
                  {
                    label: "Saldo líquido",
                    value: resultado.saldoPGBL_liquido,
                    color: "#15803D",
                  },
                ] as const
              ).map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: "#F5F3FF",
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      margin: "0 0 4px",
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color, margin: 0 }}>
                    {formatCurrency(value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                style={{
                  border: "1px solid #DDD6FE",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    margin: "0 0 4px",
                  }}
                >
                  Economia IR acumulada
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#15803D", margin: 0 }}>
                  {formatCurrency(resultado.economiaAcumulada)}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid #DDD6FE",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    margin: "0 0 4px",
                  }}
                >
                  Ganho fiscal total
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#7C3AED", margin: 0 }}>
                  {formatCurrency(resultado.ganhoFiscalTotal)}
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
                  vs. não ter PGBL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <button
        onClick={() => resultado && onSave(resultado)}
        disabled={!resultado}
        style={{
          width: "100%",
          backgroundColor: resultado ? "#2563EB" : "#D1D5DB",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "12px 0",
          fontSize: 14,
          fontWeight: 600,
          cursor: resultado ? "pointer" : "not-allowed",
        }}
      >
        Salvar análise
      </button>
    </div>
  );
}
