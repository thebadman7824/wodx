/**
 * WoDX Library: cyberware in the body (B3795 to B3797).
 *
 * A piece of cyberware is installed when its equipped box is ticked on a character. Then its own rows on the
 * system's bonus list turn on (and off again when the box is cleared), and the first time it goes in it costs
 * Humanity: the cost is rolled as printed, added to the character's Humanity Index (ten points to a dot, from the
 * Future Darkness article), and every ten points take a dot of Humanity (Gnosis for a shapeshifter). A card tells
 * the table what it took. RealSkinn gives some of the cost back.
 */
import * as G from "./gear-rules.mjs";

const MOD = G.MOD;
const fxOf = item => item?.flags?.[MOD]?.fx ?? null;
const isCyber = item => !!item?.flags?.[MOD]?.cyber;
const SHIFTERS = ["Werewolf", "Changing Breed"];

/** Which dots the cost comes from, and where they are kept. */
export function humanityTrack(actor) {
  if ( SHIFTERS.includes(actor?.type) ) return {label: "Gnosis", path: "system.advantages.gnosis.permanent", value: Number(actor.system?.advantages?.gnosis?.permanent) || 0};
  const p = actor?.system?.advantages?.path;
  if ( p ) return {label: p.custom || "Humanity", path: "system.advantages.path.permanent", value: Number(p.permanent) || 0};
  return null;
}

/** Take a piece's Humanity cost: returns what happened (also posted as a card). */
export async function install(item, {rng = Math.random, card = true} = {}) {
  const actor = item?.parent;
  if ( !actor || !isCyber(item) || item.flags?.[MOD]?.installed ) return null;
  const fx = fxOf(item) ?? {};
  const cost = G.humanityCost(item.flags[MOD].humanity, rng);
  const back = fx.humanityLess ? G.humanityCost(fx.humanityLess, rng) : {points: 0, faces: []};
  const points = Math.max(0, cost.points) - back.points;
  const before = Number(actor.flags?.[MOD]?.humanityLoss) || 0;
  const track = humanityTrack(actor);
  const r = G.dotsLost(before, points, track?.value ?? 0);
  const up = {[`flags.${MOD}.humanityLoss`]: r.lost};
  if ( track && r.dots ) up[track.path] = r.left;
  await item.update({[`flags.${MOD}.installed`]: true}, {wodxGearInstall: true});
  await actor.update(up);
  const out = {item: item.name, points, faces: cost.faces, back: back.points, lost: r.lost, dots: r.dots, left: r.left, track: track?.label ?? null};
  if ( card ) await postCard(actor, item, out);
  return out;
}

async function postCard(actor, item, o) {
  const esc = s => foundry.utils.escapeHTML?.(String(s)) ?? String(s);
  const said = G.fxSummary(fxOf(item) ?? {});
  const rolled = o.faces.length ? ` (rolled ${o.faces.join(", ")})` : "";
  const lines = [`<b>${esc(item.name)}</b> goes into ${esc(actor.name)}.`,
    said ? `Now: ${esc(said)}.` : "",
    `Humanity cost ${o.points + o.back}${rolled}${o.back ? `, ${o.back} back from the skin over it` : ""}: the Humanity Index has lost ${o.lost} points in all.`,
    o.dots ? `<b>${o.track} falls by ${o.dots}, to ${o.left}.</b>` : o.track ? `${o.track} holds at ${o.left}.` : "This character has no Humanity track: the points are kept for the Storyteller."];
  const gm = ChatMessage.getWhisperRecipients?.("GM")?.map(u => u.id) ?? [];
  const owners = game.users.filter(u => actor.testUserPermission?.(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper: [...new Set([...gm, ...owners])],
    content: `<div class="wodx-gear-install">${lines.filter(Boolean).map(l => `<p>${l}</p>`).join("")}</div>`});
}

export function setupGearInstall() {
  // The piece's own bonus rows follow the equipped box in the same update
  Hooks.on("preUpdateItem", (item, changes) => {
    const eq = changes?.system?.isequipped;
    if ( eq === undefined || !isCyber(item) || !Array.isArray(item.system?.bonuslist) ) return;
    if ( !item.system.bonuslist.some(b => b?.wodxGear) ) return;
    foundry.utils.setProperty(changes, "system.bonuslist", G.gearBonusList(item.system.bonuslist, !!eq));
  });
  Hooks.on("preCreateItem", (item, data) => {
    if ( !item.parent || !isCyber(item) || !item.system?.isequipped || !Array.isArray(item.system?.bonuslist) ) return;
    item.updateSource({"system.bonuslist": G.gearBonusList(item.system.bonuslist, true)});
  });
  // The first time it goes in, it costs Humanity (run by whoever ticked the box)
  Hooks.on("updateItem", (item, changes, options, userId) => {
    if ( userId !== game.user.id || options?.wodxGearInstall || changes?.system?.isequipped !== true ) return;
    install(item).catch(e => console.error(`${MOD} | cyberware install`, e));
  });
  Hooks.on("createItem", (item, options, userId) => {
    if ( userId !== game.user.id || !item.parent || !item.system?.isequipped ) return;
    install(item).catch(e => console.error(`${MOD} | cyberware install`, e));
  });
}

/** What the installed pieces give a character: {senses: {dark, mods}, body: {ease, potence}, limbs: [{name, soak, part}]}. */
export function installedFx(actor) {
  const out = {senses: {dark: null, mods: []}, body: {ease: 0, potence: 0}, limbs: [], names: []};
  for ( const i of actor?.items ?? [] ) {
    const fx = fxOf(i);
    if ( !fx || !isCyber(i) || !i.system?.isequipped ) continue;
    out.names.push(i.name);
    if ( fx.senses?.dark ) out.senses.dark ??= fx.senses.dark;
    for ( const [n, senses] of fx.senses?.mods ?? [] ) out.senses.mods.push({label: i.name, n, senses});
    out.body.ease = Math.max(out.body.ease, Number(fx.body?.ease) || 0);
    out.body.potence += Number(fx.body?.potence) || 0;
    if ( fx.limb?.soak ) out.limbs.push({name: i.name, soak: fx.limb.soak, part: fx.limb.part ?? "limb"});
  }
  return out;
}

export const gearInstallApi = () => ({install, installedFx, humanityTrack});
