/**
 * WoDX Creation: two changes of state that keep the character. A mortal dies and rises as a wraith (Wraith 20), or a
 * Sleeper Awakens as a mage (M20). Each makes a new sheet of the line's type from the old one, carries the Traits
 * over by house rule, keeps the old sheet as a record and links the two, as the Embrace and the First Change do.
 */
import {MODULE_ID, esc, lineOf, lineage} from "./actor-data.mjs";
import {setLineage, setChronology, writeLineageJournal, dateLabel} from "./lineage.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {wraithStart, angstFrom, caul, awakenStart, SPHERES} from "./totals-rules.mjs";

const COPY = ["player", "nature", "demeanor", "concept", "appearance", "background", "roleplaytip", "derangement", "notes", "gear", "money", "traits"];
const BG = "wod.types.background";
const n = v => Math.max(0, Math.trunc(Number(v) || 0));

/** Who can die into a wraith or Awaken: a living mortal sheet that has not already changed. */
export function canChange(actor) {
  return lineOf(actor) === "mortal" && !lineage(actor).became;
}

/** d10s: Foundry's dice when there are any, so the rolls show the usual way; else plain random numbers. */
export async function rollD10(count) {
  const k = n(count);
  if ( !k ) return [];
  if ( typeof Roll === "function" ) {
    const r = await new Roll(`${k}d10`).evaluate();
    return r.dice?.[0]?.results?.map(x => x.result) ?? [];
  }
  return Array.from({length: k}, () => 1 + Math.floor(Math.random() * 10));
}

/** The old sheet's bio, Attribute and Ability dots and items, as updates for a new sheet the system has built. */
export function carryOver(src) {
  const up = {};
  for ( const k of COPY ) if ( src.system?.[k] !== undefined ) up[`system.${k}`] = foundry.utils.deepClone(src.system[k]);
  for ( const [k, a] of Object.entries(src.system?.attributes ?? {}) ) if ( a && typeof a === "object" && "value" in a ) up[`system.attributes.${k}.value`] = Number(a.value) || 0;
  for ( const [k, a] of Object.entries(src.system?.abilities ?? {}) ) if ( a && typeof a === "object" && "value" in a ) {
    up[`system.abilities.${k}.value`] = Number(a.value) || 0;
    if ( Number(a.value) > 0 ) up[`system.abilities.${k}.isvisible`] = true;
  }
  const v = src.system?.advantages?.virtues;
  if ( v ) up["system.advantages.virtues"] = foundry.utils.deepClone(v);
  const items = (src.items ?? []).map(i => { const c = {...i}; delete c._id; return c; });
  const flags = foundry.utils.deepClone(src.flags ?? {});
  delete flags[MODULE_ID];
  return {up, items, flags};
}

/** Make the new sheet, carry the old one over, link the two, file the old one and move its tokens. */
async function rebuild(old, {type, updates, extraItems = [], chronologyKey, folderName, folderKind, time, moveTokens}) {
  const src = old.toObject();
  const {up, items, flags} = carryOver(src);
  // Created bare so the system builds the new line's sheet; the rest is applied after
  const made = await Actor.create({name: old.name, type, img: src.img, folder: src.folder ?? null, ownership: src.ownership,
    prototypeToken: src.prototypeToken, flags, system: {settings: {iscreated: false}}});
  await made.update({...up, ...updates, "system.settings.isupdated": false});
  const have = new Set([...(made.items ?? [])].map(i => `${i.type}|${i.name}`.toLowerCase()));
  const all = [...items.filter(i => !have.has(`${i.type}|${i.name}`.toLowerCase())), ...extraItems];
  if ( all.length ) await made.createEmbeddedDocuments("Item", all);

  const before = lineage(old);
  await setLineage(made, {formerly: {id: old.id, name: old.name}, bonds: before.bonds ?? {}});
  await setChronology(made, {[chronologyKey]: time});
  await setLineage(old, {became: {id: made.id, name: made.name}});
  await setChronology(old, {[chronologyKey]: time});
  const folder = game.folders.find(f => f.type === "Actor" && f.name === folderName)
    ?? await Folder.create({name: folderName, type: "Actor", flags: {[MODULE_ID]: {kind: folderKind}}});
  await old.update({folder: folder.id});
  let moved = 0;
  if ( moveTokens ) {
    for ( const scene of game.scenes ?? [] ) {
      const tokens = [...(scene.tokens ?? [])].filter(t => t.actorId === old.id);
      if ( !tokens.length ) continue;
      await scene.updateEmbeddedDocuments("Token", tokens.map(t => ({_id: t.id, actorId: made.id})));
      moved += tokens.length;
    }
  }
  return {made, moved};
}

