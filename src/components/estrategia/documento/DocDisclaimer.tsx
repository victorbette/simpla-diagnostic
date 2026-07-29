import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
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
        Este documento foi elaborado por um Consultor de Valores Mobiliários devidamente autorizado pela Comissão de Valores Mobiliários (CVM), em conformidade com a Resolução CVM n.º 19/2021. As informações aqui contidas têm caráter exclusivamente informativo e educacional, não constituindo oferta, solicitação, recomendação ou aconselhamento de investimento.
      </p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 14 }}>
        O planejamento financeiro apresentado é baseado nas informações fornecidas pelo cliente e em premissas que podem não se concretizar. Rentabilidades passadas não são garantia de resultados futuros. O investidor deve considerar seus próprios objetivos, situação financeira e necessidades antes de tomar qualquer decisão de investimento.
      </p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
        Este material não deve ser reproduzido, distribuído ou publicado por qualquer pessoa para qualquer finalidade sem o prévio consentimento da Simpla Invest. Em caso de dúvidas, entre em contato com o consultor responsável ou com a ouvidoria da Simpla Invest.
      </p>

      {/* Selos de certificação */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 18 }}>
        <img
          src="/logocvm.png"
          alt="CVM — Comissão de Valores Mobiliários"
          style={{ height: 42, objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <img
          src="/logoanbimacea.png"
          alt="ANBIMA Professional CEA"
          style={{ height: 42, objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>

      {/* Ouvidoria e Comunidade Simpla (referência v5) — os links ficam
          clicáveis no PDF gerado pelo navegador */}
      <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Ouvidoria Simpla: <strong style={{ color: DOC.ink }}>32 31982742</strong> ou clique{" "}
          <a
            href="https://wa.me/553231982742"
            target="_blank"
            rel="noreferrer"
            style={{ fontWeight: 700, color: DOC.ink, textDecoration: "underline" }}
          >
            AQUI
          </a>
        </p>
        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Comunidade Simpla de Avisos clique{" "}
          <a
            href="https://chat.whatsapp.com/IyayLHuwHOK9xG9JImuMo9"
            target="_blank"
            rel="noreferrer"
            style={{ fontWeight: 700, color: DOC.ink, textDecoration: "underline" }}
          >
            AQUI
          </a>
        </p>
      </div>
    </PaginaDoc>
  );
}
