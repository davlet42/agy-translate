import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { before, describe, it } from "node:test";

const HOME = mkdtempSync(join(tmpdir(), "agy-translate-test-"));
process.env.AGY_TRANSLATE_HOME = HOME;
process.env.CURSOR_TRANSLATE_HOME = HOME;
process.env.CURSOR_TRANSLATE_SIBLING_HOMES = "";

const PROJECT = mkdtempSync(join(tmpdir(), "agy-translate-project-"));

const { runResolveFromHookInput } = await import("../dist/commands/resolve.js");

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function writeConfig(enabled) {
  writeFileSync(
    join(HOME, "config.yaml"),
    `enabled: ${enabled}\n\ntranslator:\n  provider: agy-cli\n  model: Gemini 3.7 Flash (Low)\n`,
    "utf8",
  );
}

describe("runResolveFromHookInput (Antigravity PreToolUse contract)", () => {
  before(() => {
    writeConfig(true);
  });

  it("registers current Read and legacy view_file matchers", () => {
    const hooks = JSON.parse(readFileSync(new URL("../plugin/hooks.json", import.meta.url), "utf8"));
    assert.deepEqual(
      hooks["agy-translate-lazy-read"].PreToolUse.map((entry) => entry.matcher),
      ["ViewFile", "Read", "view_file"],
    );
  });

  it("merges the Agy import manifest without dropping unrelated plugins", async () => {
    const { mergeAgyImportManifest } = await import("../dist/commands/init.js");
    const manifest = mergeAgyImportManifest(
      { imports: [{ name: "Figma", source: "gemini-cli", components: ["mcpServers"] }] },
      "agy-translate",
      ["skills", "mcpServers", "hooks"],
    );
    assert.equal(manifest.imports.length, 2);
    assert.equal(manifest.imports[0].name, "Figma");
    assert.equal(manifest.imports[1].source, "antigravity");
  });

  it("returns decision: allow when toolCall args has no file", async () => {
    const output = await runResolveFromHookInput({
      toolCall: { name: "view_file", args: {} },
    });
    assert.equal(output.decision, "allow");
    assert.equal(output.overwrite, undefined);
  });

  it("passes through non-markdown files untouched", async () => {
    const filePath = join(PROJECT, "notes.txt");
    writeFileSync(filePath, "Просто текст на русском языке для проверки.", "utf8");

    const output = await runResolveFromHookInput({
      toolCall: { name: "view_file", args: { AbsolutePath: filePath } },
      workspacePaths: [PROJECT],
    });
    assert.equal(output.decision, "allow");
    assert.equal(output.overwrite, undefined);
  });

  it("passes through markdown without Cyrillic", async () => {
    const filePath = join(PROJECT, "english.md");
    writeFileSync(filePath, `# English doc\n\n${"All prose here is English. ".repeat(20)}`, "utf8");

    const output = await runResolveFromHookInput({
      toolCall: { name: "view_file", args: { AbsolutePath: filePath } },
      workspacePaths: [PROJECT],
    });
    assert.equal(output.decision, "allow");
    assert.equal(output.overwrite, undefined);
  });

  it("rewrites AbsolutePath to the EN cache on a warm cache hit", async () => {
    const sourceBody = `# Документация\n\n${"Это русский текст, который должен обслуживаться из английского кэша. ".repeat(10)}`;
    const sourcePath = join(PROJECT, "ROADMAP.md");
    writeFileSync(sourcePath, sourceBody, "utf8");

    const projectSlug = basename(PROJECT);
    const cachePath = join(HOME, "cache", projectSlug, "ROADMAP.en.md");
    mkdirSync(join(HOME, "cache", projectSlug), { recursive: true });
    writeFileSync(
      cachePath,
      `---\ncursor-translate-version: 1\ncursor-translate-source: ${sourcePath}\ncursor-translate-source-sha256: ${sha256Hex(sourceBody)}\ncursor-translate-generated-at: 2026-07-08T00:00:00.000Z\ncursor-translate-project: ${projectSlug}\n---\n\n# Documentation\n\nEnglish cached body.\n`,
      "utf8",
    );

    const output = await runResolveFromHookInput({
      toolCall: { name: "view_file", args: { AbsolutePath: sourcePath, StartLine: 1 } },
      workspacePaths: [PROJECT],
    });

    assert.equal(output.decision, "allow");
    assert.ok(output.overwrite, "expected overwrite on cache hit");
    assert.equal(output.overwrite.AbsolutePath, cachePath);
    assert.match(output.reason, /serving cached English translation/i);
    assert.match(output.reason, /modify the original file/i);
  });

  it("fails open when translation is disabled", async () => {
    writeConfig(false);
    const sourcePath = join(PROJECT, "DISABLED.md");
    writeFileSync(sourcePath, `# Заголовок\n\n${"Русский текст. ".repeat(30)}`, "utf8");

    const output = await runResolveFromHookInput({
      toolCall: { name: "view_file", args: { AbsolutePath: sourcePath } },
      workspacePaths: [PROJECT],
    });
    assert.equal(output.decision, "allow");
    assert.equal(output.overwrite, undefined);
    writeConfig(true);
  });

  it("reuses a fresh cursor/claude sibling cache instead of translating", async () => {
    const cursorHome = mkdtempSync(join(tmpdir(), "agy-translate-cursor-home-"));
    process.env.CURSOR_TRANSLATE_SIBLING_HOMES = cursorHome;

    const sourceBody = `# Общий документ\n\n${"Этот файл уже переведён cursor-translate. ".repeat(10)}`;
    const sourcePath = join(PROJECT, "SHARED.md");
    writeFileSync(sourcePath, sourceBody, "utf8");

    const projectSlug = basename(PROJECT);
    mkdirSync(join(cursorHome, "cache", projectSlug), { recursive: true });
    writeFileSync(
      join(cursorHome, "cache", projectSlug, "SHARED.en.md"),
      `---\ncursor-translate-version: 1\ncursor-translate-source: ${sourcePath}\ncursor-translate-source-sha256: ${sha256Hex(sourceBody)}\ncursor-translate-generated-at: 2026-07-08T00:00:00.000Z\ncursor-translate-project: ${projectSlug}\n---\n\n# Shared doc\n\nTranslated by sibling.\n`,
      "utf8",
    );

    const output = await runResolveFromHookInput({
      toolCall: { name: "view_file", args: { AbsolutePath: sourcePath } },
      workspacePaths: [PROJECT],
    });

    const expectedOwnCache = join(HOME, "cache", projectSlug, "SHARED.en.md");
    assert.equal(output.decision, "allow");
    assert.equal(output.overwrite?.AbsolutePath, expectedOwnCache);
    assert.match(output.reason, /sibling_copy/);

    process.env.CURSOR_TRANSLATE_SIBLING_HOMES = "";
  });
});