const whisperTo = actor => game.users.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id);

/* -------------------------------------------- */
/*  Death into a wraith                          */
/* -------------------------------------------- */

const BEFORE_DEATH = "WoDX · Before death";
export const CAUL_WAYS = {crucible: "The Crucible first: the Caul stays until it succeeds", self: "Tears off the Caul alone (1 Willpower, roll Willpower at 4)",
  reaper: "A Reaper guides the way out", harvest: "Harvested: the Caul is torn away", later: "Decide later"};

/**
 * GM: a mortal dies and rises in the Shadowlands. Returns the new Wraith.
 * @param {Actor} mortal
 * @param {object} o
 * @param {number} [o.memoriam]     The wraith's Memoriam Background
 * @param {string} [o.caulWay]      One of CAUL_WAYS
 * @param {number} [o.reaperPool]   The Reaper's Charisma + Empathy, for "reaper"
 * @param {number[]} [o.angstDice]  Dice already rolled for Angst (tests); else they are rolled here
 * @param {number[]} [o.caulDice]
 */
export async function deathToWraith(mortal, {memoriam = 0, caulWay = "crucible", reaperPool = 4, angstDice, caulDice, time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canChange(mortal) ) throw new Error(`${mortal?.name} is not a living mortal`);
  const mortalWP = n(mortal.system?.advantages?.willpower?.permanent);
  const st = wraithStart({willpower: mortalWP, memoriam});
  const aDice = angstDice ?? await rollD10(st.willpower);
  const angst = angstFrom(aDice, st.willpower);
  let leave = null, wp = st.willpower, pathos = st.pathos, cDice = [];
  if ( caulWay === "self" ) { cDice = caulDice ?? await rollD10(st.willpower); leave = caul("self", {dice: cDice}); wp -= 1; pathos += leave.extraPathos; }
  else if ( caulWay === "reaper" ) { cDice = caulDice ?? await rollD10(reaperPool); leave = caul("reaper", {dice: cDice, memoriam}); }
  else if ( caulWay === "harvest" ) leave = caul("harvest");
  const inCaul = !leave?.freed;
  const record = {permanentAngst: angst, angstDice: aDice, caulWay, caul: leave, caulDice: cDice, inCaul, toSpend: st.toSpend, memoriam: n(memoriam)};
  const updates = {
    "system.advantages.corpus": {permanent: st.corpus, temporary: st.corpus, max: 10, roll: 0, label: "wod.advantages.corpus"},
    // Past 10 only from the Caul; the extra lasts until spent
    "system.advantages.pathos": {permanent: st.pathos, temporary: pathos, max: Math.max(10, pathos), roll: 0, label: "wod.advantages.pathos"},
    "system.advantages.angst": {permanent: angst, temporary: 0, max: 10, roll: 0, label: "wod.advantages.angst"},
    "system.advantages.willpower.permanent": st.willpower, "system.advantages.willpower.temporary": wp,
    [`flags.${MODULE_ID}.wraith`]: record
  };
  const extra = n(memoriam) ? [{name: "Memoriam", type: "Feature", system: {type: BG, value: n(memoriam), level: String(n(memoriam))}}] : [];
  const {made: wraith, moved} = await rebuild(mortal, {type: CONFIG.worldofdarkness?.sheettype?.wraith ?? "Wraith", updates, extraItems: extra,
    chronologyKey: "died", folderName: BEFORE_DEATH, folderKind: "before-death", time, moveTokens});
  const caulLine = !leave ? (caulWay === "crucible" ? "The Caul stays on until the Crucible succeeds (Wr20 printed 281)." : "Still in the Caul.")
    : leave.way === "self" ? `Tears at the Caul: ${leave.successes} success${leave.successes === 1 ? "" : "es"} at difficulty 4 (dice ${cDice.join(", ")}).${leave.freed ? ` Free, with ${leave.extraPathos} extra Pathos.` : " The Caul holds."}`
    : leave.way === "reaper" ? `A Reaper rolls at difficulty ${leave.difficulty}: ${leave.successes} success${leave.successes === 1 ? "" : "es"}.${leave.freed ? ` Free. The Reaper gains ${leave.reaperPathos} Pathos.` : " The Caul holds."}`
    : "Harvested: the Caul is torn away.";
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>Death</h3>
      <p><strong>${esc(wraith.name)}</strong> wakes in the Shadowlands, wrapped in a Caul.</p>
      <p>Corpus ${st.corpus}, Pathos ${pathos}, Willpower ${st.willpower}. The Shadow's Angst: ${angst} (dice ${aDice.join(", ")}, difficulty 6, ones do not cancel).</p>
      <p>${esc(caulLine)}</p>
      <p>To spend: Arcanoi 5, Passions 10, Fetters 10, wraith Backgrounds 7. The Shadow: 7 Dark Passion dots and 10 freebies.</p>
      <p class="wodx-quiet">Wr20 pdf 176–180, 295–296, 345–347 / printed 111–115, 230–231, 280–282. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"}, whisper: whisperTo(wraith)
  });
  await writeLineageJournal();
  ui.notifications.info(`${wraith.name} rises as a wraith.${moved ? ` ${moved} token(s) now show the wraith.` : ""}`);
  return wraith;
}

