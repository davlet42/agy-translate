#!/usr/bin/env node
import { configureAgyEnvironment } from "./agy-env.js";

configureAgyEnvironment();

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  switch (command) {
    case "init":
      await handleInit(args.slice(1));
      break;
    case "doc": {
      const { runDoc } = await import("./commands/doc.js");
      await runDoc(args.slice(1));
      break;
    }
    case "docs": {
      const { runDocs } = await import("./commands/docs.js");
      await runDocs(args.slice(1));
      break;
    }
    case "agentsmd": {
      const { runAgentsMd } = await import("./commands/agentsmd.js");
      await runAgentsMd(args.slice(1));
      break;
    }
    case "geminimd": {
      const { runGeminiMd } = await import("./commands/geminimd.js");
      await runGeminiMd(args.slice(1));
      break;
    }
    case "rulesmd": {
      const { runRulesMd } = await import("./commands/rulesmd.js");
      await runRulesMd(args.slice(1));
      break;
    }
    case "resolve": {
      const { runResolve } = await import("./commands/resolve.js");
      await runResolve(args[1], args.slice(2));
      break;
    }
    case "hook-resolve": {
      const { runHookResolve } = await import("./commands/hook-resolve.js");
      await runHookResolve();
      break;
    }
    case "prompt": {
      const { runPrompt } = await import("./commands/prompt.js");
      await runPrompt(args.slice(1));
      break;
    }
    case "agent": {
      const { runAgent } = await import("./commands/agent.js");
      await runAgent(args.slice(1));
      break;
    }
    case "report": {
      if (args.slice(1).includes("--backfill-costs")) {
        const { runBackfillCosts } = await import("./commands/backfill-costs.js");
        await runBackfillCosts(args.slice(1).filter((a) => a !== "--backfill-costs"));
        break;
      }
      const { runReport, formatReport } = await import("./commands/report.js");
      const result = await runReport(args.slice(1));
      console.log(formatReport(result));
      break;
    }
    case "cache-gc": {
      const { runCacheGc } = await import("./commands/cache-gc.js");
      await runCacheGc(args.slice(1));
      break;
    }
    case "backfill-costs": {
      const { runBackfillCosts } = await import("./commands/backfill-costs.js");
      await runBackfillCosts(args.slice(1));
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

async function handleInit(initArgs: string[]): Promise<void> {
  const { runInit } = await import("./commands/init.js");
  const { shellPathHint } = await import("./commands/setup-shell-path.js");

  const dryRun = initArgs.includes("--dry-run");
  const skipHooks = initArgs.includes("--skip-hooks");
  const addPath = initArgs.includes("--path");

  const result = await runInit({ dryRun, skipHooks, addPath });

  console.log("agy-translate init");
  console.log(`  home: ${result.translateHome}`);
  console.log(`  cli: ${result.translateHome}/bin/agy-translate`);
  if (result.created.length) {
    console.log("  created:");
    for (const p of result.created) {
      console.log(`    - ${p}`);
    }
  }
  if (result.updated.length) {
    console.log("  updated:");
    for (const p of result.updated) {
      console.log(`    - ${p}`);
    }
  }
  if (result.warnings.length) {
    console.log("  warnings:");
    for (const w of result.warnings) {
      console.log(`    - ${w}`);
    }
  }
  if (result.pluginInstalled) {
    console.log("  plugin: registered in ~/.gemini/config/plugins/agy-translate");
  }
  if (result.pathSetup) {
    if (result.pathSetup.alreadyPresent) {
      console.log(`  path: already in ${result.pathSetup.shellRcPath ?? "shell rc"}`);
    } else if (result.pathSetup.added) {
      console.log(`  path: added to ${result.pathSetup.shellRcPath}`);
      console.log(`  ${shellPathHint(result.pathSetup.shellRcPath)}`);
    }
  } else if (!dryRun) {
    console.log("  tip: re-run with --path to add agy-translate to your shell PATH");
  }
  console.log("");
  console.log("Translate tier default model: Gemini 3.7 Flash (Low) (via agy -p --model)");
  console.log("Lazy read: PreToolUse ViewFile/Read/view_file hooks rewrite AbsolutePath to the EN cache");
  console.log("Rules: run `agy-translate agentsmd` or `agy-translate geminimd` to keep English rules synced");
}

function printHelp(): void {
  console.log(`agy-translate — token-saving RU→EN layer for Antigravity (agy)

Usage:
  agy-translate init [--dry-run] [--skip-hooks] [--path]
  agy-translate doc <file> [--project slug] [--force] [--dry-run]
  agy-translate docs [path] [--project slug] [--force] [--dry-run]
      [--include-gitignored] [--min-cyrillic-ratio 0.05] [--min-chars 80]
  agy-translate agentsmd [path] [--check] [--force] [--dry-run]
  agy-translate geminimd [path] [--check] [--force] [--dry-run]
  agy-translate rulesmd [path] [--check] [--force] [--dry-run] [--target AGENTS.md|GEMINI.md|both]
  agy-translate resolve <file> [--json] [--project slug] [--force]
  agy-translate hook-resolve                    (stdin JSON → PreToolUse ViewFile/Read/view_file)
  agy-translate prompt "<text>" [--json] [--force] [--stdin] [--en-ru]
  agy-translate agent [agy flags] -- "<prompt>"
  agy-translate report [--days 7] [--backfill-costs] [--project slug]
  agy-translate backfill-costs [--project slug] [--dry-run]
  agy-translate cache-gc [--dry-run] [--days 30]  (drop caches of deleted docs)

Docs: https://github.com/davlet42/agy-translate
`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
