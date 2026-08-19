import { spawnSync } from "node:child_process";
import { DEFAULT_AGY_TRANSLATE_MODEL } from "../constants/default-models.constant.js";
import {
  GEMINI_FLASH_INPUT_USD_PER_MILLION,
  GEMINI_FLASH_OUTPUT_USD_PER_MILLION,
} from "../constants/gemini-translate-pricing.constant.js";

export interface RunAgyPrintOptions {
  agyBinary?: string;
  model?: string;
  systemPrompt?: string;
  prompt: string;
  timeoutMs?: number;
}

export interface RunAgyPrintResult {
  text: string;
  costUsd: number | null;
  inputTokens?: number;
  outputTokens?: number;
}

export function buildAgyPrintArgs(model: string, fullPrompt: string): string[] {
  return [
    "-p",
    fullPrompt,
    "--model",
    model,
    "--output-format",
    "json",
    "--disable-slash-commands",
  ];
}

interface AgyJsonResponse {
  conversation_id?: string;
  status?: string;
  response?: string;
  error?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    thinking_tokens?: number;
    total_tokens?: number;
  };
}

function parseAgyJsonEnvelope(stdout: string): RunAgyPrintResult | null {
  try {
    const parsed = JSON.parse(stdout) as AgyJsonResponse;
    if (parsed.status && parsed.status !== "SUCCESS") {
      throw new Error(parsed.error || `agy returned status ${parsed.status}`);
    }
    if (typeof parsed.response !== "string") {
      return null;
    }
    const text = parsed.response.trim();
    const inTok = parsed.usage?.input_tokens ?? 0;
    const outTok = parsed.usage?.output_tokens ?? 0;
    const costUsd =
      inTok > 0 || outTok > 0
        ? (inTok * GEMINI_FLASH_INPUT_USD_PER_MILLION + outTok * GEMINI_FLASH_OUTPUT_USD_PER_MILLION) /
          1_000_000
        : null;

    return {
      text,
      costUsd,
      inputTokens: inTok,
      outputTokens: outTok,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("agy returned status")) {
      throw err;
    }
    return null;
  }
}

export function runAgyPrint(options: RunAgyPrintOptions): RunAgyPrintResult {
  const agy = options.agyBinary ?? process.env.AGY_TRANSLATE_BIN ?? "agy";
  const model = options.model ?? process.env.AGY_TRANSLATE_MODEL ?? DEFAULT_AGY_TRANSLATE_MODEL;
  const fullPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${options.prompt}`
    : options.prompt;

  const args = buildAgyPrintArgs(model, fullPrompt);

  const result = spawnSync(agy, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeoutMs ?? 10 * 60 * 1000,
    env: { ...process.env, AGY_TRANSLATE_HOP: "1" },
  });

  if (result.error) {
    throw new Error(`agy CLI failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || result.stdout?.trim() || "unknown error";
    // Check if error is json
    try {
      const parsed = JSON.parse(stderr) as AgyJsonResponse;
      if (parsed.error) {
        throw new Error(`agy CLI exited ${result.status}: ${parsed.error}`);
      }
    } catch {
      // not json
    }
    throw new Error(`agy CLI exited ${result.status}: ${stderr}`);
  }

  const stdout = result.stdout?.trim();
  if (!stdout) {
    throw new Error("agy CLI returned empty translation");
  }

  const envelope = parseAgyJsonEnvelope(stdout);
  const text = envelope?.text ?? stdout;
  if (!text) {
    throw new Error("agy CLI returned empty translation");
  }

  return envelope ?? { text, costUsd: null };
}