/* -------------------------------------------- */
/*  The Awakening                                */
/* -------------------------------------------- */

const BEFORE_AWAKENING = "WoDX · Before the Awakening";
const sphereLabel = k => k[0].toUpperCase() + k.slice(1);

/** GM: a Sleeper Awakens. Returns the new Mage. */
export async function awaken(mortal, {affinity, paradigm = "", practice = "", instruments = "", time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canChange(mortal) ) throw new Error(`${mortal?.name} is not a Sleeper who can Awaken`);
  const avatarItem = [...(mortal.items ?? [])].find(i => i.type === "Feature" && i.system?.type === BG && /^avatar\b|^genius\b/i.test(i.name));
  const wp = n(mortal.system?.advantages?.willpower?.permanent);
  const st = awakenStart({willpower: wp, avatar: avatarItem?.system?.value, affinity});
  const updates = {
    "system.advantages.arete.permanent": st.arete, "system.advantages.arete.roll": st.arete,
    [`system.spheres.${affinity}.value`]: 1,
    "system.affinity": sphereLabel(affinity),
    "system.quintessence.permanent": st.quintessence, "system.quintessence.temporary": st.quintessence,
    "system.paradox.permanent": 0, "system.paradox.temporary": 0,
    "system.focus": {paradigm, practice, instruments},
    "system.advantages.willpower.permanent": wp, "system.advantages.willpower.temporary": n(mortal.system?.advantages?.willpower?.temporary ?? wp),
    [`flags.${MODULE_ID}.awakening`]: {affinity, willpowerCap: st.willpowerCap, avatarAdded: st.addAvatar}
  };
  const extra = st.addAvatar ? [{name: "Avatar", type: "Feature", system: {type: BG, value: 1, level: "1"}}] : [];
  const {made: mage, moved} = await rebuild(mortal, {type: CONFIG.worldofdarkness?.sheettype?.mage ?? "Mage", updates, extraItems: extra,
    chronologyKey: "awakened", folderName: BEFORE_AWAKENING, folderKind: "before-awakening", time, moveTokens});
  // An Avatar dot the mortal had at 0 is raised to 1
  const av = [...(mage.items ?? [])].find(i => i.type === "Feature" && i.system?.type === BG && /^avatar\b|^genius\b/i.test(i.name));
  if ( av && n(av.system?.value) < 1 ) await av.update({"system.value": 1});
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>The Awakening</h3>
      <p><strong>${esc(mage.name)}</strong> Awakens: Arete 1, ${esc(sphereLabel(affinity))} 1 (Affinity), Avatar ${st.avatar}, Quintessence ${st.quintessence}, Paradox 0.</p>
      ${st.willpowerCap ? `<p>Willpower ${wp} is below Arete, so it caps Sphere ranks and casting dice until it rises.</p>` : ""}
      ${paradigm || practice || instruments ? `<p>Focus: ${esc([paradigm, practice, instruments].filter(Boolean).join("; "))}.</p>` : `<p>Pick a paradigm, a practice and at least seven instruments.</p>`}
      <p>More Spheres and Arete come from experience; each Arete dot needs a Seeking first.</p>
      <p class="wodx-quiet">M20 pdf 258, 329–330 / printed 257, 328–329. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"}, whisper: whisperTo(mage)
  });
  await writeLineageJournal();
  ui.notifications.info(`${mage.name} Awakens.${moved ? ` ${moved} token(s) now show the mage.` : ""}`);
  return mage;
}

/* -------------------------------------------- */
/*  Dialogs                                      */
/* -------------------------------------------- */

