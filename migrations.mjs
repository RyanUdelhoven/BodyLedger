import assert from "node:assert/strict";

export function removeEntryNotes(db) {
  const notesCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM entries WHERE json_type(body,'$.note') IS NOT NULL",
    )
    .get().count;
  if (!notesCount) return 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const before = db
      .prepare("SELECT date,id,body FROM entries ORDER BY date")
      .all();
    db.exec(
      "UPDATE entries SET body=json_remove(body,'$.note') WHERE json_type(body,'$.note') IS NOT NULL",
    );
    const after = db
      .prepare("SELECT date,id,body FROM entries ORDER BY date")
      .all();
    assert.equal(after.length, before.length);
    before.forEach((row, index) => {
      const { note, ...entry } = JSON.parse(row.body);
      assert.equal(after[index].date, row.date);
      assert.equal(after[index].id, row.id);
      assert.deepEqual(JSON.parse(after[index].body), entry);
    });
    const journal = db
        .prepare("SELECT revision,metadata FROM journal WHERE id=1")
        .get(),
      metadata = JSON.parse(journal.metadata),
      revision = journal.revision + 1;
    db.prepare("UPDATE journal SET revision=?,metadata=? WHERE id=1").run(
      revision,
      JSON.stringify({ ...metadata, revision }),
    );
    db.exec("COMMIT");
    return Number(notesCount);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
