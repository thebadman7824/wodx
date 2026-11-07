import {MODULE_ID, esc, lineOf, lineage, generationOf, clanOf, clanNameOf, disciplinesOf, disciplineItem, vampireEra, eraProfile} from "./actor-data.mjs";
import {childeGeneration, clanDisciplines, findClan, generationRow, ghoulBloodMax, bondStage} from "./rules.mjs";
import {CLANS, EMBRACE, GHOUL} from "../data/vampire.mjs";
import {setLineage, setChronology, recordDrink, writeLineageJournal, dateLabel, ordinal} from "./lineage.mjs";

const BEFORE_FOLDER = "WoDX · Before the Embrace";
const NIGHT = 86400;

/* -------------------------------------------- */
/*  The Embrace                                 */
/* -------------------------------------------- */

/**
 * The new vampire's data, built from the mortal's. Pure apart from reading CONFIG; nothing is saved.
 * @param {Actor} mortal
 * @param {object} o
 * @param {Actor|null} o.sire
 * @param {string} o.clanName
 * @param {number} o.generation
 * @param {number} [o.startBlood]
 */
export function embraceData(mortal, {sire = null, clanName, generation, startBlood = EMBRACE.startBlood}) {
  const src = mortal.toObject();
  delete src._id;
  delete src._stats;
  const sys = src.system;
  const row = generationRow(generation);
  const s = sys.settings ??= {};
  s.iscreated = true;
  s.haspath = true;
  s.hasbloodpool = true;
  s.hasvirtue = true;
  s.powers = {...(s.powers ?? {}), hasdisciplines: true};
  s.soak = foundry.utils.mergeObject(s.soak ?? {}, {bashing: {isrollable: true}, lethal: {isrollable: true}, aggravated: {isrollable: false}}, {inplace: false});
  s.variant = "general";
  s.variantsheet = "";
  const eraKey = vampireEra();
  s.era = CONFIG.worldofdarkness?.era?.[eraKey] ?? s.era;
  s.abilities = {...(s.abilities ?? {}), defaultmaxvalue: row.maxTrait};
  s.powers.defaultmaxvalue = row.maxTrait;

  sys.generation = Number(generation);
  sys.generationmod = 0;
  sys.clan = "custom";
  sys.custom = {...(sys.custom ?? {}), clan: clanName};
  sys.sire = sire?.name ?? sys.sire ?? "";
  const adv = sys.advantages ??= {};
  adv.bloodpool = {temporary: Math.max(0, Math.min(Number(startBlood) || 0, row.bloodMax ?? 10)), max: row.bloodMax ?? 10, perturn: row.perTurn ?? 1};
  // Every Cainite starts on the Road of Humanity (V20DA p. 111); the rating carries over from the mortal
  const path = adv.path ??= {permanent: 0, value: 0, max: 10, roll: 0, bearing: 0, bearingtext: "", label: "", custom: ""};
  const roads = eraProfile()?.rules?.morality === "roads";
  path.label = roads ? "custom" : "wod.advantages.path.humanity";
  path.custom = roads ? EMBRACE.road : "";
  if ( !(Number(path.permanent) > 0) ) {
    // WoDX choice: a mortal sheet with no Humanity starts at Conscience + Self-Control
    const v = adv.virtues ?? {};
    const start = Math.max(1, (Number(v.conscience?.permanent) || 1) + (Number(v.selfcontrol?.permanent) || 1));
    path.permanent = path.value = Math.min(10, start);
  }

  src.type = CONFIG.worldofdarkness?.sheettype?.vampire ?? "Vampire";
  const known = new Set((src.items ?? []).filter(i => i.type === "Power" && i.system?.type === "wod.types.discipline").map(i => i.name.toLowerCase()));
  const clan = findClan(clanName);
  const newDisciplines = clanDisciplines(clan, eraKey).filter(d => !known.has(d.toLowerCase()));
  src.items = [...(src.items ?? []).map(i => { const c = {...i}; delete c._id; return c; }), ...newDisciplines.map(d => disciplineItem(d, 0))];
  src.flags = foundry.utils.deepClone(src.flags ?? {});
  delete src.flags[MODULE_ID];
  return {data: src, row, clan, newDisciplines};
}

