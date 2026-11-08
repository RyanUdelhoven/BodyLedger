import { useState } from "react";
import * as M from "../model";
import type { Commit } from "../types";
import { Target, ArrowUpRight, Plus } from "lucide-react";
export function Goals({ state, commit }: { state: M.State; commit: Commit }) {
  const [editing, setEditing] = useState<string>();
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState<M.Unit>("lb");
  const [deadline, setDeadline] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("below");
  const [duration, setDuration] = useState("1");
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks">("weeks");
  const [error, setError] = useState("");
  const ms = M.metrics(state);
  function open(m: M.Metric) {
    const goal = state.goals.find((g) => g.metricId === m.id),
      u = M.displayUnit(state, m);
    setEditing(m.id);
    setTarget(
      goal ? String(Number((goal.target / M.factor(u)).toPrecision(12))) : "",
    );
    setUnit(u);
    setDirection(goal ? M.goalDirection(goal) : "below");
    setDuration(String(goal?.duration ?? 1));
    setDurationUnit(goal?.durationUnit ?? (goal ? "days" : "weeks"));
    setDeadline(goal?.deadline ?? "");
    setError("");
  }
  return (
    <>
      <div className="section-intro">
        <Target size={19} />
        <p>Set your own targets. Every metric can have a goal.</p>
      </div>
      <div className="goal-grid">
        {ms.map((m) => {
          const goal = state.goals.find((g) => g.metricId === m.id);
          const entries = state.entries
            .filter(
              (e) =>
                M.value(state, e, m) !== undefined && e.date <= M.localDate(),
            )
            .sort((a, b) => a.date.localeCompare(b.date));
          const current = entries.length
            ? M.value(state, entries[entries.length - 1], m)
            : undefined;
          const start =
            goal?.start ??
            (goal
              ? (() => {
                  const first = entries.find((e) => e.date >= goal.created);
                  return first ? M.value(state, first, m) : undefined;
                })()
              : undefined);
          const streak = goal ? M.goalStreak(state, goal) : undefined;
          const progress = streak?.progress ?? 0;
          return (
            <button
              className="card goal-card"
              key={m.id}
              onClick={() => open(m)}
            >
              <div className="goal-title">
                <span className="summary-icon">
                  <Target size={20} />
                </span>
                <h2>{m.title}</h2>
                <ArrowUpRight size={19} />
              </div>
              {goal ? (
                <>
                  <div className="goal-values">
                    <div>
                      <span>Current</span>
                      <strong>{M.format(state, m, current)}</strong>
                    </div>
                    <div>
                      <span>
                        {M.goalDirection(goal) === "below" ? "Under" : "Over"}
                      </span>
                      <strong>{M.format(state, m, goal.target)}</strong>
                    </div>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                  <p>
                    {goal.duration ?? 1} {goal.durationUnit ?? "days"}{" "}
                    {M.goalDirection(goal) === "below" ? "under" : "over"}{" "}
                    {M.format(state, m, goal.target)}
                  </p>
                  <p>
                    {streak!.achieved ? "Goal satisfied" : "Current streak"}:{" "}
                    {streak!.days} days
                    <span>{Math.round(progress)}% of duration</span>
                  </p>
                  <small>
                    Measured through {streak!.latest ?? "—"}. Missing days
                    bridge recorded measurements; time stops at the latest
                    measurement.
                  </small>
                  <small>
                    Starting value {M.format(state, m, start)} · Latest{" "}
                    {entries.at(-1)?.date ?? "—"}
                  </small>
                  {goal.deadline && (
                    <small>
                      {goal.deadline < M.localDate()
                        ? "Target date passed"
                        : "Target date"}{" "}
                      · {goal.deadline}
                    </small>
                  )}
                </>
              ) : (
                <>
                  <h3>A direction worth moving in.</h3>
                  <p>Choose a target for {m.title.toLowerCase()}.</p>
                  <span className="text-link">
                    <Plus size={15} /> Set a goal
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {editing && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-title"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const m = ms.find((m) => m.id === editing)!;
                const t = M.parseValue(target, unit);
                const length = Number(duration);
                if (!Number.isInteger(length) || length < 1 || length > 3650)
                  throw Error("Choose a duration from 1 to 3650.");
                const old = state.goals.find((g) => g.metricId === editing);
                const latest = state.entries
                  .filter(
                    (e) =>
                      e.date <= M.localDate() &&
                      M.value(state, e, m) !== undefined,
                  )
                  .sort((a, b) => b.date.localeCompare(a.date))[0];
                const goal: M.Goal = {
                  metricId: editing,
                  target: t,
                  direction,
                  duration: length,
                  durationUnit,
                  start:
                    old?.start ??
                    (old
                      ? undefined
                      : latest
                        ? M.value(state, latest, m)
                        : undefined),
                  created: old?.created ?? M.localDate(),
                  deadline,
                };
                if (
                  await commit({
                    ...state,
                    goals: [
                      ...state.goals.filter((g) => g.metricId !== editing),
                      goal,
                    ],
                  })
                )
                  setEditing(undefined);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <h2 id="goal-title">
              {ms.find((m) => m.id === editing)?.title} goal
            </h2>
            <div className="field-grid">
              <label>
                Target
                <input
                  required
                  inputMode="decimal"
                  value={target}
                  onChange={(e) =>
                    setTarget(M.limitInput(e.target.value, unit, target))
                  }
                />
              </label>
              <label>
                Units
                <select
                  value={unit}
                  onChange={(e) => {
                    const u = e.target.value as M.Unit;
                    if (target)
                      setTarget(
                        String((Number(target) * M.factor(unit)) / M.factor(u)),
                      );
                    setUnit(u);
                  }}
                >
                  {M.units(ms.find((m) => m.id === editing)!.kind).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-grid">
              <label>
                Direction
                <select
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as "above" | "below")
                  }
                >
                  <option value="below">Below (under)</option>
                  <option value="above">Above (over)</option>
                </select>
              </label>
              <label>
                Duration
                <input
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </label>
              <label>
                Time unit
                <select
                  value={durationUnit}
                  onChange={(e) =>
                    setDurationUnit(e.target.value as "days" | "weeks")
                  }
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </label>
            </div>
            <label>
              Target date (optional)
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="error">
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
              <button
                type="button"
                className="danger text-button"
                onClick={async () => {
                  if (
                    await commit({
                      ...state,
                      goals: state.goals.filter((g) => g.metricId !== editing),
                    })
                  )
                    setEditing(undefined);
                }}
              >
                Remove goal
              </button>
              <button className="primary">Save goal</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
