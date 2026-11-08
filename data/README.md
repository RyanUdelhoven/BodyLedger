# Synthetic BodyLedger history

`BodyLedger-demo.csv` contains 2,504 daily reports from January 1, 2020 through November 8, 2026, inclusive. Every date has Weight; exactly 358 Sundays have Gut. Other Gut cells are empty. Measurements use 0.1 lb and 1/8 inch storage increments.

The seeded generator combines uneven long-term changes, varying seasonal and weekly effects, correlated daily fluctuations, multi-week detours, and occasional decaying spikes. Annual average weight increases except in 2024; the first-to-last 2024 change is -15.0 lb. June is generally lightest, with nearby-month exceptions; December is heaviest in complete gain years. The substantial 2024 loss overrides the December tendency, and 2026 ends before December. Gut follows the broad weight trend, with independent variation, starting at 34 inches and finishing at 39 inches.

Import the CSV from New entry, or restore `BodyLedger-demo.json` under Settings → Manage data → Restore backup. Restoring replaces the journal. The app’s **Replace all data with demo history** generates the same measurements directly. **Refresh demo history** replaces synthetic records while preserving non-demo dates and goals. Synthetic Gut observations always fall on Sundays, regardless of a previously customized Gut schedule.

Regenerate both files with Node 22.12+:

```sh
node --experimental-strip-types scripts/generate-demo.ts
```

Measurements are reproducible; generated record identifiers change. All rows are explicitly labeled synthetic. No real health data was used.
