import {
  Briefcase, User, Building2, BadgeCheck, Shield, TrendingUp, BarChart2, Zap,
  DollarSign, PieChart, Sunset, FileText, Plus, X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { AtivoForm } from "./AtivoForm";
import { ProtecaoSucessorioForm } from "./ProtecaoSucessorioForm";
import { FiscalForm } from "./FiscalForm";
import type { FinancialPlan, DadosCliente, PerfilRisco, PlanejamentoIF } from "@/types/financialPlanning";
import { formatCurrency } from "@/lib/format";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const VINCULO_OPTIONS: { key: DadosCliente["tipoTrabalho"]; label: string; Icon: React.ElementType }[] = [
  { key: "clt", label: "CLT", Icon: Briefcase },
  { key: "autonomo", label: "Autônomo", Icon: User },
  { key: "empresario", label: "Empresário", Icon: Building2 },
  { key: "concursado", label: "Concursado", Icon: BadgeCheck },
];

const PERFIL_CARDS: {
  perfil: PerfilRisco;
  label: string;
  alocacao: string;
  descricao: string;
  color: string;
  bgSelected: string;
  icon: React.ElementType;
}[] = [
  { perfil: "conservador", label: "Conservador", alocacao: "RF 92% · RV 4% · Internacional 4%", descricao: "Foco em preservação de capital e liquidez. Baixa tolerância a risco.", color: "#3B82F6", bgSelected: "#EAF0F5", icon: Shield },
  { perfil: "conservador_moderado", label: "Conservador Moderado", alocacao: "RF 78% · RV 13% · Internacional 9%", descricao: "Equilíbrio com predominância em renda fixa e alguma exposição a RV.", color: "#1E40AF", bgSelected: "#EAF0F5", icon: TrendingUp },
  { perfil: "moderado", label: "Moderado", alocacao: "RF 66% · RV 20% · Internacional 13%", descricao: "Equilíbrio entre segurança e crescimento. Aceita volatilidade moderada.", color: "#2563EB", bgSelected: "#EFF6FF", icon: BarChart2 },
  { perfil: "arrojado", label: "Arrojado", alocacao: "RF 52% · RV 29% · Internacional 17,5%", descricao: "Foco em crescimento. Alta tolerância a risco e volatilidade.", color: "#B91C1C", bgSelected: "#FEE2E2", icon: Zap },
];


interface Props {
  plan: FinancialPlan;
  onChange: (patch: Partial<FinancialPlan>) => void;
  onColetaComplete: (dadosCliente: DadosCliente) => void;
}

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
      marginBottom: 16,
      borderLeft: `3px solid ${color}`,
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

function AutoField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flex: 1, height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 14, fontWeight: 600, color: "#1E40AF" }}>
          {value || "—"}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
          AUTO
        </span>
      </div>
      {hint && <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{hint}</p>}
    </div>
  );
}

