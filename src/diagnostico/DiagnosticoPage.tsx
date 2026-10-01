import { useState, useEffect } from "react";
import type { Lead } from "./types";
import { LeadsList } from "./LeadsList";
import { DiagnosticoFlow } from "./DiagnosticoFlow";
import { useClientStore } from "@/hooks/useClientStore";
import { toast } from "sonner";
import { FP_BLOQUEADO_MENSAGEM } from "@/lib/fpBloqueado";

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

interface Props {
  onVoltar: () => void;
}

export function DiagnosticoPage({ onVoltar }: Props) {
  const [leads, setLeads] = useState<Lead[]>(carregarLeads);
  const [leadAtivo, setLeadAtivo] = useState<Lead | null>(null);

  const { criarCliente } = useClientStore();

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

    // Financial Planning foi movido para o CRM Wealth — apenas o cliente é criado.
    toast.info(`Cliente criado. ${FP_BLOQUEADO_MENSAGEM}`);

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
