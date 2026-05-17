import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { FinancialPlan } from "@/types/financialPlanning";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import logoSimpla from "@/assets/logo-simpla.svg";

type SectionStatus = "pendente" | "revisando" | "concluido";

interface Props {
  plan: FinancialPlan;
  logoBase64: string | null;
  onLogoChange: (b64: string | null) => void;
  nomeConsultor: string;
  onNomeConsultorChange: (v: string) => void;
  apresentacao: string;
  onApresentacaoChange: (v: string) => void;
  status: SectionStatus;
  onStatusChange: (s: SectionStatus) => void;
}

export function SecaoCapa({
  plan,
  logoBase64,
  onLogoChange,
  nomeConsultor,
  onNomeConsultorChange,
  apresentacao,
  onApresentacaoChange,
  status,
  onStatusChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onLogoChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  const disabled = status === "concluido";

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">Capa e apresentação</h2>

      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {logoBase64 ? (
            <>
              <img src={logoBase64} alt="Logo" className="max-h-20 object-contain border rounded p-1" />
              {!disabled && (
                <Button variant="outline" size="sm" onClick={() => { onLogoChange(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  Remover logo
                </Button>
              )}
            </>
          ) : (
            <>
              <img src={logoSimpla} alt="Logo Simpla" className="h-10 object-contain opacity-50" />
              {!disabled && (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Carregar logo
                </Button>
              )}
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Nome do assessor */}
      <div className="space-y-2">
        <Label htmlFor="nomeConsultor">Nome do consultor responsável</Label>
        <Input
          id="nomeConsultor"
          value={nomeConsultor}
          onChange={(e) => onNomeConsultorChange(e.target.value)}
          placeholder="Seu nome completo"
          disabled={disabled}
        />
      </div>

      {/* Apresentação */}
      <div className="space-y-2">
        <Label htmlFor="apresentacao">Apresentação personalizada para o cliente</Label>
        <Textarea
          id="apresentacao"
          value={apresentacao}
          onChange={(e) => onApresentacaoChange(e.target.value)}
          placeholder="Ex: É com satisfação que apresentamos seu planejamento financeiro personalizado..."
          className="min-h-[180px]"
          disabled={disabled}
        />
      </div>

      {/* Resumo automático */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo automático</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Perfil de risco</p>
            <p className="font-medium">
              {plan.suitability ? PERFIL_LABELS[plan.suitability.perfil] : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Data de elaboração</p>
            <p className="font-medium">{new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 pt-2">
        {status === "concluido" ? (
          <>
            <Badge className="bg-green-100 text-green-800 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
            </Badge>
            <Button variant="outline" size="sm" onClick={() => onStatusChange("revisando")}>
              Editar
            </Button>
          </>
        ) : (
          <Button onClick={() => onStatusChange("concluido")} disabled={!nomeConsultor.trim()}>
            Marcar como concluída
          </Button>
        )}
      </div>
    </div>
  );
}
