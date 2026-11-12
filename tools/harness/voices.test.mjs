import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../../modules/wodx-voices/scripts/voice-rules.mjs";

const CARD = `<div class="vta-card wodx-x wnpc wnpc-talk-card"><div class="vta-body"><p class="wodx-quiet">Mira asks about the bridge.</p><p>Coin first, traveller &amp; quickly.</p><p class="wodx-quiet wnpc-heard"><i>The water laughs.</i></p></div></div>`;

test("the spoken words are the first plain paragraph of a talk card", () => {
  assert.equal(V.spokenLine(CARD), "Coin first, traveller & quickly.");
  assert.equal(V.spokenLine(`<p class="wodx-quiet">x</p><p><i>They have nothing to say about that.</i></p>`), "");
  assert.equal(V.spokenLine(""), "");
  assert.equal(V.spokenLine(`<p class="wodx-quiet">Mira takes their leave.</p><p>Go <b>well</b>.</p>`), "Go well.");
});

test("a voice profile is steady per NPC and differs between NPCs", () => {
  const a = V.profileFor({id: "actor-a"}), b = V.profileFor({id: "actor-a"}), c = V.profileFor({id: "actor-c"});
  assert.deepEqual(a, b);
  assert.notDeepEqual([a.pitch, a.rate, a.seed], [c.pitch, c.rate, c.seed]);
  for ( const id of ["1", "2", "3", "4", "5", "6", "7", "8"] ) {
    for ( const style of [null, ...Object.keys(V.STYLE_SHIFT)] ) {
      const p = V.profileFor({id, style, age: 80});
      assert.ok(p.pitch >= 0.5 && p.pitch <= 1.6 && p.rate >= 0.7 && p.rate <= 1.3, `${id} ${style}`);
    }
  }
});

test("style and age move the voice; the Storyteller's choice wins", () => {
  const base = V.profileFor({id: "x"}), drunk = V.profileFor({id: "x", style: "drunk"}), old = V.profileFor({id: "x", age: 70});
  assert.ok(drunk.rate < base.rate);
  assert.ok(old.rate < base.rate && old.pitch < base.pitch);
  const o = V.profileFor({id: "x", override: {voice: "Microsoft Zira", pitch: 1.2, rate: 0.9}});
  assert.deepEqual([o.voice, o.pitch, o.rate], ["Microsoft Zira", 1.2, 0.9]);
  assert.equal(V.profileFor({id: "x", override: {pitch: ""}}).pitch, base.pitch);
});

test("sex is used only when known, never guessed", () => {
  assert.equal(V.profileFor({id: "x", sex: "Female"}).sex, "female");
  assert.equal(V.profileFor({id: "x", sex: "any"}).sex, null);
  assert.equal(V.profileFor({id: "x"}).sex, null);
});

const VOICES = [
  {name: "Microsoft David - English (United States)", lang: "en-US", localService: true},
  {name: "Microsoft Zira - English (United States)", lang: "en-US", localService: true},
  {name: "Microsoft Hazel - English (United Kingdom)", lang: "en-GB", localService: true},
  {name: "Google UK English Male", lang: "en-GB", localService: false},
  {name: "Microsoft Jakub - Czech (Czech)", lang: "cs-CZ", localService: true}
];

test("voices on the computer come first, English only, matched to a known sex", () => {
  for ( const id of ["a", "b", "c", "d", "e", "f"] ) {
    const v = V.pickVoice(VOICES, V.profileFor({id}));
    assert.ok(v.localService && v.lang.startsWith("en"), v.name);
    assert.equal(V.voiceSex(V.pickVoice(VOICES, V.profileFor({id, sex: "male"})).name), "male");
    assert.equal(V.voiceSex(V.pickVoice(VOICES, V.profileFor({id, sex: "female"})).name), "female");
  }
  assert.equal(V.pickVoice(VOICES, V.profileFor({id: "a", override: {voice: "Google UK English Male"}})).name, "Google UK English Male");
  assert.equal(V.pickVoice([], V.profileFor({id: "a"})), null);
  const order = [...VOICES].reverse();
  assert.equal(V.pickVoice(order, V.profileFor({id: "q"})).name, V.pickVoice(VOICES, V.profileFor({id: "q"})).name, "list order does not matter");
});

test("only the people who see a line hear it", () => {
  const on = {enabled: true, userId: "u1"};
  assert.equal(V.shouldSpeak({...on}), true);
  assert.equal(V.shouldSpeak({...on, enabled: false}), false);
  assert.equal(V.shouldSpeak({...on, muted: true}), false);
  assert.equal(V.shouldSpeak({...on, whisper: ["u2", "gm"]}), false);
  assert.equal(V.shouldSpeak({...on, whisper: ["u1", "gm"]}), true);
  assert.equal(V.shouldSpeak({...on, isGM: true, gmHears: false}), false);
});

test("a talk card is spoken on the clients that receive it, in the NPC's voice", async () => {
  const hooks = {};
  const spoken = [];
  const settings = {enabled: true, gmHears: true, volume: 0.5, mute: false};
  const actor = {id: "npc1", flags: {"wodx-npc": {behavior: {voice: "noble"}}}};
  const tok = {id: "t1", actorId: "npc1", actorLink: true, actor};
  globalThis.Hooks = {once: (k, f) => (hooks[k] ??= []).push(f), on: (k, f) => (hooks[k] ??= []).push(f)};
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = {getVoices: () => VOICES, speak: u => spoken.push(u), cancel() {}};
  const mod = {};
  globalThis.game = {
    user: {id: "u1", isGM: false},
    settings: {register() {}, get: (m, k) => settings[k]},
    modules: {get: () => mod},
    scenes: {get: id => (id === "s1" ? {tokens: {get: t => (t === "t1" ? tok : null)}} : null)}
  };
  await import("../../modules/wodx-voices/scripts/main.mjs");
  for ( const f of [...hooks.init, ...hooks.ready] ) f();
  const fire = m => hooks.createChatMessage.forEach(f => f(m));
  const msg = {speaker: {scene: "s1", token: "t1"}, content: CARD, whisper: ["u1", "gm"], flags: {"wodx-npc": {talk: {actor: "pc"}}}};
  fire(msg);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "Coin first, traveller & quickly.");
  const p = V.profileFor({id: "npc1", style: "noble"});
  assert.deepEqual([spoken[0].pitch, spoken[0].rate, spoken[0].volume], [p.pitch, p.rate, 0.5]);
  fire({...msg, whisper: ["u2", "gm"]});
  fire({...msg, flags: {}});
  settings.mute = true; fire(msg); settings.mute = false;
  settings.enabled = false; fire(msg);
  assert.equal(spoken.length, 1, "not for this user, not a talk card, muted, or off: silent");
  assert.equal(typeof mod.api.preview, "function");
});
