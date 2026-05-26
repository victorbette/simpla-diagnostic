import { ClipboardCheck, Sunset, Shield, Receipt, GitBranch } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import type { FinancialPlan } from "@/types/financialPlanning";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface FinancialPlanDashboardProps {
  plan: FinancialPlan;
  clientName: string;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onPrint: (type: "advisor" | "client") => void;
  onAvancarEstrategia: () => void;
  allStepsDone?: boolean;
  ultimoSalvo?: Date | null;
}

// ─── ITCMD por estado ──────────────────────────────────────────────────────────

function calcularAliquotaITCMD(estado: string): number {
  const aliquotas: Record<string, number> = {
    AC: 0.04, AL: 0.04, AP: 0.04, AM: 0.02,
    BA: 0.08, CE: 0.08, DF: 0.06, ES: 0.04,
    GO: 0.04, MA: 0.04, MT: 0.04, MS: 0.06,
    MG: 0.05, PA: 0.04, PB: 0.04, PR: 0.04,
    PE: 0.08, PI: 0.04, RJ: 0.08, RN: 0.03,
    RS: 0.06, RO: 0.04, RR: 0.04, SC: 0.08,
    SP: 0.04, SE: 0.08, TO: 0.02,
  };
  return aliquotas[estado?.toUpperCase()] ?? 0.04;
}

// ─── Gauge semicircular ────────────────────────────────────────────────────────

function GaugeHeader({ score, color }: { score: number; color: string }) {
  const r = 36, cx = 44, cy = 44;
  const circ = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <svg width="88" height="50" viewBox="0 0 88 50">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
    </svg>
  );
}

function GaugeCard({ score, color, semDados }: { score: number; color: string; semDados?: boolean }) {
  const r = 36, cx = 44, cy = 44;
  const circ = Math.PI * r;
  const filled = semDados ? 0 : (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <svg viewBox="0 0 88 52" style={{ width: "100%", height: 80 }} preserveAspectRatio="xMidYMid meet">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      {!semDados && filled > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} />
      )}
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="20" fontWeight="700" fill={semDados ? "#9CA3AF" : color}>
        {semDados ? "—" : score}
      </text>
      <text x={cx} y={cy - 12} dy="14" textAnchor="middle" fontSize="9" fill="#9CA3AF">/100</text>
    </svg>
  );
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

function nivelScore(s: number): { label: string; cor: string; bg: string } {
  if (s >= 70) return { label: "Adequado", cor: "#15803D", bg: "#DCFCE7" };
  if (s >= 40) return { label: "Atenção",  cor: "#B45309", bg: "#FEF3C7" };
  return            { label: "Risco",    cor: "#B91C1C", bg: "#FEE2E2" };
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const n = nivelScore(score);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: n.bg, color: n.cor }}>
      {n.label}
    </span>
  );
}

function CardHeader({ Icon, title, score, color }: {
  Icon: React.ElementType; title: string; score: number; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <Icon style={{ width: 20, height: 20, color }} />
      <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</p>
      <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 4, backgroundColor: "#F0F7FF", color: "#111827" }}>{score}/100</span>
      <ScoreBadge score={score} />
    </div>
  );
}

