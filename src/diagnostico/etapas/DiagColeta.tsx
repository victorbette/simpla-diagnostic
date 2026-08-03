import { useState } from "react";
import { User, DollarSign, PieChart } from "lucide-react";
import type { DadosColetaDiag } from "../types";
import { CurrencyInput } from "@/components/CurrencyInput";
import { ATIVOS_INVESTIMENTO, CLASSES_INVESTIMENTO } from "../ativosInvestimento";

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

const CURRENCY_KEYS = [
  { label: "Patrimônio Financeiro (R$)", key: "patrimonioFinanceiro" },
  { label: "Renda Mensal (R$)", key: "rendaMensal" },
  { label: "Custo de Vida Mensal (R$)", key: "custoVidaMensal" },
  { label: "Aporte Mensal (R$)", key: "aporteMensal" },
  { label: "Renda Desejada na Aposentadoria (R$)", key: "rendaDesejadaAposentadoria" },
] as const;

const VALOR_POR_CLASSE: Record<string, { label: string; key: string; hint?: string }[]> = {
  renda_fixa:    [{ label: "Valor em Renda Fixa (R$)",      key: "valorRendaFixa" }],
  renda_variavel:[{ label: "Valor em Renda Variável (R$)",  key: "valorRendaVariavel", hint: "Total em ações, FIIs e ETFs" }],
  exterior:      [{ label: "Valor no Exterior (R$)",        key: "valorExterior" }],
  cripto:        [{ label: "Valor em Cripto (R$)",          key: "valorCripto" }],
  alternativos:  [{ label: "Valor em Alternativos (R$)",    key: "valorAlternativos" }],
};

interface Props {
  dados: DadosColetaDiag;
  onChange: (patch: Partial<DadosColetaDiag>) => void;
  onSalvar: () => void;
}

function BotaoSalvar({ onSalvar, rotulo = "Salvar" }: { onSalvar: () => void; rotulo?: string }) {
  const [estado, setEstado] = useState<"idle" | "salvando" | "salvo">("idle");
  const handleClick = () => {
    setEstado("salvando");
    onSalvar();
    setTimeout(() => {
      setEstado("salvo");
      setTimeout(() => setEstado("idle"), 2000);
    }, 400);
  };
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 0 4px" }}>
      <button
        onClick={handleClick}
        disabled={estado === "salvando"}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: estado === "salvo" ? "#15803D" : "#2563EB",
          color: "white", border: "none", borderRadius: 8,
          padding: "10px 24px", fontSize: 13, fontWeight: 600,
          cursor: estado === "salvando" ? "not-allowed" : "pointer",
          transition: "background 300ms", fontFamily: "inherit",
        }}
      >
        {estado === "salvando" && <i className="ti ti-loader-2" style={{ fontSize: 14 }} />}
        {estado === "salvo" && <i className="ti ti-circle-check" style={{ fontSize: 14 }} />}
        {estado === "idle" && <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />}
        {estado === "salvando" ? "Salvando..." : estado === "salvo" ? "Salvo!" : rotulo}
      </button>
    </div>
  );
}

