import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatReport, runReport } from "../dist/commands/report.js";

describe("runReport / formatReport", () => {
  it("formats empty report when metrics file is missing", async () => {
    const result = await runReport([]);
    assert.ok(result);
    const text = formatReport(result);
    assert.match(text, /agy-translate/);
    assert.match(text, /Gemini Flash/);
  });
});
