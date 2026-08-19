import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const logPath = process.env.AGY_TRANSLATE_METRICS_PATH ?? join(homedir(), ".gemini", "translate-proxy", "metrics.jsonl");

async function main() {
  const mode = process.argv[2] ?? "generic";
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    event: mode,
    payload_length: raw.length,
  };

  try {
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // Fail open
  }
}

main().catch(() => {});
