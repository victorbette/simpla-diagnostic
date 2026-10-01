import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function FPBloqueadoModal({ aberto, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) onFechar(); }}>
      <DialogContent className="sm:max-w-md" style={{ borderRadius: 12 }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-arrows-right-left" style={{ fontSize: 20, color: "#2563EB" }} />
            Funcionalidade movida
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[#374151] py-2">
          A funcionalidade de Financial Planning foi movida para o{" "}
          <strong>&ldquo;CRM Wealth&rdquo;</strong>. Acesse o CRM Wealth para criar e
          consultar Financial Plannings.
        </p>
        <DialogFooter>
          <Button onClick={onFechar} style={{ backgroundColor: "#1E3A8A", color: "white" }}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
