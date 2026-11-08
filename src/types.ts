import type { State, Entry, Metric } from "./model";
export type Commit = (next: State) => Promise<boolean>;
export type Submit = (
  entries: Entry[],
  metrics?: Metric[],
  onSaved?: () => void,
) => Promise<void>;

export type RangeKey = keyof State["ranges"];
export type CommitRange = (key: RangeKey, value: number) => Promise<boolean>;
