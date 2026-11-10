import {MODULE_ID, placeOf} from "./ratings.mjs";
import {planAttempt, countRoll, outcomeOf, SETTLEMENTS, disconnection} from "./rules.mjs";
import {layersOf, tokenLayer} from "./twins.mjs";

export const STATUS = {
  umbra: {id: "wodx-umbra", name: "In the Umbra", img: "icons/svg/portal.svg"},
  caught: {id: "wodx-caught", name: "Caught in the Gauntlet", img: "icons/svg/net.svg"},
  lost: {id: "wodx-lost", name: "Lost in the Pattern Web", img: "icons/svg/daze.svg"},
  shadowlands: {id: "wodx-shadowlands", name: "In the Shadowlands", img: "icons/svg/skull.svg"},
  dreaming: {id: "wodx-dreaming", name: "In the Near Dreaming", img: "icons/svg/sun.svg"},
  deep: {id: "wodx-deep-umbra", name: "Beyond the Penumbra", img: "icons/svg/aura.svg"},
  net: {id: "wodx-net", name: "Jacked into the Net", img: "icons/svg/lightning.svg"}
};
const OUR_STATUSES = new Set(Object.values(STATUS).map(s => s.id));

export function registerStatuses() {
  for ( const s of Object.values(STATUS) ) {
    if ( !CONFIG.statusEffects.find(e => e.id === s.id) ) CONFIG.statusEffects.push({...s, hud: true});
  }
}

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Can this actor step sideways at all? Garou and other shapeshifters. */
export function canStepSideways(actor) {
  const st = CONFIG.worldofdarkness?.sheettype ?? {};
  return [st.werewolf ?? "Werewolf", st.changingbreed ?? "Changing Breed"].includes(actor?.type);
}

export function gnosisOf(actor) {
  const g = actor?.system?.advantages?.gnosis;
  return Number(g?.roll ?? g?.permanent ?? 0) || 0;
}

function hasStatus(actor, id) {
  return !!actor?.statuses?.has(id);
}

function knowsPulse(actor) {
  return !!actor?.items?.some(i => /pulse of the invisible/i.test(i.name));
}

/* -------------------------------------------- */
/*  Applying changes                            */
/* -------------------------------------------- */

/** Which world an actor is in, and since when: {in: "physical"|"umbra"|"shadowlands", since: worldTime} */
export function worldOf(actor) {
  return actor?.getFlag?.(MODULE_ID, "world") ?? null;
}
const WORLDS = new Set(["physical", "umbra", "shadowlands", "dreaming"]);

/**
 * Apply status and record changes to a traveler. Runs locally for owners; otherwise asks the active GM.
 * @param {TokenDocument} tokenDoc
 * @param {{add?: string[], remove?: string[], attempts?: object|null, level?: string|null, world?: {in: string, since: number}}} change
 */
export async function applyChange(tokenDoc, change) {
  const actor = tokenDoc.actor;
  if ( !actor ) return;
  if ( actor.isOwner && tokenDoc.isOwner ) return applyLocally(tokenDoc, change);
  if ( !game.users.activeGM ) {
    ui.notifications.warn(`No Storyteller is connected to update ${tokenDoc.name}.`);
    return;
  }
  game.socket.emit(`module.${MODULE_ID}`, {type: "applyChange", payload: {tokenUuid: tokenDoc.uuid, change}});
}

export async function applyLocally(tokenDoc, {add = [], remove = [], attempts, level, world} = {}) {
  const actor = tokenDoc.actor;
  for ( const id of remove ) if ( OUR_STATUSES.has(id) ) await actor.toggleStatusEffect(id, {active: false});
  for ( const id of add ) if ( OUR_STATUSES.has(id) ) await actor.toggleStatusEffect(id, {active: true});
  if ( attempts === null ) await actor.unsetFlag(MODULE_ID, "attempts");
  else if ( attempts ) await actor.setFlag(MODULE_ID, "attempts", attempts);
  if ( world && WORLDS.has(world.in) && Number.isFinite(world.since) ) await actor.setFlag(MODULE_ID, "world", {in: world.in, since: world.since});
  if ( level ) {
    const dest = tokenDoc.parent.levels?.get(level);
    if ( dest && tokenDoc._source.level !== dest.id ) {
      // Keep the token's height above its floor: a traveler on a roof arrives on the twin roof
      const from = tokenDoc.parent.levels?.get(tokenDoc._source.level);
      const above = Number.isFinite(from?.elevation?.base) ? Math.max(0, (Number(tokenDoc.elevation ?? tokenDoc._source.elevation) || 0) - from.elevation.base) : 0;
      await tokenDoc.move({level: dest.id, elevation: (dest.elevation.base ?? 0) + above, action: "displace"});
    }
  }
}

