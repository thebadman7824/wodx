/**
 * WoDX Actions (B7904-B7909): a Dark Ages mage's household and standing (Dark Ages: Mage pp. 37, 83-93).
 *
 *   The household window   the chantry's points and the talk it draws, the Familiar and its weekly meal, Destiny,
 *                          the Library and a Pillar bought with experience, servants and the apprentice, talismans,
 *                          the fellowship's degree, and the merits and flaws that work through these windows
 *   Each week (clock)      the familiar is fed or weakens; an unaccepted chantry starts talk; a lazy apprentice
 *                          makes a mess
 *   On a casting           (mage-da.js) an attuned talisman as a focus, a salt ward, Repulsive Practice seen,
 *                          Arcane Madness, an Inept Channeler, the familiar taking a Backlash
 *
 * Built by mage-da.js with its helpers. Pure rules: mage-household-rules.js.
 */
import * as H from "../../wodx-rules/actions/mage-household-rules.js";
import * as M from "../../wodx-rules/actions/mage-da-rules.js";
import * as P from "./profiles.js";
import * as MW from "./mage-wonders.js";
import {WEEK, HOUR, DAY} from "../../wodx-rules/core/terms.mjs";

const MOD = "wodx-actions";
const REF = H.REF;
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const storyNow = () => { try { return game.settings.get(MOD, "storyId") || "first"; } catch (e) { return "first"; } };
const weekNow = () => Math.floor((game.time?.worldTime ?? 0) / WEEK);
const traits = () => game.modules.get("wodx-chronicle")?.api?.traits ?? null;
/** The rating of a merit or flaw on the sheet (0 when not held). */
const meritOf = (actor, key) => { try { return Math.max(0, Number(traits()?.has?.(actor, key)) || 0); } catch (e) { return 0; } };
const applyTimed = (actor, o) => game.modules.get("wodx-chronicle")?.api?.applyTimed?.(actor, o);
const rumour = o => game.modules.get("wodx-storyteller")?.api?.rumours?.start?.(o);
/** Whisper to the Storyteller and the character's players. */
const whisperTo = actor => [...new Set([...gmIds(), ...game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => u.id)])];

/** A degree shows once the Storyteller has named one. */
const degreeSet = h => Number(h?.degree) > 0;

