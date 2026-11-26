/**
 * WoDX Actions: the ghosts of V20 Dark Ages p. 403 (B7676), the Foundry side; ghost-da-rules.js holds the rules.
 *   Manifest: a point of Passion lets the ghost touch the physical world for one turn (a timed effect; the sample's
 *   Strength rises to its manifested value for that turn). Its Disciplines need no manifesting: main.js reads Passion
 *   as its blood, so Use a Discipline works across the Shroud.
 *   Deathsight and Lifesight: a roll, and what the ghost sees.
 *   The Storyteller makes the book's sample ghost, the Masked Trickster.
 */
import * as G from "../../wodx-rules/actions/ghost-da-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, attr, findAbility, notify } = ctx;
    const passion = a => ({ value: n(a?.system?.advantages?.pathos?.temporary), max: n(a?.system?.advantages?.pathos?.max) || 10 });
    const ghostOnly = a => { if (G.isDAGhost(a)) return true; notify(`${a?.name ?? "This sheet"} is not a Dark Ages ghost (the Storyteller marks one through "A ghost (V20 Dark Ages)").`); return false; };

    async function manifest(actor) {
        if (!ghostOnly(actor)) return null;
        const p = passion(actor);
        if (p.value < G.GHOST_DA.manifestCost) { notify(`${actor.name} has no Passion left to manifest.`); return null; }
        await actor.update({ "system.advantages.pathos.temporary": p.value - G.GHOST_DA.manifestCost });
        const up = actor.flags?.[MOD]?.daGhost?.manifest ?? {};
        const changes = Object.entries(up).map(([k, v]) => ({ key: `system.attributes.${k}.value`, mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: String(v) }));
        const fx = { name: "Manifested", img: "icons/svg/aura.svg", changes, duration: { rounds: G.GHOST_DA.manifestTurns, turns: 0 }, statuses: ["wodx-manifested"],
            flags: { [MOD]: { ghostManifest: true } }, description: `Touches the physical world for a turn (${G.GHOST_DA.page}).` };
        if (game.combat?.started) fx.duration.startRound = game.combat.round;
        for (const e of actor.effects.filter(e => e.flags?.[MOD]?.ghostManifest)) await e.delete().catch(() => null);
        await actor.createEmbeddedDocuments("ActiveEffect", [fx]);
        for (const t of actor.getActiveTokens?.(false, true) ?? []) if (t.hidden && game.user.isGM) await t.update({ hidden: false }).catch(() => null);
        await post(actor, `${actor.name} manifests`, `<div class="vta-note">One point of Passion: for this turn the ghost can touch, move and be seen in the physical world${changes.length ? ` (${Object.entries(up).map(([k, v]) => `${k} ${v}`).join(", ")} while manifested)` : ""}. Its Disciplines need no manifesting.</div><div class="vta-res">Passion ${p.value} → ${p.value - 1}</div><div class="wodx-quiet">${G.GHOST_DA.page}</div>`);
        return true;
    }

    async function sight(actor) {
        if (!ghostOnly(actor)) return null;
        const content = `<form><p><b>${esc(actor.name)}</b> looks with the eyes of the dead (${G.GHOST_DA.page}).</p>
          <div class="form-group"><label>Sight</label><select name="kind"><option value="death">Deathsight: the hand of death on things and people</option><option value="life">Lifesight: souls, as Auspex reads them</option></select></div></form>`;
        return dialog(`Deathsight and Lifesight: ${actor.name}`, content, "Look", fd => look(actor, fd.kind));
    }
    async function look(actor, kind = "death") {
        const S = kind === "life" ? G.LIFESIGHT : G.DEATHSIGHT;
        const ab = findAbility(actor, S.ability);
        const dice = attr(actor, S.attr) + n(ab?.value);
        const r = await rollPool(dice, S.diff);
        const parts = [`${S.attr === "perception" ? "Perception" : S.attr} ${attr(actor, S.attr)}`, `${ab?.name ?? S.ability} ${n(ab?.value)}`];
        const res = kind === "life"
            ? (r.successes > 0 ? `Reads the soul of whoever it looks at as an aura: mood, the pallor of a vampire, the bright weave of magic.` : "Nothing clear in the souls before it.")
            : G.deathsightOf(r.botch ? 0 : r.successes);
        await post(actor, kind === "life" ? `${actor.name}: Lifesight` : `${actor.name}: Deathsight`, rollBlock(kind === "life" ? "Lifesight (as Auspex)" : "Deathsight", r, parts) + `<div class="vta-res">${esc(res)}</div>` +
            (kind === "death" ? `<div class="wodx-quiet">The book names a roll and no pool; WoDX rolls Perception + Awareness at 6. ${G.GHOST_DA.page}</div>` : `<div class="wodx-quiet">${G.GHOST_DA.page}; the aura reading of Auspex, V20 Dark Ages p. 152</div>`), [r.roll]);
        return r;
    }

    /** The Storyteller's tool: the book's Masked Trickster, or the chosen Wraith sheet marked as a Dark Ages ghost. */
    async function sampleGhost(actor = null) {
        if (!game.user.isGM) return notify("The Storyteller makes the ghosts.");
        const mark = actor && actor.type === "Wraith" && !G.isDAGhost(actor);
        const content = `<form><p>A ghost of V20 Dark Ages: Passion stands for blood for its Disciplines, a point of Passion manifests it for a turn, and it has Deathsight and Lifesight (${G.GHOST_DA.page}).</p>
          <div class="form-group"><label>Make</label><select name="what"><option value="sample">The Masked Trickster (the book's sample)</option>${mark ? `<option value="mark">Mark ${esc(actor.name)} as a Dark Ages ghost</option>` : ""}</select></div></form>`;
        return dialog("A ghost (V20 Dark Ages)", content, "Make", fd => makeGhost(fd.what === "mark" ? actor : null));
    }
    async function makeGhost(actor = null) {
        if (!game.user.isGM) return null;
        if (actor) { await actor.setFlag(MOD, "daGhost", { key: "own" }); return actor; }
        const d = G.ghostActorData();
        const { system, items, ...rest } = d;
        const a = await Actor.create({ ...rest, items });
        const up = {}; for (const [k, v] of Object.entries(system)) up[`system.${k}`] = v;
        await a.update(up);
        await a.update({ "system.notes": `<p>${esc(G.MASKED_TRICKSTER.about)}</p><p class="wodx-quiet">${G.GHOST_DA.page}</p>` }).catch(() => null);
        await post(a, `A ghost: ${a.name}`, `<div class="vta-note">Passion ${G.MASKED_TRICKSTER.passion}, Willpower ${G.MASKED_TRICKSTER.willpower}, Humanity ${G.MASKED_TRICKSTER.humanity}; Chimerstry 4, Dementation 4, Obtenebration 3, Thaumaturgy 3 (Lure of Flames 3, Movement of the Mind 3). Strength 3 when manifested.</div><div class="wodx-quiet">${G.GHOST_DA.page}</div>`);
        return a;
    }

    return { manifest, sight, look, sampleGhost, makeGhost };
}
