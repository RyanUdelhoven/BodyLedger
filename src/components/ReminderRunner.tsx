import { useEffect, useRef } from "react";
import * as M from "../model";

export function ReminderRunner({
  state,
  onOpen,
}: {
  state: M.State;
  onOpen: () => void;
}) {
  const delivered = useRef(new Set<string>());
  useEffect(() => {
    if (
      !state.settings.reminders ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    let active: Notification | undefined;
    const tick = () => {
      const today = M.localDate(),
        now = new Date();
      const missing = state.metrics.filter(
        (m) =>
          M.due(m.schedule, today) &&
          state.entries.find((e) => e.date === today)?.values[m.id] ===
            undefined,
      );
      const due = missing.filter((m) => {
        const [h, min] = (
          state.settings.sharedTime ? state.settings.time : m.schedule.time
        )
          .split(":")
          .map(Number);
        const at = M.date(today);
        at.setHours(h, min, 0, 0);
        return now >= at && +now < +at + state.settings.expiry * 3600000;
      });
      const key = `${today}:${due.map((m) => m.id).join(",")}`;
      if (!due.length) {
        active?.close();
        active = undefined;
        return;
      }
      if (delivered.current.has(key)) return;
      delivered.current.add(key);
      active?.close();
      active = new Notification("Time for an entry", {
        body: `Your scheduled measurements need an entry: ${due.map((m) => m.title).join(", ")}.`,
        tag: "bodyledger-reminder",
      });
      active.onclick = () => {
        window.focus();
        onOpen();
        window.dispatchEvent(
          new CustomEvent("bodyledger-entry-date", { detail: today }),
        );
        active?.close();
      };
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => {
      clearInterval(timer);
      active?.close();
    };
  }, [state]);
  return null;
}
