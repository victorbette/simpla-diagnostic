import { Briefcase, User, Building2, BadgeCheck, Shield, TrendingUp, BarChart2, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { FPSectionHeader } from "./layout/FPSectionHeader";
import { ALOCACAO_PADRAO } from "@/lib/carteira/calculos";
import type { DadosCliente, PerfilRisco } from "@/types/financialPlanning";
import { formatCurrency as _formatCurrency } from "@/lib/format";

const DARK = "#000000";
const AMBER = "#2563EB";
const GOLD = "#3B82F6";

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
  {
    perfil: "conservador",
    label: "Conservador",
    alocacao: "RF 92% · RV 4% · Internacional 4%",
    descricao: "Foco em preservação de capital e liquidez. Baixa tolerância a risco.",
    color: "#3B82F6",
    bgSelected: "#EAF0F5",
    icon: Shield,
  },
  {
    perfil: "conservador_moderado",
    label: "Conservador Moderado",
    alocacao: "RF 78% · RV 13% · Internacional 9%",
    descricao: "Equilíbrio com predominância em renda fixa e alguma exposição a RV.",
    color: "#1E40AF",
    bgSelected: "#EAF0F5",
    icon: TrendingUp,
  },
  {
    perfil: "moderado",
    label: "Moderado",
    alocacao: "RF 66% · RV 20% · Internacional 13%",
    descricao: "Equilíbrio entre segurança e crescimento. Aceita volatilidade moderada.",
    color: "#2563EB",
    bgSelected: "#EFF6FF",
    icon: BarChart2,
  },
  {
    perfil: "arrojado",
    label: "Arrojado",
    alocacao: "RF 52% · RV 29% · Internacional 17,5%",
    descricao: "Foco em crescimento. Alta tolerância a risco e volatilidade.",
    color: "#B91C1C",
    bgSelected: "#FEE2E2",
    icon: Zap,
  },
];

const CARD_LABELS: Record<string, string> = {
  resgate_rapido: "Resgate Rápido",
  resgate_longo: "Resgate Longo",
  acoes: "Ações",
  fiis: "FIIs",
  exterior: "Internacional",
  cripto: "Cripto",
};

interface Props {
  value: DadosCliente;
  onChange: (v: DadosCliente) => void;
  onComplete: (v: DadosCliente) => void;
}

