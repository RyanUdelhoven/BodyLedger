import { Upload } from "lucide-react";
import * as M from "../model";
import type { Submit } from "../types";
export function CSVImport({
  state,
  submit,
  notify,
}: {
  state: M.State;
  submit: Submit;
  notify: (message: string) => void;
}) {
  return (
    <div className="csv-import-controls">
      <label className="upload-button secondary">
        <Upload size={16} /> Import CSV
        <input
          type="file"
          accept=".csv,.tsv,text/csv"
          onChange={async (event) => {
            const input = event.currentTarget,
              file = input.files?.[0];
            if (!file) return;
            try {
              if (file.size > 10 * 1024 * 1024)
                throw Error("Choose a CSV smaller than 10 MB.");
              const bytes = await file.arrayBuffer(),
                view = new Uint8Array(bytes);
              const encoding =
                view[0] === 255 && view[1] === 254
                  ? "utf-16le"
                  : view[0] === 254 && view[1] === 255
                    ? "utf-16be"
                    : "utf-8";
              const imported = M.importCSV(
                state,
                new TextDecoder(encoding).decode(bytes),
              );
              await submit(imported.entries, imported.metrics);
            } catch (error) {
              notify((error as Error).message);
            } finally {
              input.value = "";
            }
          }}
        />
      </label>
      <details className="csv-format">
        <summary>See the CSV format</summary>
        <code>
          Date,Weight (lb),Gut (in),Notes
          <br />
          2026-11-01,206.1,38.375,Check-in
        </code>
        <p>
          One row per date. Leave missing measurements blank. CSV files up to 10
          MB.
        </p>
      </details>
    </div>
  );
}
