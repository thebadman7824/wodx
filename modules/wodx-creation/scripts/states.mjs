/**
 * WoDX Creation: changes of state that keep the character. A mortal dies and rises as a wraith (Wraith 20), a Sleeper
 * Awakens as a mage (M20), a revenant's blood shows (V20 Ghouls and Revenants, on the same sheet), a fae soul wakes in
 * the Chrysalis (C20), a Fallen takes a host (Demon: The Fallen), or the dead rise with the Second Breath (Kindred of
 * the East). Each makes a new sheet of the line's type from the old one, carries the Traits
 * over by house rule, keeps the old sheet as a record and links the two, as the Embrace and the First Change do.
 */
import {MODULE_ID, esc, lineOf, lineage, disciplineItem, disciplinesOf} from "./actor-data.mjs";
import {setLineage, setChronology, writeLineageJournal, dateLabel} from "./lineage.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {wraithStart, angstFrom, caul, awakenStart, SPHERES} from "./totals-rules.mjs";
import * as SR from "./states-rules.mjs";
import {GHOUL} from "../data/vampire.mjs";

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

/* -------------------------------------------- */
/*  Revenant birth (0.9.0)                       */
/* -------------------------------------------- */

/** Who can be marked a revenant: a living mortal sheet that is not yet a ghoul or revenant. */
export const canBeRevenant = actor => canChange(actor) && !actor.getFlag?.(MODULE_ID, "revenant");

/**
 * GM: a mortal of a revenant family, born with the family's vitae (G&R): on the same Mortal sheet, as a ghoul's,
 * with Potence 1 and a family Discipline (or two family Disciplines), a pool of 10 that starts at 1 and is made
 * back at 1 a night, and the family's weakness noted.
 */
export async function revenantBirth(mortal, {family, way = "standard", picks = [], time = game.time.worldTime} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canBeRevenant(mortal) ) throw new Error(`${mortal?.name} is not a mortal who can be a revenant`);
  const st = SR.revenantStart({family, way, picks});
  if ( !st.family ) throw new Error("Pick a revenant family");
  await mortal.update({
    "system.settings.variant": "ghoul",
    "system.settings.haspath": true, "system.settings.hasbloodpool": true, "system.settings.hasvirtue": true,
    "system.settings.powers.hasdisciplines": true,
    "system.settings.variantsheet": CONFIG.worldofdarkness?.sheettype?.vampire ?? "Vampire",
    "system.advantages.bloodpool.max": st.blood.max, "system.advantages.bloodpool.perturn": GHOUL.perTurn,
    "system.advantages.bloodpool.temporary": st.blood.start,
    [`flags.${MODULE_ID}.revenant`]: {family, way, disciplines: st.disciplines, perNight: st.blood.perNight, weakness: st.family.weakness}
  });
  const have = new Map(disciplinesOf(mortal).map(d => [d.name.toLowerCase(), d]));
  const add = [];
  for ( const [k, v] of Object.entries(st.disciplines) ) {
    const name = SR.DISC_LABEL(k), old = have.get(name.toLowerCase());
    if ( old ) { if ( old.value < v ) await mortal.items.get(old.id).update({"system.value": v, "system.level": v}); }
    else add.push(disciplineItem(name, v));
  }
  if ( add.length ) await mortal.createEmbeddedDocuments("Item", add);
  await setLineage(mortal, {family: {key: family, name: st.family.label}});
  await setChronology(mortal, {revenant: time});
  const discs = Object.entries(st.disciplines).map(([k, v]) => `${SR.DISC_LABEL(k)} ${v}`).join(", ");
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>A revenant</h3>
      <p><strong>${esc(mortal.name)}</strong> of the ${esc(st.family.label)} carries the family's vitae: ${esc(discs)}. Blood pool 10, starting at 1 and made back at 1 a night.</p>
      <p>The family's weakness: ${esc(st.family.weakness)}</p>
      <p>Revenants use only the first power of a Discipline, unless the Storyteller uses the optional table by the sponsor's Generation. Family Disciplines cost current × 15 experience, others current × 25, a new one 20.</p>
      <p class="wodx-quiet">V20 Ghouls and Revenants pdf 117, 120–122, 141 / printed 116, 119–121, 140; the family ${esc(st.family.page)}. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"}, whisper: whisperTo(mortal)
  });
  await writeLineageJournal();
  return mortal;
}