/** GM: Embrace a mortal. Creates the vampire, keeps the mortal as a record, links them and moves the tokens. */
export async function embrace(mortal, {sire = null, clanName, generation, startBlood, time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !["mortal", "ghoul"].includes(lineOf(mortal)) ) throw new Error(`${mortal?.name} is not a mortal or a ghoul`);
  const {data, row, newDisciplines} = embraceData(mortal, {sire, clanName, generation, startBlood});
  const vampire = await Actor.create(data);
  const before = lineage(mortal);
  await setLineage(vampire, {sire: sire ? {id: sire.id, name: sire.name} : null, formerly: {id: mortal.id, name: mortal.name},
    bonds: before.bonds ?? {}, domitor: null});
  await setChronology(vampire, {embraced: time});
  await setLineage(mortal, {became: {id: vampire.id, name: vampire.name}});
  await setChronology(mortal, {embraced: time});

  // The mortal stays, as a record of the life before
  const folder = game.folders.find(f => f.type === "Actor" && f.name === BEFORE_FOLDER)
    ?? await Folder.create({name: BEFORE_FOLDER, type: "Actor", flags: {[MODULE_ID]: {kind: "before-embrace"}}});
  await mortal.update({folder: folder.id});

  let moved = 0;
  if ( moveTokens ) {
    for ( const scene of game.scenes ?? [] ) {
      const tokens = [...(scene.tokens ?? [])].filter(t => t.actorId === mortal.id);
      if ( !tokens.length ) continue;
      await scene.updateEmbeddedDocuments("Token", tokens.map(t => ({_id: t.id, actorId: vampire.id})));
      moved += tokens.length;
    }
  }

  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>The Embrace</h3>
      <p><strong>${esc(vampire.name)}</strong> rises, hungry. Sire: ${esc(sire?.name ?? "unknown")}.</p>
      <p>${esc(clanName)}, ${ordinal(Number(generation))} Generation: blood pool ${row.bloodMax}, ${row.perTurn} a turn, Traits to ${row.maxTrait}.</p>
      ${newDisciplines.length ? `<p>Clan Disciplines to learn: ${esc(newDisciplines.join(", "))}.</p>` : ""}
      <p class="wodx-quiet">${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"},
    whisper: game.users.filter(u => u.isGM || vampire.testUserPermission?.(u, "OWNER")).map(u => u.id)
  });
  await writeLineageJournal();
  ui.notifications.info(`${vampire.name} is Embraced.${moved ? ` ${moved} token(s) now show the vampire.` : ""}`);
  return vampire;
}

/** Defaults the Embrace dialog offers for a sire. */
export function embraceDefaults(sire) {
  const clan = sire ? clanOf(sire) : null;
  const generation = sire ? childeGeneration(generationOf(sire)) : null;
  // With no sire on record, the Twelfth Generation, where V20DA starts every character (p. 144)
  return {clanName: clan?.name ?? (sire ? clanNameOf(sire) : "") ?? "", generation: generation ?? EMBRACE.unknownSireGeneration};
}

/* -------------------------------------------- */
/*  Vitae: ghouls and the blood oath            */
/* -------------------------------------------- */

const nightOf = time => Math.floor(((Number(time) || 0) - (NIGHT / 2)) / NIGHT);

/**
 * GM: a character drinks a vampire's blood. A mortal becomes a ghoul on the first drink and gains Potence 1
 * (V20DA p. 399). Each drink on a new night moves the blood oath on; the third binds (V20DA pp. 341–342).
 */
