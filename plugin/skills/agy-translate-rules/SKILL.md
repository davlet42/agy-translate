---
name: agy-translate-rules
description: Keeps AGENTS.md / GEMINI.md in sync with Russian source files (AGENTS.ru.md / GEMINI.ru.md).
---

# agy-translate-rules

Use this skill to manage bilingual project rule files.

## Workflow

1. Edit Russian instructions in `AGENTS.ru.md` or `GEMINI.ru.md`.
2. Run `agy-translate agentsmd` or `agy-translate geminimd` to generate the English translation with sha256 freshness marker.
3. In CI, run `agy-translate agentsmd --check` to ensure rules are up to date.
