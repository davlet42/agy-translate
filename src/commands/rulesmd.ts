import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  appendMetricsEntry,
  countCyrillicRatio,
  estimateTokenSavings,
  loadGlossaryTerms,
  loadTranslateConfig,
  loadTranslateRules,
  resolveProjectRoot,
} from "@cursor-translate/core";
import { translateMarkdown } from "../translate/translate-with-provider.js";

export interface SyncRulesFileOptions {
  targetName: string;
  ruSourceName: string;
  commandName: string;
  args: string[];
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function buildMarker(ruSourceName: string, sourceSha: string, commandName: string): string {
  return `<!-- agy-translate: source=${ruSourceName} sha256=${sourceSha} — auto-generated English translation. Edit ${ruSourceName}, then run: agy-translate ${commandName} -->`;
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

const MARKER_PATTERN = /<!--\s*agy-translate:\s*source=\S+\s+sha256=([0-9a-f]{64})/;
const COMPAT_MARKER_PATTERN = /<!--\s*(?:cursor|claude)-translate:\s*source=\S+\s+sha256=([0-9a-f]{64})/;

function markerSha(content: string | null): string | null {
  if (!content) {
    return null;
  }
  const match = content.match(MARKER_PATTERN);
  if (match) {
    return match[1];
  }
  const compatMatch = content.match(COMPAT_MARKER_PATTERN);
  return compatMatch ? compatMatch[1] : null;
}

export async function syncRulesFile(options: SyncRulesFileOptions): Promise<void> {
  const { targetName, ruSourceName, commandName, args } = options;
  const check = args.includes("--check");
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const targetIdx = args.indexOf("--target");
  const targetValue = targetIdx >= 0 ? args[targetIdx + 1] : undefined;

  const pathArg = args.find((a) => !a.startsWith("--") && a !== targetValue);

  const cwd = pathArg ? resolve(process.cwd(), pathArg) : process.cwd();
  const projectRoot = resolveProjectRoot(cwd);
  const targetPath = join(projectRoot, targetName);
  const ruPath = join(projectRoot, ruSourceName);

  const targetRaw = await readOptional(targetPath);
  let ruRaw = await readOptional(ruPath);

  console.log(`agy-translate ${commandName}`);
  console.log(`  project: ${projectRoot}`);

  // Seed the Russian source from an untranslated Cyrillic target file.
  if (ruRaw === null) {
    if (targetRaw === null) {
      console.log(`  status: no ${targetName} or ${ruSourceName} found; nothing to do`);
      return;
    }

    const config = await loadTranslateConfig();
    const ratio = countCyrillicRatio(targetRaw);
    if (ratio < config.minCyrillicRatio) {
      console.log(`  status: ${targetName} has no significant Cyrillic (ratio ${ratio.toFixed(2)}); nothing to do`);
      return;
    }

    if (check) {
      console.log(`  status: ${targetName} is Russian and untranslated (run agy-translate ${commandName})`);
      process.exitCode = 1;
      return;
    }

    if (dryRun) {
      console.log(`  would: move ${targetName} → ${ruSourceName}, translate, write English ${targetName}`);
      return;
    }

    await writeFile(ruPath, targetRaw, "utf8");
    console.log(`  seeded: ${ruPath} (Russian source of truth)`);
    ruRaw = targetRaw;
  }

  const sourceSha = sha256Hex(ruRaw);
  const existingSha = markerSha(targetRaw);

  if (!force && existingSha === sourceSha) {
    console.log(`  status: up to date (${targetName} matches ${ruSourceName} sha ${sourceSha.slice(0, 12)}…)`);
    return;
  }

  if (check) {
    if (existingSha === null) {
      console.log(`  status: stale — ${targetName} has no agy-translate marker`);
    } else {
      console.log(`  status: stale — ${ruSourceName} changed since last translation`);
    }
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(`  would: translate ${ruSourceName} → ${targetName} (sha ${sourceSha.slice(0, 12)}…)`);
    return;
  }

  const config = await loadTranslateConfig();
  const [glossaryTerms, customRules] = await Promise.all([
    loadGlossaryTerms(projectRoot),
    loadTranslateRules(projectRoot),
  ]);

  const result = await translateMarkdown(ruRaw, {
    provider: (config.provider as any) ?? "agy-cli",
    model: config.model,
    docFallbackModel: config.docFallbackModel,
    glossaryTerms,
    customRules,
    allowFallback: true,
  });

  if (result.quotaExhausted) {
    throw new Error(`translate quota exhausted; ${targetName} left unchanged — retry later`);
  }

  const body = result.text.trimEnd();
  await writeFile(targetPath, `${buildMarker(ruSourceName, sourceSha, commandName)}\n\n${body}\n`, "utf8");

  const savings = estimateTokenSavings(ruRaw, countCyrillicRatio(ruRaw), 0);
  await appendMetricsEntry({
    source: "doc_translate_cost",
    reason: commandName,
    ru_tokens_est: savings.ruTokensEst,
    en_tokens_est: savings.enTokensEst,
    saved_tokens_est: savings.savedTokensEst,
    translate_cost_tokens_est: Math.ceil(ruRaw.length / 3) + Math.ceil(body.length / 4),
    translate_cost_usd: result.costUsd,
    file_path: ruPath,
    cache_path: targetPath,
    translate_model: result.modelUsed,
    used_fallback: result.usedFallback,
    text_chars: ruRaw.length,
  });

  console.log(`  translated: ${ruSourceName} → ${targetName} (${result.modelUsed}${result.usedFallback ? ", fallback" : ""})`);
  console.log(`  est. saving: ~${savings.savedTokensEst} tokens on every Antigravity session that loads ${targetName}`);
}

export async function runRulesMd(args: string[]): Promise<void> {
  const targetIdx = args.indexOf("--target");
  const targetArg = targetIdx >= 0 ? args[targetIdx + 1] : undefined;

  if (targetArg === "GEMINI.md" || targetArg === "gemini") {
    await syncRulesFile({
      targetName: "GEMINI.md",
      ruSourceName: "GEMINI.ru.md",
      commandName: "geminimd",
      args,
    });
    return;
  }

  if (targetArg === "both") {
    await syncRulesFile({
      targetName: "AGENTS.md",
      ruSourceName: "AGENTS.ru.md",
      commandName: "agentsmd",
      args,
    });
    await syncRulesFile({
      targetName: "GEMINI.md",
      ruSourceName: "GEMINI.ru.md",
      commandName: "geminimd",
      args,
    });
    return;
  }

  // Default to AGENTS.md
  await syncRulesFile({
    targetName: "AGENTS.md",
    ruSourceName: "AGENTS.ru.md",
    commandName: "agentsmd",
    args,
  });
}
