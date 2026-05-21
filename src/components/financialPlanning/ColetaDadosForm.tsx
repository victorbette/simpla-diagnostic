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
const AMBER = "#8A7A45";
const GOLD = "#BBA866";

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
    color: "#BBA866",
    bgSelected: "#EAF0F5",
    icon: Shield,
  },
  {
    perfil: "conservador_moderado",
    label: "Conservador Moderado",
    alocacao: "RF 78% · RV 13% · Internacional 9%",
    descricao: "Equilíbrio com predominância em renda fixa e alguma exposição a RV.",
    color: "#2A4F6A",
    bgSelected: "#EAF0F5",
    icon: TrendingUp,
  },
  {
    perfil: "moderado",
    label: "Moderado",
    alocacao: "RF 66% · RV 20% · Internacional 13%",
    descricao: "Equilíbrio entre segurança e crescimento. Aceita volatilidade moderada.",
    color: "#8A7A45",
    bgSelected: "#F5F0E0",
    icon: BarChart2,
  },
  {
    perfil: "arrojado",
    label: "Arrojado",
    alocacao: "RF 52% · RV 29% · Internacional 17,5%",
    descricao: "Foco em crescimento. Alta tolerância a risco e volatilidade.",
    color: "#7A3535",
    bgSelected: "#F2EBEB",
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
  const labelCls = "text-[13px] font-medium text-[#3D3520]";
  const inputCls = "w-full border border-[#E2DCC8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#000000] focus:ring-2 focus:ring-[rgba(4,26,32,0.1)] bg-white";

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
                className="flex h-10 items-center px-3 rounded-lg border border-[#E2DCC8] bg-[#EAF0F5] text-sm font-semibold text-[#2A4F6A] flex-1"
                style={{ borderLeft: "3px solid #BBA866" }}
              >
                {calculatedAge ? `${calculatedAge} anos` : "—"}
              </div>
              {calculatedAge && (
                <span className="text-[10px] font-bold text-[#2A4F6A] bg-[#EAF0F5] border border-[#A8C4D8] rounded px-1.5 py-0.5 whitespace-nowrap">
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
          borderColor="#BBA866"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { label: "Patrimônio total estimado", key: "patrimonioTotalEstimado" as const, hint: "Inclui imóveis e bens" },
            { label: "Patrimônio financeiro", key: "patrimonioFinanceiroEstimado" as const, hint: "Apenas investimentos" },
            { label: "Renda mensal", key: "rendaMensal" as const },
            { label: "Custo de vida mensal", key: "custoDeVidaMensal" as const },
            { label: "Aporte mensal médio", key: "aportesMensalMedio" as const, hint: "Média mensal" },
            { label: "Fatura mensal do cartão", key: "valorFaturaCartao" as const, hint: "Gasto familiar total" },
          ].map(({ label, key, hint }) => (
            <div key={key} className={fieldCls}>
              <Label className={labelCls}>{label}</Label>
              <CurrencyInput
                value={value[key]}
                onChange={(v) => set(key, v)}
              />
              {hint && (
                <p className="text-[11px] text-[#9E9070] italic">{hint}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ Proteção Atual ══ */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FPSectionHeader
          title="Proteção Atual"
          subtitle="Seguros de vida e invalidez existentes"
          borderColor="#7A3535"
        />

        <div style={{ borderRadius: 10, border: "1px solid #E2DCC8", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch checked={value.temSeguroVida} onCheckedChange={(v) => set("temSeguroVida", v)} />
              <Label className={labelCls + " cursor-pointer"}>Possui seguro de vida?</Label>
            </div>
            {value.temSeguroVida && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280 }} className={fieldCls}>
                <Label className="text-[12px] text-[#6B6347]">Valor da apólice</Label>
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
                <Label className="text-[12px] text-[#6B6347]">Valor da apólice</Label>
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
          borderColor="#6B6347"
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
                  border: selected ? `2px solid ${GOLD}` : "1.5px solid #E2DCC8",
                  borderRadius: 10,
                  padding: "16px 12px",
                  backgroundColor: selected ? DARK : "white",
                  color: selected ? "white" : "#3D3520",
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
                  border: selected ? `2px solid ${color}` : "1.5px solid #E2DCC8",
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
                <p style={{ fontSize: 11, color: "#6B6347", margin: 0, fontWeight: 500 }}>{alocacao}</p>
                <p style={{ fontSize: 12, color: "#3D3520", margin: 0, lineHeight: 1.5 }}>{descricao}</p>
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
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6B6347", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                Alocação recomendada (Padrão Simpla)
              </p>
              <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #E2DCC8" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", backgroundColor: "#F5F3EE", padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#6B6347", textTransform: "uppercase" }}>
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
                        borderTop: i === 0 ? "1px solid #E2DCC8" : undefined,
                        borderBottom: i < arr.length - 1 ? "1px solid #F5F3EE" : undefined,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#3D3520" }}>{CARD_LABELS[key] ?? key}</span>
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
