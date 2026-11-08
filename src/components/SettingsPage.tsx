import { useState } from "react";
import * as M from "../model";
import type { Commit } from "../types";
import {
  ArrowLeft,
  Scale,
  Database,
  ChevronRight,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import { ScheduleEditor } from "./ScheduleEditor";
import { Empty } from "./Empty";
import { Notifications } from "./Notifications";
import { DecimalInput, fractionLength } from "./DecimalInput";
import { CSVImport } from "./CSVImport";
import { download } from "../ui";
export function SettingsPage({
  state,
  commit,
  submit,
  notify,
}: {
  state: M.State;
  commit: Commit;
  submit: (e: M.Entry[], m?: M.Metric[]) => Promise<void>;
  notify: (s: string) => void;
}) {
  const [section, setSection] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [find, setFind] = useState("");
  const [highlight, setHighlight] = useState("");
  const [editing, setEditing] = useState<M.Entry>();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editUnits, setEditUnits] = useState<Record<string, M.Unit>>({});
  const [height, setHeight] = useState(
    state.settings.height
      ? String(state.settings.height / M.factor(state.settings.length))
      : "",
  );
  const [heightUnit, setHeightUnit] = useState<M.Unit>(state.settings.length);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(100);
  const entries = [...state.entries].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const ms = M.metrics(state);
  const editFractionPlaces = Math.max(
    3,
    ...Object.values(editValues).map(fractionLength),
  );
  const settings = (p: Partial<M.State["settings"]>) =>
    commit({ ...state, settings: { ...state.settings, ...p } });
  async function removeEntries(ids: string[]) {
    if (
      await commit({
        ...state,
        entries: state.entries.filter((e) => !ids.includes(e.id)),
      })
    ) {
      notify(`Deleted ${ids.length} entries.`);
      setSelected([]);
    }
  }
  function go() {
    if (!find || !entries.length) return;
    const nearest = entries.reduce((a, b) =>
      Math.abs(+M.date(a.date) - +M.date(find)) <=
      Math.abs(+M.date(b.date) - +M.date(find))
        ? a
        : b,
    );
    setLimit(Math.max(100, entries.indexOf(nearest) + 1));
    setHighlight(nearest.id);
    notify(
      nearest.date === find
        ? `Found ${find}.`
        : `No entry on ${find}. Nearest saved day: ${nearest.date}.`,
    );
    setTimeout(
      () =>
        document
          .getElementById(`entry-${nearest.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  }
  return (
    <>
      {section && (
        <button className="text-button back" onClick={() => setSection("")}>
          <ArrowLeft size={16} /> Settings
        </button>
      )}
      {!section ? (
        <div className="settings-grid">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Display units</h2>
                <p>A familiar way to see your measurements.</p>
              </div>
              <Scale size={20} />
            </div>
            <div className="settings-body">
              <div className="field-grid">
                <label>
                  Weight units
                  <select
                    value={state.settings.weight}
                    onChange={(e) =>
                      settings({ weight: e.target.value as M.Unit })
                    }
                  >
                    <option value="lb">Pounds (lb)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </label>
                <label>
                  Decimal places
                  <select
                    value={state.settings.weightDecimals}
                    onChange={(e) =>
                      settings({ weightDecimals: +e.target.value })
                    }
                  >
                    {[0, 1, 2].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="field-grid">
                <label>
                  Length units
                  <select
                    value={state.settings.length}
                    onChange={(e) =>
                      settings({ length: e.target.value as M.Unit })
                    }
                  >
                    <option value="in">Inches (in)</option>
                    <option value="cm">Centimeters (cm)</option>
                  </select>
                </label>
                <label>
                  Decimal places
                  <select
                    value={state.settings.lengthDecimals}
                    onChange={(e) =>
                      settings({ lengthDecimals: +e.target.value })
                    }
                  >
                    {[0, 1, 2].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="appearance-choice">
                Appearance
                <select
                  value={state.settings.theme}
                  onChange={(e) =>
                    settings({ theme: e.target.value as "dark" | "light" })
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <p className="muted">
                Display preferences preserve your stored measurements.
              </p>
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Your journal</h2>
                <p>Everything you need, in one place.</p>
              </div>
              <Database size={20} />
            </div>
            {[
              {
                title: "Manage data",
                desc: "History, exports, backups, and deletion",
              },
              {
                title: "Measurement schedules",
                desc: "Choose when each metric is due",
              },
              {
                title: "User profile",
                desc: "Height and waist-to-height ratio",
              },
              {
                title: "Notifications",
                desc: "Reminders while your journal is open",
              },
            ].map((row) => (
              <button
                className="setting-link"
                key={row.title}
                onClick={() => setSection(row.title)}
              >
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.desc}</small>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          </section>
          <section className="card wide storage-card">
            <ShieldCheck size={27} />
            <div>
              <h2>A private space for your progress.</h2>
              <p>
                Measurements, goals, and preferences live in a local SQLite
                database. Docker preserves the database across restarts.
                Download a full backup to keep another copy.
              </p>
              <small>
                {state.entries.length.toLocaleString()} entries · {ms.length}{" "}
                metrics ·{" "}
                {(new Blob([JSON.stringify(state)]).size / 1024).toFixed(1)} KB
                of journal data
              </small>
            </div>
            <button
              className="secondary"
              onClick={() =>
                download(
                  "BodyLedger-backup.json",
                  JSON.stringify(state, null, 2),
                  "application/json",
                )
              }
            >
              <Download size={16} /> Back up journal
            </button>
          </section>
        </div>
      ) : section === "Manage data" ? (
        <>
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Manage data</h2>
                <p>Keep your history close, and a backup closer.</p>
              </div>
            </div>
            <div className="settings-body">
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      "BodyLedger.csv",
                      M.exportCSV(state),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  <Download size={16} /> Export CSV
                </button>
                <CSVImport state={state} submit={submit} notify={notify} />
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      "BodyLedger-backup.json",
                      JSON.stringify(state, null, 2),
                      "application/json",
                    )
                  }
                >
                  <Download size={16} /> Full backup
                </button>
                <label className="upload-button secondary">
                  <Upload size={16} /> Restore backup
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        if (f.size > 30 * 1024 * 1024)
                          throw Error("Backup is too large.");
                        const next = M.validateState(
                          JSON.parse(await f.text()),
                        );
                        if (await commit({ ...next, revision: state.revision }))
                          notify("Journal restored from backup.");
                      } catch (err) {
                        notify((err as Error).message);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="muted">
                Restore replaces this journal. Full backups include goals,
                schedules, and preferences; CSV exports contain measurements.
              </p>
            </div>
          </section>
          <section className="card history-card">
            <div className="card-header">
              <div>
                <h2>History</h2>
                <p>
                  {entries.length.toLocaleString()} daily reports. Select a date
                  to edit.
                </p>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  setSelected(
                    selected.length === entries.length
                      ? []
                      : entries.map((e) => e.id),
                  )
                }
              >
                {selected.length === entries.length && entries.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>
            <div className="history-tools">
              <label>
                Find date
                <input
                  type="date"
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                />
              </label>
              <button
                className="secondary"
                disabled={!find || !entries.length}
                onClick={go}
              >
                Go
              </button>
              <button
                className="danger secondary"
                disabled={!selected.length}
                onClick={() => removeEntries(selected)}
              >
                Delete selected entries ({selected.length})
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Date</th>
                    {ms.map((m) => (
                      <th key={m.id}>{m.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, limit).map((e) => (
                    <tr
                      id={`entry-${e.id}`}
                      className={highlight === e.id ? "highlight" : ""}
                      key={e.id}
                    >
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${e.date}`}
                          checked={selected.includes(e.id)}
                          onChange={(ev) =>
                            setSelected(
                              ev.target.checked
                                ? [...selected, e.id]
                                : selected.filter((i) => i !== e.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => {
                            setEditing(structuredClone(e));
                            setEditValues(
                              Object.fromEntries(
                                state.metrics.map((m) => [
                                  m.id,
                                  e.values[m.id] === undefined
                                    ? ""
                                    : String(
                                        Number(
                                          (
                                            e.values[m.id] /
                                            M.factor(M.displayUnit(state, m))
                                          ).toPrecision(12),
                                        ),
                                      ),
                                ]),
                              ),
                            );
                            setEditUnits({});
                            setError("");
                          }}
                        >
                          {e.date}
                        </button>
                        {e.demo && (
                          <small className="demo-label">Synthetic</small>
                        )}
                      </td>
                      {ms.map((m) => (
                        <td key={m.id}>
                          {M.format(state, m, M.value(state, e, m))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!entries.length && (
                <Empty
                  title="A fresh start."
                  text="Saved measurements will appear here."
                />
              )}
            </div>
            {entries.length > limit && (
              <button
                className="secondary load-more"
                onClick={() => setLimit(limit + 200)}
              >
                Show more entries
              </button>
            )}
          </section>
          <div className="settings-grid">
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Delete date range</h2>
                  <p>Both dates are inclusive. Deletion is immediate.</p>
                </div>
              </div>
              <div className="settings-body">
                <div className="field-grid">
                  <label>
                    Start date
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="danger secondary"
                  disabled={!from || !to || from > to}
                  onClick={() =>
                    removeEntries(
                      entries
                        .filter((e) => e.date >= from && e.date <= to)
                        .map((e) => e.id),
                    )
                  }
                >
                  <Trash2 size={15} /> Delete date range
                </button>
              </div>
            </section>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Delete metric columns</h2>
                  <p>Removes definitions, values, and associated goals.</p>
                </div>
              </div>
              <div className="settings-body">
                <button
                  className="text-button"
                  onClick={() =>
                    setSelectedMetrics(
                      selectedMetrics.length === ms.length
                        ? []
                        : ms.map((m) => m.id),
                    )
                  }
                >
                  Select all
                </button>
                {ms.map((m) => (
                  <label className="check-row" key={m.id}>
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(m.id)}
                      onChange={(e) =>
                        setSelectedMetrics(
                          e.target.checked
                            ? [...selectedMetrics, m.id]
                            : selectedMetrics.filter((id) => id !== m.id),
                        )
                      }
                    />
                    {m.title}
                  </label>
                ))}
                <button
                  className="danger secondary"
                  disabled={!selectedMetrics.length}
                  onClick={async () => {
                    const next = structuredClone(state);
                    next.metrics = next.metrics.filter(
                      (m) => !selectedMetrics.includes(m.id),
                    );
                    next.entries = next.entries.map((e) => ({
                      ...e,
                      values: Object.fromEntries(
                        Object.entries(e.values).filter(
                          ([k]) => !selectedMetrics.includes(k),
                        ),
                      ),
                    }));
                    next.goals = next.goals.filter(
                      (g) => !selectedMetrics.includes(g.metricId),
                    );
                    if (
                      selectedMetrics.includes(next.settings.waist ?? "") ||
                      selectedMetrics.includes("army-whtr")
                    ) {
                      next.settings.ratio = false;
                      next.goals = next.goals.filter(
                        (g) => g.metricId !== "army-whtr",
                      );
                    }
                    if (await commit(next)) {
                      notify(
                        `Deleted ${selectedMetrics.length} metric columns.`,
                      );
                      setSelectedMetrics([]);
                    }
                  }}
                >
                  Delete selected columns
                </button>
              </div>
            </section>
            <section className="card wide">
              <div className="card-header">
                <div>
                  <h2>Explore with demo history</h2>
                  <p>
                    Synthetic Weight and Gut measurements from 2020 through
                    November 8, 2026.
                  </p>
                </div>
              </div>
              <div className="settings-body button-row">
                <button
                  className="secondary"
                  onClick={async () => {
                    if (await commit(M.demo(state)))
                      notify(
                        "Demo history refreshed. Your non-demo entries and goals were preserved.",
                      );
                  }}
                >
                  Refresh demo history
                </button>
                <button
                  className="danger secondary"
                  onClick={async () => {
                    if (await commit(M.demo(state, true)))
                      notify("All data replaced with synthetic demo history.");
                  }}
                >
                  Replace all data with demo history
                </button>
                <button
                  className="secondary"
                  onClick={async () => {
                    if (
                      await commit({
                        ...state,
                        entries: state.entries.filter((e) => !e.demo),
                      })
                    )
                      notify("Demo entries removed.");
                  }}
                >
                  Remove demo data
                </button>
              </div>
            </section>
          </div>
        </>
      ) : section === "Measurement schedules" ? (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Measurement schedules</h2>
              <p>Choose your rhythm. Existing measurements keep their dates.</p>
            </div>
          </div>
          {state.metrics.map((m) => (
            <div className="schedule-section" key={m.id}>
              <h3>{m.title}</h3>
              <ScheduleEditor
                value={m.schedule}
                onChange={(schedule) =>
                  commit({
                    ...state,
                    metrics: state.metrics.map((old) =>
                      old.id === m.id ? { ...old, schedule } : old,
                    ),
                  })
                }
              />
            </div>
          ))}
        </section>
      ) : section === "User profile" ? (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>User profile</h2>
              <p>Your fixed height and optional calculated ratio.</p>
            </div>
          </div>
          <div className="settings-body">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const h = M.parseValue(height, heightUnit);
                  if (await settings({ height: h }))
                    notify("Height saved. Historical ratios recalculated.");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <div className="field-grid">
                <label>
                  Height
                  <input
                    required
                    inputMode="decimal"
                    value={height}
                    onChange={(e) =>
                      setHeight(
                        M.limitInput(e.target.value, heightUnit, height),
                      )
                    }
                  />
                </label>
                <label>
                  Height units
                  <select
                    value={heightUnit}
                    onChange={(e) => {
                      const u = e.target.value as M.Unit;
                      if (height)
                        setHeight(
                          String(
                            (Number(height) * M.factor(heightUnit)) /
                              M.factor(u),
                          ),
                        );
                      setHeightUnit(u);
                    }}
                  >
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                  </select>
                </label>
              </div>
              <button className="secondary">Save height</button>
            </form>
            <label className="spaced">
              Waist metric
              <select
                value={state.settings.waist ?? ""}
                onChange={(e) =>
                  settings({
                    waist: e.target.value || undefined,
                    ratio: e.target.value ? state.settings.ratio : false,
                  })
                }
              >
                <option value="">Choose a length metric</option>
                {state.metrics
                  .filter((m) => m.kind === "length")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                disabled={!state.settings.height || !state.settings.waist}
                checked={state.settings.ratio}
                onChange={(e) =>
                  commit({
                    ...state,
                    settings: { ...state.settings, ratio: e.target.checked },
                    goals: e.target.checked
                      ? state.goals
                      : state.goals.filter((g) => g.metricId !== "army-whtr"),
                  })
                }
              />
              Waist-to-height ratio
            </label>
            <p className="muted">
              Calculated as waist ÷ height on dates with waist measurements.
              Changing height recalculates history.
            </p>
          </div>
        </section>
      ) : (
        <Notifications state={state} commit={commit} notify={notify} />
      )}{" "}
      {editing && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const values: Record<string, number> = {};
                for (const m of state.metrics)
                  if (editValues[m.id]?.trim())
                    values[m.id] = M.parseValue(
                      editValues[m.id],
                      editUnits[m.id] ?? M.displayUnit(state, m),
                    );
                if (!Object.keys(values).length)
                  throw Error("Keep at least one measurement.");
                const next = { ...editing, values, demo: false };
                if (
                  state.entries.some(
                    (e) => e.id !== editing.id && e.date === editing.date,
                  )
                ) {
                  await submit([next]);
                  setEditing(undefined);
                } else if (
                  await commit({
                    ...state,
                    entries: state.entries.map((old) =>
                      old.id === editing.id ? next : old,
                    ),
                  })
                ) {
                  setEditing(undefined);
                  notify("Entry updated.");
                }
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <h2 id="edit-title">Edit entry</h2>
            <label>
              Date
              <input
                type="date"
                required
                value={editing.date}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value })
                }
              />
            </label>
            {state.metrics.map((m) => {
              const unit = editUnits[m.id] ?? M.displayUnit(state, m);
              return (
                <div className="field-grid" key={m.id}>
                  <label>
                    {m.title}
                    <DecimalInput
                      fractionPlaces={editFractionPlaces}
                      value={editValues[m.id] ?? ""}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          [m.id]: M.limitInput(
                            e.target.value,
                            unit,
                            editValues[m.id] ?? "",
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Units
                    <select
                      value={unit}
                      onChange={(e) => {
                        const u = e.target.value as M.Unit;
                        if (editValues[m.id])
                          setEditValues({
                            ...editValues,
                            [m.id]: String(
                              (Number(editValues[m.id]) * M.factor(unit)) /
                                M.factor(u),
                            ),
                          });
                        setEditUnits({ ...editUnits, [m.id]: u });
                      }}
                    >
                      {M.units(m.kind).map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </button>
              <button className="primary">Save changes</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
