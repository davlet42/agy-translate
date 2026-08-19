# agy-translate

Serve your **Cyrillic markdown docs to Antigravity (agy) as cached English translations** — and cut the context tokens agents burn re-reading them.

Russian prose tokenizes ~1.8–2× worse than English, and agent workflows read the same docs over and over: project wikis, architecture notes, and `AGENTS.md` / `GEMINI.md` on every session. `agy-translate` translates a doc **once per version** on a fast, cheap Gemini tier (`Gemini 3.5 Flash (Low)` via `agy -p`, billed to your existing subscription — no separate API key required) and serves the cached English on every subsequent read.

Built on the same engine as [cursor-translate](https://github.com/davlet42/cursor-translate) and [claude-translate](https://github.com/davlet42/claude-translate).

---

## The core value — and its honest economics

| Mechanism | When it saves |
|---|---|
| **Lazy EN doc cache** — `PreToolUse` hook redirects every `view_file` of a Cyrillic `.md`/`.mdx` to a cached English translation | On every read of every cached doc, in every Antigravity session and subagent |
| **English `AGENTS.md` / `GEMINI.md`** generated from Russian source (`agentsmd` / `geminimd`) | Loaded into **every session** and re-sent with context on every turn — the highest-leverage doc in a repo |
| **Shared sibling cache** with `cursor-translate` & `claude-translate` | Zero duplicate translation costs between IDEs and CLIs |

Translation is an **investment** (one cheap Gemini spend per doc *version*), serving is the **return** (every read).

Pull your own numbers at any time:
```bash
agy-translate report --days 7
```

---

## Installation

```bash
npm install -g agy-translate
agy-translate init --path
source ~/.zshrc   # or open a new terminal
```

Then enable the plugin in Antigravity (global config in `~/.gemini/config/plugins/agy-translate` is created automatically during `init`).

---

## Quick start

```bash
cd ~/Projects/your-repo
agy-translate docs --dry-run   # see what would be cached
agy-translate docs             # warm the EN cache (one-time Gemini spend)
agy-translate agentsmd         # English AGENTS.md from Russian AGENTS.ru.md
agy-translate geminimd         # English GEMINI.md from Russian GEMINI.ru.md
agy-translate report --days 7  # savings vs costs
```

---

## Commands Reference

| Command | Description |
|---|---|
| `agy-translate init` | Initialize `~/.gemini/translate-proxy` config, cache, hooks, and shell PATH |
| `agy-translate doc <file>` | Translate a single document to the global cache |
| `agy-translate docs [path]` | Scan and batch translate Cyrillic markdown files in a project |
| `agy-translate agentsmd` | Sync `AGENTS.md` from Russian `AGENTS.ru.md` with sha256 freshness tracking |
| `agy-translate geminimd` | Sync `GEMINI.md` from Russian `GEMINI.ru.md` with sha256 freshness tracking |
| `agy-translate rulesmd` | Sync either/both rules files (`--target AGENTS.md|GEMINI.md|both`) |
| `agy-translate resolve <file>` | Check translation status and cache path for a file |
| `agy-translate hook-resolve` | Stdin handler for Antigravity `PreToolUse` on `view_file` |
| `agy-translate prompt "<text>"` | Translate prompt RU→EN or response EN→RU (`--en-ru`) |
| `agy-translate agent -- "<prompt>"` | Wrapper to execute `agy` with auto-translated prompts |
| `agy-translate report` | Show token savings, ROI, and translation spend |
| `agy-translate cache-gc` | Drop caches of deleted or renamed documents after grace period |
| `agy-translate backfill-costs` | Backfill historical metrics with model cost estimates |

---

## How it works

### 1. Lazy translate on `view_file`
The Antigravity plugin registers a `PreToolUse` lifecycle hook for `view_file`. When a tool call reads a Cyrillic `.md` file:
1. `agy-translate` checks the cache at `~/.gemini/translate-proxy/cache/<project>/...en.md`.
2. On cache miss or stale source sha256, it translates incrementally using `Gemini 3.5 Flash (Low)`.
3. The hook returns `{"decision": "allow", "overwrite": {"AbsolutePath": "<cachePath>"}}`, transparently reading the English version.
4. If translation fails, times out, or quota is exhausted, it fails open to the original Russian file.

### 2. `AGENTS.md` / `GEMINI.md` synchronization
Keep your source of truth in Russian in `AGENTS.ru.md` (or `GEMINI.ru.md`). Run:
```bash
agy-translate agentsmd
```
In CI, verify freshness:
```bash
agy-translate agentsmd --check # exits with code 1 if out of date
```

### 3. Sibling cache with cursor-translate & claude-translate
Before translating, `agy-translate` checks:
- `~/.cursor/translate-proxy/cache`
- `~/.claude/translate-proxy/cache`

If a fresh translation exists, it copies it over instantly with zero API cost.

---

## Configuration

Stored in `~/.gemini/translate-proxy/config.yaml`:

```yaml
enabled: true

min_cyrillic_ratio: 0.15
min_chars_to_translate: 120

translator:
  provider: agy-cli
  model: Gemini 3.5 Flash (Low)
  doc_fallback_model: Gemini 3.7 Flash (Low)

cache:
  location: global
  dir: ~/.gemini/translate-proxy/cache
  gc_orphan_days: 30
  share_siblings: true
  incremental: block

glossary:
  file: ~/.gemini/translate-proxy/glossary.yaml
  merge_project: true
  project_file: .agents/agy-translate-glossary.yaml

hooks:
  audit_enabled: true
  lazy_read_timeout_sec: 600
  lazy_read_mode: path
```

---

## License

MIT © [davlet42](https://github.com/davlet42)
