import { describe, expect, it } from "vitest";
import { eventoQuitacao, gerarParcelas, saldoParcelas, selecionarParcelasFuturasNaoPagas } from "@/lib/compromissos";

describe("compromissos parcelados", () => {
  it("gera todas as parcelas nas datas originais", () => {
    expect(gerarParcelas("2026-01-31", 31, 4, 200).map((p) => [p.numero, p.data])).toEqual([
      [1, "2026-01-31"], [2, "2026-02-28"], [3, "2026-03-31"], [4, "2026-04-30"],
    ]);
  });

  it("calcula somente o saldo não pago", () => {
    const parcelas = gerarParcelas("2026-01-10", 10, 3, 200).map((p, i) => ({ ...p, paga: i === 0 }));
    expect(saldoParcelas(parcelas)).toBe(400);
  });

  it("não desloca parcelas por causa de atraso", () => {
    const parcelas = gerarParcelas("2026-01-10", 10, 3, 200).map((p, i) => ({ ...p, paga: i === 0 }));
    expect(selecionarParcelasFuturasNaoPagas(parcelas, "2026-02-11").map((p) => p.numero)).toEqual([3]);
    expect(parcelas[1]?.data).toBe("2026-02-10");
  });

  it("registra a quitação como evento separado", () => {
    expect(eventoQuitacao(350, "2026-02-11")).toEqual({ valor: 350, data: "2026-02-11", tipo: "quitacao" });
  });
});
