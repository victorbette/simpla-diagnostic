import { formatCurrency } from "@/lib/format";
import { calcularSucessorio } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import { calcularPerfilHolding } from "@/lib/holding";
import { DOC, TEXTO_CORPO, CARD, LABEL_CARD, VALOR_CARD, LABEL_SUBSECAO } from "@/lib/documentoStyles";
import { PAG, TOTAL_PAGINAS } from "@/lib/documentoPaginas";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";
import { CalloutConsultor } from "./CalloutConsultor";

interface Props {
  nomeCliente: string;
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
}

/** Linha de checklist: label à esquerda, status/valor alinhado à direita */
function LinhaCheck({ ok, label, direita, ultima = false }: { ok: boolean; label: string; direita?: string; ultima?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 2px",
        borderBottom: ultima ? "none" : `1px solid ${DOC.linhaSoft}`,
      }}
    >
      <span
        style={{
          width: 17,
          height: 17,
          borderRadius: "50%",
          background: ok ? DOC.verdeBg : DOC.vermelhoBg,
          color: ok ? DOC.verde : DOC.vermelho,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {ok ? "✓" : "✕"}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: DOC.ink, fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: ok ? DOC.texto : DOC.hint,
          whiteSpace: "nowrap",
        }}
      >
        {direita ?? (ok ? "Possui" : "Não possui")}
      </span>
    </div>
  );
}

export function DocProtecaoSucessorio({ nomeCliente, plan, resultados }: Props) {
  const pp = plan.protecao;
  const ps = plan.sucessorio;
  const resultadoSuc = calcularSucessorio(ps);
  const holdingPerfil = calcularPerfilHolding(
    { ...plan.dadosCliente, temEmpresa: plan.fiscal.temEmpresa },
    ps,
  );
  const holdingRecomendada = holdingPerfil.recomendada && !ps.possuiHolding;
  const seguro = resultados.seguro;

  return (
    <PaginaDoc
      rodape={<RodapePagina nomeCliente={nomeCliente} numPagina={PAG.ps} totalPaginas={TOTAL_PAGINAS} />}
    >
      <HeaderSecao titulo="Proteção e Sucessório" />

      <p style={{ ...TEXTO_CORPO, marginBottom: 18 }}>
        Analisamos a cobertura de proteção familiar e a estrutura sucessória de{" "}
        <strong>{nomeCliente.split(" ")[0]}</strong>, identificando pontos de atenção que merecem
        ação prioritária.
      </p>

      {/* ── PROTEÇÃO ── */}
      <p style={LABEL_SUBSECAO(DOC.vermelho)}>Proteção</p>

      {seguro && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <div className="doc-card" style={CARD}>
            <p style={LABEL_CARD}>Capital Necessário</p>
            <p style={VALOR_CARD}>{formatCurrency(seguro.totalNeed)}</p>
          </div>
          <div className="doc-card" style={CARD}>
            <p style={LABEL_CARD}>Capital Atual</p>
            <p style={{ ...VALOR_CARD, color: DOC.verde }}>{formatCurrency(seguro.totalCoverage)}</p>
          </div>
          <div className="doc-card" style={CARD}>
            <p style={LABEL_CARD}>Gap de Cobertura</p>
            <p style={{ ...VALOR_CARD, color: seguro.gap > 0 ? DOC.vermelho : DOC.verde }}>
              {formatCurrency(seguro.gap)}
            </p>
          </div>
        </div>
      )}

      {seguro && seguro.gap > 0 && (
        <div
          className="doc-card"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderLeft: `4px solid ${DOC.vermelho}`,
            borderRadius: 8,
            padding: "11px 16px",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 700, color: DOC.vermelho }}>
            Cobertura insuficiente identificada
          </p>
          <p style={{ ...TEXTO_CORPO, fontSize: 12, color: "#7F1D1D" }}>
            Recomendamos contratar seguro de vida adicional de{" "}
            <strong>{formatCurrency(seguro.gap)}</strong> para proteger a família em caso de
            sinistro.
          </p>
        </div>
      )}

      <div className="doc-card" style={{ ...CARD, padding: "6px 16px", marginBottom: 20 }}>
        <LinhaCheck
          ok={pp.possuiSeguroVida}
          label="Seguro de vida"
          direita={pp.possuiSeguroVida && pp.capitalSeguradoVida > 0 ? formatCurrency(pp.capitalSeguradoVida) : undefined}
        />
        <LinhaCheck
          ok={pp.possuiSeguroInvalidez}
          label="Seguro de invalidez"
          direita={pp.possuiSeguroInvalidez && pp.capitalSeguradoInvalidez > 0 ? formatCurrency(pp.capitalSeguradoInvalidez) : undefined}
        />
        <LinhaCheck ok={pp.possuiPlanoSaude} label="Plano de saúde" ultima />
      </div>

      {/* ── SUCESSÓRIO ── */}
      <p style={LABEL_SUBSECAO()}>Sucessório</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div className="doc-card" style={CARD}>
          <p style={LABEL_CARD}>ITCMD Estimado (4%)</p>
          <p style={{ ...VALOR_CARD, color: DOC.ambar }}>{formatCurrency(resultadoSuc.itcmdEstimado)}</p>
        </div>
        <div className="doc-card" style={CARD}>
          <p style={LABEL_CARD}>Custo Inventário (~6%)</p>
          <p style={{ ...VALOR_CARD, color: DOC.ambar }}>
            {formatCurrency(resultadoSuc.custoInventarioEstimado)}
          </p>
        </div>
      </div>

      {holdingRecomendada && (
        <div
          className="doc-card"
          style={{
            background: DOC.blueSoft,
            border: `1px solid ${DOC.blueBorder}`,
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: DOC.navy }}>
              Holding Patrimonial Recomendada
            </p>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: DOC.blue, whiteSpace: "nowrap" }}>
              Adequação: {holdingPerfil.score}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 4,
              background: "white",
              border: `1px solid ${DOC.blueBorder}`,
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: `${Math.min(100, holdingPerfil.score)}%`,
                height: "100%",
                background: DOC.blue,
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {holdingPerfil.motivos.slice(0, 3).map((m) => (
              <span key={m} style={{ fontSize: 11.5, color: DOC.navyInk }}>
                ✓ {m}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="doc-card" style={{ ...CARD, padding: "6px 16px" }}>
        <LinhaCheck ok={ps.possuiTestamento} label="Testamento" direita={ps.possuiTestamento ? "Elaborado" : "Não elaborado"} />
        <LinhaCheck ok={ps.possuiHolding} label="Holding familiar" direita={ps.possuiHolding ? "Constituída" : "Não constituída"} />
        <LinhaCheck ok={ps.doacoesVida} label="Doações em vida com usufruto" direita={ps.doacoesVida ? "Realizadas" : "Não realizadas"} />
        <LinhaCheck ok={ps.seguroComBeneficiario} label="Seguro com beneficiário definido" direita={ps.seguroComBeneficiario ? "Definido" : "Não definido"} ultima />
      </div>

      <CalloutConsultor clientId={plan.clientId} secao="ps" />
    </PaginaDoc>
  );
}
