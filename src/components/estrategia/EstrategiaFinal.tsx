import { useState, useCallback, useEffect } from "react";
import type { FinancialPlan } from "@/types/financialPlanning";
import type { ResultadosEstrategia } from "@/types/estrategiaResultados";
import {
  CONFIG_CONSULTOR_DEFAULT,
  AREAS_DOCUMENTO,
  carregarSelecaoSecoes,
  salvarSelecaoSecoes,
} from "@/lib/documentoConfig";
import type { ConfigConsultor, SelecaoSecoes } from "@/lib/documentoConfig";
import { gerarPDF } from "@/lib/gerarPDF";
import { ModalSecoesPdf } from "./documento/ModalSecoesPdf";
import { DocCapa } from "./documento/DocCapa";
import { DocSumario } from "./documento/DocSumario";
import { DocFinancialPlanning } from "./documento/DocFinancialPlanning";
import { DocPontoDePartida } from "./documento/DocPontoDePartida";
import { DivisoriaSecao } from "./documento/DivisoriaSecao";
import { DocLiberdadeFinanceira } from "./documento/DocLiberdadeFinanceira";
import { DocAssetAllocation } from "./documento/DocAssetAllocation";
import { DocAlocacaoAtualProposta } from "./documento/DocAlocacaoAtualProposta";
import { DocMovimentacoes } from "./documento/DocMovimentacoes";
import { DocProtecaoSucessao } from "./documento/DocProtecaoSucessao";
import { DocPlanejamentoTributario } from "./documento/DocPlanejamentoTributario";
import { DocPlanoAcao } from "./documento/DocPlanoAcao";
import { DocMaosAObra } from "./documento/DocMaosAObra";
import { DocDisclaimer } from "./documento/DocDisclaimer";
import { DocContracapa } from "./documento/DocContracapa";

interface Props {
  plan: FinancialPlan;
  resultados: ResultadosEstrategia;
  clientName: string;
  onFechar?: () => void;
  onResultadosChange?: (r: ResultadosEstrategia) => void;
  onConcluir?: () => Promise<void>;
}

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Data da capa no formato "Junho / 2026". Aceita a dataGeracao persistida
 *  em pt-BR longo ("16 de julho de 2026"); fallback: data atual. */
function dataCapaMesAno(dataGeracao?: string): string {
  if (dataGeracao) {
    const m = dataGeracao.toLowerCase().match(/de\s+([a-zç]+)\s+de\s+(\d{4})/);
    if (m && MESES_PT.includes(m[1])) {
      return `${m[1][0].toUpperCase()}${m[1].slice(1)} / ${m[2]}`;
    }
  }
  const agora = new Date();
  const mes = MESES_PT[agora.getMonth()];
  return `${mes[0].toUpperCase()}${mes.slice(1)} / ${agora.getFullYear()}`;
}

