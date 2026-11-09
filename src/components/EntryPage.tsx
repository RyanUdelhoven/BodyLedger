import React, { useState, useEffect, useRef, type CSSProperties } from "react";
import * as M from "../model";
import type { Submit } from "../types";
import { Plus, Check } from "lucide-react";
import { DecimalInput, fractionLength } from "./DecimalInput";
import { EntryHistory } from "./EntryHistory";
import { ScheduleEditor } from "./ScheduleEditor";
export function EntryPage({
  state,
  submit,
  busy,
  onSubmitted,
}: {
  state: M.State;
  submit: Submit;
  busy: boolean;
  onSubmitted: () => void;
}) {
  const [day, setDay] = useState(M.localDate());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [inputUnits, setInputUnits] = useState<Record<string, M.Unit>>({});
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
      await submit([{ id: saved?.id ?? M.id(), date: day, values }], ms, () => {
        setDraft({});
        setAdding(false);
        setName("");
        setNewValue("");
        setInputUnits({});
        onSubmitted();
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const inputValues = state.metrics.map((metric) => draft[metric.id] ?? "");
  const fractionPlaces = Math.max(3, ...inputValues.map(fractionLength));
  const integerPlaces = Math.max(
    3,
    ...inputValues.map((value) => value.split(/[.,]/)[0].length),
  );
  return (
    <>
      <div className="entry-layout">
        <section className="card entry-card">
          <form onSubmit={onSave}>
            <h3 className="sr-only">Measurements</h3>
            <p id="measurement-keyboard-help" className="sr-only">
              Tab moves between measurements. Alt plus Arrow Down focuses the
              unit selector; Escape returns to the measurement.
            </p>
            <div className="measurement-grid">
              {state.metrics.map((m) => {
                const u = inputUnits[m.id] ?? M.displayUnit(state, m);
                return (
                  <div className="measurement-row" key={m.id}>
                    <div
                      className="measurement-input"
                      style={
                        {
                          "--decimal-places": fractionPlaces,
                          "--decimal-integers": integerPlaces,
                        } as CSSProperties
                      }
                    >
                      <label
                        className="measurement-label"
                        title={m.title}
                        htmlFor={`value-${m.id}`}
                      >
                        {m.title}
                      </label>
                      <DecimalInput
                        fractionPlaces={fractionPlaces}
                        aria-label={m.title}
                        id={`value-${m.id}`}
                        placeholder="—"
                        aria-describedby="measurement-keyboard-help"
                        onKeyDown={(event) => {
                          if (event.altKey && event.key === "ArrowDown") {
                            event.preventDefault();
                            event.currentTarget.parentElement
                              ?.querySelector("select")
                              ?.focus();
                          }
                        }}
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
                        tabIndex={-1}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            document.getElementById(`value-${m.id}`)?.focus();
                          }
                        }}
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
            </div>
            {adding && (
              <div id="new-metric-form" className="new-metric">
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
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="form-actions entry-actions">
              <button className="primary" disabled={busy}>
                <Check size={17} /> {busy ? "Submitting…" : "Submit"}
              </button>
              <div className="effective-date">
                <input
                  id="effective-date"
                  aria-label="Effective date"
                  type="date"
                  required
                  value={day}
                  onChange={(e) => fill(e.target.value)}
                />
                <button
                  type="button"
                  className="add-metric entry-add-metric"
                  onClick={() => setAdding(!adding)}
                  aria-expanded={adding}
                  aria-controls="new-metric-form"
                >
                  <Plus size={17} /> Add a metric
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
      <EntryHistory
        state={state}
        onSelect={(entry) => {
          fill(entry.date);
          document
            .getElementById("effective-date")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </>
  );
}