/** Active GM side of applyChange. Only WoDX statuses and records can be changed this way. */
export async function onApplyChangeGM({tokenUuid, change}) {
  if ( !game.users.activeGM?.isSelf ) return;
  const tokenDoc = await fromUuid(tokenUuid);
  if ( !tokenDoc?.actor ) return;
  const safe = {
    add: (change.add ?? []).filter(id => OUR_STATUSES.has(id)),
    remove: (change.remove ?? []).filter(id => OUR_STATUSES.has(id)),
    attempts: change.attempts === null ? null : (change.attempts && typeof change.attempts === "object" ? change.attempts : undefined),
    level: typeof change.level === "string" ? change.level : null,
    world: (change.world && WORLDS.has(change.world.in) && Number.isFinite(change.world.since)) ? {in: change.world.in, since: change.world.since} : undefined
  };
  await applyLocally(tokenDoc, safe);
}

/* -------------------------------------------- */
/*  Levels: Penumbra prototype                  */
/* -------------------------------------------- */

function layerLevels(scene) {
  const {penumbra, physical, shadowlands} = layersOf(scene);
  return {penumbra, physical, shadowlands};
}

/* -------------------------------------------- */
/*  The action                                  */
/* -------------------------------------------- */

/**
 * Step sideways or peek with the controlled tokens.
 * @param {object} [options]
 * @param {"cross"|"peek"} [options.mode="cross"]
 */
