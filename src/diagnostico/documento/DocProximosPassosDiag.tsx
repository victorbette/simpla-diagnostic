import { useState } from "react";
import { TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { nomeCliente: string; }

const PASSOS = [
  {
    numero: 1,
    titulo: "Assinatura do Contrato",
    icone: "ti-file-check",
    texto: "Formalizar o início do acompanhamento com a assinatura do contrato de assessoria de investimentos.",
  },
  {
    numero: 2,
    titulo: "Reunião Inicial",
    icone: "ti-calendar",
    texto: "Reunião para apresentação completa do diagnóstico, definição das prioridades e alinhamento do plano de ação personalizado.",
  },
  {
    numero: 3,
    titulo: "Envio de Informações Complementares",
    icone: "ti-file-upload",
    texto: "Envio dos extratos de previdência privada e apólices de seguro para análise completa da proteção e planejamento tributário.",
  },
  {
    numero: 4,
    titulo: "Habilitar Conta na Corretora Parceira",
    icone: "ti-building-bank",
    texto: "Abertura ou portabilidade da conta em uma das corretoras parceiras para acesso às melhores condições e produtos do mercado.",
  },
] as const;

export function DocProximosPassosDiag({ nomeCliente }: Props) {
  const [dataReuniao, setDataReuniao] = useState("");

  const blocos: BlocoDoc[] = [
    {
      chave: "intro",
      grudaNoProximo: true,
      node: (
        <>
          <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 10 }}>
            Este diagnóstico trouxe clareza sobre onde você está hoje — e clareza é o primeiro passo para a mudança. Mas o conhecimento sem ação não transforma nada. O que separa as pessoas que constroem o futuro que desejam das que apenas sonham com ele é exatamente este momento: a decisão de agir.
          </p>
          <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 24 }}>
            Os próximos passos foram definidos para que a jornada comece de forma estruturada, segura e com o suporte necessário para que cada decisão seja tomada com clareza.
          </p>
        </>
      ),
    },
    {
      chave: "rbc",
      grudaNoProximo: true,
      node: (
        <>
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 16px" }}>
            Segundo estudo do Royal Bank of Canadá — uma das maiores instituições financeiras do mundo — investidores que tiveram um consultor independente por 15 anos tiveram, na média, um patrimônio quase quatro vezes maior do que os que não tinham um consultor.
          </p>

          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 16px" }}>
            Esses números não são aspiracionais. São dados reais, medidos ao longo de décadas, com milhares de investidores. E eles revelam uma verdade que os melhores investidores já entenderam: a diferença entre construir patrimônio com consistência ou ficar para trás não está nos produtos escolhidos — está no acompanhamento, na estratégia e nas decisões tomadas no momento certo.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 0 16px" }}>
            {[
              { destaque: "3,9×", texto: "mais patrimônio acumulado em 15 anos com um consultor independente" },
              { destaque: "76%",  texto: "dos investidores com consultor relatam segurança e bem-estar em relação ao próprio futuro" },
              { destaque: "80%",  texto: "afirmam que o consultor foi fundamental para ajudá-los a acumular patrimônio" },
              { destaque: "1,7×", texto: "mais patrimônio já entre 4 e 6 anos de acompanhamento — o impacto começa cedo e cresce com o tempo" },
            ].map((item, i) => (
              <div key={i} style={{
                background: "white", border: "0.5px solid #E5E7EB",
                borderRadius: 10, padding: "14px 16px",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#1E40AF", lineHeight: 1, flexShrink: 0, minWidth: 48 }}>
                  {item.destaque}
                </div>
                <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.6 }}>
                  {item.texto}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderLeft: "3px solid #2563EB", paddingLeft: 14, marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.8, margin: 0, fontStyle: "italic", fontWeight: 500 }}>
              "Os números mostram que o acompanhamento profissional não é um custo — é o investimento com maior retorno comprovado. Cada ano sem um consultor é um ano em que a diferença cresce silenciosamente na direção errada."
            </p>
          </div>

          <p style={{ fontSize: 9, color: "#9CA3AF", margin: "8px 0 0", fontStyle: "italic" }}>
            Fonte: RBC Global Asset Management Inc. (2020). The Value of Advice Report.
          </p>
        </>
      ),
    },
    {
      chave: "passos",
      node: (
        <div>
          {PASSOS.map((passo) => (
            <div key={passo.numero} style={{
              display: "flex", gap: 16, padding: "16px 0",
              borderBottom: "0.5px solid #F3F4F6",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#EFF6FF", border: "2px solid #2563EB",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 16, fontWeight: 800, color: "#2563EB",
              }}>
                {passo.numero}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <i className={`ti ${passo.icone}`} style={{ fontSize: 14, color: "#2563EB" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{passo.titulo}</span>
                </div>
                <div style={{
                  fontSize: 12, color: "#6B7280", lineHeight: 1.6,
                  marginBottom: passo.numero === 2 ? 8 : 0,
                }}>
                  {passo.texto}
                </div>

                {passo.numero === 2 && (
                  <>
                    <input
                      type="date"
                      className="data-reuniao-edit"
                      value={dataReuniao}
                      onChange={e => setDataReuniao(e.target.value)}
                      style={{
                        border: "1px solid #BFDBFE", borderRadius: 6,
                        padding: "4px 10px", fontSize: 12, color: "#2563EB",
                        background: "#EFF6FF", outline: "none",
                      }}
                    />
                    <span
                      className="data-reuniao-print"
                      style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}
                    >
                      {dataReuniao
                        ? new Date(dataReuniao + "T12:00:00").toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "long", year: "numeric",
                          })
                        : "A definir"}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <PaginaDocFluidaDiag
      titulo="Próximos Passos"
      nomeCliente={nomeCliente}
      blocos={blocos}
    />
  );
}
