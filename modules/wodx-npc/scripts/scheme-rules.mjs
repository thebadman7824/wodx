/**
 * WoDX NPC (Antagonist Lines Desk G5, B6674): foes with plans, the pure part. No Foundry.
 *
 * A faction that is one of the antagonist groups (WoDX Chronicle's antagonist table: by its name, or by its leader's
 * sheet) runs a scheme clock of four steps. Each weekly faction turn asks the Storyteller for one step (the approval
 * queue, so the AI Storyteller of a Lone Chronicle can take it too). Each step leaves a sign the players can see in
 * the world, and the last step changes the world: the faction gains a Background dot, takes up a new goal, and the
 * Wyrm's servants plant a source of corruption at a place they hold, which the Penumbra then shows.
 * Words are WoDX's own; the plans are house readings of what each group wants in its books (pages on each row).
 */
import {groupOf, groupOfActor, activeIn} from "../../wodx-chronicle/scripts/antagonist-rules.mjs";

export const STEPS = 4;
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** Plan per group: goal, the Background the finished plan raises, the move it takes up next, signs (steps 1 to 3),
 *  the finished sign, and for Wyrm groups the kind of corruption source it plants. */
export const PLANS = {
  setite: {goal: "draw the town into vice", asset: "herd", next: "recruit", page: "V20 pdf 61",
    signs: ["A new house of pleasure opens its back rooms after dark.", "Respectable people are seen leaving it at dawn, and lie about where they were.", "Debts and secrets change hands; a few leading families stop going to church."],
    done: "Half the town's great owe something to the house of pleasure now, and it shows."},
  nephandi: {goal: "open a Caul and bring someone through it", asset: "retainers", next: "recruit", page: "M20 pdf 228-234",
    signs: ["Animals will not cross a certain threshold, and milk sours near it.", "Someone gifted goes missing for three nights and comes back changed.", "A wrongness in the air: clocks stop, mirrors show the room a moment late."],
    done: "Something was born backwards in the dark, and the cabal has a new member."},
  wyrm: {goal: "foul the land and breed Banes", asset: "retainers", next: "expand", source: "cult", page: "W20 pdf 430-439",
    signs: ["Fish float belly up in the stream below the old works.", "Sickly children and short tempers in the houses downwind.", "A stink that will not wash out, and dogs that bite their masters."],
    done: "The place is fouled: the cult has made a nest for the Wyrm's spirits there."},
  pentex: {goal: "buy up the valley and poison it for profit", asset: "resources", next: "expand", source: "pentex", page: "W20 pdf 463-464",
    signs: ["Surveyors from a company nobody has heard of walk the fields.", "Farms change hands at good prices; the buyers want the water rights.", "A works goes up behind a fence, and the river runs a strange colour."],
    done: "The company owns the valley now, and its works feed the Wyrm."},
  infernal: {goal: "bind the town's great to the Pit by pacts", asset: "status", next: "scheme", page: "V20 pdf 394-403",
    signs: ["A rich family's luck turns overnight; their rivals fall ill.", "A burned circle in a field, and a smell of sulphur on the wind.", "People who signed something cannot meet a priest's eye."],
    done: "The town's great are bound by pacts, and their luck runs only while they serve."},
  technocracy: {goal: "make the place plain, measured and ordered", asset: "contacts", next: "hunt", page: "M20 pdf 169",
    signs: ["New officials with ledgers count the houses and ask odd questions.", "The old hedge-witch keeps the door shut; folk tales get laughed at in the tavern.", "Lamps, clocks and schoolmasters arrive; the old wonders feel thin."],
    done: "The place is mapped, measured and ordered, and magick works harder here."},
  talmahera: {goal: "gather the old secrets of the dead", asset: "contacts", next: "scheme", page: "V20 pdf 414-415",
    signs: ["Graves opened and closed again, with nothing taken but the names.", "Old books bought up at any price by a quiet agent.", "Scholars of old tongues are found dead with their papers gone."],
    done: "The hidden hand has what it came for, and the trail goes cold."},
  akuma: {goal: "feed a Yama King's hunger", asset: "herd", next: "recruit", page: "Kindred of the East pdf 86-87",
    signs: ["Shrines are fouled at night and the offerings left to rot.", "A sickness of despair: people stop eating and sit in the dark.", "Bodies found drained of more than blood, eyes open and empty."],
    done: "The devil-ridden have their feast, and their master is fed."},
  apepnu: {goal: "wake a cult of the Devourer", asset: "herd", next: "recruit", page: "Mummy 2nd edition pdf 35-36",
    signs: ["Serpent marks scratched on doorways overnight.", "Grave goods stolen from the old tombs; the guards saw nothing.", "A sermon in a cellar about the end of all things draws a crowd."],
    done: "The Devourer has a cult here now, and it is growing."},
  inquisition: {goal: "root out the monsters of the town", asset: "contacts", next: "hunt", page: "Hunters Hunted II pdf 118-126",
    signs: ["A stranger in black asks the priest about sudden deaths.", "Neighbours are questioned one by one about who keeps odd hours.", "A list of names is nailed up, and some doors stay shut after dark."],
    done: "The hunters know who the town's monsters are, or think they do."},
  marauder: {goal: "unmake the town's sense of the real", asset: "retainers", next: "expand", page: "M20, the Marauders",
    signs: ["The church bell rings at noon with nobody in the tower.", "A street that was not there yesterday, and nobody finds it odd.", "Laughter in the market, and the goods turn into other goods."],
    done: "Madness has a foothold here; the real bends where the Marauder walks."}
};
/** Any other group plays the general plan. */
export const GENERAL = {goal: "tighten its grip on the place", asset: "influence", next: "scheme", page: "the group's book",
  signs: ["Strangers watch the gates and the inns.", "A quarrel between leading families that nobody can explain.", "People who spoke out go quiet, or go away."],
  done: "The group's grip on the place is tighter."};