export async function giveVitae(drinker, regnant, {points = 1, time = game.time.worldTime} = {}) {
  if ( !game.user.isGM ) return null;
  if ( lineOf(regnant) !== "vampire" ) throw new Error(`${regnant?.name} is not a vampire`);
  if ( drinker.id === regnant.id ) throw new Error("A vampire cannot bond to itself");
  const before = lineage(drinker).bonds?.[regnant.id];
  const sameNight = before?.last !== undefined && nightOf(before.last) === nightOf(time);
  let stage;
  if ( sameNight ) {
    stage = bondStage(before.drinks);
    await setLineage(drinker, {bonds: {...lineage(drinker).bonds, [regnant.id]: {...before, last: time}}});
  } else {
    stage = await recordDrink(drinker, regnant, time);
  }

  const notes = [];
  let becameGhoul = false;
  if ( lineOf(drinker) === "mortal" ) {
    becameGhoul = true;
    const max = ghoulBloodMax(0);
    await drinker.update({
      "system.settings.variant": "ghoul",
      "system.settings.haspath": true,
      "system.settings.hasbloodpool": true,
      "system.settings.hasvirtue": true,
      "system.settings.powers.hasdisciplines": true,
      "system.settings.variantsheet": CONFIG.worldofdarkness?.sheettype?.vampire ?? "Vampire",
      "system.advantages.bloodpool.max": max,
      "system.advantages.bloodpool.perturn": GHOUL.perTurn,
      "system.advantages.bloodpool.temporary": Math.min(max, Math.max(0, Number(points) || 0))
    });
    const potence = disciplinesOf(drinker).find(d => d.name.toLowerCase() === "potence");
    if ( !potence ) await drinker.createEmbeddedDocuments("Item", [disciplineItem("Potence", GHOUL.firstDrinkPotence)]);
    else if ( potence.value < GHOUL.firstDrinkPotence ) await drinker.items.get(potence.id).update({"system.value": 1, "system.level": 1});
    await setLineage(drinker, {domitor: {id: regnant.id, name: regnant.name}});
    await setChronology(drinker, {ghouled: time});
    notes.push("becomes a ghoul and gains Potence 1");
  } else if ( lineOf(drinker) === "ghoul" ) {
    const pool = drinker.system.advantages?.bloodpool ?? {};
    const max = Number(pool.max) || GHOUL.bloodMax;
    await drinker.update({"system.advantages.bloodpool.temporary": Math.min(max, (Number(pool.temporary) || 0) + (Number(points) || 0))});
    if ( !lineage(drinker).domitor ) await setLineage(drinker, {domitor: {id: regnant.id, name: regnant.name}});
  }
  notes.push(sameNight ? `${stage.label} (a second drink the same night does not deepen the bond)` : stage.label);

  await ChatMessage.create({
    content: `<div class="wodx-card wodx-vitae"><h3>Vitae</h3>
      <p><strong>${esc(drinker.name)}</strong> drinks from <strong>${esc(regnant.name)}</strong>: ${esc(notes.join("; "))}.</p>
      <p class="wodx-quiet">${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"},
    whisper: game.users.filter(u => u.isGM).map(u => u.id)
  });
  await writeLineageJournal();
  return {stage, becameGhoul, sameNight};
}

/* -------------------------------------------- */
/*  Dialogs                                     */
/* -------------------------------------------- */

const options = (list, selected) => list.map(a => `<option value="${a.id}" ${a.id === selected ? "selected" : ""}>${esc(a.name)}</option>`).join("");
const byName = (a, b) => a.name.localeCompare(b.name);

function selectedActor(test) {
  const a = canvas?.tokens?.controlled?.[0]?.document?.actor ?? canvas?.tokens?.controlled?.[0]?.actor;
  return a && test(a) ? a : null;
}

export async function embraceDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const mortals = game.actors.filter(a => ["mortal", "ghoul"].includes(lineOf(a)) && !lineage(a).became).sort(byName);
  const vampires = game.actors.filter(a => lineOf(a) === "vampire").sort(byName);
  if ( !mortals.length ) return ui.notifications.warn("There is no mortal to Embrace.");
  const pick = selectedActor(a => ["mortal", "ghoul"].includes(lineOf(a)));
  const sire0 = vampires[0] ?? null;
  const d0 = embraceDefaults(sire0);
  // A clan the sheet names but WoDX does not know (a bloodline, "Clan unconfirmed") is offered as written
  const sheetClans = [...new Set(vampires.map(v => clanNameOf(v)).filter(n => n && !CLANS.some(c => c.name === n) && !findClan(n)))];
  const clanOpts = [...CLANS.map(c => c.name), ...sheetClans]
    .map(n => `<option value="${esc(n)}" ${n === d0.clanName ? "selected" : ""}>${esc(n)}</option>`).join("");
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "The Embrace"},
    content: `
      <p>The mortal is drained and given the sire's blood (V20 Dark Ages p. 13). A new vampire sheet is made from the
        mortal's; the mortal sheet is kept, in the folder "${BEFORE_FOLDER}".</p>
      <div class="form-group"><label>Mortal</label><select name="mortal">${options(mortals, pick?.id ?? mortals[0].id)}</select></div>
      <div class="form-group"><label>Sire</label><select name="sire"><option value="">Unknown</option>${options(vampires, sire0?.id)}</select></div>
      <div class="form-group"><label>Clan</label><select name="clan">${clanOpts}</select></div>
      <div class="form-group"><label>Generation</label><input type="number" name="generation" value="${d0.generation}" min="3" max="15" step="1"></div>
      <div class="form-group"><label>Blood on rising</label><input type="number" name="blood" value="${EMBRACE.startBlood}" min="0" max="10" step="1"></div>
      <div class="form-group"><label><input type="checkbox" name="moveTokens" checked> Tokens of the mortal become the vampire</label></div>
      <p class="wodx-quiet">Clan and Generation follow the sire; change them for a Caitiff or a lie. The childe starts on the
        Road of Humanity (p. 111) at the mortal's rating, with the clan Disciplines listed at 0 dots.</p>`,
    render: (event, dialog) => {
      const form = dialog.element.querySelector("form");
      form?.elements.sire?.addEventListener("change", () => {
        const d = embraceDefaults(game.actors.get(form.elements.sire.value) ?? null);
        if ( d.clanName && [...form.elements.clan.options].some(o => o.value === d.clanName) ) form.elements.clan.value = d.clanName;
        form.elements.generation.value = d.generation;
      });
    },
    ok: {
      label: "Embrace",
      callback: (event, button) => {
        const f = button.form.elements;
        return {mortal: f.mortal.value, sire: f.sire.value, clan: f.clan.value, generation: Number(f.generation.value),
          blood: Number(f.blood.value), moveTokens: f.moveTokens.checked};
      }
    },
    rejectClose: false
  });
  if ( !result ) return null;
  const mortal = game.actors.get(result.mortal);
  const sire = result.sire ? game.actors.get(result.sire) : null;
  if ( sire && Number(result.generation) <= generationOf(sire) ) {
    ui.notifications.warn(`A childe cannot be closer to Caine than the sire (${ordinal(generationOf(sire))} Generation).`);
    return null;
  }
  return embrace(mortal, {sire, clanName: result.clan, generation: result.generation, startBlood: result.blood, moveTokens: result.moveTokens});
}

