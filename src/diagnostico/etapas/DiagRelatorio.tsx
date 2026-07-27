import { useMemo } from "react";
import type { Lead } from "../types";
import {
  initialFinancialPlan,
  initialAtivoAtual,
  type FinancialPlan,
  type PerfilRisco,
} from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import {
  CONFIG_CONSULTOR_DEFAULT,
  type ConfigConsultor,
} from "@/lib/documentoConfig";
import { gerarPDF } from "@/lib/gerarPDF";
import { DocCapa } from "@/components/estrategia/documento/DocCapa";
import { DocSumario } from "@/components/estrategia/documento/DocSumario";
import { DocLiberdadeFinanceira } from "@/components/estrategia/documento/DocLiberdadeFinanceira";
import { DocAssetAllocation } from "@/components/estrategia/documento/DocAssetAllocation";
import { DocAlocacaoAtualProposta } from "@/components/estrategia/documento/DocAlocacaoAtualProposta";
import { DocMovimentacoes } from "@/components/estrategia/documento/DocMovimentacoes";
import { DocProtecaoSucessao } from "@/components/estrategia/documento/DocProtecaoSucessao";
import { DocPlanejamentoTributario } from "@/components/estrategia/documento/DocPlanejamentoTributario";
import { DocPlanoAcao } from "@/components/estrategia/documento/DocPlanoAcao";
import { DocMaosAObra } from "@/components/estrategia/documento/DocMaosAObra";
import { DocDisclaimer } from "@/components/estrategia/documento/DocDisclaimer";
import { DivisoriaSecao } from "@/components/estrategia/documento/DivisoriaSecao";

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const PERFIS_VALIDOS: PerfilRisco[] = [
  "conservador", "conservador_moderado", "moderado", "arrojado",
];

const CAPITULOS = [
  "Liberdade Financeira",
  "Gestão de Ativos",
  "Proteção e Sucessão",
  "Planejamento Tributário",
  "Plano de Ação",
];

const RESULTADOS_VAZIOS: ResultadosEstrategia = {
  carteira: null,
  if: null,
  seguro: null,
  fiscal: null,
};

interface Props {
  lead: Lead;
}

export function DiagRelatorio({ lead }: Props) {
  const plan = useMemo((): FinancialPlan => {
    const base = initialFinancialPlan(lead.id);
    const c = lead.dadosColeta;
    const lf = lead.dadosLF;

    return {
      ...base,
      dadosCliente: {
        ...base.dadosCliente,
        dataNascimento: c.dataNascimento ?? "",
        profissao: c.profissao ?? "",
        gastoCartaoMensal: c.gastoCartaoMensal ?? 0,
        rendaMensal: c.rendaMensal ?? 0,
        custoDeVidaMensal: c.custoVidaMensal ?? 0,
        aportesMensalMedio: c.aporteMensal ?? 0,
        patrimonioFinanceiroEstimado: c.patrimonioFinanceiro ?? 0,
        temFilhos: (c.filhos?.length ?? 0) > 0,
        numeroFilhos: c.filhos?.length ?? 0,
        filhos: c.filhos ?? [],
        contribuiINSS: c.contribuiINSS ?? false,
        valorINSS: c.valorINSS ?? 0,
        comecandoDoZero: c.comecandoDoZero ?? false,
        rendaDesejadaAposentadoria: c.rendaDesejadaAposentadoria ?? 0,
        temSeguroVida: c.possuiSeguro ?? false,
        valorApoliceVida: c.valorApolice ?? 0,
        suitabilityPerfil: c.suitabilityPerfil && PERFIS_VALIDOS.includes(c.suitabilityPerfil as PerfilRisco)
          ? (c.suitabilityPerfil as PerfilRisco)
          : null,
      },
      ativosAtuais: c.ativosAtuais ?? { ...initialAtivoAtual },
      planejamentoIF: {
        ...base.planejamentoIF,
        patrimonioAtual: c.patrimonioFinanceiro ?? lf.patrimonioInicial ?? 0,
        aporteMensal: c.aporteMensal ?? lf.aporteMensal ?? 0,
        idadeMeta: c.idadeMeta ?? lf.idadeAlvo ?? 60,
        rendaMensalDesejada: c.rendaDesejadaAposentadoria ?? lf.rendaDesejada ?? 0,
      },
    };
  }, [lead]);

  const config: ConfigConsultor = useMemo(() => {
    try {
      const salvo = localStorage.getItem("config_consultor");
      return salvo ? (JSON.parse(salvo) as ConfigConsultor) : CONFIG_CONSULTOR_DEFAULT;
    } catch {
      return CONFIG_CONSULTOR_DEFAULT;
    }
  }, []);

  const agora = new Date();
  const mes = MESES_PT[agora.getMonth()];
  const dataCapa = `${mes[0].toUpperCase()}${mes.slice(1)} / ${agora.getFullYear()}`;
  const nomeConsultorCapa = config.nomeCompleto.replace(/\s*\(.*\)\s*$/, "");

  return (
    <div style={{ background: "#EFF6FF", minHeight: "100vh" }}>
      <div
        className="no-print"
        style={{
          background: "white",
          borderBottom: "1px solid #BFDBFE",
          padding: "10px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-file-text" style={{ color: "#2563EB", fontSize: 18 }} aria-hidden="true" />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            Diagnóstico Financeiro
          </span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>· {lead.nome}</span>
        </div>
        <button
          onClick={() => gerarPDF(lead.nome)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1E3A8A", color: "white", border: "none",
            borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="doc-pages-wrap" style={{ padding: "32px 16px" }}>
        <DocCapa
          nomeCliente={lead.nome}
          dataEstrategia={dataCapa}
          nomeConsultor={nomeConsultorCapa}
          titulo="Diagnóstico Financeiro"
        />

        <DocSumario nomeCliente={lead.nome} capitulos={CAPITULOS} />

        <DivisoriaSecao titulo="Liberdade Financeira" nomeCliente={lead.nome} />
        <DocLiberdadeFinanceira nomeCliente={lead.nome} plan={plan} resultados={RESULTADOS_VAZIOS} />

        <DivisoriaSecao titulo="Gestão de Ativos" nomeCliente={lead.nome} />
        <DocAssetAllocation nomeCliente={lead.nome} plan={plan} resultados={RESULTADOS_VAZIOS} />
        <DocAlocacaoAtualProposta nomeCliente={lead.nome} plan={plan} resultados={RESULTADOS_VAZIOS} />
        <DocMovimentacoes nomeCliente={lead.nome} plan={plan} resultados={RESULTADOS_VAZIOS} />

        <DivisoriaSecao titulo="Proteção e Sucessão" nomeCliente={lead.nome} />
        <DocProtecaoSucessao nomeCliente={lead.nome} plan={plan} resultados={RESULTADOS_VAZIOS} />

        <DivisoriaSecao titulo="Planejamento Tributário" nomeCliente={lead.nome} />
        <DocPlanejamentoTributario nomeCliente={lead.nome} plan={plan} resultados={RESULTADOS_VAZIOS} />

        <DivisoriaSecao titulo="Plano de Ação" nomeCliente={lead.nome} />
        <DocPlanoAcao
          nomeCliente={lead.nome}
          plan={plan}
          resultados={RESULTADOS_VAZIOS}
          onResultadosChange={() => { /* passos não persistidos no diagnóstico */ }}
        />

        <DocMaosAObra nomeCliente={lead.nome} config={config} />
        <DocDisclaimer nomeCliente={lead.nome} config={config} />
      </div>
    </div>
  );
}