/* -------------------------------------------- */
/*  The Chrysalis (0.9.0)                        */
/* -------------------------------------------- */

const BEFORE_CHRYSALIS = "WoDX · Before the Chrysalis";

/** GM: a fae soul wakes in a mortal (C20). Returns the new Changeling. */
export async function chrysalis(mortal, {kith = "", seeming = "childling", wilder = "glamour", court = "", time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canChange(mortal) ) throw new Error(`${mortal?.name} is not a mortal who can pass through the Chrysalis`);
  const st = SR.chrysalisStart({willpower: mortal.system?.advantages?.willpower?.permanent, seeming, wilder});
  const updates = {
    "system.kith": String(kith).trim(), "system.seeming": SR.SEEMINGS[st.seeming], "system.court": String(court).trim(),
    "system.advantages.willpower.permanent": st.willpower, "system.advantages.willpower.temporary": st.willpower,
    "system.advantages.glamour.permanent": st.glamour, "system.advantages.glamour.temporary": st.glamour,
    "system.advantages.banality.permanent": st.banality, "system.advantages.banality.temporary": st.banality,
    [`flags.${MODULE_ID}.chrysalis`]: {seeming: st.seeming, toSpend: {arts: st.arts, realms: st.realms}}
  };
  const {made, moved} = await rebuild(mortal, {type: CONFIG.worldofdarkness?.sheettype?.changeling ?? "Changeling", updates,
    chronologyKey: "chrysalis", folderName: BEFORE_CHRYSALIS, folderKind: "before-chrysalis", time, moveTokens});
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>The Chrysalis</h3>
      <p><strong>${esc(made.name)}</strong> wakes to the Dreaming${kith ? `, a ${esc(kith)}` : ""}, ${esc(SR.SEEMINGS[st.seeming].toLowerCase())}: Glamour ${st.glamour}, Banality ${st.banality}, Willpower ${st.willpower}.</p>
      <p>To spend: Arts 3 and Realms 5. The kith's Birthrights and Frailty apply from now; a Birthright may take a Trait past 5.</p>
      <p>Fosterage follows, and the Saining, usually a year and a day after.</p>
      <p class="wodx-quiet">C20 pdf 43–44, 47, 145, 149 / printed 42–43, 46, 144, 148. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"}, whisper: whisperTo(made)
  });
  await writeLineageJournal();
  ui.notifications.info(`${made.name} passes through the Chrysalis.${moved ? ` ${moved} token(s) now show the changeling.` : ""}`);
  return made;
}

/* -------------------------------------------- */
/*  A Fallen taking a host (0.9.0)               */
/* -------------------------------------------- */

const THE_HOST = "WoDX · The host before the Fall";

