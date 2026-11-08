import * as M from "../model";
import type { Commit } from "../types";
export function Notifications({
  state,
  commit,
  notify,
}: {
  state: M.State;
  commit: Commit;
  notify: (s: string) => void;
}) {
  const settings = (p: Partial<M.State["settings"]>) =>
    commit({ ...state, settings: { ...state.settings, ...p } });
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Notifications</h2>
          <p>A gentle nudge when it’s time to check in.</p>
        </div>
      </div>
      <div className="settings-body">
        <label className="check-row">
          <input
            type="checkbox"
            checked={state.settings.reminders}
            onChange={async (e) => {
              if (e.target.checked) {
                if (!("Notification" in window)) {
                  notify("This browser does not support notifications.");
                  return;
                }
                try {
                  const permission = await Notification.requestPermission();
                  if (permission !== "granted") {
                    notify(
                      "Allow notifications for this site in your browser settings.",
                    );
                    return;
                  }
                  await settings({ reminders: true });
                } catch {
                  notify(
                    "Notifications need a supported browser and a secure or localhost URL.",
                  );
                }
              } else await settings({ reminders: false });
            }}
          />
          Entry reminders
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={state.settings.sharedTime}
            onChange={(e) => settings({ sharedTime: e.target.checked })}
          />
          Same time for all metrics
        </label>
        {state.settings.sharedTime ? (
          <label>
            Entry time
            <input
              type="time"
              value={state.settings.time}
              onChange={(e) =>
                e.target.value && settings({ time: e.target.value })
              }
            />
          </label>
        ) : (
          <p className="muted">
            Set each metric’s time under Measurement schedules.
          </p>
        )}
        <label className="spaced">
          Expires after (hours)
          <input
            type="number"
            min={1}
            max={72}
            value={state.settings.expiry}
            onChange={(e) => {
              const n = +e.target.value;
              if (n >= 1 && n <= 72) settings({ expiry: n });
            }}
          />
        </label>
        <p className="muted">
          Browser reminders run while this journal is open. Closed-browser
          delivery is not implemented.
        </p>
      </div>
    </section>
  );
}
