import { describe, expect, it } from "vitest";
import { ordenarPagamentosPendentes, statusVisivel } from "@/lib/pagamentos";
import type { Gasto } from "@/lib/queries";

const gasto = (id: string, data: string, status_pagamento: Gasto["status_pagamento"]): Gasto => ({
  id,
  user_id: "user",
  categoria_id: null,
  compromisso_id: null,
  created_at: `${data}T10:00:00Z`,
  data,
  data_programada: data,
  data_pagamento: null,
  descricao: id,
  forma_pagamento: "pix",
  gerado_automaticamente: false,
  observacao: null,
  numero_parcela: null,
  recorrente: false,
  recorrente_origem_id: null,
  serie_id: null,
  status_pagamento,
  tipo_compromisso: "avulso",
  total_parcelas: null,
  valor: 100,
});

describe("pagamentos pendentes", () => {
  it("deriva atrasado, hoje e próximo a partir da data prevista", () => {
    expect(statusVisivel(gasto("a", "2026-10-16", "pendente"), "2026-10-17")).toBe("atrasado");
    expect(statusVisivel(gasto("b", "2026-10-17", "pendente"), "2026-10-17")).toBe("vence_hoje");
    expect(statusVisivel(gasto("c", "2026-10-18", "pendente"), "2026-10-17")).toBe("a_vencer");
  });

  it("ordena atrasados, hoje e próximos, e datas crescentes dentro de cada grupo", () => {
    const itens = [
      gasto("proximo-2", "2026-10-20", "pendente"),
      gasto("atrasado-2", "2026-10-15", "pendente"),
      gasto("hoje", "2026-10-17", "pendente"),
      gasto("atrasado-1", "2026-10-10", "pendente"),
      gasto("proximo-1", "2026-10-18", "pendente"),
      gasto("pago", "2026-10-01", "pago"),
    ];
    expect(ordenarPagamentosPendentes(itens, "2026-10-17").map((item) => item.id)).toEqual([
      "atrasado-1",
      "atrasado-2",
      "hoje",
      "proximo-1",
      "proximo-2",
    ]);
  });

  it("não inclui pagos, cancelados nem registros antigos sem status financeiro", () => {
    const antigo = { ...gasto("antigo", "2026-10-10", "pago"), status_pagamento: "desconhecido" } as Gasto;
    expect(ordenarPagamentosPendentes([gasto("pago", "2026-10-10", "pago"), gasto("cancelado", "2026-10-10", "cancelado"), antigo], "2026-10-17")).toEqual([]);
  });
});
