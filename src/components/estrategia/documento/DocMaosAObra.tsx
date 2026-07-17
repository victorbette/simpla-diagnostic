import { DOC, TEXTO_CORPO } from "@/lib/documentoStyles";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
}

export function DocMaosAObra({ nomeCliente }: Props) {
  const primeiroNome = nomeCliente.split(" ")[0];

  return (
    <PaginaDoc
      marcaDagua
      rodape={
        <>
          {/* Marca discreta acima do rodapé (padrão da referência) */}
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#D1D5DB",
              textAlign: "right",
            }}
          >
            SIMPLA INVEST
          </p>
          <div
            style={{
              borderTop: `1px solid ${DOC.linha}`,
              paddingTop: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 8,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 10.5, color: DOC.hint }}>
                Financial Planning elaborado por Simpla Invest
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 10.5, color: DOC.hint }}>
                Válido por 12 meses · Recomendamos revisão anual
              </p>
            </div>
          </div>
          <RodapePagina nomeCliente={nomeCliente} />
        </>
      }
    >
      <HeaderSecao titulo="Mãos à Obra" />

      <p style={{ fontSize: 18, fontWeight: 700, color: DOC.ink, margin: "6px 0 22px" }}>
        Olá, {primeiroNome}!
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Primeiramente, parabenizo você pela decisão de investir no seu futuro e de integrar um
          grupo seleto de pessoas que detêm o controle absoluto sobre as suas finanças, trabalhando
          ativamente para preservar e multiplicar o seu legado.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Gostaria de reforçar que a Simpla Invest tem o compromisso inegociável de caminhar ao seu
          lado. Periodicamente, realizaremos encontros de alinhamento para sanar dúvidas, calibrar
          novos aportes e rebalancear o seu portfólio, sempre com o foco exclusivo na realização dos
          seus projetos com segurança institucional e tranquilidade.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          O nosso propósito final é cuidar da inteligência do seu capital, permitindo que você
          direcione o seu tempo e energia para o que gera mais valor: o crescimento da sua renda
          profissional e, acima de tudo, o convívio com a sua família. No fim do dia, isso é o que
          realmente importa.
        </p>

        <p style={{ ...TEXTO_CORPO, fontSize: 13 }}>
          Conte conosco para o sucesso desta jornada.
        </p>
      </div>
    </PaginaDoc>
  );
}
