import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "./ui/drawer";

/** Painel que sobe de baixo, com cantos arredondados (sem modal centralizado). */
export function BottomSheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-lg rounded-t-3xl">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : <DrawerDescription className="sr-only">{title}</DrawerDescription>}
        </DrawerHeader>
        <div className="overflow-y-auto px-4" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
