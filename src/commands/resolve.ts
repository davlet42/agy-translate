import { resolveDocForRead } from "@cursor-translate/core";
import { readStdin } from "../helpers/read-stdin.js";

export async function runResolve(fileArg: string | undefined, args: string[]): Promise<void> {
  const json = args.includes("--json");
  const force = args.includes("--force");
  const projectIndex = args.indexOf("--project");
  const projectSlug = projectIndex >= 0 ? args[projectIndex + 1] : undefined;

  if (!fileArg) {
    throw new Error("Usage: agy-translate resolve <file> [--json] [--project slug] [--force]");
  }

  const result = await resolveDocForRead({
    sourcePath: fileArg,
    projectSlug,
    force,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("agy-translate resolve");
  console.log(`  source: ${result.sourcePath}`);
  console.log(`  read: ${result.readPath}`);
  console.log(`  action: ${result.action}`);
  console.log(`  sha256: ${result.sourceSha256}`);
  if (result.cachePath) {
    console.log(`  cache: ${result.cachePath}`);
  }
  if (result.translateModel) {
    console.log(`  model: ${result.translateModel}`);
  }
  if (result.usedFallback) {
    console.log("  fallback: true");
  }
}

// Antigravity PreToolUse hook contract (matchers ViewFile, Read, and legacy view_file):
// stdin carries { toolCall: { name, args: { AbsolutePath, ... } }, workspacePaths, ... }
// stdout JSON returns { decision: "allow", overwrite: { AbsolutePath: "..." }, reason: "..." }
export async function runResolveFromHookInput(
  hookInput: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Support both Antigravity toolCall format and legacy/Claude tool_input format
  const toolCall = hookInput.toolCall as { name?: string; args?: Record<string, unknown> } | undefined;
  const toolArgs = toolCall?.args ?? (hookInput.tool_input as Record<string, unknown> | undefined) ?? {};

  const filePath =
    (toolArgs.AbsolutePath as string | undefined) ??
    (toolArgs.file_path as string | undefined) ??
    (toolArgs.path as string | undefined) ??
    (toolArgs.TargetFile as string | undefined);

  if (!filePath) {
    return { decision: "allow" };
  }

  const workspacePaths = hookInput.workspacePaths as string[] | undefined;
  const cwd = workspacePaths?.[0] ?? (typeof hookInput.cwd === "string" ? hookInput.cwd : undefined);

  const result = await resolveDocForRead({ sourcePath: filePath, cwd });

  if (result.readPath === result.sourcePath) {
    if (result.action === "quota_exhausted") {
      return {
        decision: "allow",
        reason: "agy-translate: translate quota exhausted; reading original Russian document.",
      };
    }
    if (result.action === "lazy_deferred" && result.userHint) {
      return {
        decision: "allow",
        reason: result.userHint,
      };
    }
    return { decision: "allow" };
  }

  const overwriteKey = toolArgs.AbsolutePath !== undefined ? "AbsolutePath" : toolArgs.file_path !== undefined ? "file_path" : toolArgs.path !== undefined ? "path" : "AbsolutePath";

  return {
    decision: "allow",
    reason: `agy-translate: serving cached English translation of ${result.sourcePath} (action: ${result.action}). To edit this document, modify the original file at ${result.sourcePath}, not the cache.`,
    overwrite: {
      [overwriteKey]: result.readPath,
    },
    // Also include hookSpecificOutput for Claude Code compatibility if run in hybrid context
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: {
        ...toolArgs,
        [overwriteKey]: result.readPath,
      },
      additionalContext: `agy-translate: serving cached English translation of ${result.sourcePath} (action: ${result.action}). To edit this document, modify the original file at ${result.sourcePath}, not the cache.`,
    },
  };
}
