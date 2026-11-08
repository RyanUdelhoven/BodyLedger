import * as M from "../model";
import { Empty } from "./Empty";
export function HistoryTable({
  state,
  entries,
  onEdit,
  selected = [],
  onToggle,
  highlightedId,
  idPrefix = "entry",
}: {
  state: M.State;
  entries: M.Entry[];
  onEdit: (entry: M.Entry) => void;
  selected?: string[];
  onToggle?: (id: string, checked: boolean) => void;
  highlightedId?: string;
  idPrefix?: string;
}) {
  const metrics = M.metrics(state);
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {onToggle && <th>Select</th>}
            <th>Date</th>
            {metrics.map((metric) => (
              <th key={metric.id}>{metric.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              id={`${idPrefix}-${entry.id}`}
              key={entry.id}
              className={highlightedId === entry.id ? "highlight" : ""}
            >
              {onToggle && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${entry.date}`}
                    checked={selected.includes(entry.id)}
                    onChange={(event) =>
                      onToggle(entry.id, event.target.checked)
                    }
                  />
                </td>
              )}
              <td>
                <button className="text-link" onClick={() => onEdit(entry)}>
                  {entry.date}
                </button>
                {entry.demo && <small className="demo-label">Synthetic</small>}
              </td>
              {metrics.map((metric) => (
                <td key={metric.id}>
                  {M.format(state, metric, M.value(state, entry, metric))}
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
  );
}
