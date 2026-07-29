import { useState } from "react";
import { TEXTO_CORPO } from "@/lib/documentoStyles";
import { PaginaDoc } from "@/components/estrategia/documento/PaginaDoc";
import { HeaderSecao } from "@/components/estrategia/documento/HeaderSecao";
import { RodapePaginaDiag } from "./RodapePaginaDiag";

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

  return (
    <PaginaDoc rodape={<RodapePaginaDiag nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Próximos Passos" />

      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 10 }}>
        Este diagnóstico trouxe clareza sobre onde você está hoje — e clareza é o primeiro passo para a mudança. Mas o conhecimento sem ação não transforma nada. O que separa as pessoas que constroem o futuro que desejam das que apenas sonham com ele é exatamente este momento: a decisão de agir.
      </p>
      <p style={{ ...TEXTO_CORPO, fontSize: 13, marginBottom: 24 }}>
        Os próximos passos foram definidos para que a jornada comece de forma estruturada, segura e com o suporte necessário para que cada decisão seja tomada com clareza.
      </p>

      <div>
        {PASSOS.map((passo) => (
          <div key={passo.numero} style={{
            display: "flex", gap: 16, padding: "16px 0",
            borderBottom: "0.5px solid #F3F4F6",
          }}>
            {/* Número */}
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "#EFF6FF", border: "2px solid #2563EB",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 16, fontWeight: 800, color: "#2563EB",
            }}>
              {passo.numero}
            </div>

            {/* Conteúdo */}
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
    </PaginaDoc>
  );
}
