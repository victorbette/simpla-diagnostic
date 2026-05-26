import {
  Briefcase, User, Building2, BadgeCheck, Shield, TrendingUp, BarChart2, Zap,
  DollarSign, PieChart, Sunset, FileText,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { ALOCACAO_PADRAO } from "@/lib/carteira/calculos";
import { AtivoForm } from "./AtivoForm";
import { PlanejamentoIFForm } from "./PlanejamentoIFForm";
import { ProtecaoSucessorioForm } from "./ProtecaoSucessorioForm";
import { FiscalForm } from "./FiscalForm";
import type { FinancialPlan, DadosCliente, PerfilRisco } from "@/types/financialPlanning";

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

const CARD_LABELS: Record<string, string> = {
  resgate_rapido: "Resgate Rápido", resgate_longo: "Resgate Longo",
  acoes: "Ações", fiis: "FIIs", exterior: "Internacional", cripto: "Cripto",
};

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

export function ColetaDadosCompleta({ plan, onChange, onColetaComplete }: Props) {
  const dados = plan.dadosCliente;

  const setDados = <K extends keyof DadosCliente>(key: K, val: DadosCliente[K]) =>
    onChange({ dadosCliente: { ...dados, [key]: val } });

  const calculatedAge = dados.dataNascimento
    ? new Date().getFullYear() - new Date(dados.dataNascimento).getFullYear()
    : null;

  const selectedCard = dados.suitabilityPerfil
    ? PERFIL_CARDS.find((c) => c.perfil === dados.suitabilityPerfil)
    : null;
  const alocacaoSelecionada = dados.suitabilityPerfil
    ? ALOCACAO_PADRAO[dados.suitabilityPerfil]
    : null;

  const clientPerfil = dados.suitabilityPerfil ?? null;
  const labelCls = "text-[13px] font-medium text-[#111827]";
  const fieldCls = "flex flex-col gap-1.5";

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
            <div style={{ display: "flex", alignItems: "center", gap: 12, height: 40 }}>
              <Switch checked={!!dados.temFilhos} onCheckedChange={(v) => setDados("temFilhos", v)} />
              {dados.temFilhos && (
                <Input
                  type="number" min={1} max={20} placeholder="Qtd."
                  value={dados.numeroFilhos || ""}
                  onChange={(e) => setDados("numeroFilhos", parseInt(e.target.value, 10) || 0)}
                  className="w-20 text-center"
                />
              )}
            </div>
          </div>

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

        {/* Viagens */}
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
      <SecaoCard color="#15803D" Icon={DollarSign} title="Situação Financeira" subtitle="Patrimônio, renda e fluxo mensal">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {([
            { label: "Patrimônio total estimado", key: "patrimonioTotalEstimado", hint: "Inclui imóveis e bens" },
            { label: "Patrimônio financeiro", key: "patrimonioFinanceiroEstimado", hint: "Apenas investimentos" },
            { label: "Renda mensal", key: "rendaMensal" },
            { label: "Custo de vida mensal", key: "custoDeVidaMensal" },
            { label: "Aporte mensal médio", key: "aportesMensalMedio", hint: "Média mensal" },
            { label: "Gasto mensal no cartão", key: "gastoCartaoMensal", hint: "Some todas as faturas" },
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
      </SecaoCard>

      {/* ─── SEÇÃO 3: Patrimônio Atual ─── */}
      <SecaoCard color="#1E40AF" Icon={PieChart} title="Patrimônio Atual" subtitle="Carteira de investimentos detalhada por classe de ativo">
        <AtivoForm
          value={plan.ativosAtuais}
          suitabilityPerfil={clientPerfil}
          onChange={(v) => onChange({ ativosAtuais: v })}
          dadosCliente={dados}
        />
      </SecaoCard>

      {/* ─── SEÇÃO 4: Aposentadoria / IF ─── */}
      <SecaoCard color="#059669" Icon={Sunset} title="Aposentadoria / IF" subtitle="Planejamento de independência financeira e aposentadoria">
        <PlanejamentoIFForm
          value={plan.planejamentoIF}
          onChange={(v) => onChange({ planejamentoIF: v })}
          dadosCliente={dados}
        />
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

      {/* ─── SEÇÃO 7: Perfil de Risco ─── */}
      <SecaoCard color="#7C3AED" Icon={BarChart2} title="Perfil de Risco" subtitle="Selecione o perfil de risco do cliente conforme análise do consultor">
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

        {selectedCard && alocacaoSelecionada && (
          <div style={{ marginTop: 16, border: `1.5px solid ${selectedCard.color}`, borderRadius: 10, padding: "16px 20px", backgroundColor: selectedCard.bgSelected, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: selectedCard.color, margin: 0 }}>
              ✓ Perfil selecionado: {selectedCard.label}
            </p>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                Alocação recomendada (Padrão Simpla)
              </p>
              <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #BFDBFE" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", backgroundColor: "#F0F7FF", padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                  <span>Classe</span><span>% Recomendado</span>
                </div>
                {Object.entries(alocacaoSelecionada)
                  .filter(([, v]) => v > 0)
                  .map(([key, pct], i, arr) => (
                    <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "8px 12px", backgroundColor: "white", borderTop: i === 0 ? "1px solid #BFDBFE" : undefined, borderBottom: i < arr.length - 1 ? "1px solid #F0F7FF" : undefined, fontSize: 13 }}>
                      <span style={{ color: "#111827" }}>{CARD_LABELS[key] ?? key}</span>
                      <span style={{ fontWeight: 700, color: selectedCard.color }}>{pct}%</span>
                    </div>
                  ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onColetaComplete(dados)}
              style={{ alignSelf: "flex-start", backgroundColor: selectedCard.color, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Aplicar perfil e sincronizar dados →
            </button>
          </div>
        )}
      </SecaoCard>

    </div>
  );
}
