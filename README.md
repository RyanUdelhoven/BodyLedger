# My Normal

**Your measurements. Your history. Hosted on your own computer.**

My Normal is a personal measurement journal that runs locally and opens in your browser. Track weight, body measurements, and custom metrics; explore trends; and set goals that account for time spent above or below a target.

Your journal lives in a SQLite database on your computer, preserved in a Docker volume. My Normal does not require an account, a cloud database, or a hosting subscription. It includes no telemetry or external fonts.

## Why I recommend Coulson

I recommend running My Normal with [Coulson](https://github.com/ratazzi/coulson), a local application gateway. It makes a locally hosted app feel like a regular bookmarked website:

- **Open a bookmark to start the app.** Coulson starts the registered Docker Compose application when you visit its URL.
- **Use a memorable address.** Open `http://mynormal.localhost:18080/` instead of remembering a port number.
- **Keep the terminal out of everyday use.** Register the app once, then open it from your browser.
- **Manage local apps together.** Coulson provides status, logs, and start/stop commands for registered applications.

Coulson and the Docker engine must already be running. Opening the bookmark does not launch Docker Desktop or a stopped Coulson daemon. Coulson can stop idle applications according to its configuration; My Normal's saved data persists when its container stops.

Coulson is recommended, but optional. You can also run My Normal directly with Docker Compose.

## Get started

### Requirements

- Docker Desktop, or a working Docker engine with Docker Compose.
- A browser.
- Coulson for bookmark-triggered startup. This setup uses Coulson on macOS.

You do not need Node.js installed on your computer to run the Docker version.

### Build and run

From the project directory:

```sh
docker compose -p mynormal up -d --build
```

Open **http://localhost:3000/**. The published port binds to your computer's loopback interface.

### Use Coulson

Install and start Coulson following its [setup instructions](https://github.com/ratazzi/coulson). Start Docker Desktop as well.

My Normal includes `.coulson.toml`, which selects the Docker provider, `compose.yml`, service `web`, and host port `3000`.

For Coulson's default `~/.coulson` apps directory, register the project from its root:

```sh
mkdir -p ~/.coulson
ln -s "$PWD" ~/.coulson/mynormal
coulson scan
```

If `~/.coulson/mynormal` already links to this project, skip the link command. If you configured a different apps directory, use that directory instead.

Bookmark **http://mynormal.localhost:18080/**. This address assumes the `.localhost` suffix and HTTP gateway port `18080` used by this setup; adjust it if your Coulson configuration differs.

Useful commands:

```sh
coulson ps
coulson stop mynormal
coulson doctor
docker compose -p mynormal logs --tail 50 web
```

After stopping My Normal through Coulson, visiting its bookmark starts it again. For an app update, rebuild with the Docker Compose command above and refresh your browser.

## What you can do

- **Record measurements:** one entry per date, custom metrics, unit conversion, and quick keyboard entry. Submit saves the entry and opens Trends → Days YoY.
- **Explore Trends:** Days YoY, Previous weekdays, Week flow, and Year flow, with shared metric selection.
- **Set goals:** above/below targets with durations in days or weeks and measured streak progress.
- **Manage history:** edit saved dates, rename metrics, and delete selected entries, date ranges, or metrics.
- **Move your data:** CSV import/export and full JSON backup/restore under **Settings → Manage data**.
- **Personalize:** light/dark themes, display precision, measurement schedules, and waist-to-height ratio.

Goal streaks bridge missing dates between recorded observations and stop at the latest measurement. A value equal to the target does not satisfy a strict above/below goal. Optional reminders work while the journal is open.

New databases start with synthetic example measurements from January 1, 2020, through November 8, 2026. Existing databases are never reseeded, including intentionally emptied journals. Remove unwanted example entries through the history or date-range deletion controls. See [data/README.md](data/README.md) for dataset details.

## Import a CSV

Use **Settings → Manage data → Import CSV**. The adjacent **See the CSV format** control shows an example.

```csv
Date,Weight (lb),Gut (in)
2026-11-01,206.1,38.375
2026-11-02,205.7,
```

Use one row per calendar date, dates formatted as `YYYY-MM-DD`, and metric names with units in the headers. Leave missing measurements blank. Files must be no larger than 10 MB. Exporting a CSV first provides headers matching your current metric names.

## Keep your data safe

The database lives at `/data/mynormal.sqlite` inside the container, stored in the persistent Docker volume **`mynormal_journal`**. Rebuilding or restarting the app preserves it. Browser storage is not the active journal.

Download a **Full backup** from Settings to preserve measurements, metric definitions, goals, schedules, and preferences. CSV exports contain measurement data. Restoring a full backup replaces the journal; deletion controls take effect immediately.

**Do not delete the database volume or run `docker compose down -v` unless you intend to erase your journal.** Local hosting keeps storage under your control; keep backups somewhere separate from the app's disk.

## Development

The frontend uses React and TypeScript. A small Node 24 service serves the built client and its SQLite API. Docker packages both together.

With Node 24 installed:

```sh
npm ci
npm run build
DB_PATH=/tmp/mynormal-development.sqlite PORT=8080 node --experimental-strip-types server.mjs
```

Open `http://localhost:8080`. For frontend hot reload, run the Docker app and `npm run dev`; Vite proxies API requests to `127.0.0.1:3000`, using that app's database.

```sh
npm test
npm run test:browser
```

Browser tests require installed Google Chrome and use a temporary SQLite database on port `3101`. Keep mutation tests away from your real journal. Live lifecycle tests require explicit opt-in and remain skipped in normal runs.
