/**
 * WoDX gate: every line equal, second pass (B6580-B6589), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateparity2.mjs?${Date.now()}`)).run()
 * Scratch scene and actors only. Moves the clock one day for step 2; the kit puts it back.
 *   1. the inner voice is on every voiced line's menu, and Seduction on the Exalted's
 *   2. a demon and a mummy heal a bashing level when the clock moves a day
 *   3. Seduction from the menu asks for a target; with one, a won seduction charms that person
 *   4. the Veil and the Mists, with witnesses targeted, run the witness step: who keeps it now knows
 *   5. a demon who sees through illusion has the illusion tiles on the map marked as seen through
 *   6. a demon who hears a spoken name, with the speaker targeted, sees the speaker's picture
 *   7. an Echo of levels 1 to 4 holds for the scene: the fae's flag and the Echo condition are set
 * Covers WoDX Actions.
 * Result: Data/wodx-gate/gateparity2-result.json.
 */
import {gate} from "./kit.mjs";

const ACT = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;

const queue = [];
function answer(fill) { queue.push(fill); }
async function onRender(app, el) {
  const f = queue.shift();
  if ( !f ) return;
  const root = el instanceof HTMLElement ? el : el?.[0];
  await sleep(200);
  let res;
  try { res = await f(root, app); } catch (e) { console.warn("gateparity2 answer", e); }
  if ( res === "cancel" ) { app.close(); return; }
  (root.querySelector(`button[data-action="${res ?? "ok"}"]`) ?? root.querySelector("footer button, .form-footer button"))?.click();
}
const set = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  if ( !el ) throw new Error(`no field ${name}`);
  if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value);
  el.dispatchEvent(new Event("change", {bubbles: true}));
};
const target = (toks) => { for ( const t of game.user.targets ) t.setTarget(false, {releaseOthers: false}); for ( const t of toks ) t.object?.setTarget?.(true, {releaseOthers: false}) ?? t.setTarget?.(true, {releaseOthers: false}); };

