import { runResolveFromHookInput } from "./resolve.js";
import { readStdin } from "../helpers/read-stdin.js";

export async function runHookResolve(): Promise<void> {
  let output: Record<string, unknown> = { decision: "allow" };

  try {
    const raw = await readStdin();
    if (raw.trim()) {
      const input = JSON.parse(raw) as Record<string, unknown>;
      output = await runResolveFromHookInput(input);
    }
  } catch {
    // Fail open: allow original tool call without changes
    output = { decision: "allow" };
  }

  process.stdout.write(`${JSON.stringify(output)}\n`);
}
