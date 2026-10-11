import { useState } from "react";
import { Braces, Download, FileSpreadsheet, FileText, FileType, Table } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { exportarGastos, type Formato } from "@/lib/exportar";
import type { Categoria, Gasto } from "@/lib/queries";

const OPCOES: { f: Formato; label: string; icon: typeof Download }[] = [
  { f: "csv", label: "CSV", icon: Table },
  { f: "txt", label: "TXT", icon: FileText },
  { f: "pdf", label: "PDF", icon: FileType },
  { f: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { f: "json", label: "JSON", icon: Braces },
];

/** Botão "Exportar" com balão ancorado para escolher o formato. */
export function ExportMenu({ gastos, cats, base, className }: { gastos: () => Gasto[]; cats: Categoria[]; base: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const escolher = async (f: Formato) => {
    setOpen(false);
    const lista = gastos();
    if (!lista.length) { toast.error("Nenhum gasto nesse período.", { id: "exportar" }); return; }
    try { await exportarGastos(f, lista, cats, base); toast.success("Arquivo baixado", { id: "exportar" }); }
    catch { toast.error("Não foi possível gerar o arquivo.", { id: "exportar" }); }
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`h-11 rounded-xl ${className ?? ""}`}><Download />Exportar</Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-56 rounded-2xl bg-popover p-2 shadow-soft duration-150">
        {OPCOES.map(({ f, label, icon: I }) => (
          <Button key={f} variant="ghost" className="w-full justify-start rounded-xl" onClick={() => escolher(f)}><I className="text-primary" />{label}</Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
