import { useState, useEffect } from "react";
import type { Lead, DadosColetaDiag } from "./types";
import { LeadsList } from "./LeadsList";
import { DiagnosticoFlow } from "./DiagnosticoFlow";
import { useClientStore } from "@/hooks/useClientStore";
import { useFinancialPlanStore } from "@/hooks/useFinancialPlanStore";
import {
  initialDadosCliente,
  initialPlanejamentoIF,
  type DadosCliente,
  type PlanejamentoIF,
} from "@/types/financialPlanning";

const STORAGE_KEY = "diagnostico_leads";

function carregarLeads(): Lead[] {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo ? (JSON.parse(salvo) as Lead[]) : [];
  } catch { return []; }
}

function salvarLeads(leads: Lead[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (err) {
    console.error("Erro ao salvar leads:", err);
  }
}

function calcularIdade(dataNascimento?: string): number {
  if (!dataNascimento) return 35;
  try {
    const nasc = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return Math.max(18, idade);
  } catch { return 35; }
}

function mapEstadoCivil(valor?: string): DadosCliente["estadoCivil"] {
  if (!valor) return "";
  const v = valor.toLowerCase();
  if (v.includes("casado") || v.includes("casada")) return "casado";
  if (v.includes("solteiro") || v.includes("solteira")) return "solteiro";
  if (v.includes("divorc")) return "divorciado";
  if (v.includes("vi") && v.includes("vo")) return "viuvo";
  if (v.includes("uni") || v.includes("estav")) return "uniao_estavel";
  return "";
}

function mapLeadToDadosCliente(lead: Lead): DadosCliente {
  const c: DadosColetaDiag = lead.dadosColeta;
  const tipoPrevidencia: DadosCliente["tipoPrevidencia"] =
    c.tipoPrevidencia === "PGBL" ? "pgbl"
    : c.tipoPrevidencia === "VGBL" ? "vgbl"
    : null;

  return {
    ...initialDadosCliente,
    dataNascimento: c.dataNascimento ?? "",
    estadoCivil: mapEstadoCivil(c.estadoCivil),
    nomeConjuge: c.nomeConjuge,
    temFilhos: c.temFilhos ?? false,
    numeroFilhos: c.filhos?.length ?? 0,
    filhos: (c.filhos ?? []).map(f => ({ nome: f.nome, idade: 0 })),
    profissao: c.profissao ?? "",
    vinculoProfissional: c.vinculoProfissional,
    patrimonioFinanceiroEstimado: c.patrimonioFinanceiro ?? 0,
    rendaMensal: c.rendaMensal ?? 0,
    custoDeVidaMensal: c.custoVidaMensal ?? 0,
    aportesMensalMedio: c.aporteMensal ?? 0,
    rendaDesejadaAposentadoria: c.rendaDesejadaAposentadoria ?? 0,
    idadeMeta: c.idadeMeta,
    temSeguroVida: c.possuiSeguro ?? false,
    possuiPrevidencia: c.temPrevidencia ?? false,
    saldoPrevidencia: c.saldoPrevidencia ?? 0,
    tipoPrevidencia,
    comecandoDoZero: c.comecandoDoZero ?? false,
  };
}

function mapLeadToPlanejamentoIF(lead: Lead): PlanejamentoIF {
  const lf = lead.dadosLF;
  const idadeAtual = calcularIdade(lead.dadosColeta.dataNascimento);
  return {
    ...initialPlanejamentoIF,
    idadeAtual,
    patrimonioAtual: lf.patrimonioInicial ?? 0,
    aporteMensal: lf.aporteMensal ?? 0,
    idadeMeta: lf.idadeAlvo ?? initialPlanejamentoIF.idadeMeta,
    rendaMensalDesejada: lf.rendaDesejada ?? 0,
    ...(lf.taxaTravada && lf.taxaTravadaValor != null
      ? { taxaRetornoAnual: lf.taxaTravadaValor }
      : {}),
  };
}

interface Props {
  onVoltar: () => void;
}

export function DiagnosticoPage({ onVoltar }: Props) {
  const [leads, setLeads] = useState<Lead[]>(carregarLeads);
  const [leadAtivo, setLeadAtivo] = useState<Lead | null>(null);

  const { criarCliente } = useClientStore();
  const { criarPlano, savePlan } = useFinancialPlanStore();

  useEffect(() => {
    salvarLeads(leads);
  }, [leads]);

  async function handleConverterCliente(lead: Lead) {
    const cliente = await criarCliente({
      nome: lead.nome,
      email: lead.email || undefined,
      telefone: lead.telefone || undefined,
      dataNascimento: lead.dadosColeta.dataNascimento || undefined,
    });

    const plano = await criarPlano(cliente.id);

    await savePlan({
      ...plano,
      dadosCliente: mapLeadToDadosCliente(lead),
      planejamentoIF: mapLeadToPlanejamentoIF(lead),
    });

    const leadAtualizado = { ...lead, convertido: true, clienteId: cliente.id };
    setLeads(prev => prev.map(l => l.id === lead.id ? leadAtualizado : l));
  }

  if (leadAtivo) {
    return (
      <DiagnosticoFlow
        lead={leadAtivo}
        onAtualizar={(leadAtualizado) => {
          const novosLeads = leads.map(l => l.id === leadAtualizado.id ? leadAtualizado : l);
          setLeads(novosLeads);
          setLeadAtivo(leadAtualizado);
          salvarLeads(novosLeads);
        }}
        onVoltar={() => setLeadAtivo(null)}
      />
    );
  }

  return (
    <LeadsList
      leads={leads}
      onSelecionar={(lead) => setLeadAtivo(leads.find(l => l.id === lead.id) ?? lead)}
      onCadastrar={(novoLead) => {
        setLeads(prev => [...prev, novoLead]);
        setLeadAtivo(novoLead);
      }}
      onAtualizar={(leadAtualizado) => {
        setLeads(prev => prev.map(l => l.id === leadAtualizado.id ? leadAtualizado : l));
      }}
      onExcluir={(id) => {
        setLeads(prev => prev.filter(l => l.id !== id));
      }}
      onVoltar={onVoltar}
      onConverterCliente={handleConverterCliente}
    />
  );
}
