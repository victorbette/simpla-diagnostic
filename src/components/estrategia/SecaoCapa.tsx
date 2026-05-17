import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EstrategiaInicial } from "@/types/estrategiaInicial";
import type { FinancialPlan } from "@/types/financialPlanning";
import { PERFIL_LABELS } from "@/types/financialPlanning";
import logoSimpla from "@/assets/logo-simpla.svg";

interface Props {
  estrategia: EstrategiaInicial;
  onChange: (e: EstrategiaInicial) => void;
  financialPlan: FinancialPlan | null;
}

export function SecaoCapa({ estrategia, onChange, financialPlan }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange({ ...estrategia, logoBase64: result });
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    onChange({ ...estrategia, logoBase64: undefined });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Capa da Estratégia</h2>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {estrategia.logoBase64 ? (
            <>
              <img
                src={estrategia.logoBase64}
                alt="Logo"
                className="max-h-24 object-contain border rounded p-1"
              />
              <Button variant="outline" size="sm" onClick={removeLogo}>
                Remover logo
              </Button>
            </>
          ) : (
            <>
              <img
                src={logoSimpla}
                alt="Logo Simpla"
                className="h-12 object-contain"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Carregar logo
              </Button>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Nome do assessor */}
      <div className="space-y-2">
        <Label htmlFor="nomeAssessor">Nome do assessor</Label>
        <Input
          id="nomeAssessor"
          value={estrategia.nomeAssessor}
          onChange={(ev) =>
            onChange({ ...estrategia, nomeAssessor: ev.target.value })
          }
          placeholder="Seu nome completo"
        />
      </div>

      {/* Apresentação */}
      <div className="space-y-2">
        <Label htmlFor="apresentacao">Apresentação personalizada</Label>
        <Textarea
          id="apresentacao"
          value={estrategia.apresentacao}
          onChange={(ev) =>
            onChange({ ...estrategia, apresentacao: ev.target.value })
          }
          placeholder="Escreva uma apresentação personalizada para o cliente..."
          className="min-h-[180px]"
        />
      </div>

      {/* Badges from financial plan */}
      {financialPlan && (
        <div className="flex flex-wrap gap-2">
          {financialPlan.suitability && (
            <Badge variant="secondary">
              Perfil: {PERFIL_LABELS[financialPlan.suitability.perfil]}
            </Badge>
          )}
          {financialPlan.status && (
            <Badge variant="outline">
              Plano: {financialPlan.status}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
