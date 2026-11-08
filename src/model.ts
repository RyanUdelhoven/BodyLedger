import Papa from "papaparse";
export type Kind = "weight" | "length" | "percentage" | "number";
export type Unit = "lb" | "kg" | "in" | "cm" | "%" | "number";
export interface Schedule {
  frequency: "daily" | "weekly" | "monthly" | "intervalWeeks";
  weekday: number;
  days: number[];
  interval: number;
  anchor: string;
  time: string;
}
export interface Metric {
  id: string;
  title: string;
  kind: Kind;
  schedule: Schedule;
}
export interface Entry {
  id: string;
  date: string;
  values: Record<string, number>;
  demo?: boolean;
}
export interface Goal {
  metricId: string;
  target: number;
  start?: number;
  created: string;
  deadline: string;
}
export interface State {
  version: 1;
  revision: number;
  demoRevision?: number;
  metrics: Metric[];
  entries: Entry[];
  goals: Goal[];
  settings: {
    weight: Unit;
    length: Unit;
    weightDecimals: number;
    lengthDecimals: number;
    theme: "dark" | "light";
    height?: number;
    waist?: string;
    ratio: boolean;
    reminders: boolean;
    time: string;
    expiry: number;
    sharedTime: boolean;
  };
  ranges: { days: number; weekday: number; week: number; year: number };
}
export const id = () => crypto.randomUUID();
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const date = (s: string) => new Date(`${s}T12:00:00`);
export function addDays(s: string, n: number) {
  const d = date(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export const schedule = (daily = false): Schedule => ({
  frequency: daily ? "daily" : "weekly",
  weekday: 0,
  days: [1],
  interval: 2,
  anchor: "2020-01-05",
  time: "04:00",
});
export const initial = (): State => ({
  version: 1,
  revision: 0,
  metrics: [
    { id: "weight", title: "Weight", kind: "weight", schedule: schedule(true) },
  ],
  entries: [],
  goals: [],
  settings: {
    weight: "lb",
    length: "in",
    weightDecimals: 2,
    lengthDecimals: 2,
    theme: "dark",
    ratio: false,
    reminders: false,
    time: "04:00",
    expiry: 6,
    sharedTime: true,
  },
  ranges: { days: 30, weekday: 52, week: 12, year: 3 },
});
export const factor = (u: Unit) =>
  u === "lb" ? 0.45359237 : u === "in" ? 2.54 : 1;
export const kindOf = (u: Unit): Kind =>
  u === "lb" || u === "kg"
    ? "weight"
    : u === "in" || u === "cm"
      ? "length"
      : u === "%"
        ? "percentage"
        : "number";
export const units = (k: Kind): Unit[] =>
  k === "weight"
    ? ["lb", "kg"]
    : k === "length"
      ? ["in", "cm"]
      : k === "percentage"
        ? ["%"]
        : ["number"];
export const displayUnit = (s: State, m: Metric): Unit =>
  m.kind === "weight"
    ? s.settings.weight
    : m.kind === "length"
      ? s.settings.length
      : m.kind === "percentage"
        ? "%"
        : "number";
export function canonical(value: number, u: Unit) {
  const v = value * factor(u);
  return kindOf(u) === "weight"
    ? (Math.round((v / 0.45359237) * 10) / 10) * 0.45359237
    : kindOf(u) === "length"
      ? (Math.round((v / 2.54) * 8) / 8) * 2.54
      : v;
}
export function parseValue(raw: string, u: Unit) {
  const v = Number(raw.replace(",", "."));
  if (
    !/^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) ||
    !Number.isFinite(v) ||
    v < 0 ||
    ((kindOf(u) === "weight" || kindOf(u) === "length") && v === 0) ||
    (u === "%" && v > 100)
  )
    throw Error("Enter a valid positive measurement (percentages: 0–100).");
  const result = canonical(v, u);
  if (!Number.isFinite(result)) throw Error("Measurement is too large.");
  return result;
}
export function format(
  s: State,
  m: Metric,
  v: number | undefined,
  withUnit = true,
) {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const u = displayUnit(s, m);
  const digits =
    m.id === "army-whtr"
      ? 3
      : m.kind === "weight"
        ? s.settings.weightDecimals
        : m.kind === "length"
          ? s.settings.lengthDecimals
          : 2;
  return `${(v / factor(u)).toFixed(digits)}${withUnit && u !== "number" ? ` ${u}` : ""}`;
}
export function value(s: State, e: Entry, m: Metric) {
  return m.id === "army-whtr" && s.settings.height && s.settings.waist
    ? e.values[s.settings.waist] === undefined
      ? undefined
      : e.values[s.settings.waist] / s.settings.height
    : e.values[m.id];
}
export function metrics(s: State) {
  return s.settings.ratio &&
    s.settings.height &&
    s.metrics.some((m) => m.id === s.settings.waist)
    ? [
        ...s.metrics,
        {
          id: "army-whtr",
          title: "Waist/Ht",
          kind: "number" as Kind,
          schedule: s.metrics.find((m) => m.id === s.settings.waist)!.schedule,
        },
      ]
    : s.metrics;
}
export function due(sc: Schedule, day: string) {
  const d = date(day);
  if (sc.frequency === "daily") return true;
  if (sc.frequency === "monthly") {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return sc.days.some((n) => Math.min(n, last) === d.getDate());
  }
  if (d.getDay() !== sc.weekday) return false;
  if (sc.frequency === "weekly") return true;
  const a = date(sc.anchor);
  a.setDate(a.getDate() - a.getDay());
  const b = date(day);
  b.setDate(b.getDate() - b.getDay());
  const weeks = Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      604800000,
  );
  return ((weeks % sc.interval) + sc.interval) % sc.interval === 0;
}
export function latestDue(sc: Schedule, day: string) {
  for (let n = 0; n < 3650; n++) {
    const d = addDays(day, -n);
    if (due(sc, d)) return d;
  }
  return day;
}
export function mergeEntry(old: Entry, next: Entry) {
  return {
    ...withoutLegacyNote(old),
    values: { ...old.values, ...next.values },
    demo: false,
  };
}
export function conflicts(a: Entry, b: Entry) {
  return Object.keys(b.values).some(
    (key) =>
      a.values[key] !== undefined &&
      Math.abs(a.values[key] - b.values[key]) > 1e-8,
  );
}
function withoutLegacyNote(entry: Entry): Entry {
  const { note, ...clean } = entry as Entry & { note?: unknown };
  return clean;
}
export const mean = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : undefined;
export const sd = (a: number[]) => {
  const m = mean(a);
  return m === undefined
    ? undefined
    : Math.sqrt(a.reduce((n, v) => n + (v - m) ** 2, 0) / a.length);
};
export function exportCSV(s: State) {
  const ms = metrics(s);
  return Papa.unparse({
    fields: ["Date", ...ms.map((m) => `${m.title} (${displayUnit(s, m)})`)],
    data: [...s.entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [
        e.date,
        ...ms.map((m) => {
          const v = value(s, e, m);
          return v === undefined
            ? ""
            : Number((v / factor(displayUnit(s, m))).toPrecision(14));
        }),
      ]),
  });
}
function csvDate(raw: string) {
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  let y: number, mo: number, da: number;
  if (m) {
    y = +m[1];
    mo = +m[2];
    da = +m[3];
  } else {
    m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s.*)?$/);
    if (!m) throw Error(`Invalid date: ${raw}. Use YYYY-MM-DD.`);
    y = +m[3];
    mo = +m[1];
    da = +m[2];
  }
  const d = new Date(y, mo - 1, da, 12);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da)
    throw Error(`Invalid date: ${raw}`);
  return localDate(d);
}
export function importCSV(s: State, text: string) {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  if (result.errors.length) throw Error(result.errors[0].message);
  const [headers, ...rows] = result.data;
  if (!headers || !rows.length)
    throw Error("The CSV contains no measurement rows.");
  const ms = structuredClone(s.metrics);
  const names = new Set<string>();
  let dateIndex = -1,
    unitIndex = -1;
  const columns: { index: number; metric: Metric; unit: Unit }[] = [];
  headers.forEach((header, index) => {
    const h = header.trim();
    if (/^date(?:\/time)?$|^timestamp$/i.test(h)) {
      dateIndex = index;
      return;
    }
    if (/^notes?$/i.test(h)) {
      // Accept old CSV files, but retired note contents are never stored.
      return;
    }
    if (/^units?$/i.test(h)) {
      unitIndex = index;
      return;
    }
    const match = h.match(/^(.*?)\s*\((lb|lbs|kg|in|cm|%|number)\)$/i);
    let title = match ? match[1].trim() : h;
    let unit = match
      ? ((match[2].toLowerCase() === "lbs"
          ? "lb"
          : match[2].toLowerCase()) as Unit)
      : undefined;
    if (!unit && /^weight$/i.test(title)) unit = "lb";
    if (!unit)
      throw Error(`Specify supported units in “${h}”, for example Gut (in).`);
    if (names.has(title.toLowerCase()))
      throw Error(`Duplicate metric: ${title}`);
    names.add(title.toLowerCase());
    if (title.toLowerCase() === "waist/ht" && s.settings.ratio) return;
    let metric = ms.find((m) => m.title.toLowerCase() === title.toLowerCase());
    if (metric && metric.kind !== kindOf(unit))
      throw Error(`Incompatible units for ${title}.`);
    if (!metric) {
      if (!title || title.length > 10)
        throw Error("New metric names must contain 1–10 characters.");
      metric = {
        id: id(),
        title,
        kind: kindOf(unit),
        schedule: schedule(kindOf(unit) === "weight"),
      };
      ms.push(metric);
    }
    columns.push({ index, metric, unit });
  });
  if (dateIndex < 0) throw Error("A Date column is required.");
  const entries: Entry[] = [];
  for (const row of rows) {
    if (row.length !== headers.length)
      throw Error("Every CSV row must match the header column count.");
    const values: Record<string, number> = {};
    for (const col of columns) {
      let raw = row[col.index].trim();
      if (!raw) continue;
      let u = col.unit;
      if (col.metric.kind === "weight") {
        const inline = raw.match(/\s*(lb|lbs|kg)$/i);
        const declared =
          inline?.[1] ?? (unitIndex >= 0 ? row[unitIndex].trim() : "");
        if (declared) {
          if (!/^(lb|lbs|kg)$/i.test(declared))
            throw Error(`Unsupported weight unit: ${declared}`);
          u = declared.toLowerCase() === "kg" ? "kg" : "lb";
        }
        raw = raw.replace(/\s*(lb|lbs|kg)$/i, "");
      }
      values[col.metric.id] = parseValue(raw, u);
    }
    if (Object.keys(values).length)
      entries.push({
        id: id(),
        date: csvDate(row[dateIndex]),
        values,
      });
  }
  const used = new Set(
    [...s.entries, ...entries].flatMap((e) => Object.keys(e.values)),
  );
  return {
    metrics: ms.filter(
      (m) => s.metrics.some((old) => old.id === m.id) || used.has(m.id),
    ),
    entries,
  };
}
export function demo(s: State, replace = false): State {
  const next = structuredClone(s);
  next.demoRevision = 2;
  if (replace) {
    next.metrics = initial().metrics;
    next.entries = [];
    next.goals = [];
    next.settings.ratio = false;
  }
  let weight = next.metrics.find(
    (m) => m.title.toLowerCase() === "weight" && m.kind === "weight",
  );
  if (!weight) {
    weight = {
      id: id(),
      title: "Weight",
      kind: "weight",
      schedule: schedule(true),
    };
    next.metrics.push(weight);
  }
  let gut = next.metrics.find(
    (m) => m.title.toLowerCase() === "gut" && m.kind === "length",
  );
  if (!gut) {
    gut = { id: id(), title: "Gut", kind: "length", schedule: schedule() };
    next.metrics.push(gut);
  }
  next.entries = next.entries.filter((e) => !e.demo);
  const occupied = new Set(next.entries.map((e) => e.date));
  // Seeded innovations create reproducible correlated fluctuations, not repeated sine waves.
  let seed = 0x51a7b0d;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const anchors = [184, 188, 193, 198, 204, 191, 211, 220];
  let drift = 0,
    weeklyAmplitude = 4,
    seasonalAmplitude = 5.6;
  let detour = 0,
    detourTarget = 0,
    spike = 0;
  const generated: { day: string; weight: number; gut?: number }[] = [];
  for (let d = "2020-01-01", i = 0; d <= "2026-11-08"; d = addDays(d, 1), i++) {
    const dt = date(d),
      year = dt.getFullYear(),
      weekday = dt.getDay();
    const start = Date.UTC(year, 0, 1),
      elapsed =
        (Date.UTC(year, dt.getMonth(), dt.getDate()) - start) / 86400000;
    const fraction = elapsed / ((Date.UTC(year + 1, 0, 1) - start) / 86400000);
    if (weekday === 0) weeklyAmplitude = 3.1 + random() * 1.8;
    if (dt.getDate() === 1) seasonalAmplitude = 5.0 + random() * 1.4;
    if (i % 23 === 0) detourTarget = (random() - 0.5) * 3.8;
    detour = 0.94 * detour + 0.06 * detourTarget;
    drift = 0.8 * drift + (random() - 0.5) * 0.85;
    spike *= 0.55;
    if (random() < 0.022) spike += 1.3 + random() * 1.8;
    // Smooth uneven progress retains continuous year boundaries and the 2024 loss.
    const progress =
      fraction +
      0.085 * Math.sin(2 * Math.PI * fraction) +
      0.035 * Math.sin(6 * Math.PI * fraction);
    const trend =
      anchors[year - 2020] +
      (anchors[year - 2019] - anchors[year - 2020]) * progress;
    const seasonal =
      seasonalAmplitude * Math.cos(2 * Math.PI * (fraction + 0.035));
    const weekly =
      [0.5, 0.26, 0.08, -0.15, -0.32, -0.5, -0.05][weekday] * weeklyAmplitude;
    const lb =
      trend +
      seasonal +
      weekly +
      detour +
      drift +
      spike +
      (random() - 0.5) * 0.6;
    const row: { day: string; weight: number; gut?: number } = {
      day: d,
      weight: lb,
    };
    if (weekday === 0)
      row.gut =
        34 +
        ((trend - 184) * 5) / 35 +
        seasonal * 0.14 +
        detour * 0.1 +
        drift * 0.09 +
        (random() - 0.5) * 0.3;
    generated.push(row);
  }
  const sundays = generated.filter((row) => row.gut !== undefined);
  const firstGut = sundays[0].gut!,
    lastGut = sundays.at(-1)!.gut!;
  let sundayIndex = 0;
  for (const row of generated) {
    const values: Record<string, number> = {
      [weight.id]: canonical(row.weight, "lb"),
    };
    if (row.gut !== undefined) {
      const t = sundayIndex++ / (sundays.length - 1);
      // Anchor only the endpoints; retain the intervening independent variation.
      values[gut.id] = canonical(
        row.gut + (34 - firstGut) * (1 - t) + (39 - lastGut) * t,
        "in",
      );
    }
    if (occupied.has(row.day)) continue;
    next.entries.push({
      id: id(),
      date: row.day,
      values,
      demo: true,
    });
  }
  return next;
}
export function validateState(input: unknown): State {
  const s = input as State;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.metrics) ||
    !Array.isArray(s.entries) ||
    !Array.isArray(s.goals) ||
    !s.settings ||
    !s.ranges
  )
    throw Error("This is not a BodyLedger journal backup.");
  const ids = new Set<string>();
  for (const m of s.metrics) {
    if (
      !m.id ||
      ids.has(m.id) ||
      typeof m.title !== "string" ||
      !["weight", "length", "percentage", "number"].includes(m.kind) ||
      !m.schedule ||
      !["daily", "weekly", "monthly", "intervalWeeks"].includes(
        m.schedule.frequency,
      ) ||
      !Number.isInteger(m.schedule.weekday) ||
      m.schedule.weekday < 0 ||
      m.schedule.weekday > 6 ||
      !m.schedule.days?.length ||
      m.schedule.days.some((n) => !Number.isInteger(n) || n < 1 || n > 31) ||
      !Number.isInteger(m.schedule.interval) ||
      m.schedule.interval < 1 ||
      m.schedule.interval > 520 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(m.schedule.anchor) ||
      !/^\d{2}:\d{2}$/.test(m.schedule.time)
    )
      throw Error("Invalid metric or schedule in backup.");
    ids.add(m.id);
  }
  const entryIDs = new Set<string>();
  const days = new Set<string>();
  for (const e of s.entries) {
    if (
      !e.id ||
      entryIDs.has(e.id) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      csvDate(e.date) !== e.date ||
      days.has(e.date) ||
      !e.values ||
      Object.entries(e.values).some(
        ([k, v]) =>
          !ids.has(k) || typeof v !== "number" || !Number.isFinite(v) || v < 0,
      )
    )
      throw Error("Invalid or duplicate entry in backup.");
    days.add(e.date);
    entryIDs.add(e.id);
  }
  if (
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    typeof s.settings.ratio !== "boolean" ||
    typeof s.settings.reminders !== "boolean" ||
    typeof s.settings.sharedTime !== "boolean" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.settings.time) ||
    !Number.isInteger(s.settings.expiry) ||
    s.settings.expiry < 1 ||
    s.settings.expiry > 72 ||
    !["days", "weekday", "week", "year"].every((k) =>
      Number.isInteger(s.ranges[k as keyof State["ranges"]]),
    ) ||
    s.ranges.week < 3 ||
    s.ranges.year < 2 ||
    s.ranges.year > 100 ||
    !["lb", "kg"].includes(s.settings.weight) ||
    !["in", "cm"].includes(s.settings.length) ||
    ![0, 1, 2].includes(s.settings.weightDecimals) ||
    ![0, 1, 2].includes(s.settings.lengthDecimals) ||
    !["dark", "light"].includes(s.settings.theme) ||
    (s.settings.height !== undefined &&
      (!Number.isFinite(s.settings.height) || s.settings.height <= 0)) ||
    s.goals.some(
      (g) =>
        (!ids.has(g.metricId) && g.metricId !== "army-whtr") ||
        !Number.isFinite(g.target) ||
        g.target < 0,
    ) ||
    Object.values(s.ranges).some(
      (v) => !Number.isInteger(v) || v < 1 || v > 520,
    )
  )
    throw Error("Invalid preferences or goals in backup.");
  return { ...s, entries: s.entries.map(withoutLegacyNote) };
}

export function limitInput(raw: string, unit: Unit, previous = "") {
  if (!/^\d*(?:[.,]\d*)?$/.test(raw)) return previous;
  const digits =
    unit === "lb"
      ? 1
      : unit === "kg"
        ? 2
        : unit === "in"
          ? 3
          : unit === "cm"
            ? 4
            : 6;
  const match = raw.match(/^(\d*[.,])(\d*)$/);
  return match ? match[1] + match[2].slice(0, digits) : raw;
}

export function captureGoalStarts(s: State): State {
  return {
    ...s,
    goals: s.goals.map((g) => {
      if (g.start !== undefined) return g;
      const m = metrics(s).find((m) => m.id === g.metricId);
      if (!m) return g;
      const first = s.entries
        .filter(
          (e) =>
            e.date >= g.created &&
            e.date <= localDate() &&
            value(s, e, m) !== undefined,
        )
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      return first ? { ...g, start: value(s, first, m) } : g;
    }),
  };
}
