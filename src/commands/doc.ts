import { resolve } from "node:path";
import { translateDocToGlobalCache } from "@cursor-translate/core";

export async function runDoc(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const projectIndex = args.indexOf("--project");
  const projectSlug = projectIndex >= 0 ? args[projectIndex + 1] : undefined;
  const fileArg = args.find((a) => !a.startsWith("--") && a !== projectSlug);

  if (!fileArg) {
    throw new Error("Usage: agy-translate doc <file> [--project slug] [--force] [--dry-run]");
  }

  const sourcePath = resolve(process.cwd(), fileArg);
  console.log("agy-translate doc");
  console.log(`  source: ${sourcePath}`);

  const result = await translateDocToGlobalCache({
    sourcePath,
    projectSlug,
    force,
    dryRun,
    metricsTrigger: "doc_cli",
  });

  console.log(`  cache: ${result.cachePath}`);
  console.log(`  status: ${result.reason}`);
  console.log(`  provider: ${result.provider}`);
  console.log(`  model: ${result.translateModel}`);
  if (result.usedFallback) {
    console.log("  fallback: true");
  }
}
