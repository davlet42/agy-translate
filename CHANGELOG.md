# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - 2026-08-19

### Changed
- Standardized translation tier on `Gemini 3.7 Flash (Low)`.
- Removed expensive `Gemini 3.1 Pro` fallback — now cleanly fails open to original Russian source without burning high-tier tokens.
- Updated npm description and README documentation.

## [0.1.1] - 2026-08-19

### Changed
- Updated default translation tier model to `Gemini 3.7 Flash (Low)` with fallback to `Gemini 3.1 Pro (Low)`.
- Added automated GitHub Release creation to `.github/workflows/publish.yml`.

## [0.1.0] - 2026-08-19

### Added
- Initial release of `agy-translate` for Antigravity (`agy`).
- Transparent lazy document caching on `view_file` tool calls via Antigravity `PreToolUse` hook.
- Fast, cost-efficient translation tier powered by `Gemini 3.5 Flash (Low)` (with `Gemini 3.7 Flash (Low)` fallback) using existing Antigravity CLI print mode.
- Bidirectional sibling cache sharing with `cursor-translate` and `claude-translate`.
- `AGENTS.md` and `GEMINI.md` synchronization with sha256 freshness tracking (`agentsmd`, `geminimd`, `rulesmd`).
- CLI commands: `init`, `doc`, `docs`, `agentsmd`, `geminimd`, `rulesmd`, `resolve`, `hook-resolve`, `prompt`, `agent`, `report`, `cache-gc`, `backfill-costs`.
- Antigravity plugin bundle with skills (`agy-translate-docs`, `agy-translate-report`, `agy-translate-rules`), rules (`AGENTS.md`), hooks (`hooks.json`), and MCP server (`mcp_config.json`).
- Model Context Protocol (MCP) server: `agy-translate-mcp`.
- Full automated test suite and CI workflows for GitHub Actions.
