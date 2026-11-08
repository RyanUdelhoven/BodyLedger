import {
  addDays,
  date,
  due,
  mean,
  sd,
  value,
  type State,
  type Metric,
} from "./model";
export type Mode = "Days YoY" | "Previous weekdays" | "Week flow" | "Year flow";
export interface Point {
  date: string;
  label: string;
  actual?: number;
  average?: number;
  previous?: number;
  older?: number;
  low?: number;
  high?: number;
  deviation?: number;
}
export function chartData(
  s: State,
  m: Metric,
  mode: Mode,
  count: number,
  weekday: number,
  today: string,
) {
  const byDay = new Map(
    s.entries
      .filter((e) => e.date <= today)
      .map((e) => [e.date, value(s, e, m)]),
  );
  const get = (d: string) => byDay.get(d);
  const vals = (days: string[]) =>
    days.map(get).filter((v): v is number => v !== undefined);
  const output: Point[] = [];
  const actualRaw: number[] = [],
    historyRaw: number[] = [],
    actualEligible: number[] = [],
    historyEligible: number[] = [];
  if (mode === "Days YoY") {
    for (let i = count * 7 - 1; i >= 0; i--) {
      const day = addDays(today, -i),
        d = date(day);
      const prev = (offset: number) => {
        const y = d.getFullYear() - offset;
        const other = new Date(y, d.getMonth(), d.getDate(), 12);
        return other.getMonth() === d.getMonth()
          ? get(`${y}-${day.slice(5)}`)
          : undefined;
      };
      output.push({
        date: day,
        label: day.slice(5),
        actual: get(day),
        previous: prev(1),
        older: prev(2),
      });
    }
  }
  if (mode === "Previous weekdays") {
    let end = today;
    while (date(end).getDay() !== weekday) end = addDays(end, -1);
    for (let i = count - 1; i >= 0; i--) {
      const day = addDays(end, -7 * i);
      output.push({ date: day, label: day.slice(5), actual: get(day) });
    }
    const average = mean(
      output.flatMap((p) => (p.actual === undefined ? [] : [p.actual])),
    );
    output.forEach((p) => (p.average = average));
  }
  if (mode === "Week flow") {
    for (let i = 6; i >= 0; i--) {
      const day = addDays(today, -i),
        actual = get(day);
      const h = vals(
        Array.from({ length: count }, (_, j) => addDays(day, -7 * (j + 1))),
      );
      const a = actual === undefined ? [] : [actual];
      const eligible = [...h, ...(day < today ? a : [])];
      const avg = mean(eligible),
        dev = sd(eligible);
      actualRaw.push(...a);
      historyRaw.push(...h);
      if (day < today) actualEligible.push(...a);
      historyEligible.push(...h);
      output.push({
        date: day,
        label: date(day).toLocaleDateString(undefined, { weekday: "short" }),
        actual,
        average: mean(h),
        deviation: dev,
        low: avg === undefined || dev === undefined ? undefined : avg - dev,
        high: avg === undefined || dev === undefined ? undefined : avg + dev,
      });
    }
  }
  if (mode === "Year flow") {
    const now = date(today);
    const monthDays = (year: number, month: number) => {
      const last = new Date(year, month + 1, 0).getDate();
      return Array.from(
        { length: last },
        (_, j) =>
          `${year}-${String(month + 1).padStart(2, "0")}-${String(j + 1).padStart(2, "0")}`,
      );
    };
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1, 12);
      const year = d.getFullYear(),
        month = d.getMonth();
      const current = monthDays(year, month);
      const a = vals(current.filter((day) => day <= today));
      const qualifies = (days: string[]) =>
        days[days.length - 1] < today &&
        vals(days.filter((day) => due(m.schedule, day))).length >
          days.filter((day) => due(m.schedule, day)).length / 2;
      const ae = qualifies(current) ? a : [];
      const h: number[] = [],
        he: number[] = [];
      for (let j = 1; j <= count; j++) {
        const days = monthDays(year - j, month);
        const raw = vals(days);
        h.push(...raw);
        if (qualifies(days)) he.push(...raw);
      }
      const eligible = [...ae, ...he],
        avg = mean(eligible),
        dev = sd(eligible);
      actualRaw.push(...a);
      historyRaw.push(...h);
      actualEligible.push(...ae);
      historyEligible.push(...he);
      output.push({
        date: current[0],
        label: d.toLocaleDateString(undefined, {
          month: "short",
        }),
        actual: mean(a),
        average: mean(h),
        deviation: dev,
        low: avg === undefined || dev === undefined ? undefined : avg - dev,
        high: avg === undefined || dev === undefined ? undefined : avg + dev,
      });
    }
  }
  return {
    points: output,
    actualMean: mean(actualRaw),
    historyMean: mean(historyRaw),
    actualSD: sd(actualEligible),
    historySD: sd(historyEligible),
  };
}
