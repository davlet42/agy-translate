import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

const HOME = mkdtempSync(join(tmpdir(), "agy-translate-rulesmd-home-"));
process.env.AGY_TRANSLATE_HOME = HOME;
process.env.CURSOR_TRANSLATE_HOME = HOME;

const { runAgentsMd, runGeminiMd, runRulesMd } = await import("../dist/commands/rulesmd.js");

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function freshProject() {
  return mkdtempSync(join(tmpdir(), "agy-translate-rulesmd-"));
}

describe("rulesmd / agentsmd / geminimd", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("does nothing when no AGENTS.md exists", async () => {
    const project = freshProject();
    await runRulesMd([project]);
    assert.ok(!existsSync(join(project, "AGENTS.ru.md")));
    assert.ok(!existsSync(join(project, "AGENTS.md")));
  });

  it("does nothing for an English AGENTS.md", async () => {
    const project = freshProject();
    writeFileSync(
      join(project, "AGENTS.md"),
      `# Project\n\n${"English instructions only. ".repeat(20)}`,
      "utf8",
    );
    await runRulesMd([project]);
    assert.ok(!existsSync(join(project, "AGENTS.ru.md")));
  });

  it("--check exits 1 for an untranslated Russian AGENTS.md", async () => {
    const project = freshProject();
    writeFileSync(
      join(project, "AGENTS.md"),
      `# Проект\n\n${"Инструкции на русском языке для агента. ".repeat(20)}`,
      "utf8",
    );
    await runRulesMd([project, "--check"]);
    assert.equal(process.exitCode, 1);
    assert.ok(!existsSync(join(project, "AGENTS.ru.md")), "--check must not write files");
  });

  it("recognizes an up-to-date translation via the sha marker", async () => {
    const project = freshProject();
    const ruBody = `# Проект\n\n${"Русские инструкции. ".repeat(20)}`;
    writeFileSync(join(project, "AGENTS.ru.md"), ruBody, "utf8");
    writeFileSync(
      join(project, "AGENTS.md"),
      `<!-- agy-translate: source=AGENTS.ru.md sha256=${sha256Hex(ruBody)} — auto-generated English translation. Edit AGENTS.ru.md, then run: agy-translate agentsmd -->\n\n# Project\n\nEnglish body.\n`,
      "utf8",
    );

    await runRulesMd([project, "--check"]);
    assert.equal(process.exitCode, 0, "matching sha must be treated as up to date");
  });

  it("--check exits 1 when AGENTS.ru.md changed after translation", async () => {
    const project = freshProject();
    writeFileSync(join(project, "AGENTS.ru.md"), `# Проект\n\nНовый русский текст.`, "utf8");
    writeFileSync(
      join(project, "AGENTS.md"),
      `<!-- agy-translate: source=AGENTS.ru.md sha256=${"0".repeat(64)} -->\n\n# Project\n\nStale body.\n`,
      "utf8",
    );

    await runRulesMd([project, "--check"]);
    assert.equal(process.exitCode, 1);
  });

  it("supports GEMINI.md via --target GEMINI.md", async () => {
    const project = freshProject();
    const ruBody = `# Проект Gemini\n\n${"Русские правила Gemini. ".repeat(20)}`;
    writeFileSync(join(project, "GEMINI.ru.md"), ruBody, "utf8");
    writeFileSync(
      join(project, "GEMINI.md"),
      `<!-- agy-translate: source=GEMINI.ru.md sha256=${sha256Hex(ruBody)} -->\n\n# Gemini Project\n\nEnglish body.\n`,
      "utf8",
    );

    await runRulesMd([project, "--target", "GEMINI.md", "--check"]);
    assert.equal(process.exitCode, 0);
  });
});
