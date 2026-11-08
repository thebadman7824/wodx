import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6e: the WoDX look (B51) — WoDX Actions 3.6.0 and WoDX Chronicle 0.3.0 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TR = await import(join(root, "modules/wodx-actions/scripts/theme-rules.js"));
const {MENUS} = await import(join(root, "modules/wodx-actions/scripts/profile-menus.js")).catch(() => ({MENUS: null}));
const RESMOD = await import(join(root, "modules/wodx-actions/scripts/profiles.js"));
const {RES} = RESMOD;
const theme = await import(join(root, "modules/wodx-chronicle/scripts/theme.mjs"));
const css = readFileSync(join(root, "modules/wodx-chronicle/styles/wodx-theme.css"), "utf8");

test("every line wears the look; each line but mortals has its own accent", () => {
  const {PROFILES} = RESMOD;
  assert.deepEqual([...TR.LINE_LOOK].sort(), Object.keys(PROFILES).sort());
  assert.equal(TR.lineClass("kindred"), "wodx-line-kindred");
  assert.equal(TR.lineClass("nobody"), "");
  for (const k of TR.LINE_LOOK) {
    assert.ok(TR.LINE_MARK[k], `${k} has a mark`);
    if (k === "mortal") continue;
    for (const tone of ["light", "dark"]) assert.ok(css.includes(`[data-wodx-tone="${tone}"] .wodx-line-${k} {`), `${k} has a ${tone} accent`);
  }
});

test("every menu button of every line is placed and described", () => {
  if (!MENUS) return; // profile-menus needs Foundry globals in some setups
  for (const kind of [...TR.LINE_LOOK, "mageDA"]) {
    const specs = MENUS[kind].sections.flatMap(([, b]) => b.map(x => x[0]));
    const g = TR.groupMenu(kind, MENUS[kind].sections, {isGM: true});
    const placed = [...g.bands.flatMap(b => b.buttons), ...g.scene].map(b => b.spec);
    assert.deepEqual([...placed].sort(), [...new Set(specs)].sort(), `${kind}: every button appears once`);
    for (const s of specs) assert.ok(TR.DESC[s], `${kind}: ${s} has a description`);
    // The plan names only buttons the menu has
    for (const [id, list] of Object.entries(TR.MENU_PLAN[kind])) for (const s of list) assert.ok(specs.includes(s), `${kind}.${id}: ${s} is in the menu`);
  }
});

test("menus are grouped act, resist, recover, Storyteller; players do not see the Storyteller's tools", () => {
  const sections = [["Roll", [["action", "Action", "fa-dice"], ["api:useArcanos", "Use an Arcanos", "fa-ghost"]]],
    ["The Shadow", [["api:shadow", "The Shadow", "fa-mask"], ["api:maelstrom", "The Maelstrom (GM)", "fa-wind"]]],
    ["Corpus", [["api:healCorpus", "Heal Corpus", "fa-band-aid"]]], ["Scene", [["api:endScene", "End scene", "fa-flag"]]]];
  const gm = TR.groupMenu("wraith", sections, {isGM: true});
  assert.deepEqual(gm.bands.map(b => b.id), ["act", "resist", "recover", "st"]);
  assert.equal(gm.bands[0].buttons[0].spec, "action", "most used first");
  assert.deepEqual(gm.scene.map(b => b.spec), ["api:endScene"]);
  const player = TR.groupMenu("wraith", sections, {isGM: false});
  assert.ok(!player.bands.some(b => b.id === "st"));
  // A button the plan does not know goes by its section
  const other = TR.groupMenu("kindred", [["Danger", [["api:new", "Something new", "fa-x"]]], ["Scene", [["api:x", "Thing (GM)", "fa-x"]]]], {isGM: true});
  assert.equal(other.bands.find(b => b.id === "resist").buttons[0].spec, "api:new");
  assert.equal(other.bands.find(b => b.id === "st").buttons[0].spec, "api:x");
});

test("recent uses: newest first, no repeats, at most four", () => {
  let r = [];
  for (const s of ["a", "b", "c", "a", "d", "e"]) r = TR.pushRecent(r, s);
  assert.deepEqual(r, ["e", "d", "a", "c"]);
});