export function DiagColeta({ dados, onChange, onSalvar }: Props) {
  const idadeAtual = dados.dataNascimento
    ? Math.floor((Date.now() - new Date(dados.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const casado = dados.estadoCivil === "casado" || dados.estadoCivil === "uniao_estavel";

  const VINCULOS = [
    { id: "clt",        label: "CLT" },
    { id: "autonomo",   label: "Autônomo" },
    { id: "empresario", label: "Empresário" },
    { id: "servidor",   label: "Servidor Público" },
    { id: "aposentado", label: "Aposentado" },
    { id: "outro",      label: "Outro" },
  ];

  const vinculosAtuais: string[] = (() => {
    const v = dados.vinculoProfissional;
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return [v];
  })();

  const toggleVinculo = (id: string) => {
    const novoArray = vinculosAtuais.includes(id)
      ? vinculosAtuais.filter((v) => v !== id)
      : [...vinculosAtuais, id];
    onChange({ vinculoProfissional: novoArray });
  };

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

        {/* Vínculo profissional */}
        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#111827", display: "block", marginBottom: 8 }}>
            Vínculo profissional
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {VINCULOS.map(({ id, label }) => {
              const selecionado = vinculosAtuais.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleVinculo(id)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: selecionado ? 600 : 400,
                    border: selecionado ? "2px solid #2563EB" : "1px solid #E5E7EB",
                    borderRadius: 99,
                    background: selecionado ? "#EFF6FF" : "white",
                    color: selecionado ? "#2563EB" : "#374151",
                    cursor: "pointer",
                    transition: "all 150ms",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {vinculosAtuais.length > 1 && (
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 6 }}>
              {vinculosAtuais.length} vínculos selecionados
            </div>
          )}
        </div>

        {/* Dados do Cônjuge */}
        {casado && (
          <div style={{ background: "#F8FAFF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 20px", marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-heart" style={{ fontSize: 13 }} />
              Dados do Cônjuge
            </div>
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
          </div>
        )}

        {/* Filhos */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: "0.5px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>Tem filhos?</div>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={dados.temFilhos ?? false}
                onChange={e => onChange({
                  temFilhos: e.target.checked,
                  filhos: e.target.checked ? (dados.filhos ?? [{ nome: "" }]) : [],
                })}
                style={{ display: "none" }}
              />
              <div style={{ width: 40, height: 22, borderRadius: 99, background: dados.temFilhos ? "#2563EB" : "#D1D5DB", position: "relative" as const, transition: "background 200ms" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute" as const, top: 3, left: dados.temFilhos ? 21 : 3, transition: "left 200ms" }} />
              </div>
            </label>
          </div>

          {dados.temFilhos && (
            <div style={{ marginTop: 8 }}>
              {(dados.filhos ?? [{ nome: "" }]).map((filho, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <input
                    type="text"
                    value={filho.nome ?? ""}
                    onChange={e => {
                      const novos = [...(dados.filhos ?? [])];
                      novos[idx] = { nome: e.target.value };
                      onChange({ filhos: novos });
                    }}
                    placeholder={`Nome do filho ${idx + 1}`}
                    style={{ ...INP, flex: 1 }}
                  />
                  {(dados.filhos ?? []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => onChange({ filhos: (dados.filhos ?? []).filter((_, i) => i !== idx) })}
                      style={{ background: "none", border: "1px solid #FCA5A5", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#B91C1C", display: "flex", alignItems: "center" }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 13 }} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onChange({ filhos: [...(dados.filhos ?? []), { nome: "" }] })}
                style={{ fontSize: 12, color: "#2563EB", background: "none", border: "1px dashed #BFDBFE", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}
              >
                + Adicionar filho
              </button>
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

        {/* Previdência Privada */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: "0.5px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>Tem Previdência Privada?</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>PGBL, VGBL ou previdência corporativa</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={dados.temPrevidencia ?? false}
                onChange={e => onChange({
                  temPrevidencia: e.target.checked,
                  saldoPrevidencia: e.target.checked ? dados.saldoPrevidencia : undefined,
                })}
                style={{ display: "none" }}
              />
              <div style={{ width: 40, height: 22, borderRadius: 99, background: dados.temPrevidencia ? "#2563EB" : "#D1D5DB", position: "relative" as const, transition: "background 200ms" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute" as const, top: 3, left: dados.temPrevidencia ? 21 : 3, transition: "left 200ms" }} />
              </div>
            </label>
          </div>
          {dados.temPrevidencia && (
            <div style={{ background: "#F0FDF4", border: "0.5px solid #BBF7D0", borderRadius: 8, padding: "12px 14px", marginTop: 4 }}>
              <label style={{ fontSize: 11, color: "#15803D", fontWeight: 500, display: "block", marginBottom: 6 }}>
                Saldo Atual da Previdência (R$)
              </label>
              <CurrencyInput
                value={dados.saldoPrevidencia ?? 0}
                onChange={(v: number) => onChange({ saldoPrevidencia: v })}
              />
            </div>
          )}
        </div>

        {/* Seguro */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: "0.5px solid #E5E7EB" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>Possui Seguro de Vida ou Invalidez?</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>Seguro de vida, invalidez ou doenças graves</div>
            </div>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={dados.possuiSeguro ?? false}
                onChange={e => onChange({ possuiSeguro: e.target.checked })}
                style={{ display: "none" }}
              />
              <div style={{ width: 40, height: 22, borderRadius: 99, background: dados.possuiSeguro ? "#2563EB" : "#D1D5DB", position: "relative" as const, transition: "background 200ms" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute" as const, top: 3, left: dados.possuiSeguro ? 21 : 3, transition: "left 200ms" }} />
              </div>
            </label>
          </div>
        </div>
      </SecaoCard>

      {/* ─── CARD 3: Investimentos ─── */}
      <SecaoCard
        color="#1E40AF"
        Icon={PieChart}
        title="Investimentos"
        subtitle="Marque os ativos que o cliente já possui"
      >
        {/* Switch Começando do Zero */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 0",
          marginBottom: 12,
          borderBottom: "0.5px solid #F3F4F6",
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
              Começando do Zero
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
              Lead ainda não possui investimentos
            </div>
          </div>
          <label style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={dados.comecandoDoZero ?? false}
              onChange={e => onChange({
                comecandoDoZero: e.target.checked,
                ativosInvestimento: e.target.checked ? {} : dados.ativosInvestimento,
              })}
              style={{ display: "none" }}
            />
            <div style={{
              width: 40, height: 22, borderRadius: 99,
              background: dados.comecandoDoZero ? "#2563EB" : "#D1D5DB",
              position: "relative" as const,
              transition: "background 200ms",
            }}>
              <div style={{
                width: 16, height: 16,
                borderRadius: "50%", background: "white",
                position: "absolute" as const, top: 3,
                left: dados.comecandoDoZero ? 21 : 3,
                transition: "left 200ms",
              }} />
            </div>
          </label>
        </div>

        {/* Campo de valor — apenas se começando do zero */}
        {dados.comecandoDoZero && (
          <div style={{
            background: "#F0FDF4",
            border: "0.5px solid #BBF7D0",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
          }}>
            <label style={{
              fontSize: 11, color: "#15803D",
              fontWeight: 500, display: "block",
              marginBottom: 6,
            }}>
              Valor disponível para investir (R$)
            </label>
            <CurrencyInput
              value={dados.valorParaInvestir ?? 0}
              onChange={(v: number) => onChange({ valorParaInvestir: v })}
            />
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
              Capital inicial disponível para estruturar a carteira
            </div>
          </div>
        )}

        {/* Switches de ativos — ocultar se começando do zero */}
        {!dados.comecandoDoZero && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {CLASSES_INVESTIMENTO.map(({ classe, label, cor }) => (
            <div key={classe}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cor, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ATIVOS_INVESTIMENTO.filter(a => a.classe === classe).map(ativo => {
                  const marcado = !!(dados.ativosInvestimento?.[ativo.id]);
                  return (
                    <div
                      key={ativo.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        border: marcado
                          ? `1px solid ${ativo.qualidade === "bom" ? "#BBF7D0" : "#FCA5A5"}`
                          : "1px solid #F3F4F6",
                        borderRadius: 8,
                        background: marcado
                          ? ativo.qualidade === "bom" ? "#F0FDF4" : "#FFF5F5"
                          : "white",
                        transition: "all 150ms",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                        <i className={`ti ${ativo.icone}`} style={{ fontSize: 14, color: marcado ? ativo.cor : "#9CA3AF", marginTop: 2, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: marcado ? 600 : 400, color: marcado ? "#111827" : "#6B7280" }}>
                            {ativo.label}
                          </div>
                          {marcado && (
                            <div style={{ fontSize: 9, fontWeight: 600, color: ativo.qualidade === "bom" ? "#15803D" : "#B91C1C", marginTop: 1 }}>
                              {ativo.qualidade === "bom" ? "✓ Recomendado" : "⚠ Não recomendado"}
                            </div>
                          )}
                        </div>
                      </div>
                      <label style={{ position: "relative", display: "inline-block", width: 36, height: 20, cursor: "pointer", flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={e => onChange({
                            ativosInvestimento: {
                              ...dados.ativosInvestimento,
                              [ativo.id]: e.target.checked,
                            },
                          })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: "absolute",
                          top: 0, right: 0, bottom: 0, left: 0,
                          borderRadius: 20,
                          background: marcado
                            ? ativo.qualidade === "bom" ? "#15803D" : "#B91C1C"
                            : "#D1D5DB",
                          transition: "background 200ms",
                        }}>
                          <span style={{
                            position: "absolute",
                            width: 14, height: 14,
                            borderRadius: "50%",
                            background: "white",
                            top: 3,
                            left: marcado ? 19 : 3,
                            transition: "left 200ms",
                          }} />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
              {(VALOR_POR_CLASSE[classe] ?? []).map(({ label: vLabel, key, hint }) => (
                <div key={key} style={{ marginTop: 8, padding: "8px 12px", background: "#F8FAFF", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" as const }}>{vLabel}</div>
                    {hint && <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 1 }}>{hint}</div>}
                  </div>
                  <CurrencyInput
                    value={(dados.ativosInvestimento?.[key] as number | undefined) ?? 0}
                    onChange={(v: number) => onChange({
                      ativosInvestimento: {
                        ...dados.ativosInvestimento,
                        [key]: v,
                      },
                    })}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        )}
      </SecaoCard>
      <BotaoSalvar onSalvar={onSalvar} rotulo="Salvar Coleta de Dados" />
    </div>
  );
}
