/**
 * Gate: languages in chat, typed into the chat box and read in two browsers (Master Plan gap items, B7265-B7271), in
 * rothenstein-wodx only. gatedisplayb posts its line with ChatMessage.create; here each line is typed into Foundry's
 * own chat box and sent with Enter, and the player reads it in their own chat log.
 *   node tools/harness/gate-two.mjs gateplaylang [--url https://localhost:30000]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup" (Gamemaster Test): makes the Player Test user if missing, a scene with a priest who speaks Latin and
 *           Polish, and a player character who speaks Czech only (the Player Test user's character), then:
 *     1. Speaking set to Latin above the chat box, a line typed and sent with Enter: it goes out in Latin, spoken by
 *        the priest, and the Storyteller reads it as written, marked "In Latin"
 *     2. "/in Polish ..." typed and sent: one line in Polish, whatever Speaking is set to
 *   "player" (Player Test):
 *     3. the Latin line in the player's chat log is made-up words, marked as a language their character does not
 *        speak, with no roll for the gist (Latin is no kin to Czech)
 *     4. the Polish line offers "Try for the gist" through Czech; pressing it rolls Intelligence + Linguistics or
 *        Academics in a whispered card, and the line then reads as written on a success or stays scrambled on a failure
 *     5. Speaking set to Czech in the player's own chat box, a line typed and sent: it goes out in Czech, spoken by
 *        their character
 *     6. "/in Latin ..." typed by the player, whose character has no Latin: nothing is sent, and a warning says why
 *     7. Speaking set to Latin by the player is not kept, and a warning says why
 *   "finish" (Gamemaster Test):
 *     8. the Czech line reads as written for the Storyteller, marked "In Czech"
 *     9. put back: the settings, the user's character, the scene, the characters and every chat line the gate made
 * Result: Data/wodx-gate/gateplaylang-result.json. The clock never moves.
 */
const CH = "wodx-chronicle";
const TAG = "Gate speech";
const PLAYER = "Player Test";
const LATIN = "Pax tecum viator", POLISH = "Dzien dobry sasiedzie", CZECH = "Dobry vecer pane", NOLATIN = "Gratias tibi ago";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(100); } try { return !!(await fn()); } catch (e) { return false; } }
const lang = m => m?.flags?.[CH]?.language ?? null;
const plain = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const find = (text, since) => game.messages.contents.filter(m => m.id && !since.has(m.id) && plain(m).includes(text));
/** The line as this client's own chat log shows it. */
const shown = id => {
  const all = [...document.querySelectorAll(`[data-message-id="${id}"]`)].filter(e => e.matches(".chat-message, .message, li"));
  return all.find(e => !e.closest("[inert]") && e.offsetParent !== null) ?? all.find(e => !e.closest("[inert]")) ?? all[0] ?? null;
};
const copies = id => [...document.querySelectorAll(`[data-message-id="${id}"]`)].map(e => `${e.tagName}.${[...e.classList].join(".")}${e.closest("[inert]") ? "[inert]" : ""}${e.offsetParent === null ? "[hidden]" : ""} in ${e.parentElement?.closest("[id]")?.id ?? "?"}`);

/** Speaking, set the way a person sets it: the text box above the chat box, then its change event. */
async function setSpeaking(value) {
  const input = document.querySelector(".wodx-speaking input[name=wodxSpeaking]");
  if ( !input ) throw new Error("no Speaking box above the chat box");
  input.value = value;
  input.dispatchEvent(new Event("change", {bubbles: true}));
  await sleep(400);
  return input;
}

/** Types a line into Foundry's chat box and presses Enter, as a person does. */
async function typeAndSend(text) {
  const box = document.querySelector("#chat-message");
  const editable = box?.querySelector?.("[contenteditable=true]") ?? (box?.isContentEditable ? box : null);
  if ( !editable ) throw new Error("no chat box to type in");
  editable.focus();
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, text);
  await sleep(200);
  editable.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", code: "Enter", keyCode: 13, bubbles: true, cancelable: true}));
  await sleep(800);
}

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

/* ---------------- Storyteller side ---------------- */

