// Storyteller 0.58.2: the README's map names every script and data file, so the map can't fall behind the module.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {dirname, resolve, join} from "node:path";
import {fileURLToPath} from "node:url";

const mod = resolve(dirname(fileURLToPath(import.meta.url)), "../../modules/wodx-storyteller");
const readme = readFileSync(join(mod, "README.md"), "utf8");

test("the Storyteller README names every script and data file", () => {
  const files = [...readdirSync(join(mod, "scripts")).filter(f => f.endsWith(".mjs")).map(f => f),
    ...readdirSync(join(mod, "data")).filter(f => f.endsWith(".mjs")).map(f => `data/${f}`)];
  const missing = files.filter(f => !readme.includes(`\`${f}\``) && !readme.includes(`\`scripts/${f}\``));
  assert.deepEqual(missing, []);
});

test("the Storyteller README names only settings the module registers", () => {
  const code = readdirSync(join(mod, "scripts")).filter(f => f.endsWith(".mjs")).map(f => readFileSync(join(mod, "scripts", f), "utf8")).join("\n");
  const lines = readme.split("\n").filter(l => l.startsWith("- Settings:"));
  const keys = lines.flatMap(l => [...l.matchAll(/`([a-zA-Z]+)`/g)].map(m => m[1]));
  assert.ok(keys.length > 40);
  const unknown = keys.filter(k => !new RegExp(`["']${k}["']`).test(code));
  assert.deepEqual(unknown, []);
});

test("the Storyteller README carries no dash or gendered word", () => {
  assert.ok(!/—|–/.test(readme));
  assert.ok(!/\b(he|she|him|her|his|hers)\b/i.test(readme));
});
