import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Gasto = Database["public"]["Tables"]["gastos"]["Row"];
export type GastoInsert = Database["public"]["Tables"]["gastos"]["Insert"];
export type CategoriaInsert = Database["public"]["Tables"]["categorias"]["Insert"];
export type Recorrencia = Database['public']['Tables']['recorrencias_gastos']['Row'];
export const recorrenciasQuery = queryOptions({ queryKey: ['recorrencias'], queryFn: async () => {
  const { data, error } = await supabase.from('recorrencias_gastos').select('*');
  if (error) throw error;
  return data;
} });

export const CATEGORIAS_PADRAO = [
  { nome: "Contas", icone: "receipt", cor: "#0ea5e9" },
  { nome: "Mercado", icone: "shopping-cart", cor: "#22c55e" },
  { nome: "Veículo", icone: "car", cor: "#f97316" },
  { nome: "Moradia", icone: "home", cor: "#a16207" },
  { nome: "Saúde", icone: "heart-pulse", cor: "#ef4444" },
  { nome: "Educação", icone: "graduation-cap", cor: "#6366f1" },
  { nome: "Lazer", icone: "party-popper", cor: "#ec4899" },
  { nome: "Transporte", icone: "bus", cor: "#14b8a6" },
  { nome: "Outros", icone: "tag", cor: "#64748b" },
] as const;

/** Insere as categorias padrão do usuário de forma idempotente (unique user_id + nome). */
export async function restaurarCategoriasPadrao() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre novamente");
  const { error } = await supabase
    .from("categorias")
    .upsert(CATEGORIAS_PADRAO.map((c) => ({ ...c, user_id: user.id })), { onConflict: "user_id,nome", ignoreDuplicates: true });
  if (error) throw error;
}

export const categoriasQuery = queryOptions({
  queryKey: ["categorias"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categorias").select("*").order("created_at");
    if (error) throw error;
    // Fallback: usuário sem nenhuma categoria recebe as padrão uma vez.
    if (!data.length) {
      try {
        await restaurarCategoriasPadrao();
        const again = await supabase.from("categorias").select("*").order("created_at");
        if (!again.error && again.data.length) return again.data;
      } catch { /* mantém lista vazia; a tela oferece "Restaurar categorias padrão" */ }
    }
    return data;
  },
});

export const gastosRangeQuery = (start: string, end: string) =>
  queryOptions({
    queryKey: ["gastos", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .gte("data", start)
        .lte("data", end)
        .order("data", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

export const gastosTodosQuery = queryOptions({
  queryKey: ["gastos", "todos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return data;
  },
});

export const useCategorias = () => useQuery(categoriasQuery);

export function useSalvarGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, escopo = 'este', termino, regra_dia_invalido = 'ultimo_dia', ...g }: GastoInsert & { id?: string; escopo?: 'este' | 'proximos'; termino?: string | null; regra_dia_invalido?: 'ultimo_dia' | 'pular_mes' }) => {
      const { error } = await supabase.rpc('salvar_gasto_recorrencia', {
        _dados: { valor: g.valor, categoria_id: g.categoria_id ?? null, data: g.data, descricao: g.descricao ?? '', forma_pagamento: g.forma_pagamento ?? 'pix', observacao: g.observacao ?? null, regra_dia_invalido },
        ...(id ? { _id: id } : {}), _escopo: escopo, _repetir: g.recorrente ?? false,
        ...(termino ? { _termino: termino } : {}),
      });
      if (error) throw error;
      const recovery = await supabase.rpc('lancar_recorrentes');
      if (recovery.error) console.error('Falha na recuperação de recorrências');
    },
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['gastos'] }), qc.invalidateQueries({ queryKey: ['recorrencias'] })]); },
  });
}

export function useCancelarRecorrencia() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.rpc('cancelar_recorrencia', { _serie: id });
    if (error) throw error;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ['recorrencias'] }) });
}

export function useAtualizarStatusPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pendente" | "pago" }) => {
      const { error } = await supabase.from("gastos").update({
        status_pagamento: status,
        data_pagamento: status === "pago" ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos"] }),
  });
}

export function useExcluirGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gastos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos"] }),
  });
}

export function useSalvarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...c }: CategoriaInsert & { id?: string }) => {
      const { error } = id
        ? await supabase.from("categorias").update(c).eq("id", id)
        : await supabase.from("categorias").insert(c);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useExcluirCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      qc.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
}