async function setup() {
  const R = {steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const since = new Set(game.messages.map(m => m.id));
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  const ids = {user: user.id, msgs: [...since], back: canvas.scene?.id ?? null,
    keep: {langs: game.settings.get(CH, "languagesInChat"), speaking: game.settings.get(CH, "speaking"), character: user.character?.id ?? null}};
  await game.settings.set(CH, "languagesInChat", true);
  const scene = await Scene.create({name: `${TAG} scene`, width: 1500, height: 1000, padding: 0, grid: {type: 1, size: 100}, tokenVision: false, navigation: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}});
  ids.scene = scene.id;
  await scene.view();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 15000);
  const made = await Actor.create([
    {name: `${TAG} priest`, type: "Mortal", flags: {[CH]: {languages: ["Latin", "Polish"]}}},
    {name: `${TAG} PC`, type: "Mortal", ownership: {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER},
      flags: {[CH]: {languages: ["Czech"]}}, system: {attributes: {intelligence: {value: 3}}, abilities: {academics: {value: 2}}}}]);
  const priest = made.find(a => a.name === `${TAG} priest`), pc = made.find(a => a.name === `${TAG} PC`);
  ids.priest = priest.id; ids.pc = pc.id;
  await user.update({character: pc.id});
  const [tok] = await scene.createEmbeddedDocuments("Token", [{name: "priest", actorId: priest.id, actorLink: true, x: 300, y: 300}]);
  await until(() => tok.object, 10000);
  tok.object?.control?.({releaseOthers: true});
  await sleep(300);

  await step("1. the Storyteller speaks Latin from the chat box", async () => {
    await setSpeaking("Latin");
    await typeAndSend(LATIN);
    await until(() => find(LATIN, since).length, 10000);
    const [m] = find(LATIN, since);
    ids.latin = m?.id ?? null;
    await until(() => shown(m?.id)?.querySelector(".wodx-language"), 8000);
    const tag = shown(m?.id)?.querySelector(".wodx-language")?.textContent ?? "";
    const text = shown(m?.id)?.querySelector(".message-content")?.textContent ?? "";
    ok("1. the Storyteller speaks Latin from the chat box", game.settings.get(CH, "speaking") === "Latin" && lang(m) === "Latin" && m?.speaker?.actor === priest.id
      && /^In Latin$/.test(tag.trim()) && text.includes(LATIN), {language: lang(m), speaker: m?.speaker?.alias ?? null, tag, sent: !!m});
  });

  await step("2. /in Polish", async () => {
    await typeAndSend(`/in Polish ${POLISH}`);
    await until(() => find(POLISH, since).length, 10000);
    const list = find(POLISH, since);
    ids.polish = list[0]?.id ?? null;
    ok("2. /in Polish", list.length === 1 && lang(list[0]) === "Polish" && !plain(list[0]).includes("/in"), {count: list.length, language: lang(list[0]), text: plain(list[0]).slice(0, 60)});
  });
  await game.settings.set(CH, "speaking", ids.keep.speaking ?? "");
  ids.setupSteps = R.steps;
  return ids;
}

