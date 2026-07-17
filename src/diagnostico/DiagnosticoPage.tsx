import { useState, useEffect } from "react";
import type { Lead } from "./types";
import { LeadsList } from "./LeadsList";
import { DiagnosticoFlow } from "./DiagnosticoFlow";

const STORAGE_KEY = "diagnostico_leads";

function carregarLeads(): Lead[] {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo ? (JSON.parse(salvo) as Lead[]) : [];
  } catch { return []; }
}

function salvarLeads(leads: Lead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

interface Props {
  onVoltar: () => void;
}

export function DiagnosticoPage({ onVoltar }: Props) {
  const [leads, setLeads] = useState<Lead[]>(carregarLeads);
  const [leadAtivo, setLeadAtivo] = useState<Lead | null>(null);

  useEffect(() => {
    salvarLeads(leads);
  }, [leads]);

  if (leadAtivo) {
    return (
      <DiagnosticoFlow
        lead={leadAtivo}
        onAtualizar={(leadAtualizado) => {
          setLeads(prev => prev.map(l => l.id === leadAtualizado.id ? leadAtualizado : l));
          setLeadAtivo(leadAtualizado);
        }}
        onVoltar={() => setLeadAtivo(null)}
      />
    );
  }

  return (
    <LeadsList
      leads={leads}
      onSelecionar={setLeadAtivo}
      onCadastrar={(novoLead) => {
        setLeads(prev => [...prev, novoLead]);
        setLeadAtivo(novoLead);
      }}
      onExcluir={(id) => {
        setLeads(prev => prev.filter(l => l.id !== id));
      }}
      onVoltar={onVoltar}
    />
  );
}
