import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  statSync,
  createReadStream,
} from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { validateState } from "./src/model.ts";
const dbPath = process.env.DB_PATH ?? "/data/bodyledger.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS journal (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, metadata TEXT NOT NULL); CREATE TABLE IF NOT EXISTS entries (date TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE, body TEXT NOT NULL)",
);
const current = () =>
  db.prepare("SELECT revision,metadata FROM journal WHERE id=1").get();
function read() {
  const row = current();
  return {
    ...JSON.parse(row.metadata),
    revision: row.revision,
    entries: db
      .prepare("SELECT body FROM entries ORDER BY date")
      .all()
      .map((r) => JSON.parse(r.body)),
  };
}
function write(state, expected) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = current();
    if (row && row.revision !== expected) {
      const e = Error(
        "Data changed in another tab. Reload before saving; your draft is still here.",
      );
      e.status = 409;
      throw e;
    }
    const revision = (row?.revision ?? 0) + 1;
    const { entries, ...metadata } = state;
    db.prepare(
      "INSERT INTO journal(id,revision,metadata) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,metadata=excluded.metadata",
    ).run(revision, JSON.stringify(metadata));
    db.exec("DELETE FROM entries");
    const insert = db.prepare(
      "INSERT INTO entries(date,id,body) VALUES(?,?,?)",
    );
    for (const entry of entries)
      insert.run(entry.date, entry.id, JSON.stringify(entry));
    db.exec("COMMIT");
    return { ...state, revision };
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
if (!current())
  write(
    validateState(
      JSON.parse(
        readFileSync(
          new URL("./data/BodyLedger-demo.json", import.meta.url),
          "utf8",
        ),
      ),
    ),
    0,
  );
const root = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/health") {
      db.prepare("SELECT 1").get();
      return json(200, {
        status: "ok",
        testEnvironment: process.env.BODYLEDGER_TEST === "1",
      });
    }
    if (pathname === "/api/journal") {
      if (req.method === "GET") return json(200, read());
      if (req.method !== "PUT")
        return json(405, { error: "Method not allowed." });
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}` &&
        req.headers.origin !== `https://${req.headers.host}`
      )
        return json(403, { error: "Invalid origin." });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return json(415, { error: "JSON is required." });
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 30 * 1024 * 1024)
          return json(413, { error: "Journal is too large." });
      }
      const input = JSON.parse(body);
      const state = validateState(input.state);
      if (!Number.isInteger(input.expected))
        return json(400, { error: "Expected revision is required." });
      return json(200, write(state, input.expected));
    }
    if (pathname.startsWith("/api/")) return json(404, { error: "Not found." });
    if (req.method !== "GET" && req.method !== "HEAD")
      return json(405, { error: "Method not allowed." });
    let path = resolve(root, "." + decodeURIComponent(pathname));
    if (path !== root && !path.startsWith(root + "/"))
      return json(403, { error: "Invalid path." });
    if (!existsSync(path) || !statSync(path).isFile())
      path = resolve(root, "index.html");
    res.writeHead(200, {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Cache-Control": pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(path).pipe(res);
  } catch (e) {
    json(e.status ?? 400, {
      error: e.message ?? "Could not process the request.",
    });
  }
});
server.listen(Number(process.env.PORT ?? 8080), "0.0.0.0", () =>
  console.log(
    `BodyLedger serving SQLite journal on port ${process.env.PORT ?? 8080}`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
