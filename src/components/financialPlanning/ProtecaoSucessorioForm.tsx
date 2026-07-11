import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  dadosCliente,
}: Props) {
  const setP = <K extends keyof ProtecaoSimplificada>(key: K, val: ProtecaoSimplificada[K]) =>
    onProtecaoChange({ ...protecao, [key]: val });

  const filhosLength = dadosCliente?.filhos?.length ?? 0;
  const rendaMensal = (Number(dadosCliente?.rendaMensal) || 0) +
    (dadosCliente?.possuiImovelRenda ? (Number(dadosCliente?.rendaImovelMensal) || 0) : 0);
  const rendaMensalHint = dadosCliente?.possuiImovelRenda
    ? `Renda mensal (${formatCurrency(Number(dadosCliente.rendaMensal) || 0)}) + Imóveis (${formatCurrency(Number(dadosCliente.rendaImovelMensal) || 0)})`
    : "Renda mensal da Situação Financeira";

  useEffect(() => {
    if (filhosLength > 0 && protecao.dependentes === 0) {
      onProtecaoChange({ ...protecao, dependentes: filhosLength });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filhosLength]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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
    </div>
  );
}