export function build(ctx, { info, backlash }) {
    const { post, rollPool, rollBlock, dialog, setFlag, attr, background, spendWillpower, notify } = ctx;
    const permWill = actor => n(ctx.willpower?.(actor)?.perm ?? actor?.system?.advantages?.willpower?.permanent);
    const tempWill = actor => n(ctx.willpower?.(actor)?.temp ?? actor?.system?.advantages?.willpower?.temporary);
    const abilityOf = (actor, k) => n(ctx.findAbility?.(actor, k)?.value);
    const house = actor => foundry.utils.deepClone(actor.getFlag(MOD, "daHouse") ?? {});
    const saveHouse = (actor, patch) => setFlag(actor, "daHouse", { ...(actor.getFlag(MOD, "daHouse") ?? {}), ...patch });
    const bg = (actor, k) => n(background(actor, k));

    /** What the household is now, for the sheet and the window. */
    function view(actor) {
        const h = house(actor), i = info(actor);
        const chantry = H.chantryPlan(bg(actor, "Chantry"), h.chantry ?? {}, { flaws: !!h.chantry?.flaws });
        const famR = bg(actor, "Familiar"), fam = h.familiar ?? {};
        const strength = H.familiarStrength(fam, famR);
        const deg = i.fellowship && degreeSet(h) ? H.degreeOf(i.fellowship, h.degree ?? 1, { organised: h.organised !== false }) : null;
        return { h, i, chantry, place: String(h.chantry?.place ?? "") || `${actor.name}'s house`, famR, fam, strength,
            boons: H.boonsNow(fam.boons ?? {}, strength), destiny: bg(actor, "Destiny"), library: bg(actor, "Library"),
            servantsR: bg(actor, "Servants"), servants: Array.isArray(h.servants) ? h.servants : [], talismanR: bg(actor, "Talisman"),
            talismans: Array.isArray(h.talismans) ? h.talismans : [], degree: deg, apprentice: h.apprentice ?? null,
            merits: { devotion: meritOf(actor, "devotion"), madness: meritOf(actor, "arcane-madness"), inept: meritOf(actor, "inept-channeler"),
                chicanery: meritOf(actor, "chicanery"), livingFount: meritOf(actor, "living-fount"), natural: meritOf(actor, "pillar-natural"),
                witchwalk: meritOf(actor, "witchwalk"), repulsive: meritOf(actor, "repulsive-practice"),
                apprenticeMerit: traits()?.of?.(actor)?.matched?.some?.(m => m.key === "apprentice" && m.entry?.kind === "merit") ?? false,
                apprenticeFlaw: traits()?.of?.(actor)?.matched?.some?.(m => m.key === "apprentice" && m.entry?.kind === "flaw") ?? false } };
    }

    /** One line for the Fellowship sheet. */
    function sheetLine(actor) {
        const v = view(actor);
        const parts = [];
        if (v.degree?.title) parts.push(`Degree: ${v.degree.title} (${v.degree.rank} of ${v.degree.top})`);
        if (bg(actor, "Chantry")) parts.push(`Chantry: ${v.chantry.ok ? v.chantry.size.what : "points to set"}; Aura on its grounds ±${H.auraOnGrounds(v.i.foundation, v.chantry.auraDamp ?? 0)}`);
        if (v.famR) parts.push(`Familiar${v.fam.name ? ` ${v.fam.name}` : ""}: ${v.fam.dead ? "dead" : `strength ${v.strength} of ${v.famR}`}`);
        if (v.servants.length) parts.push(`${v.servants.length} servant${v.servants.length === 1 ? "" : "s"}`);
        if (v.talismans.length) parts.push(`talismans: ${v.talismans.map(t => t.name).join(", ")}`);
        return parts.join(". ");
    }

    /* -------------------------------------------------------------- */
    /*  The window                                                     */
    /* -------------------------------------------------------------- */

    const CHOICES = [
        ["chantry", "The chantry: its points and its place", () => true],
        ["familiar", "The familiar's Pact and boons", v => v.famR > 0],
        ["feed", "Feed the familiar this week", v => v.famR > 0 && !v.fam.dead],
        ["destiny", "Destiny against danger (once a story)", v => v.destiny > 0],
        ["library", "Search the Library", v => v.library > 0],
        ["pillar", "Raise a Pillar with experience", v => !!v.i.fellowship],
        ["servant", "Take on a servant", v => v.servantsR > 0 || v.merits.apprenticeMerit || v.merits.apprenticeFlaw],
        ["bribe", "Someone works on a servant (Storyteller)", v => v.servants.length > 0],
        ["teach", "Teach the apprentice", v => v.servants.some(s => s.apprentice)],
        ["talisman", "A talisman: add one, or use one", v => v.talismanR > 0 || v.talismans.length > 0],
        ["degree", "The fellowship's degree (Storyteller)", v => !!v.i.fellowship],
        ["devotion", "Pray (Devotion, once a session)", v => v.merits.devotion > 0],
        ["fount", "Listen to the Living Fount (once a story)", v => v.merits.livingFount > 0],
        ["show", "A small show of magic", v => !!v.i.fellowship],
        ["witchwalk", "The witchwalk (Storyteller)", v => v.merits.witchwalk > 0],
        // B7927-B7930: enchanting as a craft, and Tass (pp. 190-207)
        ["enchant", "Enchant a wonder (a charm, an elixir, a tool)", v => !!v.i.fellowship],
        ["use", "Use a wonder (an elixir or poultice)", () => true],
        ["tass", "Harvest Tass from a creature or a fae", () => true]
    ];

    async function open(actor) {
        const v = view(actor);
        const opts = CHOICES.filter(([, , ok]) => ok(v)).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("");
        const content = `<form class="wodx-da-house"><p><b>${esc(actor.name)}</b>${v.degree?.title ? `, ${esc(v.degree.title)} of the ${esc(v.i.F?.label ?? "")}` : ""}. ${esc(sheetLine(actor) || "No household yet.")}</p>
          <div class="form-group"><label>What</label><select name="what" data-fixed>${opts}</select></div>
          <p class="wodx-quiet">${REF} pp. 37, 83-93.</p></form>`;
        return dialog(`The household: ${actor.name}`, content, "Next", async fd => {
            const fn = STEPS[fd.what];
            return fn ? fn(actor) : null;
        }, { width: 480 });
    }

    /* -------------------------------------------------------------- */
    /*  Chantry (pp. 83-84)                                            */
    /* -------------------------------------------------------------- */

    async function chantry(actor) {
        const v = view(actor), c = v.h.chantry ?? {}, pool = bg(actor, "Chantry");
        const num = (k, lo, hi) => `<input type="number" name="${k}" min="${lo}" max="${hi}" value="${n(c[k])}"/>`;
        const content = `<form><p>Chantry ${pool}: each point buys size, security (+1 to break in), Aura damping on the grounds, or a place in the community. With no community points the commoners talk about the place (${REF} pp. 83-84).</p>
          <div class="form-group"><label>What it is, and where</label><input type="text" name="place" maxlength="80" value="${esc(c.place ?? "")}"/></div>
          <div class="form-group"><label>Size</label>${num("size", 0, 10)}</div>
          <div class="form-group"><label>Security</label>${num("security", H.CHANTRY_FLAW_FLOOR, 10)}</div>
          <div class="form-group"><label>Aura damping</label>${num("aura", 0, 5)}</div>
          <div class="form-group"><label>A place in the community</label>${num("community", 0, 10)}</div>
          <div class="form-group"><label><input type="checkbox" name="flaws"${c.flaws ? " checked" : ""}/> Chantry flaws allowed: security may go below nothing (Storyteller, p. 84)</label></div></form>`;
        return dialog(`The chantry: ${actor.name}`, content, "Save", async fd => {
            const spend = { size: n(fd.size), security: n(fd.security), aura: n(fd.aura), community: n(fd.community) };
            const plan = H.chantryPlan(pool, spend, { flaws: !!fd.flaws && (game.user.isGM || !!c.flaws) });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            await saveHouse(actor, { chantry: { ...spend, flaws: !!fd.flaws, place: String(fd.place ?? "").trim().slice(0, 80) } });
            const talk = H.gossipDue({ community: plan.community }, 0);
            return post(actor, `The chantry: ${actor.name}`, `<div class="vta-res">${esc(String(fd.place || "The chantry"))}: ${esc(plan.size.what)} (room for ${plan.size.room}); +${plan.breakIn} to break in; Aura on the grounds as if the Foundation were ${plan.auraDamp} lower.</div>
              <div class="vta-note">${talk ? `The commoners ${talk.tone === "damaging" ? "talk about it every week" : talk.tone === "wary" ? "wonder about it every second week" : "mention it now and then, kindly enough"}.` : "The place is accepted: no one talks."}${plan.left ? ` ${plan.left} point${plan.left === 1 ? "" : "s"} unspent.` : ""}</div><div class="wodx-quiet">${REF} pp. 83-84</div>`);
        });
    }

    /* -------------------------------------------------------------- */
    /*  Familiar (pp. 85-86)                                           */
    /* -------------------------------------------------------------- */

    async function familiar(actor) {
        const v = view(actor), f = v.fam;
        const boonRow = ([k, d]) => `<div class="form-group"><label>${esc(d.label)} <small>${esc(d.what)}</small></label><input type="number" name="b-${k}" min="0" max="${d.max}" value="${n(f.boons?.[k])}"/></div>`;
        const content = `<form><p>Familiar ${v.famR}: ${esc(H.FAMILIAR_RANKS[Math.min(5, v.famR)])}. The Pact binds both; the familiar eats ${H.feedCost(v.famR)} Quintessence a week or weakens (${REF} pp. 85-86).</p>
          <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="60" value="${esc(f.name ?? "")}"/></div>
          <div class="form-group"><label>Its shape</label><input type="text" name="form" maxlength="60" value="${esc(f.form ?? "")}"/></div>
          <div class="form-group"><label>The Pact: how long, what each owes, what each may not do</label><input type="text" name="pact" maxlength="300" value="${esc(f.pact ?? "")}"/></div>
          <fieldset><legend>Boons: ${v.famR} dot${v.famR === 1 ? "" : "s"} to spend</legend>${Object.entries(H.FAMILIAR_BOONS).map(boonRow).join("")}</fieldset></form>`;
        return dialog(`The familiar: ${actor.name}`, content, "Save", async fd => {
            const plan = H.familiarPlan(v.famR, Object.fromEntries(Object.keys(H.FAMILIAR_BOONS).map(k => [k, n(fd[`b-${k}`])])));
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            await saveHouse(actor, { familiar: { ...f, name: String(fd.name ?? "").slice(0, 60), form: String(fd.form ?? "").slice(0, 60), pact: String(fd.pact ?? "").slice(0, 300), boons: plan.boons, lastWeek: f.lastWeek ?? weekNow() - 1 } });
            return post(actor, `The familiar: ${actor.name}`, `<div class="vta-res">${esc(fd.name || "The familiar")}${fd.form ? `, ${esc(fd.form)}` : ""}: ${Object.entries(plan.boons).filter(([, x]) => x).map(([k, x]) => `${esc(H.FAMILIAR_BOONS[k].label)} ${x}`).join(", ") || "no boons yet"}.</div>${fd.pact ? `<div class="vta-note">The Pact: ${esc(fd.pact)}</div>` : ""}<div class="vta-note">It eats ${H.feedCost(v.famR)} Quintessence a week.</div><div class="wodx-quiet">${REF} pp. 85-86</div>`);
        });
    }

    /** Feed the familiar this week: its rating in Quintessence from the mage. */
    async function feed(actor) {
        const v = view(actor), cost = H.feedCost(v.famR), week = weekNow();
        if (!v.famR || v.fam.dead) { notify(`${actor.name} has no living familiar.`); return null; }
        if (n(v.fam.fedWeek) === week && v.fam.fedWeek !== undefined) { notify(`${v.fam.name || "The familiar"} has eaten this week.`); return null; }
        const q = P.resource(actor, "quintessence").value;
        if (q < cost) { notify(`${actor.name} has ${q} Quintessence; the familiar needs ${cost}.`); return null; }
        await P.adjust(actor, "quintessence", -cost);
        await saveHouse(actor, { familiar: { ...v.fam, fedWeek: week, lastWeek: v.fam.lastWeek ?? week - 1 } });
        return post(actor, `${actor.name} feeds the familiar`, `<div class="vta-res good">${esc(v.fam.name || "The familiar")} eats ${cost} Quintessence: fed for this week${n(v.fam.weak) ? `; it was weakened by ${n(v.fam.weak)} and recovers a dot next week` : ""}.</div><div class="wodx-quiet">${REF} p. 85</div>`);
    }

    /** The Backlash card's button: the familiar takes the Backlash (once a story a dot; a bad one, three 1s or more, costs two). */
    function familiarCanTake(actor, ones) {
        const v = view(actor);
        if (!v.famR || v.fam.dead) return 0;
        const cost = n(ones) >= 3 ? 2 : 1;
        return H.boonLeft(v.fam, "backlash", n(v.boons.backlash), storyNow()) >= cost ? cost : 0;
    }
    async function familiarTakes(actor, ones) {
        const cost = familiarCanTake(actor, ones);
        if (!cost) return null;
        const v = view(actor);
        await saveHouse(actor, { familiar: H.useBoon(v.fam, "backlash", storyNow(), cost) });
        return { cost, name: v.fam.name || "The familiar" };
    }

    /* -------------------------------------------------------------- */
    /*  Destiny (p. 85)                                                */
    /* -------------------------------------------------------------- */

    async function destiny(actor) {
        const v = view(actor), d = v.h.destiny ?? {};
        const open = H.destinyOpen(d, storyNow(), v.destiny);
        if (!open.ok) { notify(`${actor.name}: ${open.why}.`); return null; }
        const content = `<form><p>${esc(H.DESTINY[Math.min(5, v.destiny)])}: once a story, when danger threatens to leave it unfulfilled, roll ${open.dice} at ${open.difficulty}; each success gives back a spent Willpower (${REF} p. 85).</p>
          <div class="form-group"><label>The danger</label><input type="text" name="why" maxlength="120" value=""/></div>
          <div class="form-group"><label><input type="checkbox" name="done"/> The destiny is fulfilled (Storyteller): the Background goes</label></div></form>`;
        return dialog(`Destiny: ${actor.name}`, content, "Roll", async fd => {
            if (fd.done && game.user.isGM) {
                await saveHouse(actor, { destiny: { ...d, fulfilled: true } });
                return post(actor, `${actor.name}'s destiny is fulfilled`, `<div class="vta-big good">The destiny is met. The Background is gone; the Storyteller may give a permanent Willpower.</div><div class="wodx-quiet">${REF} p. 85</div>`);
            }
            const r = await rollPool(open.dice, open.difficulty);
            const room = Math.max(0, permWill(actor) - tempWill(actor));
            const back = H.destinyWillpower(r, room);
            if (back) await spendWillpower(actor, -back);
            await saveHouse(actor, { destiny: { ...d, story: storyNow() } });
            return post(actor, `${actor.name}: Destiny`, rollBlock(`Destiny ${v.destiny}`, r, [`difficulty ${open.difficulty}`]) + `<div class="vta-res ${back ? "good" : ""}">${back ? `+${back} Willpower` : "No Willpower back"}${fd.why ? ` against ${esc(fd.why)}` : ""}.</div><div class="wodx-quiet">${REF} p. 85</div>`, [r.roll].filter(Boolean));
        });
    }

    /* -------------------------------------------------------------- */
    /*  Library (p. 87) and a Pillar by experience (pp. 89-93)         */
    /* -------------------------------------------------------------- */

    async function library(actor) {
        const v = view(actor);
        const content = `<form><p>Library ${v.library}: ${esc(H.LIBRARY[Math.min(5, v.library)])}. Intelligence + Library against the difficulty the Storyteller sets (${REF} p. 87).</p>
          <div class="form-group"><label>What is sought</label><input type="text" name="what" maxlength="120" value=""/></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" min="3" max="10" value="7"/></div></form>`;
        return dialog(`The Library: ${actor.name}`, content, "Search", async fd => {
            const r = await rollPool(attr(actor, "intelligence") + v.library, Math.max(3, Math.min(10, n(fd.diff) || 7)));
            return post(actor, `${actor.name} searches the Library`, rollBlock("Intelligence + Library", r, [`difficulty ${n(fd.diff) || 7}`]) + `<div class="vta-res">${r.successes > 0 ? `Found${fd.what ? `: ${esc(fd.what)}` : ""}, as far as these books know it.` : r.botch ? "A wrong reading, believed." : "Nothing in these pages."}</div><div class="wodx-quiet">${REF} p. 87</div>`, [r.roll].filter(Boolean));
        });
    }

    const xpAvailable = actor => { let earned = 0, spent = 0; for (const it of actor.items ?? []) if (it.type === "Experience") { const a = n(it.system?.amount); if (it.system?.isspent) spent += a; else earned += a; } return earned - spent; };
    async function pillar(actor) {
        const v = view(actor);
        const natural = String(v.h.naturalPillar ?? "");
        const content = `<form><p>A Pillar's next dot: current × 6 experience, a new one 10${v.merits.natural ? `; Pillar Natural makes the chosen Pillar current × 5, a new one 8` : ""}. ${v.library ? `The Library at ${H.LIBRARY_XP_DIFF} takes one off a success. ` : ""}It takes months of study, or weeks of nothing else (${REF} pp. 87, 89-90, 93). Experience on hand: ${xpAvailable(actor)}.</p>
          <div class="form-group"><label>Pillar</label><select name="p" data-fixed>${v.i.pillars.map(p => `<option value="${p.key}">${esc(p.label)} ${p.rating}</option>`).join("")}</select></div>
          ${v.merits.natural ? `<div class="form-group"><label>The Pillar Natural</label><select name="nat" data-fixed>${v.i.pillars.map(p => `<option value="${p.key}"${p.key === natural ? " selected" : ""}${natural && p.key !== natural ? " disabled" : ""}>${esc(p.label)}</option>`).join("")}</select></div>` : ""}
          ${v.library ? `<div class="form-group"><label><input type="checkbox" name="lib" checked/> Study with the Library (roll ${v.library} at ${H.LIBRARY_XP_DIFF})</label></div>` : ""}</form>`;
        return dialog(`A Pillar by experience: ${actor.name}`, content, "Learn", async fd => {
            const p = v.i.pillars.find(x => x.key === fd.p);
            if (!p) return null;
            if (p.rating >= 5) { notify(`${p.label} is at 5.`); return null; }
            if (!game.user.isGM) { notify("The Storyteller approves experience spends: ask for this one."); return null; }
            const nat = v.merits.natural ? (natural || fd.nat) : "";
            let r = null;
            if (fd.lib && v.library) r = await rollPool(v.library, H.LIBRARY_XP_DIFF);
            const price = H.pillarPrice(p.rating, { natural: nat === p.key, librarySuccesses: r && !r.botch ? r.successes : 0 });
            if (xpAvailable(actor) < price.cost) { notify(`${actor.name} has ${xpAvailable(actor)} experience; ${p.label} ${p.rating + 1} costs ${price.cost}.`); return null; }
            await actor.createEmbeddedDocuments("Item", [{ name: `Pillar: ${p.label} ${p.rating + 1}`, type: "Experience", system: { amount: price.cost, isspent: true },
                flags: { "wodx-creation": { time: game.time.worldTime, kind: "pillar", key: p.key, by: game.user.name } } }]);
            const f = actor.getFlag(MOD, "daMage") ?? {};
            await setFlag(actor, "daMage", { ...f, pillars: { ...(f.pillars ?? {}), [p.key]: p.rating + 1 } });
            if (nat && !natural) await saveHouse(actor, { naturalPillar: nat });
            return post(actor, `${actor.name} learns ${p.label} ${p.rating + 1}`, `${r ? rollBlock(`Library ${v.library}`, r, [`difficulty ${H.LIBRARY_XP_DIFF}`]) : ""}<div class="vta-res good">${p.label} ${p.rating + 1} for ${price.cost} experience${price.off ? ` (${price.base}, less ${price.off} for the Library)` : ""}${nat === p.key ? "; a Pillar Natural" : ""}.</div><div class="wodx-quiet">${REF} pp. 87, 89, 93</div>`, [r?.roll].filter(Boolean));
        });
    }

    /* -------------------------------------------------------------- */
    /*  Servants (pp. 87-88) and the apprentice (p. 92)                */
    /* -------------------------------------------------------------- */

    async function servant(actor) {
        const v = view(actor);
        const ap = v.merits.apprenticeMerit ? "merit" : v.merits.apprenticeFlaw ? "flaw" : "";
        const content = `<form><p>Servants ${v.servantsR}: ${esc(H.SERVANTS[Math.min(5, v.servantsR)])}. Choose commoners or magical servants; both kinds need two ratings (${REF} pp. 87-88).</p>
          <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="60" value=""/></div>
          <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${Object.entries(H.SERVANT_KINDS).map(([k, s]) => `<option value="${k}">${esc(s.label)}: ${esc(s.what)}</option>`).join("")}</select></div>
          <div class="form-group"><label>How good</label><select name="quality" data-fixed>${Object.keys(H.SERVANT_QUALITY).map(k => `<option value="${k}">${k}</option>`).join("")}</select></div>
          <div class="form-group"><label>Their work</label><input type="text" name="task" maxlength="80" value=""/></div>
          ${ap ? `<div class="form-group"><label><input type="checkbox" name="apprentice"/> This is the apprentice (Apprentice as a ${ap === "merit" ? "Merit: able and loyal" : "Flaw: lazy, and no use at chores"}, p. 92)</label></div>` : ""}</form>`;
        return dialog(`A servant: ${actor.name}`, content, "Take on", async fd => {
            const isAp = !!fd.apprentice && !!ap;
            const s = { id: foundry.utils.randomID(), name: String(fd.name || "A servant").slice(0, 60), kind: isAp ? "commoner" : (H.SERVANT_KINDS[fd.kind] ? fd.kind : "commoner"),
                quality: isAp ? (ap === "merit" ? "exceptional" : "ordinary") : (H.SERVANT_QUALITY[fd.quality] ? fd.quality : "ordinary"), task: String(fd.task ?? "").slice(0, 80), ...(isAp ? { apprentice: ap, lastTaught: weekNow() } : {}) };
            await saveHouse(actor, { servants: [...v.servants, s] });
            return post(actor, `${actor.name} takes on ${s.name}`, `<div class="vta-res">${esc(s.name)}: ${esc(H.SERVANT_KINDS[s.kind].label.toLowerCase())}, ${esc(s.quality)}${s.task ? `, for ${esc(s.task)}` : ""}${isAp ? `; the apprentice (${ap})` : ""}.</div><div class="vta-note">${esc(H.SERVANT_KINDS[s.kind].what)}.</div><div class="wodx-quiet">${REF} pp. 87-88${isAp ? ", 92" : ""}</div>`);
        });
    }

    async function bribe(actor) {
        if (!game.user.isGM) { notify("The Storyteller decides who works on a servant."); return null; }
        const v = view(actor);
        const content = `<form><p>Someone tries to turn one of ${esc(actor.name)}'s servants. A commoner rolls their steadiness at ${H.BRIBE_DIFF}; a magical servant cannot be turned without strong magic (${REF} p. 88).</p>
          <div class="form-group"><label>Servant</label><select name="who" data-fixed>${v.servants.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.kind)}, ${esc(s.quality)})</option>`).join("")}</select></div>
          <div class="form-group"><label>Who works on them</label><input type="text" name="by" maxlength="60" value=""/></div>
          <div class="form-group"><label><input type="checkbox" name="threat"/> With threats (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="magic"/> With a power of the mind (+2)</label></div></form>`;
        return dialog(`Turning a servant: ${actor.name}`, content, "Roll", async fd => {
            const s = v.servants.find(x => x.id === fd.who);
            if (!s) return null;
            const taught = s.apprentice !== "merit" || H.apprenticeTaught(s, weekNow());
            const plan = H.bribePlan(taught ? s : { ...s, apprentice: null }, { threat: !!fd.threat, magic: !!fd.magic });
            if (plan.immune) return post(actor, `${s.name} holds`, `<div class="vta-res good">${esc(s.name)}: ${esc(plan.why)}.</div><div class="wodx-quiet">${REF} p. 88</div>`);
            if (!plan.dice) return post(actor, `${s.name}`, `<div class="vta-note">${esc(plan.why)}</div>`);
            const r = await rollPool(plan.dice, plan.difficulty);
            const turned = !(r.successes > 0);
            let body = rollBlock(`${esc(s.name)}: steadiness ${plan.dice}`, r, [`difficulty ${plan.difficulty}`, ...(s.apprentice === "merit" && taught ? ["a loyal apprentice −2"] : [])]);
            if (turned) {
                await saveHouse(actor, { servants: v.servants.map(x => x.id === s.id ? { ...x, turned: String(fd.by || "someone").slice(0, 60) } : x) });
                try { await rumour({ text: `${s.name}, who serves ${actor.name}, has been talking about what goes on at ${v.place}.`, about: actor.id, truth: "true" }); } catch (e) { /* no rumours */ }
                body += `<div class="vta-big bad">${esc(s.name)} is turned${fd.by ? ` by ${esc(fd.by)}` : ""}: what they know of the household is out (a rumour starts).</div>`;
            } else body += `<div class="vta-res good">${esc(s.name)} stays loyal.</div>`;
            return ChatMessage.create({ whisper: gmIds(), content: `<div class="vta-card wodx-x"><div class="vta-head">Turning a servant: ${esc(actor.name)}</div><div class="vta-body">${body}<div class="wodx-quiet">${REF} p. 88</div></div></div>`, rolls: [r.roll].filter(Boolean) });
        });
    }

    async function teach(actor) {
        const v = view(actor);
        const ap = v.servants.find(s => s.apprentice);
        if (!ap) return null;
        const week = weekNow();
        await saveHouse(actor, { servants: v.servants.map(s => s.id === ap.id ? { ...s, lastTaught: week, lessons: n(s.lessons) + 1 } : s) });
        return post(actor, `${actor.name} teaches ${ap.name}`, `<div class="vta-res">A lesson in the Foundation and the Pillars: ${n(ap.lessons) + 1} so far. ${ap.apprentice === "merit" ? "The apprentice works as a loyal servant while taught." : "The apprentice learns a little, and complains a lot."} One day the Storyteller says the apprentice is a mage.</div><div class="wodx-quiet">${REF} p. 92</div>`);
    }

    /* -------------------------------------------------------------- */
    /*  Talisman (p. 88)                                               */
    /* -------------------------------------------------------------- */

    async function talisman(actor) {
        const v = view(actor);
        const usable = v.talismans.filter(t => t.kind === "once" && !t.used);
        const content = `<form><p>Talisman ${v.talismanR}: ${esc(H.TALISMAN[Math.min(5, v.talismanR)])}. Its level is the highest Pillar used to make it (${REF} p. 88).</p>
          <div class="form-group"><label>Do</label><select name="do" data-fixed><option value="add">Add a talisman</option>${usable.map(t => `<option value="use:${t.id}">Use ${esc(t.name)} (once)</option>`).join("")}</select></div>
          <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="60" value=""/></div>
          <div class="form-group"><label>Level</label><input type="number" name="level" min="1" max="5" value="1"/></div>
          <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${Object.entries(H.TALISMAN_KINDS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
          <div class="form-group"><label>What it does</label><input type="text" name="text" maxlength="200" value=""/></div></form>`;
        return dialog(`Talismans: ${actor.name}`, content, "Done", async fd => {
            if (String(fd.do).startsWith("use:")) {
                const t = v.talismans.find(x => x.id === String(fd.do).slice(4));
                if (!t) return null;
                await saveHouse(actor, { talismans: v.talismans.map(x => x.id === t.id ? { ...x, used: game.time.worldTime } : x) });
                return post(actor, `${actor.name} uses ${t.name}`, `<div class="vta-res">${esc(t.name)} (level ${t.level}) is spent${t.text ? `: ${esc(t.text)}` : ""}.</div><div class="wodx-quiet">${REF} p. 88</div>`);
            }
            const t = { id: foundry.utils.randomID(), name: String(fd.name || "A talisman").slice(0, 60), level: Math.max(1, Math.min(5, n(fd.level) || 1)), kind: H.TALISMAN_KINDS[fd.kind] ? fd.kind : "wonder", text: String(fd.text ?? "").slice(0, 200) };
            const chk = H.talismanCheck([...v.talismans.filter(x => !x.used), t], v.talismanR);
            if (!chk.ok) { notify(`${actor.name}: ${chk.why}.`); return null; }
            await saveHouse(actor, { talismans: [...v.talismans, t] });
            return post(actor, `${actor.name}: ${t.name}`, `<div class="vta-res">${esc(t.name)}, level ${t.level}: ${esc(H.TALISMAN_KINDS[t.kind])}.${t.text ? ` ${esc(t.text)}` : ""}</div><div class="wodx-quiet">${REF} p. 88</div>`);
        });
    }
    /** An attuned focus talisman, for the casting window. */
    const focusTalisman = actor => (view(actor).talismans ?? []).find(t => t.kind === "focus" && !t.used) ?? null;

    /* -------------------------------------------------------------- */
    /*  Degrees of Attainment (p. 37)                                  */
    /* -------------------------------------------------------------- */

    async function degree(actor) {
        const v = view(actor);
        if (!game.user.isGM) { notify("The fellowship, through the Storyteller, names a mage's degree."); return null; }
        const list = H.DEGREES[v.i.fellowship] ?? [];
        const org = H.ORGANISED_ONLY.includes(v.i.fellowship);
        const content = `<form><p>The ${esc(v.i.F.label)} ranks its mages: ${esc(list.join(", "))} (${REF} p. 37).</p>
          <div class="form-group"><label>Degree</label><select name="rank" data-fixed>${list.map((t, k) => `<option value="${k + 1}"${(v.h.degree ?? 1) === k + 1 ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
          ${org ? `<div class="form-group"><label><input type="checkbox" name="organised"${v.h.organised !== false ? " checked" : ""}/> Part of a circle or mystery cult (the Old Faith ranks only there)</label></div>` : ""}</form>`;
        return dialog(`Degree: ${actor.name}`, content, "Name", async fd => {
            const rank = Math.max(1, Math.min(list.length, n(fd.rank) || 1));
            await saveHouse(actor, { degree: rank, organised: org ? !!fd.organised : true });
            const d = H.degreeOf(v.i.fellowship, rank, { organised: org ? !!fd.organised : true });
            return post(actor, `${actor.name}: ${d.title || "no rank"}`, `<div class="vta-res">${d.title ? `${esc(actor.name)} is named ${esc(d.title)} of the ${esc(v.i.F.label)} (${d.rank} of ${d.top}).` : esc(d.note)}</div><div class="vta-note">With another of the fellowship, each rank above them is −1 Social difficulty, at most −2 (tick "With your fellowship" on the roll).</div><div class="wodx-quiet">${REF} p. 37</div>`);
        });
    }
    /** The roll-effect source: a degree tells with the fellowship (the first targeted character is the other). */
    function degreeEffects(actor, ctx = {}) {
        if ((ctx.channel ?? "roll") !== "roll" || !(ctx.tags ?? []).includes("fellowship")) return [];
        const f = actor?.getFlag?.(MOD, "daMage");
        if (!f?.fellowship || !H.DEGREES[f.fellowship]) return [];
        const mine = H.degreeOf(f.fellowship, actor.getFlag(MOD, "daHouse")?.degree ?? 1, { organised: actor.getFlag(MOD, "daHouse")?.organised !== false });
        if (!mine?.title) return [];
        const other = [...(game.user?.targets ?? [])].map(t => t.actor).find(a => a && a !== actor && a.getFlag?.(MOD, "daMage")?.fellowship === f.fellowship);
        const theirs = other ? n(other.getFlag(MOD, "daHouse")?.degree ?? 1) : 1;
        const diff = H.degreeShift(mine.rank, theirs);
        return diff ? [{ key: "degree", name: mine.title, diff, note: `${mine.title}: standing in the fellowship (${REF} p. 37)` }] : [];
    }

    /* -------------------------------------------------------------- */
    /*  Merits and flaws carried out here (pp. 90-93)                  */
    /* -------------------------------------------------------------- */

    async function devotion(actor) {
        const v = view(actor), r = v.merits.devotion, session = new Date().toDateString();
        if (v.h.devotionSession === session) { notify(`${actor.name} has prayed for aid this session.`); return null; }
        const k = H.devotionWillpower(r);
        await ctx.spendWillpower(actor, -k, { overMax: true });
        await saveHouse(actor, { devotionSession: session });
        return post(actor, `${actor.name} prays`, `<div class="vta-res good">+${k} Willpower for the scene, past the usual most. Spent frivolously or against the faith, the Merit is lost until amends are made.</div><div class="wodx-quiet">${REF} p. 91</div>`);
    }

    async function fount(actor) {
        const v = view(actor);
        if (v.h.fountStory === storyNow()) { notify(`${actor.name} has listened to the Living Fount this story.`); return null; }
        const rating = bg(actor, "Fount");
        if (!rating) { notify("Living Fount needs the Fount Background."); return null; }
        const r = await rollPool(rating, H.LIVING_FOUNT_DIFF);
        await saveHouse(actor, { fountStory: storyNow() });
        const ok = r.successes > 0;
        if (ok) await applyTimed(actor, { name: "A hint from the Living Fount: −1 difficulty on Enigmas or Occult", key: "wodx-effect-fortune:living-fount:enigmas-occult", data: { shift: -1, once: true, tags: ["enigmas", "occult"] }, duration: { kind: "scene" }, description: "A cryptic hint wells up.", source: `${REF} p. 92` });
        return post(actor, `${actor.name}: the Living Fount`, rollBlock(`Fount ${rating}`, r, [`difficulty ${H.LIVING_FOUNT_DIFF}`]) + `<div class="vta-res ${ok ? "good" : ""}">${ok ? "A cryptic hint: the Storyteller gives it, or the next Enigmas or Occult roll this scene is 1 easier." : "Only silence this time."}</div><div class="wodx-quiet">${REF} p. 92</div>`, [r.roll].filter(Boolean));
    }

    async function show(actor) {
        const v = view(actor), chic = v.merits.chicanery > 0;
        const content = `<form><p>A small sign of power: glowing eyes, whispered thoughts in the air. No effect on the rules, though it may help to intimidate. ${chic ? "Chicanery: free while a Quintessence is held; a point keeps it three turns more." : "A Quintessence a show, three turns."} (${REF} pp. 88-89, 92)</p>
          <div class="form-group"><label>The show</label><input type="text" name="what" maxlength="120" value=""/></div>
          <div class="form-group"><label>Turns</label><input type="number" name="turns" min="1" max="30" value="1"/></div></form>`;
        return dialog(`A show of magic: ${actor.name}`, content, "Show", async fd => {
            const q = P.resource(actor, "quintessence").value, cost = H.showCost(chic, n(fd.turns) || 1);
            if (chic ? q < 1 : q < cost) { notify(`${actor.name} needs ${chic ? "a Quintessence held" : `${cost} Quintessence`}.`); return null; }
            if (cost > q) { notify(`${actor.name} has ${q} Quintessence; ${cost} is needed.`); return null; }
            if (cost) await P.adjust(actor, "quintessence", -cost);
            return post(actor, `${actor.name}: a show of magic`, `<div class="vta-res">${esc(fd.what || "A glimmer of power")} for ${n(fd.turns) || 1} turn${n(fd.turns) === 1 ? "" : "s"}: ${cost} Quintessence${chic ? " (Chicanery)" : ""}.</div><div class="wodx-quiet">${REF} pp. 88-89${chic ? ", 92" : ""}</div>`);
        });
    }

    async function witchwalk(actor) {
        if (!game.user.isGM) { notify("The Storyteller says when the witchwalk shows."); return null; }
        const v = view(actor), lv = Math.min(5, v.merits.witchwalk);
        const opts = [["seen", "Someone sees the sign", H.witchwalkSeen(lv)], ["hallowed", "On consecrated ground", lv === 3], ["saltward", "Salt over the shoulder (the targeted character is warded a day)", lv === 5], ["saltskin", "Salt on the skin", lv === 5]].filter(x => x[2]);
        if (!opts.length) { notify(`${actor.name}'s witchwalk (${H.WITCHWALK[lv]}) has no moment to mark.`); return null; }
        const content = `<form><p>Witchwalk ${lv}: ${esc(H.WITCHWALK[lv])} (${REF} p. 93).</p>
          <div class="form-group"><label>What happens</label><select name="what" data-fixed>${opts.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div></form>`;
        return dialog(`Witchwalk: ${actor.name}`, content, "Mark", async fd => {
            let line = "";
            if (fd.what === "seen") {
                try { await rumour({ text: `They say ${actor.name} ${lv === 1 ? "is pale as a heretic" : lv === 2 ? "brings a wind indoors with them" : "casts no shadow"}.`, about: actor.id, truth: "true" }); } catch (e) { /* no rumours */ }
                line = "It is seen, and talk starts (a rumour).";
            } else if (fd.what === "hallowed") {
                await applyTimed(actor, { name: `Hallowed ground burns: +${H.HALLOWED_PAIN} difficulty`, key: "wodx-effect-fortune:witchwalk", data: { shift: H.HALLOWED_PAIN, once: false }, duration: { kind: "scene" }, description: "Great pain while on consecrated ground; no wound.", source: `${REF} p. 93` });
                line = `Great pain while ${esc(actor.name)} stands on it: +${H.HALLOWED_PAIN} difficulty to everything for the scene (house reading), no wound.`;
            } else if (fd.what === "saltward") {
                const t = [...(game.user?.targets ?? [])].map(x => x.actor).find(a => a && a !== actor);
                if (!t) { notify("Target the character who throws the salt."); return null; }
                await t.setFlag(MOD, "saltWard", { mage: actor.id, until: game.time.worldTime + DAY });
                line = `${esc(t.name)} is warded from ${esc(actor.name)}'s magic for a day.`;
            } else if (fd.what === "saltskin") {
                await game.wodxCombat?.applyDamage?.(actor, "lethal", 1, { status: true });
                line = "Salt touches the skin: a lethal wound that cannot be soaked.";
            }
            return post(actor, `The witchwalk: ${actor.name}`, `<div class="vta-res bad">${line}</div><div class="wodx-quiet">${REF} p. 93</div>`);
        });
    }

    /* -------------------------------------------------------------- */
    /*  On a casting (called by mage-da.js cast)                       */
    /* -------------------------------------------------------------- */

    /** Before the roll: refused when the target is warded by salt from this mage. */
    function castBlock(actor) {
        const t = [...(game.user?.targets ?? [])].map(x => x.actor).find(a => a && a !== actor);
        return t && H.saltWarded(t.getFlag(MOD, "saltWard"), actor.id, game.time.worldTime) ? `${t.name} is warded by salt from ${actor.name}'s magic until tomorrow (${REF} p. 93)` : "";
    }
    /** Witnesses on the scene for Repulsive Practice: characters no player owns, other than the caster. */
    const witnesses = actor => (canvas?.scene?.tokens?.contents ?? []).map(t => t.actor).filter(a => a && a.id !== actor.id && !a.hasPlayerOwner && ["Mortal", "Hunter"].includes(a.type));

    /**
     * After the roll: the lines and effects of the merits and flaws on a casting. q: Quintessence spent on this spell;
     * qScene: spent earlier this scene; seen: the Repulsive Practice was watched.
     */
    async function afterCast(actor, { q = 0, qScene = 0, seen = false } = {}) {
        const v = view(actor), lines = [], rolls = [];
        if (v.merits.repulsive && seen) {
            try { await rumour({ text: `${actor.name} was seen working a foul craft: blood, rot and worse. The priests should hear of it.`, about: actor.id, truth: "true", big: true }); } catch (e) { /* no rumours */ }
            lines.push("Repulsive Practice: someone saw how it was done; the Church will hear (a rumour starts) (p. 92).");
        }
        if (v.merits.madness) {
            const story = storyNow(), m = v.h.madness?.story === story ? v.h.madness : { story, casts: 0 };
            const casts = n(m.casts) + 1;
            await saveHouse(actor, { madness: { story, casts } });
            if (H.madnessCheck(casts, permWill(actor))) {
                const r = await rollPool(permWill(actor), H.MADNESS_DIFF); rolls.push(r.roll);
                const shift = H.madnessShift(r);
                lines.push(rollBlock(`Arcane Madness: Willpower (spell ${casts}, past ${permWill(actor)})`, r, [`difficulty ${H.MADNESS_DIFF}`]));
                if (shift) {
                    await applyTimed(actor, { name: `Arcane Madness: +${shift} difficulty`, key: "wodx-effect-fortune:arcane-madness", data: { shift, once: false }, duration: { kind: "time", seconds: HOUR }, description: "Visions and screaming voices.", source: `${REF} p. 92` });
                    lines.push(`Madness takes hold: +${shift} to every roll for an hour${shift > 1 ? "; Willpower drives it off only for a turn" : "; a Willpower point ends it sooner"} (p. 92).`);
                }
            }
        }
        if (v.merits.inept && q > 0) {
            const k = H.ineptRolls(qScene, q, permWill(actor));
            for (let j = 0; j < k; j++) {
                const r = await rollPool(permWill(actor), H.INEPT_DIFF); rolls.push(r.roll);
                const hurt = r.botch ? "lethal" : r.successes > 0 ? null : "bashing";
                lines.push(rollBlock(`Inept Channeler: Willpower for a Quintessence past ${permWill(actor)}`, r, [`difficulty ${H.INEPT_DIFF}`]));
                if (hurt) { await game.wodxCombat?.applyDamage?.(actor, hurt, 1, { status: true }); lines.push(`The power tears through: one ${hurt} level${hurt === "lethal" ? " that cannot be soaked" : ""} (p. 92).`); }
            }
        }
        return { html: lines.map(l => l.startsWith("<") ? l : `<div class="vta-note">${l}</div>`).join(""), rolls };
    }

    /* -------------------------------------------------------------- */
    /*  Each week, on the Chronicle clock                              */
    /* -------------------------------------------------------------- */

    async function weekly() {
        if (!isActiveGM()) return;
        const week = weekNow();
        for (const actor of game.actors) {
            const f = actor.getFlag(MOD, "daMage");
            if (!f?.fellowship) continue;
            const v = view(actor), lines = [], patch = {};
            // The familiar: each finished week it was not fed weakens it
            if (v.famR && !v.fam.dead) {
                let fam = { ...v.fam };
                const from = fam.lastWeek ?? week - 1;
                for (let w = from + 1; w < week && w <= from + 12; w++) fam = H.familiarWeek(fam, w, v.famR);
                if (fam.lastWeek === undefined) fam.lastWeek = week - 1;
                if (n(fam.weak) !== n(v.fam.weak) || fam.dead !== v.fam.dead) lines.push(fam.dead ? `${esc(fam.name || "The familiar")} has starved and is gone.` : n(fam.weak) > n(v.fam.weak) ? `${esc(fam.name || "The familiar")} went unfed: strength ${H.familiarStrength(fam, v.famR)} of ${v.famR}.` : `${esc(fam.name || "The familiar")} is fed and recovers: strength ${H.familiarStrength(fam, v.famR)} of ${v.famR}.`);
                if (fam.lastWeek !== v.fam.lastWeek || fam.weak !== v.fam.weak || fam.dead !== v.fam.dead) patch.familiar = fam;
            }
            // The chantry: the commoners talk
            if (bg(actor, "Chantry") > 0) {
                const g = H.gossipDue({ community: v.chantry.ok ? v.chantry.community : 0, lastWeek: v.h.gossipWeek ?? null }, week);
                if (g) {
                    try { await rumour({ text: g.text(actor.name, v.place), about: actor.id, truth: g.truth }); } catch (e) { /* no rumours */ }
                    patch.gossipWeek = week;
                    lines.push(`The commoners talk about ${esc(v.place)} (${g.tone}): a rumour starts.`);
                }
            }
            // The lazy apprentice
            const ap = v.servants.find(s => s.apprentice === "flaw");
            if (ap && v.h.messWeek !== week) {
                const r = await new Roll("1d10").evaluate();
                patch.messWeek = week;
                if (H.apprenticeMess(r.total)) {
                    if (tempWill(actor) > 0) await spendWillpower(actor, 1);
                    lines.push(`${esc(ap.name)} makes a mess of things; sorting it out costs ${esc(actor.name)} a Willpower.`);
                }
            }
            if (Object.keys(patch).length) await saveHouse(actor, patch);
            if (lines.length) await ChatMessage.create({ whisper: whisperTo(actor), content: `<div class="vta-card wodx-x"><div class="vta-head">The household: ${esc(actor.name)}</div><div class="vta-body">${lines.map(l => `<div class="vta-note">${l}</div>`).join("")}<div class="wodx-quiet">${REF} pp. 84-85, 92</div></div></div>` });
        }
    }

    const WX = MW.build(ctx, { info, house, saveHouse, backlash });
    const STEPS = { chantry, familiar, feed, destiny, library, pillar, servant, bribe, teach, talisman, degree, devotion, fount, show, witchwalk, enchant: WX.enchant, use: WX.useWonder, tass: WX.tass };
    return { open, view, sheetLine, ...STEPS, wonders: WX, familiarCanTake, familiarTakes, focusTalisman, castBlock, witnesses, afterCast, weekly, degreeEffects, rules: H };
}