function MetricGrid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ backgroundColor: "#F8FAFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color ?? "#111827", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: ok ? "#DCFCE7" : "#FEE2E2", color: ok ? "#15803D" : "#B91C1C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {ok ? "✓" : "✗"}
      </span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", margin: 0 }}>{label}</p>
        {detail && <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>{detail}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function FinancialPlanDashboard({
  plan,
  clientName,
  onAvancarEstrategia,
}: FinancialPlanDashboardProps) {
  const dc       = plan.dadosCliente;
  const pif      = plan.planejamentoIF;
  const protecao = plan.protecao;
  const suc      = plan.sucessorio;
  const fiscal   = plan.fiscal;

  // ── Renda total ─────────────────────────────────────────────────────────────
  const rendaMensal      = Number(dc.rendaMensal) || 0;
  const rendaImovel      = dc.possuiImovelRenda ? (Number(dc.rendaImovelMensal) || 0) : 0;
  const rendaMensalTotal = rendaMensal + rendaImovel;
  const rendaAnualTotal  = rendaMensalTotal * 12;

  // ── Patrimônio ───────────────────────────────────────────────────────────────
  const patrimonioFinanceiro = Number(dc.patrimonioFinanceiroEstimado) || 0;
  const patrimonioTotal      = Number(dc.patrimonioTotalEstimado) || 0;

  // ── Aporte ───────────────────────────────────────────────────────────────────
  const aporteMensal = Number(dc.aportesMensalMedio) || 0;

  // ── Idade ────────────────────────────────────────────────────────────────────
  const idadeAtual = dc.dataNascimento
    ? Math.floor((Date.now() - new Date(dc.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  // ── IF ───────────────────────────────────────────────────────────────────────
  const idadeMeta     = Number(pif.idadeMeta) || 60;
  const rendaDesejada = Number(pif.rendaMensalDesejada) || 0;

  const TAXA_RETIRADA_MENSAL = Math.pow(1.04, 1 / 12) - 1;
  const mesesRetirada       = (90 - idadeMeta) * 12;
  const patrimonioNecessario = rendaDesejada > 0
    ? rendaDesejada * (1 - Math.pow(1 + TAXA_RETIRADA_MENSAL, -mesesRetirada)) / TAXA_RETIRADA_MENSAL
    : 0;

  const taxaRealMensal  = Math.pow(1.067, 1 / 12) - 1;
  const mesesAcumulacao = (idadeMeta - idadeAtual) * 12;
  const projecaoIF = mesesAcumulacao > 0
    ? patrimonioFinanceiro * Math.pow(1 + taxaRealMensal, mesesAcumulacao)
      + aporteMensal * (Math.pow(1 + taxaRealMensal, mesesAcumulacao) - 1) / taxaRealMensal
    : patrimonioFinanceiro;
  const gapIF = patrimonioNecessario - projecaoIF;

  // ── Proteção ─────────────────────────────────────────────────────────────────
  const valorSeguroVida     = Number(protecao.capitalSeguradoVida) || 0;
  const valorSeguroInvalidez = Number(protecao.capitalSeguradoInvalidez) || 0;
  const capitalAtual        = valorSeguroVida + valorSeguroInvalidez;
  const capitalNecessario   = rendaMensalTotal * 12 * 15;
  const gapProtecao         = capitalNecessario - capitalAtual;

  // ── Fiscal ───────────────────────────────────────────────────────────────────
  const rendaAnualFiscal = Number(fiscal.rendaBrutaAnual) || rendaAnualTotal;
  const tetoPGBL         = rendaAnualFiscal * 0.12;
  const saldoPrevidencia = Number(dc.saldoPrevidencia) || 0;
  const pgblAtual        = dc.possuiPrevidencia ? saldoPrevidencia : 0;
  const espacoPGBL       = Math.max(0, tetoPGBL - pgblAtual);

  // ── Sucessório ───────────────────────────────────────────────────────────────
  const estado       = dc.estado || "SP";
  const aliquota     = calcularAliquotaITCMD(estado);
  const itcmdEstimado  = patrimonioTotal * aliquota;
  const custoInventario = patrimonioTotal * 0.10;

  // ── Scores ───────────────────────────────────────────────────────────────────
  const scoreIF = (() => {
    if (!rendaDesejada || patrimonioNecessario === 0) return 0;
    return Math.min(100, Math.round((projecaoIF / patrimonioNecessario) * 100));
  })();

  const scoreProtecao = (() => {
    if (capitalNecessario === 0) return 50;
    if (capitalAtual === 0) return 0;
    return Math.min(100, Math.round((capitalAtual / capitalNecessario) * 100));
  })();

  const scoreFiscal = (() => {
    let s = 0;
    if (fiscal.tipoDeclaracao && fiscal.tipoDeclaracao !== "nao_sei") s += 30;
    if (dc.possuiPrevidencia) s += 40;
    if (tetoPGBL > 0 && espacoPGBL < tetoPGBL * 0.3) s += 30;
    return s;
  })();

  const scoreSucessorio = (() => {
    let s = 0;
    if (suc.possuiTestamento) s += 35;
    if (suc.possuiHolding) s += 35;
    if (suc.seguroComBeneficiario || suc.previdenciaComBeneficiario) s += 30;
    return s;
  })();

  const scoreGeral = Math.round((scoreIF + scoreProtecao + scoreFiscal + scoreSucessorio) / 4);
  const nivelGeral = nivelScore(scoreGeral);

  // ── Perfil / data ────────────────────────────────────────────────────────────
  const perfil = dc.suitabilityPerfil ?? plan.suitability?.perfil ?? null;
  const hoje   = new Date().toLocaleDateString("pt-BR");

  // ── "Sem dados" flags ────────────────────────────────────────────────────────
  const semDadosIF        = rendaDesejada === 0;
  const semDadosProtecao  = rendaMensalTotal === 0;
  const semDadosFiscal    = rendaAnualFiscal === 0;
  const semDadosSucessorio = patrimonioTotal === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", padding: "24px 32px", boxSizing: "border-box" }}>

      {/* ── BLOCO 1: Banner ───────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ClipboardCheck style={{ width: 20, height: 20, color: "#2563EB", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>Diagnóstico inicial gerado automaticamente</p>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Revise os resultados e avance para a Estratégia Inicial</p>
          </div>
        </div>
        <button
          onClick={onAvancarEstrategia}
          style={{ backgroundColor: "#1E3A8A", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
        >
          Montar Estratégia Inicial →
        </button>
      </div>

      {/* ── BLOCO 2: Header com Score Geral ───────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Esquerda */}
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{clientName}</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 10px" }}>Diagnóstico · {hoje}</p>
            {perfil && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: "#DBEAFE", color: "#1E40AF" }}>
                Perfil: {PERFIL_LABELS[perfil]}
              </span>
            )}
          </div>
          {/* Direita: score + gauge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>Score Geral</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, justifyContent: "center" }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: "#111827", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{scoreGeral}</span>
                <span style={{ fontSize: 16, color: "#9CA3AF" }}>/100</span>
              </div>
              <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, backgroundColor: nivelGeral.bg, color: nivelGeral.cor }}>
                  {nivelGeral.label}
                </span>
              </div>
            </div>
            <GaugeHeader score={scoreGeral} color={nivelGeral.cor} />
          </div>
        </div>
      </div>

      {/* ── BLOCO 3: 4 Cards de Score ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {([
          { Icon: Sunset,    label: "Aposentadoria / IF",       score: scoreIF,         color: "#059669", semDados: semDadosIF },
          { Icon: Shield,    label: "Proteção",                 score: scoreProtecao,   color: "#B91C1C", semDados: semDadosProtecao },
          { Icon: Receipt,   label: "Planejamento Fiscal",      score: scoreFiscal,     color: "#B45309", semDados: semDadosFiscal },
          { Icon: GitBranch, label: "Planejamento Sucessório",  score: scoreSucessorio, color: "#7C3AED", semDados: semDadosSucessorio },
        ] as const).map(({ Icon, label, score, color, semDados }) => {
          const nivel = nivelScore(score);
          return (
            <div key={label} style={{ backgroundColor: "white", borderRadius: 12, padding: 20, borderTop: `3px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Icon style={{ width: 24, height: 24, color }} />
              <GaugeCard score={score} color={color} semDados={semDados} />
              <p style={{ fontSize: 13, color: "#374151", textAlign: "center", margin: 0, fontWeight: 500 }}>{label}</p>
              {semDados ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: "#F3F4F6", color: "#6B7280" }}>Sem dados</span>
                  <p style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", margin: 0 }}>Complete a coleta de dados</p>
                </>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, backgroundColor: nivel.bg, color: nivel.cor }}>
                  {nivel.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── BLOCO 4A: Card Aposentadoria / IF ─────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #059669" }}>
        <CardHeader Icon={Sunset} title="Aposentadoria / IF" score={scoreIF} color="#059669" />
        {semDadosIF ? (
          <div style={{ textAlign: "center", padding: "24px 16px", backgroundColor: "#F8FAFF", borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Preencha a Renda Desejada na IF para ver o diagnóstico</p>
          </div>
        ) : (
          <>
            <MetricGrid cols={2}>
              <Metric label="Patrimônio Necessário" value={formatCurrency(patrimonioNecessario)} />
              <Metric label="Projeção com Aportes" value={formatCurrency(projecaoIF)} />
              <Metric label="Gap Patrimonial" value={formatCurrency(Math.abs(gapIF))} color={gapIF <= 0 ? "#15803D" : "#B91C1C"} />
              <Metric label="Aporte Atual" value={`${formatCurrency(aporteMensal)}/mês`} />
            </MetricGrid>
            <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
              Para se aposentar aos {idadeMeta} anos com renda de {formatCurrency(rendaDesejada)}/mês,
              são necessários {formatCurrency(patrimonioNecessario)}.
            </p>
          </>
        )}
      </div>

      {/* ── BLOCO 4B: Card Proteção ────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #B91C1C" }}>
        <CardHeader Icon={Shield} title="Proteção" score={scoreProtecao} color="#B91C1C" />
        <MetricGrid cols={3}>
          <Metric label="Capital Necessário"  value={formatCurrency(capitalNecessario)} />
          <Metric label="Capital Atual"       value={formatCurrency(capitalAtual)} />
          <Metric label="Gap de Cobertura"    value={formatCurrency(Math.abs(gapProtecao))} color={gapProtecao <= 0 ? "#15803D" : "#B91C1C"} />
        </MetricGrid>
        <div>
          <CheckRow ok={protecao.possuiSeguroVida} label="Seguro de vida"
            detail={protecao.possuiSeguroVida ? formatCurrency(valorSeguroVida) : "Não possui"} />
          <CheckRow ok={protecao.possuiSeguroInvalidez} label="Seguro de invalidez"
            detail={protecao.possuiSeguroInvalidez ? formatCurrency(valorSeguroInvalidez) : "Não possui"} />
          <CheckRow ok={protecao.possuiPlanoSaude} label="Plano de saúde" />
          <CheckRow ok={!!protecao.temOutroSeguro} label="Outro seguro"
            detail={protecao.temOutroSeguro && protecao.descricaoOutroSeguro ? protecao.descricaoOutroSeguro : undefined} />
        </div>
      </div>

      {/* ── BLOCO 4C: Card Fiscal ──────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #B45309" }}>
        <CardHeader Icon={Receipt} title="Planejamento Fiscal" score={scoreFiscal} color="#B45309" />
        <MetricGrid cols={2}>
          <Metric label="Renda Anual Bruta"       value={formatCurrency(rendaAnualFiscal)} />
          <Metric label="Teto PGBL (12%)"         value={formatCurrency(tetoPGBL)} />
          <Metric label="Espaço Disponível PGBL"  value={formatCurrency(espacoPGBL)} color={espacoPGBL > 0 ? "#B45309" : "#15803D"} />
          <Metric label="Tipo Declaração"
            value={
              fiscal.tipoDeclaracao === "completa"    ? "Declaração completa"    :
              fiscal.tipoDeclaracao === "simplificada" ? "Declaração simplificada" : "—"
            }
          />
        </MetricGrid>
        <div>
          <CheckRow ok={fiscal.temEmpresa} label="Tem empresa (CNPJ)" />
          <CheckRow
            ok={!!dc.possuiPrevidencia}
            label="Possui previdência privada"
            detail={dc.possuiPrevidencia
              ? `${dc.tipoPrevidencia?.toUpperCase() ?? ""}${dc.tipoPrevidencia ? " · " : ""}Saldo: ${formatCurrency(saldoPrevidencia)}`
              : undefined
            }
          />
          <CheckRow
            ok={fiscal.temRendimentosIsentos}
            label="Rendimentos isentos"
            detail={fiscal.temRendimentosIsentos && fiscal.tiposRendimentosIsentos?.length
              ? fiscal.tiposRendimentosIsentos.join(", ")
              : undefined
            }
          />
        </div>
      </div>

      {/* ── BLOCO 4D: Card Sucessório ──────────────────────────────────────────── */}
      <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: "4px solid #7C3AED" }}>
        <CardHeader Icon={GitBranch} title="Planejamento Sucessório" score={scoreSucessorio} color="#7C3AED" />
        <MetricGrid cols={2}>
          <Metric label="Patrimônio Total"    value={formatCurrency(patrimonioTotal)} />
          <Metric label="ITCMD Estimado"      value={formatCurrency(itcmdEstimado)}   color="#B91C1C" />
          <Metric label="Custo do Inventário" value={formatCurrency(custoInventario)} color="#B91C1C" />
          <Metric label="Estado"              value={dc.estado || "—"} />
        </MetricGrid>
        <div style={{ marginBottom: 16 }}>
          <CheckRow ok={suc.possuiTestamento}            label="Testamento" />
          <CheckRow ok={suc.possuiHolding}               label="Holding familiar" />
          <CheckRow ok={suc.doacoesVida}                 label="Doações em vida" />
          <CheckRow ok={suc.seguroComBeneficiario}       label="Seguro com beneficiário" />
          <CheckRow ok={suc.previdenciaComBeneficiario}  label="Previdência com beneficiário" />
        </div>
        {patrimonioTotal > 0 && (
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
            ITCMD estimado de {formatCurrency(itcmdEstimado)} mais custo de inventário de {formatCurrency(custoInventario)},
            totalizando {formatCurrency(itcmdEstimado + custoInventario)} sobre o patrimônio em caso de falecimento.
          </p>
        )}
      </div>
    </div>
  );
}