/** GM: a Fallen claws out of the Abyss into a mortal host (DtF). Returns the new Demon. */
export async function fallenHost(mortal, {house = "devils", celestial = "", nature = "", time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canChange(mortal) ) throw new Error(`${mortal?.name} is not a living mortal`);
  const v = mortal.system?.advantages?.virtues ?? {};
  const st = SR.fallenStart({house, conscience: v.conscience?.permanent, courage: v.courage?.permanent});
  const vt = (k, x) => ({[`system.advantages.virtues.${k}.permanent`]: x, [`system.advantages.virtues.${k}.temporary`]: x});
  const updates = {
    "system.house": st.house.label,
    "system.advantages.faith.permanent": st.faith, "system.advantages.faith.temporary": st.faith,
    "system.advantages.torment.permanent": st.torment, "system.advantages.torment.temporary": 0,
    // Demon keeps Conviction where the sheet keeps Self-Control, as WoDX Actions reads it
    ...vt("conscience", st.virtues.conscience), ...vt("selfcontrol", st.virtues.conviction), ...vt("courage", st.virtues.courage),
    "system.advantages.willpower.permanent": st.willpower, "system.advantages.willpower.temporary": st.willpower,
    ...(nature ? {"system.nature": String(nature).trim()} : {}),
    [`flags.${MODULE_ID}.fallen`]: {house, celestial: String(celestial).trim(), toSpend: st.toSpend, host: mortal.name}
  };
  const {made, moved} = await rebuild(mortal, {type: CONFIG.worldofdarkness?.sheettype?.demon ?? "Demon", updates,
    chronologyKey: "fallen", folderName: THE_HOST, folderKind: "the-host", time, moveTokens});
  // The demon keeps the host's Virtues from rebuild's copy only where fallenStart allowed them
  await made.update(Object.fromEntries(Object.entries(updates).filter(([k]) => k.startsWith("system.advantages.virtues"))));
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>The Fallen</h3>
      <p>${celestial ? `<strong>${esc(celestial)}</strong>, of the ${esc(st.house.label)}, ` : `A demon of the ${esc(st.house.label)} `}takes the body of <strong>${esc(mortal.name)}</strong>: Faith 3, Torment ${st.torment}.</p>
      <p>Virtues: Conscience ${st.virtues.conscience}, Conviction ${st.virtues.conviction}, Courage ${st.virtues.courage}, before the 3 dots to spend; Willpower is the two highest added (now ${st.willpower}).</p>
      <p>To spend: Lore 3 (the House lores are ${esc(st.house.lores.join(", "))}). The host's memories keep its Attributes, Abilities and Backgrounds; the player says which Abilities are the demon's own. The Nature is the demon's; the Demeanor is what is left of the host.</p>
      <p class="wodx-quiet">Demon: The Fallen pdf 125–129 / printed 124–128; the House ${esc(st.house.page)}. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"}, whisper: whisperTo(made)
  });
  await writeLineageJournal();
  ui.notifications.info(`${made.name} is a Fallen now.${moved ? ` ${moved} token(s) now show the demon.` : ""}`);
  return made;
}

/** GM: a Fallen without a host tries to take a new body (DtF pdf 260 / printed 259). Posts the roll; the sheet is rebuilt by hand. */
export async function possess(demon, {target = "ordinary", dice} = {}) {
  if ( !game.user.isGM || !demon ) return null;
  const wp = n(demon.system?.advantages?.willpower?.temporary ?? demon.system?.advantages?.willpower?.permanent);
  const T = SR.HOST_TARGETS[target] ?? SR.HOST_TARGETS.ordinary;
  const d = T.diff === null ? [] : (dice ?? await rollD10(wp));
  const r = SR.possession(target, d);
  const line = T.diff === null ? "A willing thrall: no roll." : `Willpower ${wp} at difficulty ${r.diff}: ${d.join(", ")}, ${r.successes} success${r.successes === 1 ? "" : "es"}.`;
  const what = r.taken ? (target === "object" || target === "attuned" ? "The demon sinks into the object." : "The demon takes the new body. Rebuild the sheet with the player, adding experience equal to what the demon has earned.")
    : r.botch && (target === "object" || target === "attuned") ? "A botch: 1 permanent Willpower lost, and that object is barred for good."
    : (target === "object" || target === "attuned") ? "It fails: that object is barred for good." : "It fails. Each turn without a host costs a Willpower roll at 6, or the Abyss takes it back.";
  await ChatMessage.create({content: `<div class="wodx-card wodx-embrace"><h3>${esc(demon.name)} seeks a host</h3><p>${esc(T.label)}. ${esc(line)}</p><p><b>${esc(what)}</b></p>
    <p class="wodx-quiet">Demon: The Fallen pdf 260 / printed 259.</p></div>`, speaker: {alias: "Chronicle"}, whisper: whisperTo(demon)});
  if ( r.taken ) await setChronology(demon, {newHost: game.time.worldTime});
  return r;
}

