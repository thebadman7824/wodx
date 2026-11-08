import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";
import {installMock} from "./foundry-mock.mjs";

/* Phase 6d: WoDX Actions 3.5.0, the inner voice (B53–B56) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
globalThis.canvas = {scene: null, tokens: {controlled: [], placeables: []}};
game.combat = null;

class Coll extends Map {
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
  some(f) { return [...this.values()].some(f); }
  map(f) { return [...this.values()].map(f); }
  getName(n) { return this.find(v => v.name === n); }
}
game.scenes = Object.assign(new Coll(), {active: {tokens: []}});
const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
const flagged = o => Object.assign(o, {
  getFlag(s, k) { return k.split(".").reduce((x, p) => x?.[p], this.flags?.[s]); },
  async setFlag(s, k, v) { setPath(this.flags ??= {}, `${s}.${k}`, structuredClone(v)); return this; },
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
  async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); return this; }
});
let ids = 0;
const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
function actor(name, {type = "Mortal", wp = [5, 5], attrs = {}, abilities = {}, virtues = [3, 3, 3], adv = {}, items = [], corpus = null} = {}) {
  const a = flagged({
    id: `a${++ids}`, uuid: `Actor.a${ids}`, name, type, flags: {}, isOwner: true, hasPlayerOwner: true,
    items: new Coll(), effects: new Coll(),
    system: {
      attributes: Object.fromEntries(ATTR.map(k => [k, {value: attrs[k] ?? 3, total: attrs[k] ?? 3}])),
      abilities: Object.fromEntries(Object.entries({empathy: 2, occult: 2, awareness: 1, medicine: 1, ...abilities}).map(([k, v]) => [k, {value: v, label: k}])),
      advantages: {willpower: {permanent: wp[1], temporary: wp[0]}, virtues: {conscience: {permanent: virtues[0]}, selfcontrol: {permanent: virtues[1]}, courage: {permanent: virtues[2]}}, ...adv},
      health: {damage: {bashing: 0, lethal: 0, aggravated: 0, ...(corpus ? {corpus} : {})}},
      settings: {}
    },
    getActiveTokens: () => [],
    testUserPermission: () => true
  });
  for ( const it of items ) { const id = `i${++ids}`; a.items.set(id, flagged({id, ...it, system: {...it.system}})); }
  return a;
}

const VR = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));

test("which voice a line has (B54), and the four meters", () => {
  assert.equal(VR.kindFor("kindred"), "beast");
  assert.equal(VR.kindFor("ghoul"), "beast");
  assert.equal(VR.kindFor("wraith"), "shadow");
  assert.equal(VR.kindFor("lupine"), "rage");
  assert.equal(VR.kindFor("hunter"), "impulse");
  assert.equal(VR.kindFor("mage"), "gift", "the Gift (the Avatar) came with the Mage line in 6f");
  assert.equal(VR.pressure("beast", {blood: 8, max: 10, selfcontrol: 3}).level, "calm");
  assert.equal(VR.pressure("beast", {blood: 5, max: 10, selfcontrol: 3}).level, "rising");
  assert.equal(VR.pressure("beast", {blood: 3, max: 10, selfcontrol: 3}).level, "breaking", "under 7 − Self-Control");
  assert.equal(VR.pressure("shadow", {angst: 6, willpower: 5}).level, "breaking");
  assert.equal(VR.pressure("shadow", {angst: 4, willpower: 5}).level, "rising");
  assert.equal(VR.pressure("shadow", {angst: 1, willpower: 5}).level, "calm");
  assert.equal(VR.pressure("rage", {rage: 4, willpower: 6}).level, "rising");
  assert.equal(VR.pressure("rage", {rage: 6, willpower: 6}).level, "breaking");
  assert.equal(VR.pressure("impulse", {conviction: 7, piety: 6}).level, "breaking", "Callous");
  assert.equal(VR.pressure("impulse", {virtue: 7}).level, "breaking", "a derangement at 7");
  assert.equal(VR.rose("calm", "rising"), true);
  assert.equal(VR.rose("rising", "stirring"), false);
});

test("proposals use each line's own roll; consent and the X-card (B53, B56)", () => {
  for ( const [k, list] of Object.entries(VR.PROPOSALS) ) assert.ok(list.length && list.every(p => p.id && p.label && ["owner", "guide"].includes(p.roller)), k);
  assert.equal(VR.proposalFor("shadow", "catharsis").roller, "guide");
  assert.equal(VR.proposalFor("beast", "frenzy").api, "frenzy");
  assert.equal(VR.live({chronicleOn: false, optIn: true, hasPlayerOwner: true, paused: false}), false);
  assert.equal(VR.live({chronicleOn: true, optIn: false, hasPlayerOwner: true, paused: false}), false, "the player must opt in");
  assert.equal(VR.live({chronicleOn: true, optIn: false, hasPlayerOwner: false, paused: false}), true, "a Storyteller character");
  assert.equal(VR.live({chronicleOn: true, optIn: true, hasPlayerOwner: true, paused: true}), false, "the X-card");
});

/* ---------------- The engine ---------------- */

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();
const chron = game.modules.get("wodx-chronicle").api;
const proposals = [];
chron.propose = async r => { proposals.push(r); };
chron.eras = {activeEra: () => ({profile: {id: "dark-ages"}}), currentYear: () => 1230};
const VX = await import(join(root, "modules/wodx-actions/scripts/voice.js"));
const WX = await import(join(root, "modules/wodx-actions/scripts/wraith.js"));
VX.registerSettings(); WX.registerSettings();
const S = {};
const forms = [], posts = [], notes = [];
const ctx = {
  post: async (a, title, body) => { posts.push({title, body}); },
  dialog: async (title, content, label, cb) => {
    const el = document.createElement("div"); el.innerHTML = content;
    const a = forms.shift(); if ( a === undefined ) throw new Error(`Unexpected dialog: ${title}`);
    const fd = {}; for ( const f of el.querySelectorAll("input, select, textarea") ) if ( f.name ) fd[f.name] = f.type === "checkbox" ? f.checked : f.value;
    return cb({...fd, ...a});
  },
  setFlag: (a, k, v) => (v === null ? a.unsetFlag("wodx-actions", k) : a.setFlag("wodx-actions", k, v)),
  virtues: a => { const v = a.system.advantages.virtues; return {selfcontrol: {value: v.selfcontrol.permanent}, conscience: {value: v.conscience.permanent}, courage: {value: v.courage.permanent}}; },
  notify: m => notes.push(m), api: () => ({}), wraithInfo: a => WX.info(a), inquisitor: () => null
};
const E = VX.build(ctx);
const reset = () => { forms.length = 0; posts.length = 0; notes.length = 0; proposals.length = 0; mock.log.chat.length = 0; };

