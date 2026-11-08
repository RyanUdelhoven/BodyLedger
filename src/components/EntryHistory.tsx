import { useMemo, useState } from "react";
import type { State, Entry } from "../model";
import { HistoryTable } from "./HistoryTable";
export function EntryHistory({
  state,
  onSelect,
}: {
  state: State;
  onSelect: (entry: Entry) => void;
}) {
  const [limit, setLimit] = useState(100);
  const entries = useMemo(
    () => [...state.entries].sort((a, b) => b.date.localeCompare(a.date)),
    [state.entries],
  );
  return (
    <section
      className="card history-card entry-history"
      aria-labelledby="entry-history-title"
    >
      <div className="card-header">
        <div>
          <h2 id="entry-history-title">History</h2>
          <p>
            {entries.length.toLocaleString()} daily reports. Select a date to
            edit its measurements above.
          </p>
        </div>
      </div>
      <HistoryTable
        state={state}
        entries={entries.slice(0, limit)}
        onEdit={onSelect}
        idPrefix="new-history"
      />
      {entries.length > limit && (
        <button
          className="secondary load-more"
          onClick={() => setLimit((current) => current + 200)}
        >
          Show more entries
        </button>
      )}
    </section>
  );
}
