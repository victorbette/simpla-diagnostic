import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
}

export function DocMaosAObra({ nomeCliente, config }: Props) {
  const primeiroNome = nomeCliente.split(" ")[0];

  return (
    <PaginaDoc
      marcaDagua
      rodape={
        <>
          {/* Bloco de validade */}
          <div
            style={{
              borderTop: `1px solid ${DOC.linha}`,
              paddingTop: 14,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: DOC.texto }}>
                Financial Planning elaborado por Simpla Invest
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 10.5, color: DOC.hint }}>
                Válido por 12 meses · Recomendamos revisão anual
              </p>
            </div>
            <img
              src="/diamond-icon.png"
              alt="Simpla Invest"
              style={{ height: 26, objectFit: "contain", opacity: 0.9 }}
            />
          </div>
          <RodapePagina nomeCliente={nomeCliente} numPagina={PAG.maosAObra} totalPaginas={TOTAL_PAGINAS} />
        </>
      }
    >
      <HeaderSecao titulo="Mãos à Obra" />

      <p style={{ fontSize: 18, fontWeight: 700, color: DOC.ink, margin: "6px 0 22px" }}>
        Olá, {primeiroNome}!
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: "150mm" }}>
        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Primeiro, gostaria de te parabenizar pela decisão de investir no seu futuro e entrar para
          o seleto grupo de brasileiros que têm controle total do seu dinheiro e estão trabalhando
          para preservar e multiplicar seu patrimônio.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Segundo, estou com você nessa. A SIMPLA INVEST tem o compromisso de te acompanhar nessa
          caminhada. Periodicamente você poderá ter uma reunião ao vivo comigo para esclarecer
          quaisquer dúvidas sobre o seu plano, bem como te ajudar nos novos aportes e
          rebalanceamento, visando sempre buscar a realização dos seus projetos e sonhos com
          segurança e tranquilidade.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Nosso objetivo aqui é te ajudar a cuidar do seu plano e permitir que você tenha mais tempo
          para aumentar sua renda e se dedicar à sua família. No final do dia, isso é o que
          realmente importa. Sucesso na sua jornada!
        </p>
      </div>

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
