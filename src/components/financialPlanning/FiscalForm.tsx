import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import type { PlanejamentoFiscal, DadosCliente } from "@/types/financialPlanning";

const TRABALHO_LABELS: Record<string, string> = {
  clt: "CLT (empregado)",
  autonomo: "Autônomo / Freelancer",
  empresario: "Empresário / CNPJ",
  concursado: "Servidor público",
};

const OPCOES_ISENTOS = ["LCI / LCA", "Dividendos", "Lucros distribuídos", "Outros"];

interface FiscalFormProps {
  value: PlanejamentoFiscal;
  onChange: (v: PlanejamentoFiscal) => void;
  dadosCliente?: DadosCliente;
}

export function FiscalForm({ value, onChange, dadosCliente }: FiscalFormProps) {
  const set = <K extends keyof PlanejamentoFiscal>(key: K, val: PlanejamentoFiscal[K]) =>
    onChange({ ...value, [key]: val });

  const rendaMensalFiscal = (Number(dadosCliente?.rendaMensal) || 0) +
    (dadosCliente?.possuiImovelRenda ? (Number(dadosCliente?.rendaImovelMensal) || 0) : 0);
  const rendaMensalHint = dadosCliente?.possuiImovelRenda
    ? `Renda mensal (${formatCurrency(Number(dadosCliente.rendaMensal) || 0)}) + Imóveis (${formatCurrency(Number(dadosCliente.rendaImovelMensal) || 0)})`
    : "Renda mensal da Situação Financeira";
  const rendaAnualAuto = rendaMensalFiscal * 12;
  const ajustada = value.rendaAnualAjustada ?? false;

  // Auto-sync renda when not manually adjusted
  useEffect(() => {
    if (!ajustada && rendaAnualAuto > 0 && Math.abs(rendaAnualAuto - value.rendaBrutaAnual) > 1) {
      onChange({ ...value, rendaBrutaAnual: rendaAnualAuto });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dadosCliente?.rendaMensal, dadosCliente?.rendaImovelMensal, dadosCliente?.possuiImovelRenda, ajustada]);

  // Rendimentos isentos helpers
  const tiposIsentos = value.tiposRendimentosIsentos ?? [];
  const outrosEntry = tiposIsentos.find((t) => t.startsWith("Outros"));
  const outrosTexto = outrosEntry ? outrosEntry.replace(/^Outros:?\s*/, "") : "";
  const temOutros = !!outrosEntry;

  function toggleIsento(tipo: string, checked: boolean) {
    if (tipo === "Outros") {
      if (checked) {
        set("tiposRendimentosIsentos", [...tiposIsentos.filter((t) => !t.startsWith("Outros")), "Outros"]);
      } else {
        set("tiposRendimentosIsentos", tiposIsentos.filter((t) => !t.startsWith("Outros")));
      }
    } else {
      if (checked) {
        set("tiposRendimentosIsentos", [...tiposIsentos.filter((t) => t !== tipo), tipo]);
      } else {
        set("tiposRendimentosIsentos", tiposIsentos.filter((t) => t !== tipo));
      }
    }
  }

  function setOutrosTexto(txt: string) {
    set("tiposRendimentosIsentos", [
      ...tiposIsentos.filter((t) => !t.startsWith("Outros")),
      txt ? `Outros: ${txt}` : "Outros",
    ]);
  }

  const isAutoTrabalho = dadosCliente?.tipoTrabalho != null && dadosCliente.tipoTrabalho.length > 0;

  const subLabel = (text: string) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
      {text}
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {subLabel("Perfil Fiscal")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Renda mensal — sempre auto */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Renda mensal</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 14, fontWeight: 600, color: "#1E40AF" }}>
              {rendaMensalFiscal > 0 ? formatCurrency(rendaMensalFiscal) : "—"}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>AUTO</span>
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{rendaMensalHint}</p>
        </div>

        {/* Renda anual — auto ou ajustável */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Renda anual bruta</span>
            {ajustada ? (
              <button
                type="button"
                onClick={() => onChange({ ...value, rendaAnualAjustada: false, rendaBrutaAnual: rendaAnualAuto })}
                style={{ fontSize: 11, color: "#2563EB", background: "none", border: "1px solid #BFDBFE", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
              >
                ↺ Recalcular
              </button>
            ) : (
              <button
                type="button"
                onClick={() => set("rendaAnualAjustada", true)}
                style={{ fontSize: 11, color: "#6B7280", background: "none", border: "1px solid #E5E7EB", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
              >
                Ajustar
              </button>
            )}
          </div>
          {ajustada ? (
            <CurrencyInput
              value={value.rendaBrutaAnual}
              onChange={(v) => set("rendaBrutaAnual", v)}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 14, fontWeight: 600, color: "#1E40AF" }}>
                {rendaAnualAuto > 0 ? formatCurrency(rendaAnualAuto) : "—"}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>AUTO</span>
            </div>
          )}
        </div>

        {/* Tipo declaração */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label className="text-[13px] font-medium text-[#111827]">Tipo de declaração IR</Label>
          <Select
            value={value.tipoDeclaracao}
            onValueChange={(v) => set("tipoDeclaracao", v as PlanejamentoFiscal["tipoDeclaracao"])}
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

        {/* Tipo vínculo — auto */}
        {isAutoTrabalho && dadosCliente?.tipoTrabalho ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Tipo de vínculo</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>
                {TRABALHO_LABELS[dadosCliente.tipoTrabalho] ?? dadosCliente.tipoTrabalho}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>AUTO</span>
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Switches */}
      <div style={{ border: "1px solid #BFDBFE", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Tem empresa */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              id="fis-empresa"
              checked={value.temEmpresa}
              onCheckedChange={(v) => {
                if (!v) onChange({ ...value, temEmpresa: false, nomeEmpresa: "", recebeProlabore: false, recebeDividendos: false });
                else set("temEmpresa", true);
              }}
            />
            <Label htmlFor="fis-empresa" className="text-[13px] cursor-pointer">Tem empresa (CNPJ)?</Label>
          </div>
          {value.temEmpresa && (
            <div style={{ marginLeft: 44, marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <Label className="text-[12px] text-[#6B7280]">Nome / CNPJ da empresa (opcional)</Label>
              <Input
                value={value.nomeEmpresa ?? ""}
                onChange={(e) => set("nomeEmpresa", e.target.value)}
                placeholder="Ex: Empresa XYZ / 12.345.678/0001-99"
                className="border-[#BFDBFE]"
              />
            </div>
          )}
        </div>

        {/* Rendimentos isentos */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              id="fis-isentos"
              checked={value.temRendimentosIsentos}
              onCheckedChange={(v) => {
                if (!v) onChange({ ...value, temRendimentosIsentos: false, tiposRendimentosIsentos: [] });
                else set("temRendimentosIsentos", true);
              }}
            />
            <div>
              <Label htmlFor="fis-isentos" className="text-[13px] cursor-pointer">Tem rendimentos isentos?</Label>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>LCI / LCA, Dividendos, Lucros e outros</p>
            </div>
          </div>
          {value.temRendimentosIsentos && (
            <div style={{ marginLeft: 44, marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {OPCOES_ISENTOS.map((tipo) => {
                const isOutros = tipo === "Outros";
                const checked = isOutros ? temOutros : tiposIsentos.includes(tipo);
                return (
                  <div key={tipo}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#111827" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleIsento(tipo, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563EB" }}
                      />
                      {tipo}
                    </label>
                    {isOutros && temOutros && (
                      <div style={{ marginLeft: 24, marginTop: 6 }}>
                        <Input
                          value={outrosTexto}
                          onChange={(e) => setOutrosTexto(e.target.value)}
                          placeholder="Descreva o tipo de rendimento isento"
                          className="border-[#BFDBFE]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
