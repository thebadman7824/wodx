/**
 * WoDX Otherworlds 0.4.0, in Foundry: the Near Dreaming level and its trods, the Avatar Storm by date, Disembodiment,
 * the Net, the moon's roads and the rolls that go with them, and each client's layer sound. Rules in realms-rules.mjs.
 */
import {MODULE_ID, placeOf} from "./ratings.mjs";
import {STATUS, applyLocally, worldOf} from "./crossing.mjs";
import {layersOf, tokenLayer} from "./twins.mjs";
import * as RR from "./realms-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const num = v => Number(v) || 0;
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.users.activeGM?.isSelf;
const setting = k => { try { return game.settings.get(MODULE_ID, k); } catch (e) { return undefined; } };
const year = () => { try { return chron()?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
const fired = id => { try { return !!chron()?.events?.has?.(id); } catch (e) { return false; } };
const at = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
const ab = (a, k) => num(a?.system?.abilities?.[k]?.value);

async function d10(k) {
  const c = Math.max(0, Math.trunc(num(k)));
  if ( !c ) return {dice: [], roll: null};
  const r = await new Roll(`${c}d10`).evaluate();
  return {dice: r.dice?.[0]?.results?.map(x => x.result) ?? [], roll: r};
}
const card = (title, body) => `<div class="wodx-card wodx-crossing"><h3>${esc(title)}</h3>${body}</div>`;
const diceLine = d => d.length ? `<span class="wodx-quiet">(${d.join(", ")})</span>` : "";

export function registerRealmSettings() {
  game.settings.register(MODULE_ID, "avatarStorm", {name: "The Avatar Storm", hint: "By the date follows the chronicle's dated events (the Avatar Storm fires in 1999 on the classic branch). M20 calls the Storm optional.",
    scope: "world", config: true, type: String, choices: RR.STORM_MODES, default: "auto"});
  game.settings.register(MODULE_ID, "layerSound", {name: "Sound of the other worlds", hint: "When your token stands in the Penumbra, the Shadowlands, the Near Dreaming or the Net, play that world's loop on this computer.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => layerSoundSoon()});
  game.settings.register(MODULE_ID, "layerVolume", {name: "Volume of the other worlds", scope: "client", config: true, type: Number, range: {min: 0, max: 1, step: 0.05}, default: 0.4, onChange: () => layerSoundSoon(true)});
  game.settings.register(MODULE_ID, "layerRoot", {name: "Folder of the other worlds' loops", hint: "In the Data folder: penumbra.ogg, shadowlands.ogg, dreaming.ogg and net.ogg. A missing file plays nothing.",
    scope: "world", config: true, type: String, default: "wodx-kits/layers"});
}

/* -------------------------------------------- */
/*  The Avatar Storm                            */
/* -------------------------------------------- */

export function storm() {
  return RR.stormState(setting("avatarStorm") ?? "auto", fired("avatar-storm"));
}

/** Roll the Shredding Winds for a mage's token (Storyteller). shield: Shield of the Soul. Whispered to the Storyteller. */
export async function shreddingWinds(tokenDoc, {shield = false, reason = "crosses the Gauntlet", dice} = {}) {
  const a = tokenDoc?.actor;
  if ( !a ) return null;
  const s = storm();
  if ( !s.on ) return {off: true};
  if ( !RR.stormHurts({type: a.type}) ) return {immune: true};
  const plan = RR.shredding({paradox: a.system?.paradox?.permanent, arete: a.system?.advantages?.arete?.permanent, shield, fading: s.fading});
  const r = dice ? {dice, roll: null} : await d10(plan.pool);
  const res = RR.shredding({paradox: a.system?.paradox?.permanent, arete: a.system?.advantages?.arete?.permanent, shield, fading: s.fading}, r.dice);
  await ChatMessage.create({whisper: gmIds(), blind: true, speaker: {alias: "The Avatar Storm"}, rolls: r.roll ? [r.roll] : [],
    content: card("The Avatar Storm", `<p><strong>${esc(tokenDoc.name)}</strong> ${esc(reason)}.</p>
      <p>Shredding Winds: ${shield ? "Paradox only (Shield of the Soul)" : "Paradox + Arete"}, ${plan.pool} dice at 6: ${diceLine(r.dice)} <b>${res.levels} level${res.levels === 1 ? "" : "s"} of ${esc(res.damage)} damage</b>, unless the traveller is insulated.</p>
      <p class="wodx-quiet">Life magick, enhanced armour or Wonders may add soak. Spirits, shapechangers, unAwakened sorcerers and astral travellers are spared. M20 pdf 480-481 / pp. 479-480.</p>`)});
  return res;
}

/** A mage's token reaching the Penumbra level while the Storm rages: the Storyteller gets the roll. */
async function onLevelChange(doc, change) {
  if ( !isActiveGM() || !("level" in change) ) return;
  if ( tokenLayer(doc) !== "penumbra" || doc.actor?.type !== "Mage" ) return;
  if ( !storm().on ) return;
  await shreddingWinds(doc, {reason: "steps into the Penumbra"});
}

/* -------------------------------------------- */
/*  The Near Dreaming                           */
/* -------------------------------------------- */

const DREAM = {name: "Near Dreaming", bottom: 3000, tint: "#f4dcff"};

/** Add a Near Dreaming level to a scene: the physical map, warmer, on its own level. Nothing is deleted. */
export async function addDreamingLevel(scene = canvas?.scene) {
  if ( !game.user.isGM || !scene ) return null;
  const L = layersOf(scene);
  if ( L.dreaming ) return L.dreaming;
  const phys = L.physical;
  if ( !phys ) throw new Error(`${scene.name} has no level to copy.`);
  const src = phys.toObject();
  const span = Number.isFinite(phys.elevation?.top) && Number.isFinite(phys.elevation?.bottom) ? (phys.elevation.top - phys.elevation.bottom) || 20 : 20;
  if ( phys.getFlag(MODULE_ID, "layer") !== "physical" ) await phys.update({[`flags.${MODULE_ID}.layer`]: "physical"});
  const [lvl] = await scene.createEmbeddedDocuments("Level", [{
    name: DREAM.name, elevation: {bottom: DREAM.bottom, top: DREAM.bottom + span},
    background: {src: src.background?.src ?? null, color: src.background?.color ?? "#000000", tint: DREAM.tint, alphaThreshold: src.background?.alphaThreshold ?? 0.75},
    foreground: {src: src.foreground?.src ?? null, tint: DREAM.tint, alphaThreshold: src.foreground?.alphaThreshold ?? 0.75},
    textures: src.textures ?? {}, visibility: {levels: []},
    flags: {[MODULE_ID]: {layer: "dreaming", twinOf: phys.id}}
  }]);
  return lvl;
}

/** A trod between two scenes' Near Dreaming levels: a Teleport Token region on each, the road's kind on its flags. */
export async function makeTrod(from, to, {kind = "silver", gate = "near"} = {}) {
  if ( !game.user.isGM ) return null;
  const a = layersOf(from).dreaming, b = layersOf(to).dreaming;
  if ( !a || !b ) throw new Error(`Both scenes need a Near Dreaming level first: ${[!a && from.name, !b && to.name].filter(Boolean).join(", ")}.`);
  const T = RR.TRODS[kind] ?? RR.TRODS.silver;
  const region = (scene, level, other) => {
    const size = (scene.grid?.size ?? 100) * 2;
    const d = scene.dimensions ?? {};
    const cx = (d.sceneX ?? 0) + (d.sceneWidth ?? scene.width ?? 2000) / 2, cy = (d.sceneY ?? 0) + (d.sceneHeight ?? scene.height ?? 2000) / 2;
    return {name: `${T.label} to ${other.name}`, color: "#e6b8ff", shapes: [{type: "rectangle", x: cx, y: cy, width: size, height: size, anchorX: 0.5, anchorY: 0.5, rotation: 0}],
      elevation: {bottom: null, top: null}, levels: [level.id], flags: {[MODULE_ID]: {trod: kind, gate, to: other.id}}};
  };
  const [ra] = await from.createEmbeddedDocuments("Region", [region(from, a, to)]);
  const [rb] = await to.createEmbeddedDocuments("Region", [region(to, b, from)]);
  const behavior = target => ({type: "teleportToken", name: "Trod", system: {destinations: [target.uuid], placement: "random", snap: true, choice: true}});
  await ra.createEmbeddedDocuments("RegionBehavior", [behavior(rb)]);
  await rb.createEmbeddedDocuments("RegionBehavior", [behavior(ra)]);
  return {from: ra, to: rb};
}

const glamourOf = a => num(a?.system?.advantages?.glamour?.temporary ?? a?.system?.advantages?.glamour?.permanent);
const banalityOf = a => {
  const b = a?.system?.advantages?.banality;
  // A mortal sheet keeps no Banality: an ordinary mortal stands at 7 or more (C20); WoDX takes 7 (house rule)
  return b && (num(b.permanent) || num(b.temporary)) ? num(b.temporary ?? b.permanent) || num(b.permanent) : (a?.type === "Changeling" ? 3 : 7);
};

/** Storyteller: the selected tokens go through a gateway into the Near Dreaming, or back out. The Mists for each. */
export async function dreamingGate({enchanted = [], leave = null} = {}) {
  if ( !game.user.isGM ) { ui.notifications.warn("The Storyteller opens the gateway."); return null; }
  const tokens = canvas?.tokens?.controlled?.map(t => t.document) ?? [];
  if ( !tokens.length ) { ui.notifications.warn("Select the travellers' tokens first."); return null; }
  const scene = tokens[0].parent;
  const L = layersOf(scene);
  const out = leave ?? tokens.every(t => tokenLayer(t) === "dreaming" || t.actor?.statuses?.has(STATUS.dreaming.id));
  const now = game.time.worldTime;
  const lines = [];
  for ( const t of tokens ) {
    const a = t.actor;
    const fae = a?.type === "Changeling";
    const m = RR.mists({glamour: glamourOf(a), banality: banalityOf(a), enchanted: enchanted.includes(t.id) || enchanted === true, fae});
    if ( !out && !m.canEnter ) { lines.push(`<li><strong>${esc(t.name)}</strong>: stays behind. ${esc(m.why)}</li>`); continue; }
    await applyLocally(t, out
      ? {remove: [STATUS.dreaming.id], level: L.physical?.id ?? null, world: {in: "physical", since: now}}
      : {add: [STATUS.dreaming.id], level: L.dreaming?.id ?? null, world: {in: "dreaming", since: now}});
    lines.push(`<li><strong>${esc(t.name)}</strong>${fae ? "" : ` (Glamour ${glamourOf(a)}, Banality ${banalityOf(a)})`}: ${esc(fae ? (out ? "steps back into the mortal world." : "steps through.") : (out ? m.leave : m.entry))}</li>`);
  }
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"}, content: card(out ? "Out of the Near Dreaming" : "Into the Near Dreaming",
    `<ul>${lines.join("")}</ul>${L.dreaming ? "" : `<p class="wodx-quiet">This scene has no Near Dreaming level yet; only the status changed. Add one from the Penumbra and Shadowlands window.</p>`}
     <p class="wodx-quiet">The Mists by Glamour less Banality (C20 pdf 304-305 / pp. 303-304; WoDX's steps). Time there runs at about the mortal rate; Travel Arts and Unleashing are easier.</p>`)});
  Hooks.callAll("wodxDreamingGate", {out, tokens});
  return {out, lines: lines.length};
}

export async function dreamingDialog() {
  if ( !game.user.isGM ) return;
  const tokens = canvas?.tokens?.controlled ?? [];
  if ( !tokens.length ) { ui.notifications.warn("Select the travellers' tokens first."); return null; }
  const rows = tokens.filter(t => t.actor?.type !== "Changeling").map(t => `<div class="form-group"><label><input type="checkbox" name="ench" value="${t.id}"> ${esc(t.name)} is enchanted</label></div>`).join("");
  const r = await foundry.applications.api.DialogV2.wait({classes: ["wodx", "wodx-dialog"], window: {title: "A gateway to the Near Dreaming"}, rejectClose: false,
    content: `<p>${esc(tokens.map(t => t.name).join(", "))}</p>${rows}<p class="wodx-quiet">A mortal or other creature with no Glamour of its own goes through only if enchanted.</p>`,
    buttons: [{action: "in", label: "Go through", default: true, callback: (e, b) => ({leave: false, ench: [...b.form.querySelectorAll("input[name=ench]:checked")].map(i => i.value)})},
      {action: "out", label: "Come back out", callback: (e, b) => ({leave: true, ench: []})}, {action: "close", label: "Close"}]});
  if ( !r || r === "close" ) return;
  return dreamingGate({enchanted: r.ench, leave: r.leave});
}

/* -------------------------------------------- */
/*  Disembodiment                               */
/* -------------------------------------------- */

export const DISEMBODY_TYPE = "wodx-disembodiment";

/** Active GM: a living traveller beyond the Penumbra for three phases of the moon. Proposed once per stay. */
export async function checkDisembodiment(now = game.time.worldTime) {
  if ( !isActiveGM() || !chron()?.propose ) return 0;
  let k = 0;
  for ( const actor of game.actors ) {
    const since = actor.getFlag(MODULE_ID, "deepSince");
    if ( !Number.isFinite(since) || !actor.statuses?.has(STATUS.deep.id) ) continue;
    const d = RR.disembodiment(now - since);
    if ( !d.due || actor.getFlag(MODULE_ID, "disembodyWarned") === since ) continue;
    await actor.setFlag(MODULE_ID, "disembodyWarned", since);
    await chron().propose({type: DISEMBODY_TYPE, key: `${DISEMBODY_TYPE}:${actor.id}:${since}`, title: `${actor.name}: Disembodiment`,
      detail: `${actor.name} has been beyond the Penumbra for ${Math.floor(d.days)} days, past three phases of the moon. The body starts to fade into spirit stuff (M20 pdf 89-90 / pp. 88-89). The book gives no roll; approve to mark it begun, and decide how it shows.`,
      data: {actorId: actor.id, since}});
    k++;
  }
  return k;
}
export function registerDisembodiment() {
  chron()?.registerApprovalHandler?.(DISEMBODY_TYPE, {label: "Disembodiment", approve: async e => {
    const actor = game.actors.get(e.data?.actorId);
    if ( !actor ) throw new Error("The character is gone");
    await actor.setFlag(MODULE_ID, "disembodied", {since: e.data.since, begun: game.time.worldTime});
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"}, content: card("Disembodiment", `<p><strong>${esc(actor.name)}</strong> begins to turn to spirit stuff. The mind keeps on; the body fades. The Storyteller decides the rest.</p>`)});
  }});
}
/** Record when an actor went beyond the Penumbra, and forget it on return. */
function onDeepStatus(effect, on) {
  const actor = effect?.parent;
  if ( !actor?.isOwner || !effect.statuses?.has?.(STATUS.deep.id) ) return;
  if ( game.users.activeGM && !isActiveGM() ) return;
  if ( on ) actor.setFlag(MODULE_ID, "deepSince", game.time.worldTime);
  else actor.unsetFlag(MODULE_ID, "deepSince");
}

/* -------------------------------------------- */
/*  The Net                                     */
/* -------------------------------------------- */

export const netOpen = () => RR.netOpen(year());

/** The selected tokens jack in, or out. The body lies still while the mind is in the Net (house rule: the article is silent). */
export async function jack() {
  const tokens = canvas?.tokens?.controlled?.map(t => t.document) ?? [];
  if ( !tokens.length ) { ui.notifications.warn("Select the token first."); return null; }
  if ( !netOpen() ) { ui.notifications.warn(`There is no Net to enter before ${RR.NET_FROM}.`); return null; }
  const names = [];
  for ( const t of tokens ) {
    const a = t.actor;
    if ( !a?.isOwner ) continue;
    const on = !a.statuses?.has(STATUS.net.id);
    await a.toggleStatusEffect(STATUS.net.id, {active: on});
    names.push(`${t.name} ${on ? "jacks in" : "jacks out"}`);
  }
  if ( names.length ) await ChatMessage.create({speaker: {alias: "The Net"}, whisper: [...new Set([game.user.id, ...gmIds()])],
    content: card("The Net", `<p>${esc(names.join("; "))}.</p><p class="wodx-quiet">While in the Net the body lies still and senses nothing around it (house rule). Initiative is Wits + Computer; a deck's speed adds actions.</p>`)});
  layerSoundSoon();
  return names;
}

/** Net combat between the selected token and the targeted one (or a system). */
export async function netContest({a, b, programA = 0, programB = 0, protectA = 0, protectB = 0, system = null} = {}) {
  const A = a?.actor, B = b?.actor;
  const sideA = {intelligence: at(A, "intelligence"), computer: ab(A, "computer"), program: programA};
  const sideB = system ? {...RR.netSystem(system), program: programB} : {intelligence: at(B, "intelligence"), computer: ab(B, "computer"), program: programB};
  const pa = RR.netPool(sideA), pb = RR.netPool(sideB);
  const ra = await d10(pa.pool), rb = await d10(pb.pool);
  const x = RR.netExchange(sideA, sideB, ra.dice, rb.dice, {witsA: at(A, "wits"), witsB: system ? 0 : at(B, "wits"), protectA, protectB});
  const nameB = system ? `a system of ${system} CPU${system === 1 ? "" : "s"}` : (b?.name ?? "the foe");
  const who = x.winner === "a" ? a?.name : x.winner === "b" ? nameB : null;
  await ChatMessage.create({speaker: {alias: "The Net"}, rolls: [ra.roll, rb.roll].filter(Boolean),
    content: card("Net combat", `<p><strong>${esc(a?.name)}</strong>: Intelligence + Computer ${pa.pool} at 6 ${diceLine(ra.dice)}${pa.auto ? `, +${pa.auto} from the program` : ""}: ${x.a}.</p>
      <p><strong>${esc(nameB)}</strong>: ${pb.pool} at 6 ${diceLine(rb.dice)}${pb.auto ? `, +${pb.auto} from the program` : ""}: ${x.b}.</p>
      <p><b>${who ? `${esc(who)} wins: ${x.damageDice} damage dice, soaked with ${x.soakPool} (Wits and protection)` : "Neither gains ground."}</b></p>
      <p class="wodx-quiet">World of Future Darkness p. 22 (pdf 9).</p>`)});
  return x;
}

/* -------------------------------------------- */
/*  The Otherworld rolls window                  */
/* -------------------------------------------- */

const ROLLS = {
  storm: "The Avatar Storm (the selected mage)",
  bridge: "The Rite of the Opened Bridge (the ritemaster)",
  wayfare: "Wayfare: a portal onto a trod (the selected changeling)",
  maelstrom: "A Maelstrom's damage by bells",
  net: "Net combat (selected against targeted, or a system)"
};

export async function rollsDialog() {
  const sel = canvas?.tokens?.controlled?.[0]?.document ?? null;
  const tgt = [...(game.user.targets ?? [])][0]?.document ?? null;
  const rows = Object.entries(ROLLS).filter(([k]) => k !== "net" || netOpen()).filter(([k]) => k !== "storm" || game.user.isGM);
  const r = await foundry.applications.api.DialogV2.wait({classes: ["wodx", "wodx-dialog"], window: {title: "Otherworld rolls"}, position: {width: 520}, rejectClose: false,
    content: `<div class="form-group"><label>Roll</label><select name="kind" data-fixed>${rows.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></div>
      <p class="wodx-quiet">${sel ? `Selected: ${esc(sel.name)}.` : "Nothing selected."}${tgt ? ` Targeted: ${esc(tgt.name)}.` : ""}</p>
      <div class="form-group"><label>Caern level (here / the far one)</label><input type="number" name="caern" value="3" min="1" max="5"><input type="number" name="target" value="3" min="1" max="5"></div>
      <div class="form-group"><label><input type="checkbox" name="totem"> The pack totem matches the caern's</label></div>
      <div class="form-group"><label><input type="checkbox" name="failed"> An earlier attempt failed</label></div>
      <div class="form-group"><label><input type="checkbox" name="shield"> Shield of the Soul</label></div>
      <div class="form-group"><label>Bells / Haunt rating</label><input type="number" name="bells" value="3" min="1" max="5"><input type="number" name="haunt" value="0" min="0" max="5"></div>
      <div class="form-group"><label>Programs (mine / theirs) and protection</label><input type="number" name="pa" value="0" min="0" max="10"><input type="number" name="pb" value="0" min="0" max="10"><input type="number" name="prot" value="0" min="0" max="10"></div>
      <div class="form-group"><label>Or a system of so many CPUs</label><input type="number" name="cpus" value="0" min="0" max="12"></div>`,
    buttons: [{action: "roll", label: "Roll", default: true, callback: (e, b) => Object.fromEntries([...b.form.elements].filter(x => x.name).map(x => [x.name, x.type === "checkbox" ? x.checked : x.value]))},
      {action: "close", label: "Close"}]});
  if ( !r || r === "close" ) return null;
  if ( r.kind === "storm" ) return sel ? shreddingWinds(sel, {shield: r.shield}) : ui.notifications.warn("Select the mage first.");
  if ( r.kind === "bridge" ) {
    const a = sel?.actor;
    if ( !a ) { ui.notifications.warn("Select the ritemaster first."); return null; }
    const plan = RR.openedBridge({wits: at(a, "wits"), enigmas: ab(a, "enigmas"), caern: r.caern, target: r.target, totemMatch: r.totem, failedBefore: r.failed});
    const roll = await d10(plan.pool);
    const res = RR.openedBridgeResult(plan, roll.dice);
    await ChatMessage.create({speaker: {alias: sel.name}, rolls: roll.roll ? [roll.roll] : [], content: card("The Rite of the Opened Bridge",
      `<p>Wits + Enigmas${r.totem ? " + 3 (the totem)" : ""}: ${plan.pool} dice at ${plan.diff} ${diceLine(roll.dice)}, ${res.successes} of ${plan.need} needed.</p>
       <p><b>${res.open ? `The bridge opens: travel takes ${res.speed}; renew it ${res.renew}.` : res.botch ? "A botch." : "It does not open; the next try is at +1 difficulty."}</b></p>
       <p class="wodx-quiet">A Pathstone at each caern, both performing it at a moot. W20 pdf 209 / p. 207. A Moon Bridge from a level ${r.caern} caern reaches ${RR.bridgeReach(r.caern).toLocaleString()} miles (pdf 313 / p. 311).</p>`)});
    return res;
  }
  if ( r.kind === "wayfare" ) {
    const a = sel?.actor;
    if ( !a ) { ui.notifications.warn("Select the changeling first."); return null; }
    const dots = re => num(a.items?.find(i => re.test(i.name))?.system?.value);
    const wayfare = dots(/^wayfare$/i), fae = dots(/^fae( realm)?$/i);
    if ( wayfare < 3 || fae < 5 ) { ui.notifications.warn(`${sel.name} needs Wayfare 3 and the Fae Realm at 5 (has ${wayfare} and ${fae}).`); return null; }
    const pool = wayfare + fae;
    const roll = await d10(pool);
    const c = roll.dice.filter(x => x >= 8).length - roll.dice.filter(x => x === 1).length;
    const res = RR.wayfarePortal({successes: Math.max(0, c), botch: !roll.dice.some(x => x >= 8) && roll.dice.includes(1)});
    await ChatMessage.create({speaker: {alias: sel.name}, rolls: roll.roll ? [roll.roll] : [], content: card("Wayfare: a portal onto a trod",
      `<p>Wayfare + Fae, ${pool} dice at 8 ${diceLine(roll.dice)}.</p><p><b>${res.danger ? "A botch: the portal opens somewhere dangerous." : res.chosen ? "The caster chooses the trod." : res.open ? "A portal opens onto a Near Dreaming trod, the Storyteller's pick." : "No portal."}</b></p>
       <p class="wodx-quiet">Wayfare 3 with the Fae Realm at 5; an extended action of 5 successes picks the trod. C20 pdf 309 / p. 308. The difficulty is the Storyteller's; 8 is used here.</p>`)});
    return res;
  }
  if ( r.kind === "maelstrom" ) {
    const m = RR.maelstromDice(r.bells, {haunt: r.haunt});
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "The Tempest"}, content: card("The Maelstrom",
      `<p>${r.bells} bell${num(r.bells) === 1 ? "" : "s"}: ${m.dice} damage dice each turn in the open.</p>
       ${num(r.haunt) ? `<p>${m.sheltered ? "The Haunt shelters them fully." : `The Haunt holds for ${m.breaksAfterHours} hour${m.breaksAfterHours === 1 ? "" : "s"}, then the storm breaks through; its rating adds to soak.`}</p>` : ""}
       <p class="wodx-quiet">Wraith 20th pdf 351, 355, 361 / pp. 286, 290, 296. Spectres take no harm.</p>`)});
    return m;
  }
  if ( r.kind === "net" ) {
    if ( !sel ) { ui.notifications.warn("Select the netrunner first."); return null; }
    const cpus = num(r.cpus);
    if ( !cpus && !tgt ) { ui.notifications.warn("Target the foe, or give the system's CPUs."); return null; }
    return netContest({a: sel, b: tgt, programA: num(r.pa), programB: num(r.pb), protectA: num(r.prot), system: cpus || null});
  }
  return null;
}