async function finish(ids, playerSteps = []) {
  const R = {gate: "gateplaylang", started: new Date().toISOString(), world: game.world.id, steps: [...(ids?.setupSteps ?? []), ...playerSteps], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( !ids || ids.error ) { ok("setup", false, {error: ids?.error ?? "no setup"}); return save(R); }
  ids.czech = playerSteps.find(s => /^5\./.test(s.name))?.id ?? null;
  try {
    const m = ids.czech && game.messages.get(ids.czech);
    if ( m ) await ui.chat?.updateMessage?.(m);
    await until(() => shown(ids.czech)?.querySelector(".wodx-language"), 8000);
    const tag = shown(ids.czech)?.querySelector(".wodx-language")?.textContent ?? "";
    const text = shown(ids.czech)?.querySelector(".message-content")?.textContent ?? "";
    ok("8. the Storyteller reads the Czech line", !!m && lang(m) === "Czech" && /^In Czech$/.test(tag.trim()) && text.includes(CZECH), {tag, sent: !!m});
  } catch (e) { ok("8. the Storyteller reads the Czech line", false, {error: e.message}); }
  try {
    const keep = ids.keep ?? {};
    await game.settings.set(CH, "languagesInChat", keep.langs ?? true);
    await game.settings.set(CH, "speaking", keep.speaking ?? "");
    const user = game.users.get(ids.user);
    if ( user ) await user.update({character: keep.character && game.actors.get(keep.character) ? keep.character : null});
    const before = new Set(ids.msgs ?? []);
    const mine = game.messages.filter(x => !before.has(x.id)).map(x => x.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    const back = ids.back && game.scenes.get(ids.back);
    if ( back ) await back.view();
    await game.scenes.get(ids.scene)?.delete();
    const actors = [ids.priest, ids.pc].filter(id => game.actors.get(id));
    if ( actors.length ) await Actor.deleteDocuments(actors);
    ok("9. put back", !game.scenes.get(ids.scene) && ![ids.priest, ids.pc].some(id => game.actors.get(id)) && game.settings.get(CH, "languagesInChat") === (keep.langs ?? true)
      && (game.users.get(ids.user)?.character?.id ?? null) === (keep.character && game.actors.get(keep.character) ? keep.character : null));
  } catch (e) { ok("9. put back", false, {error: e.message}); }
  return save(R);
}

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const bad = R.steps.filter(s => !s.pass).map(({name, pass, ...d}) => `${name} ${JSON.stringify(d).slice(0, 160)}`);
  if ( bad.length ) R.summary += `; failed: ${bad.join("; ")}`.slice(0, 400);
  const file = new File([JSON.stringify(R, null, 1)], "gateplaylang-result.json", {type: "application/json"});
  try { await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false}); } catch (e) { R.errors.push(`save: ${e.message}`); }
  return R.summary;
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  const since = new Set(ids?.msgs ?? []);
  const errors = [];
  const ce = console.error;
  console.error = (...a) => { errors.push(a.map(x => String(x?.message ?? x)).join(" ").slice(0, 300)); return ce(...a); };
  const onErr = e => errors.push(String(e?.reason?.message ?? e?.message ?? e).slice(0, 300));
  window.addEventListener("unhandledrejection", onErr); window.addEventListener("error", onErr);
  const warned = [];
  const wrap = ui.notifications.warn.bind(ui.notifications);
  ui.notifications.warn = (msg, o) => { warned.push(String(msg)); return wrap(msg, o); };
  try {
    await step("3. the Latin line, to a Czech speaker", async () => {
      await until(() => shown(ids.latin)?.querySelector(".wodx-language"), 15000);
      const el = shown(ids.latin);
      const tag = el?.querySelector(".wodx-language")?.textContent ?? "";
      const text = el?.querySelector(".message-content")?.textContent ?? "";
      ok("3. the Latin line, to a Czech speaker", /In Latin, which your character does not speak/.test(tag) && !text.includes("Pax tecum") && !el?.querySelector(".wodx-gist"), {tag, text: text.slice(0, 80)});
    });

    await step("4. Try for the gist of the Polish", async () => {
      await until(() => shown(ids.polish)?.querySelector(".wodx-gist"), 15000);
      const btn = shown(ids.polish)?.querySelector(".wodx-gist");
      const label = btn?.textContent ?? "";
      const n0 = game.messages.size;
      const seen = [];
      const cap = e => seen.push(`capture:${e.target?.className}`), bub = e => seen.push(`bubble:${e.target?.className}`);
      document.addEventListener("click", cap, true); document.addEventListener("click", bub);
      btn?.click();
      setTimeout(() => { document.removeEventListener("click", cap, true); document.removeEventListener("click", bub); }, 500);
      await until(() => game.messages.contents.some(m => !since.has(m.id) && /listens for the Polish/.test(m.content ?? "")), 45000);
      const card = game.messages.contents.find(m => /listens for the Polish/.test(m.content ?? "") && !since.has(m.id));
      await sleep(1000);
      const got = /The gist comes through/.test(card?.content ?? "");
      const text = shown(ids.polish)?.querySelector(".message-content")?.textContent ?? "";
      ok("4. Try for the gist of the Polish", /Try for the gist/.test(label) && /Czech/.test(label) && !!card && (card.whisper?.length ?? 0) > 0
        && (got ? text.includes(POLISH) : !text.includes(POLISH)) && !shown(ids.polish)?.querySelector(".wodx-gist"),
        {label, card: !!card, gist: got, reads: text.includes(POLISH), more: game.messages.size - n0, errors: errors.slice(-3), attached: btn?.isConnected ?? null, copies: copies(ids.polish), seen, windows: [...(foundry.applications.instances?.values?.() ?? [])].filter(a => a.rendered).map(a => a.constructor.name + ':' + (a.title ?? '')).slice(-6), user: game.user.name, data: btn ? {...btn.dataset} : null});
    });

    await step("5. the player speaks Czech from the chat box", async () => {
      await setSpeaking("Czech");
      await typeAndSend(CZECH);
      await until(() => find(CZECH, since).length, 10000);
      const [m] = find(CZECH, since);
      // the speaker is the player's own character: the token they control on the scene, or the character assigned
      const own = game.actors.get(m?.speaker?.actor)?.testUserPermission?.(game.user, "OWNER");
      ok("5. the player speaks Czech from the chat box", lang(m) === "Czech" && !!own && (m?.author?.id ?? m?.author) === game.user.id,
        {language: lang(m), speaker: m?.speaker?.alias ?? null, sent: !!m, id: m?.id ?? null});
    });

    await step("6. /in Latin, with no Latin", async () => {
      const w0 = warned.length;
      await typeAndSend(`/in Latin ${NOLATIN}`);
      await sleep(1500);
      const sent = find(NOLATIN, since);
      ok("6. /in Latin, with no Latin", sent.length === 0 && warned.slice(w0).some(w => /Latin/.test(w)), {sent: sent.length, warning: warned.slice(w0)[0] ?? null});
      // a refused line stays in the box; clear it so nothing is sent later
      document.querySelector("#chat-message [contenteditable=true]")?.focus();
      document.execCommand("selectAll", false); document.execCommand("delete", false);
    });

    await step("7. Speaking Latin, with no Latin", async () => {
      const w0 = warned.length;
      const input = await setSpeaking("Latin");
      await sleep(600);
      ok("7. Speaking Latin, with no Latin", game.settings.get(CH, "speaking") !== "Latin" && input.value !== "Latin" && warned.slice(w0).some(w => /Latin/.test(w)),
        {speaking: game.settings.get(CH, "speaking"), box: input.value, warning: warned.slice(w0)[0] ?? null});
    });
    await game.settings.set(CH, "speaking", "");
  } finally {
    ui.notifications.warn = wrap; console.error = ce;
    window.removeEventListener("unhandledrejection", onErr); window.removeEventListener("error", onErr);
  }
  return steps;
}
