import {MODULE_ID, placeOf} from "./ratings.mjs";
import {CHARTS, planAttempt, countRoll, outcomeOf, SETTLEMENTS} from "./rules.mjs";

export const STATUS = {
  umbra: {id: "wodx-umbra", name: "In the Umbra", img: "icons/svg/portal.svg"},
  caught: {id: "wodx-caught", name: "Caught in the Gauntlet", img: "icons/svg/net.svg"},
  lost: {id: "wodx-lost", name: "Lost in the Pattern Web", img: "icons/svg/daze.svg"}
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

/**
 * Apply status and record changes to a traveler. Runs locally for owners; otherwise asks the active GM.
 * @param {TokenDocument} tokenDoc
 * @param {{add?: string[], remove?: string[], attempts?: object|null, level?: string|null}} change
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

export async function applyLocally(tokenDoc, {add = [], remove = [], attempts, level} = {}) {
  const actor = tokenDoc.actor;
  for ( const id of remove ) if ( OUR_STATUSES.has(id) ) await actor.toggleStatusEffect(id, {active: false});
  for ( const id of add ) if ( OUR_STATUSES.has(id) ) await actor.toggleStatusEffect(id, {active: true});
  if ( attempts === null ) await actor.unsetFlag(MODULE_ID, "attempts");
  else if ( attempts ) await actor.setFlag(MODULE_ID, "attempts", attempts);
  if ( level ) {
    const dest = tokenDoc.parent.levels?.get(level);
    if ( dest && tokenDoc._source.level !== dest.id ) {
      await tokenDoc.move({level: dest.id, elevation: dest.elevation.base ?? 0, action: "displace"});
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
    level: typeof change.level === "string" ? change.level : null
  };
  await applyLocally(tokenDoc, safe);
}

/* -------------------------------------------- */
/*  Levels: Penumbra prototype                  */
/* -------------------------------------------- */

function layerLevels(scene) {
  const levels = scene?.levels ? [...scene.levels] : [];
  const penumbra = levels.find(l => l.getFlag(MODULE_ID, "layer") === "penumbra") ?? null;
  const physical = levels.find(l => l.getFlag(MODULE_ID, "layer") !== "penumbra") ?? null;
  return {penumbra, physical};
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
    window: {title: verb},
    content: `
      <p><strong>${esc(travelers.map(t => t.name).join(", "))}</strong>${excluded.length ? ` <em>(not ${esc(excluded.map(t => t.name).join(", "))}: they cannot step sideways)</em>` : ""}</p>
      <p>${esc(place.where)}: ${esc(SETTLEMENTS[place.ratings.settlement] ?? "Not set")}. Gauntlet ${gauntletText}.</p>
      <p class="wodx-quiet">${esc(place.source ?? "No rating")} · ${esc(chart.name)} rules</p>
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

  const plan = planAttempt({
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
    if ( change.add.length || change.remove.length || change.attempts !== undefined || change.level ) {
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
    await applyLocally(t, {remove: [STATUS.umbra.id, STATUS.caught.id, STATUS.lost.id], attempts: null});
  }
  if ( tokens.length ) ui.notifications.info(`Cleared Umbra, Caught and Lost from ${tokens.length} token(s).`);
}
