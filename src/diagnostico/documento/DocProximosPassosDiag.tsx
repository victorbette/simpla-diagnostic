import { useState } from "react";
import { PaginaDocFluidaDiag, type BlocoDoc } from "./PaginaDocFluidaDiag";

interface Props { nomeCliente: string; }

export function DocProximosPassosDiag({ nomeCliente }: Props) {
  const [dataReuniao, setDataReuniao] = useState("");

  const blocos: BlocoDoc[] = [
    /* ── PÁGINA 1: estudo RBC + infográficos ──────────────── */
    {
      chave: "estudo",
      node: (
        <>
          {/* 1. Texto introdutório */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 16px", textAlign: "justify" as const }}>
            Este diagnóstico trouxe clareza sobre onde você está hoje — e clareza é o primeiro passo para a mudança. Mas o conhecimento sem ação não transforma nada. O que separa as pessoas que constroem o futuro que desejam das que apenas sonham com ele é exatamente este momento: a decisão de agir.
          </p>

          {/* 2. Estudo RBC */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 12px", textAlign: "justify" as const }}>
            Segundo estudo do Royal Bank of Canadá — uma das maiores instituições financeiras do mundo — investidores que tiveram um consultor independente por 15 anos tiveram, na média, um patrimônio quase quatro vezes maior do que os que não tinham um consultor.
          </p>

          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 16px", textAlign: "justify" as const }}>
            Esses números não são aspiracionais. São dados reais, medidos ao longo de décadas, com milhares de investidores. E eles revelam uma verdade que os melhores investidores já entenderam: a diferença entre construir patrimônio com consistência ou ficar para trás não está nos produtos escolhidos — está no acompanhamento, na estratégia e nas decisões tomadas no momento certo.
          </p>

          {/* 3A. Gráfico de barras — largura total */}
          <svg
            viewBox="0 0 520 210"
            style={{ width: "100%", height: "auto", margin: "0 0 22px", display: "block" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="pg1" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#F5DFA0" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#C8973A" strokeWidth="2.5" />
              </pattern>
              <pattern id="pn1" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#4B6CB7" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#1B3A8A" strokeWidth="2.5" />
              </pattern>
            </defs>

            {/* Título */}
            <text x="14" y="16" fontSize="9" fontWeight="700" fill="#111827" fontFamily="sans-serif">IMPACTO DO ACOMPANHAMENTO PROFISSIONAL</text>
            <text x="14" y="27" fontSize="8" fill="#6B7280" fontFamily="sans-serif">Patrimônio acumulado relativo · sem consultor = 1×</text>

            {/* Baseline y=175 */}
            <line x1="14" y1="175" x2="506" y2="175" stroke="#9CA3AF" strokeWidth="0.8" />

            {/* Escala: (175-38)/3.9 ≈ 35px por unidade */}
            {/* Grupo 1 — 4 a 6 anos (centro x=110) */}
            {/* gold x=62 navy x=114, barw=44 */}
            <rect x="62"  y="140" width="44" height="35" fill="url(#pg1)" stroke="#C8973A" strokeWidth="0.8" rx="1" />
            <text x="84"  y="134" fontSize="9" fontWeight="700" fill="#92671A" textAnchor="middle" fontFamily="sans-serif">1×</text>
            <rect x="114" y="115" width="44" height="60" fill="url(#pn1)" stroke="#1B3A8A" strokeWidth="0.8" rx="1" />
            <text x="136" y="109" fontSize="9" fontWeight="700" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">1,7×</text>
            <text x="110" y="190" fontSize="8" fill="#374151" textAnchor="middle" fontFamily="sans-serif">4 a 6 anos</text>

            {/* Grupo 2 — 7 a 14 anos (centro x=260) */}
            <rect x="212" y="140" width="44" height="35" fill="url(#pg1)" stroke="#C8973A" strokeWidth="0.8" rx="1" />
            <text x="234" y="134" fontSize="9" fontWeight="700" fill="#92671A" textAnchor="middle" fontFamily="sans-serif">1×</text>
            <rect x="264" y="80"  width="44" height="95" fill="url(#pn1)" stroke="#1B3A8A" strokeWidth="0.8" rx="1" />
            <text x="286" y="74"  fontSize="9" fontWeight="700" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">2,7×</text>
            <text x="260" y="190" fontSize="8" fill="#374151" textAnchor="middle" fontFamily="sans-serif">7 a 14 anos</text>

            {/* Grupo 3 — 15+ anos (centro x=410) */}
            <rect x="362" y="140" width="44" height="35" fill="url(#pg1)" stroke="#C8973A" strokeWidth="0.8" rx="1" />
            <text x="384" y="134" fontSize="9" fontWeight="700" fill="#92671A" textAnchor="middle" fontFamily="sans-serif">1×</text>
            <rect x="414" y="38"  width="44" height="137" fill="url(#pn1)" stroke="#1B3A8A" strokeWidth="0.8" rx="1" />
            <text x="436" y="32"  fontSize="9" fontWeight="700" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">3,9×</text>
            <text x="410" y="190" fontSize="8" fill="#374151" textAnchor="middle" fontFamily="sans-serif">15+ anos</text>

            {/* Legenda */}
            <rect x="14"  y="199" width="12" height="10" fill="url(#pg1)" stroke="#C8973A" strokeWidth="0.7" rx="1" />
            <text x="30"  y="208" fontSize="8" fill="#374151" fontFamily="sans-serif">Sem consultor</text>
            <rect x="130" y="199" width="12" height="10" fill="url(#pn1)" stroke="#1B3A8A" strokeWidth="0.7" rx="1" />
            <text x="146" y="208" fontSize="8" fill="#374151" fontFamily="sans-serif">Com consultor independente</text>
          </svg>

          {/* 3B. Gráfico ícones + estatísticas — largura total */}
          <svg
            viewBox="0 0 520 155"
            style={{ width: "100%", height: "auto", margin: "0 0 14px", display: "block" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ── SEÇÃO A: 76% ─────────────────────────── x 0–192 */}
            <text x="14" y="16" fontSize="9"  fontWeight="700" fill="#111827" fontFamily="sans-serif">SEGURANÇA E BEM-ESTAR</text>
            <text x="14" y="27" fontSize="8"  fill="#6B7280"  fontFamily="sans-serif">dos investidores com consultor</text>
            <text x="14" y="90" fontSize="46" fontWeight="900" fill="#1B3A8A" fontFamily="sans-serif">76%</text>
            <text x="14" y="108" fontSize="8" fill="#374151" fontFamily="sans-serif">relatam segurança e bem-estar</text>
            <text x="14" y="120" fontSize="8" fill="#374151" fontFamily="sans-serif">em relação ao próprio futuro</text>
            <text x="14" y="132" fontSize="8" fill="#374151" fontFamily="sans-serif">financeiro com o consultor</text>

            {/* Divisória A | painel unificado */}
            <line x1="196" y1="10" x2="196" y2="148" stroke="#E5E7EB" strokeWidth="0.8" />

            {/* ── SEÇÃO B+C: ícones + 80% — painel único ── x 204–520 */}
            <text x="210" y="16" fontSize="9"  fontWeight="700" fill="#111827" fontFamily="sans-serif">CONSULTOR FOI FUNDAMENTAL</text>
            <text x="210" y="27" fontSize="8"  fill="#6B7280"  fontFamily="sans-serif">para acumular patrimônio com consistência</text>

            {/* Ícones linha 1 — todos navy — cy_head=57 */}
            {[222, 254, 286, 318, 350].map((cx) => (
              <g key={`r1-${cx}`}>
                <circle cx={cx} cy={57} r={8} fill="none" stroke="#1B3A8A" strokeWidth="1.5" />
                <path d={`M${cx-11},83 Q${cx-11},70 ${cx},68 Q${cx+11},70 ${cx+11},83`}
                  fill="none" stroke="#1B3A8A" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            ))}

            {/* Ícones linha 2 — 3 navy + 2 gold — cy_head=102 */}
            {[
              { cx: 222, cor: "#1B3A8A" },
              { cx: 254, cor: "#1B3A8A" },
              { cx: 286, cor: "#1B3A8A" },
              { cx: 318, cor: "#C8973A" },
              { cx: 350, cor: "#C8973A" },
            ].map(({ cx, cor }) => (
              <g key={`r2-${cx}`}>
                <circle cx={cx} cy={102} r={8} fill="none" stroke={cor} strokeWidth="1.5" />
                <path d={`M${cx-11},128 Q${cx-11},115 ${cx},113 Q${cx+11},115 ${cx+11},128`}
                  fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" />
              </g>
            ))}

            {/* Legenda ícones */}
            <circle cx="215" cy="143" r="5" fill="none" stroke="#1B3A8A" strokeWidth="1.5" />
            <text x="223" y="147" fontSize="7.5" fill="#374151" fontFamily="sans-serif">Com consultor</text>
            <circle cx="305" cy="143" r="5" fill="none" stroke="#C8973A" strokeWidth="1.5" />
            <text x="313" y="147" fontSize="7.5" fill="#374151" fontFamily="sans-serif">Sem consultor</text>

            {/* "80%" — mesmo painel, à direita dos ícones, sem linha divisória */}
            <text x="455" y="88" fontSize="46" fontWeight="900" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">80%</text>
            <text x="455" y="107" fontSize="8" fill="#374151" textAnchor="middle" fontFamily="sans-serif">afirmam que o</text>
            <text x="455" y="119" fontSize="8" fill="#374151" textAnchor="middle" fontFamily="sans-serif">consultor foi</text>
            <text x="455" y="131" fontSize="8" fontWeight="600" fill="#1B3A8A" textAnchor="middle" fontFamily="sans-serif">fundamental</text>
          </svg>

          {/* 4. Citação */}
          <div style={{ borderLeft: "3px solid #2563EB", paddingLeft: 14, marginBottom: 6 }}>
            <p style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.8, margin: 0, fontStyle: "italic", fontWeight: 500 }}>
              "Os números mostram que o acompanhamento profissional não é um custo — é o investimento com maior retorno comprovado. Cada ano sem um consultor é um ano em que a diferença cresce silenciosamente na direção errada."
            </p>
          </div>

          {/* 5. Referência */}
          <p style={{ fontSize: 9, color: "#9CA3AF", margin: "0 0 4px", fontStyle: "italic" }}>
            Fonte: RBC Global Asset Management Inc. (2020). The Value of Advice Report.
          </p>
        </>
      ),
    },

    /* ── PÁGINA 2: próximos passos ────────────────────────── */
    {
      chave: "passos",
      node: (
        <>
          {/* Texto de transição */}
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.95, margin: "0 0 20px", textAlign: "justify" as const }}>
            Os próximos passos foram definidos para que a jornada comece de forma estruturada, segura e com o suporte necessário para que cada decisão seja tomada com clareza.
          </p>

          {/* Os 4 passos numerados */}
          {[
            {
              num: 1,
              titulo: "Assinatura do Contrato",
              texto: "Formalizar o início do acompanhamento com a assinatura do contrato de consultoria de investimentos.",
              temData: false,
            },
            {
              num: 2,
              titulo: "Reunião Inicial",
              texto: "Reunião para estruturação e definição do plano financeiro completo.",
              temData: true,
            },
            {
              num: 3,
              titulo: "Envio de Informações Complementares",
              texto: "Envio dos extratos de previdência privada, apólices de seguro, carteira de investimentos para análise completa do planejamento.",
              temData: false,
            },
            {
              num: 4,
              titulo: "Habilitar Conta na Corretora Parceira",
              texto: "Abertura ou portabilidade da conta em uma das corretoras parceiras.",
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
                      style={{ fontSize: 11, color: "#2563EB", fontWeight: 600, marginTop: 6, display: "block" }}
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
