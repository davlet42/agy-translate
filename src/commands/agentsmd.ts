import { syncRulesFile } from "./rulesmd.js";

export async function runAgentsMd(args: string[]): Promise<void> {
  await syncRulesFile({
    targetName: "AGENTS.md",
    ruSourceName: "AGENTS.ru.md",
    commandName: "agentsmd",
    args,
  });
}
