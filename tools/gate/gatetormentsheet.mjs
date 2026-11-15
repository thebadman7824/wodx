/**
 * Torment on the sheet (B6482). In Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatetormentsheet.mjs?${Date.now()}`)).run()
 * A suspicion from the line-parity check: WoDX Actions writes a demon's Torment to a field the sheet does not draw.
 * This drives the real trigger and reads the open sheet itself:
 *   1. the open sheet draws the Torment the actor holds (permanent and temporary boxes)
 *   2. an Evoke with the dark effect chosen (WoDX Actions' own window) adds a temporary point, and the open sheet
 *      redraws with it
 * Result: Data/wodx-gate/gatetormentsheet-result.json. Removes what it made; the clock never moves.
 */
import {gate, waitFor} from "./kit.mjs";

const n = v => Number(v) || 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** What the open sheet draws for Torment: the data-value of its permanent row and its temporary row. */
function drawn(app) {
  const el = app?.element?.[0] ?? app?.element ?? null;
  const perm = el?.querySelector?.('[data-name$="torment.permanent"]');
  const temp = el?.querySelector?.('[data-name$="torment.temporary"]');
  return {perm: perm ? n(perm.dataset.value) : null, temp: temp ? n(temp.dataset.value) : null};
}

export async function run() {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  const G = gate("gatetormentsheet");
  const A = game.wodxActions;
  let hook = null;
  try {
    const lore = (nm, v) => ({name: nm, type: "Power", system: {game: "demon", type: "wod.types.lore", value: v}});
    const [dv] = await G.make(Actor, [{name: "Gate Torment Devil", type: "Demon", items: [lore("Lore of Flame", 2)]}]);
    // the system's create step resets some advantages over the create data, so the traits are written after it
    await dv.update({"system.house": "wod.bio.demon.devil", "system.faction": "wod.bio.demon.luciferan",
      "system.advantages.faith.permanent": 5, "system.advantages.faith.temporary": 5,
      "system.advantages.torment.permanent": 4, "system.advantages.torment.temporary": 0,
      "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
      "system.attributes.stamina.value": 3, "system.attributes.stamina.total": 3, "system.abilities.survival.value": 2});
    const sheet = dv.sheet;
    await sheet.render(true);
    await waitFor(() => drawn(sheet).perm !== null, 8000);

    await G.step("1. the open sheet draws the Torment the actor holds", async () => {
      const d = drawn(sheet), held = dv.system.advantages.torment;
      G.ok("1. the open sheet draws the Torment the actor holds", d.perm === 4 && d.temp === 0 && n(held.permanent) === 4,
        {drawn: d, held: {permanent: held.permanent, temporary: held.temporary}, sheet: sheet.constructor?.name});
    });

    await G.step("2. a dark Evoke adds a temporary point, and the open sheet shows it", async () => {
      const t0 = n(dv.system.advantages.torment.temporary), since = Date.now();
      hook = Hooks.on("renderDialogV2", (app, el) => {
        const root = el?.querySelector ? el : app.element;
        const evo = root?.querySelector?.('[name="evo"]');
        if ( !evo ) return;
        Hooks.off("renderDialogV2", hook); hook = null;
        setTimeout(() => {
          const set = (name, v) => { const f = root.querySelector(`[name="${name}"]`); if ( !f ) return; if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v); f.dispatchEvent(new Event("change", {bubbles: true})); };
          set("evo", "flame:1"); set("fs", 1); set("dark", true);
          root.querySelector('button[data-action="ok"]')?.click();
        }, 200);
      });
      A.demonEvoke({actor: dv});
      const carded = await waitFor(() => game.messages.some(m => m.timestamp >= since && /high-Torment effect, chosen/.test(text(m))), 15000);
      const held = await waitFor(() => n(dv.system.advantages.torment.temporary) === t0 + 1, 6000);
      const shown = await waitFor(() => drawn(sheet).temp === t0 + 1, 6000);
      G.ok("2. a dark Evoke adds a temporary point, and the open sheet shows it", carded && held && shown,
        {carded, held, shown, t0, now: n(dv.system.advantages.torment.temporary), drawn: drawn(sheet)});
    });
    await sheet.close();
    await sleep(300);
  } finally {
    if ( hook !== null ) Hooks.off("renderDialogV2", hook);
    return G.finish();
  }
}
