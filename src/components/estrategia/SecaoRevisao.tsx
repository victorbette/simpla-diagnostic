import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SectionStatus = "pendente" | "revisando" | "concluido";
type SecaoAtiva =
  | "capa"
  | "assetAllocation"
  | "aposentadoria"
  | "protecaoSucessorio"
  | "fiscal"
  | "proximosPassos"
  | "revisao";

interface Props {
  statusSecoes: Record<SecaoAtiva, SectionStatus>;
  comentarios: Record<SecaoAtiva, string>;
  onNavigate: (secao: SecaoAtiva) => void;
  onGerarDocumento: () => void;
}

const SECAO_ITEMS: { id: SecaoAtiva; label: string }[] = [
  { id: "capa", label: "Capa e apresentação" },
  { id: "assetAllocation", label: "Asset Allocation" },
  { id: "aposentadoria", label: "Aposentadoria / IF" },
  { id: "protecaoSucessorio", label: "Proteção e Sucessório" },
  { id: "fiscal", label: "Planejamento fiscal" },
  { id: "proximosPassos", label: "Próximos passos" },
];

function StatusBadge({ status }: { status: SectionStatus }) {
  if (status === "concluido") return <Badge className="bg-green-100 text-green-800 text-xs">Concluída</Badge>;
  if (status === "revisando") return <Badge className="bg-amber-100 text-amber-800 text-xs">Em revisão</Badge>;
  return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
}

export function SecaoRevisao({ statusSecoes, comentarios, onNavigate, onGerarDocumento }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const completedCount = SECAO_ITEMS.filter((s) => statusSecoes[s.id] === "concluido").length;
  const canGenerate = completedCount >= 5;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Revisão final</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {completedCount} de {SECAO_ITEMS.length} seções concluídas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECAO_ITEMS.map(({ id, label }) => {
          const s = statusSecoes[id];
          const rawComment = comentarios[id] ?? "";
          let previewText = rawComment.trim();
          if (id === "protecaoSucessorio") {
            try {
              const p = JSON.parse(rawComment) as { protecao?: string; sucessorio?: string };
              previewText = (p.protecao || p.sucessorio || "").trim();
            } catch { /* use raw */ }
          }
          const preview = previewText.slice(0, 100);
          const concluida = s === "concluido";
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "text-left rounded-lg border p-4 space-y-2 transition-colors hover:bg-muted/50",
                concluida ? "border-green-300 bg-green-50/50" : "border-amber-200 bg-amber-50/30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{label}</span>
                {concluida ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
              </div>
              <StatusBadge status={s} />
              {preview ? (
                <p className="text-xs text-muted-foreground line-clamp-2">{preview}{previewText.length > 100 ? "…" : ""}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sem estratégia registrada</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <Button
          size="lg"
          disabled={!canGenerate}
          onClick={() => setConfirmOpen(true)}
          className="w-full sm:w-auto"
        >
          Gerar documento final
        </Button>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground mt-2">
            Complete pelo menos 5 seções para gerar o documento ({completedCount}/5 concluídas).
          </p>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar documento final</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O documento será gerado com as {completedCount} seções concluídas. Seções pendentes não serão incluídas.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setConfirmOpen(false); onGerarDocumento(); }}>
              Confirmar e gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
