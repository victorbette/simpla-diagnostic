import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import type { ProtecaoSimplificada, PlanejamentoSucessorio, DadosCliente } from "@/types/financialPlanning";


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

  const filhosLength = dadosCliente?.filhos?.length ?? 0;
  const rendaMensal = (Number(dadosCliente?.rendaMensal) || 0) +
    (dadosCliente?.possuiImovelRenda ? (Number(dadosCliente?.rendaImovelMensal) || 0) : 0);
  const rendaMensalHint = dadosCliente?.possuiImovelRenda
    ? `Renda mensal (${formatCurrency(Number(dadosCliente.rendaMensal) || 0)}) + Imóveis (${formatCurrency(Number(dadosCliente.rendaImovelMensal) || 0)})`
    : "Renda mensal da Situação Financeira";
  // Pre-populate dependentes from filhos on mount/change
  useEffect(() => {
    if (filhosLength > 0 && protecao.dependentes === 0) {
      onProtecaoChange({ ...protecao, dependentes: filhosLength });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filhosLength]);

  const subLabel = (text: string) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
      {text}
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ══ PROTEÇÃO ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {subLabel("Proteção e Seguros")}

        {/* Renda auto + Dependentes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Renda mensal auto */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Renda mensal</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 14, fontWeight: 600, color: "#1E40AF" }}>
                {rendaMensal > 0 ? formatCurrency(rendaMensal) : "—"}
              </div>
              {rendaMensal > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>AUTO</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{rendaMensalHint}</p>
          </div>

          {/* Dependentes editável */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label className="text-[13px] font-medium text-[#111827]">Número de dependentes</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={protecao.dependentes}
              onChange={(e) => setP("dependentes", parseInt(e.target.value, 10) || 0)}
              className="border-[#BFDBFE]"
            />
            {filhosLength > 0 && (
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                Pré-preenchido com a quantidade de filhos ({filhosLength})
              </p>
            )}
          </div>
        </div>

        {/* Switches de seguros */}
        <div style={{ border: "1px solid #BFDBFE", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Seguro de Vida */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="ps-svida"
                checked={protecao.possuiSeguroVida}
                onCheckedChange={(v) => setP("possuiSeguroVida", v)}
              />
              <Label htmlFor="ps-svida" className="text-[13px] cursor-pointer">Possui seguro de vida?</Label>
            </div>
            {protecao.possuiSeguroVida && (
              <div style={{ marginLeft: 44, marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Valor da cobertura</Label>
                <CurrencyInput
                  value={protecao.capitalSeguradoVida}
                  onChange={(v) => setP("capitalSeguradoVida", v)}
                />
              </div>
            )}
          </div>

          {/* Seguro de Invalidez */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="ps-sinval"
                checked={protecao.possuiSeguroInvalidez}
                onCheckedChange={(v) => setP("possuiSeguroInvalidez", v)}
              />
              <Label htmlFor="ps-sinval" className="text-[13px] cursor-pointer">Possui seguro de invalidez?</Label>
            </div>
            {protecao.possuiSeguroInvalidez && (
              <div style={{ marginLeft: 44, marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Valor da cobertura</Label>
                <CurrencyInput
                  value={protecao.capitalSeguradoInvalidez ?? 0}
                  onChange={(v) => setP("capitalSeguradoInvalidez", v)}
                />
              </div>
            )}
          </div>

          {/* Plano de Saúde */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              id="ps-saude"
              checked={protecao.possuiPlanoSaude}
              onCheckedChange={(v) => setP("possuiPlanoSaude", v)}
            />
            <Label htmlFor="ps-saude" className="text-[13px] cursor-pointer">Possui plano de saúde?</Label>
          </div>

          {/* Outro Seguro */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id="ps-outro"
                checked={protecao.temOutroSeguro ?? false}
                onCheckedChange={(v) => setP("temOutroSeguro", v)}
              />
              <div>
                <Label htmlFor="ps-outro" className="text-[13px] cursor-pointer">Possui outro tipo de seguro?</Label>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Carro, casa, responsabilidade civil...</p>
              </div>
            </div>
            {protecao.temOutroSeguro && (
              <div style={{ marginLeft: 44, marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <Label className="text-[12px] text-[#6B7280]">Qual(is)?</Label>
                <Input
                  value={protecao.descricaoOutroSeguro ?? ""}
                  onChange={(e) => setP("descricaoOutroSeguro", e.target.value)}
                  placeholder="Ex: Seguro auto, seguro residencial"
                  className="border-[#BFDBFE]"
                />
              </div>
            )}
          </div>
        </div>

      </section>

      <div style={{ borderTop: "1px solid #E5E7EB" }} />

      {/* ══ SUCESSÓRIO ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {subLabel("Planejamento Sucessório")}

        <div style={{ border: "1px solid #BFDBFE", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { id: "ps-test", label: "Possui testamento?", key: "possuiTestamento" as const },
            { id: "ps-hold", label: "Possui holding familiar?", key: "possuiHolding" as const },
            { id: "ps-doacoes", label: "Doações em vida com usufruto?", key: "doacoesVida" as const },
            { id: "ps-segbene", label: "Seguro com beneficiário definido?", key: "seguroComBeneficiario" as const },
            { id: "ps-prevbene", label: "Previdência com beneficiário?", key: "previdenciaComBeneficiario" as const },
            { id: "ps-maisempresa", label: "Possui mais de uma empresa?", key: "maisDeUmaEmpresa" as const },
            { id: "ps-socios", label: "Possui sócios nas empresas?", key: "possuiSocios" as const },
          ].map(({ id, label, key }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                id={id}
                checked={!!(sucessorio[key] as boolean)}
                onCheckedChange={(v) => setS(key, v)}
              />
              <Label htmlFor={id} className="text-[13px] cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>

      </section>
    </div>
  );
}
