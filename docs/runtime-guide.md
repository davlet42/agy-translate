# agy-translate Runtime Guide

## Architecture Overview

`agy-translate` operates as a transparent, high-performance token-saving translation proxy for Antigravity (`agy`).

Russian and Cyrillic prose tokenizes at approximately 1.8–2.0x higher token costs than English. By translating documentation once and serving cached English translations to the model, agents consume far fewer context tokens on repetitive reads.

### 1. Lazy Doc Cache (`PreToolUse` Hook)
When Antigravity attempts to execute the current `ViewFile` tool call (shown as `Read` in the UI, or legacy `view_file`) on a `.md` or `.mdx` file containing Cyrillic prose:
- The hook checks `~/.gemini/translate-proxy/cache/<project-slug>/<file>.en.md`.
- If a fresh translation exists matching the sha256 hash of the source file, the tool argument `AbsolutePath` is transparently rewritten to the cached English markdown path.
- If the cache is missing or stale, `agy-translate` translates the document via the fast Gemini translate tier (`Gemini 3.7 Flash (Low)` via `agy -p`), saves it to cache, and serves the English version.
- **Fail-open guarantee**: If translation fails or timeout occurs, the original Russian file is read without interruption.

### 2. Sibling Cache Sharing
`agy-translate` automatically shares its cache with sibling tools:
- `cursor-translate` (`~/.cursor/translate-proxy`)
- `claude-translate` (`~/.claude/translate-proxy`)

If a document was already translated in Cursor or Claude Code, `agy-translate` reuses it instantly with zero API calls.

### 3. Rules Workflow (`AGENTS.md` / `GEMINI.md`)
Rules are loaded into every Antigravity session. Keep the Russian source of truth in `AGENTS.ru.md` (or `GEMINI.ru.md`) and generate the English version:
```bash
agy-translate agentsmd
agy-translate geminimd
agy-translate rulesmd --target both
```

CI check:
```bash
agy-translate agentsmd --check
```
