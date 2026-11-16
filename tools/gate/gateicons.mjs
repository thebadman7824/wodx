/**
 * WoDX final audit gate (B6810): every Foundry core icon WoDX names, and every status effect's picture, loads.
 * In Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateicons.mjs?${Date.now()}`)).run()
 * Makes nothing and changes nothing; it only fetches pictures.
 *   1. every icons/svg picture the system and modules name is served by Foundry
 *   2. every token status (CONFIG.statusEffects, WoDX conditions included) has a picture that loads
 * The icon list is made from the repo by: grep -rhoE "icons/svg/[a-z0-9_-]+\.svg" modules system tools/gate | sort -u
 * Result: Data/wodx-gate/gateicons-result.json.
 */
import {gate} from "./kit.mjs";

const CORE = ["icons/svg/angel.svg","icons/svg/aura.svg","icons/svg/biohazard.svg","icons/svg/blind.svg","icons/svg/blood.svg","icons/svg/bones.svg","icons/svg/book.svg","icons/svg/cancel.svg","icons/svg/chest.svg","icons/svg/clockwork.svg","icons/svg/d10-grey.svg","icons/svg/d20-highlight.svg","icons/svg/daze.svg","icons/svg/degen.svg","icons/svg/door-closed.svg","icons/svg/door-exit.svg","icons/svg/door-open.svg","icons/svg/downgrade.svg","icons/svg/explosion.svg","icons/svg/eye.svg","icons/svg/falling.svg","icons/svg/fire.svg","icons/svg/fog.svg","icons/svg/frozen.svg","icons/svg/hazard.svg","icons/svg/holy-shield.svg","icons/svg/horse.svg","icons/svg/house.svg","icons/svg/invisible.svg","icons/svg/item-bag.svg","icons/svg/light.svg","icons/svg/lightning.svg","icons/svg/mill.svg","icons/svg/mystery-man.svg","icons/svg/net.svg","icons/svg/padlock.svg","icons/svg/pawprint.svg","icons/svg/poison.svg","icons/svg/portal.svg","icons/svg/regen.svg","icons/svg/shield.svg","icons/svg/skull.svg","icons/svg/sleep.svg","icons/svg/sound.svg","icons/svg/statue.svg","icons/svg/stone-path.svg","icons/svg/stoned.svg","icons/svg/sun.svg","icons/svg/sword.svg","icons/svg/tankard.svg","icons/svg/target.svg","icons/svg/temple.svg","icons/svg/terror.svg","icons/svg/trap.svg","icons/svg/unconscious.svg","icons/svg/waterfall.svg","icons/svg/windmill.svg","icons/svg/wing.svg"];

async function loads(src) {
  try { const r = await fetch(foundry.utils.getRoute(src), {method: "HEAD"}); return r.ok; } catch (e) { return false; }
}

export async function run() {
  const G = gate("gateicons");
  try {
    await G.step("1. core icons", async () => {
      const bad = [];
      for ( const src of CORE ) if ( !(await loads(src)) ) bad.push(src);
      G.ok("1. core icons", bad.length === 0, {checked: CORE.length, missing: bad});
    });
    await G.step("2. status pictures", async () => {
      const list = (CONFIG.statusEffects ?? []).filter(s => s?.img);
      const bad = [];
      for ( const s of list ) if ( !(await loads(s.img)) ) bad.push(`${s.id}: ${s.img}`);
      G.ok("2. status pictures", list.length > 0 && bad.length === 0, {checked: list.length, missing: bad});
    });
  } finally { return G.finish(); }
}