export async function run() {
  const G = gate("gateparity2");
  const A = () => game.modules.get(ACT).api;
  const hook = Hooks.on("renderDialogV2", onRender);
  const before = {heal: game.settings.get(ACT, "naturalHealing")};
  try {
    await game.settings.set(ACT, "naturalHealing", true);
    const scene = await G.scene({activate: true});
    const five = {value: 5};
    const sharp = {strength: five, dexterity: five, stamina: five, charisma: five, manipulation: five, appearance: five, perception: five, intelligence: five, wits: five};
    const [dem, mum, vamp, mort, mort2, fae, speaker] = await G.make(Actor, [
      {name: "Gate Parity Demon", type: "Demon", system: {settings: {hastorment: true}, attributes: sharp}},
      {name: "Gate Parity Mummy", type: "Mummy"},
      {name: "Gate Parity Vampire", type: "Vampire", system: {attributes: sharp}},
      {name: "Gate Parity Mortal", type: "Mortal", system: {attributes: {wits: {value: 1}, intelligence: {value: 1}, perception: {value: 1}}}},
      {name: "Gate Parity Mortal Two", type: "Mortal"},
      {name: "Gate Parity Fae", type: "Changeling"},
      {name: "Gate Parity Speaker", type: "Mortal"}
    ]);
    // Willpower, Faith and damage after creation (the system's create step zeroes Willpower)
    await dem.update({"system.advantages.faith.permanent": 5, "system.advantages.faith.temporary": 5, "system.health.damage.bashing": 1});
    await mum.update({"system.health.damage.bashing": 1});
    await mort.update({"system.advantages.willpower.permanent": 8, "system.advantages.willpower.temporary": 8});
    await mort2.update({"system.advantages.willpower.permanent": 3, "system.advantages.willpower.temporary": 3});
    await fae.setFlag(ACT, "daFae", {system: "da", origin: "changeling"});
    await sleep(300);
    // linked tokens, so healing and what a witness keeps land on the actors this gate reads (an unlinked token heals itself)
    const toks = await G.tokens(scene, [{actor: dem, x: 2, y: 2}, {actor: mum, x: 4, y: 2}, {actor: vamp, x: 6, y: 2}, {actor: mort, x: 8, y: 2}, {actor: mort2, x: 10, y: 2}, {actor: fae, x: 12, y: 2}, {actor: speaker, x: 14, y: 2}]
      .map(o => ({...o, actorLink: true})));
    const tok = d => canvas.tokens.get(d.id) ?? d;
    const [tDem, tMum, tVamp, tMort, tMort2, tFae, tSpk] = toks;

    await G.step("1. the inner voice is on every voiced line, Seduction on the Exalted", async () => {
      const PM = await import(`/modules/wodx-actions/scripts/profile-menus.js?${Date.now()}`);
      const keys = k => PM.MENUS[k].sections.flatMap(([, b]) => b.map(([x]) => x));
      const miss = PM.VOICED.filter(k => !keys(k).includes("api:innerVoice"));
      G.ok("1. the inner voice is on every voiced line, Seduction on the Exalted", !miss.length && PM.VOICED.length >= 12 && keys("exalted").includes("api:seduction"), {miss, voiced: PM.VOICED.length});
    });

    await G.step("2. a demon and a mummy heal with the clock", async () => {
      // the heal clock counts from its last tick; an earlier gate that put the clock back leaves it ahead of now
      await game.settings.set(ACT, "healClock", game.time.worldTime);
      await game.time.advance(DAY);
      await sleep(2500);
      const d = Number(dem.system.health?.damage?.bashing ?? 0), m = Number(mum.system.health?.damage?.bashing ?? 0);
      G.ok("2. a demon and a mummy heal with the clock", d === 0 && m === 0, {demon: d, mummy: m});
    });

    await G.step("3. Seduction asks for a target, and a won one charms that person", async () => {
      target([]);
      const none = await A().seduction({actor: vamp});
      target([tok(tMort)]);
      let sways = [], charmed = false;
      for ( let k = 0; k < 3 && !charmed; k++ ) {
        answer(() => "ok");
        answer(() => "cancel"); // the Siren's "Feed now?" after a won seduction
        await A().seduction({actor: vamp, shift: -10});
        await sleep(1500);
        queue.length = 0; // a lost seduction asks nothing more
        sways = vamp.getFlag(ACT, "sways") ?? [];
        charmed = (Array.isArray(sways) ? sways : Object.values(sways)).some(s => s?.npc === mort.id && s?.kind === "charmed");
      }
      G.ok("3. Seduction asks for a target, and a won one charms that person", none === null && charmed, {none, sways});
    });

    await G.step("4. the Veil and the Mists run the witness step on targeted witnesses", async () => {
      const P = await import(`/modules/wodx-actions/scripts/profiles.js?${Date.now()}`);
      target([tok(tMort), tok(tMort2)]);
      const veil = await A().mummyVeil({actor: mum});
      await sleep(800);
      const knows = a => { const k = P.worldFlag(a, "knows"); return k === "*" || (Array.isArray(k) && k.includes("mummy")); };
      target([tok(tMort2)]);
      const mists = await A().c20Mists({actor: fae});
      await sleep(500);
      G.ok("4. the Veil and the Mists run the witness step on targeted witnesses", knows(mort) && !knows(mort2) && (mists?.rows?.length ?? 0) === 1,
        {strongKnows: knows(mort), weakKnows: knows(mort2), veilRows: veil?.rows?.length ?? null, mistsRows: mists?.rows?.length ?? null});
    });

    await G.step("5. seeing through illusion marks the illusions on the map", async () => {
      const [tile] = await scene.createEmbeddedDocuments("Tile", [{texture: {src: "icons/svg/mystery-man.svg"}, x: 300, y: 600, width: 100, height: 100,
        flags: {[ACT]: {illusion: {by: "gate", power: "Illusion"}}}}]);
      target([]);
      let seen = false;
      for ( let k = 0; k < 4 && !seen; k++ ) {
        answer(root => { set(root, "f", 2); set(root, "t", 0); return "ok"; });
        await A().demonIllusion({actor: dem});
        await sleep(800);
        seen = (dem.getFlag(ACT, "seenThrough") ?? []).includes(tile.id);
      }
      G.ok("5. seeing through illusion marks the illusions on the map", seen, {flag: dem.getFlag(ACT, "seenThrough")});
    });

    await G.step("6. hearing a spoken name shows the speaker", async () => {
      target([tok(tSpk)]);
      let shown = false;
      for ( let k = 0; k < 4 && !shown; k++ ) {
        answer(root => { set(root, "k", 6); return "ok"; });
        await A().demonName({actor: dem});
        await sleep(1200);
        const pops = [...(foundry.applications.instances?.values?.() ?? [])].filter(a => /ImagePopout/.test(a.constructor?.name ?? ""));
        shown = pops.some(p => String(p.title ?? p.options?.window?.title ?? "").includes(speaker.name));
        for ( const p of pops ) await p.close();
      }
      G.ok("6. hearing a spoken name shows the speaker", shown, {});
    });

    await G.step("7. an Echo of levels 1 to 4 holds for the scene", async () => {
      target([]);
      let level = 0, flag = null, cond = false;
      for ( let k = 0; k < 6; k++ ) {
        answer(root => { set(root, "who", "mortal"); set(root, "will", 10); return "ok"; });
        const before = game.messages.size;
        await A().daEcho({actor: fae});
        await sleep(1000);
        const msg = game.messages.contents.slice(before).find(m => m.getFlag(ACT, "daFaeEcho"));
        level = msg?.getFlag(ACT, "daFaeEcho")?.level ?? 0;
        if ( level >= 1 && level <= 4 ) {
          flag = fae.getFlag(ACT, "daFae")?.echoHold ?? null;
          cond = fae.effects.some(e => e.flags?.["wodx-chronicle"]?.timed?.key === "wodx-fae-echo");
          break;
        }
      }
      G.ok("7. an Echo of levels 1 to 4 holds for the scene", level >= 1 && level <= 4 && flag?.level === level && cond, {level, flag, cond});
    });
  } finally {
    Hooks.off("renderDialogV2", hook);
    target([]);
    await game.settings.set(ACT, "naturalHealing", before.heal);
    return G.finish();
  }
}
