import type { Lead } from "./types";

/**
 * Exportação dos leads do Diagnóstico para levar ao CRM Wealth.
 *
 * Os leads vivem só no `localStorage` deste navegador. O Diagnóstico mudou para o CRM
 * (Planejamento › Diagnóstico Financeiro), e o caminho para não perdê-los é: "Exportar meus
 * leads" aqui baixa um arquivo, e "Importar do simpla-diagnostic" lá o lê. O CRM reconhece cada
 * lead pelo `id` daqui, então importar o mesmo arquivo de novo não duplica nada.
 *
 * O formato é este envelope — o CRM confere `formato` antes de ler.
 */

export const FORMATO_EXPORTACAO = "simpla-diagnostic/leads";
export const VERSAO_EXPORTACAO = 1;

export interface ExportacaoLeads {
  formato: typeof FORMATO_EXPORTACAO;
  versao: typeof VERSAO_EXPORTACAO;
  exportadoEm: string;
  leads: Lead[];
}

export function montarExportacao(leads: Lead[], agora: Date): ExportacaoLeads {
  return { formato: FORMATO_EXPORTACAO, versao: VERSAO_EXPORTACAO, exportadoEm: agora.toISOString(), leads };
}

export function nomeArquivoExportacao(agora: Date): string {
  const d = String(agora.getDate()).padStart(2, "0");
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  return `leads-diagnostico-${agora.getFullYear()}-${m}-${d}.json`;
}

/** Baixa o arquivo no navegador. */
export function baixarExportacao(leads: Lead[]): void {
  const agora = new Date();
  const conteudo = JSON.stringify(montarExportacao(leads, agora));
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoExportacao(agora);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
