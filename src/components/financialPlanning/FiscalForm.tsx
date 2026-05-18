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
import { calcularFiscal } from "@/types/financialPlanning";
import type { PlanejamentoFiscal, DadosCliente } from "@/types/financialPlanning";

const AMBER = "#F59E0B";
const DARK = "#041A20";

const TRABALHO_LABELS: Record<string, string> = {
  clt: "CLT (empregado)",
  autonomo: "Autônomo / Freelancer",
  empresario: "Empresário / CNPJ",
  concursado: "Servidor público",
};

interface FiscalFormProps {
  value: PlanejamentoFiscal;
  onChange: (v: PlanejamentoFiscal) => void;
  dadosCliente?: DadosCliente;
}

export function FiscalForm({ value, onChange, dadosCliente }: FiscalFormProps) {
  const set = <K extends keyof PlanejamentoFiscal>(key: K, val: PlanejamentoFiscal[K]) =>
    onChange({ ...value, [key]: val });

  const resultado = calcularFiscal(value);

  const pgblPct =
    resultado.tetoPGBL > 0
      ? Math.min(100, (resultado.pgblAtual / resultado.tetoPGBL) * 100)
      : 0;

  const isAutoRenda =
    dadosCliente?.rendaMensal && value.rendaBrutaAnual === dadosCliente.rendaMensal * 12;
  const isAutoTrabalho =
    dadosCliente?.tipoTrabalho != null && dadosCliente.tipoTrabalho.length > 0;

  function handleToggleEmpresa(v: boolean) {
    set("temEmpresa", v);
    if (!v) onChange({ ...value, temEmpresa: false, recebeProlabore: false, recebeDividendos: false });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Perfil fiscal */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FPSectionHeader
          title="Perfil Fiscal"
          subtitle="Renda, tipo de declaração e vínculo profissional"
          borderColor={AMBER}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {isAutoRenda ? (
            <FPAutoField
              label="Renda mensal bruta"
              value={formatCurrency(value.rendaBrutaAnual / 12)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[13px] font-medium text-[#374151]">Renda mensal bruta</Label>
              <CurrencyInput
                value={value.rendaBrutaAnual / 12}
                onChange={(v) => set("rendaBrutaAnual", v * 12)}
              />
            </div>
          )}

          <FPAutoField
            label="Renda anual bruta"
            value={formatCurrency(value.rendaBrutaAnual)}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label className="text-[13px] font-medium text-[#374151]">Tipo de declaração IR</Label>
            <Select
              value={value.tipoDeclaracao}
              onValueChange={(v) =>
                set("tipoDeclaracao", v as PlanejamentoFiscal["tipoDeclaracao"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completa">Declaração completa</SelectItem>
                <SelectItem value="simplificada">Declaração simplificada</SelectItem>
                <SelectItem value="nao_sei">Não sei informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAutoTrabalho && dadosCliente?.tipoTrabalho ? (
            <FPAutoField
              label="Tipo de vínculo"
              value={TRABALHO_LABELS[dadosCliente.tipoTrabalho] ?? dadosCliente.tipoTrabalho}
            />
          ) : (
            <div />
          )}
        </div>
      </section>

      {/* Previdência privada */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Previdência Privada"
          subtitle="PGBL, VGBL e contribuições ao IR"
          borderColor={AMBER}
        />

        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* PGBL */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="fis-pgbl"
                checked={value.temPGBL}
                onCheckedChange={(v) => set("temPGBL", v)}
              />
              <Label htmlFor="fis-pgbl" className="text-[13px] cursor-pointer">
                Possui previdência PGBL?
              </Label>
            </div>
            {value.temPGBL && (
              <div
                style={{
                  marginLeft: 44,
                  marginTop: 12,
                  maxWidth: 280,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <Label className="text-[12px] text-[#6B7280]">Valor aportado anualmente</Label>
                <CurrencyInput
                  value={value.valorPGBLAnual ?? 0}
                  onChange={(v) => set("valorPGBLAnual", v)}
                />
              </div>
            )}
          </div>

          {/* VGBL */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="fis-vgbl"
                checked={value.temVGBL}
                onCheckedChange={(v) => set("temVGBL", v)}
              />
              <Label htmlFor="fis-vgbl" className="text-[13px] cursor-pointer">
                Possui previdência VGBL?
              </Label>
            </div>
            {value.temVGBL && (
              <div
                style={{
                  marginLeft: 44,
                  marginTop: 12,
                  maxWidth: 280,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <Label className="text-[12px] text-[#6B7280]">Valor aportado anualmente</Label>
                <CurrencyInput
                  value={value.valorVGBLAnual ?? 0}
                  onChange={(v) => set("valorVGBLAnual", v)}
                />
              </div>
            )}
          </div>

          {/* Empresa */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="fis-empresa"
                checked={value.temEmpresa}
                onCheckedChange={handleToggleEmpresa}
              />
              <Label htmlFor="fis-empresa" className="text-[13px] cursor-pointer">
                Tem empresa (CNPJ)?
              </Label>
            </div>
            {value.temEmpresa && (
              <div
                style={{
                  marginLeft: 44,
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Switch
                    id="fis-prolabore"
                    checked={value.recebeProlabore}
                    onCheckedChange={(v) => set("recebeProlabore", v)}
                  />
                  <Label htmlFor="fis-prolabore" className="text-[13px] cursor-pointer">
                    Recebe pró-labore?
                  </Label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Switch
                    id="fis-dividendos"
                    checked={value.recebeDividendos}
                    onCheckedChange={(v) => set("recebeDividendos", v)}
                  />
                  <Label htmlFor="fis-dividendos" className="text-[13px] cursor-pointer">
                    Recebe dividendos?
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Rendimentos isentos */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="fis-isentos"
                checked={value.temRendimentosIsentos}
                onCheckedChange={(v) => set("temRendimentosIsentos", v)}
              />
              <Label htmlFor="fis-isentos" className="text-[13px] cursor-pointer">
                Tem rendimentos isentos? (LCI/LCA, dividendos, FIIs)
              </Label>
            </div>
            {value.temRendimentosIsentos && (
              <div
                style={{
                  marginLeft: 44,
                  marginTop: 12,
                  maxWidth: 280,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <Label className="text-[12px] text-[#6B7280]">Valor anual de rendimentos isentos</Label>
                <CurrencyInput
                  value={value.valorRendimentosIsentos}
                  onChange={(v) => set("valorRendimentosIsentos", v)}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Painel resultado */}
      <div
        style={{
          backgroundColor: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 10,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#92400E",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          Análise tributária
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {value.tipoDeclaracao === "completa" && resultado.tetoPGBL > 0 && (
            <>
              <div>
                <p style={{ fontSize: 11, color: "#92400E", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
                  Teto de dedução PGBL
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: DARK, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(resultado.tetoPGBL)}/ano
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#92400E", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
                  Economia potencial
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#16A34A", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(resultado.economiaFiscalPotencial)}/ano
                </p>
              </div>
              {resultado.espacoPGBL > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: "#92400E", fontWeight: 600, textTransform: "uppercase", margin: "0 0 4px" }}>
                    Espaço disponível
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#B45309", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(resultado.espacoPGBL)}/ano
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <p style={{ fontSize: 11, color: "#92400E", fontWeight: 600, textTransform: "uppercase", margin: "0 0 6px" }}>
              Recomendação
            </p>
            <Badge
              style={{
                backgroundColor:
                  value.tipoDeclaracao === "completa" ? "#F0FDF4" : "#EFF6FF",
                color: value.tipoDeclaracao === "completa" ? "#16A34A" : "#1D4ED8",
                border:
                  value.tipoDeclaracao === "completa"
                    ? "1px solid #86EFAC"
                    : "1px solid #BFDBFE",
                fontSize: 13,
                fontWeight: 700,
                padding: "4px 12px",
              }}
            >
              {value.tipoDeclaracao === "completa"
                ? "PGBL recomendado"
                : "VGBL mais indicado"}
            </Badge>
          </div>
        </div>

        {value.tipoDeclaracao === "completa" && resultado.tetoPGBL > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#92400E",
              }}
            >
              <span>Utilização do teto PGBL</span>
              <span style={{ fontWeight: 600 }}>{formatNumber(pgblPct, 0)}%</span>
            </div>
            <div
              style={{
                height: 6,
                backgroundColor: "#FDE68A",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pgblPct}%`,
                  backgroundColor: AMBER,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        )}

        {resultado.analisePrevidencia && (
          <p
            style={{
              fontSize: 13,
              color: "#92400E",
              margin: 0,
              backgroundColor: "#FEF3C7",
              padding: "10px 14px",
              borderRadius: 8,
            }}
          >
            {resultado.analisePrevidencia}
          </p>
        )}
      </div>
    </div>
  );
}
