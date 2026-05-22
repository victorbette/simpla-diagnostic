import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { FPSectionHeader } from "./layout/FPSectionHeader";
import { FPAutoField } from "./layout/FPAutoField";
import { formatCurrency, formatNumber } from "@/lib/format";
import { calcularIF } from "@/types/financialPlanning";
import type { PlanejamentoIF, DadosCliente } from "@/types/financialPlanning";

const GREEN = "#15803D";
const DARK = "#000000";

interface Props {
  value: PlanejamentoIF;
  onChange: (v: PlanejamentoIF) => void;
  dadosCliente?: DadosCliente;
}

export function PlanejamentoIFForm({ value, onChange, dadosCliente }: Props) {
  const [possuiPrevidencia, setPossuiPrevidencia] = useState(false);
  const [contribuiINSS, setContribuiINSS] = useState(false);
  const [temAluguel, setTemAluguel] = useState(false);

  const set = <K extends keyof PlanejamentoIF>(key: K, val: PlanejamentoIF[K]) =>
    onChange({ ...value, [key]: val });

  const resultado = calcularIF(value);
  const anosRestantes = Math.max(0, value.idadeMeta - value.idadeAtual);
  const patrimonioNec = resultado.patrimonioNecessario;
  const progressoPct =
    patrimonioNec > 0 ? Math.min(100, (value.patrimonioAtual / patrimonioNec) * 100) : 0;
  const gapPositivo = resultado.gap > 0;

  const aporteNecessario = (() => {
    if (!gapPositivo) return 0;
    const taxaMensal = value.taxaRetornoAnual / 100 / 12;
    const meses = anosRestantes * 12;
    if (meses === 0) return resultado.gap;
    if (taxaMensal === 0) return resultado.gap / meses;
    return (resultado.gap * taxaMensal) / (Math.pow(1 + taxaMensal, meses) - 1);
  })();

  const calculatedAge = dadosCliente?.dataNascimento
    ? new Date().getFullYear() - new Date(dadosCliente.dataNascimento).getFullYear()
    : null;

  const isAutoIdade = calculatedAge && value.idadeAtual === calculatedAge;
  const rendaMensalAtual = dadosCliente?.rendaMensal ?? 0;
  const isAutoPatrimonio = dadosCliente?.patrimonioFinanceiroEstimado && value.patrimonioAtual === dadosCliente.patrimonioFinanceiroEstimado;
  const isAutoAporte = dadosCliente?.aportesMensalMedio && value.aporteMensal === dadosCliente.aportesMensalMedio;
  const isRendaSugerida = rendaMensalAtual > 0 && value.rendaMensalDesejada === rendaMensalAtual;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ══ Dados da simulação ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FPSectionHeader
          title="Dados da Simulação"
          subtitle="Parâmetros para o cálculo de independência financeira"
          borderColor={GREEN}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {isAutoIdade ? (
            <FPAutoField
              label="Idade atual"
              value={`${value.idadeAtual} anos`}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Idade atual</Label>
              <Input
                type="number"
                min={18}
                max={100}
                value={value.idadeAtual}
                onChange={(e) => set("idadeAtual", Number(e.target.value))}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label className="text-[13px] font-medium text-[#111827]">Idade meta para IF</Label>
            <Input
              type="number"
              min={value.idadeAtual + 1}
              max={100}
              value={value.idadeMeta}
              onChange={(e) => set("idadeMeta", Number(e.target.value))}
            />
            <p className="text-[11px] text-[#9CA3AF] italic">{anosRestantes} anos restantes</p>
          </div>

          {rendaMensalAtual > 0 ? (
            <FPAutoField
              label="Renda mensal atual"
              value={formatCurrency(rendaMensalAtual)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Renda mensal atual</Label>
              <p className="text-[13px] text-[#9CA3AF] italic">Informe na Coleta de Dados</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Renda mensal desejada na IF</Label>
              {isRendaSugerida && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, backgroundColor: "#EAF0F5", color: "#1E40AF", border: "1px solid #A8C4D8" }}>
                  ✓ SUGERIDO
                </span>
              )}
            </div>
            <CurrencyInput
              value={value.rendaMensalDesejada}
              onChange={(v) => set("rendaMensalDesejada", v)}
            />
            <p className="text-[11px] text-[#9CA3AF] italic">Quanto o cliente quer receber por mês ao atingir a independência financeira</p>
          </div>

          {isAutoPatrimonio ? (
            <FPAutoField
              label="Patrimônio financeiro atual"
              value={formatCurrency(value.patrimonioAtual)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Patrimônio investido atual</Label>
              <CurrencyInput
                value={value.patrimonioAtual}
                onChange={(v) => set("patrimonioAtual", v)}
              />
            </div>
          )}

          {isAutoAporte ? (
            <FPAutoField
              label="Aporte mensal atual"
              value={formatCurrency(value.aporteMensal)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Aporte mensal atual</Label>
              <CurrencyInput
                value={value.aporteMensal}
                onChange={(v) => set("aporteMensal", v)}
              />
            </div>
          )}
        </div>

        {/* Taxa de retorno */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Label className="text-[13px] font-medium text-[#111827]">
              Taxa de retorno real estimada
            </Label>
            <Badge
              style={{ backgroundColor: "#DCFCE7", color: "#15803D", border: "1px solid #A8C8AB" }}
            >
              {value.taxaRetornoAnual}% a.a.
            </Badge>
          </div>
          <input
            type="range"
            min={3}
            max={12}
            step={0.5}
            value={value.taxaRetornoAnual}
            onChange={(e) => set("taxaRetornoAnual", Number(e.target.value))}
            className="w-full accent-[#15803D]"
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF" }}>
            <span>3% (conservador)</span>
            <span>12% (arrojado)</span>
          </div>
        </div>

        {/* Metodologia */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360 }}>
          <Label className="text-[13px] font-medium text-[#111827]">Metodologia de cálculo</Label>
          <Select
            value={value.metodologia}
            onValueChange={(v) => set("metodologia", v as PlanejamentoIF["metodologia"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regra4porcento">Regra dos 4% (retirada segura)</SelectItem>
              <SelectItem value="renda_perpetua">Renda perpétua</SelectItem>
              <SelectItem value="renda_temporaria">Renda temporária</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* ══ Resultado em tempo real ══ */}
      <div
        style={{
          backgroundColor: "#DCFCE7",
          border: "1px solid #A8C8AB",
          borderRadius: 10,
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, color: "#15803D", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
            Patrimônio necessário
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: DARK, margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(patrimonioNec)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#15803D", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
            Projeção com aportes
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#15803D", margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(resultado.patrimonioProjetado)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: gapPositivo ? "#B91C1C" : "#15803D", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
            {gapPositivo ? "Gap (falta)" : "Superávit"}
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: gapPositivo ? "#B91C1C" : "#15803D", margin: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(Math.abs(resultado.gap))}
          </p>
        </div>
        {gapPositivo && aporteNecessario > 0 && (
          <div>
            <p style={{ fontSize: 11, color: "#92400E", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
              Aporte necessário
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#2563EB", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(aporteNecessario)}/mês
            </p>
          </div>
        )}
      </div>

      {/* Progresso */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#6B7280" }}>Progresso atual ({formatNumber(progressoPct, 0)}%)</span>
          <span style={{ fontWeight: 600, color: DARK }}>{anosRestantes} anos restantes</span>
        </div>
        <div style={{ height: 8, backgroundColor: "#BFDBFE", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progressoPct}%`,
              backgroundColor: GREEN,
              borderRadius: 4,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* ══ Previdência e outros ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Previdência Privada e Outros Rendimentos"
          borderColor={GREEN}
        />
        <div
          style={{
            border: "1px solid #BFDBFE",
            borderRadius: 10,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch checked={possuiPrevidencia} onCheckedChange={setPossuiPrevidencia} />
              <Label className="text-[13px] cursor-pointer">Possui previdência privada (PGBL/VGBL)?</Label>
            </div>
            {possuiPrevidencia && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Valor acumulado</Label>
                <CurrencyInput
                  value={value.valorPrevidencia ?? 0}
                  onChange={(v) => set("valorPrevidencia", v)}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch checked={contribuiINSS} onCheckedChange={setContribuiINSS} />
            <Label className="text-[13px] cursor-pointer">Contribui para o INSS?</Label>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch checked={temAluguel} onCheckedChange={setTemAluguel} />
              <Label className="text-[13px] cursor-pointer">Possui imóveis que geram aluguel?</Label>
            </div>
            {temAluguel && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Renda de aluguel mensal</Label>
                <CurrencyInput
                  value={value.rendaAluguelMensal ?? 0}
                  onChange={(v) => set("rendaAluguelMensal", v)}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
