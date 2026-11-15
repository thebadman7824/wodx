/**
 * WoDX Storyteller gate: the Storyteller's tools for every line (B6320-B6326), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelinest.mjs?${Date.now()}`)).run()
 * Never moves the clock (between nights is called with a from and to of its own). Makes its own actors.
 *   1. the dashboard row of a Kuei-jin shows Yang and Yin Chi, not blood; a Garou's shows Rage and Gnosis
 *   2. between nights: approving the card takes a Chi a night from a Kuei-jin and leaves Rage to the moon
 *   3. ties: a changeling's Dreamers and a wraith's Haunt are ties to tend
 * Result: Data/wodx-gate/gatelinest-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";
const DAY = 86400;

export async function run() {
  const G = gate("gatelinest");
  const api = () => game.modules.get(MOD)?.api;
  const AP = () => game.modules.get("wodx-chronicle")?.api?.approvals;
  const players = game.users.filter(u => !u.isGM);
  const own = players.length ? Object.fromEntries(players.slice(0, 1).map(u => [u.id, 3])) : {default: 3};
  const wasBetween = game.settings.get(MOD, "betweenNights");
  try {
    await G.scene();
    const [kj, ga, ch, wr] = await G.make(Actor, [
      {name: "Gate LineST Kuei-jin", type: "Vampire", ownership: own, system: {settings: {variant: "kindredeast"}, advantages: {yangchi: {permanent: 6, temporary: 5}, yinchi: {permanent: 3, temporary: 2}, willpower: {permanent: 5, temporary: 5}}}},
      {name: "Gate LineST Garou", type: "Werewolf", ownership: own, system: {advantages: {rage: {permanent: 5, temporary: 1}, gnosis: {permanent: 4, temporary: 4}, willpower: {permanent: 5, temporary: 5}}}},
      {name: "Gate LineST Changeling", type: "Changeling", ownership: own},
      {name: "Gate LineST Wraith", type: "Wraith", ownership: own}
    ]);

    await G.step("1. dashboard pools", async () => {
      const party = api().dashboard.gather()?.party ?? [];
      const k = party.find(r => r.id === kj.id), g = party.find(r => r.id === ga.id);
      G.ok("1. dashboard pools", !!k && !k.blood && k.pools.map(p => p.key).join() === "yangchi,yinchi" && !!g && g.pools.map(p => p.key).join() === "rage,gnosis",
        {kj: k ? {blood: k.blood, pools: k.pools} : null, garou: g?.pools ?? null, players: players.length});
    });

    await G.step("2. between nights", async () => {
      await game.settings.set(MOD, "betweenNights", true);
      const from = game.time.worldTime, to = from + 3 * DAY;
      await api().upkeep.between({from, to, actorIds: [kj.id, ga.id], label: "gatelinest"});
      const entry = (AP()?.pending?.() ?? []).find(e => e.key === `between:${from}:${to}`);
      if ( entry ) await AP().decide(entry.id, "approve");
      const yang = Number(kj.system.advantages.yangchi.temporary), yin = Number(kj.system.advantages.yinchi.temporary), rage = Number(ga.system.advantages.rage.temporary);
      G.ok("2. between nights", yang + yin < 7, {queued: !!entry, yang, yin, rage});
    });

    await G.step("3. ties", async () => {
      await ch.createEmbeddedDocuments("Item", [{name: "Dreamers", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
      await wr.createEmbeddedDocuments("Item", [{name: "Haunt", type: "Feature", system: {type: "wod.types.background", value: 1}}]);
      const c = api().upkeep.tiesOf(ch).map(t => t.kind), w = api().upkeep.tiesOf(wr).map(t => t.kind);
      G.ok("3. ties", c.includes("dreamers") && w.includes("haunt"), {changeling: c, wraith: w});
    });
  } finally {
    try { await game.settings.set(MOD, "betweenNights", wasBetween); } catch (e) { /* as it was */ }
    return G.finish();
  }
}