export async function stepSideways({mode = "cross"} = {}) {
  const controlled = canvas?.tokens?.controlled?.map(t => t.document) ?? [];
  if ( !controlled.length ) return ui.notifications.warn("Select the token, or the pack's tokens, first.");
  const travelers = controlled.filter(t => canStepSideways(t.actor));
  const excluded = controlled.filter(t => !canStepSideways(t.actor));
  if ( !travelers.length ) {
    return ui.notifications.warn("Only Garou and other shapeshifters can step sideways. Other travelers need their own powers.");
  }

  const inShadow = travelers.filter(t => tokenLayer(t) === "shadowlands" || hasStatus(t.actor, STATUS.shadowlands.id));
  if ( inShadow.length ) return ui.notifications.warn(`${inShadow.map(t => t.name).join(", ")}: in the Shadowlands, beyond the Shroud. Stepping sideways is for the Gauntlet; cross the Shroud back first.`);
  const place = placeOf(travelers[0]);
  const chart = place.chart;
  const procedure = chart.procedure;
  const inUmbraSet = new Set(travelers.map(t => hasStatus(t.actor, STATUS.umbra.id)));
  if ( inUmbraSet.size > 1 ) return ui.notifications.warn("Some of these travelers are in the Umbra and some are not. Select one side at a time.");
  const inUmbra = inUmbraSet.has(true);
  const isPack = travelers.length > 1;

  const {DialogV2} = foundry.applications.api;
  const anyPulse = travelers.some(t => knowsPulse(t.actor));
  const verb = mode === "peek" ? "Peek across the Gauntlet" : (inUmbra ? "Step back to the physical world" : "Step sideways into the Umbra");
  const gauntletText = place.gauntlet === null ? "<strong>not rated</strong>" : (place.gauntlet === 0 ? "no roll needed" : String(place.gauntlet));
  const choice = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: verb},
    content: `
      <p><strong>${esc(travelers.map(t => t.name).join(", "))}</strong>${excluded.length ? ` <em>(not ${esc(excluded.map(t => t.name).join(", "))}: they cannot step sideways)</em>` : ""}</p>
      <p>${esc(place.where)}: ${esc(SETTLEMENTS[place.ratings.settlement] ?? "Not set")}. Gauntlet ${gauntletText}.</p>
      <p class="wodx-quiet">${esc(place.source ?? "No rating")} · ${esc(chart.name)} rules</p>
      ${mode === "cross" ? disconnectionLine(travelers, inUmbra) : ""}
      ${place.notes.map(n => `<p class="wodx-quiet">${esc(n)}</p>`).join("")}
      <div class="form-group"><label><input type="checkbox" name="reflective" ${place.ratings.reflective ? "checked" : ""}> A reflective surface is at hand</label></div>
      ${procedure === "w20" ? `
        <div class="form-group"><label><input type="checkbox" name="ownMirror"> Using a carried mirror (+1, Storyteller's discretion)</label></div>
        <div class="form-group"><label><input type="checkbox" name="pulse" ${anyPulse ? "checked" : ""}> Knows Pulse of the Invisible</label></div>` : ""}
      ${isPack ? `<div class="form-group"><label><input type="checkbox" name="pack" checked> As a pack: one roll by the opener of the way (highest Gnosis)</label></div>` : ""}
      ${game.user.isGM ? `<div class="form-group"><label><input type="checkbox" name="override"> Storyteller: allow it even if the rules say not yet</label></div>` : ""}
      ${procedure === "dark-ages" ? `<p class="wodx-quiet">Rage and Gnosis cannot be used in the same turn (Dark Ages: Werewolf).</p>` : ""}`,
    ok: {
      label: mode === "peek" ? "Peek" : "Roll Gnosis",
      callback: (event, button) => {
        const f = button.form.elements;
        return {reflective: !!f.reflective?.checked, ownMirror: !!f.ownMirror?.checked, pulse: !!f.pulse?.checked,
          pack: isPack ? !!f.pack?.checked : false, override: !!f.override?.checked};
      }
    },
    rejectClose: false
  });
  if ( !choice ) return;

  const groups = choice.pack
    ? [{roller: [...travelers].sort((a, b) => (Number(hasStatus(a.actor, STATUS.caught.id)) - Number(hasStatus(b.actor, STATUS.caught.id)))
      || (gnosisOf(b.actor) - gnosisOf(a.actor)))[0], members: travelers}]
    : travelers.map(t => ({roller: t, members: [t]}));

  for ( const group of groups ) await resolveGroup({group, place, chart, procedure, mode, inUmbra, choice});
}