const byName = (a, b) => a.name.localeCompare(b.name);
const opts = (rows, sel) => rows.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(l)}</option>`).join("");

function mortalPicker() {
  const mortals = game.actors.filter(canChange).sort(byName);
  const sel = globalThis.canvas?.tokens?.controlled?.[0]?.actor;
  return {mortals, pick: sel && canChange(sel) ? sel : mortals[0]};
}

/** GM: the death dialog. */
export async function deathDialog() {
  if ( !game.user.isGM ) return null;
  const {mortals, pick} = mortalPicker();
  if ( !mortals.length ) return ui.notifications.warn("There is no living mortal to die into a wraith.");
  const result = await foundry.applications.api.DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"], window: {title: "Death into a wraith"}, position: {width: 540},
    content: `
      <p>A mortal dies and rises in the Shadowlands (Wraith 20). A Wraith sheet is made from the mortal's: Attributes,
        Abilities and the life story carry over (house rule), with Corpus 10, Pathos 5 + Memoriam and Willpower 5 or the
        mortal's, if higher. The Shadow's Angst is rolled now. The mortal sheet is kept, in "${BEFORE_DEATH}".</p>
      <div class="form-group"><label>Mortal</label>${searchBox("select[name=mortal]", "Search mortals…", "Search mortals")}<select name="mortal">${opts(mortals.map(a => [a.id, a.name]), pick.id)}</select></div>
      <div class="form-group"><label>Memoriam</label><input type="number" name="memoriam" min="0" max="5" value="0"></div>
      <div class="form-group"><label>Leaving the Caul</label><select name="caulWay" data-fixed>${opts(Object.entries(CAUL_WAYS), "crucible")}</select></div>
      <div class="form-group"><label>The Reaper's Charisma + Empathy</label><input type="number" name="reaperPool" min="1" max="10" value="4"></div>
      <div class="form-group"><label><input type="checkbox" name="moveTokens" checked> Tokens of the mortal become the wraith</label></div>`,
    ok: {label: "Die", callback: (event, button) => {
      const f = button.form.elements;
      return {mortal: f.mortal.value, memoriam: Number(f.memoriam.value), caulWay: f.caulWay.value, reaperPool: Number(f.reaperPool.value), moveTokens: f.moveTokens.checked};
    }},
    rejectClose: false
  });
  if ( !result ) return null;
  return deathToWraith(game.actors.get(result.mortal), result);
}

/** GM: the Awakening dialog. */
export async function awakenDialog() {
  if ( !game.user.isGM ) return null;
  const {mortals, pick} = mortalPicker();
  if ( !mortals.length ) return ui.notifications.warn("There is no Sleeper to Awaken.");
  const result = await foundry.applications.api.DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"], window: {title: "The Awakening"}, position: {width: 540},
    content: `
      <p>A Sleeper Awakens (M20). A Mage sheet is made from the mortal's: Attributes, Abilities and Backgrounds stay
        (house rule), with Arete 1, one dot in the Affinity Sphere, Avatar 1 if there is none, Quintessence equal to
        Avatar and Paradox 0. Willpower stays as it is. The mortal sheet is kept, in "${BEFORE_AWAKENING}".</p>
      <div class="form-group"><label>Sleeper</label>${searchBox("select[name=mortal]", "Search mortals…", "Search mortals")}<select name="mortal">${opts(mortals.map(a => [a.id, a.name]), pick.id)}</select></div>
      <div class="form-group"><label>Affinity Sphere</label><select name="affinity" data-fixed>${opts(SPHERES.map(s => [s, sphereLabel(s)]), "prime")}</select></div>
      <div class="form-group"><label>Paradigm</label><input type="text" name="paradigm"></div>
      <div class="form-group"><label>Practice</label><input type="text" name="practice"></div>
      <div class="form-group"><label>Instruments</label><input type="text" name="instruments" placeholder="Seven at least"></div>
      <div class="form-group"><label><input type="checkbox" name="moveTokens" checked> Tokens of the mortal become the mage</label></div>`,
    ok: {label: "Awaken", callback: (event, button) => {
      const f = button.form.elements;
      return {mortal: f.mortal.value, affinity: f.affinity.value, paradigm: f.paradigm.value.trim(), practice: f.practice.value.trim(),
        instruments: f.instruments.value.trim(), moveTokens: f.moveTokens.checked};
    }},
    rejectClose: false
  });
  if ( !result ) return null;
  return awaken(game.actors.get(result.mortal), result);
}
