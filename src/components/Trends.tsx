import { useState, useEffect, useRef } from "react";
import * as M from "../model";
import type { CommitRange, RangeKey } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { chartData, type Mode } from "../trends";
import { chooseYAxis } from "../chartAxis";
import { Empty } from "./Empty";
import { weekdays } from "../ui";
export function Trends({
  state,
  commitRange,
}: {
  state: M.State;
  commitRange: CommitRange;
}) {
  const [mode, setMode] = useState<Mode>("Days YoY");
  const [selection, setSelection] = useState<string>();
  const [weekday, setWeekday] = useState(0);
  const [drafts, setDrafts] = useState<Record<RangeKey, string>>(
    () =>
      Object.fromEntries(
        Object.entries(state.ranges).map(([key, value]) => [
          key,
          String(value),
        ]),
      ) as Record<RangeKey, string>,
  );
  const [validRanges, setValidRanges] = useState(state.ranges);
  const requested = useRef<Partial<Record<RangeKey, number>>>({});
  const focused = useRef<RangeKey | undefined>(undefined);
  useEffect(() => {
    const keys = Object.keys(state.ranges) as RangeKey[];
    const acknowledged = keys.filter(
      (key) =>
        requested.current[key] === undefined ||
        requested.current[key] === state.ranges[key],
    );
    for (const key of acknowledged) delete requested.current[key];
    setValidRanges((current) => ({
      ...current,
      ...Object.fromEntries(
        acknowledged.map((key) => [key, state.ranges[key]]),
      ),
    }));
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(
        acknowledged
          .filter((key) => focused.current !== key)
          .map((key) => [key, String(state.ranges[key])]),
      ),
    }));
  }, [state.ranges]);

  const ms = M.metrics(state);
  const metric = ms.find((m) => m.id === selection) ?? ms[0];
  if (!metric)
    return (
      <Empty
        title="Your story starts with a measurement."
        text="Add a metric in New entry to start exploring trends."
      />
    );
  const key =
    mode === "Days YoY"
      ? "days"
      : mode === "Previous weekdays"
        ? "weekday"
        : mode === "Week flow"
          ? "week"
          : "year";
  const count = validRanges[key];
  const minimum = mode === "Week flow" ? 3 : mode === "Year flow" ? 2 : 1;
  const maximum = mode === "Year flow" ? 100 : 520;
  const { points, actualMean, historyMean, actualSD, historySD } = chartData(
    state,
    metric,
    mode,
    count,
    weekday,
    M.localDate(),
  );
  const observed = points.flatMap((p) =>
    p.actual === undefined ? [] : [p.actual],
  );
  const stat = (n: number | undefined) => M.format(state, metric, n);
  const goal = state.goals.find((goal) => goal.metricId === metric.id);
  const goalLabel = goal ? `Goal: ${stat(goal.target)}` : undefined;
  const axisFactor = M.factor(M.displayUnit(state, metric));
  const axis = chooseYAxis(
    [
      ...points.flatMap((p) => [
        p.actual,
        p.average,
        p.previous,
        p.older,
        p.low,
        p.high,
      ]),
      goal?.target,
    ]
      .filter((v): v is number => v !== undefined)
      .map((v) => v / axisFactor),
    metric.kind === "length" ? (0.4 * M.factor("in")) / axisFactor : 2,
  );
  const yTicks = axis.ticks.map((v) => v * axisFactor);

  const isFlow = mode === "Week flow" || mode === "Year flow";
  const first = observed[0],
    last = observed[observed.length - 1];
  const series =
    mode === "Days YoY"
      ? [
          {
            key: "actual",
            label: String(new Date().getFullYear()),
            color: "var(--color-chart-current)",
          },
          {
            key: "previous",
            label: String(new Date().getFullYear() - 1),
            color: "var(--color-chart-comparison)",
          },
          {
            key: "older",
            label: String(new Date().getFullYear() - 2),
            color: "var(--color-chart-range)",
          },
        ]
      : [
          {
            key: "actual",
            label: "Current",
            color: "var(--color-chart-current)",
          },
          ...(isFlow
            ? [
                {
                  key: "average",
                  label: "Historical average",
                  color: "var(--color-chart-comparison)",
                },
                {
                  key: "low",
                  label: "±1 Std. dev.",
                  color: "var(--color-chart-range)",
                },
                { key: "high", label: "", color: "var(--color-chart-range)" },
              ]
            : []),
        ];
  return (
    <>
      <div className="tabs">
        {(
          ["Days YoY", "Previous weekdays", "Week flow", "Year flow"] as Mode[]
        ).map((t) => (
          <button
            key={t}
            className={mode === t ? "selected" : ""}
            onClick={() => setMode(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="card trend-card" aria-labelledby="trend-title">
        <h2 id="trend-title" className="sr-only">
          {mode}
        </h2>
        <div className="chart-controls">
          <label>
            Metric
            <select
              aria-label="Chart metric"
              value={metric.id}
              onChange={(e) => setSelection(e.target.value)}
            >
              {ms.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            {mode === "Days YoY"
              ? "Weeks covered"
              : mode === "Previous weekdays"
                ? "Weeks covered"
                : mode === "Week flow"
                  ? "Previous weeks"
                  : "Previous years"}
            <input
              key={key}
              type="number"
              min={minimum}
              max={maximum}
              step={1}
              value={drafts[key]}
              onChange={(e) => {
                const raw = e.target.value;
                setDrafts((current) => ({ ...current, [key]: raw }));
                const n = Number(raw);
                if (
                  raw.trim() &&
                  Number.isInteger(n) &&
                  n >= minimum &&
                  n <= maximum
                ) {
                  setValidRanges((current) => ({ ...current, [key]: n }));
                  requested.current[key] = n;
                  void commitRange(key, n);
                }
              }}
              onFocus={() => {
                focused.current = key;
              }}
              onBlur={() => {
                focused.current = undefined;
                setDrafts((current) => ({
                  ...current,
                  [key]: String(validRanges[key]),
                }));
              }}
            />
          </label>
          {mode === "Previous weekdays" && (
            <label>
              Weekday
              <select
                value={weekday}
                onChange={(e) => setWeekday(+e.target.value)}
              >
                {weekdays.map((d, i) => (
                  <option value={i} key={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {isFlow ? (
          <div className="stats">
            <div>
              <span>
                {mode === "Week flow"
                  ? "Last 7 day average"
                  : "Last 12 month average"}
              </span>
              <strong>{stat(actualMean)}</strong>
              <small>Std. dev. {stat(actualSD)}</small>
            </div>
            <div>
              <span>
                Past {count} {mode === "Week flow" ? "week" : "year"} average
              </span>
              <strong>{stat(historyMean)}</strong>
              <small>Std. dev. {stat(historySD)}</small>
            </div>
          </div>
        ) : (
          <div className="stats">
            {[
              { name: "Average", n: M.mean(observed) },
              {
                name: "Change",
                n: observed.length > 1 ? last - first : undefined,
              },
              {
                name: "Low",
                n: observed.length ? Math.min(...observed) : undefined,
              },
              {
                name: "High",
                n: observed.length ? Math.max(...observed) : undefined,
              },
            ].map((t) => (
              <div key={t.name}>
                <span>{t.name}</span>
                <strong>{stat(t.n)}</strong>
              </div>
            ))}
            <div>
              <span>Recorded</span>
              <strong>
                {observed.length}
                <em> days</em>
              </strong>
            </div>
          </div>
        )}
        {mode === "Days YoY" && (
          <div className="comparison-stats">
            {["previous", "older"].map((k, i) => {
              const vs = points.flatMap((p) =>
                p[k as "previous" | "older"] === undefined
                  ? []
                  : [p[k as "previous" | "older"]!],
              );
              return (
                <span key={k}>
                  {new Date().getFullYear() - i - 1} · Average{" "}
                  {stat(M.mean(vs))} · Change{" "}
                  {stat(vs.length > 1 ? vs[vs.length - 1] - vs[0] : undefined)}{" "}
                  · Low {stat(vs.length ? Math.min(...vs) : undefined)} · High{" "}
                  {stat(vs.length ? Math.max(...vs) : undefined)} · {vs.length}{" "}
                  recorded
                </span>
              );
            })}
          </div>
        )}
        <div className="chart-area">
          {goal ||
          points.some(
            (p) =>
              p.actual !== undefined ||
              p.average !== undefined ||
              p.previous !== undefined ||
              p.older !== undefined,
          ) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  syncWithTicks={true}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  width={65}
                  domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                  ticks={yTicks}
                  allowDataOverflow={true}
                  interval={0}
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  tickFormatter={(v) =>
                    (v / axisFactor).toLocaleString(undefined, {
                      minimumFractionDigits: axis.decimalPlaces,
                      maximumFractionDigits: axis.decimalPlaces,
                    })
                  }
                />
                {goal && (
                  <ReferenceLine
                    y={goal.target}
                    stroke="var(--color-chart-goal)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{
                      value: goalLabel,
                      position: "insideTopRight",
                      fill: "var(--color-text)",
                      fontSize: 11,
                    }}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    borderRadius: 12,
                  }}
                  formatter={(v) => stat(Number(v))}
                />
                <Legend />
                {series.map((line) => (
                  <Line
                    key={line.key}
                    type="linear"
                    dataKey={line.key}
                    name={line.label}
                    legendType={line.key === "high" ? "none" : "line"}
                    stroke={line.color}
                    strokeWidth={line.key === "actual" ? 2.5 : 1.5}
                    strokeOpacity={
                      line.key === "low" || line.key === "high" ? 0.5 : 1
                    }
                    strokeDasharray={
                      line.key === "low" || line.key === "high"
                        ? "1 4"
                        : undefined
                    }
                    strokeLinecap="round"
                    dot={
                      line.key !== "low" &&
                      line.key !== "high" &&
                      points.filter(
                        (p) => p[line.key as keyof typeof p] !== undefined,
                      ).length <= 14
                        ? { r: 3 }
                        : false
                    }
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty
              title="A picture of your progress."
              text="Your chart will appear as you record measurements. No sample data, just you."
            />
          )}
        </div>
      </section>
      <details className="data-details">
        <summary>
          View chart data{" "}
          <span>
            {points.length} {mode === "Year flow" ? "months" : "dates"}
          </span>
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>
                  {mode === "Days YoY" ? new Date().getFullYear() : "Actual"}
                </th>
                {mode === "Days YoY" ? (
                  <>
                    <th>{new Date().getFullYear() - 1}</th>
                    <th>{new Date().getFullYear() - 2}</th>
                  </>
                ) : isFlow ? (
                  <>
                    <th>Average</th>
                    <th>Std. dev.</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td>{stat(p.actual)}</td>
                  {mode === "Days YoY" ? (
                    <>
                      <td>{stat(p.previous)}</td>
                      <td>{stat(p.older)}</td>
                    </>
                  ) : isFlow ? (
                    <>
                      <td>{stat(p.average)}</td>
                      <td>{stat(p.deviation)}</td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
