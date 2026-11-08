import { validateState, type State } from "./model";
async function responseState(response: Response): Promise<State> {
  const body = await response.json();
  if (!response.ok)
    throw Error(body.error ?? "Could not access the journal database.");
  return validateState(body);
}
export async function load(): Promise<State> {
  return responseState(await fetch("/api/journal", { cache: "no-store" }));
}
export async function save(next: State, expected: number): Promise<State> {
  return responseState(
    await fetch("/api/journal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: next, expected }),
    }),
  );
}
