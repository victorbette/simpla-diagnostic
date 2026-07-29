import { TEXTO_CORPO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PaginaDoc } from "@/components/estrategia/documento/PaginaDoc";
import { HeaderSecao } from "@/components/estrategia/documento/HeaderSecao";
import { RodapePaginaDiag } from "./RodapePaginaDiag";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
}

export function DocDisclaimerDiag({ nomeCliente, config }: Props) {
  const textoDisclaimer = config.textoDisclaimer.replace(/Financial Planning/g, "Diagnóstico Financeiro");

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Disclaimer" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 16 }}>
        A Simpla Invest é uma assessoria de investimentos independente, registrada na CVM, dedicada a oferecer planejamento financeiro personalizado e livre de conflitos de interesse.
      </p>

      <div style={{ ...TEXTO_CORPO, fontSize: 13, whiteSpace: "pre-line" }}>
        {textoDisclaimer}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 18 }}>
        <img
          src="/logocvm.png"
          alt="CVM — Comissão de Valores Mobiliários"
          style={{ height: 42, objectFit: "contain" as const }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>

      <div style={{
        background: "#F0F7FF",
        border: "0.5px solid #BFDBFE",
        borderRadius: 8,
        padding: "14px 18px",
        marginTop: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#1E40AF", marginBottom: 8 }}>
          Contato e Canal de Ouvidoria
        </div>
        <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.7 }}>
          <b>Consultor:</b> {config.nomeCompleto}<br />
          <b>E-mail:</b> {config.email || "—"}<br />
          <b>Telefone:</b> {config.telefone || "—"}<br />
          <br />
          <b>Simpla Invest</b> — CNPJ: [CNPJ da empresa]<br />
          Para reclamações ou sugestões, entre em contato pelo e-mail ouvidoria@simplainvest.com.br
        </div>
      </div>

      {/* spacer para empurrar rodapé */}
      <div style={{ flex: 1 }} />
    </PaginaDoc>
  );
}
