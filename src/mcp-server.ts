#!/usr/bin/env node
import { configureAgyEnvironment } from "./agy-env.js";

configureAgyEnvironment();

async function main(): Promise<void> {
  try {
    // Dynamically import @cursor-translate/mcp if available
    const mcpModule = await import("@cursor-translate/mcp" as any);
    if (typeof mcpModule.main === "function") {
      await mcpModule.main();
      return;
    }
  } catch {
    // If not bundled, implement a lightweight MCP server using @cursor-translate/core
    const { resolveDocForRead, translateUserPrompt, backTranslateResponse } = await import("@cursor-translate/core");
    const { resolve, dirname } = await import("node:path");
    const { readFile } = await import("node:fs/promises");

    // Standard JSON-RPC MCP implementation over stdio
    process.stdin.setEncoding("utf8");
    let buffer = "";

    process.stdin.on("data", async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line);
          const res = await handleJsonRpc(req);
          if (res) {
            process.stdout.write(JSON.stringify(res) + "\n");
          }
        } catch (e: any) {
          // ignore or respond parse error
        }
      }
    });

    async function handleJsonRpc(req: any): Promise<any> {
      if (req.method === "initialize") {
        return {
          jsonrpc: "2.0",
          id: req.id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: { name: "agy-translate", version: "0.1.0" },
            capabilities: { tools: {} },
          },
        };
      }
      if (req.method === "tools/list") {
        return {
          jsonrpc: "2.0",
          id: req.id,
          result: {
            tools: [
              {
                name: "translate",
                description: "Translate prose RU↔EN using fast Gemini translate tier. Preserves code and terms.",
                inputSchema: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Text to translate" },
                    direction: { type: "string", enum: ["ru_en", "en_ru"], default: "ru_en" },
                    force: { type: "boolean" },
                    project_slug: { type: "string" },
                  },
                  required: ["text"],
                },
              },
              {
                name: "resolve_doc",
                description: "Resolve a Cyrillic markdown file to its cached English translation path.",
                inputSchema: {
                  type: "object",
                  properties: {
                    file_path: { type: "string", description: "Path to markdown file" },
                    project_slug: { type: "string" },
                    force: { type: "boolean" },
                    include_body: { type: "boolean" },
                  },
                  required: ["file_path"],
                },
              },
            ],
          },
        };
      }
      if (req.method === "tools/call") {
        const { name, arguments: args } = req.params ?? {};
        if (name === "translate") {
          const isEnRu = args?.direction === "en_ru";
          const res = isEnRu
            ? await backTranslateResponse({ text: args.text, projectSlug: args.project_slug, force: args.force })
            : await translateUserPrompt({ text: args.text, projectSlug: args.project_slug, force: args.force });
          return {
            jsonrpc: "2.0",
            id: req.id,
            result: {
              content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
            },
          };
        }
        if (name === "resolve_doc") {
          const abs = resolve(args.file_path);
          const res = await resolveDocForRead({
            sourcePath: abs,
            cwd: dirname(abs),
            projectSlug: args.project_slug,
            force: args.force,
          });
          let body: string | undefined;
          if (args.include_body) {
            body = await readFile(res.readPath, "utf8");
          }
          return {
            jsonrpc: "2.0",
            id: req.id,
            result: {
              content: [{ type: "text", text: JSON.stringify({ ...res, body }, null, 2) }],
            },
          };
        }
      }
      return null;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
