import { BottomSheet } from "./BottomSheet";
import { Button } from "./ui/button";

/** Confirmação em bottom sheet (substitui window.confirm), com botão vermelho Excluir. */
export function ConfirmSheet({ open, onOpenChange, title, description, confirmLabel = "Excluir", onConfirm, busy }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button variant="destructive" className="h-12 flex-1 rounded-xl" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </BottomSheet>
  );
}
