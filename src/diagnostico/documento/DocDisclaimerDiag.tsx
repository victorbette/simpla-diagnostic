import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
}

const TEXTO_DISCLAIMER = `Esse Relatório não se destina à circulação geral, tampouco pode ser reproduzido. Não será assumida responsabilidade ou contingência por danos causados ou por eventual perda incorrida por qualquer parte envolvida, como resultado da circulação, publicação, reprodução ou uso deste documento com outra finalidade.

A Simpla Invest é uma Consultoria de Investimentos independente, registrada na CVM, dedicada a oferecer planejamento financeiro personalizado e livre de conflitos de interesse.

A Simpla Invest declara que segue as regras de conduta expressas nos termos da Resolução CVM nº 19/2021. Além disso, não está em situação que possa afetar a imparcialidade do relatório ou que possa configurar conflito de interesse.

A elaboração desse material se deu de maneira independente e individualizada, e o conteúdo nele divulgado não pode ser copiado, reproduzido ou distribuído, no todo ou em parte, a terceiros, sem autorização prévia.

As premissas utilizadas são de total ciência e entendimento da persona a qual o estudo se dedica. Os resultados apresentados tratam-se de projeções, não havendo controle absoluto sobre os resultados e, portanto, não se caracterizam como promessas de rentabilidade futura. O Relatório possui caráter exclusivamente educativo.`;

export function DocDisclaimerDiag({ nomeCliente, config }: Props) {
  const blocos: BlocoDoc[] = [
    {
      chave: "disclaimer",
      grudaNoProximo: true,
      node: (
        <>
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.9, margin: 0, whiteSpace: "pre-line" as const }}>
            {TEXTO_DISCLAIMER}
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 18 }}>
            <img
              src="/logocvm.png"
              alt="CVM — Comissão de Valores Mobiliários"
              style={{ height: 42, objectFit: "contain" as const }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </>
      ),
    },
    {
      chave: "contato",
      node: (
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
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.8 }}>
            <b>Consultor:</b> {config.nomeCompleto || "—"}<br />
            {config.email && (
              <><b>E-mail:</b> {config.email}<br /></>
            )}
            {config.telefone && (
              <><b>Telefone:</b> {config.telefone}<br /></>
            )}
            <br />
            <b>Simpla Invest</b><br />
            <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.8, marginTop: 4 }}>
              <b>CNPJ:</b> 27.383.813/0001-64<br />
              <b>Ouvidoria:</b> (32) 3198-2742
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PaginaDocFluidaDiag
      titulo="Disclaimer"
      nomeCliente={nomeCliente}
      blocos={blocos}
    />
  );
}
