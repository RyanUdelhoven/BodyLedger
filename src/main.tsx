import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Plus,
  ChartNoAxesCombined,
  Target,
  Settings,
  ChevronRight,
  Sun,
  Moon,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import * as M from "./model";
import { load, save } from "./db";
import type { Commit, CommitRange } from "./types";
import { EntryPage } from "./components/EntryPage";
import { Trends } from "./components/Trends";
import { Goals } from "./components/Goals";
import { SettingsPage } from "./components/SettingsPage";
import { ReminderRunner } from "./components/ReminderRunner";
import "./styles.css";
function App() {
  const [state, setState] = useState<M.State>();
  const [fatal, setFatal] = useState("");
  const [tab, setTab] = useState("New entry");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const latestState = useRef<M.State | undefined>(undefined);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [review, setReview] = useState<{
    base: number;
    next: M.State;
    pending: M.Entry[];
    current: M.Entry;
    incoming: M.Entry;
    done: number;
    onSaved?: () => void;
  }>();
  useEffect(() => {
    load()
      .then((loaded) => {
        latestState.current = loaded;
        setState(loaded);
      })
      .catch((e) => setFatal(String(e)));
  }, []);
  useEffect(() => {
    if (state) document.documentElement.dataset.theme = state.settings.theme;
  }, [state?.settings.theme]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(t);
  }, [message]);
  // Serialize writes against the latest acknowledged revision. Range edits do not
  // disable unrelated controls and cannot overwrite another range's pending save.
  function enqueue(update: (current: M.State) => M.State): Promise<boolean> {
    const operation = mutationQueue.current.then(async () => {
      try {
        const current = latestState.current;
        if (!current) return false;
        const result = await save(
          M.captureGoalStarts(update(current)),
          current.revision,
        );
        latestState.current = result;
        setState(result);
        return true;
      } catch (e) {
        setMessage(String(e));
        return false;
      }
    });
    mutationQueue.current = operation;
    return operation;
  }
  const commitRange: CommitRange = (key, value) =>
    enqueue((current) => ({
      ...current,
      ranges: { ...current.ranges, [key]: value },
    }));
  const commit: Commit = async (next) => {
    if (!state || lock.current) return false;
    lock.current = true;
    setBusy(true);
    try {
      const changesRanges = (
        Object.keys(next.ranges) as (keyof M.State["ranges"])[]
      ).some((key) => next.ranges[key] !== state.ranges[key]);
      return await enqueue((current) => ({
        ...next,
        ranges: changesRanges ? next.ranges : current.ranges,
      }));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  async function process(
    next: M.State,
    pending: M.Entry[],
    done = 0,
    onSaved?: () => void,
  ) {
    while (pending.length) {
      const incoming = pending[0],
        old = next.entries.find((e) => e.date === incoming.date);
      if (old && old.id !== incoming.id && M.conflicts(old, incoming)) {
        setReview({
          base: state!.revision,
          next,
          pending: pending.slice(1),
          current: old,
          incoming,
          done,
          onSaved,
        });
        return;
      }
      next.entries = next.entries.filter(
        (e) => e.date !== incoming.date && e.id !== incoming.id,
      );
      next.entries.push(
        old && old.id !== incoming.id ? M.mergeEntry(old, incoming) : incoming,
      );
      pending = pending.slice(1);
      done++;
    }
    next.metrics = next.metrics.filter(
      (m) =>
        state!.metrics.some((old) => old.id === m.id) ||
        next.entries.some((e) => e.values[m.id] !== undefined),
    );
    if (await commit(next)) {
      setMessage(`Saved ${done} ${done === 1 ? "entry" : "entries"}.`);
      setReview(undefined);
      onSaved?.();
    }
  }
  async function submit(
    entries: M.Entry[],
    newMetrics?: M.Metric[],
    onSaved?: () => void,
  ) {
    if (!state) return;
    await process(
      { ...structuredClone(state), metrics: newMetrics ?? state.metrics },
      entries,
      0,
      onSaved,
    );
  }
  if (fatal)
    return (
      <main className="fatal">
        <h1>Could not open your journal</h1>
        <p>{fatal}</p>
        <p>
          Your saved database has not been overwritten. Check the local database
          connection and reload.
        </p>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    );
  if (!state)
    return (
      <main className="fatal">
        <Activity />
        <p>Opening your journal…</p>
      </main>
    );
  const ms = M.metrics(state);
  const latest = [...state.entries].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("New entry");
          }}
        >
          <span className="brand-icon">
            <Activity size={23} />
          </span>
          BodyLedger<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">PERSONAL JOURNAL</div>
        <nav>
          {[
            { name: "New entry", icon: Plus },
            { name: "Trends", icon: ChartNoAxesCombined },
            { name: "Goals", icon: Target },
            { name: "Settings", icon: Settings },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "nav-item active" : "nav-item"}
              onClick={() => setTab(name)}
            >
              <Icon size={19} />
              {name}
              {tab === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private">
            <ShieldCheck size={18} />
            <div>
              Yours. Only yours.<small>Stored in your local database</small>
            </div>
          </div>
          <button
            className="theme-button"
            onClick={() =>
              commit({
                ...state,
                settings: {
                  ...state.settings,
                  theme: state.settings.theme === "dark" ? "light" : "dark",
                },
              })
            }
          >
            {state.settings.theme === "dark" ? (
              <Sun size={16} />
            ) : (
              <Moon size={16} />
            )}{" "}
            {state.settings.theme === "dark"
              ? "Light appearance"
              : "Dark appearance"}
          </button>
          <div className="version">
            BODYLEDGER <span>LOCAL / V1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            My journal <ChevronRight size={14} /> <strong>{tab}</strong>
          </span>
          <span className="local-pill">
            <i /> Local database active
          </span>
        </header>
        <main aria-busy={busy}>
          <fieldset disabled={busy} className="journal-controls">
            <h1 className="sr-only">{tab}</h1>
            {message && (
              <div role="status" className="toast">
                <Check size={17} />
                {message}
                <button
                  aria-label="Dismiss message"
                  onClick={() => setMessage("")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div hidden={tab !== "New entry"}>
              <EntryPage state={state} submit={submit} busy={busy} />
            </div>
            {tab === "Trends" && (
              <Trends state={state} commitRange={commitRange} />
            )}
            {tab === "Goals" && <Goals state={state} commit={commit} />}
            {tab === "Settings" && (
              <SettingsPage
                state={state}
                commit={commit}
                submit={submit}
                notify={setMessage}
              />
            )}
            <ReminderRunner state={state} onOpen={() => setTab("New entry")} />
            <footer>
              <Activity size={14} /> Small steps, thoughtfully recorded.
              <span>
                {state.entries.length.toLocaleString()} entries · {ms.length}{" "}
                metrics{latest ? ` · Latest ${latest.date}` : ""}
              </span>
            </footer>
          </fieldset>
        </main>
      </div>
      {review && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-title"
          >
            <div className="eyebrow">ONE REPORT PER DAY</div>
            <h2 id="conflict-title">Choose the entry to keep</h2>
            <p>
              Conflicting measurements for {review.incoming.date}. Other dates
              save after every choice is complete.
            </p>
            <div className="conflict-options">
              {[
                { entry: review.current, label: "Saved entry" },
                { entry: review.incoming, label: "Incoming entry" },
              ].map(({ entry, label }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (review.base !== state.revision) {
                      setMessage(
                        "Data changed. Cancel and restart this review.",
                      );
                      return;
                    }
                    const next = structuredClone(review.next);
                    next.entries = next.entries.filter(
                      (e) =>
                        e.date !== entry.date &&
                        (entry !== review.incoming || e.id !== entry.id),
                    );
                    next.entries.push(entry);
                    void process(
                      next,
                      review.pending,
                      review.done + 1,
                      review.onSaved,
                    );
                  }}
                >
                  <h3>{label}</h3>
                  {M.metrics(review.next)
                    .filter((m) => M.value(review.next, entry, m) !== undefined)
                    .map((m) => (
                      <p key={m.id}>
                        {m.title}
                        <strong>
                          {M.format(
                            review.next,
                            m,
                            M.value(review.next, entry, m),
                          )}
                        </strong>
                      </p>
                    ))}
                </button>
              ))}
            </div>
            <button className="secondary" onClick={() => setReview(undefined)}>
              Cancel import or save
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function Root() {
  return <App />;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
