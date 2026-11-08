# BodyLedger

React and TypeScript measurement journal with a persistent local SQLite database.

## Open

Bookmark **http://bodyledger.localhost:18080/**. Docker Desktop and Coulson must be running; visiting the bookmark starts the managed Compose app. Reload a previously opened tab to use the current version.

The database already contains the requested synthetic history: **2,504 daily entries**, January 1, 2020–November 8, 2026 inclusive, with daily Weight and 358 Sunday-only Gut measurements. Weight uses 0.1 lb increments; Gut uses 1/8 inch increments. The 2024 first-to-last weight loss is 15.0 lb. See `data/README.md` for generation details and CSV/JSON copies.

## Storage

SQLite lives at `/data/bodyledger.sqlite` inside the container, backed by Docker volume **`bodyledger_journal`**. The `entries` table holds one row per calendar date, enforced by its primary key. The `journal` table holds revisioned metric definitions, settings, goals, and profile metadata. Saves update both tables in a single transaction and reject stale revisions.

A small Node 24 service serves the built React client and same-origin `/api/journal` endpoint. The application now uses this database across browsers and both local URLs. Browser storage is no longer the active journal. Earlier IndexedDB databases remain untouched; previously downloaded full journal backups can be restored through Settings if needed.

The synthetic dataset seeds a new database once. Restarting or rebuilding the container preserves changes and never reseeds an existing database, including intentionally emptied journals. Do not run `docker compose down -v` or delete the named volume unless intentionally removing all data.

Settings → Manage data provides full JSON backup/restore, measurement CSV import/export, history editing, inclusive date-range deletion, and metric deletion. Restore replaces the current journal; deletions run immediately. Full backups include preferences and goals; CSV contains measurements and notes. SQLite must be backed up consistently: use the app’s full backup, SQLite’s backup mechanism, or stop the app before copying database files. Copying a live SQLite file without its WAL can omit recent writes.

## Docker and Coulson

```sh
docker compose -p bodyledger up -d --build
coulson stop bodyledger
coulson ps
docker compose -p bodyledger logs --tail 50 web
```

The web service listens on container port 8080, published only at `127.0.0.1:3000`. Coulson proxies the bookmark to that port. `.coulson.toml` selects Docker, `compose.yml`, and service `web`. `~/.coulson/bodyledger` links to this project. The shared local-port registry reserves port 3000. Coulson’s launch agent includes `/usr/local/bin` so it can find Docker. Its existing idle timeout is 900 seconds; automatic idle shutdown has not been timed.

To unregister only this app, stop it, remove its `~/.coulson/bodyledger` symlink, and rescan Coulson. Preserve the database volume. No TLS trust, global domain, or network exposure changes are required.

## Features

Manual measurements and notes, custom metrics, independent units/precision, reporting schedules, four trend views with statistics/tables, goals, profile-based waist-to-height ratio, CSV import/export, backups, demo refresh, bulk deletion, and responsive light/dark themes are included. Gut in the requested demo appears only on Sundays, regardless of a customized reporting schedule. Refresh demo preserves non-demo entries on occupied dates; full demo replacement clears existing entries and goals.

Notifications are optional and work while the journal is open. Closed-browser reminder delivery is not implemented. No accounts, cloud sync, telemetry, or external fonts are used. The original iOS project remains untouched; its CSV export can transfer measurements.

## Development

Use Node 24, which supplies SQLite and TypeScript stripping.

```sh
npm ci
npm run build
DB_PATH=/tmp/bodyledger-development.sqlite PORT=8080 node --experimental-strip-types server.mjs
```

Open `http://localhost:8080`. For frontend hot reload, keep Docker running and use `npm run dev`; Vite proxies `/api` to `127.0.0.1:3000`, using the same database.

```sh
npm test
npm run test:browser
```

Browser tests launch a separate local server on port 3101 with a temporary SQLite database. Mutation fixtures refuse to operate against the real database. Installed Google Chrome is required. `BODYLEDGER_URL` is available for explicitly selected targets; never point mutation tests at the live journal. The lifecycle test requires explicit `BODYLEDGER_LIFECYCLE=1` and stops only BodyLedger; normal tests skip it.

## Source map

`server.mjs` owns SQLite, initial seeding, transactions, and static/API HTTP serving. `src/db.ts` is the typed client for that API. `src/model.ts` owns validation, units, calendars, CSV, and synthetic data. `src/trends.ts` computes chart series. `src/components/` holds UI areas; `src/main.tsx` owns navigation and atomic conflict review. `src/styles.css` defines semantic themes and responsive styling.

## SQLite verification

The live database was queried directly: 2,504 rows span 2020-01-01 through 2026-11-08, with 358 Sunday Gut measurements. Fifteen model tests and five isolated browser journeys passed. A separate read-only live check verified two Coulson stop/bookmark-start cycles preserved the complete journal, including revisions, identifiers, and settings. Automatic idle shutdown remains untested.

Trends range controls retain independent draft and saved values for each chart. Valid edits queue against the latest acknowledged database revision without disabling the other controls. Empty or out-of-range input leaves the chart at its last valid range and resets on blur. The delayed-save browser regression checks typing, arrow stepping, switching chart modes, independent persistence, and reload.

Days YoY uses **Weeks covered**: a value of N selects the latest N × 7 calendar days, ending today. Prior-year series align to those calendar dates one and two years earlier. The existing internal `ranges.days` preference now stores this week count; other chart range controls retain their own units and values.

All trend line series connect across missing observations, including year comparisons, historical averages, and deviation boundaries. Missing measurements remain absent in tables and statistics; connecting the visual line does not create or interpolate stored values. Weekday bars retain their empty positions.

Trends uses one shared metric selection across Days YoY, Previous weekdays, Week flow, and Year flow. Changing the metric in any of these views updates the selection for all four views; range values remain independent.

Previous weekdays labels its range **Weeks covered**. All trend Y axes use explicit whole-number ticks in the selected display units, with at most five horizontal grid lines including the bottom and top bounds. Bounds include every plotted series and deviation boundary. Measurement, tooltip, and table precision remain unchanged.

Every Trends graph displays the selected metric’s goal as a labeled dashed target line when that goal exists. Targets follow display units, remain visible outside the observed range, and appear even without observations. Axis bounds include the goal while retaining the five-grid-line limit. Switching to a metric without a goal hides the line; removing a goal removes it from all graphs.