async function resolveGroup({group, place, chart, procedure, mode, inUmbra, choice}) {
  const roller = group.roller;
  const actor = roller.actor;
  const key = `${place.sceneId}:${place.regionId ?? "scene"}`;
  const record = actor.getFlag(MODULE_ID, "attempts") ?? {};
  const here = record.key === key ? record : {key};
  const now = game.time.worldTime;
  const caught = hasStatus(actor, STATUS.caught.id);
  // Disconnection: the time since the opener of the way last crossed. With no record, nothing is added.
  const w = worldOf(actor);
  const sideNow = inUmbra ? "umbra" : "physical";
  const disc = disconnection(w && w.in === sideNow ? now - w.since : null);

  const plan = planAttempt({
    cycles: disc.cycles,
    procedure, gauntlet: place.gauntlet, mode, inUmbra,
    reflective: choice.reflective, ownMirror: choice.ownMirror, pulse: choice.pulse,
    priorFailures: procedure === "dark-ages" ? (here.failures ?? 0) : 0,
    secondsSinceFailure: (procedure === "w20" && here.lastFailureAt !== undefined) ? now - here.lastFailureAt : null,
    caught, secondsSinceCaught: (caught && record.caughtAt !== undefined) ? now - record.caughtAt : null,
    override: choice.override
  });

  if ( !choice.override ) {
    if ( hasStatus(actor, STATUS.lost.id) ) plan.blocks.push("Lost in the Pattern Web: the Storyteller decides when and where they come back.");
    if ( record.trapped && group.members.length === 1 ) plan.blocks.push("Trapped until rescued: another Garou must step sideways with them as a pack.");
    if ( plan.blocks.length ) plan.allowed = false;
  }
  if ( !plan.allowed ) {
    ui.notifications.warn(`${roller.name}: ${plan.blocks.join(" ")}`);
    return;
  }

  const names = group.members.map(t => t.name).join(", ");
  let result;
  let roll = null;
  if ( plan.automatic ) {
    result = {successes: 3, ones: 0, net: 3, botch: false, success: true};
  } else {
    const pool = gnosisOf(actor);
    if ( pool <= 0 ) {
      ui.notifications.warn(`${roller.name} has no Gnosis to roll.`);
      return;
    }
    roll = await new Roll(`${pool}d10`).evaluate();
    const faces = roll.dice[0]?.results.map(r => r.result) ?? [];
    result = countRoll(faces, plan.difficulty, {doubleOnes: !!place.ratings.umbralStorm});
    result.faces = faces;
    result.pool = pool;
  }

  const outcome = outcomeOf({procedure, mode, result, reflective: choice.reflective, caught,
    trapped: !!record.trapped});

  // Apply to every member of the group
  const {penumbra, physical} = layerLevels(roller.parent);
  for ( const member of group.members ) {
    const change = {add: [], remove: [], attempts: undefined, level: null};
    if ( outcome.outcome === "success" ) {
      change.remove.push(STATUS.caught.id);
      if ( inUmbra ) {
        change.remove.push(STATUS.umbra.id);
        if ( penumbra && physical ) change.level = physical.id;
      } else {
        change.add.push(STATUS.umbra.id);
        if ( penumbra ) change.level = penumbra.id;
      }
      change.attempts = null;
      change.world = {in: inUmbra ? "physical" : "umbra", since: now};
    } else if ( outcome.outcome === "failure" ) {
      const prev = member.actor.getFlag(MODULE_ID, "attempts") ?? {};
      const same = prev.key === key ? prev : {key};
      change.attempts = procedure === "dark-ages"
        ? {...same, key, failures: (same.failures ?? 0) + 1}
        : {...same, key, lastFailureAt: now};
    } else if ( outcome.outcome === "botch" ) {
      if ( outcome.status === "caught" ) {
        change.add.push(STATUS.caught.id);
        change.attempts = {key, caughtAt: now};
      } else if ( outcome.status === "trapped" ) {
        change.add.push(STATUS.caught.id);
        change.attempts = {key, caughtAt: record.caughtAt ?? now, trapped: true};
      } else if ( outcome.status === "lost" ) {
        change.add.push(STATUS.lost.id);
        change.attempts = null;
      }
    }
    if ( change.add.length || change.remove.length || change.attempts !== undefined || change.level || change.world ) {
      await applyChange(member, change);
    }
  }

  // Chat card
  const dice = result.faces ? result.faces.map(f => `<span class="wodx-die ${f >= plan.difficulty ? "hit" : ""} ${f === 1 ? "one" : ""}">${f}</span>`).join("") : "";
  const content = `
    <div class="wodx-card wodx-crossing">
      <h3>${esc(mode === "peek" ? "Peeking across the Gauntlet" : (inUmbra ? "Stepping back" : "Stepping sideways"))}</h3>
      <p><strong>${esc(names)}</strong>${group.members.length > 1 ? `, led by ${esc(roller.name)}` : ""}</p>
      <p>${esc(place.where)} · ${esc(chart.name)} rules</p>
      <ul>${plan.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      ${plan.automatic ? "" : `<p>Gnosis ${result.pool} against difficulty ${plan.difficulty}: ${dice}</p>
        <p>${result.successes} success${result.successes === 1 ? "" : "es"}, ${result.ones} one${result.ones === 1 ? "" : "s"}${place.ratings.umbralStorm ? " (storm: 1s count twice)" : ""}.</p>`}
      <p class="wodx-outcome ${outcome.outcome}"><strong>${esc(outcome.text)}</strong></p>
    </div>`;
  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({token: roller}),
    rolls: roll ? [roll] : []
  });
  Hooks.callAll("wodxCrossing", {mode, inUmbra, outcome, result, place, travelers: group.members});
}

