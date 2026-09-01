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

          {/* 2. Estudo RBC — texto */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 12px", textAlign: "justify" as const }}>
            Segundo estudo do Royal Bank of Canadá — uma das maiores instituições financeiras do mundo — investidores que tiveram um consultor independente por 15 anos tiveram, na média, um patrimônio quase quatro vezes maior do que os que não tinham um consultor.
          </p>

          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 16px", textAlign: "justify" as const }}>
            Esses números não são aspiracionais. São dados reais, medidos ao longo de décadas, com milhares de investidores. E eles revelam uma verdade que os melhores investidores já entenderam: a diferença entre construir patrimônio com consistência ou ficar para trás não está nos produtos escolhidos — está no acompanhamento, na estratégia e nas decisões tomadas no momento certo.
          </p>

          {/* 3. Infográfico RBC — barras + ícones */}
          <svg
            viewBox="0 0 540 230"
            style={{ width: "100%", height: "auto", margin: "0 0 10px", display: "block" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Hachura ouro — sem consultor */}
              <pattern id="pGold" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#F5DFA0" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#C8973A" strokeWidth="2.5" />
              </pattern>
              {/* Hachura azul-escuro — com consultor */}
              <pattern id="pNavy" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#4B6CB7" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#1B3A8A" strokeWidth="2.5" />
              </pattern>
            </defs>

            {/* ── PAINEL ESQUERDO: barras ────────────────────────── */}
            {/* Título */}
            <text x="14" y="17" fontSize="8.5" fontWeight="700" fill="#111827" fontFamily="sans-serif">IMPACTO DO ACOMPANHAMENTO PROFISSIONAL</text>
            <text x="14" y="28" fontSize="8" fill="#6B7280" fontFamily="sans-serif">Patrimônio acumulado relativo (sem consultor = 1×)</text>

            {/* Baseline */}
            <line x1="14" y1="188" x2="272" y2="188" stroke="#9CA3AF" strokeWidth="0.8" />

            {/* Grupo 1 — 4 a 6 anos */}
            {/* Gold bar 1× */}
            <rect x="28" y="152" width="26" height="36" fill="url(#pGold)" stroke="#C8973A" strokeWidth="0.8" rx="1" />
            <text x="41" y="148" fontSize="8" fontWeight="700" fill="#92671A" textAnchor="middle" fontFamily="sans-serif">1×</text>
            {/* Navy bar 1.7× */}
            <rect x="58" y="125" width="26" height="63" fill="url(#pNavy)" stroke="#1B3A8A" strokeWidth="0.8" rx="1" />
            <text x="71" y="121" fontSize="8" fontWeight="700" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">1,7×</text>
            {/* Label eixo x */}
            <text x="57" y="200" fontSize="7.5" fill="#374151" textAnchor="middle" fontFamily="sans-serif">4 a 6 anos</text>

            {/* Grupo 2 — 7 a 14 anos */}
            <rect x="118" y="152" width="26" height="36" fill="url(#pGold)" stroke="#C8973A" strokeWidth="0.8" rx="1" />
            <text x="131" y="148" fontSize="8" fontWeight="700" fill="#92671A" textAnchor="middle" fontFamily="sans-serif">1×</text>
            <rect x="148" y="86" width="26" height="102" fill="url(#pNavy)" stroke="#1B3A8A" strokeWidth="0.8" rx="1" />
            <text x="161" y="82" fontSize="8" fontWeight="700" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">2,7×</text>
            <text x="147" y="200" fontSize="7.5" fill="#374151" textAnchor="middle" fontFamily="sans-serif">7 a 14 anos</text>

            {/* Grupo 3 — 15+ anos */}
            <rect x="208" y="152" width="26" height="36" fill="url(#pGold)" stroke="#C8973A" strokeWidth="0.8" rx="1" />
            <text x="221" y="148" fontSize="8" fontWeight="700" fill="#92671A" textAnchor="middle" fontFamily="sans-serif">1×</text>
            <rect x="238" y="46" width="26" height="142" fill="url(#pNavy)" stroke="#1B3A8A" strokeWidth="0.8" rx="1" />
            <text x="251" y="42" fontSize="8" fontWeight="700" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">3,9×</text>
            <text x="237" y="200" fontSize="7.5" fill="#374151" textAnchor="middle" fontFamily="sans-serif">15+ anos</text>

            {/* Legenda barras */}
            <rect x="14" y="210" width="10" height="10" fill="url(#pGold)" stroke="#C8973A" strokeWidth="0.7" rx="1" />
            <text x="27" y="219" fontSize="7.5" fill="#374151" fontFamily="sans-serif">Sem consultor</text>
            <rect x="100" y="210" width="10" height="10" fill="url(#pNavy)" stroke="#1B3A8A" strokeWidth="0.7" rx="1" />
            <text x="113" y="219" fontSize="7.5" fill="#374151" fontFamily="sans-serif">Com consultor independente</text>

            {/* ── DIVISÓRIA ─────────────────────────────────────── */}
            <line x1="280" y1="12" x2="280" y2="225" stroke="#E5E7EB" strokeWidth="0.8" />

            {/* ── PAINEL DIREITO: ícones de pessoas ─────────────── */}
            <text x="294" y="17" fontSize="8.5" fontWeight="700" fill="#111827" fontFamily="sans-serif">PERCEPÇÃO DOS INVESTIDORES</text>
            <text x="294" y="28" fontSize="8" fill="#6B7280" fontFamily="sans-serif">Com consultor independente</text>

            {/* Ícones — linha 1 (todos navy) cy_head=68 */}
            {[306, 332, 358, 384, 410].map((cx) => (
              <g key={`r1-${cx}`}>
                <circle cx={cx} cy={68} r={7} fill="none" stroke="#1B3A8A" strokeWidth="1.5" />
                <path
                  d={`M${cx - 10},95 Q${cx - 10},82 ${cx},80 Q${cx + 10},82 ${cx + 10},95`}
                  fill="none" stroke="#1B3A8A" strokeWidth="1.5" strokeLinecap="round"
                />
              </g>
            ))}

            {/* Ícones — linha 2: 3 navy + 2 gold cy_head=112 */}
            {[
              { cx: 306, color: "#1B3A8A" },
              { cx: 332, color: "#1B3A8A" },
              { cx: 358, color: "#1B3A8A" },
              { cx: 384, color: "#C8973A" },
              { cx: 410, color: "#C8973A" },
            ].map(({ cx, color }) => (
              <g key={`r2-${cx}`}>
                <circle cx={cx} cy={112} r={7} fill="none" stroke={color} strokeWidth="1.5" />
                <path
                  d={`M${cx - 10},139 Q${cx - 10},126 ${cx},124 Q${cx + 10},126 ${cx + 10},139`}
                  fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
                />
              </g>
            ))}

            {/* Stat grande */}
            <text x="432" y="105" fontSize="38" fontWeight="900" fill="#1B3A8A" fontFamily="sans-serif" textAnchor="start">80%</text>

            {/* Descrição direita */}
            <text x="294" y="155" fontSize="8" fill="#374151" fontFamily="sans-serif">afirmam que o consultor foi</text>
            <text x="294" y="166" fontSize="8" fill="#374151" fontFamily="sans-serif">fundamental para acumular</text>
            <text x="294" y="177" fontSize="8" fontWeight="600" fill="#1B3A8A" fontFamily="sans-serif">patrimônio com consistência.</text>

            {/* Nota 76% */}
            <text x="294" y="198" fontSize="7.5" fill="#6B7280" fontFamily="sans-serif">76% relatam segurança e bem-estar</text>
            <text x="294" y="208" fontSize="7.5" fill="#6B7280" fontFamily="sans-serif">em relação ao próprio futuro.</text>
          </svg>

          {/* 4. Citação */}
          <div style={{ borderLeft: "3px solid #2563EB", paddingLeft: 14, marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.8, margin: 0, fontStyle: "italic", fontWeight: 500 }}>
              "Os números mostram que o acompanhamento profissional não é um custo — é o investimento com maior retorno comprovado. Cada ano sem um consultor é um ano em que a diferença cresce silenciosamente na direção errada."
            </p>
          </div>

          {/* 5. Referência */}
          <p style={{ fontSize: 9, color: "#9CA3AF", margin: "0 0 20px", fontStyle: "italic" }}>
            Fonte: RBC Global Asset Management Inc. (2020). The Value of Advice Report.
          </p>

          {/* 6. Texto de transição */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 20px", textAlign: "justify" as const }}>
            Os próximos passos foram definidos para que a jornada comece de forma estruturada, segura e com o suporte necessário para que cada decisão seja tomada com clareza.
          </p>

          {/* 7. Os 4 passos numerados */}
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
