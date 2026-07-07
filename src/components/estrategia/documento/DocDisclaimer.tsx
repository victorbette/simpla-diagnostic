import { DOC, TEXTO_CORPO, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
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
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.disclaimer} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Disclaimer" />

      <div style={{ ...TEXTO_CORPO, fontSize: 13, whiteSpace: "pre-line" }}>
        {config.textoDisclaimer}
      </div>

      <div style={{ borderTop: `1px solid ${DOC.linha}`, margin: "28px 0" }} />

      <p style={LABEL_SUBSECAO()}>Sobre o Consultor</p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>{config.descricao}</p>

      {/* Assinatura */}
      <div style={{ marginTop: 56 }}>
        <div style={{ width: 210, borderBottom: `1px solid ${DOC.texto}`, marginBottom: 9 }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: DOC.ink }}>
          {config.nomeCompleto}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: DOC.muted }}>{config.credenciais}</p>
      </div>
    </PaginaDoc>
  );
}
