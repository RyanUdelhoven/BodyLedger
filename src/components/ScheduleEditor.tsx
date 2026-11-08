import * as M from "../model";

import { weekdays } from "../ui";
export function ScheduleEditor({
  value: s,
  onChange,
}: {
  value: M.Schedule;
  onChange: (s: M.Schedule) => void;
}) {
  const set = (p: Partial<M.Schedule>) => onChange({ ...s, ...p });
  return (
    <div className="schedule-editor">
      <label>
        Reporting schedule
        <select
          value={s.frequency}
          onChange={(e) =>
            set({ frequency: e.target.value as M.Schedule["frequency"] })
          }
        >
          <option value="daily">Daily</option>
          <option value="weekly">Day of week</option>
          <option value="monthly">Days of month</option>
          <option value="intervalWeeks">Every X weeks</option>
        </select>
      </label>
      {(s.frequency === "weekly" || s.frequency === "intervalWeeks") && (
        <label>
          Weekday
          <select
            value={s.weekday}
            onChange={(e) => set({ weekday: +e.target.value })}
          >
            {weekdays.map((d, i) => (
              <option value={i} key={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      )}
      {s.frequency === "monthly" && (
        <fieldset>
          <legend>Days of month</legend>
          <div className="month-days">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <button
                type="button"
                aria-pressed={s.days.includes(n)}
                key={n}
                className={s.days.includes(n) ? "selected" : ""}
                onClick={() => {
                  const days = s.days.includes(n)
                    ? s.days.filter((d) => d !== n)
                    : [...s.days, n].sort((a, b) => a - b);
                  if (days.length) set({ days });
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {s.frequency === "intervalWeeks" && (
        <>
          <label>
            Every X weeks
            <input
              type="number"
              min={1}
              max={520}
              value={s.interval}
              onChange={(e) =>
                set({ interval: Math.max(1, Math.min(520, +e.target.value)) })
              }
            />
          </label>
          <label>
            Reference week
            <input
              type="date"
              value={s.anchor}
              required
              onChange={(e) =>
                e.target.value && set({ anchor: e.target.value })
              }
            />
          </label>
        </>
      )}
      <label>
        Reminder time
        <input
          type="time"
          value={s.time}
          required
          onChange={(e) => set({ time: e.target.value })}
        />
      </label>
    </div>
  );
}