export function EstrategiaFinal({ plan, resultados, clientName, onResultadosChange, onConcluir }: Props) {
  // Config do consultor — persistida em localStorage
  const [salvando, setSalvando] = useState(false);

  // Seções que entram no PDF — escolhidas no modal, persistidas por cliente
  const [modalSecoesAberto, setModalSecoesAberto] = useState(false);
  const [secoes, setSecoes] = useState<SelecaoSecoes>(() => carregarSelecaoSecoes(plan.clientId));

  const [config, setConfig] = useState<ConfigConsultor>(() => {
    try {
      const salvo = localStorage.getItem("config_consultor");
      return salvo ? (JSON.parse(salvo) as ConfigConsultor) : CONFIG_CONSULTOR_DEFAULT;
    } catch {
      return CONFIG_CONSULTOR_DEFAULT;
    }
  });

  useEffect(() => {
    try { localStorage.setItem("config_consultor", JSON.stringify(config)); } catch { /**/ }
  }, [config]);

  const handleGerarPdf = async (selecao: SelecaoSecoes) => {
    setSecoes(selecao);
    salvarSelecaoSecoes(plan.clientId, selecao);
    setSalvando(true);
    try {
      await onConcluir?.();
    } finally {
      setSalvando(false);
    }
    setModalSecoesAberto(false);
    // Aguarda o React aplicar a seleção ao documento antes do print síncrono
    setTimeout(() => gerarPDF(clientName), 150);
  };

  const capitulosSumario = AREAS_DOCUMENTO.filter((a) => secoes[a.id]).map((a) => a.label);

  const dataCapa = dataCapaMesAno(resultados.estrategiaFinal?.dataGeracao);

  // Nome curto do consultor para a capa (sem credenciais entre parênteses)
  const nomeConsultorCapa = config.nomeCompleto.replace(/\s*\(.*\)\s*$/, "");

  const handleResultadosChange = useCallback(
    (r: ResultadosEstrategia) => { onResultadosChange?.(r); },
    [onResultadosChange],
  );

  return (
    <div
      className="estrategia-final-root"
      style={{ width: "100%", height: "100%", overflowY: "auto", background: "#EFF6FF" }}
    >
      {/* Barra de ação — não imprime */}
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
            Financial Planning
          </span>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>· {clientName}</span>
        </div>

        <button
          onClick={() => setModalSecoesAberto(true)}
          disabled={salvando}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#1E3A8A",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: salvando ? 0.85 : 1,
          }}
        >
          {salvando ? (
            <>
              <i className="ti ti-loader-2" style={{ fontSize: 15, animation: "spin 1s linear infinite" }} aria-hidden="true" />
              Salvando...
            </>
          ) : (
            <>
              <i className="ti ti-printer" style={{ fontSize: 15 }} aria-hidden="true" />
              Imprimir / Salvar PDF
            </>
          )}
        </button>
      </div>

      {/* Documento — ordem da referência v4; seções conforme seleção do modal */}
      <div className="doc-pages-wrap" style={{ padding: "32px 16px" }}>
        <DocCapa
          nomeCliente={clientName}
          dataEstrategia={dataCapa}
          nomeConsultor={nomeConsultorCapa}
        />

        <DocSumario nomeCliente={clientName} capitulos={capitulosSumario} />

        <DocFinancialPlanning nomeCliente={clientName} />

        {secoes.ponto_partida && (
          <>
            <DivisoriaSecao titulo="Ponto de Partida" nomeCliente={clientName} />
            <DocPontoDePartida nomeCliente={clientName} plan={plan} resultados={resultados} />
          </>
        )}

        {secoes.liberdade_financeira && (
          <>
            <DivisoriaSecao titulo="Liberdade Financeira" nomeCliente={clientName} />
            <DocLiberdadeFinanceira nomeCliente={clientName} plan={plan} resultados={resultados} />
          </>
        )}

        {secoes.asset_allocation && (
          <>
            <DivisoriaSecao titulo="Asset Allocation" nomeCliente={clientName} />
            <DocAssetAllocation nomeCliente={clientName} plan={plan} resultados={resultados} />
            <DocAlocacaoAtualProposta nomeCliente={clientName} plan={plan} resultados={resultados} />
            <DocMovimentacoes nomeCliente={clientName} plan={plan} resultados={resultados} />
          </>
        )}

        {secoes.protecao_sucessao && (
          <>
            <DivisoriaSecao titulo="Proteção e Sucessão" nomeCliente={clientName} />
            <DocProtecaoSucessao nomeCliente={clientName} plan={plan} resultados={resultados} />
          </>
        )}

        {secoes.planejamento_tributario && (
          <>
            <DivisoriaSecao titulo="Planejamento Tributário" nomeCliente={clientName} />
            <DocPlanejamentoTributario nomeCliente={clientName} plan={plan} resultados={resultados} />
          </>
        )}

        {secoes.plano_acao && (
          <>
            <DivisoriaSecao titulo="Plano de Ação" nomeCliente={clientName} />
            <DocPlanoAcao
              nomeCliente={clientName}
              plan={plan}
              resultados={resultados}
              onResultadosChange={handleResultadosChange}
            />
          </>
        )}

        <DocMaosAObra nomeCliente={clientName} config={config} />

        <DocDisclaimer nomeCliente={clientName} config={config} onConfigChange={setConfig} />

        <DocContracapa />
      </div>

      <ModalSecoesPdf
        aberto={modalSecoesAberto}
        selecaoInicial={secoes}
        gerando={salvando}
        onCancelar={() => setModalSecoesAberto(false)}
        onGerar={handleGerarPdf}
      />
    </div>
  );
}