/* -------------------------------------------- */
/*  The Second Breath (0.9.0)                    */
/* -------------------------------------------- */

const BEFORE_BREATH = "WoDX · Before the Second Breath";

/** GM: a dead mortal's souls rejoin and the body rises as a Kuei-jin (KotE). Returns the new Vampire sheet set to Kindred of the East. */
export async function secondBreath(mortal, {direction = "", chihMei = false, time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canChange(mortal) ) throw new Error(`${mortal?.name} is not a mortal`);
  const st = SR.secondBreathStart({willpower: mortal.system?.advantages?.willpower?.permanent});
  const pair = (k, x) => ({[`system.advantages.${k}.permanent`]: x, [`system.advantages.${k}.temporary`]: x});
  const updates = {
    "system.settings.variant": "kindredeast",
    ...pair("yin", st.yin), ...pair("yang", st.yang), ...pair("hun", st.hun), ...pair("po", st.po), ...pair("dharma", st.dharma),
    "system.advantages.yinchi.temporary": st.chi.yin, "system.advantages.yinchi.permanent": st.yin,
    "system.advantages.yangchi.temporary": st.chi.yang, "system.advantages.yangchi.permanent": st.yang,
    "system.advantages.willpower.permanent": st.willpower, "system.advantages.willpower.temporary": st.willpower,
    ...(direction ? {"system.direction": String(direction).trim()} : {}),
    [`flags.${MODULE_ID}.secondBreath`]: {chihMei: !!chihMei, toSpend: st.toSpend, willpowerMost: st.willpowerMost}
  };
  const {made, moved} = await rebuild(mortal, {type: CONFIG.worldofdarkness?.sheettype?.vampire ?? "Vampire", updates,
    chronologyKey: "secondBreath", folderName: BEFORE_BREATH, folderKind: "before-second-breath", time, moveTokens});
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>The Second Breath</h3>
      <p><strong>${esc(made.name)}</strong> claws up out of Yomi into the body it left: Yin ${st.yin}, Yang ${st.yang}, Hun ${st.hun}, P'o ${st.po}, Dharma ${st.dharma}, Willpower ${st.willpower} (at most ${st.willpowerMost}). No blood: it runs on Chi.</p>
      ${chihMei ? `<p>It rises as a chih-mei, the P'o in command. Unless the Hun can show itself under testing, a wu will not spare it.</p>` : `<p>The Hun rose in command. Training as a hin can take years.</p>`}
      <p>To spend: 4 dots between Yin and Yang, 3 Disciplines with at least one Demon Art. Starting Chi equals the Yin and Yang ratings; a Virtue pair totals 10 at Dharma 1.</p>
      <p class="wodx-quiet">Kindred of the East pdf 20, 22, 70, 78, 82, 86. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"}, whisper: whisperTo(made)
  });
  await writeLineageJournal();
  ui.notifications.info(`${made.name} rises with the Second Breath.${moved ? ` ${moved} token(s) now show the Kuei-jin.` : ""}`);
  return made;
}

/* -------------------------------------------- */
/*  The four dialogs (0.9.0)                     */
/* -------------------------------------------- */

const pickRow = (mortals, pick) => `<div class="form-group"><label>Mortal</label>${searchBox("select[name=mortal]", "Search mortals…", "Search mortals")}<select name="mortal">${opts(mortals.map(a => [a.id, a.name]), pick?.id)}</select></div>`;
const tokensRow = what => `<div class="form-group"><label><input type="checkbox" name="moveTokens" checked> Tokens of the mortal become the ${what}</label></div>`;
async function ask(title, content, label, read) {
  return foundry.applications.api.DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title}, position: {width: 560}, content,
    ok: {label, callback: (event, button) => read(button.form.elements)}, rejectClose: false});
}

