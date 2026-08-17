import { useState } from "react";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { nomeCliente: string; }

export function DocProximosPassosDiag({ nomeCliente }: Props) {
  const [dataReuniao, setDataReuniao] = useState("");

  const blocos: BlocoDoc[] = [
    {
      chave: "tudo",
      node: (
        <>
          {/* 1. Texto introdutório */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 16px", textAlign: "justify" as const }}>
            Este diagnóstico trouxe clareza sobre onde você está hoje — e clareza é o primeiro passo para a mudança. Mas o conhecimento sem ação não transforma nada. O que separa as pessoas que constroem o futuro que desejam das que apenas sonham com ele é exatamente este momento: a decisão de agir.
          </p>

          {/* 2. Texto de transição */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 20px", textAlign: "justify" as const }}>
            Os próximos passos foram definidos para que a jornada comece de forma estruturada, segura e com o suporte necessário para que cada decisão seja tomada com clareza.
          </p>

          {/* 3. Os 4 passos numerados */}
          {[
            {
              num: 1,
              titulo: "Assinatura do Contrato",
              texto: "Formalizar o início do acompanhamento com a assinatura do contrato de consultoria de investimentos.",
              icone: "ti-file-check",
              temData: false,
            },
            {
              num: 2,
              titulo: "Reunião Inicial",
              texto: "Reunião para estruturação e definição do plano financeiro completo.",
              icone: "ti-calendar",
              temData: true,
            },
            {
              num: 3,
              titulo: "Envio de Informações Complementares",
              texto: "Envio dos extratos de previdência privada, apólices de seguro, carteira de investimentos para análise completa do planejamento.",
              icone: "ti-file-upload",
              temData: false,
            },
            {
              num: 4,
              titulo: "Habilitar Conta na Corretora Parceira",
              texto: "Abertura ou portabilidade da conta em uma das corretoras parceiras.",
              icone: "ti-building-bank",
              temData: false,
            },
          ].map(passo => (
            <div key={passo.num} style={{
              display: "flex", gap: 16,
              padding: "14px 0",
              borderBottom: "0.5px solid #F3F4F6",
              alignItems: "flex-start",
            }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: "#EFF6FF",
                border: "2px solid #2563EB",
                display: "flex", alignItems: "center",
                justifyContent: "center",
                fontSize: 14, fontWeight: 800,
                color: "#2563EB", flexShrink: 0,
              }}>
                {passo.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                  {passo.titulo}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
                  {passo.texto}
                </div>
                {passo.temData && (
                  <>
                    <input
                      type="text"
                      className="data-reuniao-edit"
                      value={dataReuniao}
                      onChange={e => setDataReuniao(e.target.value)}
                      placeholder="Data a definir"
                      style={{
                        marginTop: 8,
                        border: "1px solid #BFDBFE",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        color: "#2563EB",
                        background: "#EFF6FF",
                        outline: "none",
                      }}
                    />
                    <span
                      className="data-reuniao-print"
                      style={{ fontSize: 11, color: "#2563EB", fontWeight: 600, marginTop: 6 }}
                    >
                      {dataReuniao || "A definir"}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </>
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
