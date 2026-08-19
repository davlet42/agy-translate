---
name: agy-translate-docs
description: Discovers Cyrillic markdown documentation in the project and pre-warms the English translation cache using the fast Gemini tier.
---

# agy-translate-docs

Use this skill to scan the repository for Cyrillic documentation files and batch pre-translate them to the English cache.

## Usage

Run the following command in the workspace:
```bash
# Dry run to see what would be translated
agy-translate docs --dry-run

# Translate all Cyrillic markdown files
agy-translate docs
```