test("page references move to the card's footer", () => {
  const {body, refs} = TR.extractRefs(`<div class="vta-note">The Beast stirs (V20 Dark Ages p. 345).</div><div class="wodx-quiet">The Hunters Hunted II p. 74</div><div class="vta-note">No page here.</div>`);
  assert.deepEqual([...refs].sort(), ["The Hunters Hunted II p. 74", "V20 Dark Ages p. 345"]);
  assert.ok(body.includes("The Beast stirs.</div>"));
  assert.ok(!body.includes("p. 74"));
  // A quiet line that is not a reference stays
  assert.equal(TR.extractRefs(`<div class="wodx-quiet">Journal: WoDX Prestation</div>`).refs.length, 0);
});

test("the header shows the card's one result", () => {
  assert.deepEqual(TR.verdictOf(`<div class="vta-res good">3 successes — Complete</div>`), {text: "3 successes — Complete", tone: "good"});
  assert.deepEqual(TR.verdictOf(`<div class="vta-res bad">BOTCH</div>`), {text: "BOTCH", tone: "bad"});
  assert.equal(TR.verdictOf(`<div class="vta-res">Failure</div><div class="vta-res good">2 successes</div>`), null, "two rolls: no single verdict");
  assert.deepEqual(TR.verdictOf(`<div class="vta-res">x</div><div class="vta-big good">Frenzy resisted</div>`).text, "Frenzy resisted");
});