test("the voice's panel: off until the chronicle switch and the player's opt-in; a whisper reaches only the character, the voice and the Storyteller", async () => {
  reset();
  const v = actor("Ilse", {type: "Vampire", adv: {bloodpool: {temporary: 3, max: 10}}});
  v.hasPlayerOwner = true;
  assert.equal(E.kindOf(v), "beast");
  assert.equal(E.pressureOf(v).level, "breaking");
  forms.push({act: "whisper", text: "Feed."});
  await E.panel(v);
  assert.match(notes.at(-1) ?? "", /off for this chronicle/);
  await game.settings.set("wodx-actions", "voicesOn", true);
  forms.push({act: "whisper", text: "Feed."});
  await E.panel(v);
  assert.match(notes.at(-1), /opted in/);
  await v.setFlag("wodx-actions", "voice", {optIn: true, user: null});
  assert.equal(E.live(v), true);
  forms.push({act: "whisper", text: "Feed."});
  await E.panel(v);
  const m = mock.log.chat.at(-1);
  assert.ok(m && /Feed\./.test(m.content) && Array.isArray(m.whisper));
  forms.push({act: "propose", prop: "frenzy", text: "The insult"});
  await E.panel(v);
  assert.equal(proposals.at(-1)?.type, "wodx-voice");
  assert.equal(proposals.at(-1).data.prop, "frenzy");
});

test("the X-card pauses every voice until the scene ends", async () => {
  reset();
  const v = actor("Ilse2", {type: "Vampire", adv: {bloodpool: {temporary: 3, max: 10}}});
  v.hasPlayerOwner = true;
  await v.setFlag("wodx-actions", "voice", {optIn: true});
  await game.settings.set("wodx-actions", "voicesOn", true);
  assert.equal(E.live(v), true);
  game.user.isGM = true;
  await E.onXCard();
  assert.equal(E.live(v), false);
  await E.onEndScene();
  assert.equal(E.live(v), true);
});

test("the Storyteller's opt-in: only behind the house rule, only for a player's character", async () => {
  const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));
  assert.equal(V.storytellerMayOptIn({isGM: true, rule: true, hasPlayerOwner: true}), true);
  assert.equal(V.storytellerMayOptIn({isGM: true, rule: false, hasPlayerOwner: true}), false, "off unless the house rule is on");
  assert.equal(V.storytellerMayOptIn({isGM: false, rule: true, hasPlayerOwner: true}), false, "players use their own opt-in");
  assert.equal(V.storytellerMayOptIn({isGM: true, rule: true, hasPlayerOwner: false}), false, "NPCs need no opt-in");
  const rules = (await import(join(root, "modules/wodx-chronicle/data/house-rules.mjs"))).default;
  const r = rules.switches.find(s => s.id === "storytellerVoiceOptIn");
  assert.ok(r && r.group === "safety" && r.default === false);
});
