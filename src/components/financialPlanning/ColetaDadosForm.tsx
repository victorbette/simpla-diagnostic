import { useState } from "react";
import { Briefcase, User, Building2, BadgeCheck, ChevronRight, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurrencyInput";
import { FPSectionHeader } from "./layout/FPSectionHeader";
import { cn } from "@/lib/utils";
import {
  SUITABILITY_PERGUNTAS,
  ALOCACAO_ALVO,
  PERFIL_LABELS,
  calcularPerfil,
} from "@/types/financialPlanning";
import type { DadosCliente, SuitabilityResposta, PerfilRisco } from "@/types/financialPlanning";
import { formatCurrency as _formatCurrency } from "@/lib/format";

const DARK = "#041A20";
const AMBER = "#F59E0B";
const GOLD = "#BBA866";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const PROFILE_COLORS: Record<PerfilRisco, string> = {
  conservador: "bg-blue-100 text-blue-800",
  conservador_moderado: "bg-teal-100 text-teal-800",
  moderado: "bg-amber-100 text-amber-800",
  arrojado: "bg-rose-100 text-rose-800",
};

const VINCULO_OPTIONS: { key: DadosCliente["tipoTrabalho"]; label: string; Icon: React.ElementType }[] = [
  { key: "clt", label: "CLT", Icon: Briefcase },
  { key: "autonomo", label: "Autônomo", Icon: User },
  { key: "empresario", label: "Empresário", Icon: Building2 },
  { key: "concursado", label: "Concursado", Icon: BadgeCheck },
];

const inputCls =
  "w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#041A20] focus:ring-2 focus:ring-[rgba(4,26,32,0.1)] bg-white";

interface Props {
  value: DadosCliente;
  onChange: (v: DadosCliente) => void;
  onComplete: (v: DadosCliente) => void;
}

export function ColetaDadosForm({ value, onChange, onComplete }: Props) {
  const set = <K extends keyof DadosCliente>(key: K, val: DadosCliente[K]) =>
    onChange({ ...value, [key]: val });

  const [qIndex, setQIndex] = useState(0);
  const [respostas, setRespostas] = useState<Map<string, SuitabilityResposta>>(() => {
    const m = new Map<string, SuitabilityResposta>();
    value.suitabilityRespostas.forEach((r) => m.set(r.perguntaId, r));
    return m;
  });
  const [suitResult, setSuitResult] = useState<PerfilRisco | null>(
    value.suitabilityPerfil
  );

  // Calculated age
  const calculatedAge = value.dataNascimento
    ? new Date().getFullYear() - new Date(value.dataNascimento).getFullYear()
    : null;

  const total = SUITABILITY_PERGUNTAS.length;
  const pergunta = SUITABILITY_PERGUNTAS[qIndex];
  const respostaSelecionada = respostas.get(pergunta?.id ?? "");
  const isLastQ = qIndex === total - 1;
  const progressPct = ((qIndex + 1) / total) * 100;

  function selectOption(valor: number) {
    setRespostas((prev) => {
      const next = new Map(prev);
      next.set(pergunta.id, { perguntaId: pergunta.id, valor });
      return next;
    });
  }

  function handleSuitNext() {
    if (!respostaSelecionada) return;
    if (isLastQ) {
      const allRespostas = Array.from(respostas.values());
      const calc = calcularPerfil(allRespostas);
      setSuitResult(calc.perfil);
      onChange({
        ...value,
        suitabilityRespostas: allRespostas,
        suitabilityPerfil: calc.perfil,
        suitabilityPontuacao: calc.totalPontos,
      });
    } else {
      setQIndex((i) => i + 1);
    }
  }

  function handleConfirmarPerfil() {
    const updated: DadosCliente = {
      ...value,
      suitabilityRespostas: Array.from(respostas.values()),
    };
    onComplete(updated);
  }

  const fieldCls = "flex flex-col gap-1.5";
  const labelCls = "text-[13px] font-medium text-[#374151]";

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
          {/* Data de nascimento */}
          <div className={fieldCls}>
            <Label className={labelCls}>Data de nascimento</Label>
            <Input
              type="date"
              value={value.dataNascimento}
              onChange={(e) => set("dataNascimento", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Idade calculada */}
          <div className={fieldCls}>
            <Label className={labelCls}>Idade</Label>
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 items-center px-3 rounded-lg border border-[#E5E7EB] bg-[#F0FDFA] text-sm font-semibold text-[#0F766E] flex-1"
                style={{ borderLeft: "3px solid #46BDC6" }}
              >
                {calculatedAge ? `${calculatedAge} anos` : "—"}
              </div>
              {calculatedAge && (
                <span className="text-[10px] font-bold text-[#0F766E] bg-[#F0FDFA] border border-[#99F6E4] rounded px-1.5 py-0.5 whitespace-nowrap">
                  ✓ CALCULADO
                </span>
              )}
            </div>
          </div>

          {/* Estado civil */}
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

          {/* Tem filhos */}
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

          {/* Cidade */}
          <div className={fieldCls}>
            <Label className={labelCls}>Cidade</Label>
            <Input
              value={value.cidade}
              onChange={(e) => set("cidade", e.target.value)}
              placeholder="Ex: São Paulo"
            />
          </div>

          {/* Estado */}
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
          borderColor="#46BDC6"
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
                <p className="text-[11px] text-[#9CA3AF] italic">{hint}</p>
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
          borderColor="#F87171"
        />

        <div
          style={{
            borderRadius: 10,
            border: "1px solid #E5E7EB",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Seguro vida */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                checked={value.temSeguroVida}
                onCheckedChange={(v) => set("temSeguroVida", v)}
              />
              <Label className={labelCls + " cursor-pointer"}>
                Possui seguro de vida?
              </Label>
            </div>
            {value.temSeguroVida && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280 }} className={fieldCls}>
                <Label className="text-[12px] text-[#6B7280]">Valor da apólice</Label>
                <CurrencyInput
                  value={value.valorApoliceVida}
                  onChange={(v) => set("valorApoliceVida", v)}
                />
              </div>
            )}
          </div>

          {/* Seguro invalidez */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch
                checked={value.temSeguroInvalidez}
                onCheckedChange={(v) => set("temSeguroInvalidez", v)}
              />
              <Label className={labelCls + " cursor-pointer"}>
                Possui seguro de invalidez?
              </Label>
            </div>
            {value.temSeguroInvalidez && (
              <div style={{ marginLeft: 44, marginTop: 12, maxWidth: 280 }} className={fieldCls}>
                <Label className="text-[12px] text-[#6B7280]">Valor da apólice</Label>
                <CurrencyInput
                  value={value.valorApoliceInvalidez}
                  onChange={(v) => set("valorApoliceInvalidez", v)}
                />
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
          borderColor="#A78BFA"
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
                  border: selected ? `2px solid ${GOLD}` : "1.5px solid #E5E7EB",
                  borderRadius: 10,
                  padding: "16px 12px",
                  backgroundColor: selected ? DARK : "white",
                  color: selected ? "white" : "#374151",
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
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: GOLD,
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: DARK,
                      fontWeight: 700,
                    }}
                  >
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
          title="Perfil de Risco — Suitability ANBIMA"
          subtitle="Responda as perguntas para definir o perfil de investidor"
          borderColor={AMBER}
        />

        {!suitResult ? (
          <div
            style={{
              border: "1.5px solid #FDE68A",
              borderRadius: 10,
              padding: 20,
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Progress */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 6,
                }}
              >
                <span>Pergunta {qIndex + 1} de {total}</span>
                <Badge
                  style={{
                    backgroundColor: "#FEF3C7",
                    color: "#B45309",
                    fontSize: 11,
                    border: "none",
                  }}
                >
                  {Math.round(progressPct)}%
                </Badge>
              </div>
              <Progress
                value={progressPct}
                className="h-1.5"
                style={{ "--progress-background": AMBER } as React.CSSProperties}
              />
            </div>

            {/* Question */}
            <p style={{ fontSize: 15, fontWeight: 600, color: DARK, margin: 0 }}>
              {pergunta.pergunta}
            </p>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pergunta.opcoes.map((opcao) => {
                const selected = respostaSelecionada?.valor === opcao.valor;
                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => selectOption(opcao.valor)}
                    style={{
                      border: selected ? `2px solid ${AMBER}` : "1.5px solid #E5E7EB",
                      borderRadius: 8,
                      padding: "12px 16px",
                      backgroundColor: selected ? "#FFFBEB" : "white",
                      color: selected ? "#92400E" : "#374151",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 14,
                      fontWeight: selected ? 600 : 400,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.1s",
                    }}
                  >
                    {opcao.texto}
                    {selected && <CheckCircle2 size={16} color={AMBER} />}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => qIndex > 0 && setQIndex((i) => i - 1)}
                disabled={qIndex === 0}
                style={{
                  background: "none",
                  border: "none",
                  color: qIndex === 0 ? "#D1D5DB" : AMBER,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: qIndex === 0 ? "not-allowed" : "pointer",
                }}
              >
                ← Anterior
              </button>
              <button
                type="button"
                disabled={!respostaSelecionada}
                onClick={handleSuitNext}
                style={{
                  backgroundColor: respostaSelecionada ? AMBER : "#E5E7EB",
                  color: respostaSelecionada ? "white" : "#9CA3AF",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: respostaSelecionada ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isLastQ ? "Ver resultado" : "Próxima"}
                {!isLastQ && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        ) : (
          /* Result card */
          <div
            style={{
              border: `1.5px solid #FDE68A`,
              borderRadius: 10,
              padding: 20,
              backgroundColor: "#FFFBEB",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: 0 }}>
                Perfil identificado:
              </p>
              <span
                className={cn("px-3 py-1 rounded-full text-sm font-bold", PROFILE_COLORS[suitResult])}
              >
                {PERFIL_LABELS[suitResult]}
              </span>
            </div>

            {/* Macroalocação */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                Macroalocação sugerida
              </p>
              {(Object.entries(ALOCACAO_ALVO[suitResult]) as [string, number][]).filter(([,v]) => v > 0).map(([key, pct]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ width: 120, color: "#6B7280", flexShrink: 0 }}>
                    {key === "rendaFixa" ? "Renda Fixa" : key === "rvGlobal" ? "RV Global" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <div style={{ flex: 1, height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${pct}%`, backgroundColor: AMBER, borderRadius: 3 }} />
                  </div>
                  <span style={{ width: 36, textAlign: "right", fontWeight: 600 }}>{pct}%</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setSuitResult(null);
                  setQIndex(0);
                }}
                style={{
                  border: "1.5px solid #E5E7EB",
                  backgroundColor: "white",
                  color: "#374151",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Refazer
              </button>
              <button
                type="button"
                onClick={handleConfirmarPerfil}
                style={{
                  backgroundColor: AMBER,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={16} />
                Confirmar perfil e continuar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
