import { syncRulesFile } from "./rulesmd.js";

export async function runGeminiMd(args: string[]): Promise<void> {
  await syncRulesFile({
    targetName: "GEMINI.md",
    ruSourceName: "GEMINI.ru.md",
    commandName: "geminimd",
    args,
  });
}
