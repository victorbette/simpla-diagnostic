import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/CurrencyInput";
import { FPSectionHeader } from "./layout/FPSectionHeader";
import { FPAutoField } from "./layout/FPAutoField";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ALOCACAO_ALVO, PERFIL_LABELS, calcularAlocacaoAtual } from "@/types/financialPlanning";
import type { AtivoAtual, PerfilRisco, DadosCliente } from "@/types/financialPlanning";

const TEAL = "#BBA866";

const CAMPOS: { key: keyof Omit<AtivoAtual, "total">; label: string; hint: string; color: string }[] = [
  { key: "rendaFixa", label: "Renda Fixa", hint: "CDB, Tesouro, LCI, LCA", color: "#2A4F6A" },
  { key: "acoes", label: "Ações brasileiras", hint: "Ações, ETFs nacionais", color: "#3D6B41" },
  { key: "fiis", label: "FIIs", hint: "Fundos Imobiliários", color: "#A78BFA" },
  { key: "rvGlobal", label: "RV Global", hint: "BDR, ETF int., conta ext.", color: "#F97316" },
  { key: "rfGlobal", label: "RF Global", hint: "Renda fixa internacional", color: "#06B6D4" },
  { key: "cripto", label: "Criptoativos", hint: "Bitcoin, Ethereum e outros", color: "#EAB308" },
];

interface Props {
  value: AtivoAtual;
  suitabilityPerfil: PerfilRisco | null;
  onChange: (v: AtivoAtual) => void;
  dadosCliente?: DadosCliente;
}

export function AtivoForm({ value, suitabilityPerfil, onChange, dadosCliente }: Props) {
  const [zerando, setZerando] = useState(false);

  const total =
    value.rendaFixa + value.acoes + value.fiis + value.rvGlobal + value.rfGlobal + value.cripto;

  function handleField(key: keyof Omit<AtivoAtual, "total">, v: number) {
    const updated = { ...value, [key]: v };
    const newTotal =
      updated.rendaFixa + updated.acoes + updated.fiis +
      updated.rvGlobal + updated.rfGlobal + updated.cripto;
    onChange({ ...updated, total: newTotal });
  }

  function handleZerando(checked: boolean) {
    setZerando(checked);
    if (checked) {
      onChange({ rendaFixa: 0, acoes: 0, fiis: 0, rvGlobal: 0, rfGlobal: 0, cripto: 0, total: 0 });
    }
  }

  const alocacaoAtual = calcularAlocacaoAtual({ ...value, total: total || 1 });
  const alvo = suitabilityPerfil ? ALOCACAO_ALVO[suitabilityPerfil] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ══ Resumo patrimonial ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Resumo Patrimonial"
          subtitle="Valores obtidos da coleta de dados"
          borderColor={TEAL}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {dadosCliente?.patrimonioTotalEstimado ? (
            <FPAutoField
              label="Patrimônio total estimado"
              value={formatCurrency(dadosCliente.patrimonioTotalEstimado)}
              hint="Inclui imóveis e bens"
            />
          ) : null}
          {dadosCliente?.patrimonioFinanceiroEstimado ? (
            <FPAutoField
              label="Patrimônio financeiro"
              value={formatCurrency(dadosCliente.patrimonioFinanceiroEstimado)}
              hint="Apenas investimentos"
            />
          ) : null}
        </div>
      </section>

      {/* ══ Carteira de investimentos ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <FPSectionHeader
            title="Carteira de Investimentos"
            subtitle="Valor atual em cada classe de ativo"
            borderColor={TEAL}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch id="zerando" checked={zerando} onCheckedChange={handleZerando} />
            <Label htmlFor="zerando" className="text-sm cursor-pointer text-[#6B6347]">
              Começando do zero
            </Label>
          </div>
        </div>

        {zerando && (
          <div
            style={{
              backgroundColor: "#F0FDFA",
              border: "1px solid #99F6E4",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: 13,
              color: "#0F766E",
            }}
          >
            O planejamento partirá do zero com base nos aportes mensais projetados.
          </div>
        )}

        {/* Table */}
        <div style={{ border: "1px solid #F5F3EE", borderRadius: 10, overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1fr",
              backgroundColor: "#F5F3EE",
              borderBottom: "1px solid #F5F3EE",
              padding: "10px 16px",
            }}
          >
            {["Classe de ativo", "Valor (R$)", "% Atual"].map((h) => (
              <p key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9E9070", textTransform: "uppercase", margin: 0 }}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {CAMPOS.map(({ key, label, hint, color }) => {
            const atual = alocacaoAtual[key] ?? 0;
            const alvoVal = alvo ? (alvo[key] ?? 0) : null;
            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr",
                  borderBottom: "1px solid #F5F3EE",
                  padding: "12px 16px",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#000000" }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#9E9070", margin: "2px 0 0 18px" }}>{hint}</p>
                </div>
                <CurrencyInput
                  value={value[key]}
                  onChange={(v) => handleField(key, v)}
                  disabled={zerando}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#3D3520", margin: 0 }}>
                    {formatNumber(atual, 1)}%
                  </p>
                  {alvoVal !== null && (
                    <p style={{ fontSize: 11, color: "#9E9070", margin: 0 }}>
                      alvo: {alvoVal}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Total row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1fr",
              padding: "12px 16px",
              backgroundColor: "#F5F3EE",
              alignItems: "center",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 700, color: "#000000", margin: 0 }}>Total</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#000000", margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(total)}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#000000", margin: 0 }}>100%</p>
          </div>
        </div>

        {/* Allocation bars vs target */}
        {total > 0 && suitabilityPerfil && alvo && (
          <div
            style={{
              backgroundColor: "#F0FDFA",
              border: "1px solid #99F6E4",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0F766E", margin: "0 0 12px", textTransform: "uppercase" }}>
              Comparação com perfil {PERFIL_LABELS[suitabilityPerfil]}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CAMPOS.map(({ key, label, color }) => {
                const atual = alocacaoAtual[key] ?? 0;
                const alvoVal = alvo[key] ?? 0;
                return (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#6B6347" }}>{label}</span>
                    <div style={{ position: "relative", height: 8, backgroundColor: "#E2DCC8", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, atual)}%`, backgroundColor: color, borderRadius: 4 }} />
                      {alvoVal > 0 && (
                        <div style={{ position: "absolute", top: 0, height: "100%", width: 2, backgroundColor: "#3D3520", left: `${Math.min(100, alvoVal)}%` }} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#3D3520", textAlign: "right" }}>
                      <span style={{ fontWeight: 600 }}>{formatNumber(atual, 1)}%</span>
                      <span style={{ color: "#9E9070" }}> / {alvoVal}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ══ Outros ativos ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Outros Ativos"
          subtitle="Imóveis para aluguel ou participações societárias"
          borderColor={TEAL}
        />
        <div style={{ border: "1px solid #E2DCC8", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "#9E9070", margin: 0 }}>
            Esses ativos serão considerados na análise de independência financeira.
          </p>
        </div>
      </section>
    </div>
  );
}
