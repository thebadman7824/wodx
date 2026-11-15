/**
 * WoDX Actions: fomor powers (Werewolf 20th, pp. 433-438). B5162: Numbing is the first one played on the table;
 * the others stay with the Storyteller until their own pass.
 *
 *   Numbing (W20 p. 436): a Willpower and Stamina + Medicine at 6. For the scene the fomor feels no pain (no wound
 *   penalties) and has three more health levels. When it wears off the levels go; past Incapacitated, the fomor dies
 *   and melts away (the after-cost in after-costs.js).
 *
 * The body change itself is a Chronicle condition read by WoDX Combat (B5160): the token carries its icon and the
 * health track grows by three Bruised levels while it lasts.
 */
import * as LIM from "./limits.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PAGE = "W20 p. 436";

/** The condition WoDX Combat reads: three Bruised levels and no wound penalties (bodyEase 99). */
export const NUMBING = { id: "numbing", name: "Numbing", img: "icons/svg/frozen.svg", source: PAGE,
    summary: "Feels no pain: no wound penalties and three more health levels for the scene; speech is slurred.", mods: { bodyBruised: 3, bodyEase: 99 } };

/** The fomor powers on a sheet: Power items whose names are fomor powers this module plays. */
export const FOMOR_POWERS = { numbing: { name: "Numbing", page: PAGE } };
export const fomorPowersOf = actor => (actor?.items ?? []).filter(i => /numbing/i.test(i.name ?? "")).map(i => ({ id: i.id, key: "numbing", name: i.name }));

export function setup() {
    try { game.modules.get("wodx-chronicle")?.api?.registerCondition?.(NUMBING); } catch (e) { console.warn("WoDX | numbing condition", e); }
}

export function build(ctx) {
    const { post, rollPool, rollBlock, attr, findAbility, spendWillpower, notify } = ctx;

    async function power(actor) {
        const list = fomorPowersOf(actor);
        if (!list.length) { notify(`${actor.name} has no fomor power this window plays (add a Power named Numbing, ${PAGE}).`); return null; }
        return numbing(actor);
    }

    async function numbing(actor) {
        const C = game.modules.get("wodx-chronicle")?.api;
        if (actor.statuses?.has?.(`wodx-${NUMBING.id}`)) { notify(`${actor.name} is already numb.`); return null; }
        const lim = await LIM.gate(actor, { name: "Numbing", level: 1 });
        if (!lim) return null;
        if (!(await spendWillpower(actor, 1))) return null;
        const dice = n(attr(actor, "stamina")) + n(findAbility(actor, "medicine")?.value);
        const r = await rollPool(dice, 6 + n(lim.diff));
        let body = rollBlock("Stamina + Medicine", r, lim.diff ? [`Drained +${lim.diff}`] : []);
        const got = r.botch ? 0 : n(r.successes);
        if (got > 0) {
            await actor.setFlag(MOD, "numbTrack", n(actor.system?.traits?.health?.totalhealthlevels?.max) || 7);
            await C?.timed?.applyTimed?.(actor, { name: "Numbing", img: NUMBING.img, condition: NUMBING.id, duration: { kind: "scene" }, key: "wodx-fomor-numbing",
                revert: { key: "wodx-actions.numbingEnd", data: {} }, source: PAGE, description: NUMBING.summary });
            // WoDX Combat counts the health track again on the next update: the three levels show on the sheet
            await actor.setFlag(MOD, "bodyAt", Date.now());
            body += `<div class="vta-res good">${esc(actor.name)} goes numb: no wound penalties and three more health levels for the scene. The words come out thick and slurred.</div>`
                + `<div class="vta-note">When it wears off the levels go; past Incapacitated, the fomor dies.</div>`;
        } else body += `<div class="vta-res bad">${r.botch ? "A botch: " : ""}the numbness will not come.</div>`;
        body += `<div class="wodx-quiet">${PAGE}</div>`;
        await lim.done({ successes: got });
        return post(actor, `${actor.name}: Numbing`, body, [r.roll]);
    }

    return { power, numbing };
}
