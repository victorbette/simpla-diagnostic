import { TEXTO_CORPO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
  onConfigChange?: (c: ConfigConsultor) => void;
}

export function DocDisclaimer({ nomeCliente }: Props) {
  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Disclaimer" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        Este documento foi elaborado em conformidade com a Resolução CVM n.º 19/2021. As informações aqui contidas têm caráter exclusivamente informativo e educacional, não constituindo oferta, solicitação, recomendação ou aconselhamento de investimento.
      </p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        O planejamento financeiro apresentado é baseado nas informações fornecidas pelo cliente e em premissas que podem não se concretizar. Rentabilidades passadas não são garantia de resultados futuros. O investidor deve considerar seus próprios objetivos, situação financeira e necessidades antes de tomar qualquer decisão de investimento.
      </p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
        Este material não deve ser reproduzido, distribuído ou publicado por qualquer pessoa para qualquer finalidade sem o prévio consentimento da Simpla Invest. Em caso de dúvidas, entre em contato com o consultor responsável ou com a ouvidoria da Simpla Invest.
      </p>

      {/* Logo CVM */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <img
          src="/logocvm.png"
          alt="CVM — Comissão de Valores Mobiliários"
          style={{ height: 42, objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>

      {/* Cards Ouvidoria e Comunidade */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ background: "#F0F7FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <i className="ti ti-headset" style={{ fontSize: 16, color: "#2563EB" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>Ouvidoria Simpla</span>
          </div>
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.7 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#6B7280" }}>Telefone:</span>{" "}
              <strong>(11) 99999-9999</strong>
            </div>
            <div>
              <span style={{ color: "#6B7280" }}>Link:</span>{" "}
              <span style={{ color: "#2563EB", textDecoration: "underline" }}>
                ouvidoria.simplainvest.com.br
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: "#F0F7FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <i className="ti ti-users" style={{ fontSize: 16, color: "#2563EB" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>Comunidade Simpla</span>
          </div>
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.7 }}>
            <div>
              <span style={{ color: "#6B7280" }}>Link:</span>{" "}
              <span style={{ color: "#2563EB", textDecoration: "underline" }}>
                comunidade.simplainvest.com.br
              </span>
            </div>
          </div>
        </div>
      </div>
    </PaginaDoc>
  );
}
