import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveAgyTranslateHome } from "../agy-env.js";

export interface AgyConfigExtras {
  lazyReadMode: "path" | "content";
  rulesTarget: "AGENTS.md" | "GEMINI.md" | "both";
}

export const AGY_CONFIG_EXTRAS_DEFAULTS: AgyConfigExtras = {
  lazyReadMode: "path",
  rulesTarget: "AGENTS.md",
};

function parseNestedScalar(block: string, section: string, key: string): string | null {
  const sectionMatch = block.match(
    new RegExp(`^${section}:[ \\t]*\\r?\\n((?:(?:[ \\t]+[^\\n]*)?\\r?\\n)*)`, "m"),
  );
  if (!sectionMatch) {
    return null;
  }
  const match = sectionMatch[1].match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"));
  if (!match) {
    return null;
  }
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

export async function loadAgyConfigExtras(): Promise<AgyConfigExtras> {
  const configPath = join(resolveAgyTranslateHome(), "config.yaml");

  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return { ...AGY_CONFIG_EXTRAS_DEFAULTS };
  }

  const lazyReadMode =
    parseNestedScalar(raw, "hooks", "lazy_read_mode") === "content" ? "content" : "path";
  const rulesTargetVal = parseNestedScalar(raw, "rules", "target");
  const rulesTarget =
    rulesTargetVal === "GEMINI.md"
      ? "GEMINI.md"
      : rulesTargetVal === "both"
        ? "both"
        : "AGENTS.md";

  return {
    lazyReadMode,
    rulesTarget,
  };
}