export function ColetaDadosCompleta({ plan, onChange }: Props) {
  const dados = plan.dadosCliente;

  const setDados = <K extends keyof DadosCliente>(key: K, val: DadosCliente[K]) =>
    onChange({ dadosCliente: { ...dados, [key]: val } });

  const setIF = <K extends keyof PlanejamentoIF>(key: K, val: PlanejamentoIF[K]) =>
    onChange({ planejamentoIF: { ...plan.planejamentoIF, [key]: val } });

  const filhos = dados.filhos ?? [];

  const updateFilhos = (newFilhos: Array<{ nome: string; idade: number }>) =>
    onChange({ dadosCliente: { ...dados, filhos: newFilhos, numeroFilhos: newFilhos.length } });

  const calculatedAge = dados.dataNascimento
    ? new Date().getFullYear() - new Date(dados.dataNascimento).getFullYear()
    : null;

  // Previdência checkbox helpers
  const isPGBL = dados.tipoPrevidencia === "pgbl" || dados.tipoPrevidencia === "ambos";
  const isVGBL = dados.tipoPrevidencia === "vgbl" || dados.tipoPrevidencia === "ambos";

  const togglePGBL = (checked: boolean) => {
    if (checked && isVGBL) setDados("tipoPrevidencia", "ambos");
    else if (checked) setDados("tipoPrevidencia", "pgbl");
    else if (isVGBL) setDados("tipoPrevidencia", "vgbl");
    else setDados("tipoPrevidencia", null);
  };

  const toggleVGBL = (checked: boolean) => {
    if (checked && isPGBL) setDados("tipoPrevidencia", "ambos");
    else if (checked) setDados("tipoPrevidencia", "vgbl");
    else if (isPGBL) setDados("tipoPrevidencia", "pgbl");
    else setDados("tipoPrevidencia", null);
  };


  const labelCls = "text-[13px] font-medium text-[#111827]";
  const fieldCls = "flex flex-col gap-1.5";

  const anosRestantes = Math.max(0, plan.planejamentoIF.idadeMeta - (calculatedAge ?? plan.planejamentoIF.idadeAtual));

  return (
    <div style={{ padding: "24px 32px", width: "100%", boxSizing: "border-box" }}>

      {/* ─── SEÇÃO 1: Dados Pessoais ─── */}
      <SecaoCard color="#2563EB" Icon={User} title="Dados Pessoais" subtitle="Informações básicas, localização e perfil do cliente">

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className={fieldCls}>
            <Label className={labelCls}>Data de nascimento</Label>
            <Input
              type="date"
              value={dados.dataNascimento}
              onChange={(e) => setDados("dataNascimento", e.target.value)}
              className="border-[#BFDBFE]"
            />
          </div>

          <div className={fieldCls}>
            <Label className={labelCls}>Idade</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", height: 40, alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #BFDBFE", borderLeft: "3px solid #3B82F6", backgroundColor: "#EAF0F5", fontSize: 14, fontWeight: 600, color: "#1E40AF", flex: 1 }}>
                {calculatedAge ? `${calculatedAge} anos` : "—"}
              </div>
              {calculatedAge && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", backgroundColor: "#EAF0F5", border: "1px solid #A8C4D8", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
                  ✓ CALCULADO
                </span>
              )}
            </div>
          </div>

          <div className={fieldCls}>
            <Label className={labelCls}>Estado civil</Label>
            <Select value={dados.estadoCivil} onValueChange={(v) => setDados("estadoCivil", v as DadosCliente["estadoCivil"])}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="uniao_estavel">União estável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={fieldCls} style={{ justifyContent: "center" }}>
            <Label className={labelCls}>Tem filhos?</Label>
            <div style={{ display: "flex", alignItems: "center", height: 40 }}>
              <Switch checked={!!dados.temFilhos} onCheckedChange={(v) => setDados("temFilhos", v)} />
            </div>
          </div>
        </div>

        {/* Lista de filhos */}
        {dados.temFilhos && (
          <div style={{ marginTop: 16, padding: "16px 20px", backgroundColor: "#F8FAFF", borderRadius: 10, border: "1px solid #BFDBFE" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", margin: "0 0 12px" }}>
              Filhos {filhos.length > 0 && <span style={{ fontWeight: 400, color: "#6B7280" }}>({filhos.length})</span>}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#2563EB", background: "none", border: "1px dashed #BFDBFE", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 500 }}
            >
              <Plus size={14} /> Adicionar filho
            </button>
          </div>
        )}

        {/* Cidade | Estado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
          <div className={fieldCls}>
            <Label className={labelCls}>Cidade</Label>
            <Input value={dados.cidade} onChange={(e) => setDados("cidade", e.target.value)} placeholder="Ex: São Paulo" />
          </div>
          <div className={fieldCls}>
            <Label className={labelCls}>Estado (UF)</Label>
            <Select value={dados.estado} onValueChange={(v) => setDados("estado", v)}>
              <SelectTrigger><SelectValue placeholder="UF..." /></SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* INSS */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: `1px solid ${dados.contribuiINSS ? "#2563EB" : "#BFDBFE"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              checked={!!(dados.contribuiINSS ?? false)}
              onCheckedChange={(v) => setDados("contribuiINSS", v)}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Contribui para o INSS?</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Contribuição previdenciária pública</p>
            </div>
          </div>
          {dados.contribuiINSS && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #BFDBFE" }}>
              <div className={fieldCls}>
                <Label className={labelCls}>Valor estimado do benefício futuro</Label>
                <CurrencyInput
                  value={dados.valorINSS ?? 0}
                  onChange={(v) => setDados("valorINSS", v)}
                />
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Estimativa do benefício futuro</p>
              </div>
            </div>
          )}
        </div>

        {/* Vínculo profissional */}
        <div style={{ marginTop: 20 }}>
          <Label className={labelCls} style={{ display: "block", marginBottom: 10 }}>Vínculo profissional</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {VINCULO_OPTIONS.map(({ key, label, Icon: VIcon }) => {
              const selected = dados.tipoTrabalho === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDados("tipoTrabalho", key)}
                  style={{ border: selected ? "2px solid #3B82F6" : "1.5px solid #BFDBFE", borderRadius: 10, padding: "14px 12px", backgroundColor: selected ? "#000000" : "white", color: selected ? "white" : "#111827", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", transition: "all 0.15s" }}
                >
                  {selected && (
                    <span style={{ position: "absolute", top: 8, right: 8, backgroundColor: "#3B82F6", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000000", fontWeight: 700 }}>✓</span>
                  )}
                  <VIcon size={22} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SecaoCard>

      {/* ─── SEÇÃO 2: Situação Financeira ─── */}
      <SecaoCard color="#15803D" Icon={DollarSign} title="Situação Financeira" subtitle="Patrimônio, renda, fluxo mensal e hábitos financeiros">

        {/* 6 currency fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {([
            { label: "Patrimônio total estimado", key: "patrimonioTotalEstimado", hint: "Inclui imóveis e bens" },
            { label: "Patrimônio financeiro", key: "patrimonioFinanceiroEstimado", hint: "Apenas investimentos" },
            { label: "Renda mensal", key: "rendaMensal" },
            { label: "Custo de vida mensal", key: "custoDeVidaMensal" },
            { label: "Aporte mensal médio", key: "aportesMensalMedio", hint: "Média mensal" },
            { label: "Gasto mensal no cartão (familiar)", key: "gastoCartaoMensal", hint: "Some todas as faturas" },
          ] as { label: string; key: keyof DadosCliente; hint?: string }[]).map(({ label, key, hint }) => (
            <div key={key} className={fieldCls}>
              <Label className={labelCls}>{label}</Label>
              <CurrencyInput
                value={dados[key] as number}
                onChange={(v) => setDados(key, v as DadosCliente[typeof key])}
              />
              {hint && <p className="text-[11px] text-[#9CA3AF] italic">{hint}</p>}
            </div>
          ))}
        </div>

        {/* Perfil de viagens */}
        <div style={{ marginTop: 20 }}>
          <Label className={labelCls} style={{ display: "block", marginBottom: 8 }}>Perfil de viagens</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ borderRadius: 10, border: `1px solid ${dados.fazViagensNacionais ? "#2563EB" : "#BFDBFE"}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Switch
                  checked={!!dados.fazViagensNacionais}
                  onCheckedChange={(checked) => onChange({ dadosCliente: { ...dados, fazViagensNacionais: checked, viagensNacionaisQtdAnual: checked ? dados.viagensNacionaisQtdAnual : 0 } })}
                />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Viagens nacionais</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Viaja dentro do Brasil regularmente</p>
                </div>
              </div>
              {dados.fazViagensNacionais && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 8px" }}>Quantas vezes por ano?</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[1, 2, 4, 6, 12].map((n) => (
                      <button key={n} onClick={() => setDados("viagensNacionaisQtdAnual", n)} style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid #BFDBFE", fontSize: 12, cursor: "pointer", backgroundColor: dados.viagensNacionaisQtdAnual === n ? "#2563EB" : "white", color: dados.viagensNacionaisQtdAnual === n ? "white" : "#6B7280", fontWeight: 500 }}>
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderRadius: 10, border: `1px solid ${dados.fazViagensInternacionais ? "#2563EB" : "#BFDBFE"}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Switch
                  checked={!!dados.fazViagensInternacionais}
                  onCheckedChange={(checked) => onChange({ dadosCliente: { ...dados, fazViagensInternacionais: checked, viagensInternacionaisQtdAnual: checked ? dados.viagensInternacionaisQtdAnual : 0 } })}
                />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Viagens internacionais</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Viaja para o exterior</p>
                </div>
              </div>
              {dados.fazViagensInternacionais && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #BFDBFE" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 8px" }}>Quantas vezes por ano?</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[1, 2, 3, 4, 6].map((n) => (
                      <button key={n} onClick={() => setDados("viagensInternacionaisQtdAnual", n)} style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid #BFDBFE", fontSize: 12, cursor: "pointer", backgroundColor: dados.viagensInternacionaisQtdAnual === n ? "#2563EB" : "white", color: dados.viagensInternacionaisQtdAnual === n ? "white" : "#6B7280", fontWeight: 500 }}>
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Imóvel renda */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: `1px solid ${dados.possuiImovelRenda ? "#15803D" : "#BFDBFE"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              checked={!!(dados.possuiImovelRenda ?? false)}
              onCheckedChange={(v) => setDados("possuiImovelRenda", v)}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Possui imóveis que geram renda?</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Imóveis para aluguel ou renda passiva</p>
            </div>
          </div>
          {dados.possuiImovelRenda && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #BBF7D0" }}>
              <div className={fieldCls}>
                <Label className={labelCls}>Renda mensal gerada pelos imóveis</Label>
                <CurrencyInput
                  value={dados.rendaImovelMensal ?? 0}
                  onChange={(v) => setDados("rendaImovelMensal", v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Previdência */}
        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 10, border: `1px solid ${dados.possuiPrevidencia ? "#2563EB" : "#BFDBFE"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              checked={!!(dados.possuiPrevidencia ?? false)}
              onCheckedChange={(v) => setDados("possuiPrevidencia", v)}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>Possui previdência privada (PGBL/VGBL)?</p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>Plano de previdência complementar</p>
            </div>
          </div>
          {dados.possuiPrevidencia && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #BFDBFE", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 8px" }}>Tipo de plano</p>
                <div style={{ display: "flex", gap: 12 }}>
                  {(["pgbl", "vgbl"] as const).map((tipo) => {
                    const checked = tipo === "pgbl" ? isPGBL : isVGBL;
                    const toggle = tipo === "pgbl" ? togglePGBL : toggleVGBL;
                    return (
                      <label key={tipo} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggle(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563EB" }}
                        />
                        {tipo.toUpperCase()}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className={fieldCls}>
                <Label className={labelCls}>Saldo atual da previdência</Label>
                <CurrencyInput
                  value={dados.saldoPrevidencia ?? 0}
                  onChange={(v) => setDados("saldoPrevidencia", v)}
                />
              </div>
            </div>
          )}
        </div>
      </SecaoCard>

      {/* ─── SEÇÃO 3: Investimentos ─── */}
      <SecaoCard color="#1E40AF" Icon={PieChart} title="Investimentos" subtitle="Carteira atual e perfil de risco do cliente">

        <AtivoForm
          value={plan.ativosAtuais}
          suitabilityPerfil={dados.suitabilityPerfil}
          onChange={(v) => onChange({ ativosAtuais: v })}
          comecandoDoZero={dados.comecandoDoZero ?? false}
          onComecandoDoZeroChange={(v) => setDados("comecandoDoZero", v)}
        />

        {/* Perfil de Risco */}
        <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 24, paddingTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Perfil de Risco do Cliente
          </p>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
            Selecione o perfil conforme análise do consultor
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PERFIL_CARDS.map(({ perfil, label, alocacao, descricao, color, bgSelected, icon: PIcon }) => {
              const selected = dados.suitabilityPerfil === perfil;
              return (
                <button
                  key={perfil}
                  type="button"
                  onClick={() => setDados("suitabilityPerfil", perfil)}
                  style={{ border: selected ? `2px solid ${color}` : "1.5px solid #BFDBFE", borderRadius: 10, padding: "16px 18px", backgroundColor: selected ? bgSelected : "white", cursor: "pointer", textAlign: "left", position: "relative", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {selected && (
                    <span style={{ position: "absolute", top: 10, right: 12, width: 20, height: 20, borderRadius: "50%", backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>✓</span>
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

      {/* ─── SEÇÃO 4: Aposentadoria / IF ─── */}
      <SecaoCard color="#059669" Icon={Sunset} title="Aposentadoria / IF" subtitle="Parâmetros para planejamento de independência financeira">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {calculatedAge ? (
            <AutoField label="Idade atual" value={`${calculatedAge} anos`} hint="Calculado da data de nascimento" />
          ) : (
            <div className={fieldCls}>
              <Label className={labelCls}>Idade atual</Label>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Informe a data de nascimento</p>
            </div>
          )}

          <div className={fieldCls}>
            <Label className={labelCls}>Idade meta de aposentadoria</Label>
            <Input
              type="number"
              min={calculatedAge ? calculatedAge + 1 : 20}
              max={100}
              value={plan.planejamentoIF.idadeMeta}
              onChange={(e) => setIF("idadeMeta", Number(e.target.value))}
              className="border-[#BFDBFE]"
            />
            {anosRestantes > 0 && (
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{anosRestantes} anos restantes</p>
            )}
          </div>

          {dados.rendaMensal > 0 ? (
            <AutoField label="Renda mensal atual" value={formatCurrency(dados.rendaMensal)} hint="Da situação financeira" />
          ) : (
            <div className={fieldCls}>
              <Label className={labelCls}>Renda mensal atual</Label>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Informe na Situação Financeira</p>
            </div>
          )}

          <div className={fieldCls}>
            <Label className={labelCls}>Renda mensal desejada na IF</Label>
            <CurrencyInput
              value={plan.planejamentoIF.rendaMensalDesejada}
              onChange={(v) => setIF("rendaMensalDesejada", v)}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Quanto o cliente quer receber/mês na IF</p>
          </div>

          {dados.patrimonioFinanceiroEstimado > 0 ? (
            <AutoField label="Patrimônio financeiro atual" value={formatCurrency(dados.patrimonioFinanceiroEstimado)} hint="Da situação financeira" />
          ) : (
            <div className={fieldCls}>
              <Label className={labelCls}>Patrimônio financeiro atual</Label>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Informe na Situação Financeira</p>
            </div>
          )}

          {dados.aportesMensalMedio > 0 ? (
            <AutoField label="Aporte mensal médio" value={formatCurrency(dados.aportesMensalMedio)} hint="Da situação financeira" />
          ) : (
            <div className={fieldCls}>
              <Label className={labelCls}>Aporte mensal médio</Label>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Informe na Situação Financeira</p>
            </div>
          )}
        </div>
      </SecaoCard>

      {/* ─── SEÇÃO 5: Proteção e Sucessório ─── */}
      <SecaoCard color="#B91C1C" Icon={Shield} title="Proteção e Sucessório" subtitle="Seguros, proteção patrimonial e planejamento sucessório">
        <ProtecaoSucessorioForm
          protecao={plan.protecao}
          onProtecaoChange={(v) => onChange({ protecao: v })}
          sucessorio={plan.sucessorio}
          onSucessorioChange={(v) => onChange({ sucessorio: v })}
          dadosCliente={dados}
        />
      </SecaoCard>

      {/* ─── SEÇÃO 6: Planejamento Fiscal ─── */}
      <SecaoCard color="#B45309" Icon={FileText} title="Planejamento Fiscal" subtitle="Eficiência tributária, PGBL/VGBL e declaração de IR">
        <FiscalForm
          value={plan.fiscal}
          onChange={(v) => onChange({ fiscal: v })}
          dadosCliente={dados}
        />
      </SecaoCard>

    </div>
  );
}
