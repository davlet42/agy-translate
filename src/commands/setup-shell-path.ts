import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveAgyTranslateHome } from "../agy-env.js";

export interface SetupShellPathResult {
  shellRcPath: string | null;
  added: boolean;
  alreadyPresent: boolean;
}

function resolveShellRc(): string | null {
  const shell = process.env.SHELL ?? "";
  if (shell.endsWith("zsh")) {
    return join(homedir(), ".zshrc");
  }
  if (shell.endsWith("bash")) {
    return join(homedir(), ".bashrc");
  }
  return join(homedir(), ".zshrc");
}

export async function setupShellPath(dryRun: boolean): Promise<SetupShellPathResult> {
  const rcPath = resolveShellRc();
  if (!rcPath) {
    return { shellRcPath: null, added: false, alreadyPresent: false };
  }

  const binDir = join(resolveAgyTranslateHome(), "bin");
  const exportLine = `export PATH="${binDir}:\$PATH"`;

  let current = "";
  try {
    current = await readFile(rcPath, "utf8");
  } catch {
    current = "";
  }

  if (current.includes(binDir)) {
    return { shellRcPath: rcPath, added: false, alreadyPresent: true };
  }

  if (!dryRun) {
    const next = current.endsWith("\n") || !current ? `${current}${exportLine}\n` : `${current}\n${exportLine}\n`;
    await writeFile(rcPath, next, "utf8");
  }

  return { shellRcPath: rcPath, added: true, alreadyPresent: false };
}

export function shellPathHint(rcPath: string | null): string {
  if (!rcPath) {
    return "source your shell config to update PATH";
  }
  return `run: source ${rcPath}`;
}
