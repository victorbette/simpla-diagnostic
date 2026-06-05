import { PAGINA, HEADER_PAGINA, TITULO_SECAO, TEXTO_CORPO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
  onConfigChange?: (c: ConfigConsultor) => void;
}

export function DocDisclaimer({ nomeCliente, config }: Props) {
  return (
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA()}>
        <span style={TITULO_SECAO}>Disclaimer</span>
        <img src="/logo-si.svg" height={24} alt="Simpla Invest" style={{ opacity: 0.6, objectFit: "contain" }} />
      </div>

      {/* Texto principal do disclaimer */}
      <div
        style={{
          ...TEXTO_CORPO,
          marginBottom: 24,
          whiteSpace: "pre-line",
        }}
      >
        {config.textoDisclaimer}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "0.5px solid #E5E7EB", margin: "24px 0" }} />

      {/* Sobre o consultor */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#1E3A8A",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Sobre o Consultor
        </div>
        <div style={TEXTO_CORPO}>{config.descricao}</div>
      </div>

      {/* Assinatura */}
      <div
        style={{
          marginTop: 48,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 200,
            borderBottom: "1px solid #374151",
            marginBottom: 8,
          }}
        />
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
          {config.nomeCompleto}
        </div>
        <div style={{ fontSize: 11, color: "#6B7280" }}>{config.credenciais}</div>
      </div>

      <RodapePagina nomeCliente={nomeCliente} numPagina={2} totalPaginas={9} />
    </div>
  );
}
