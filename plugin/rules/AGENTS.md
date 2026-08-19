# agy-translate Agent Rules

When reading project documentation files (*.md, *.mdx), agy-translate automatically serves cached English translations behind the scenes to optimize context tokens and reasoning speed.

## Critical Instructions:
1. **Always edit original source files**: When creating or modifying markdown documents, apply changes and tool calls to the original file path (e.g., `docs/architecture.md` or `AGENTS.ru.md`), **never** to the cache path (`*.en.md`).
2. **Project Rules Synchronisation**: If you modify `AGENTS.ru.md` (or `GEMINI.ru.md`), remind or run `agy-translate agentsmd` (or `agy-translate geminimd`) to keep the English root rules in sync.
