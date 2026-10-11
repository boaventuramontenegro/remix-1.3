/** Mês financeiro que contém `dataISO`, começando no dia `dia` (1–28). Datas em yyyy-mm-dd. */
export function inicioMesFinanceiro(dataISO: string, dia: number) {
  const [y, m, d] = dataISO.split("-").map(Number) as [number, number, number];
  let ano = y, mes = m - 1;
  if (d < dia) { mes -= 1; if (mes < 0) { mes = 11; ano -= 1; } }
  const ini = new Date(Date.UTC(ano, mes, dia));
  const fim = new Date(Date.UTC(ano, mes + 1, dia - 1));
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { inicio: iso(ini), fim: iso(fim) };
}

/** Cor da barra de orçamento: verde até 70%, amarelo até 100%, vermelho acima. */
export function corOrcamento(pct: number): "ok" | "alerta" | "estourado" {
  if (pct > 100) return "estourado";
  if (pct > 70) return "alerta";
  return "ok";
}

/** Hora local (HH:MM em minutos) e data local num fuso horário. */
export function agoraNoFuso(fuso: string, agora = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(agora).map((x) => [x.type, x.value]),
  );
  return { data: `${p["year"]}-${p["month"]}-${p["day"]}`, minutos: Number(p["hour"]) * 60 + Number(p["minute"]) };
}

/** Deve enviar o lembrete diário agora? Janela de 60 min após o horário, uma vez por dia. */
export function deveLembrar(horario: string, fuso: string, ultimo: string | null, agora = new Date()) {
  const [h, m] = horario.split(":").map(Number) as [number, number];
  const alvo = h * 60 + m;
  const { data, minutos } = agoraNoFuso(fuso, agora);
  return { enviar: ultimo !== data && minutos >= alvo && minutos < alvo + 60, data };
}
