# agy-translate rules

When reading project documentation (.md / .mdx), agy-translate automatically serves cached English translations to conserve context window tokens.

Key guidelines:
1. When editing or creating documentation, ALWAYS edit the original source file (e.g. docs/foo.md or AGENTS.ru.md), NEVER the translation cache (.en.md).
2. For project rules, edit AGENTS.ru.md (or GEMINI.ru.md) and run `agy-translate agentsmd` (or `geminimd`) to refresh the English version.
