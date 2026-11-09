import { writeFileSync, mkdirSync } from "node:fs";
import { demo, initial, exportCSV } from "../src/model.ts";
const state = demo(initial(), true);
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../data/MyNormal-demo.csv", import.meta.url),
  exportCSV(state),
);
writeFileSync(
  new URL("../data/MyNormal-demo.json", import.meta.url),
  JSON.stringify(state, null, 2),
);
console.log(`Generated ${state.entries.length} daily reports.`);