/** Storyteller: clear the WoDX crossing statuses and records from the controlled tokens. */
export async function clearCrossing() {
  if ( !game.user.isGM ) return;
  const tokens = canvas?.tokens?.controlled?.map(t => t.document) ?? [];
  for ( const t of tokens ) {
    // Cleared means back in the physical world: the Disconnection clock starts again from now
    const back = worldOf(t.actor)?.in && worldOf(t.actor).in !== "physical" ? {in: "physical", since: game.time.worldTime} : undefined;
    await applyLocally(t, {remove: [STATUS.umbra.id, STATUS.caught.id, STATUS.lost.id, STATUS.shadowlands.id], attempts: null, world: back});
  }
  if ( tokens.length ) ui.notifications.info(`Cleared Umbra, Caught, Lost and Shadowlands from ${tokens.length} token(s).`);
}

/* -------------------------------------------- */
/*  Disconnection and the year and a day        */
/* -------------------------------------------- */

const days = n => n < 1 ? "less than a day" : `${Math.floor(n)} day${Math.floor(n) === 1 ? "" : "s"}`;

function disconnectionLine(travelers, inUmbra) {
  const now = game.time.worldTime;
  const side = inUmbra ? "umbra" : "physical";
  const parts = travelers.map(t => {
    const w = worldOf(t.actor);
    const d = disconnection(w && w.in === side ? now - w.since : null);
    if ( !d.known ) return `${esc(t.name)}: no crossing recorded yet`;
    return `${esc(t.name)}: ${days(d.days)} ${inUmbra ? "in the Umbra" : "in the physical world"}${d.cycles ? ` (+${d.cycles})` : ""}${d.yearAndDay ? ", past a year and a day" : ""}`;
  });
  return `<p class="wodx-quiet">Disconnection (W20 p. 319), +1 per lunar cycle in one world: ${parts.join("; ")}.</p>`;
}

/** Time since the actor last crossed, as Disconnection. */
export function disconnectionOf(actor, now = game.time.worldTime) {
  const w = worldOf(actor);
  return {world: w?.in ?? null, ...disconnection(w ? now - w.since : null)};
}

export const YEAR_TYPE = "wodx-umbra-year";

/**
 * Active GM: a traveler who has spent a year and a day in the Umbra starts to become a creature of spirit
 * (W20 p. 319). Proposed once per stay to the WoDX approval queue; the Storyteller decides what it means.
 */
export async function checkYearAndDay(now = game.time.worldTime) {
  if ( !game.user?.isGM || game.users.activeGM?.id !== game.user.id ) return 0;
  const chronicle = game.modules.get("wodx-chronicle")?.api;
  if ( !chronicle?.propose ) return 0;
  let n = 0;
  for ( const actor of game.actors ) {
    const w = worldOf(actor);
    if ( w?.in !== "umbra" ) continue;
    const d = disconnection(now - w.since);
    if ( !d.yearAndDay || actor.getFlag(MODULE_ID, "yearWarned") === w.since ) continue;
    await actor.setFlag(MODULE_ID, "yearWarned", w.since);
    await chronicle.propose({
      type: YEAR_TYPE, key: `${YEAR_TYPE}:${actor.id}:${w.since}`,
      title: `${actor.name}: a year and a day in the Umbra`,
      detail: `${actor.name} has not left the spirit world for ${Math.floor(d.days)} days. After a year and a day in the Penumbra a shapechanger gradually becomes a creature of spirit (W20 p. 319). Approve to mark the change as begun on the sheet's WoDX record; reject to leave it.`,
      data: {actorId: actor.id, since: w.since}
    });
    n++;
  }
  return n;
}

