/**
 * WoDX Actions — Werewolf and Fera (Phase 6b).
 * Rage, frenzy and the moon; Gnosis; changing form through the system's own shapes; regeneration; Gifts from the
 * WoDX Gift library; rites, fetishes and talens; Renown and Rank; Battle Scars; the Delirium; the Curse; Kinfolk;
 * chiminage. Rules basis by era (B41): Dark Ages: Werewolf in the Dark Ages profiles, W20 elsewhere.
 * Every card carries its page reference. Nothing here copies book text.
 */
import { spendTime } from "./spend-time.js";
import * as P from "./profiles.js";
import * as G from "./garou-rules.js";
export { bringsDelirium } from "./garou-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import { aim } from "./aim.js";
import * as EF from "./effects.js";

const MOD = "wodx-actions";
const DATA = {};
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chronicle = () => game.modules?.get?.("wodx-chronicle")?.api ?? null;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const RENOWN = ["glory", "honor", "wisdom"];
/** Library ability codes → the keys or names they go by on the sheet (Dark Ages names included). */
const ABILITY_ALIASES = {
    primalurge: ["primalurge", "primal-urge", "primal urge"], animalken: ["animalken", "animal ken"], crafts: ["craft", "crafts"],
    hearthwisdom: ["hearth wisdom", "hearthwisdom"], archery: ["archery"]
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

async function fetchData(name) {
    const url = foundry?.utils?.getRoute ? foundry.utils.getRoute(`modules/${MOD}/data/${name}.json`) : `modules/${MOD}/data/${name}.json`;
    try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch (e) { return null; }
}
export async function loadData() {
    for (const k of ["garou", "fera", "gifts-daw"]) if (!DATA[k]) DATA[k] = await fetchData(k);
    if (!DATA.garou) console.error("WoDX | WoDX Actions could not load data/garou.json");
    return DATA;
}
export const data = () => DATA;
export function gifts() { return DATA["gifts-daw"]?.gifts ?? []; }
export function findGift(name) {
    const key = String(name ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    return gifts().find(g => g.n.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim() === key) ?? null;
}

/** Item data for a Gift from the library: a system Power of type Gift, linked back to the library entry. */
export function giftItem(g) {
    const pool = G.giftPool(g.r) ?? [];
    const dice1 = pool[0]?.kind === "attr" ? pool[0].key : "";
    const dice2 = pool[1]?.kind === "ability" ? pool[1].key : "";
    return { name: g.n, type: "Power", img: "systems/worldofdarkness/assets/img/items/power_werewolf.svg",
        system: { level: g.l, game: "werewolf", type: "wod.types.gift", dice1, dice2, difficulty: typeof g.d === "number" ? g.d : 6,
            description: `<p>${esc(g.e)}</p><p><em>WoDX Gift library: DA:W p. ${g.p}.</em></p>`, reference: `DA:W p. ${g.p}` },
        flags: { [MOD]: { gift: g.id } } };
}

/** Rules basis for the era in force (B41). */
export function basis() {
    const id = chronicle()?.eras?.activeEra?.()?.profile?.id ?? null;
    return G.basis(id);
}

/* ------------------------------------------------------------------ */
/*  Reading a shapechanger's sheet                                     */
/* ------------------------------------------------------------------ */

export function isShifter(actor) {
    return ["lupine"].includes(P.detectProfile(actor)) || ["Werewolf", "Changing Breed"].includes(actor?.type);
}
export function feraKey(actor) {
    const cb = String(actor?.system?.changingbreed ?? "").trim();
    if (!cb) return "Garou";
    const keys = Object.keys(DATA.fera?.breeds ?? {});
    return keys.find(k => k.toLowerCase() === cb.toLowerCase().replace("é", "e")) ?? cb;
}
export function info(actor) {
    const s = actor?.system ?? {};
    const adv = s.advantages ?? {};
    const tribes = DATA.garou?.tribes ?? {};
    const fera = DATA.fera?.breeds?.[feraKey(actor)] ?? DATA.fera?.breeds?.Garou ?? null;
    const renown = {};
    for (const k of RENOWN) renown[k] = { permanent: n(s.renown?.[k]?.permanent), temporary: n(s.renown?.[k]?.temporary) };
    return {
        breed: G.breedKey(s.breed) || "homid",
        auspice: G.auspiceKey(s.auspice),
        tribe: G.tribeKey(s.tribe === "custom" ? s.custom?.tribe : (s.tribe || s.custom?.tribe), tribes),
        form: G.currentForm(s.shapes),
        rank: Math.max(0, n(s.renown?.rank)),
        fera, feraKey: feraKey(actor),
        rage: { temp: n(adv.rage?.temporary), perm: n(adv.rage?.permanent) },
        gnosis: { temp: n(adv.gnosis?.temporary), perm: n(adv.gnosis?.permanent) },
        willpower: { temp: n(adv.willpower?.temporary), perm: n(adv.willpower?.permanent) },
        renown
    };
}
const renownLabel = (fera, k) => fera?.renown?.[RENOWN.indexOf(k)] ?? k[0].toUpperCase() + k.slice(1);

/** Current moon phase index (0 new … 4 full … 7) from the Chronicle Clock. */
export async function moonNow() {
    try {
        const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
        const lat = game.settings.get("wodx-chronicle", "latitude");
        const t = cal.describeTime(game.time.worldTime, lat);
        return { index: t.moon.index, name: t.moon.name, isNight: t.isNight, jdn: t.jdn, hour: t.hour, time: t };
    } catch (e) { return { index: 2, name: "unknown", isNight: true, jdn: 0, hour: 0 }; }
}

/* ------------------------------------------------------------------ */
/*  Rage and Gnosis in one turn (W20 p. 146; DA:W p. 92)               */
/* ------------------------------------------------------------------ */

function turnKey() {
    const c = game.combat;
    return c?.started ? `${c.id}:${c.round}` : null;
}
/** Record a Rage or Gnosis use this turn; returns a warning if the other was already used. */
export async function markTurn(actor, what) {
    const k = turnKey();
    if (!k || !actor?.isOwner) return "";
    const prev = actor.getFlag?.(MOD, "turnUse") ?? {};
    const other = what === "rage" ? "gnosis" : "rage";
    const warn = prev.key === k && prev[other] ? `<div class="vta-note bad"><b>Rage and Gnosis in one turn:</b> not allowed, except for Gifts that need both (W20 p. 146; DA:W p. 92).</div>` : "";
    await actor.setFlag(MOD, "turnUse", { key: k, rage: prev.key === k ? prev.rage || what === "rage" : what === "rage", gnosis: prev.key === k ? prev.gnosis || what === "gnosis" : what === "gnosis" });
    return warn;
}

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, attr, findAbility, setting } = ctx;
    const spendWillpower = ctx.spendWillpower;

    async function pay(actor, res, cost) {
        if (!cost) return "";
        if (res === "willpower") { if (!(await spendWillpower(actor, cost))) return false; return `${actor.name} spends ${cost} Willpower.`; }
        const r = P.resource(actor, res);
        if (!r.ok) { ctx.notify(`${actor.name} has no ${r.label} on the sheet.`); return false; }
        if (r.value < cost) { ctx.notify(`${actor.name} has only ${r.value} ${r.label}.`); return false; }
        if (!setting("spendResources")) return `${r.label}: spend ${cost} (not deducted: setting off)`;
        return (await P.adjust(actor, res, -cost)) ?? "";
    }
    const abilityDots = (actor, key) => {
        if (!key) return 0;
        for (const k of ABILITY_ALIASES[key] ?? [key]) { const v = findAbility(actor, k)?.value; if (v !== undefined) return n(v); }
        return 0;
    };
    function poolOf(actor, code, i) {
        const parts = G.giftPool(code) ?? [];
        let dice = 0; const label = [];
        for (const p of parts) {
            if (p.kind === "number") { dice += p.value; label.push(String(p.value)); }
            else if (p.kind === "attr") { dice += attr(actor, p.key); label.push(cap(p.key)); }
            else if (p.kind === "trait") { const v = p.key === "willpower" ? i.willpower.perm : i[p.key].perm; dice += v; label.push(cap(p.key)); }
            else { const best = Math.max(...p.alts.map(a => abilityDots(actor, a))); dice += best; label.push(p.alts.map(cap).join(" or ")); }
        }
        return { dice, label: label.join(" + ") };
    }
    const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase()).replace("Primalurge", "Primal-Urge").replace("Animalken", "Animal Ken").replace("Hearthwisdom", "Hearth Wisdom");
    const targetActorOf = () => [...(game.user.targets ?? [])][0]?.actor ?? null;
    function targetTraits(t) {
        if (!t) return null;
        const s = t.system ?? {};
        return {
            willpower: n(s.advantages?.willpower?.permanent), gnosis: n(s.advantages?.gnosis?.permanent), rage: n(s.advantages?.rage?.permanent),
            stamina: attr(t, "stamina"), wits: attr(t, "wits"), manipulation: attr(t, "manipulation"),
            stealth: abilityDots(t, "stealth"), subterfuge: abilityDots(t, "subterfuge"), athletics: abilityDots(t, "athletics"), rank: n(s.renown?.rank)
        };
    }

    /* ---------------- Changing form ---------------- */

    async function setForm(actor, form, i) {
        if (!G.FORMS.includes(form)) throw new Error(`Unknown form "${form}"`);
        const shapes = foundry.utils.deepClone(actor.system?.shapes ?? {});
        for (const k of Object.keys(shapes)) if (shapes[k] && typeof shapes[k] === "object") shapes[k].isactive = k === form;
        delete shapes[""];
        if (!shapes[form]) shapes[form] = { isactive: true };
        await syncGlabro(actor, i);
        // isupdated false: the system then switches the form's bonuses on and works out the totals (wod-actor-base _onUpdate)
        await updateActor(actor, { "system.shapes": shapes, "system.settings.isupdated": false });
        await P.setWorldFlag(actor, "form", form);
        Hooks.callAll("wodxFormChanged", actor, form);
        // Phase 6b first build used an effect for the Glabro fix; take any such effect off
        const old = actor.effects?.find?.(e => e.getFlag?.(MOD, "formFix"));
        if (old && actor.isOwner) await old.delete();
    }
    /** Dark Ages: Glabro is Manipulation −1, not the system's W20 −2 (DA:W p. 106). The sheet's own Glabro bonus follows the era. */
    async function syncGlabro(actor, i) {
        if (!actor.isOwner || i.feraKey !== "Garou") return;
        const it = (actor.items ?? []).find(x => x.type === "Bonus" && x.system?.parentid === "glabro" && x.system?.settingtype === "manipulation");
        if (!it) return;
        const want = basis() === "daw" ? -1 : -2, now = Number(it.system?.value);
        if ((now === -1 || now === -2) && now !== want) await it.update({ "system.value": want });
    }
    function formLabel(actor, k) {
        const l = actor.system?.shapes?.[k]?.label;
        return l ? game.i18n.localize(l) : cap(k);
    }

    async function shift(actor) {
        const i = info(actor);
        const lost = i.rage.temp <= 0 && i.willpower.temp <= 0;
        const keys = Object.keys(actor.system?.shapes ?? {}).filter(k => G.FORMS.includes(k));
        const forms = keys.length ? keys : G.FORMS;
        const bf = G.breedForm(i.breed);
        const content = `<form><p><b>${esc(actor.name)}</b> is in <b>${esc(formLabel(actor, i.form))}</b>. Rage ${i.rage.temp}/${i.rage.perm}. Breed form: ${esc(formLabel(actor, bf))}.</p>
          ${lost ? `<p class="vta-note bad"><b>Lost the wolf</b> (no Rage and no Willpower): only the breed form until a Willpower point comes back (DA:W p. 91).</p>` : ""}
          <div class="form-group"><label>Change to</label><select name="form" data-fixed>${forms.filter(f => f !== i.form).map(f => `<option value="${f}">${esc(formLabel(actor, f))}</option>`).join("")}</select></div>
          <div class="form-group"><label>How</label><select name="how" data-fixed><option value="roll">Stamina + Primal-Urge</option><option value="rage">Spend 1 Rage (instant)</option><option value="breed">Back to breed form (instant)</option></select></div>
          <div class="form-group"><label>Difficulty modifier</label><input type="number" name="mod" value="0"/></div></form>`;
        return dialog(`Change form: ${actor.name}`, content, "Change", async fd => {
            let to = fd.how === "breed" ? bf : fd.form;
            if (!G.FORMS.includes(to)) { ctx.notify("Choose a form."); return null; }
            if (lost && to !== bf) { ctx.notify(`${actor.name} has lost the wolf: only the breed form.`); return null; }
            let body = "", rolls = [], reached = to;
            if (fd.how === "rage") {
                const note = await pay(actor, "rage", 1); if (note === false) return null;
                body += `<div class="vta-parts">${esc(note)}</div>` + await markTurn(actor, "rage");
            } else if (fd.how === "roll") {
                const steps = G.shiftSteps(i.form, to);
                const diff = Math.min(10, (G.FORM_DIFF[i.form] ?? 6) + n(fd.mod));
                const rr = await rollPool(attr(actor, "stamina") + abilityDots(actor, "primalurge"), diff);
                rolls.push(rr.roll);
                body += rollBlock("Stamina + Primal-Urge", rr, [`from ${formLabel(actor, i.form)}: difficulty ${diff}`, `${steps} success${steps === 1 ? "" : "es"} needed`]);
                reached = G.shiftReach(i.form, to, rr.botch ? 0 : rr.successes);
                if (reached === i.form) { body += `<div class="vta-note">The change doesn't come this turn.</div>`; return post(actor, `${actor.name} strains to change`, body, rolls.filter(Boolean)); }
                if (reached !== to) body += `<div class="vta-note">Partway: ${esc(formLabel(actor, reached))} this turn (W20 p. 285).</div>`;
            }
            await setForm(actor, reached, i);
            body += `<div class="vta-big good">${esc(formLabel(actor, reached))}</div>`;
            if (reached === "crinos") body += `<div class="vta-note">Humans who see the Crinos suffer the Delirium${setting("autoDelirium") ? ": the Storyteller is told who can see it" : " (Storyteller: Garou tools → The Delirium)"}.</div>`;
            body += `<div class="vta-note">The sheet's form table applies the Attribute changes.${basis() === "daw" ? " Dark Ages: Glabro bites lethal, no claws; Crinos and Hispo teeth and claws aggravated; Lupus bite lethal (DA:W pp. 106–107)." : ""}</div>`;
            return post(actor, `${actor.name} becomes ${formLabel(actor, reached)}`, body, rolls.filter(Boolean));
        });
    }

    /* ---------------- Rage and frenzy ---------------- */

    async function rageRoll(actor, { reason = "" } = {}) {
        const i = info(actor), b = basis(), D = DATA.garou ?? {};
        if (i.fera && i.fera.rage === false) return ctx.notify(`${actor.name}'s breed has no Rage.`);
        const moon = await moonNow();
        const scarred = actor.items?.some?.(it => it.getFlag?.(MOD, "battleScar") === "Extensive scarring");
        const base = G.rageDifficulty({ b, phaseIndex: moon.index, auspice: i.auspice, form: i.form, scarred, table: D.rageDifficulty?.w20 });
        const rankAdd = G.rankFrenzyDiff(i.rank, D.frenzyByRank);
        const content = `<form><p><b>${esc(actor.name)}</b>: Rage ${i.rage.temp}/${i.rage.perm}, Rank ${i.rank}. Moon: ${esc(moon.name)}.</p>
          <div class="form-group"><label>Provocation</label><input type="text" name="reason" value="${esc(reason)}"/></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="${Math.min(10, base + rankAdd)}"/></div>
          <p class="vta-note">${b === "w20" ? `W20 p. 262: by the moon${G.auspiceMoonMatches(i.auspice, moon.index) ? ", −1 for the auspice moon" : ""}${i.form === "crinos" ? ", −1 in Crinos" : ""}.` : `DA:W gives no moon table: 6 unless the Storyteller says otherwise${i.form === "crinos" ? ", −1 in Crinos (p. 107)" : ""}.`}${rankAdd ? ` Rank ${i.rank}: +${rankAdd} (DA:W p. 101).` : ""}${scarred ? " Extensive scarring: −1." : ""}</p>
          <div class="form-group"><label>Use temporary Rage if higher (extreme provocation)</label><input type="checkbox" name="useTemp"/></div></form>`;
        return dialog(`Rage roll: ${actor.name}`, content, "Roll", async fd => {
            const dice = fd.useTemp ? Math.max(i.rage.perm, i.rage.temp) : i.rage.perm;
            const rr = await rollPool(dice, fd.diff);
            let body = rollBlock("Rage", rr, [fd.reason ? esc(fd.reason) : ""].filter(Boolean)) + await markTurn(actor, "rage");
            const fc = G.frenzyCheck(rr.successes, { rank: i.rank, need: i.fera?.frenzy ?? 4, thrall: i.fera?.thrall ?? 6, byRank: D.frenzyByRank });
            if (fc.result === "none") body += `<div class="vta-note">No frenzy (${fc.needed}+ successes needed).</div>`;
            else {
                const thrall = fc.result === "thrall";
                body += `<div class="vta-big bad">${thrall ? "Thrall of the Wyrm" : "Frenzy"}</div>
                  <div class="vta-note">${thrall ? "No Willpower can stop it; a berserk frenzy with the breed's horror (DA:W p. 95; W20 p. 262)." : "Spend a Willpower point now to stop it, losing the rest of the turn (W20 p. 261; DA:W p. 94). Otherwise choose berserk or fox."}</div>
                  <div class="vta-pending">${!thrall ? `<button type="button" class="vta-btn" data-garou="resist" data-actor="${actor.uuid}">Spend Willpower to resist</button>` : ""}
                  <button type="button" class="vta-btn" data-garou="berserk" data-actor="${actor.uuid}" data-thrall="${thrall ? 1 : 0}">Berserk (Crinos or Hispo)</button>
                  ${!thrall ? `<button type="button" class="vta-btn" data-garou="fox" data-actor="${actor.uuid}">Fox (Lupus, flee)</button>` : ""}</div>`;
            }
            return post(actor, `${actor.name}: Rage roll`, body, [rr.roll].filter(Boolean), { garou: "rage" });
        });
    }

    async function enterFrenzy(actor, kind, { thrall = false } = {}) {
        const i = info(actor);
        const gnosisSafe = i.gnosis.perm >= i.rage.perm;
        await updateActor(actor, { "system.conditions.isfrenzy": true });
        await actor.setFlag?.(MOD, "frenzyType", thrall ? "thrall" : kind);
        await chronicle()?.conditions?.setCondition?.(actor, "frenzy", true);
        const target = kind === "fox" ? "lupus" : (i.form === "hispo" ? "hispo" : "crinos");
        if (i.form !== target && (actor.system?.shapes?.[target] || G.FORMS.includes(target))) await setForm(actor, target, i);
        const notes = kind === "fox"
            ? "Fox frenzy: takes Lupus and flees to safety, attacking only what blocks the way. Usually costs Wisdom (DA:W p. 95)."
            : `Berserk: ${gnosisSafe ? "spares packmates (Gnosis ≥ Rage)" : "attacks anything that moves, packmates too, and won't remember (Rage > Gnosis)"}. Bite, claw or run only; no Gifts, fetishes or stepping sideways; wound penalties ignored (DA:W pp. 94–95).${thrall ? " Thrall of the Wyrm: the Storyteller picks the targets; a Wits (7) botch after a kill brings the breed's horror." : ""}`;
        return post(actor, `${actor.name}: ${thrall ? "Thrall of the Wyrm" : kind === "fox" ? "fox frenzy" : "berserk frenzy"}`, `<div class="vta-note">${esc(notes)}</div>`);
    }

    async function endFrenzy(actor) {
        const i = info(actor);
        if (!actor.system?.conditions?.isfrenzy && !actor.statuses?.has?.("wodx-frenzy")) return ctx.notify(`${actor.name} is not in frenzy.`);
        if (actor.getFlag?.(MOD, "frenzyType") === "thrall") ctx.notify("The Thrall of the Wyrm ends only when the Storyteller says.");
        const content = `<form><p><b>${esc(actor.name)}</b>: once what caused the frenzy is over, roll Willpower at difficulty = permanent Rage (${i.rage.perm}); retry each turn (DA:W p. 94; W20 p. 261).</p>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="${Math.max(2, Math.min(10, i.rage.perm))}"/></div></form>`;
        return dialog(`End frenzy: ${actor.name}`, content, "Roll", async fd => {
            const rr = await rollPool(i.willpower.perm, fd.diff);
            let body = rollBlock("Willpower", rr, []);
            if (rr.successes > 0) {
                await updateActor(actor, { "system.conditions.isfrenzy": false });
                await actor.unsetFlag?.(MOD, "frenzyType");
                await chronicle()?.conditions?.setCondition?.(actor, "frenzy", false);
                body += `<div class="vta-big good">The frenzy passes.</div>`;
            } else body += `<div class="vta-note">Still in frenzy; try again next turn.</div>`;
            return post(actor, `${actor.name}: ending frenzy`, body, [rr.roll].filter(Boolean));
        });
    }

    const RAGE_USES = [
        ["actions", "Extra actions (declare at the start of the turn)"],
        ["shift", "Change form instantly"],
        ["stun", "Shake off being stunned"],
        ["pain", "Ignore one level's wound penalty for a turn (Dark Ages)"],
        ["active", "Stay up below Incapacitated (Rage roll, 8)"],
        ["gain", "Regain Rage (provocation, botch, humiliation)"]
    ];
    async function spendRage(actor) {
        const i = info(actor), b = basis();
        const capx = G.rageActionCap(b, i.rage.perm, attr(actor, "dexterity"), attr(actor, "wits"), !!actor.system?.conditions?.isfrenzy);
        const content = `<form><p><b>${esc(actor.name)}</b>: Rage ${i.rage.temp}/${i.rage.perm}. Up to ${capx.max} Rage a turn for actions${b === "daw" ? `; ${capx.safe} safe, more at +3 difficulty (DA:W p. 90)` : " (W20 p. 144)"}.</p>
          <div class="form-group"><label>Use</label><select name="use" data-fixed>${RAGE_USES.filter(([k]) => k !== "pain" || b === "daw").map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Points</label><input type="number" name="pts" value="1" min="1"/></div></form>`;
        return dialog(`Spend Rage: ${actor.name}`, content, "Spend", async fd => {
            if (fd.use === "shift") return shift(actor);
            if (fd.use === "active") return remainActive(actor);
            if (fd.use === "gain") {
                const r = P.resource(actor, "rage");
                const up = Math.max(1, n(fd.pts));
                await P.adjust(actor, "rage", up, { min: 0 });
                return post(actor, `${actor.name} regains Rage`, `<div class="vta-parts">Rage ${r.value} → ${Math.min(r.max || 10, r.value + up)}</div>`);
            }
            const pts = fd.use === "actions" ? Math.max(1, n(fd.pts)) : 1;
            if (fd.use === "actions" && pts > capx.max) { ctx.notify(`At most ${capx.max} Rage for actions this turn.`); return null; }
            const note = await pay(actor, "rage", pts); if (note === false) return null;
            let body = `<div class="vta-parts">${esc(note)}</div>` + await markTurn(actor, "rage");
            if (fd.use === "actions" && turnKey() && actor.isOwner) {
                // WoDX Combat reads this: the extra actions carry no multiple-action penalty, and the initiative card lists them
                const prev = actor.getFlag?.(MOD, "extraActions");
                await actor.setFlag(MOD, "extraActions", { key: turnKey(), n: (prev?.key === turnKey() ? n(prev.n) : 0) + pts });
            }
            if (fd.use === "actions") body += `<div class="vta-note">${pts} extra action${pts === 1 ? "" : "s"}; no splitting pools${b === "daw" && pts > capx.safe ? `; actions past ${capx.safe} are at +3 difficulty` : ""}. Spent Rage is lost even if an action goes unused.</div>`;
            if (fd.use === "stun") body += `<div class="vta-note">Acts normally despite losing more levels than Stamina this turn (W20 p. 144; DA:W p. 91).</div>`;
            if (fd.use === "pain") body += `<div class="vta-note">One health level's penalty is ignored for this turn; the wound stays (DA:W p. 91).</div>`;
            return post(actor, `${actor.name} spends Rage`, body);
        });
    }

    async function remainActive(actor) {
        const i = info(actor), b = basis();
        const scene = canvas?.scene?.id ?? "none";
        if (actor.getFlag?.(MOD, "remainedActive") === scene) return ctx.notify("Only once per scene.");
        const content = `<form><p><b>${esc(actor.name)}</b> is below Incapacitated. Rage roll (${i.rage.perm} dice) at 8; each success heals a level; once a scene.</p>
          <div class="form-group"><label>The worst damage is</label><select name="type" data-fixed><option value="aggravated">aggravated</option><option value="lethal">lethal</option><option value="bashing">bashing</option></select></div></form>`;
        return dialog(`Remain active: ${actor.name}`, content, "Roll", async fd => {
            const rr = await rollPool(i.rage.perm, 8);
            await actor.setFlag?.(MOD, "remainedActive", scene);
            const ra = G.remainingActive(b, fd.type, rr.botch ? 0 : rr.successes);
            let body = rollBlock("Rage", rr, ["difficulty 8"]) + await markTurn(actor, "rage");
            if (!ra.heals) return post(actor, `${actor.name} fails to rise`, body + `<div class="vta-note bad">No recovery: with aggravated wounds this is death (W20 p. 256).</div>`, [rr.roll].filter(Boolean));
            const h = actor.system?.health?.damage ?? {};
            let left = ra.heals;
            for (const k of ["aggravated", "lethal", "bashing"]) { const take = Math.min(left, n(h[k])); if (take && game.wodxCombat?.healDamage) await game.wodxCombat.healDamage(actor, k, take); left -= take; }
            body += `<div class="vta-big good">${ra.heals} level${ra.heals === 1 ? "" : "s"} heal</div>`;
            if (ra.frenzy) { body += `<div class="vta-note">A berserk frenzy follows.</div>`; await enterFrenzy(actor, "berserk"); }
            if (ra.scar) body += `<div class="vta-note">The wound leaves a Battle Scar. <button type="button" class="vta-btn" data-garou="scar" data-actor="${actor.uuid}">Choose the scar</button></div>`;
            body += `<div class="vta-note">${b === "daw" ? "DA:W p. 91: healing bashing frenzies only on 4+ successes; lethal or aggravated always frenzies and scars." : "W20 pp. 145, 256: always a berserk frenzy and a Battle Scar."}</div>`;
            return post(actor, `${actor.name} rises on Rage`, body, [rr.roll].filter(Boolean));
        });
    }

    /* ---------------- Gnosis ---------------- */

    async function meditate(actor) {
        const i = info(actor);
        const today = Math.floor(game.time.worldTime / 86400), week = Math.floor(today / 7);
        const log = actor.getFlag?.(MOD, "meditation") ?? {};
        if (log.day === today) return ctx.notify("Once a day.");
        const earlier = log.week === week ? n(log.count) : 0;
        const diff = G.meditationDifficulty(earlier);
        const content = `<form><p><b>${esc(actor.name)}</b>: Gnosis ${i.gnosis.temp}/${i.gnosis.perm}. Wits + Enigmas at ${diff}${earlier ? ` (+${earlier} for earlier days this week)` : ""}; up to one point an hour (DA:W p. 92; W20 p. 146).</p>
          <div class="form-group"><label>Hours of meditation</label><input type="number" name="hours" value="1" min="1"/></div>
          <div class="form-group"><label>Move the clock by the hours (a player asks the Storyteller)</label><input type="checkbox" name="advance"/></div></form>`;
        return dialog(`Meditate: ${actor.name}`, content, "Roll", async fd => {
            const rr = await rollPool(attr(actor, "wits") + abilityDots(actor, "enigmas"), diff);
            const gain = Math.min(rr.botch ? 0 : rr.successes, Math.max(1, n(fd.hours)), Math.max(0, i.gnosis.perm - i.gnosis.temp));
            if (gain) await P.adjust(actor, "gnosis", gain);
            await actor.setFlag?.(MOD, "meditation", { day: today, week, count: earlier + 1 });
            const tnote = fd.advance ? await spendTime(actor, 3600 * Math.max(1, n(fd.hours)), "meditation") : "";
            return post(actor, `${actor.name} meditates`, rollBlock("Wits + Enigmas", rr, []) + `<div class="vta-big ${gain ? "good" : ""}">+${gain} Gnosis</div>` + tnote, [rr.roll].filter(Boolean));
        });
    }

    /* ---------------- Gifts ---------------- */

    function giftItems(actor) {
        return (actor.items ?? []).filter(it => it.type === "Power" && (it.system?.type === "wod.types.gift" || it.getFlag?.(MOD, "gift")));
    }
    function giftData(item) {
        const id = item.getFlag?.(MOD, "gift");
        return (id && gifts().find(g => g.id === id)) || findGift(item.name);
    }

    async function useGift(actor) {
        const list = giftItems(actor);
        if (!list.length) return ctx.notify(`${actor.name} knows no Gifts. Use "Learn a Gift" first.`);
        let tgt = targetActorOf();
        const rows = list.map(it => { const g = giftData(it); return [it.id, `${it.name}${g ? ` (${g.l})` : ""}`]; });
        const content = `<form class="wodx-gift"><p><b>${esc(actor.name)}</b>${tgt ? `<span class="wodx-hdr-tgt"> → target <b>${esc(tgt.name)}</b></span>` : ""}</p>
          <div class="form-group"><label>Gift</label>${rows.length > 5 ? searchBox("select[name=gift]", "Search Gifts…", "Search Gifts") : ""}<select name="gift" data-fixed>${rows.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div>
          <div class="wodx-gift-info vta-note"></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6"/></div>
          <div class="form-group"><label>Extra points (variable costs)</label><input type="number" name="extra" value="0" min="0"/></div>
          <div class="form-group"><label>Bonus dice</label><input type="number" name="bonus" value="0"/></div></form>`;
        const i = info(actor);
        let gauntlet = null;
        try {
            const tok = actor.getActiveTokens?.()[0]?.document ?? canvas.tokens?.controlled?.[0]?.document;
            const g = tok ? game.modules.get("wodx-otherworlds")?.api?.placeOf?.(tok)?.gauntlet : null;
            gauntlet = Number.isFinite(g) ? g : null;
        } catch (e) { gauntlet = null; }
        const describe = (root) => {
            const it = actor.items.get(root.querySelector("[name=gift]").value);
            const g = it ? giftData(it) : null;
            const box = root.querySelector(".wodx-gift-info");
            if (!g) { box.innerHTML = "Not in the WoDX Gift library: rolls as the sheet sets it (dice and difficulty on the Gift)."; return; }
            const c = G.giftCost(g.c);
            const costTxt = [c.gnosis && `${c.gnosis} Gnosis`, c.rage && `${c.rage} Rage`, c.willpower && `${c.willpower} Willpower`].filter(Boolean).join(", ") || (c.variable ? "variable" : "none");
            const d = G.giftDifficulty(g.d, { t: targetTraits(tgt), own: { willpower: i.willpower.perm, rage: i.rage.perm }, gauntlet });
            if (d !== null) root.querySelector("[name=diff]").value = d;
            box.innerHTML = `<b>Level ${g.l}</b> · cost ${esc(costTxt)}${c.per ? ` (${esc(c.per)})` : ""} · ${g.r ? `roll ${esc(poolOf(actor, g.r, i).label)}` : "no roll"} · ${esc(g.t ?? "")} · DA:W p. ${g.p}<br>${esc(g.e)}${g.chk ? "<br><i>Partly read from a damaged scan: check the page.</i>" : ""}${d === null && g.d ? `<br><i>Difficulty from ${esc(g.d)}: target a token or set it.</i>` : ""}`;
        };
        return dialog(`Use a Gift: ${actor.name}`, content, "Use", async fd => {
            const it = actor.items.get(fd.gift); if (!it) return null;
            const g = giftData(it);
            const c = G.giftCost(g?.c);
            const notes = [];
            for (const [res, pts] of [["gnosis", c.gnosis + (c.variable || c.per ? n(fd.extra) : 0)], ["rage", c.rage], ["willpower", c.willpower]]) {
                if (!pts) continue;
                const r = await pay(actor, res, pts); if (r === false) return null;
                if (r) notes.push(r);
                if (res !== "willpower") notes.push(await markTurn(actor, res));
            }
            let body = notes.length ? `<div class="vta-parts">${notes.filter(x => !String(x).startsWith("<")).map(esc).join(" · ")}</div>${notes.filter(x => String(x).startsWith("<")).join("")}` : "";
            const rolls = [];
            let successes = 1;
            const code = g?.r ?? (it.system?.dice1 ? `${it.system.dice1}${it.system.dice2 ? `+${it.system.dice2}` : ""}` : null);
            if (code) {
                const pool = poolOf(actor, code, i);
                const rr = await rollPool(Math.max(0, pool.dice + n(fd.bonus)), fd.diff);
                rolls.push(rr.roll);
                successes = rr.botch ? 0 : rr.successes;
                body += rollBlock(pool.label, rr, [n(fd.bonus) ? `bonus ${fd.bonus}` : ""].filter(Boolean));
            }
            if (g) body += `<div class="vta-note">${esc(g.e)} <span class="wodx-quiet">(DA:W p. ${g.p})</span></div>`;
            const dur = successes > 0 ? G.giftDuration(g?.t, successes) : null;
            if (dur && chronicle()?.applyTimed && actor.isOwner) {
                await chronicle().applyTimed(actor, { name: it.name, img: it.img || "icons/svg/aura.svg", description: g?.e ?? "", duration: dur,
                    source: g ? `DA:W p. ${g.p}` : "", key: `gift-${it.id}` });
                body += `<div class="vta-note">Shown on the token until it ends (${esc(dur.kind === "rounds" ? `${dur.rounds} turn${dur.rounds === 1 ? "" : "s"}` : dur.kind === "scene" ? "the scene" : "its time")}).</div>`;
            }
            // The Gift's keywords on the effects card (Traits With Teeth step 4): the Dark Ages library, else the W20 list by name
            let fxItems = [];
            if (code && successes > 0 && EF.isOn()) {
                const pp = EF.powerPlan(actor, { set: "gift", id: g?.id ?? "", name: it.name, line: "w20", successes, source: g ? `DA:W p. ${g.p}` : "W20" });
                body += pp.html;
                fxItems = pp.items.filter(x => x.route !== "off" && x.route !== "st");
            }
            return post(actor, `${actor.name}: ${esc(it.name)}`, body, rolls.filter(Boolean), fxItems.length ? { kind: "effects", caster: actor.name, items: fxItems } : undefined);
        }, { render: root => { describe(root); root.querySelector("[name=gift]")?.addEventListener("change", () => describe(root));
            aim(root, { actor, lib: "gift", power: r => { const it = actor.items.get(r.querySelector("[name=gift]")?.value); return it ? (giftData(it) ?? { id: it.id, n: it.name }) : null; }, onPick: a => { tgt = a; describe(root); } }); } });
    }

    async function learnGift(actor) {
        const i = info(actor);
        const known = new Set(giftItems(actor).map(it => it.name.toLowerCase()));
        const rankCap = Math.max(1, i.rank);
        const rows = gifts().filter(g => !known.has(g.n.toLowerCase())).map(g => {
            const own = G.giftIsOwn(g, i);
            return { g, own, ok: g.l <= rankCap, xp: G.giftXP(g.l, own) };
        }).sort((a, b) => (b.own - a.own) || (a.g.l - b.g.l) || a.g.n.localeCompare(b.g.n));
        const groupsTxt = g => g.g.map(cap).join(", ").replace(/-/g, " ");
        const content = `<form class="wodx-learn"><p><b>${esc(actor.name)}</b>: ${esc(cap(i.breed))}, ${esc(cap(i.auspice) || "no auspice")}, ${esc(cap(i.tribe).replace(/-/g, " ") || "no tribe")}; Rank ${i.rank} (Gifts up to level ${rankCap}, DA:W p. 111).</p>
          ${searchBox("ul.wodx-gift-list", "Search Gifts…", "Search Gifts")}
          <ul class="wodx-gift-list" style="max-height:340px;overflow-y:auto;flex:none">${rows.map(r => `<li data-search-item><label><input type="radio" name="gift" value="${r.g.id}" ${r.ok ? "" : "disabled"}/> <b>${esc(r.g.n)}</b> (level ${r.g.l}): ${esc(groupsTxt(r.g))} · ${r.xp} XP${r.own ? "" : " (outside)"}${r.ok ? "" : " · rank too low"}<br><span class="wodx-quiet">${esc(r.g.e)}</span></label></li>`).join("")}</ul>
          <div class="form-group"><label>Spend experience through the log</label><input type="checkbox" name="xp" checked/></div>
          ${spiritApi() ? `<p class="vta-note">The spirits: ${esc((spiritApi().rules.summary(spiritApi().of(actor)).join("; ")) || "no court knows this one yet")}. Standing changes the difficulty to summon the teacher; a scorned court may refuse to teach.</p>` : ""}
          <p class="vta-note">Learned from a spirit (summoned at a caern), another Garou (a month; +1 difficulty until practised) or a quest (DA:W p. 111). Cost: level × 3 for the breed's, auspice's or tribe's own, × 5 otherwise (p. 107).</p></form>`;
        return dialog(`Learn a Gift: ${actor.name}`, content, "Learn", async fd => {
            const g = gifts().find(x => x.id === fd.gift); if (!g) return null;
            const own = G.giftIsOwn(g, i), xp = G.giftXP(g.l, own);
            await actor.createEmbeddedDocuments("Item", [giftItem(g)]);
            let xpNote = "";
            if (fd.xp) {
                const xpApi = game.modules.get("wodx-creation")?.api?.xp;
                if (xpApi?.award && game.user.isGM) {
                    await actor.createEmbeddedDocuments("Item", [{ name: `Gift: ${g.n}`, type: "Experience", system: { amount: xp, isspent: true },
                        flags: { "wodx-creation": { time: game.time.worldTime, kind: "gift", key: g.id, by: game.user.name } } }]);
                    await xpApi.writeLogPage?.(actor);
                    xpNote = `${xp} experience recorded.`;
                } else xpNote = `${xp} experience: record it on the sheet (the Storyteller's log takes Gift spends).`;
            }
            return post(actor, `${actor.name} learns ${esc(g.n)}`, `<div class="vta-note">Level ${g.l}${own ? "" : ", outside the breed, auspice and tribe"}. ${esc(xpNote)}</div><div class="vta-note">${esc(g.e)} (DA:W p. ${g.p})</div>`);
        });
    }

    /* ---------------- Rites ---------------- */

    async function performRite(actor) {
        const i = info(actor), D = DATA.garou ?? {};
        const rites = (actor.items ?? []).filter(it => it.type === "Power" && it.system?.type === "wod.types.rite");
        const types = Object.entries(D.rites ?? {}).filter(([k]) => k !== "page");
        const content = `<form><p><b>${esc(actor.name)}</b>: Rituals ${abilityDots(actor, "rituals")}, Rank ${i.rank}.</p>
          ${rites.length ? `<div class="form-group"><label>Rite known</label>${rites.length > 5 ? searchBox("select[name=rite]", "Search rites…", "Search rites") : ""}<select name="rite"><option value="">(another rite)</option>${rites.map(r => `<option value="${r.id}">${esc(r.name)} (level ${n(r.system?.level)})</option>`).join("")}</select></div>` : ""}
          <div class="form-group"><label>Kind of rite</label><select name="type" data-fixed>${types.map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Level</label><input type="number" name="level" value="1" min="0" max="5"/></div>
          <div class="form-group"><label>Garou taking part (ritemaster included)</label><input type="number" name="people" value="1" min="1"/></div>
          <div class="form-group"><label>Caern level (seasonal rites)</label><input type="number" name="caern" value="0" min="0" max="5"/></div>
          <div class="form-group"><label>Move the clock (10 minutes a level; a player asks the Storyteller)</label><input type="checkbox" name="advance"/></div>
          ${courtField().replace("The spirit's court", "A spirit's court (a binding or a summoning rite)")}
          <p class="vta-note">DA:W pp. 144–145: −1 difficulty per five taking part; at least 10 minutes a level (minor rites a few minutes). Rites are taught, not bought with experience, in the Dark Ages.</p></form>`;
        return dialog(`Perform a rite: ${actor.name}`, content, "Perform", async fd => {
            const it = fd.rite ? actor.items.get(fd.rite) : null;
            const lvl = it ? n(it.system?.level) : n(fd.level);
            if (lvl > abilityDots(actor, "rituals") && fd.type !== "minor") ctx.notify("A rite's level can't exceed Rituals (DA:W p. 144).");
            const rr0 = G.riteRoll(fd.type, { rank: i.rank, caern: fd.caern, participants: fd.people, table: D.rites });
            const ce = courtEffect(actor, fd.court);
            let body = "", rolls = [];
            if (rr0?.pool && rr0.pool !== "var") {
                const pool = poolOf(actor, rr0.pool, i);
                const diff = clampDiff(rr0.diff + ce.diff);
                const rr = await rollPool(pool.dice, diff);
                rolls.push(rr.roll);
                body += rollBlock(pool.label, rr, [`${rr0.label} rite`, `difficulty ${diff}`, ...(ce.note ? [ce.note] : [])]);
                body += rr.successes > 0 ? `<div class="vta-big good">The rite takes.</div>` : `<div class="vta-note">The rite fails${rr.botch ? ", badly" : ""}.</div>`;
            } else body += `<div class="vta-note">${rr0?.pool === "var" ? "Caern rites roll as each rite says (capped by Gnosis)." : "Minor rites need no roll."}</div>`;
            if (fd.advance) body += await spendTime(actor, 600 * Math.max(1, lvl), "a rite");
            return post(actor, `${actor.name}: ${esc(it?.name ?? `${rr0?.label ?? ""} rite`)}`, body, rolls.filter(Boolean));
        });
    }

    /* ---------------- Standing with the spirit courts (WoDX Otherworlds 0.16.0, B1722) ---------------- */
    const spiritApi = () => game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds")?.api?.spirits : null;
    const courtField = () => spiritApi() ? `<div class="form-group"><label>The spirit's court</label><select name="court" data-fixed>${spiritApi().courtOptions()}</select></div>` : "";
    const courtEffect = (actor, court) => spiritApi()?.effect?.(actor, court) ?? { diff: 0, refuses: false, note: "" };
    const clampDiff = d => Math.max(2, Math.min(10, d));

    async function summonSpirit(actor) {
        const D = DATA.garou ?? {};
        const types = Object.keys(D.summoning?.diff ?? {});
        const content = `<form><p><b>${esc(actor.name)}</b>: Rite of Summoning (DA:W p. 150).</p>
          <div class="form-group"><label>Spirit</label><select name="type" data-fixed>${types.map(t => `<option value="${t}">${esc(t)} (${D.summoning.diff[t]})</option>`).join("")}</select></div>
          <div class="form-group"><label>Hours spent summoning</label><input type="number" name="hours" value="0" min="0"/></div>${courtField()}</form>`;
        return dialog(`Summon a spirit: ${actor.name}`, content, "Summon", async fd => {
            const ce = courtEffect(actor, fd.court);
            const diff = clampDiff(G.summonDifficulty(fd.type, fd.hours, D.summoning) + ce.diff);
            const pool = poolOf(actor, "wits+rituals", info(actor));
            const rr = await rollPool(pool.dice, diff);
            let body = rollBlock(pool.label, rr, [`${fd.type}: difficulty ${diff}`, ...(ce.note ? [ce.note] : [])]), rolls = [rr.roll];
            if (rr.successes > 0) {
                const gr = await rollPool(effectiveGnosis(actor), 6);
                rolls.push(gr.roll);
                body += rollBlock("Gnosis", gr, ["the spirit's attitude"]) + `<div class="vta-big">${esc(G.summonAttitude(gr.successes, D.summoning))}</div>`;
                if (["Incarna", "Celestine avatar"].includes(fd.type)) body += `<div class="vta-note">Summoning an Incarna or Celestine earns Wisdom.</div>`;
            } else if (rr.botch) body += `<div class="vta-note bad">A botch: the wrong spirit answers, perhaps a Bane.</div>`;
            return post(actor, `${actor.name} summons a ${esc(fd.type)}`, body, rolls.filter(Boolean));
        });
    }

    /* ---------------- Fetishes and talens ---------------- */

    async function useFetish(actor) {
        const items = (actor.items ?? []).filter(it => it.type === "Fetish" || it.getFlag?.(MOD, "talen"));
        if (!items.length) return ctx.notify(`${actor.name} carries no fetishes or talens.`);
        const content = `<form><p><b>${esc(actor.name)}</b>: Gnosis ${info(actor).gnosis.temp}/${info(actor).gnosis.perm}.</p>
          <div class="form-group"><label>Item</label>${items.length > 5 ? searchBox("select[name=item]", "Search fetishes…", "Search fetishes") : ""}<select name="item">${items.map(it => `<option value="${it.id}">${esc(it.name)} (Gnosis ${n(it.system?.gnosis)})${it.getFlag?.(MOD, "attuned") ? " · attuned" : ""}${it.getFlag?.(MOD, "talen") || it.system?.type === "wod.types.talen" ? " · talen" : ""}${it.getFlag?.(MOD, "spent") ? " · spent" : ""}</option>`).join("")}</select></div>
          <div class="form-group"><label>Do</label><select name="how" data-fixed><option value="activate">Activate: Gnosis roll</option><option value="spend">Activate: spend 1 Gnosis (automatic)</option><option value="attune">Attune (first use)</option></select></div>
          <div class="form-group"><label>This is a talen (one use)</label><input type="checkbox" name="talen"/></div>
          <p class="vta-note">Attune and activate at difficulty = the item's Gnosis; no Rage in the same turn (W20 p. 221; DA:W p. 92). A talen's spirit goes free when used (DA:W p. 149).</p></form>`;
        return dialog(`Use a fetish: ${actor.name}`, content, "Use", async fd => {
            const it = actor.items.get(fd.item); if (!it) return null;
            const gn = Math.max(2, Math.min(10, n(it.system?.gnosis) || 6));
            const talen = fd.talen || !!it.getFlag?.(MOD, "talen") || it.system?.type === "wod.types.talen";
            if (it.getFlag?.(MOD, "spent")) { ctx.notify(`${it.name} is spent: its spirit has gone.`); return null; }
            let body = "", rolls = [], woke = false;
            if (fd.how === "spend") {
                const note = await pay(actor, "gnosis", 1); if (note === false) return null;
                woke = true;
                body += `<div class="vta-parts">${esc(note)}</div><div class="vta-big good">It wakes.</div>`;
            } else {
                const sp = silverPenalty(actor);
                const rr = await rollPool(effectiveGnosis(actor), gn);
                rolls.push(rr.roll);
                body += rollBlock("Gnosis", rr, [`difficulty ${gn}`, ...(sp ? [`${sp} less for silver carried`] : [])]);
                if (rr.successes > 0) {
                    if (fd.how === "attune") { await it.setFlag?.(MOD, "attuned", true); body += `<div class="vta-big good">Attuned (and dedicated).</div>`; }
                    else { woke = true; body += `<div class="vta-big good">It wakes.</div>`; }
                } else body += `<div class="vta-note">${fd.how === "attune" ? "Rejected: no new attempt until the Garou makes peace with the spirit." : "It stays silent."}</div>`;
            }
            body += await markTurn(actor, "gnosis");
            if (talen && woke) {
                await it.setFlag?.(MOD, "talen", true);
                await it.setFlag?.(MOD, "spent", true);
                body += `<div class="vta-note">The talen is spent; its spirit goes free. It stays on the sheet marked spent until someone removes it.</div>`;
            }
            return post(actor, `${actor.name}: ${esc(it.name)}`, body, rolls.filter(Boolean));
        });
    }

    /* ---------------- Renown, Rank, Battle Scars ---------------- */

    async function writeRenownLog(lines) {
        let j = game.journal.find(x => x.getFlag?.(MOD, "kind") === "renown");
        const row = `<li>${lines.map(esc).join("</li><li>")}</li>`;
        if (!j) j = await JournalEntry.create({ name: "WoDX Renown", flags: { [MOD]: { kind: "renown" } },
            pages: [{ name: "Log", type: "text", text: { content: `<ul>${row}</ul>` } }] });
        else { const p = j.pages.getName("Log"); if (p) await p.update({ "text.content": (p.text?.content ?? "<ul></ul>").replace(/<\/ul>\s*$/, `${row}</ul>`) }); }
        return j;
    }

    /** Change Renown on actors. deltas = {glory, honor, wisdom}. Returns the lines written. */
    async function applyRenown(actors, deltas, reason = "") {
        const b = basis(), D = DATA.garou ?? {};
        const lines = [];
        for (const actor of actors) {
            const i = info(actor);
            const upd = {};
            const parts = [];
            for (const k of RENOWN) {
                const d = n(deltas[k]); if (!d) continue;
                const r = G.renownChange(i.renown[k], d);
                upd[`system.renown.${k}.permanent`] = r.permanent;
                upd[`system.renown.${k}.temporary`] = r.temporary;
                i.renown[k] = { permanent: r.permanent, temporary: r.temporary };
                parts.push(`${renownLabel(i.fera, k)} ${d > 0 ? "+" : ""}${d}${r.notes.length ? ` (${r.notes.join(" ")})` : ""}`);
            }
            if (!parts.length) continue;
            await updateActor(actor, upd);
            const perm = Object.fromEntries(RENOWN.map(k => [k, i.renown[k].permanent]));
            const eligible = b === "daw" || D.rankChart?.[b] ? G.rankFor(i.auspice, perm, D.rankChart?.daw) : null;
            const rankNote = eligible !== null && eligible > i.rank ? ` Renown meets Rank ${eligible} (${D.rankNames?.[eligible] ?? ""}): a challenge set by a Garou of that rank is next (DA:W p. 101).` : "";
            lines.push(`${actor.name}: ${parts.join(", ")}${reason ? ` (${reason})` : ""}.${rankNote}`);
        }
        if (lines.length) {
            await writeRenownLog(lines);
            await ChatMessage.create({ content: `<div class="vta-card"><h3>Renown</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`, whisper: gmIds(), speaker: { alias: "WoDX" } });
        }
        return lines;
    }

    async function awardRenown() {
        if (!game.user.isGM) return ctx.notify("The Storyteller awards Renown.");
        const shifters = game.actors.filter(a => isShifter(a));
        const sel = new Set((canvas.tokens?.controlled ?? []).map(t => t.actor?.id));
        const content = `<form><p>Renown is earned only when others hear of the deed; spirits count (DA:W p. 98).</p>
          ${shifters.length > 5 ? searchBox("div.wodx-renown-actors", "Search characters…", "Search characters") : ""}
          <div class="wodx-renown-actors" style="max-height:220px;overflow-y:auto;flex:none">${shifters.map(a => `<div class="form-group" data-search-item><label>${esc(a.name)}</label><input type="checkbox" name="a_${a.id}" ${sel.has(a.id) ? "checked" : ""}/></div>`).join("")}</div>
          ${RENOWN.map(k => `<div class="form-group"><label>${cap(k)} (temporary)</label><input type="number" name="${k}" value="0"/></div>`).join("")}
          <div class="form-group"><label>For</label><input type="text" name="reason" placeholder="the deed"/></div>
          <p class="vta-note">Losses beyond the pool break a permanent dot into ten (DA:W p. 100). Fera use their own Renown names for the same three slots.</p></form>`;
        return dialog("Award Renown", content, "Award", async fd => {
            const actors = shifters.filter(a => fd[`a_${a.id}`]);
            if (!actors.length) { ctx.notify("Pick at least one character."); return null; }
            return applyRenown(actors, fd, fd.reason);
        });
    }

    async function accomplishment(actor) {
        const i = info(actor);
        const ready = RENOWN.filter(k => i.renown[k].temporary >= 10);
        if (!ready.length) return ctx.notify(`${actor.name} has no category with 10 temporary Renown.`);
        const content = `<form><p>The Rite of Accomplishment, performed by a Garou of equal or higher rank outside the pack, turns 10 temporary Renown into one permanent dot (DA:W pp. 99–100, 152).</p>
          <div class="form-group"><label>Category</label><select name="k" data-fixed>${ready.map(k => `<option value="${k}">${esc(renownLabel(i.fera, k))} (${i.renown[k].temporary})</option>`).join("")}</select></div></form>`;
        return dialog(`Rite of Accomplishment: ${actor.name}`, content, "Perform", async fd => {
            const r = G.accomplish(i.renown[fd.k]); if (!r) return null;
            await updateActor(actor, { [`system.renown.${fd.k}.permanent`]: r.permanent, [`system.renown.${fd.k}.temporary`]: r.temporary });
            await writeRenownLog([`${actor.name}: Rite of Accomplishment, ${renownLabel(i.fera, fd.k)} ${r.permanent} permanent.`]);
            return post(actor, `${actor.name}: Rite of Accomplishment`, `<div class="vta-big good">${esc(renownLabel(i.fera, fd.k))} ${r.permanent}</div>`);
        });
    }

    async function battleScar(actor) {
        const b = basis(), S = DATA.garou?.battleScars ?? {};
        const list = [...(S.daw ?? []), ...(b === "w20" ? S.w20extra ?? [] : [])];
        const content = `<form><p><b>${esc(actor.name)}</b>: pick a scar that fits the wound (DA:W pp. 93–94; W20 p. 260). Each gives temporary Glory; healing one later costs a Glory.</p>
          <div class="form-group"><label>Scar</label><select name="scar" data-fixed>${list.map((s, k) => `<option value="${k}">${esc(s.n)} (+${s.glory} Glory)</option>`).join("")}<option value="custom">Another (describe below)</option></select></div>
          <div class="form-group"><label>Notes</label><input type="text" name="notes"/></div>
          <div class="form-group"><label>Glory for a custom scar</label><input type="number" name="glory" value="1" min="0" max="3"/></div></form>`;
        return dialog(`Battle Scar: ${actor.name}`, content, "Record", async fd => {
            const s = fd.scar === "custom" ? { n: fd.notes || "Battle scar", glory: n(fd.glory), e: fd.notes } : list[n(fd.scar)];
            await actor.createEmbeddedDocuments("Item", [{ name: `Battle Scar: ${s.n}`, type: "Feature", img: "icons/svg/blood.svg",
                system: { type: "wod.types.flaw", description: `<p>${esc(s.e)}</p>${fd.notes && fd.scar !== "custom" ? `<p>${esc(fd.notes)}</p>` : ""}<p><em>${esc(S.page ?? "")}</em></p>` },
                flags: { [MOD]: { battleScar: s.n } } }]);
            if (s.glory) await applyRenown([actor], { glory: s.glory }, `Battle Scar: ${s.n}`);
            return post(actor, `${actor.name} bears a Battle Scar`, `<div class="vta-note"><b>${esc(s.n)}</b>: ${esc(s.e)}</div>`);
        });
    }

    /* ---------------- The Delirium, the Curse, Kinfolk ---------------- */

    function isKinfolk(a) { return !!P.worldFlag(a, "kinfolk"); }
    const HUMAN = ["mortal", "hunter", "ghoul"];

    async function deliriumCheck({ tokens: given = null } = {}) {
        if (!game.user.isGM) return ctx.notify("The Storyteller runs the Delirium.");
        const b = basis(), T = DATA.garou?.delirium;
        const tokens = given?.length ? given : [...(game.user.targets ?? [])].length ? [...game.user.targets] : (canvas.tokens?.controlled ?? []);
        if (!tokens.length) return ctx.notify("Target or select the witnesses first.");
        const content = `<form><p>${tokens.length} witness${tokens.length === 1 ? "" : "es"} of a Crinos. Reaction and memory by Willpower (${b === "daw" ? "DA:W p. 97" : "W20 p. 263"}); Kinfolk are immune.</p>
          <div class="form-group"><label>Witnesses who know the occult roll Wits + Occult (9) for extra Willpower</label><input type="checkbox" name="occult"/></div>
          <div class="form-group"><label>The shifter is a Ratkin (milder: +2)</label><input type="checkbox" name="ratkin"/></div></form>`;
        return dialog("The Delirium", content, "Check", async fd => {
            const rows = [], rolls = [];
            for (const tok of tokens) {
                const a = tok.actor; if (!a) continue;
                const k = P.detectProfile(a);
                if (isKinfolk(a)) { rows.push(`<li><b>${esc(a.name)}</b>: Kinfolk, untouched.</li>`); continue; }
                if (!HUMAN.includes(k)) { rows.push(`<li><b>${esc(a.name)}</b>: not human (${esc(P.profileLabel(k))}); no Delirium.</li>`); continue; }
                let w = n(a.system?.advantages?.willpower?.permanent) || 3;
                let extra = "";
                if (fd.ratkin) { w += 2; extra += " +2 (Ratkin)"; }
                if (fd.occult) {
                    const occ = n(findAbility(a, "occult")?.value);
                    if (occ) { const rr = await rollPool(attr(a, "wits") + occ, 9); rolls.push(rr.roll); if (rr.successes > 0) { w += rr.successes; extra += ` +${rr.successes} (Wits + Occult)`; } }
                }
                const d = G.delirium(w, b, T);
                rows.push(`<li><b>${esc(a.name)}</b> (Willpower ${d.willpower}${esc(extra)}): ${esc(d.reaction)}; ${esc(d.memory)}.</li>`);
            }
            return ChatMessage.create({ content: `<div class="vta-card"><h3>The Delirium</h3><ul>${rows.join("")}</ul></div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, rolls: rolls.filter(Boolean) });
        });
    }

    async function curse(actor) {
        const i = info(actor);
        const t = targetActorOf();
        if (!t) return ctx.notify("Target the human first.");
        const w = n(t.system?.advantages?.willpower?.permanent) || 3;
        const k = P.detectProfile(t);
        const affected = HUMAN.includes(k) || (basis() === "daw" && k === "hunter");
        const dice = affected ? G.curseDice(i.rage.temp, w) : 0;
        return post(actor, `The Curse: ${actor.name} and ${t.name}`, `<div class="vta-note">${affected ? `Rage ${i.rage.temp} against Willpower ${w}: −${dice} dice on ${esc(actor.name)}'s Social rolls with ${esc(t.name)} (DA:W p. 91).` : `${esc(t.name)} is not human; the Curse doesn't bite (DA:W p. 91).`}</div>`);
    }

    async function kinfolk(actor) {
        const tribes = DATA.garou?.tribes ?? {};
        const cur = P.worldFlag(actor, "kinfolk") ?? "";
        const content = `<form><p><b>${esc(actor.name)}</b>: Kinfolk are immune to the Delirium and may bear Garou (DA:W p. 85).</p>
          <div class="form-group"><label>Kin to</label><select name="tribe" data-fixed><option value="">Not Kinfolk</option>${Object.entries(tribes).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(v.label)}</option>`).join("")}<option value="fera" ${cur === "fera" ? "selected" : ""}>Fera</option></select></div></form>`;
        return dialog(`Kinfolk: ${actor.name}`, content, "Save", async fd => {
            await P.setWorldFlag(actor, "kinfolk", fd.tribe || null);
            return post(actor, `${actor.name}`, `<div class="vta-note">${fd.tribe ? `Kinfolk to the ${esc(tribes[fd.tribe]?.label ?? "Fera")}.` : "Not Kinfolk."}</div>`);
        });
    }

    /* ---------------- Chiminage ---------------- */

    async function chiminage(actor) {
        const content = `<form><p>Record a debt owed to a spirit or a caern, or one paid (DA:W pp. 144, 167, 170).</p>
          <div class="form-group"><label>To</label><input type="text" name="to" placeholder="the spirit or caern"/></div>
          <div class="form-group"><label>For</label><input type="text" name="for" placeholder="teaching a Gift, a bridge, a binding…"/></div>
          <div class="form-group"><label>Owed</label><input type="text" name="owed" placeholder="the task or gift"/></div>
          <div class="form-group"><label>Paid</label><input type="checkbox" name="paid"/></div>${courtField()}</form>`;
        return dialog(`Chiminage: ${actor.name}`, content, "Record", async fd => {
            const line = `${actor.name} ${fd.paid ? "paid" : "owes"} ${fd.to || "a spirit"}: ${fd.owed || "?"}${fd.for ? ` (for ${fd.for})` : ""}.`;
            let j = game.journal.find(x => x.getFlag?.(MOD, "kind") === "chiminage");
            const row = `<li>${esc(line)}</li>`;
            if (!j) j = await JournalEntry.create({ name: "WoDX Chiminage", flags: { [MOD]: { kind: "chiminage" } }, pages: [{ name: "Debts", type: "text", text: { content: `<ul>${row}</ul>` } }] });
            else { const p = j.pages.getName("Debts"); if (p) await p.update({ "text.content": (p.text?.content ?? "<ul></ul>").replace(/<\/ul>\s*$/, `${row}</ul>`) }); }
            // The court's regard moves when the Storyteller records it (Otherworlds 0.16.0): paid +1; owed and not paid is recorded there
            if (fd.paid && fd.court && game.user.isGM) await spiritApi()?.move?.(actor, "paid", { court: fd.court, why: line });
            return post(actor, "Chiminage", `<div class="vta-note">${esc(line)}</div>`);
        });
    }

    /* ---------------- Automatic parts ---------------- */

    /** Nightfall (B40): every shapechanger on the active scene, or owned by a player, regains Rage by the moon. */
    async function moonRise({ force = false } = {}) {
        if (!isActiveGM()) return [];
        const m = await moonNow();
        if (!m.isNight && !force) return [];
        const nightKey = m.hour < 12 ? m.jdn - 1 : m.jdn;
        if (!force && game.settings.get(MOD, "moonNight") === nightKey) return [];
        await game.settings.set(MOD, "moonNight", nightKey);
        if (!setting("moonRage")) return [];
        const b = basis();
        const onScene = new Set((game.scenes?.active?.tokens ?? []).map(t => t.actor).filter(Boolean));
        const actors = new Set([...onScene, ...game.actors.filter(a => a.hasPlayerOwner)].filter(a => isShifter(a)));
        const lines = [];
        for (const a of actors) {
            const i = info(a);
            if (i.fera?.rage === false || (i.fera?.rageAt && i.fera.rageAt !== "moon")) continue;
            if (i.rage.perm <= 0) continue; // a sheet with no Rage set up (a template, a blank sheet)
            if (i.rage.temp <= 0 && i.willpower.temp <= 0) { lines.push(`${a.name}: lost the wolf; no Rage until Willpower returns.`); continue; }
            const g = G.moonRage(m.index, i.auspice, b, DATA.garou?.moonRage);
            const max = Math.max(i.rage.perm, i.rage.temp);
            const to = g === "all" ? Math.max(i.rage.temp, i.rage.perm) : Math.min(max, i.rage.temp + g);
            if (to > i.rage.temp) { await a.update({ "system.advantages.rage.temporary": to }); lines.push(`${a.name}: Rage ${i.rage.temp} → ${to}${g === "all" ? " (auspice moon)" : ""}`); }
        }
        if (lines.length) await ChatMessage.create({ content: `<div class="vta-card"><h3>Moonrise: ${esc(m.name)}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul><p class="wodx-quiet">${b === "daw" ? "DA:W p. 91" : "W20 p. 145"}</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" } });
        return lines;
    }

    /** Each new round (active GM): shapechangers in the fight regenerate. */
    async function regenRound(combat) {
        if (!isActiveGM() || !setting("autoRegen")) return [];
        const lines = [], rolls = [];
        for (const c of combat.combatants ?? []) {
            const a = c.actor; if (!a || !isShifter(a)) continue;
            const i = info(a);
            const r = G.regeneration({ breed: i.breed, form: i.form, fera: i.fera });
            const h = a.system?.health?.damage ?? {};
            if (!r.regen || r.condition) continue;
            const type = n(h.lethal) ? "lethal" : n(h.bashing) ? "bashing" : null;
            if (!type) continue;
            if (type === "lethal") {
                const rr = await rollPool(attr(a, "stamina"), 8); rolls.push(rr.roll);
                if (!(rr.successes > 0)) { lines.push(`${a.name}: the lethal wound doesn't close (Stamina at 8${rr.botch ? ", botch: no more until rest" : ""}).`); continue; }
            }
            if (game.wodxCombat?.healDamage) await game.wodxCombat.healDamage(a, type, 1);
            lines.push(`${a.name}: one ${type} level regenerates.`);
        }
        if (lines.length) await ChatMessage.create({ content: `<div class="vta-card"><h3>Regeneration, round ${combat.round}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul><p class="wodx-quiet">DA:W p. 102; W20 p. 256</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, rolls: rolls.filter(Boolean) });
        return lines;
    }

    /** Dark Ages: Embrace Pain — the first wound of a fight gives a Rage point, unless in frenzy (DA:W p. 91). */
    async function embracePain(actor, before, after) {
        if (!isActiveGM() || basis() !== "daw" || !game.combat?.started || !isShifter(actor)) return false;
        const total = d => n(d?.bashing) + n(d?.lethal) + n(d?.aggravated);
        if (total(after) <= total(before) || actor.system?.conditions?.isfrenzy) return false;
        if (actor.getFlag?.(MOD, "embracedPain") === game.combat.id) return false;
        await actor.setFlag?.(MOD, "embracedPain", game.combat.id);
        const r = P.resource(actor, "rage");
        if (r.ok && r.value < Math.max(r.max || 10, r.perm || 0)) await P.adjust(actor, "rage", 1);
        return true;
    }

    async function onChatButton(btn) {
        const actor = await fromUuid(btn.dataset.actor);
        const a = actor?.actor ?? actor;
        if (!a?.isOwner) return ctx.notify("Only the character's owner can choose.");
        const k = btn.dataset.garou;
        if (k === "resist") { if (await spendWillpower(a, 1)) return post(a, `${a.name} holds the frenzy back`, `<div class="vta-note">One Willpower: no frenzy, but no more actions this turn.</div>`); return; }
        if (k === "berserk") return enterFrenzy(a, "berserk", { thrall: btn.dataset.thrall === "1" });
        if (k === "fox") return enterFrenzy(a, "fox");
        if (k === "scar") return battleScar(a);
    }

    return { shift, rageRoll, enterFrenzy, endFrenzy, spendRage, remainActive, meditate, useGift, learnGift, performRite, summonSpirit, useFetish,
        awardRenown, applyRenown, accomplishment, battleScar, deliriumCheck, curse, kinfolk, chiminage, moonRise, regenRound, embracePain, onChatButton, setForm, info };
}

/** Settings this part adds (registered by main.js). */
export function registerSettings(register) {
    register("moonRage", "Moon Rage at nightfall", "When night falls, shapechangers on the active scene and players' characters regain Rage by the moon (DA:W p. 91, W20 p. 145).", Boolean, true);
    register("autoRegen", "Regenerate each round", "In a fight, shapechangers regenerate a bashing or lethal level each round, rolling Stamina (8) for lethal (DA:W p. 102; W20 p. 256).", Boolean, true);
    game.settings.register(MOD, "moonNight", { scope: "world", config: false, type: Number, default: -1 });
}

/* ------------------------------------------------------------------ */
/*  For WoDX Combat                                                    */
/* ------------------------------------------------------------------ */

/**
 * B3636: Gnosis the bearer loses to silver fetishes WoDX made (klaive 1, grand klaive 2; W20 pdf 227 to 228), for any
 * shapechanger that fears silver. A made fetish and its weapon are one thing (flags.wodx-library.wonder).
 */
export function silverPenalty(actor) {
    if (!banesOf(actor).includes("silver")) return 0;
    const seen = new Set(); let klaive = 0, grand = 0;
    for (const it of actor?.items ?? []) {
        const f = it?.flags?.["wodx-library"]?.wonder;
        if (!f?.silver || seen.has(`${f.key}|${f.at ?? ""}`)) continue;
        seen.add(`${f.key}|${f.at ?? ""}`);
        if (f.silver >= 2) grand++; else klaive++;
    }
    return G.silverGnosisPenalty({ klaive, grand });
}
/** Gnosis as dice, less carried silver. */
export const effectiveGnosis = actor => Math.max(0, info(actor).gnosis.perm - silverPenalty(actor));
/** The bane metals this shapechanger fears (Garou: silver; Corax: gold; Mokole: both). */
export function banesOf(actor) {
    return info(actor).fera?.bane ?? ["silver"];
}
/** How a bane metal hurts this shapechanger in its current form, by the era's rules. */
export function baneFor(actor, metal = "silver") {
    const i = info(actor);
    return G.baneEffect({ b: basis(), breed: i.breed, form: i.form, metal, fera: i.fera });
}
/** Can this shapechanger soak aggravated damage with Stamina now? Dark Ages: not in Homid form (DA:W p. 102). */
export function aggSoak(actor) {
    return !(basis() === "daw" && info(actor).form === "homid");
}
/** The form's teeth and claws (DA:W pp. 106–107; W20 p. 285): {bite, claw, biteBonus, note}. Types are null when the form has none. */
export function naturalWeapons(actor) {
    const f = info(actor).form, daw = basis() === "daw";
    const T = {
        homid: { bite: "bashing", claw: null },
        // W20 p. 296: Glabro may bite at difficulty 8 for Strength - 1 lethal, and claws for Strength + 1 bashing (B1208)
        glabro: daw ? { bite: "lethal", claw: null } : { bite: "lethal", claw: "bashing", biteBonus: -2, biteDiff: 8 },
        crinos: daw ? { bite: "aggravated", claw: "aggravated" } : { bite: "aggravated", claw: "aggravated", biteDiff: 5 },
        hispo: { bite: "aggravated", claw: "aggravated", biteBonus: 1 },
        // W20 gives Lupus claws as lethal in the form text (p. 287) and bashing in the maneuver (p. 296): the form text wins (B1208)
        lupus: daw ? { bite: "lethal", claw: null } : { bite: "aggravated", claw: "lethal" }
    }[f] ?? { bite: "bashing", claw: null };
    return { form: f, biteBonus: 0, ...T, note: daw ? "DA:W pp. 106–107" : "W20 pp. 287, 296" };
}