export const planFor = key => PLANS[key] ?? GENERAL;

/** The group a faction is: an explicit key, else its name, else its leader's sheet. */
export function groupOfFaction(f, leader = null, explicit = null) {
  if ( explicit ) return explicit;
  return groupOf([f?.name ?? ""])?.key ?? (leader ? groupOfActor(leader)?.key ?? null : null);
}

/** The schemes that may take a step this turn: [{faction, group, step}]. clocks: {factionId: {group, step, done}}. */
export function due(factions = [], clocks = {}, {year, leaders = {}} = {}) {
  const out = [];
  for ( const f of factions ) {
    if ( !f?.id || f.dormant ) continue;
    const c = clocks[f.id] ?? {};
    const group = groupOfFaction(f, leaders[f.id] ?? null, c.group ?? null);
    if ( !group || c.paused ) continue;
    if ( !activeIn(group, year).active && group !== "marauder" ) continue;
    out.push({faction: f.id, group, step: num(c.step)});
  }
  return out;
}

/** What one step does: {step, sign, finished, changes (faction ops, on the last step), source (Wyrm place source)}. */
export function stepOf(faction, group, step) {
  const p = planFor(group), next = Math.min(STEPS, num(step) + 1), finished = next >= STEPS;
  const sign = finished ? p.done : p.signs[next - 1] ?? p.signs[p.signs.length - 1];
  const changes = !finished ? [] : [
    p.asset === "influence" ? {op: "bg", faction: faction.id, key: "influence", sphere: firstSphere(faction), delta: 1} : {op: "bg", faction: faction.id, key: p.asset, delta: 1},
    {op: "goal", faction: faction.id, goal: {move: p.next, note: `After the scheme: ${p.goal}`}}
  ];
  return {step: next, sign, finished, changes, source: finished ? p.source ?? null : null, goal: p.goal};
}
const firstSphere = f => Object.entries(f?.assets?.influence ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "underworld";

/** The clock after a step: finished plans start again at 0, counting how many have finished. */
export function advanced(clock = {}, res, group, now = 0) {
  const done = num(clock.done) + (res.finished ? 1 : 0);
  return {...clock, group, step: res.finished ? 0 : res.step, done, last: now,
    log: [{at: now, step: res.step, sign: res.sign}, ...(clock.log ?? [])].slice(0, 20)};
}
