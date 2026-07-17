import { useState } from "react";
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

function SecaoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "0.5px solid #E5E7EB", marginBottom: 16 }}>
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: "#1E3A8A" }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

const VINCULOS = [
  { key: "clt", label: "CLT", icon: "ti-briefcase" },
  { key: "autonomo", label: "Autônomo", icon: "ti-user" },
  { key: "empresario", label: "Empresário", icon: "ti-building" },
  { key: "concursado", label: "Concursado", icon: "ti-badge" },
];

const PERFIS = [
  { key: "conservador", label: "Conservador", color: "#3B82F6", desc: "Foco em preservação de capital" },
  { key: "conservador_moderado", label: "Cons. Moderado", color: "#1E40AF", desc: "Predominância em renda fixa" },
  { key: "moderado", label: "Moderado", color: "#2563EB", desc: "Equilíbrio segurança/crescimento" },
  { key: "arrojado", label: "Arrojado", color: "#B91C1C", desc: "Foco em crescimento" },
];

const CURRENCY_KEYS = [
  { label: "Patrimônio financeiro", key: "patrimonioFinanceiro" },
  { label: "Renda mensal", key: "rendaMensal" },
  { label: "Custo de vida mensal", key: "custoVidaMensal" },
  { label: "Aporte mensal médio", key: "aporteMensal" },
  { label: "Gasto cartão (mensal)", key: "gastoCartaoMensal" },
  { label: "Renda desejada na aposentadoria", key: "rendaDesejadaAposentadoria" },
] as const;

interface Props {
  dados: DadosColetaDiag;
  onChange: (patch: Partial<DadosColetaDiag>) => void;
}

export function DiagColeta({ dados, onChange }: Props) {
  const [filhoNome, setFilhoNome] = useState("");
  const [filhoIdade, setFilhoIdade] = useState("");

  const filhos = dados.filhos ?? [];
  const idadeAtual = dados.dataNascimento
    ? Math.floor((Date.now() - new Date(dados.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const casado = dados.estadoCivil === "casado" || dados.estadoCivil === "uniao_estavel";

  function addFilho() {
    if (!filhoNome.trim()) return;
    onChange({ filhos: [...filhos, { nome: filhoNome.trim(), idade: Number(filhoIdade) || 0 }] });
    setFilhoNome("");
    setFilhoIdade("");
  }

  function removeFilho(i: number) {
    onChange({ filhos: filhos.filter((_, j) => j !== i) });
  }

  return (
    <div>
      {/* ─── Dados Pessoais ─── */}
      <SecaoCard title="Dados Pessoais" icon="ti-user">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Data de nascimento</label>
            <input type="date" value={dados.dataNascimento ?? ""} onChange={e => onChange({ dataNascimento: e.target.value })} style={INP} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Idade</label>
            <div style={{ height: 38, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", background: "#EFF6FF", fontSize: 13, fontWeight: 600, color: "#1E40AF" }}>
              {idadeAtual !== null ? `${idadeAtual} anos` : "—"}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Estado civil</label>
            <select value={dados.estadoCivil ?? ""} onChange={e => onChange({ estadoCivil: e.target.value })} style={INP}>
              <option value="">Selecione...</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
              <option value="uniao_estavel">União estável</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Profissão</label>
            <input type="text" value={dados.profissao ?? ""} onChange={e => onChange({ profissao: e.target.value })} placeholder="Ex: Médico, Engenheiro..." style={INP} />
          </div>
        </div>

        {casado && (
          <div style={{ marginTop: 16, background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 12 }}>
              Dados do Cônjuge
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Nome do cônjuge</label>
                <input type="text" value={dados.nomeConjuge ?? ""} onChange={e => onChange({ nomeConjuge: e.target.value })} style={INP} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 4 }}>Data de nascimento</label>
                <input type="date" value={dados.dataNascimentoConjuge ?? ""} onChange={e => onChange({ dataNascimentoConjuge: e.target.value })} style={INP} />
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 8 }}>Filhos</label>
          {filhos.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: "#111827" }}>{f.nome}, {f.idade} anos</span>
              <button onClick={() => removeFilho(i)} style={{ background: "none", border: "1px solid #FECACA", borderRadius: 6, color: "#B91C1C", padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: 8 }}>
            <input type="text" value={filhoNome} onChange={e => setFilhoNome(e.target.value)} placeholder="Nome do filho" style={INP} />
            <input type="number" value={filhoIdade} onChange={e => setFilhoIdade(e.target.value)} placeholder="Idade" min={0} max={30} style={{ ...INP, textAlign: "center" }} />
            <button onClick={addFilho} style={{ background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit" }}>
              + Adicionar
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 8 }}>Vínculo profissional</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {VINCULOS.map(({ key, label, icon }) => {
              const sel = dados.vinculoProfissional === key;
              return (
                <button key={key} onClick={() => onChange({ vinculoProfissional: key })}
                  style={{ border: sel ? "2px solid #2563EB" : "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 8px", background: sel ? "#1E3A8A" : "white", color: sel ? "white" : "#374151", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center" as const, gap: 6, fontSize: 12, fontWeight: sel ? 600 : 400, fontFamily: "inherit" }}>
                  <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </SecaoCard>

      {/* ─── Situação Financeira ─── */}
      <SecaoCard title="Situação Financeira" icon="ti-currency-dollar">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {CURRENCY_KEYS.map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>{label}</label>
              <CurrencyInput
                value={(dados[key] as number | undefined) ?? 0}
                onChange={(v) => onChange({ [key]: v } as Partial<DadosColetaDiag>)}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>Idade-meta para aposentadoria</label>
            <input type="number" value={dados.idadeMeta ?? ""} onChange={e => onChange({ idadeMeta: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ex: 60" min={20} max={90} style={INP} />
          </div>
        </div>
      </SecaoCard>

      {/* ─── Investimentos ─── */}
      <SecaoCard title="Investimentos" icon="ti-chart-pie">
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 8 }}>Classes de ativos na carteira</label>
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
                <button key={key} onClick={() => onChange({ [key]: !on })}
                  style={{ padding: "6px 14px", borderRadius: 999, border: on ? "1.5px solid #1E3A8A" : "1.5px solid #E5E7EB", background: on ? "#1E3A8A" : "white", color: on ? "white" : "#374151", fontSize: 12, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 8 }}>Perfil de risco (suitability)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {PERFIS.map(({ key, label, color, desc }) => {
              const sel = dados.suitabilityPerfil === key;
              return (
                <button key={key} onClick={() => onChange({ suitabilityPerfil: key })}
                  style={{ border: sel ? `2px solid ${color}` : "1.5px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", background: sel ? `${color}18` : "white", cursor: "pointer", textAlign: "left" as const, position: "relative" as const, fontFamily: "inherit" }}>
                  {sel && <span style={{ position: "absolute" as const, top: 8, right: 10, width: 18, height: 18, borderRadius: "50%", background: color, color: "white", display: "flex", alignItems: "center" as const, justifyContent: "center" as const, fontSize: 10, fontWeight: 700 }}>✓</span>}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </SecaoCard>
    </div>
  );
}