export function ColetaDadosForm({ value, onChange, onComplete }: Props) {
  const set = <K extends keyof DadosCliente>(key: K, val: DadosCliente[K]) =>
    onChange({ ...value, [key]: val });

  const calculatedAge = value.dataNascimento
    ? new Date().getFullYear() - new Date(value.dataNascimento).getFullYear()
    : null;

  function selectPerfil(perfil: PerfilRisco) {
    onChange({ ...value, suitabilityPerfil: perfil });
  }

  function handleConfirmar() {
    onComplete(value);
  }

  const fieldCls = "flex flex-col gap-1.5";
  const labelCls = "text-[13px] font-medium text-[#111827]";
  const inputCls = "w-full border border-[#BFDBFE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[rgba(4,26,32,0.1)] bg-white";

  const selectedCard = value.suitabilityPerfil
    ? PERFIL_CARDS.find((c) => c.perfil === value.suitabilityPerfil)
    : null;
  const alocacaoSelecionada = value.suitabilityPerfil
    ? ALOCACAO_PADRAO[value.suitabilityPerfil]
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ══ Dados Pessoais ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FPSectionHeader
          title="Dados Pessoais"
          subtitle="Informações básicas do cliente"
          borderColor={GOLD}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className={fieldCls}>
            <Label className={labelCls}>Data de nascimento</Label>
            <Input
              type="date"
              value={value.dataNascimento}
              onChange={(e) => set("dataNascimento", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className={fieldCls}>
            <Label className={labelCls}>Idade</Label>
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 items-center px-3 rounded-lg border border-[#BFDBFE] bg-[#EAF0F5] text-sm font-semibold text-[#1E40AF] flex-1"
                style={{ borderLeft: "3px solid #3B82F6" }}
              >
                {calculatedAge ? `${calculatedAge} anos` : "—"}
              </div>
              {calculatedAge && (
                <span className="text-[10px] font-bold text-[#1E40AF] bg-[#EAF0F5] border border-[#A8C4D8] rounded px-1.5 py-0.5 whitespace-nowrap">
                  ✓ CALCULADO
                </span>
              )}
            </div>
          </div>

          <div className={fieldCls}>
            <Label className={labelCls}>Estado civil</Label>
            <Select
              value={value.estadoCivil}
              onValueChange={(v) => set("estadoCivil", v as DadosCliente["estadoCivil"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
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
              <Switch
                checked={value.temFilhos}
                onCheckedChange={(v) => set("temFilhos", v)}
              />
              {value.temFilhos && (
                <Input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="Qtd."
                  value={value.numeroFilhos || ""}
                  onChange={(e) => set("numeroFilhos", parseInt(e.target.value, 10) || 0)}
                  className="w-20 text-center"
                />
              )}
            </div>
          </div>

          <div className={fieldCls}>
            <Label className={labelCls}>Cidade</Label>
            <Input
              value={value.cidade}
              onChange={(e) => set("cidade", e.target.value)}
              placeholder="Ex: São Paulo"
            />
          </div>

          <div className={fieldCls}>
            <Label className={labelCls}>Estado (UF)</Label>
            <Select
              value={value.estado}
              onValueChange={(v) => set("estado", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF..." />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ══ Situação Financeira ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <FPSectionHeader
          title="Situação Financeira"
          subtitle="Patrimônio, renda e fluxo mensal"
          borderColor="#3B82F6"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { label: "Patrimônio total estimado", key: "patrimonioTotalEstimado" as const, hint: "Inclui imóveis e bens" },
            { label: "Patrimônio financeiro", key: "patrimonioFinanceiroEstimado" as const, hint: "Apenas investimentos" },
            { label: "Renda mensal", key: "rendaMensal" as const },
            { label: "Custo de vida mensal", key: "custoDeVidaMensal" as const },
            { label: "Aporte mensal médio", key: "aportesMensalMedio" as const, hint: "Média mensal" },
          ].map(({ label, key, hint }) => (
            <div key={key} className={fieldCls}>
              <Label className={labelCls}>{label}</Label>
              <CurrencyInput
                value={value[key]}
                onChange={(v) => set(key, v)}
              />
              {hint && (
                <p className="text-[11px] text-[#9CA3AF] italic">{hint}</p>
              )}
            </div>
          ))}
        </div>

        {/* Gasto no cartão */}
        <div className={fieldCls}>
          <Label className={labelCls}>Quanto gasta por mês no cartão de crédito?</Label>
          <CurrencyInput
            value={value.gastoCartaoMensal}
            onChange={(v) => set("gastoCartaoMensal", v)}
          />
          <p className="text-[11px] text-[#9CA3AF] italic">
            Some todas as faturas do mês, incluindo cartões adicionais
          </p>
        </div>

        {/* Perfil de viagens */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <Label className={labelCls}>Perfil de viagens</Label>
            <p className="text-[11px] text-[#9CA3AF] italic">
              Usado para planejamento de reserva de emergência e seguros
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div
              style={{
                borderRadius: 10,
                border: "1px solid #BFDBFE",
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <Switch
                checked={value.fazViagensNacionais}
                onCheckedChange={(v) => set("fazViagensNacionais", v)}
                style={value.fazViagensNacionais ? { backgroundColor: "#1E3A8A" } : undefined}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>
                  Viagens nacionais
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                  Viaja dentro do Brasil regularmente
                </p>
              </div>
            </div>
            <div
              style={{
                borderRadius: 10,
                border: "1px solid #BFDBFE",
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <Switch
                checked={value.fazViagensInternacionais}
                onCheckedChange={(v) => set("fazViagensInternacionais", v)}
                style={value.fazViagensInternacionais ? { backgroundColor: "#1E3A8A" } : undefined}
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#000000", margin: 0 }}>
                  Viagens internacionais
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                  Viaja para o exterior
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Proteção Atual ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Proteção Atual"
          subtitle="Seguros de vida e invalidez existentes"
          borderColor="#B91C1C"
        />

        <div style={{ borderRadius: 10, border: "1px solid #BFDBFE", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch checked={value.temSeguroVida} onCheckedChange={(v) => set("temSeguroVida", v)} />
              <Label className={labelCls + " cursor-pointer"}>Possui seguro de vida?</Label>
            </div>
            {value.temSeguroVida && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280 }} className={fieldCls}>
                <Label className="text-[12px] text-[#6B7280]">Valor da apólice</Label>
                <CurrencyInput value={value.valorApoliceVida} onChange={(v) => set("valorApoliceVida", v)} />
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch checked={value.temSeguroInvalidez} onCheckedChange={(v) => set("temSeguroInvalidez", v)} />
              <Label className={labelCls + " cursor-pointer"}>Possui seguro de invalidez?</Label>
            </div>
            {value.temSeguroInvalidez && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280 }} className={fieldCls}>
                <Label className="text-[12px] text-[#6B7280]">Valor da apólice</Label>
                <CurrencyInput value={value.valorApoliceInvalidez} onChange={(v) => set("valorApoliceInvalidez", v)} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ Vínculo Profissional ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Vínculo Profissional"
          subtitle="Tipo de relação com o mercado de trabalho"
          borderColor="#6B7280"
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {VINCULO_OPTIONS.map(({ key, label, Icon }) => {
            const selected = value.tipoTrabalho === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("tipoTrabalho", key)}
                style={{
                  border: selected ? `2px solid ${GOLD}` : "1.5px solid #BFDBFE",
                  borderRadius: 10,
                  padding: "16px 12px",
                  backgroundColor: selected ? DARK : "white",
                  color: selected ? "white" : "#111827",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  position: "relative",
                  transition: "all 0.15s",
                }}
              >
                {selected && (
                  <span style={{ position: "absolute", top: 8, right: 8, backgroundColor: GOLD, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: DARK, fontWeight: 700 }}>
                    ✓
                  </span>
                )}
                <Icon size={22} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══ Perfil de Risco ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Perfil de Risco"
          subtitle="Selecione o perfil de risco do cliente conforme análise do consultor"
          borderColor={AMBER}
        />

        {/* 4 profile cards in 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {PERFIL_CARDS.map(({ perfil, label, alocacao, descricao, color, bgSelected, icon: Icon }) => {
            const selected = value.suitabilityPerfil === perfil;
            return (
              <button
                key={perfil}
                type="button"
                onClick={() => selectPerfil(perfil)}
                style={{
                  border: selected ? `2px solid ${color}` : "1.5px solid #BFDBFE",
                  borderRadius: 10,
                  padding: "16px 18px",
                  backgroundColor: selected ? bgSelected : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {selected && (
                  <span style={{ position: "absolute", top: 10, right: 12, width: 20, height: 20, borderRadius: "50%", backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                    ✓
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon style={{ width: 20, height: 20, color }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{label}</span>
                </div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0, fontWeight: 500 }}>{alocacao}</p>
                <p style={{ fontSize: 12, color: "#111827", margin: 0, lineHeight: 1.5 }}>{descricao}</p>
              </button>
            );
          })}
        </div>

        {/* Confirmation card */}
        {selectedCard && alocacaoSelecionada && (
          <div style={{ border: `1.5px solid ${selectedCard.color}`, borderRadius: 10, padding: "16px 20px", backgroundColor: selectedCard.bgSelected, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: selectedCard.color, margin: 0 }}>
              ✓ Perfil selecionado: {selectedCard.label}
            </p>

            {/* Allocation table */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                Alocação recomendada (Padrão Simpla)
              </p>
              <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #BFDBFE" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", backgroundColor: "#F0F7FF", padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                  <span>Classe</span>
                  <span>% Recomendado</span>
                </div>
                {Object.entries(alocacaoSelecionada)
                  .filter(([, v]) => v > 0)
                  .map(([key, pct], i, arr) => (
                    <div
                      key={key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        padding: "8px 12px",
                        backgroundColor: "white",
                        borderTop: i === 0 ? "1px solid #BFDBFE" : undefined,
                        borderBottom: i < arr.length - 1 ? "1px solid #F0F7FF" : undefined,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#111827" }}>{CARD_LABELS[key] ?? key}</span>
                      <span style={{ fontWeight: 700, color: selectedCard.color }}>{pct}%</span>
                    </div>
                  ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmar}
              style={{ alignSelf: "flex-start", backgroundColor: selectedCard.color, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Confirmar perfil e continuar →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
