import { spawnSync } from "node:child_process";
import {
  backTranslateResponse,
  loadTranslateConfig,
  translateUserPrompt,
} from "@cursor-translate/core";

export async function runAgent(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  const agyFlags = separatorIndex >= 0 ? args.slice(0, separatorIndex) : [];
  const promptParts = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : args;
  const rawPrompt = promptParts.join(" ").trim();

  if (!rawPrompt) {
    throw new Error('Usage: agy-translate agent [agy flags] -- "<prompt>"');
  }

  const config = await loadTranslateConfig();
  let promptToSend = rawPrompt;

  if (config.promptTranslateEnabled) {
    const promptResult = await translateUserPrompt({ text: rawPrompt });
    promptToSend = promptResult.text;
  }

  const agyBin = process.env.AGY_TRANSLATE_BIN ?? "agy";
  const childArgs = [...agyFlags, "-p", promptToSend];

  const result = spawnSync(agyBin, childArgs, {
    stdio: "inherit",
  });

  process.exitCode = result.status ?? 0;
}
