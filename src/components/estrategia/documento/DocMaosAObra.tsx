import { PAGINA, HEADER_PAGINA, TITULO_SECAO, TEXTO_CORPO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
  numPagina: number;
}

export function DocMaosAObra({ nomeCliente, config, numPagina }: Props) {
  const primeiroNome = nomeCliente.split(" ")[0];

  return (
    <div style={PAGINA} className="doc-pagina">
      {/* Header */}
      <div style={HEADER_PAGINA()}>
        <span style={TITULO_SECAO}>Mãos à Obra</span>
        <img src="/logo-si.svg" height={24} alt="Simpla Invest" style={{ opacity: 0.6, objectFit: "contain" }} />
      </div>

      {/* Saudação */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 24,
        }}
      >
        Olá, {primeiroNome}!
      </div>

      {/* Parágrafos motivacionais */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={TEXTO_CORPO}>
          Primeiro, gostaria de te parabenizar pela decisão de investir no seu futuro e
          entrar para o seleto grupo de brasileiros que têm controle total do seu dinheiro
          e estão trabalhando para preservar e multiplicar seu patrimônio.
        </p>

        <p style={TEXTO_CORPO}>
          Segundo, estou com você nessa. A SIMPLA INVEST tem o compromisso de te acompanhar
          nessa caminhada. Periodicamente você poderá ter uma reunião ao vivo comigo para
          esclarecer quaisquer dúvidas sobre o seu plano, bem como te ajudar nos novos
          aportes e rebalanceamento, visando sempre buscar a realização dos seus projetos e
          sonhos com segurança e tranquilidade.
        </p>

        <p style={TEXTO_CORPO}>
          Nosso objetivo aqui é te ajudar a cuidar do seu plano e permitir que você tenha
          mais tempo para aumentar sua renda e se dedicar à sua família. No final do dia,
          isso é o que realmente importa. Sucesso na sua jornada!
        </p>
      </div>

      {/* Assinatura */}
      <div style={{ marginTop: 64 }}>
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

      {/* Elemento decorativo */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 72,
          textAlign: "right",
        }}
      >
        <img
          src="/logo-si.svg"
          height={48}
          alt="Simpla Invest"
          style={{ opacity: 0.12, objectFit: "contain" }}
        />
      </div>

      <RodapePagina nomeCliente={nomeCliente} numPagina={numPagina} totalPaginas={9} />
    </div>
  );
}
