/* Maiming, chases and restocking without the Storyteller's hand (B4886-B4888). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await load("modules/wodx-interactables/scripts/interact-rules.mjs");

test("a heavy blow cripples at once; lost for good stays a button", () => {
  const b = src("modules/wodx-combat/scripts/body.js");
  assert.ok(/createEmbeddedDocuments\("ActiveEffect", \[crippleEffect\(offer\.part, offer\.label\)\]\)/.test(b));
  assert.ok(/data-action="wodx-maim"/.test(b) && /wodx-cripple-undo/.test(b));
  assert.ok(/action: "maim"/.test(src("modules/wodx-combat/scripts/main.js")));
});

test("a chase runs, settles and starts by itself", () => {
  const c = src("modules/wodx-interactables/scripts/chase.mjs");
  assert.ok(/async function settle\(/.test(c) && /async function tickChases\(/.test(c) && /export async function fled\(/.test(c));
  assert.ok(!/The Storyteller calls it/.test(c));
  assert.ok(/chase\?\.fled\?\.\(tok\.document, foeToks\)/.test(src("modules/wodx-npc/scripts/main.mjs")));
  assert.ok(/chaseAuto/.test(src("modules/wodx-interactables/scripts/main.mjs")));
});

test("a container restocks by its place unless set", () => {
  assert.equal(R.restockFor({restock: "never", title: "shop shelf"}, {title: "shop shelf"}), "");
  assert.equal(R.restockFor({restock: "dawn"}, {title: "larder"}), "dawn");
  assert.equal(R.restockFor({}, {title: "The shop counter"}), "week");
  assert.equal(R.restockFor({}, {title: "Larder"}), "month");
  assert.equal(R.restockFor({}, {title: "Armoury rack"}), "season");
  assert.equal(R.restockFor({}, {title: "", kinds: ["market"]}), "week");
  assert.equal(R.restockFor({}, {title: "", kinds: ["castle"]}), "season");
  assert.equal(R.restockFor({}, {title: "", kinds: ["home"]}), "");
  assert.equal(R.cleanContainer({restock: "never"}).restock, "never");
  assert.equal(R.cleanContainer({}).restock, "");
});
