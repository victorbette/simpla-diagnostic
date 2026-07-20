import {
  Briefcase, User, Building2, BadgeCheck,
  Shield, TrendingUp, BarChart2, Zap,
  DollarSign, PieChart,
  X, Plus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { DadosColetaDiag } from "../types";
import { CurrencyInput } from "@/components/CurrencyInput";

const INP: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#111827",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

function SecaoCard({
  color, Icon, title, subtitle, children,
}: {
  color: string;
  Icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      border: "0.5px solid #E5E7EB",
      marginBottom: 16,
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Icon size={18} color={color} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const VINCULOS: { key: string; label: string; Icon: React.ElementType }[] = [
  { key: "clt", label: "CLT", Icon: Briefcase },
  { key: "autonomo", label: "Autônomo", Icon: User },
  { key: "empresario", label: "Empresário", Icon: Building2 },
  { key: "concursado", label: "Concursado", Icon: BadgeCheck },
];

const PERFIL_CARDS: {
  key: string;
  label: string;
  alocacao: string;
  descricao: string;
  color: string;
  bgSelected: string;
  Icon: React.ElementType;
}[] = [
  { key: "conservador", label: "Conservador", alocacao: "RF 92% · RV 4% · Internacional 4%", descricao: "Foco em preservação de capital e liquidez. Baixa tolerância a risco.", color: "#3B82F6", bgSelected: "#EAF0F5", Icon: Shield },
  { key: "conservador_moderado", label: "Conservador Moderado", alocacao: "RF 78% · RV 13% · Internacional 9%", descricao: "Equilíbrio com predominância em renda fixa e alguma exposição a RV.", color: "#1E40AF", bgSelected: "#EAF0F5", Icon: TrendingUp },
  { key: "moderado", label: "Moderado", alocacao: "RF 66% · RV 20% · Internacional 13%", descricao: "Equilíbrio entre segurança e crescimento. Aceita volatilidade moderada.", color: "#2563EB", bgSelected: "#EFF6FF", Icon: BarChart2 },
  { key: "arrojado", label: "Arrojado", alocacao: "RF 52% · RV 29% · Internacional 17,5%", descricao: "Foco em crescimento. Alta tolerância a risco e volatilidade.", color: "#B91C1C", bgSelected: "#FEE2E2", Icon: Zap },
];

const CURRENCY_KEYS = [
  { label: "Patrimônio Financeiro (R$)", key: "patrimonioFinanceiro" },
  { label: "Renda Mensal (R$)", key: "rendaMensal" },
  { label: "Custo de Vida Mensal (R$)", key: "custoVidaMensal" },
  { label: "Aporte Mensal (R$)", key: "aporteMensal" },
  { label: "Gasto no Cartão de Crédito (R$)", key: "gastoCartaoMensal" },
  { label: "Renda Desejada na Aposentadoria (R$)", key: "rendaDesejadaAposentadoria" },
] as const;

interface Props {
  dados: DadosColetaDiag;
  onChange: (patch: Partial<DadosColetaDiag>) => void;
}

export function DiagColeta({ dados, onChange }: Props) {
  const filhos = dados.filhos ?? [];
  const idadeAtual = dados.dataNascimento
    ? Math.floor((Date.now() - new Date(dados.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const casado = dados.estadoCivil === "casado" || dados.estadoCivil === "uniao_estavel";

  function updateFilhos(newFilhos: Array<{ nome: string; idade: number }>) {
    onChange({ filhos: newFilhos });
  }

  return (
    <div>

      {/* ─── CARD 1: Dados Pessoais ─── */}
      <SecaoCard
        color="#2563EB"
        Icon={User}
        title="Dados Pessoais"
        subtitle="Informações básicas e perfil do cliente"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Data de nascimento</label>
            <input
              type="date"
              value={dados.dataNascimento ?? ""}
              onChange={e => onChange({ dataNascimento: e.target.value })}
              style={INP}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Idade</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 14, fontWeight: 600, color: "#1E40AF", flex: 1 }}>
                {idadeAtual !== null ? `${idadeAtual} anos` : "—"}
              </div>
              {idadeAtual !== null && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" as const }}>
                  ✓ CALCULADO
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Estado civil</label>
            <select value={dados.estadoCivil ?? ""} onChange={e => onChange({ estadoCivil: e.target.value })} style={INP}>
              <option value="">Selecione...</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
              <option value="uniao_estavel">União estável</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Profissão</label>
            <input
              type="text"
              value={dados.profissao ?? ""}
              onChange={e => onChange({ profissao: e.target.value })}
              placeholder="Ex: Médico, Advogado, Engenheiro..."
              style={INP}
            />
          </div>
        </div>

        {/* Dados do Cônjuge */}
        {casado && (
          <div style={{ background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 20px", marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-heart" style={{ fontSize: 13 }} />
              Dados do Cônjuge
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 6 }}>Nome completo do cônjuge</label>
                <input
                  type="text"
                  value={dados.nomeConjuge ?? ""}
                  onChange={e => onChange({ nomeConjuge: e.target.value })}
                  placeholder="Nome do cônjuge"
                  style={INP}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 6 }}>Data de nascimento do cônjuge</label>
                <input
                  type="date"
                  value={dados.dataNascimentoConjuge ?? ""}
                  onChange={e => onChange({ dataNascimentoConjuge: e.target.value })}
                  style={INP}
                />
                {dados.dataNascimentoConjuge && (
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                    {Math.floor((Date.now() - new Date(dados.dataNascimentoConjuge).getTime()) / (365.25 * 24 * 3600 * 1000))} anos
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filhos */}
        <div style={{ marginTop: 20, padding: "16px 20px", backgroundColor: "#F8FAFF", borderRadius: 10, border: "1px solid #BFDBFE" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", margin: "0 0 12px" }}>
            Filhos {filhos.length > 0 && <span style={{ fontWeight: 400, color: "#6B7280" }}>({filhos.length})</span>}
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {filhos.map((filho, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 8, alignItems: "center" }}>
                <Input
                  value={filho.nome}
                  onChange={(e) => updateFilhos(filhos.map((f, j) => j === i ? { ...f, nome: e.target.value } : f))}
                  placeholder={`Nome do filho ${i + 1}`}
                  className="border-[#BFDBFE]"
                />
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={filho.idade || ""}
                  onChange={(e) => updateFilhos(filhos.map((f, j) => j === i ? { ...f, idade: Number(e.target.value) || 0 } : f))}
                  placeholder="Idade"
                  className="border-[#BFDBFE] text-center"
                />
                <button
                  type="button"
                  onClick={() => updateFilhos(filhos.filter((_, j) => j !== i))}
                  style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 6, border: "1px solid #FECACA", backgroundColor: "#FEF2F2", color: "#B91C1C", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateFilhos([...filhos, { nome: "", idade: 0 }])}
            style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#2563EB", background: "none", border: "1px dashed #BFDBFE", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}
          >
            <Plus size={14} /> Adicionar filho
          </button>
        </div>

        {/* Vínculo profissional */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#111827", display: "block", marginBottom: 10 }}>Vínculo profissional</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {VINCULOS.map(({ key, label, Icon: VIcon }) => {
              const selected = dados.vinculoProfissional === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ vinculoProfissional: key })}
                  style={{ border: selected ? "2px solid #3B82F6" : "1.5px solid #BFDBFE", borderRadius: 10, padding: "14px 12px", backgroundColor: selected ? "#000000" : "white", color: selected ? "white" : "#111827", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: 8, position: "relative" as const, transition: "all 0.15s", fontFamily: "inherit" }}
                >
                  {selected && (
                    <span style={{ position: "absolute" as const, top: 8, right: 8, backgroundColor: "#3B82F6", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center" as const, justifyContent: "center" as const, fontSize: 11, color: "#000000", fontWeight: 700 }}>✓</span>
                  )}
                  <VIcon size={22} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* INSS */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: "0.5px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              checked={!!(dados.contribuiINSS ?? false)}
              onCheckedChange={(v) => onChange({ contribuiINSS: v })}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Contribui para o INSS?</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Contribuição previdenciária pública</p>
            </div>
          </div>
          {dados.contribuiINSS && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #BFDBFE" }}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Valor estimado do benefício futuro</label>
                <CurrencyInput
                  value={dados.valorINSS ?? 0}
                  onChange={(v) => onChange({ valorINSS: v })}
                />
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Estimativa do benefício mensal do INSS</p>
              </div>
            </div>
          )}
        </div>
      </SecaoCard>

      {/* ─── CARD 2: Situação Financeira e Patrimonial ─── */}
      <SecaoCard
        color="#15803D"
        Icon={DollarSign}
        title="Situação Financeira e Patrimonial"
        subtitle="Patrimônio, renda, fluxo mensal e hábitos financeiros"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {CURRENCY_KEYS.map(({ label, key }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</label>
              <CurrencyInput
                value={(dados[key] as number | undefined) ?? 0}
                onChange={(v) => onChange({ [key]: v } as Partial<DadosColetaDiag>)}
              />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Idade de Aposentadoria</label>
            <input
              type="number"
              value={dados.idadeMeta ?? ""}
              onChange={e => onChange({ idadeMeta: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Ex: 60"
              min={20}
              max={90}
              style={INP}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Idade planejada para se aposentar</p>
          </div>
        </div>

        {/* Seguro */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: "0.5px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              checked={!!(dados.possuiSeguro ?? false)}
              onCheckedChange={(v) => onChange({ possuiSeguro: v })}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Possui Seguro de Vida ou Invalidez?</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Apólices de seguro de vida ou invalidez permanente</p>
            </div>
          </div>

          {dados.possuiSeguro && (
            <div style={{ background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 10, padding: "14px 16px", marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#15803D", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-shield-check" style={{ fontSize: 14 }} />
                Detalhes do Seguro
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 6 }}>
                  Valor Total das Apólices (R$)
                </label>
                <CurrencyInput
                  value={dados.valorApolice ?? 0}
                  onChange={(v: number) => onChange({ valorApolice: v })}
                />
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>
                  Soma do capital segurado de vida e invalidez
                </div>
              </div>
            </div>
          )}
        </div>
      </SecaoCard>

      {/* ─── CARD 3: Investimentos ─── */}
      <SecaoCard
        color="#1E40AF"
        Icon={PieChart}
        title="Investimentos"
        subtitle="Carteira atual e perfil de risco do cliente"
      >
        {/* Tipos de investimentos */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#111827", display: "block", marginBottom: 10 }}>Tipos de investimentos que possui</label>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {([
              { key: "temRendaFixa" as const, label: "Renda Fixa" },
              { key: "temAcoes" as const, label: "Ações" },
              { key: "temFIIs" as const, label: "FIIs" },
              { key: "temExterior" as const, label: "Exterior" },
              { key: "temCripto" as const, label: "Cripto" },
            ]).map(({ key, label }) => {
              const on = !!dados[key];
              return (
                <button
                  key={key}
                  onClick={() => onChange({ [key]: !on })}
                  style={{ padding: "6px 14px", borderRadius: 999, border: on ? "1.5px solid #1E3A8A" : "1.5px solid #E5E7EB", background: on ? "#1E3A8A" : "white", color: on ? "white" : "#374151", fontSize: 12, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Perfil de Risco */}
        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 4px", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            Perfil de Risco do Cliente
          </p>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
            Selecione o perfil conforme análise do consultor
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PERFIL_CARDS.map(({ key, label, alocacao, descricao, color, bgSelected, Icon: PIcon }) => {
              const selected = dados.suitabilityPerfil === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ suitabilityPerfil: key })}
                  style={{ border: selected ? `2px solid ${color}` : "1.5px solid #BFDBFE", borderRadius: 10, padding: "16px 18px", backgroundColor: selected ? bgSelected : "white", cursor: "pointer", textAlign: "left" as const, position: "relative" as const, transition: "all 0.15s", display: "flex", flexDirection: "column" as const, gap: 8, fontFamily: "inherit" }}
                >
                  {selected && (
                    <span style={{ position: "absolute" as const, top: 10, right: 12, width: 20, height: 20, borderRadius: "50%", backgroundColor: color, color: "white", display: "flex", alignItems: "center" as const, justifyContent: "center" as const, fontSize: 11, fontWeight: 700 }}>✓</span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PIcon style={{ width: 20, height: 20, color }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0, fontWeight: 500 }}>{alocacao}</p>
                  <p style={{ fontSize: 12, color: "#111827", margin: 0, lineHeight: 1.5 }}>{descricao}</p>
                </button>
              );
            })}
          </div>
        </div>
      </SecaoCard>
    </div>
  );
}