export async function vitaeDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const drinkers = game.actors.filter(a => lineOf(a) && !lineage(a).became).sort(byName);
  const vampires = game.actors.filter(a => lineOf(a) === "vampire").sort(byName);
  if ( !vampires.length ) return ui.notifications.warn("There is no vampire to give blood.");
  const pick = selectedActor(a => !!lineOf(a));
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Give vitae"},
    content: `
      <p>A mortal who drinks becomes a ghoul and gains Potence 1 (V20 Dark Ages p. 399). Three drinks on three nights
        make a blood oath (pp. 341–342).</p>
      <div class="form-group"><label>Who drinks</label><select name="drinker">${options(drinkers, pick?.id ?? drinkers[0]?.id)}</select></div>
      <div class="form-group"><label>Whose blood</label><select name="regnant">${options(vampires, vampires[0].id)}</select></div>
      <div class="form-group"><label>Blood points</label><input type="number" name="points" value="1" min="1" max="10" step="1"></div>
      <p class="wodx-quiet">The vampire's own blood pool is not changed; spend it on that sheet.</p>`,
    ok: {
      label: "Drink",
      callback: (event, button) => {
        const f = button.form.elements;
        return {drinker: f.drinker.value, regnant: f.regnant.value, points: Number(f.points.value)};
      }
    },
    rejectClose: false
  });
  if ( !result ) return null;
  const drinker = game.actors.get(result.drinker);
  const regnant = game.actors.get(result.regnant);
  if ( !drinker || !regnant ) return null;
  if ( drinker.id === regnant.id ) return ui.notifications.warn("A vampire cannot drink its own blood for a bond.");
  return giveVitae(drinker, regnant, {points: result.points});
}
