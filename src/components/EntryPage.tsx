import React, { useState, useEffect, useRef, type CSSProperties } from "react";
import * as M from "../model";
import type { Submit } from "../types";
import { Scale, Plus, Check } from "lucide-react";
import { DecimalInput, fractionLength } from "./DecimalInput";
import { ScheduleEditor } from "./ScheduleEditor";
export function EntryPage({
  state,
  submit,
  busy,
}: {
  state: M.State;
  submit: Submit;
  busy: boolean;
}) {
  const [day, setDay] = useState(M.localDate());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [inputUnits, setInputUnits] = useState<Record<string, M.Unit>>({});
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [newUnit, setNewUnit] = useState<M.Unit>("in");
  const [newValue, setNewValue] = useState("");
  const [newSchedule, setNewSchedule] = useState(M.schedule());
  const [error, setError] = useState("");
  const previous = useRef(state.settings);
  const saved = state.entries.find((e) => e.date === day);
  function fill(d: string) {
    setDay(d);
    const e = state.entries.find((e) => e.date === d);
    setDraft(
      Object.fromEntries(
        state.metrics.map((m) => [
          m.id,
          e?.values[m.id] === undefined
            ? ""
            : String(
                Number(
                  (
                    e.values[m.id] / M.factor(M.displayUnit(state, m))
                  ).toPrecision(12),
                ),
              ),
        ]),
      ),
    );
    setInputUnits({});
    setNote(e?.note ?? "");
    setShowNote(!!e?.note);
  }
  useEffect(() => {
    fill(day);
  }, []);
  useEffect(() => {
    const open = (event: Event) => fill((event as CustomEvent<string>).detail);
    window.addEventListener("bodyledger-entry-date", open);
    return () => window.removeEventListener("bodyledger-entry-date", open);
  }, [state]);
  useEffect(() => {
    const old = previous.current;
    setDraft((values) =>
      Object.fromEntries(
        Object.entries(values).map(([key, v]) => {
          const m = state.metrics.find((m) => m.id === key);
          if (!m || !v) return [key, v];
          const from =
            inputUnits[key] ??
            (m.kind === "weight"
              ? old.weight
              : m.kind === "length"
                ? old.length
                : M.displayUnit(state, m));
          const to = M.displayUnit(state, m);
          return [
            key,
            String(
              Number(
                ((Number(v) * M.factor(from)) / M.factor(to)).toPrecision(12),
              ),
            ),
          ];
        }),
      ),
    );
    setInputUnits({});
    previous.current = state.settings;
  }, [state.settings.weight, state.settings.length]);
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const values: Record<string, number> = {};
      for (const m of state.metrics) {
        const raw = draft[m.id];
        if (raw?.trim())
          values[m.id] = M.parseValue(
            raw,
            inputUnits[m.id] ?? M.displayUnit(state, m),
          );
      }
      let ms = state.metrics;
      if (adding && name.trim()) {
        if (
          name.trim().length > 10 ||
          ms.some((m) => m.title.toLowerCase() === name.trim().toLowerCase())
        )
          throw Error("Choose a unique metric name, up to 10 characters.");
        const metric = {
          id: M.id(),
          title: name.trim(),
          kind: M.kindOf(newUnit),
          schedule: newSchedule,
        };
        values[metric.id] = M.parseValue(newValue, newUnit);
        ms = [...ms, metric];
      }
      if (!Object.keys(values).length)
        throw Error("Add at least one measurement.");
      await submit(
        [{ id: saved?.id ?? M.id(), date: day, values, note }],
        ms,
        () => {
          setDraft({});
          setNote("");
          setShowNote(false);
          setAdding(false);
          setName("");
          setNewValue("");
          setInputUnits({});
        },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const weightMetric =
    state.metrics.find(
      (m) => m.kind === "weight" && m.title.toLowerCase() === "weight",
    ) ?? state.metrics.find((m) => m.kind === "weight");
  const lastWeight = [...state.entries]
    .filter(
      (e) =>
        e.date <= M.localDate() &&
        weightMetric &&
        e.values[weightMetric.id] !== undefined,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const inputValues = state.metrics.map((metric) => draft[metric.id] ?? "");
  const fractionPlaces = Math.max(3, ...inputValues.map(fractionLength));
  const integerPlaces = Math.max(
    3,
    ...inputValues.map((value) => value.split(/[.,]/)[0].length),
  );
  return (
    <>
      <div className="summary-row entry-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <Scale size={20} />
          </div>
          <div>
            <span>Latest weight</span>
            <strong>
              {lastWeight
                ? M.format(
                    state,
                    weightMetric!,
                    lastWeight.values[weightMetric!.id],
                  )
                : "—"}
              <small>
                {lastWeight ? lastWeight.date : "Your starting point awaits"}
              </small>
            </strong>
          </div>
        </div>
      </div>
      <div className="entry-layout">
        <section className="card entry-card">
          <div className="card-header">
            <div>
              <h2>New entry</h2>
              <p>Start with where you are today.</p>
            </div>
            <span className="tag">DAILY CHECK-IN</span>
          </div>
          <form onSubmit={onSave}>
            <div className="effective-date">
              <label htmlFor="effective-date">Effective date</label>
              <input
                id="effective-date"
                type="date"
                required
                value={day}
                onChange={(e) => fill(e.target.value)}
              />
            </div>
            <div className="measurement-head">
              <span>MEASUREMENT</span>
              <span>VALUE</span>
            </div>
            {state.metrics.map((m) => {
              const u = inputUnits[m.id] ?? M.displayUnit(state, m);
              return (
                <div className="measurement-row" key={m.id}>
                  <div>
                    <label htmlFor={`value-${m.id}`}>{m.title}</label>
                    <small>
                      {M.due(m.schedule, day)
                        ? "Scheduled today"
                        : `Latest due: ${M.latestDue(m.schedule, day)}`}
                    </small>
                  </div>
                  <div
                    className="measurement-input"
                    style={
                      {
                        "--decimal-places": fractionPlaces,
                        "--decimal-integers": integerPlaces,
                      } as CSSProperties
                    }
                  >
                    <DecimalInput
                      fractionPlaces={fractionPlaces}
                      aria-label={m.title}
                      id={`value-${m.id}`}
                      placeholder="—"
                      value={draft[m.id] ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [m.id]: M.limitInput(
                            e.target.value,
                            u,
                            draft[m.id] ?? "",
                          ),
                        })
                      }
                    />
                    <select
                      aria-label={`${m.title} input unit`}
                      value={u}
                      onChange={(e) => {
                        const next = e.target.value as M.Unit;
                        const raw = draft[m.id];
                        if (raw && Number.isFinite(Number(raw)))
                          setDraft({
                            ...draft,
                            [m.id]: String(
                              Number(
                                (
                                  (Number(raw) * M.factor(u)) /
                                  M.factor(next)
                                ).toPrecision(12),
                              ),
                            ),
                          });
                        setInputUnits({ ...inputUnits, [m.id]: next });
                      }}
                    >
                      {M.units(m.kind).map((unit) => (
                        <option key={unit} value={unit}>
                          {unit === "number" ? "no unit" : unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
            {adding && (
              <div className="new-metric">
                <div className="field-grid">
                  <label>
                    Metric name
                    <input
                      maxLength={10}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Gut"
                    />
                  </label>
                  <label>
                    First measurement
                    <DecimalInput
                      value={newValue}
                      onChange={(e) =>
                        setNewValue(
                          M.limitInput(e.target.value, newUnit, newValue),
                        )
                      }
                      placeholder="0.0"
                    />
                  </label>
                  <label>
                    Units
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value as M.Unit)}
                    >
                      {(
                        ["lb", "kg", "in", "cm", "%", "number"] as M.Unit[]
                      ).map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <ScheduleEditor value={newSchedule} onChange={setNewSchedule} />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAdding(false)}
                >
                  Cancel new metric
                </button>
              </div>
            )}
            <button
              type="button"
              className="add-metric"
              onClick={() => setAdding(!adding)}
            >
              <Plus size={17} /> Add a metric{" "}
              <span>Make this journal yours</span>
            </button>
            {showNote && (
              <label className="note-field">
                Note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How are you feeling? Anything worth remembering?"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowNote(!showNote)}
              >
                <Plus size={16} /> Note
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setDraft({});
                  setNote("");
                  setAdding(false);
                  setName("");
                  setNewValue("");
                  setError("");
                }}
              >
                Clear form
              </button>
              <button className="primary" disabled={busy}>
                <Check size={17} />{" "}
                {busy ? "Saving…" : saved ? "Save changes" : "Save entry"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
