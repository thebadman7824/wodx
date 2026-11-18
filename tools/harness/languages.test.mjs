import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {JSDOM} from "jsdom";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-chronicle/scripts/languages-rules.mjs"));

test("Linguistics: 1, 2, 4, 8, 16 beyond the native tongue", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 7].map(L.linguisticsAllows), [0, 1, 2, 4, 8, 16, 16]);
  // V20: a language per Language Merit, two each with Natural Linguist
  assert.equal(L.languagesFromMerits(["Language (Latin)", "Language: Czech", "Iron Will"]), 2);
  assert.equal(L.languagesFromMerits(["Language (Latin)", "Natural Linguist"]), 2);
  assert.equal(L.languagesFromMerits([]), 0);
});

test("scramble keeps the length and capitals, is the same each time, and differs by language", () => {
  const s = L.scramble("Pax tecum, Wenzel!", "Latin");
  assert.equal(s, L.scramble("Pax tecum, Wenzel!", "Latin"));
  assert.notEqual(s, L.scramble("Pax tecum, Wenzel!", "German"));
  assert.match(s, /^[A-Z]\S{2} \S{5}, [A-Z]\S{5}!$/u);
  assert.doesNotMatch(s, /tecum|Wenzel/);
});

test("/in parses multi-word languages", () => {
  assert.deepEqual(L.parseInCommand("/in Old Church Slavonic Gospodi pomiluj", ["Old Church Slavonic", "Latin"]), {language: "Old Church Slavonic", text: "Gospodi pomiluj"});
  assert.deepEqual(L.parseInCommand("/in Latin Pax", ["Latin"]), {language: "Latin", text: "Pax"});
  assert.equal(L.parseInCommand("hello"), null);
  assert.ok(L.understands([["German", "latin"]], "Latin"));
  assert.ok(!L.understands([["German"]], "Czech"));
});

/* Runtime */
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.document = dom.window.document;
globalThis.NodeFilter = dom.window.NodeFilter;
const mock = installMock({dataRoot: root});
await installActors(root);
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const M = "wodx-chronicle";
const api = () => game.modules.get(M).api;

const card = html => { const el = document.createElement("li"); el.innerHTML = `<div class="message-content">${html}</div>`; return el; };

test("a player reads only the languages their characters speak; the Storyteller reads all", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  const anna = game.users.get("p1");
  const jan = await Actor.create({name: "Jan", type: "Mortal", ownership: {default: 0, p1: 3}});
  await api().languages.set(jan, ["Czech", "German", "czech"]);
  assert.deepEqual(api().languages.of(jan), ["Czech", "German"], "duplicates dropped");
  const latin = {flags: {[M]: {language: "Latin"}}, author: {id: "gm"}};
  const czech = {flags: {[M]: {language: "Czech"}}, author: {id: "gm"}};
  mock.asPlayer();
  let el = card("<p>Pax tecum</p>");
  await Hooks.callAll("renderChatMessageHTML", latin, el);
  assert.doesNotMatch(el.textContent, /Pax tecum/);
  assert.match(el.textContent, /In Latin, which your character does not speak/);
  el = card("<p>Dobrý večer</p>");
  await Hooks.callAll("renderChatMessageHTML", czech, el);
  assert.match(el.textContent, /Dobrý večer/);
  assert.match(el.textContent, /In Czech/);
  mock.asGM();
  el = card("<p>Pax tecum</p>");
  await Hooks.callAll("renderChatMessageHTML", latin, el);
  assert.match(el.textContent, /Pax tecum/);
  assert.equal(api().languages.canRead(anna, "Latin", "p1"), true, "the speaker reads their own words");
});

test("the chat box language is set on a character's speech, not on cards or rolls; /in makes one message", async () => {
  mock.asPlayer();
  await game.settings.set(M, "speaking", "German");
  const doc = {updateSource(c) { this.changes = c; }};
  await Hooks.callAll("preCreateChatMessage", doc, {speaker: {actor: "a1"}, content: "Guten Abend"}, {}, "p1");
  assert.deepEqual(doc.changes, {[`flags.${M}.language`]: "German"});
  const card2 = {updateSource(c) { this.changes = c; }};
  await Hooks.callAll("preCreateChatMessage", card2, {speaker: {actor: "a1"}, flags: {"wodx-actions": {x: 1}}}, {}, "p1");
  assert.equal(card2.changes, undefined);
  const roll = {updateSource(c) { this.changes = c; }};
  await Hooks.callAll("preCreateChatMessage", roll, {speaker: {actor: "a1"}, rolls: [{}]}, {}, "p1");
  assert.equal(roll.changes, undefined);
  // B7267: Jan has no Latin, so the player's "/in Latin" sends nothing and says why
  const warned = [];
  const warn0 = ui.notifications.warn;
  ui.notifications.warn = m => { warned.push(String(m)); };
  let before = mock.log.chat.length;
  let results = await Hooks.callAll("chatMessage", {}, "/in Latin Pax tecum", {speaker: {alias: "Jan"}});
  assert.ok(results.includes(false));
  assert.equal(mock.log.chat.length, before, "nothing is sent");
  assert.match(warned.at(-1) ?? "", /does not speak Latin/);
  ui.notifications.warn = warn0;
  // B7268: Foundry 14's chat box sends HTML; "/in" is read from the text typed
  before = mock.log.chat.length;
  results = await Hooks.callAll("chatMessage", {}, "<p>/in Czech Dobrý <b>večer</b></p>", {speaker: {alias: "Jan"}});
  assert.ok(results.includes(false));
  let made = mock.log.chat.slice(before)[0];
  assert.equal(made?.flags?.[M]?.language, "Czech");
  assert.equal(made.content, "Dobrý večer", "the text typed, with no markup");
  // B7269: Speaking set, a plain line by a character is sent here, in character and in the language
  await game.settings.set(M, "speaking", "German");
  before = mock.log.chat.length;
  results = await Hooks.callAll("chatMessage", {}, "<p>Guten Abend</p>", {speaker: {actor: "a1", alias: "Jan"}});
  assert.ok(results.includes(false));
  made = mock.log.chat.slice(before)[0];
  assert.equal(made?.flags?.[M]?.language, "German");
  assert.equal(made.speaker?.actor, "a1");
  // with no character speaking, the line is Foundry's to send
  before = mock.log.chat.length;
  results = await Hooks.callAll("chatMessage", {}, "<p>out of character</p>", {speaker: {}});
  assert.ok(!results.includes(false));
  assert.equal(mock.log.chat.length, before);
  await game.settings.set(M, "speaking", "");
  mock.asGM();
  // the Storyteller speaks anything
  before = mock.log.chat.length;
  results = await Hooks.callAll("chatMessage", {}, "/in Latin Pax <b>tecum</b>", {speaker: {alias: "Jan"}});
  made = mock.log.chat.slice(before)[0];
  assert.equal(made?.flags?.[M]?.language, "Latin");
  assert.equal(made.content, "Pax tecum", "markup typed into the box does not reach the line");
});
