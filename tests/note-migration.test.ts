import { it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { removeEntryNotes } from "../migrations.mjs";
function database(
  metadata = JSON.stringify({
    version: 1,
    revision: 7,
    goals: [{ metricId: "weight", target: 90 }],
  }),
) {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE journal(id INTEGER PRIMARY KEY, revision INTEGER, metadata TEXT); CREATE TABLE entries(date TEXT PRIMARY KEY,id TEXT UNIQUE,body TEXT)",
  );
  db.prepare("INSERT INTO journal VALUES(1,7,?)").run(metadata);
  const entries = [
    {
      id: "a",
      date: "2026-11-07",
      values: { weight: 90.123456789 },
      note: "Old note",
    },
    {
      id: "b",
      date: "2026-11-08",
      values: { weight: 91, gut: 97.4725 },
      note: "",
    },
  ];
  for (const entry of entries)
    db.prepare("INSERT INTO entries VALUES(?,?,?)").run(
      entry.date,
      entry.id,
      JSON.stringify(entry),
    );
  return { db, entries };
}
it("removes stored note fields without changing any measurements or dates and only runs once", () => {
  const { db, entries } = database();
  expect(removeEntryNotes(db)).toBe(2);
  const after = db
    .prepare("SELECT date,id,body FROM entries ORDER BY date")
    .all();
  for (let index = 0; index < entries.length; index++) {
    const { note, ...expected } = entries[index];
    expect(JSON.parse(after[index].body as string)).toEqual(expected);
    expect(after[index].date).toBe(expected.date);
    expect(after[index].id).toBe(expected.id);
  }
  expect(db.prepare("SELECT revision FROM journal").get()?.revision).toBe(8);
  expect(
    JSON.parse(
      db.prepare("SELECT metadata FROM journal").get()?.metadata as string,
    ).goals,
  ).toEqual([{ metricId: "weight", target: 90 }]);
  expect(removeEntryNotes(db)).toBe(0);
  expect(db.prepare("SELECT revision FROM journal").get()?.revision).toBe(8);
  db.close();
});
it("rolls back note removal if the journal metadata cannot be migrated", () => {
  const { db } = database("invalid-json");
  expect(() => removeEntryNotes(db)).toThrow();
  expect(
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM entries WHERE json_type(body,'$.note') IS NOT NULL",
      )
      .get()?.count,
  ).toBe(2);
  expect(db.prepare("SELECT revision FROM journal").get()?.revision).toBe(7);
  db.close();
});
