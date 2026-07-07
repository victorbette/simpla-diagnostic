import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan, PerfilRisco } from "@/types/financialPlanning";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, VALOR_CARD } from "@/lib/documentoStyles";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
}

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União Estável",
};

const PERFIL_DESCRICOES: Record<PerfilRisco, string> = {
  conservador:
    "Prioriza segurança e preservação do capital, aceitando retornos menores em troca de baixa volatilidade.",
  conservador_moderado:
    "Busca preservação do capital com algum crescimento, tolerando pequenas oscilações no curto prazo.",
  moderado:
    "Busca equilíbrio entre crescimento e segurança. Aceita volatilidade moderada em troca de retornos superiores no longo prazo.",
  arrojado:
    "Prioriza o crescimento do patrimônio no longo prazo, tolerando volatilidade elevada no curto prazo.",
};

const PERFIL_NIVEL: Record<PerfilRisco, number> = {
  conservador: 1,
  conservador_moderado: 2,
  moderado: 3,
  arrojado: 4,
};

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p style={LABEL_CARD}>{label}</p>
      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: DOC.ink }}>{valor}</p>
    </div>
  );
}

function TituloCard({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: DOC.ink }}>{children}</p>
  );
}

export function DocPerfilInvestidor({ nomeCliente, plan }: Props) {
  const dc = plan.dadosCliente;
  const idade = calcularIdade(dc.dataNascimento);
  const perfil = dc.suitabilityPerfil;

  const dependentes =
    dc.filhos && dc.filhos.length > 0
      ? dc.filhos.map((f) => `${f.nome} (${f.idade})`).join(" e ")
      : dc.temFilhos && dc.numeroFilhos > 0
      ? `${dc.numeroFilhos} filho(s)`
      : null;

  const capacidadePoupanca =
    dc.rendaMensal > 0 && dc.aportesMensalMedio > 0
      ? `${((dc.aportesMensalMedio / dc.rendaMensal) * 100).toFixed(1).replace(".", ",")}%`
      : null;

  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.perfil} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Perfil do Investidor" />

      {/* Dados pessoais + Perfil de risco */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="doc-card" style={{ ...CARD, padding: "18px 20px" }}>
          <TituloCard>Dados Pessoais</TituloCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <Campo label="Nome Completo" valor={nomeCliente} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
              {idade !== null && <Campo label="Idade" valor={`${idade} anos`} />}
              {dc.estadoCivil && (
                <Campo label="Estado Civil" valor={ESTADO_CIVIL_LABELS[dc.estadoCivil] ?? dc.estadoCivil} />
              )}
            </div>
            {dependentes && <Campo label="Dependentes" valor={dependentes} />}
            {dc.profissao && <Campo label="Profissão" valor={dc.profissao} />}
          </div>
        </div>

        <div className="doc-card" style={{ ...CARD, padding: "18px 20px" }}>
          <TituloCard>Perfil de Risco</TituloCard>
          {perfil ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  borderRadius: 8,
                  background: DOC.blueSoft,
                  color: DOC.blue,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                {PERFIL_LABELS[perfil]}
              </span>
              <p style={{ ...TEXTO_CORPO, fontSize: 12, marginBottom: 16 }}>
                {PERFIL_DESCRICOES[perfil]}
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    style={{
                      flex: 1,
                      height: 7,
                      borderRadius: 4,
                      background: n <= PERFIL_NIVEL[perfil] ? DOC.blue : DOC.linha,
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <p style={{ ...TEXTO_CORPO, fontStyle: "italic", color: DOC.muted }}>
              Perfil de risco ainda não avaliado — recomendamos responder o questionário de
              suitability.
            </p>
          )}
        </div>
      </div>

      {/* Situação financeira atual */}
      <div className="doc-card" style={{ ...CARD, padding: "18px 20px", marginBottom: 16 }}>
        <TituloCard>Situação Financeira Atual</TituloCard>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <div>
            <p style={LABEL_CARD}>Renda Mensal</p>
            <p style={VALOR_CARD}>{formatCurrency(dc.rendaMensal)}</p>
          </div>
          <div>
            <p style={LABEL_CARD}>Custo de Vida</p>
            <p style={VALOR_CARD}>{formatCurrency(dc.custoDeVidaMensal)}</p>
          </div>
          <div>
            <p style={LABEL_CARD}>Aporte Mensal</p>
            <p style={VALOR_CARD}>{formatCurrency(dc.aportesMensalMedio)}</p>
          </div>
          {capacidadePoupanca && (
            <div>
              <p style={LABEL_CARD}>Capacidade Poupança</p>
              <p style={{ ...VALOR_CARD, color: DOC.verde }}>{capacidadePoupanca}</p>
            </div>
          )}
        </div>
      </div>

      {/* Patrimônio */}
      <div className="doc-card" style={{ ...CARD, padding: "18px 20px" }}>
        <TituloCard>Patrimônio</TituloCard>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div>
            <p style={LABEL_CARD}>Patrimônio Financeiro</p>
            <p style={VALOR_CARD}>{formatCurrency(dc.patrimonioFinanceiroEstimado)}</p>
          </div>
          <div>
            <p style={LABEL_CARD}>Patrimônio Total</p>
            <p style={VALOR_CARD}>{formatCurrency(dc.patrimonioTotalEstimado)}</p>
          </div>
          {dc.possuiImoveis && dc.quantidadeImoveis > 0 && (
            <div>
              <p style={LABEL_CARD}>Imóveis</p>
              <p style={VALOR_CARD}>
                {dc.quantidadeImoveis} {dc.quantidadeImoveis === 1 ? "imóvel" : "imóveis"}
              </p>
            </div>
          )}
        </div>
      </div>

      <CalloutConsultor clientId={plan.clientId} secao="perfil" />
    </PaginaDoc>
  );
}