test("resource pips show the value, what was lost and what was gained", () => {
  const p = TR.pips(5, 3, 6);
  assert.equal((p.match(/vta-pip on"/g) ?? []).length, 3);
  assert.equal((p.match(/vta-pip lost/g) ?? []).length, 2);
  assert.equal((p.match(/vta-pip off/g) ?? []).length, 1);
  assert.equal((TR.pips(2, 4, 5).match(/on gain/g) ?? []).length, 2);
  assert.equal(TR.pips(3, 2, 20), "", "long tracks get numbers only");
});

test("what changed: from the sheet update, merged, unchanged left out", () => {
  const system = {advantages: {willpower: {temporary: 5, permanent: 6}, bloodpool: {temporary: 8, max: 10}}, health: {damage: {lethal: 0, corpus: {aggravated: 1}}}};
  const flat = {"system.advantages.willpower.temporary": 4, "system.advantages.bloodpool.temporary": 8, "system.health.damage.lethal": 2,
    "system.health.damage.corpus.aggravated": 2, "system.unrelated.temporary": 1};
  const d = TR.diffResources(system, flat, RES);
  assert.deepEqual(d.map(c => c.label), ["Willpower", "Lethal damage", "Corpus: Aggravated damage"]);
  assert.equal(d[0].max, 6);
  const strip = TR.changeStrip([{label: "Willpower", before: 5, after: 4, max: 6}, {label: "Willpower", before: 4, after: 3, max: 6}, {label: "Blood", before: 2, after: 2}]);
  assert.ok(strip.includes("5 → 3"));
  assert.ok(!strip.includes("Blood"));
  assert.equal(TR.changeStrip([]), "");
});

test("one card layout keeps the h3 and the vta-card class every script looks for", () => {
  const html = TR.cardLayout({title: "Ilse: Frenzy", body: `<div class="vta-sec"><b>Self-Control</b>: 3 dice<div class="vta-res good">2 successes</div></div><div class="vta-note">Held (p. 345).</div>`,
    line: "kindred", changes: [{label: "Willpower", before: 5, after: 4, max: 5}]});
  assert.match(html, /^<div class="vta-card wodx-x wodx-line-kindred" data-line="kindred">/);
  assert.match(html, /<h3 style="[^"]*">Ilse: Frenzy<\/h3>/);
  assert.ok(html.indexOf("vta-verdict") < html.indexOf("vta-body"), "the verdict is in the header");
  assert.ok(html.indexOf("vta-change") < html.indexOf("vta-ref"), "what changed, then the page");
  assert.match(html, /<footer class="vta-ref">p\. 345<\/footer><\/div>$/);
  // A line not rolled out yet: no line class, no mark
  assert.ok(!TR.cardLayout({title: "x", body: "", line: "nobody"}).includes("wodx-line"));
  // Late changes join a posted card before its footer
  const later = TR.withChanges(html, [{label: "Blood", before: 8, after: 7, max: 10}]);
  assert.ok(later.indexOf("Blood") < later.indexOf("vta-ref") && (later.match(/vta-change"/g) ?? []).length === 1);
});

test("the look follows the kit, or the player's own choice", () => {
  assert.equal(theme.toneFor("dark-ages", "era"), "light");
  assert.equal(theme.toneFor("modern", "era"), "dark");
  assert.equal(theme.toneFor("modern", "light"), "light");
  assert.equal(theme.toneFor(undefined, "era"), "dark");
  assert.equal(theme.toneFor("victorian", "plain", false), "light");
  // Every era profile has a kit with a tone, and a block in the stylesheet
  const eras = JSON.parse(readFileSync(join(root, "modules/wodx-chronicle/data/eras.json"), "utf8"));
  for (const p of eras.profiles ?? eras) {
    const kit = p.kit ?? p.id;
    assert.ok(theme.KIT_TONE[kit], `${kit} has a tone`);
    assert.ok(css.includes(`[data-wodx-kit="${kit}"]`), `${kit} has a kit in the stylesheet`);
  }
});

/* ---- Contrast (WCAG 2.1): text 4.5:1, large titles and accents 3:1, in every kit and in both looks ---- */
const hex = h => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const lum = rgb => { const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function blocks() {
  const out = {};
  const base = /body\.wodx-look \{([^}]*)\}/.exec(css)[1];
  const read = t => Object.fromEntries([...t.matchAll(/--(wx-[a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
  const b = read(base);
  for (const m of css.matchAll(/body\.wodx-look(?::is\(([^)]*)\)|((?:\[data-wodx-kit="[^"]+"\])))(?:, body\.wodx-look\[data-wodx-kit="([^"]+)"\])? \{([^}]*)\}/g)) {
    const kits = [...(m[1] ?? m[2]).matchAll(/data-wodx-kit="([^"]+)"/g)].map(x => x[1]);
    if (m[3]) kits.push(m[3]);
    for (const k of kits) out[k] = {...(out[k] ?? b), ...read(m[4])};
  }
  for (const look of ["light", "dark"]) out[`look:${look}`] = {...b, ...read(new RegExp(`body\\.wodx-look\\[data-wodx-look="${look}"\\] \\{([^}]*)\\}`).exec(css)[1])};
  return out;
}
const mix = (a, pct) => { const p = parseFloat(pct ?? "100") / 100; const x = hex(a); return "#" + x.map(c => Math.round((c * p + (1 - p)) * 255).toString(16).padStart(2, "0")).join(""); };
const solid = v => { const m = /#[0-9a-f]{3,6}\b/i.exec(v ?? ""); return m?.[0]; };

test("contrast: text on paper, headers, buttons and accents in every kit", () => {
  const kits = blocks();
  assert.ok(Object.keys(kits).length >= 10);
  const tone = k => k.startsWith("look:") ? k.slice(5) : theme.KIT_TONE[k];
  const accents = [...css.matchAll(/body\.wodx-look\[data-wodx-tone="(light|dark)"\] \.wodx-line-([a-z]+) \{ --wx-accent: (#[0-9a-f]+); --wx-on-accent: (#[0-9a-f]+)/g)];
  assert.ok(accents.length >= 18);
  const bad = [];
  for (const [k, t] of Object.entries(kits)) {
    const paper = solid(t["wx-paper"]), bar = solid(t["wx-bar"]);
    const need = (a, b, min, what) => { const r = ratio(a, b); if (r < min) bad.push(`${k} ${what}: ${r.toFixed(2)} < ${min}`); };
    need(t["wx-ink"], paper, 7, "ink on paper");
    need(t["wx-quiet"], paper, 4.5, "quiet text on paper");
    need(t["wx-bar-ink"], bar, 4.5, "title bar");
    need(solid(t["wx-kit-accent"]), paper, 4.5, "era accent on paper");
    need(t["wx-on-accent"], t["wx-kit-accent"], 4.5, "text on the era accent");
    need(t["wx-good"], paper, 4.5, "success");
    need(t["wx-bad"], paper, 4.5, "failure");
    need(t["wx-focus"], paper, 3, "focus ring");
    need(mix(solid(t["wx-kit-accent"]), t["wx-bar-mix"]), bar, 3, "era accent on the title bar");
    for (const [, tn, line, acc, on] of accents) {
      if (tn !== tone(k)) continue;
      need(acc, paper, 4.5, `${line} accent on paper`);
      need(on, acc, 4.5, `text on the ${line} accent`);
      need(mix(acc, t["wx-bar-mix"]), bar, 3, `${line} accent on the title bar`);
    }
  }
  assert.deepEqual(bad, []);
});

/* ---- B60: the WoDX buttons each player sees ---- */
test("player toolbar buttons: players only lose buttons, the X-card always stays", async () => {
  const PT = await import(join(root, "modules/wodx-chronicle/scripts/player-tools.mjs"));
  const m = {u1: {wodxPeek: false, wodxXCard: false, wodxShroud: false}};
  assert.equal(PT.toolShown(m, "u1", "wodxPeek"), false);
  assert.equal(PT.toolShown(m, "u2", "wodxPeek"), true, "another player keeps it");
  assert.equal(PT.toolShown(m, "u1", "wodxXCard"), true, "the X-card can't be hidden");
  assert.equal(PT.toolShown(m, "u1", "wodxShroud"), true, "a Storyteller button is left to its own rule, never touched here");
  const saved = PT.fromTicks({u1: {wodxClock: true, wodxPeek: false, wodxXCard: false}, u2: {wodxClock: true}});
  assert.deepEqual(saved, {u1: {wodxPeek: false}});
  // Every WoDX token button a player sees is in the list, and only those
  const src = ["wodx-chronicle", "wodx-otherworlds", "wodx-creation", "wodx-storyteller"].map(m => readFileSync(join(root, `modules/${m}/scripts/main.mjs`), "utf8")).join("\n");
  const playerVisible = [...src.matchAll(/tools\.(wodx\w+) = \{[\s\S]*?visible: (true|game\.user\.isGM)/g)].filter(x => x[2] === "true").map(x => x[1]);
  assert.deepEqual([...playerVisible].sort(), PT.PLAYER_TOOLS.map(t => t.name).sort());
});

/* ---- B61: Find my character ---- */
test("find my character: the nearest on this scene, else the one other scene, else a choice; never a hidden token", async () => {
  const PT = await import(join(root, "modules/wodx-chronicle/scripts/player-tools.mjs"));
  const T = (id, sceneId, actorId, x = 0, y = 0, hidden = false) => ({id, sceneId, actorId, x, y, hidden});
  // Two on this scene: the nearer one
  assert.equal(PT.pickToken({tokens: [T("a", "s1", "c1", 1000, 0), T("b", "s1", "c2", 10, 0)], here: {sceneId: "s1", x: 0, y: 0}}).token.id, "b");
  // The assigned character before a nearer hireling
  assert.equal(PT.pickToken({tokens: [T("a", "s1", "c1", 1000, 0), T("b", "s1", "c2", 10, 0)], here: {sceneId: "s1"}, characterId: "c1"}).token.id, "a");
  // Missed the transition: the token is on another scene
  const away = PT.pickToken({tokens: [T("a", "s2", "c1")], here: {sceneId: "s1"}});
  assert.equal(away.token.id, "a"); assert.equal(away.sameScene, false);
  // Several scenes: the assigned character's, or a choice
  assert.equal(PT.pickToken({tokens: [T("a", "s2", "c1"), T("b", "s3", "c2")], here: {sceneId: "s1"}, characterId: "c2"}).token.id, "b");
  const ch = PT.pickToken({tokens: [T("a", "s2", "c1"), T("b", "s3", "c2")], here: {sceneId: "s1"}, activeSceneId: "s3"});
  assert.deepEqual(ch.choices.map(t => t.id), ["b", "a"], "the active scene first");
  // Hidden by the Storyteller: not shown
  assert.deepEqual(PT.pickToken({tokens: [T("a", "s2", "c1", 0, 0, true)], here: {sceneId: "s1"}}), {none: true, hidden: 1});
  assert.equal(PT.pickToken({tokens: [T("a", "s1", "c1", 0, 0, true), T("b", "s2", "c1")], here: {sceneId: "s1"}}).token.id, "b");
});