export async function revenantDialog() {
  if ( !game.user.isGM ) return null;
  const mortals = game.actors.filter(canBeRevenant).sort(byName);
  if ( !mortals.length ) return ui.notifications.warn("There is no mortal to mark as a revenant.");
  const sel = globalThis.canvas?.tokens?.controlled?.[0]?.actor;
  const pick = sel && canBeRevenant(sel) ? sel : mortals[0];
  const fams = Object.entries(SR.FAMILIES).map(([k, f]) => [k, `${f.label} (${f.disciplines.map(SR.DISC_LABEL).join(", ")})`]);
  const discs = [...new Set(Object.values(SR.FAMILIES).flatMap(f => f.disciplines))].sort().map(k => [k, SR.DISC_LABEL(k)]);
  const r = await ask("A revenant", `
    <p>A child of a revenant family carries its vitae from birth (V20 Ghouls and Revenants). The sheet stays a mortal's, as a ghoul's, with
      Potence 1 and one family Discipline, or two family Disciplines and no Potence. The book gives no age for the blood to show.</p>
    ${pickRow(mortals, pick)}
    <div class="form-group"><label>Family</label>${searchBox("select[name=family]", "Search families…", "Search families")}<select name="family">${opts(fams, "grimaldi")}</select></div>
    <div class="form-group"><label>Way</label><select name="way" data-fixed>${opts([["standard", "Potence 1 and a family Discipline"], ["alternate", "Two family Disciplines, no Potence"]], "standard")}</select></div>
    <div class="form-group"><label>Family Discipline</label><select name="d1" data-fixed><option value="">The family's first</option>${opts(discs, "")}</select></div>
    <div class="form-group"><label>Second (two-Discipline way)</label><select name="d2" data-fixed><option value="">The family's next</option>${opts(discs, "")}</select></div>`,
    "Mark a revenant", f => ({mortal: f.mortal.value, family: f.family.value, way: f.way.value, picks: [f.d1.value, f.d2.value].filter(Boolean)}));
  if ( !r ) return null;
  return revenantBirth(game.actors.get(r.mortal), r);
}

export async function chrysalisDialog() {
  if ( !game.user.isGM ) return null;
  const {mortals, pick} = mortalPicker();
  if ( !mortals.length ) return ui.notifications.warn("There is no mortal for the Chrysalis.");
  const r = await ask("The Chrysalis", `
    <p>A fae soul wakes in a mortal (C20). A Changeling sheet is made from the mortal's: Attributes, Abilities and the life story carry over
      (house rule), with Willpower 4 (the mortal's if higher), Glamour 4 and Banality 3, and the seeming's step. Most come out as childlings,
      whatever the body's age. The mortal sheet is kept, in "${BEFORE_CHRYSALIS}".</p>
    ${pickRow(mortals, pick)}
    <div class="form-group"><label>Kith</label><input type="text" name="kith" placeholder="Boggan, eshu, pooka, sidhe…"></div>
    <div class="form-group"><label>Seeming</label><select name="seeming" data-fixed>${opts(Object.entries(SR.SEEMINGS), "childling")}</select></div>
    <div class="form-group"><label>A wilder's step</label><select name="wilder" data-fixed>${opts([["glamour", "+1 Glamour"], ["willpower", "+1 Willpower"]], "glamour")}</select></div>
    <div class="form-group"><label>Court</label><select name="court" data-fixed>${opts([["", "Not yet"], ["Seelie", "Seelie"], ["Unseelie", "Unseelie"]], "")}</select></div>
    ${tokensRow("changeling")}`,
    "Wake", f => ({mortal: f.mortal.value, kith: f.kith.value, seeming: f.seeming.value, wilder: f.wilder.value, court: f.court.value, moveTokens: f.moveTokens.checked}));
  if ( !r ) return null;
  return chrysalis(game.actors.get(r.mortal), r);
}

