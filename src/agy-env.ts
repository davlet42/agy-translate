import { homedir } from "node:os";
import { join } from "node:path";

export function resolveAgyTranslateHome(): string {
  return (
    process.env.AGY_TRANSLATE_HOME ??
    process.env.ANTIGRAVITY_TRANSLATE_HOME ??
    join(homedir(), ".gemini", "translate-proxy")
  );
}

// Sibling homes for cache sharing:
// - cursor-translate: ~/.cursor/translate-proxy
// - claude-translate: ~/.claude/translate-proxy
// - agy-translate: ~/.gemini/translate-proxy
export function configureAgyEnvironment(): void {
  const ownHome = resolveAgyTranslateHome();
  process.env.CURSOR_TRANSLATE_HOME = ownHome;
  process.env.AGY_TRANSLATE_HOME = ownHome;
  process.env.CURSOR_TRANSLATE_DEFAULT_PROVIDER ??= "agy-cli";

  if (!process.env.CURSOR_TRANSLATE_SIBLING_HOMES && !process.env.AGY_TRANSLATE_SIBLING_HOMES) {
    const candidates = [
      join(homedir(), ".cursor", "translate-proxy"),
      join(homedir(), ".claude", "translate-proxy"),
      join(homedir(), ".gemini", "translate-proxy"),
    ];
    process.env.CURSOR_TRANSLATE_SIBLING_HOMES = candidates.join(":");
  } else if (process.env.AGY_TRANSLATE_SIBLING_HOMES && !process.env.CURSOR_TRANSLATE_SIBLING_HOMES) {
    process.env.CURSOR_TRANSLATE_SIBLING_HOMES = process.env.AGY_TRANSLATE_SIBLING_HOMES;
  }
}
