import { useMemo } from "react";
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
import { CurrencyInput } from "@/components/CurrencyInput";
import { FPSectionHeader } from "./layout/FPSectionHeader";
import { FPAutoField } from "./layout/FPAutoField";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calcularProtecao,
  calcularSucessorio,
} from "@/types/financialPlanning";
import type {
  ProtecaoSimplificada,
  PlanejamentoSucessorio,
  DadosCliente,
} from "@/types/financialPlanning";

const RED = "#B91C1C";
const BLUE = "#1E40AF";
const DARK = "#000000";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface Props {
  protecao: ProtecaoSimplificada;
  onProtecaoChange: (v: ProtecaoSimplificada) => void;
  sucessorio: PlanejamentoSucessorio;
  onSucessorioChange: (v: PlanejamentoSucessorio) => void;
  dadosCliente?: DadosCliente;
}

export function ProtecaoSucessorioForm({
  protecao,
  onProtecaoChange,
  sucessorio,
  onSucessorioChange,
  dadosCliente,
}: Props) {
  const setP = <K extends keyof ProtecaoSimplificada>(key: K, val: ProtecaoSimplificada[K]) =>
    onProtecaoChange({ ...protecao, [key]: val });

  const setS = <K extends keyof PlanejamentoSucessorio>(key: K, val: PlanejamentoSucessorio[K]) =>
    onSucessorioChange({ ...sucessorio, [key]: val });

  const resultProtecao = useMemo(() => calcularProtecao(protecao), [protecao]);
  const resultSucessorio = useMemo(() => calcularSucessorio(sucessorio), [sucessorio]);

  const scoreProtecao = Math.round(resultProtecao.percentualCoberto);
  const isAutoRenda = dadosCliente?.rendaMensal && dadosCliente.rendaMensal > 0 && protecao.rendaMensal === dadosCliente.rendaMensal;
  const isAutoPatrimonio = dadosCliente?.patrimonioTotalEstimado && dadosCliente.patrimonioTotalEstimado > 0 && sucessorio.patrimonioTotal === dadosCliente.patrimonioTotalEstimado;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ══ PROTEÇÃO ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FPSectionHeader
          title="Proteção e Seguros"
          subtitle="Cobertura de vida, invalidez e saúde"
          borderColor={RED}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {isAutoRenda ? (
            <FPAutoField
              label="Renda mensal"
              value={formatCurrency(protecao.rendaMensal)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Renda mensal</Label>
              <CurrencyInput
                value={protecao.rendaMensal}
                onChange={(v) => setP("rendaMensal", v)}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label className="text-[13px] font-medium text-[#111827]">Número de dependentes</Label>
            <input
              type="number"
              min={0}
              max={20}
              value={protecao.dependentes}
              onChange={(e) => setP("dependentes", parseInt(e.target.value, 10) || 0)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

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
              <Switch
                id="ps-svida"
                checked={protecao.possuiSeguroVida}
                onCheckedChange={(v) => setP("possuiSeguroVida", v)}
              />
              <Label htmlFor="ps-svida" className="text-[13px] cursor-pointer">
                Possui seguro de vida?
              </Label>
            </div>
            {protecao.possuiSeguroVida && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Capital segurado</Label>
                <CurrencyInput
                  value={protecao.capitalSeguradoVida}
                  onChange={(v) => setP("capitalSeguradoVida", v)}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              id="ps-sinval"
              checked={protecao.possuiSeguroInvalidez}
              onCheckedChange={(v) => setP("possuiSeguroInvalidez", v)}
            />
            <Label htmlFor="ps-sinval" className="text-[13px] cursor-pointer">
              Possui seguro de invalidez?
            </Label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              id="ps-saude"
              checked={protecao.possuiPlanoSaude}
              onCheckedChange={(v) => setP("possuiPlanoSaude", v)}
            />
            <Label htmlFor="ps-saude" className="text-[13px] cursor-pointer">
              Possui plano de saúde?
            </Label>
          </div>
        </div>

        {/* Resultado proteção */}
        <div
          style={{
            backgroundColor: scoreProtecao >= 80 ? "#DCFCE7" : scoreProtecao >= 50 ? "#EFF6FF" : "#FEE2E2",
            border: `1px solid ${scoreProtecao >= 80 ? "#86EFAC" : scoreProtecao >= 50 ? "#60A5FA" : "#FCA5A5"}`,
            borderRadius: 10,
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: scoreProtecao >= 80 ? "#15803D" : "#92400E" }}>
              Capital necessário
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: DARK, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(resultProtecao.capitalNecessario)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: scoreProtecao >= 80 ? "#15803D" : "#92400E" }}>
              Capital segurado
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: DARK, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(resultProtecao.capitalAtual)}
            </p>
          </div>
          {resultProtecao.gap > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: "#B91C1C" }}>
                Gap de cobertura
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#B91C1C", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(resultProtecao.gap)}
              </p>
            </div>
          )}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 6px", color: scoreProtecao >= 80 ? "#15803D" : "#92400E" }}>
              Cobertura atual
            </p>
            <Badge
              style={{
                backgroundColor: scoreProtecao >= 80 ? "#DCFCE7" : scoreProtecao >= 50 ? "#EFF6FF" : "#FEE2E2",
                color: scoreProtecao >= 80 ? "#15803D" : scoreProtecao >= 50 ? "#2563EB" : "#B91C1C",
                border: `1px solid ${scoreProtecao >= 80 ? "#86EFAC" : scoreProtecao >= 50 ? "#60A5FA" : "#FCA5A5"}`,
                fontSize: 13,
                fontWeight: 700,
                padding: "4px 12px",
              }}
            >
              {formatNumber(scoreProtecao, 0)}% — {scoreProtecao >= 80 ? "Adequado" : scoreProtecao >= 50 ? "Atenção" : "Risco"}
            </Badge>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #BFDBFE" }} />

      {/* ══ SUCESSÓRIO ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FPSectionHeader
          title="Planejamento Sucessório"
          subtitle="Testamento, holding e custos de inventário"
          borderColor={BLUE}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {isAutoPatrimonio ? (
            <FPAutoField
              label="Patrimônio total estimado"
              value={formatCurrency(sucessorio.patrimonioTotal)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#111827]">Patrimônio total estimado</Label>
              <CurrencyInput
                value={sucessorio.patrimonioTotal}
                onChange={(v) => onSucessorioChange({ ...sucessorio, patrimonioTotal: v })}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label className="text-[13px] font-medium text-[#111827]">Número de herdeiros</Label>
            <input
              type="number"
              min={0}
              max={30}
              value={sucessorio.numeroHerdeiros}
              onChange={(e) => setS("numeroHerdeiros", parseInt(e.target.value, 10) || 0)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label className="text-[13px] font-medium text-[#111827]">Estado de residência (ITCMD)</Label>
            <Select
              value={sucessorio.estadoResidencia}
              onValueChange={(v) => setS("estadoResidencia", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF..." />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
          {[
            { id: "ps-test", label: "Possui testamento?", key: "possuiTestamento" as const },
            { id: "ps-hold", label: "Possui holding familiar?", key: "possuiHolding" as const },
          ].map(({ id, label, key }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id={id}
                checked={sucessorio[key] as boolean}
                onCheckedChange={(v) => setS(key, v)}
              />
              <Label htmlFor={id} className="text-[13px] cursor-pointer">{label}</Label>
            </div>
          ))}

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="ps-svsucess"
                checked={sucessorio.possuiSeguroVidaSucessao}
                onCheckedChange={(v) => setS("possuiSeguroVidaSucessao", v)}
              />
              <Label htmlFor="ps-svsucess" className="text-[13px] cursor-pointer">
                Seguro de vida para sucessão?
              </Label>
            </div>
            {sucessorio.possuiSeguroVidaSucessao && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Capital do seguro para sucessão</Label>
                <CurrencyInput
                  value={sucessorio.capitalSeguroVidaSucessao}
                  onChange={(v) => setS("capitalSeguroVidaSucessao", v)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Resultado sucessório */}
        <div
          style={{
            backgroundColor: "#EAF0F5",
            border: "1px solid #BFDBFE",
            borderRadius: 10,
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: "#1D4ED8" }}>
              ITCMD estimado
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#B91C1C", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(resultSucessorio.itcmdEstimado)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: "#1D4ED8" }}>
              Custo inventário
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#B91C1C", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(resultSucessorio.custoInventarioEstimado)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: "#1D4ED8" }}>
              % do patrimônio
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: DARK, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {resultSucessorio.percentualCusto.toFixed(1)}%
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px", color: "#1D4ED8" }}>
              Patrimônio líquido
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#15803D", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(resultSucessorio.patrimonioLiquidoHerdeiros)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
