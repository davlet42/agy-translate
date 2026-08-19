import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const pluginPath = join(root, "plugin", "plugin.json");

let plugin = {};
try {
  plugin = JSON.parse(await readFile(pluginPath, "utf8"));
} catch {
  plugin = { name: "agy-translate" };
}

if (plugin.version !== pkg.version) {
  if (checkOnly) {
    console.error(`plugin.json version (${plugin.version}) does not match package.json (${pkg.version})`);
    process.exit(1);
  }
  plugin.version = pkg.version;
  await writeFile(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
  console.log(`Synced plugin.json version to ${pkg.version}`);
}
