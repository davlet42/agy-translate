# Cloud & Remote Agents Guide

When running in CI/CD, sandboxes, or remote containers where interactive tools or hooks may not be present:

## 1. MCP Server
`agy-translate` provides an MCP server accessible via `agy-translate-mcp`:
- `resolve_doc`: resolves a markdown file to English cache path, with optional `include_body=true`.
- `translate`: translates text RU↔EN.

Configure in Antigravity or `mcp_config.json`:
```json
{
  "mcpServers": {
    "agy-translate": {
      "command": "agy-translate-mcp",
      "args": []
    }
  }
}
```

## 2. Pre-warming Cache
Run `agy-translate docs` during container startup or build step:
```bash
agy-translate docs
```
