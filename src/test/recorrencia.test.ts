import { describe, expect, it } from "vitest";
import { dataRecorrenciaMensal, proximaRecorrencia } from "@/lib/recorrencia";

describe("recorrência mensal", () => {
  it("mantém o dia original quando ele existe no mês seguinte", () => {
    expect(dataRecorrenciaMensal("2026-10-10", 10)).toBe("2026-11-10");
  });

  it("usa o último dia em fevereiro, inclusive em ano bissexto", () => {
    expect(dataRecorrenciaMensal("2025-01-31", 31, "ultimo_dia")).toBe("2025-02-28");
    expect(dataRecorrenciaMensal("2024-01-31", 31, "ultimo_dia")).toBe("2024-02-29");
  });

  it("usa o último dia em meses de 30 dias e retoma o dia 31 depois", () => {
    expect(dataRecorrenciaMensal("2026-03-31", 31, "ultimo_dia")).toBe("2026-04-30");
    expect(dataRecorrenciaMensal("2026-04-30", 31, "ultimo_dia")).toBe("2026-05-31");
  });

  it("pula somente o mês sem dia 31 quando essa regra foi escolhida", () => {
    expect(dataRecorrenciaMensal("2026-01-31", 31, "pular_mes")).toBeNull();
    expect(dataRecorrenciaMensal("2026-01-31", 31, "pular_mes", 2)).toBe("2026-03-31");
  });

  it("preserva a API antiga para os chamadores atuais", () => {
    expect(proximaRecorrencia("2026-01-31", 31)).toBe("2026-02-28");
  });

  it("rejeita dias e intervalos inválidos", () => {
    expect(() => dataRecorrenciaMensal("2026-01-01", 0)).toThrow();
    expect(() => dataRecorrenciaMensal("2026-01-01", 32)).toThrow();
    expect(() => dataRecorrenciaMensal("2026-01-01", 1, "ultimo_dia", 0)).toThrow();
  });
});
