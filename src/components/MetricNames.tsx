import { useState } from "react";
import type { State } from "../model";
import type { Commit } from "../types";

export function MetricNames({
  state,
  commit,
  notify,
}: {
  state: State;
  commit: Commit;
  notify: (message: string) => void;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Metric names</h2>
          <p>
            Rename a metric everywhere, including history and CSV column
            headers.
          </p>
        </div>
      </div>
      <form
        className="settings-body"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const metrics = state.metrics.map((metric) => ({
            ...metric,
            title: (names[metric.id] ?? metric.title).trim(),
          }));
          if (
            metrics.some((metric) => !metric.title || metric.title.length > 10)
          ) {
            setError("Use metric names from 1 to 10 characters.");
            return;
          }
          const titles = metrics.map((metric) => metric.title.toLowerCase());
          if (
            new Set(titles).size !== titles.length ||
            titles.includes("waist/ht")
          ) {
            setError("Each metric needs a unique name.");
            return;
          }
          if (await commit({ ...state, metrics })) {
            setNames({});
            notify("Metric names saved.");
          }
        }}
      >
        <div className="field-grid">
          {state.metrics.map((metric) => (
            <label key={metric.id}>
              {metric.title} name
              <input
                aria-label={`${metric.title} name`}
                required
                maxLength={10}
                value={names[metric.id] ?? metric.title}
                onChange={(event) =>
                  setNames({ ...names, [metric.id]: event.target.value })
                }
              />
            </label>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="secondary" disabled={!state.metrics.length}>
          Save metric names
        </button>
      </form>
    </section>
  );
}