export async function fallenDialog() {
  if ( !game.user.isGM ) return null;
  const {mortals, pick} = mortalPicker();
  if ( !mortals.length ) return ui.notifications.warn("There is no mortal host.");
  const r = await ask("A Fallen takes a host", `
    <p>A demon escapes the Abyss into a dying or empty mortal (Demon: The Fallen). A Demon sheet is made from the host's: Attributes, Abilities,
      Backgrounds and the life story stay, Faith 3, Torment by House, and Virtues from the host's Conscience and Courage (up to 3 each) with
      Conviction 1 before the 3 dots to spend. The host's sheet is kept, in "${THE_HOST}".</p>
    ${pickRow(mortals, pick)}
    <div class="form-group"><label>House</label><select name="house" data-fixed>${opts(Object.entries(SR.HOUSES).map(([k, h]) => [k, `${h.label}, Torment ${h.torment}`]), "devils")}</select></div>
    <div class="form-group"><label>The Celestial name</label><input type="text" name="celestial"></div>
    <div class="form-group"><label>The demon's Nature</label><input type="text" name="nature"></div>
    ${tokensRow("demon")}`,
    "Take the host", f => ({mortal: f.mortal.value, house: f.house.value, celestial: f.celestial.value, nature: f.nature.value, moveTokens: f.moveTokens.checked}));
  if ( !r ) return null;
  return fallenHost(game.actors.get(r.mortal), r);
}

export async function possessDialog() {
  if ( !game.user.isGM ) return null;
  const demons = game.actors.filter(a => a.type === (CONFIG.worldofdarkness?.sheettype?.demon ?? "Demon")).sort(byName);
  if ( !demons.length ) return ui.notifications.warn("There is no Demon sheet.");
  const r = await ask("A new host", `
    <p>A Fallen whose host has died seeks another body, or an object (Demon: The Fallen pdf 260 / printed 259).</p>
    <div class="form-group"><label>Demon</label>${searchBox("select[name=demon]", "Search demons…", "Search demons")}<select name="demon">${opts(demons.map(a => [a.id, a.name]), demons[0].id)}</select></div>
    <div class="form-group"><label>The new body</label><select name="target" data-fixed>${opts(Object.entries(SR.HOST_TARGETS).map(([k, t]) => [k, `${t.label}${t.diff ? `, difficulty ${t.diff}` : ", no roll"}`]), "ordinary")}</select></div>`,
    "Roll", f => ({demon: f.demon.value, target: f.target.value}));
  if ( !r ) return null;
  return possess(game.actors.get(r.demon), r);
}

export async function secondBreathDialog() {
  if ( !game.user.isGM ) return null;
  const {mortals, pick} = mortalPicker();
  if ( !mortals.length ) return ui.notifications.warn("There is no dead mortal to rise.");
  const r = await ask("The Second Breath", `
    <p>A dead mortal's P'o comes back out of Yomi, the two souls join, and the body rises (Kindred of the East). A Vampire sheet set to Kindred
      of the East is made from the mortal's: Attributes, Abilities and the life story stay (house rule), with Yin and Yang 1, Hun 1, P'o 3,
      Dharma 1 and Willpower 5 (the mortal's if higher, to Hun + 5). The mortal sheet is kept, in "${BEFORE_BREATH}".</p>
    ${pickRow(mortals, pick)}
    <div class="form-group"><label>Direction</label><input type="text" name="direction" placeholder="Optional"></div>
    <div class="form-group"><label><input type="checkbox" name="chihMei"> Rises as a chih-mei, the P'o in command</label></div>
    ${tokensRow("Kuei-jin")}`,
    "Rise", f => ({mortal: f.mortal.value, direction: f.direction.value, chihMei: f.chihMei.checked, moveTokens: f.moveTokens.checked}));
  if ( !r ) return null;
  return secondBreath(game.actors.get(r.mortal), r);
}