export function registerYearHandler() {
  game.modules.get("wodx-chronicle")?.api?.registerApprovalHandler?.(YEAR_TYPE, {
    label: "A year and a day",
    approve: async entry => {
      const actor = game.actors.get(entry.data?.actorId);
      if ( !actor ) throw new Error("The character is gone");
      await actor.setFlag(MODULE_ID, "spiritChange", {since: entry.data.since, begun: game.time.worldTime});
      await ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "WoDX"},
        content: `<div class="wodx-card"><p><strong>${esc(actor.name)}</strong> begins to become a creature of spirit (W20 p. 319). The Storyteller decides how it shows.</p></div>`});
    }
  });
}

/* -------------------------------------------- */
/*  Crossing the Shroud                         */
/* -------------------------------------------- */

export const SHROUD_MEANS = {
  wraith: "A wraith Materializes, Skinrides or is drawn across (Wraith 20th)",
  necromancy: "Necromancy, a rite or a Gift",
  neardeath: "Near death, or the dying",
  storyteller: "The Storyteller's call"
};

/**
 * Storyteller: move the selected tokens across the Shroud, between the physical level and the Shadowlands level.
 * No roll is made here: every way across has its own power and roll, and those come with each line (Phase 6).
 */
export async function crossShroud() {
  if ( !game.user.isGM ) return ui.notifications.warn("Crossing the Shroud is the Storyteller's call: ask them.");
  const tokens = canvas?.tokens?.controlled?.map(t => t.document) ?? [];
  if ( !tokens.length ) return ui.notifications.warn("Select the tokens first.");
  const scene = tokens[0].parent;
  const {physical, shadowlands} = layersOf(scene);
  const inUmbra = tokens.filter(t => tokenLayer(t) === "penumbra" || hasStatus(t.actor, STATUS.umbra.id));
  if ( inUmbra.length ) return ui.notifications.warn(`${inUmbra.map(t => t.name).join(", ")}: in the Umbra. Step back to the physical world first.`);
  const sides = new Set(tokens.map(t => tokenLayer(t) === "shadowlands" || hasStatus(t.actor, STATUS.shadowlands.id)));
  if ( sides.size > 1 ) return ui.notifications.warn("Some of these tokens are in the Shadowlands and some are not. Select one side at a time.");
  const back = sides.has(true);
  const place = placeOf(tokens[0]);
  const shroud = place.ratings?.shroud ?? null;
  const {DialogV2} = foundry.applications.api;
  const means = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: back ? "Cross back to the living world" : "Cross the Shroud"},
    content: `<p><strong>${esc(tokens.map(t => t.name).join(", "))}</strong></p>
      <p>${esc(place.where)}: Shroud ${shroud ?? "<strong>not rated</strong>"}.</p>
      ${shadowlands ? "" : `<p class="wodx-quiet">This scene has no Shadowlands level yet; only the status changes. Build its twin levels to see the Shadowlands.</p>`}
      <div class="form-group"><label>How</label><select name="means" data-fixed>${Object.entries(SHROUD_MEANS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <p class="wodx-quiet">No roll is made here; the power used has its own roll. The Shroud rating is its difficulty where the book says so.</p>`,
    ok: {label: back ? "Cross back" : "Cross", callback: (event, button) => button.form.elements.means.value},
    rejectClose: false
  });
  if ( !means ) return;
  const now = game.time.worldTime;
  for ( const t of tokens ) {
    await applyLocally(t, back
      ? {remove: [STATUS.shadowlands.id], level: physical?.id ?? null, world: {in: "physical", since: now}}
      : {add: [STATUS.shadowlands.id], level: shadowlands?.id ?? null, world: {in: "shadowlands", since: now}});
  }
  await ChatMessage.create({
    whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "WoDX"},
    content: `<div class="wodx-card wodx-crossing"><h3>${back ? "Back across the Shroud" : "Across the Shroud"}</h3>
      <p><strong>${esc(tokens.map(t => t.name).join(", "))}</strong></p>
      <p>${esc(place.where)} · Shroud ${shroud ?? "not rated"} · ${esc(SHROUD_MEANS[means])}</p></div>`
  });
  Hooks.callAll("wodxShroudCrossing", {back, means, tokens, place});
}
