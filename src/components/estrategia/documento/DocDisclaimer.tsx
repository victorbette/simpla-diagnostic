import { DOC, TEXTO_CORPO, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
  onConfigChange?: (c: ConfigConsultor) => void;
}

export function DocDisclaimer({ nomeCliente, config }: Props) {
  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Disclaimer" />

      <div style={{ ...TEXTO_CORPO, fontSize: 13, whiteSpace: "pre-line" }}>
        {config.textoDisclaimer}
      </div>

      <div style={{ borderTop: `1px solid ${DOC.linha}`, margin: "28px 0" }} />

      <p style={LABEL_SUBSECAO()}>Sobre o Consultor</p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>{config.descricao}</p>

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
