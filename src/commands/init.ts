import { copyFile, mkdir, writeFile, chmod, access, symlink } from "node:fs/promises";
import { constants, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setupShellPath } from "./setup-shell-path.js";
import { resolveAgyTranslateHome } from "../agy-env.js";
import {
  resolveBundledCliEntry,
  resolveBundledMcpServer,
  resolveInitInstallRoot,
  resolveInitModuleDir,
} from "../helpers/resolve-init-paths.js";

const MODULE_DIR = resolveInitModuleDir();
const INSTALL_ROOT = resolveInitInstallRoot(MODULE_DIR);
const TRANSLATE_HOME = resolveAgyTranslateHome();

const HOOK_SCRIPTS = [
  "translate-lazy-read.sh",
  "translate-audit-prompt.sh",
  "translate-audit-stop.sh",
  "log-metrics.mjs",
] as const;

export interface InitOptions {
  dryRun?: boolean;
  skipHooks?: boolean;
  addPath?: boolean;
  linkPlugin?: boolean;
}

export interface InitResult {
  translateHome: string;
  created: string[];
  updated: string[];
  warnings: string[];
  pluginInstalled?: boolean;
  pathSetup: {
    shellRcPath: string | null;
    added: boolean;
    alreadyPresent: boolean;
  } | null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function installWrapper(
  wrapperName: string,
  scriptPath: string | null,
  dryRun: boolean,
  created: string[],
  updated: string[],
  options?: { exportAgyEnv?: boolean },
): Promise<void> {
  if (!scriptPath || !(await exists(scriptPath))) {
    return;
  }

  const binDir = join(TRANSLATE_HOME, "bin");
  const wrapperPath = join(binDir, wrapperName);
  const had = await exists(wrapperPath);

  const envLines = options?.exportAgyEnv
    ? [
        'export CURSOR_TRANSLATE_HOME="${AGY_TRANSLATE_HOME:-$HOME/.gemini/translate-proxy}"',
        'export CURSOR_TRANSLATE_DEFAULT_PROVIDER="${CURSOR_TRANSLATE_DEFAULT_PROVIDER:-agy-cli}"',
      ].join('\n') + '\n'
    : "";

  const wrapper = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    envLines.trimEnd(),
    `exec node "${scriptPath}" "$@"`,
  ]
    .filter(Boolean)
    .join('\n') + '\n';

  if (!dryRun) {
    await mkdir(binDir, { recursive: true });
    await writeFile(wrapperPath, wrapper, "utf8");
    await chmod(wrapperPath, 0o755);
  }

  if (had) {
    updated.push(wrapperPath);
  } else {
    created.push(wrapperPath);
  }
}

async function ensureDir(path: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    return;
  }
  await mkdir(path, { recursive: true });
}

async function copyTemplate(
  from: string,
  to: string,
  dryRun: boolean,
  created: string[],
): Promise<void> {
  if (!(await exists(from)) || (await exists(to))) {
    return;
  }
  if (!dryRun) {
    await copyFile(from, to);
  }
  created.push(to);
}

async function installHookAsset(
  filename: string,
  dryRun: boolean,
  created: string[],
  updated: string[],
): Promise<void> {
  const from = join(INSTALL_ROOT, "plugin", "hooks", filename);
  const dest = join(TRANSLATE_HOME, "hooks", filename);

  if (!(await exists(from))) {
    return;
  }

  const had = await exists(dest);
  if (!dryRun) {
    await copyFile(from, dest);
    await chmod(dest, 0o755);
  }

  if (had) {
    updated.push(dest);
  } else {
    created.push(dest);
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
      if (entry.name.endsWith(".sh") || entry.name.endsWith(".mjs")) {
        await chmod(destPath, 0o755);
      }
    }
  }
}

async function installGlobalPlugin(dryRun: boolean): Promise<boolean> {
  const globalPluginsDir = join(homedir(), ".gemini", "config", "plugins");
  const targetPluginDir = join(globalPluginsDir, "agy-translate");
  const sourcePluginDir = join(INSTALL_ROOT, "plugin");

  if (!existsSync(sourcePluginDir)) {
    return false;
  }

  if (!dryRun) {
    await mkdir(globalPluginsDir, { recursive: true });
    if (!existsSync(targetPluginDir)) {
      try {
        await symlink(sourcePluginDir, targetPluginDir, "dir");
      } catch {
        await copyDir(sourcePluginDir, targetPluginDir);
      }
    }
  }
  return true;
}

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const dryRun = options.dryRun ?? false;
  const created: string[] = [];
  const updated: string[] = [];
  const warnings: string[] = [];

  await ensureDir(TRANSLATE_HOME, dryRun);
  await ensureDir(join(TRANSLATE_HOME, "cache"), dryRun);
  await ensureDir(join(TRANSLATE_HOME, "hooks"), dryRun);

  await copyTemplate(
    join(INSTALL_ROOT, "templates", "config.yaml"),
    join(TRANSLATE_HOME, "config.yaml"),
    dryRun,
    created,
  );

  await copyTemplate(
    join(INSTALL_ROOT, "plugin", "glossary.default.yaml"),
    join(TRANSLATE_HOME, "glossary.yaml"),
    dryRun,
    created,
  );

  if (!options.skipHooks) {
    for (const script of HOOK_SCRIPTS) {
      await installHookAsset(script, dryRun, created, updated);
    }
  }

  await installWrapper("agy-translate", resolveBundledCliEntry(MODULE_DIR), dryRun, created, updated);
  await installWrapper(
    "agy-translate-mcp",
    resolveBundledMcpServer(INSTALL_ROOT),
    dryRun,
    created,
    updated,
    { exportAgyEnv: true },
  );

  await copyTemplate(
    join(INSTALL_ROOT, "templates", "agy-translate-rules.example.md"),
    join(TRANSLATE_HOME, "agy-translate-rules.example.md"),
    dryRun,
    created,
  );

  let pluginInstalled = false;
  if (options.linkPlugin ?? true) {
    pluginInstalled = await installGlobalPlugin(dryRun);
  }

  let pathSetup: InitResult["pathSetup"] = null;
  if (options.addPath) {
    const pathResult = await setupShellPath(dryRun);
    pathSetup = {
      shellRcPath: pathResult.shellRcPath,
      added: pathResult.added,
      alreadyPresent: pathResult.alreadyPresent,
    };
  }

  return {
    translateHome: TRANSLATE_HOME,
    created,
    updated,
    warnings,
    pluginInstalled,
    pathSetup,
  };
}
