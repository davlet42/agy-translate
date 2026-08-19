import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgyPrintArgs } from "../dist/translate/run-agy-print.js";

describe("runAgyPrint", () => {
  it("builds agy print CLI arguments correctly", () => {
    const args = buildAgyPrintArgs("Gemini 3.7 Flash (Low)", "Hello world");
    assert.deepEqual(args, [
      "-p",
      "Hello world",
      "--model",
      "Gemini 3.7 Flash (Low)",
      "--output-format",
      "json",
      "--disable-slash-commands",
    ]);
  });
});