/* -------------------------------------------- */
/*  Layer sound (each client)                    */
/* -------------------------------------------- */

let playing = null, playingSrc = null, timer = null;
const exists = new Map();
async function fileThere(src) {
  if ( exists.has(src) ) return exists.get(src);
  let ok = false;
  try { const r = await fetch(foundry.utils.getRoute?.(src) ?? src, {method: "HEAD"}); ok = r.ok; } catch (e) { ok = false; }
  exists.set(src, ok);
  return ok;
}
export function layerSoundSoon(volumeOnly = false) {
  if ( volumeOnly && playing ) { try { playing.volume = num(setting("layerVolume")); } catch (e) { /* */ } }
  clearTimeout(timer);
  timer = setTimeout(() => applyLayerSound().catch(e => console.warn("WoDX | layer sound", e)), 300);
}
export function wantedLayerSound() {
  if ( setting("layerSound") === false ) return null;
  const t = canvas?.tokens?.controlled?.[0]?.document;
  if ( !t ) return null;
  return RR.layerSoundFor({layer: tokenLayer(t), inNet: !!t.actor?.statuses?.has(STATUS.net.id)}, setting("layerRoot") || "wodx-kits/layers");
}
export async function applyLayerSound() {
  const src = wantedLayerSound();
  if ( src === playingSrc ) return src;
  if ( playing ) { try { playing.stop(); } catch (e) { /* */ } playing = null; playingSrc = null; }
  if ( !src || !(await fileThere(src)) ) return null;
  const AH = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
  playing = await AH?.play?.({src, volume: num(setting("layerVolume") ?? 0.4), loop: true}, false);
  playingSrc = src;
  return src;
}
export const layerSoundNow = () => playingSrc;

/* -------------------------------------------- */
/*  Wiring                                       */
/* -------------------------------------------- */

export function setupRealms() {
  Hooks.on("updateToken", (doc, change) => {
    onLevelChange(doc, change).catch(e => console.error("WoDX | storm", e));
    if ( ("level" in change) && doc.object?.controlled ) layerSoundSoon();
  });
  Hooks.on("controlToken", () => layerSoundSoon());
  Hooks.on("canvasReady", () => layerSoundSoon());
  Hooks.on("createActiveEffect", e => { onDeepStatus(e, true); if ( e.statuses?.has?.(STATUS.net.id) ) layerSoundSoon(); });
  Hooks.on("deleteActiveEffect", e => { onDeepStatus(e, false); if ( e.statuses?.has?.(STATUS.net.id) ) layerSoundSoon(); });
  Hooks.on("updateWorldTime", () => { if ( !chron()?.isSkipping?.() ) checkDisembodiment().catch(e => console.error("WoDX |", e)); });
  Hooks.on("wodxSkipEnd", () => checkDisembodiment().catch(e => console.error("WoDX |", e)));
  if ( chron()?.registerApprovalHandler ) registerDisembodiment(); else Hooks.once("wodxChronicleReady", () => registerDisembodiment());
}
