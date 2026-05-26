import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ALOCACAO_ALVO, PERFIL_LABELS, calcularAlocacaoAtual } from "@/types/financialPlanning";
import type { AtivoAtual, PerfilRisco } from "@/types/financialPlanning";

const CAMPOS: { key: keyof Omit<AtivoAtual, "total">; label: string; hint: string; color: string }[] = [
  { key: "rendaFixa", label: "Renda Fixa", hint: "CDB, Tesouro, LCI, LCA", color: "#1E40AF" },
  { key: "acoes", label: "Ações brasileiras", hint: "Ações, ETFs nacionais", color: "#15803D" },
  { key: "fiis", label: "FIIs", hint: "Fundos Imobiliários", color: "#15803D" },
  { key: "rvGlobal", label: "RV Global", hint: "BDR, ETF int., conta ext.", color: "#000000" },
  { key: "rfGlobal", label: "RF Global", hint: "Renda fixa internacional", color: "#6B7280" },
  { key: "cripto", label: "Criptoativos", hint: "Bitcoin, Ethereum e outros", color: "#3B82F6" },
];

interface Props {
  value: AtivoAtual;
  suitabilityPerfil: PerfilRisco | null;
  onChange: (v: AtivoAtual) => void;
  comecandoDoZero?: boolean;
  onComecandoDoZeroChange?: (v: boolean) => void;
}

export function AtivoForm({ value, suitabilityPerfil, onChange, comecandoDoZero, onComecandoDoZeroChange }: Props) {
  const zerando = comecandoDoZero ?? false;

  const total = value.rendaFixa + value.acoes + value.fiis + value.rvGlobal + value.rfGlobal + value.cripto;

  function handleField(key: keyof Omit<AtivoAtual, "total">, v: number) {
    const updated = { ...value, [key]: v };
    const newTotal = updated.rendaFixa + updated.acoes + updated.fiis + updated.rvGlobal + updated.rfGlobal + updated.cripto;
    onChange({ ...updated, total: newTotal });
  }

  function handleZerando(checked: boolean) {
    onComecandoDoZeroChange?.(checked);
    if (checked) {
      onChange({ rendaFixa: 0, acoes: 0, fiis: 0, rvGlobal: 0, rfGlobal: 0, cripto: 0, total: 0 });
    }
  }

  const alocacaoAtual = calcularAlocacaoAtual({ ...value, total: total || 1 });
  const alvo = suitabilityPerfil ? ALOCACAO_ALVO[suitabilityPerfil] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header: título + switch */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
          Carteira de Investimentos
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch id="zerando" checked={zerando} onCheckedChange={handleZerando} />
          <Label htmlFor="zerando" className="text-sm cursor-pointer text-[#6B7280]">
            Começando do zero
          </Label>
        </div>
      </div>

      {zerando ? (
        <div style={{ backgroundColor: "#EAF0F5", border: "1px solid #BFDBFE", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#1E40AF" }}>
          <span style={{ fontSize: 20, marginRight: 8 }}>🌱</span>
          Cliente está iniciando sua jornada de investimentos.
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{ border: "1px solid #F0F7FF", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", backgroundColor: "#F0F7FF", borderBottom: "1px solid #E5E7EB", padding: "10px 16px" }}>
              {["Classe de ativo", "Valor (R$)", "% Atual"].map((h) => (
                <p key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", margin: 0 }}>{h}</p>
              ))}
            </div>

            {CAMPOS.map(({ key, label, hint, color }) => {
              const atual = alocacaoAtual[key] ?? 0;
              const alvoVal = alvo ? (alvo[key] ?? 0) : null;
              return (
                <div key={key} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", borderBottom: "1px solid #F0F7FF", padding: "12px 16px", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#000000" }}>{label}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0 18px" }}>{hint}</p>
                  </div>
                  <CurrencyInput value={value[key]} onChange={(v) => handleField(key, v)} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{formatNumber(atual, 1)}%</p>
                    {alvoVal !== null && <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>alvo: {alvoVal}%</p>}
                  </div>
                </div>
              );
            })}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", padding: "12px 16px", backgroundColor: "#F0F7FF", alignItems: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#000000", margin: 0 }}>Total</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#000000", margin: 0, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(total)}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#000000", margin: 0 }}>100%</p>
            </div>
          </div>

          {/* Comparison bars */}
          {total > 0 && suitabilityPerfil && alvo && (
            <div style={{ backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 10, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", margin: "0 0 12px", textTransform: "uppercase" }}>
                Comparação com perfil {PERFIL_LABELS[suitabilityPerfil]}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CAMPOS.map(({ key, label, color }) => {
                  const atual = alocacaoAtual[key] ?? 0;
                  const alvoVal = alvo[key] ?? 0;
                  return (
                    <div key={key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
                      <div style={{ position: "relative", height: 8, backgroundColor: "#BFDBFE", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, atual)}%`, backgroundColor: color, borderRadius: 4 }} />
                        {alvoVal > 0 && (
                          <div style={{ position: "absolute", top: 0, height: "100%", width: 2, backgroundColor: "#111827", left: `${Math.min(100, alvoVal)}%` }} />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#111827", textAlign: "right" }}>
                        <span style={{ fontWeight: 600 }}>{formatNumber(atual, 1)}%</span>
                        <span style={{ color: "#9CA3AF" }}> / {alvoVal}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
