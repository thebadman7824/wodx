/**
 * VtDA20 Actions — profile menus (v2.0).
 *
 * The launcher shows a different set of buttons for each actor profile (see profiles.js). Menu entries are data:
 *   "api:<name>"     call a function of game.vtda20actions (hunt, feed, frenzy...)
 *   "preset:<key>"   open the Action dialog with a dramatic-system preset
 *   "uses:<res>"     spend a resource for one of its listed uses (optionally rolling a pool)
 *   "cantrip"        Changeling cantrip (Changeling 20th, Cantrips)
 *   "cast"           Mage effect (Arete roll; difficulty from the highest Sphere)
 *   "shift"          Werewolf shapeshifting (form table of the W20 sheet)
 *   "regen"          Werewolf regeneration (W20 p. 148)
 *   "rules:<key>"    post a rules reminder card
 * Anything marked [house] is a Storyteller convenience, not printed rules.
 */

import * as P from "./profiles.js";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const WILL = ["uses:willpower", "Willpower", "fa-brain"];

export const MENUS = {
    kindred: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["api:seduction", "Seduction", "fa-heart"], ["api:hunt", "Hunt", "fa-paw"]]],
            ["Blood", [["api:feed", "Feed on target", "fa-tint"], ["api:spendBlood", "Spend blood", "fa-heartbeat"], ["api:bloodOath", "Blood Oath", "fa-link"]]],
            ["The Beast", [["api:frenzy", "Frenzy", "fa-fire-alt"], ["api:rotschreck", "Rötschreck", "fa-running"], ["api:endFrenzy", "End frenzy", "fa-hand-paper"], ["api:sin", "Sin / degeneration", "fa-balance-scale"]]],
            ["Night and day", [["api:daytime", "Awaken by day", "fa-sun"], ["api:hazard", "Sun / fire / fall", "fa-burn"], ["api:torpor", "Torpor", "fa-bed"], ["api:diablerie", "Diablerie", "fa-skull"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], ["api:newNight", "New night (GM)", "fa-moon"], WILL]]
        ]
    },
    ghoul: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["api:seduction", "Seduction", "fa-heart"]]],
            ["Vitae", [["uses:blood", "Spend vitae", "fa-tint"], ["rules:ghoul", "Ghoul rules", "fa-book"], ["api:bloodOath", "Blood Oath / bond", "fa-link"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["api:frenzy", "Fear / frenzy check", "fa-fire-alt"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    mortal: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["api:seduction", "Seduction", "fa-heart"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["rules:mortal", "Mortal rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    hunter: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["api:seduction", "Seduction", "fa-heart"]]],
            ["Faith and conviction", [["uses:faith", "Faith", "fa-cross"], ["uses:conviction", "Conviction", "fa-fist-raised"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["rules:mortal", "Mortal rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    lupine: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["preset:primalurge", "Primal-Urge (senses)", "fa-nose"], ["preset:trackscent", "Track by scent", "fa-paw"]]],
            ["Rage", [["uses:rage", "Spend Rage / Rage roll (frenzy test)", "fa-fire-alt"]]],
            ["Gnosis and spirits", [["uses:gnosis", "Gnosis (Gifts, fetishes, Gauntlet)", "fa-moon"]]],
            ["Body", [["shift", "Change form", "fa-dog"], ["regen", "Regenerate", "fa-heartbeat"], ["api:hazard", "Fire / fall / silver", "fa-burn"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    mage: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["preset:researchmage", "Research / lore", "fa-book-open"]]],
            ["Magick", [["cast", "Cast an effect (Arete)", "fa-hat-wizard"], ["uses:quintessence", "Quintessence", "fa-gem"], ["uses:paradox", "Paradox", "fa-bolt"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["rules:mage", "Mage rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    fae: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["api:seduction", "Seduction / glamour", "fa-heart"]]],
            ["Glamour", [["cantrip", "Weave a cantrip", "fa-wand-magic-sparkles"], ["uses:glamour", "Glamour", "fa-star"], ["uses:banality", "Banality", "fa-cloud"]]],
            ["Danger", [["api:hazard", "Fire / fall / cold iron", "fa-burn"], ["rules:fae", "Changeling rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    wraith: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["preset:arcanos", "Use an Arcanos", "fa-ghost"]]],
            ["Passions", [["uses:pathos", "Pathos", "fa-heart"], ["uses:corpus", "Corpus", "fa-skull"], ["uses:angst", "Angst (Shadow)", "fa-mask"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["rules:wraith", "Wraith rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    spirit: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"]]],
            ["Essence", [["uses:essence", "Essence", "fa-sparkles"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    },
    beast: {
        sections: [
            ["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"], ["preset:trackscent", "Track by scent", "fa-paw"], ["preset:sneaking", "Sneak / stalk", "fa-user-secret"]]],
            ["Danger", [["api:hazard", "Fire / fall", "fa-burn"], ["rules:beast", "Creature rules", "fa-book"]]],
            ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]
        ]
    }
};
// Generic menus for the profiles without a sourcebook in the library: roll, their own traits, scene.
for (const [k, res] of [["demon", [["uses:faith", "Faith", "fa-cross"], ["uses:torment", "Torment", "fa-fire"]]],
    ["mummy", [["uses:sekhem", "Sekhem", "fa-sun"], ["uses:balance", "Balance", "fa-balance-scale"]]],
    ["exalted", [["uses:essence", "Essence", "fa-sun"]]]]) {
    MENUS[k] = { sections: [["Roll", [["action", "Action / Dramatic system", "fa-dice-d10"]]], ["Traits", res],
        ["Danger", [["api:hazard", "Fire / fall", "fa-burn"]]], ["Scene", [["api:endScene", "End scene", "fa-flag-checkered"], WILL]]] };
}

/** Pool presets added to the Action dialog by the profile menus. */
export const EXTRA_PRESETS = {
    primalurge: { label: "Primal-Urge senses (Per + Primal-Urge)", attr: "perception", ability: "primalurge", diff: 6, note: "Heightened senses, spotting spirits, and the like (W20)." },
    trackscent: { label: "Track by scent (Per + Survival)", attr: "perception", ability: "survival", diff: 6, note: "Lupus, Hispo and Crinos senses: -1 difficulty at the Storyteller's discretion." },
    researchmage: { label: "Research (Int + Occult / Enigmas)", attr: "intelligence", ability: "occult", diff: 6 },
    arcanos: { label: "Arcanos (Attribute + Arcanos)", attr: "manipulation", ability: "", diff: 6, note: "Pick the Arcanos as the ability if it is on the sheet; Pathos cost per Art is on the Pathos button." }
};

/** Resource uses: [label, cost, roll?, note]. roll = { pool: resource id | "attr+ability", diff }. */
export const USES = {
    willpower: { title: "Willpower", uses: [
        ["Automatic success on a roll", 1, null, "One Willpower point = one automatic success (cannot be canceled by 1s). One per turn."],
        ["Ignore wound penalties for the scene", 1, null, "VtDA20 p. 321."],
        ["Resist Dominate / compulsion", 1, null, "Per the power; roll Willpower if the rule asks."],
        ["Regain Willpower (rest / ST award)", -1, null, "Cost -1 adds a point."]
    ] },
    blood: { title: "Vitae", uses: [
        ["Heal bashing or lethal damage (1 vitae per level)", 1, null, "Ghouls and revenants heal as the Storyteller allows (G&R)."],
        ["Increase a Physical Attribute (+1 die)", 1, null, "For one action or turn."]
    ] },
    rage: { title: "Rage", uses: [
        ["Extra action (declare at the start of the turn)", 1, null, "Max Rage spent for actions per turn = half permanent Rage. Rage and Gnosis cannot both be used in one turn. (W20 p. 144, 266)"],
        ["Change form instantly (no Stamina + Primal-Urge roll)", 1, null, "W20 p. 144, 285."],
        ["Ignore being stunned", 1, null, "Lost more health levels than Stamina in one turn: W20 p. 144."],
        ["Remain active below Incapacitated (Rage roll, diff 8)", 0, { pool: "rage", diff: 8 }, "Each success heals a health level of any type; once per scene; leaves a Battle Scar; frenzy risk. (W20 p. 144)"],
        ["Rage roll (frenzy test)", 0, { pool: "rage", diff: 6 }, "4 or more successes: the Garou enters frenzy (W20 p. 144, 261). Difficulty depends on provocation."],
        ["Regain Rage (provocation / the moon)", -1, null, "Cost -1 adds a point."]
    ] },
    gnosis: { title: "Gnosis", uses: [
        ["Activate a Gift or fetish", 1, null, "Spend 1 Gnosis (some Gifts ask for none). Not in the same turn as Rage."],
        ["Step sideways (Gnosis roll, diff = Gauntlet)", 0, { pool: "gnosis", diff: 6 }, "Difficulty = local Gauntlet (caern 3, city up to 8)."],
        ["Spirit bargain: gain Gnosis", -1, null, "Cost -1 adds a point."]
    ] },
    glamour: { title: "Glamour", uses: [
        ["Wyrd cantrip (use the cantrip button)", 1, null, "Chimerical cantrips cost nothing; Wyrd cantrips cost 1 Glamour (Changeling 20th)."],
        ["Heal a health level [house]", 1, null, "Storyteller's option."],
        ["Reap Glamour (Rapture / dreamers)", -1, null, "Cost -1 adds a point."]
    ] },
    banality: { title: "Banality", uses: [
        ["Banality check (Banality roll)", 0, { pool: "banality", diff: 6 }, "Roll the permanent Banality rating; the Storyteller sets the consequence."],
        ["Gain a Banality point", -1, null, ""]
    ] },
    quintessence: { title: "Quintessence", uses: [
        ["Pay for an effect (Quintessence)", 1, null, "Spend what the effect asks; extra points add dice only as a [house] option."],
        ["Gain Quintessence (node, Prime channel)", -1, null, "Cost -1 adds a point (over the Pattern's limit it becomes Paradox)."]
    ] },
    paradox: { title: "Paradox", uses: [
        ["Gain Paradox points (vulgar magick, ST ruling)", -1, null, "Adds to Paradox (cost -1 = +1). Release a Backlash when the Storyteller says so."],
        ["Shed Paradox (Backlash resolved, Seeking)", 1, null, ""]
    ] },
    pathos: { title: "Pathos", uses: [
        ["Pay for an Arcanos (cost per Art)", 1, null, "Arcanoi cost the Pathos listed in the Art."],
        ["Manifest / Embody [house cost]", 1, null, ""],
        ["Gain Pathos (Passion / Fetter)", -1, null, "Cost -1 adds a point."]
    ] },
    corpus: { title: "Corpus", uses: [
        ["Lose a Corpus point (ST ruling)", 1, null, "Combat damage uses the health track; use this for Harrowing and other ST-ruled losses."],
        ["Regain Corpus", -1, null, "Cost -1 adds a point."]
    ] },
    angst: { title: "Angst", uses: [
        ["Shadow tempts (Angst roll)", 0, { pool: "angst", diff: 6 }, "The Shadow's player rolls permanent Angst; the Storyteller sets the temptation."],
        ["Gain Angst", -1, null, ""]
    ] },
    essence: { title: "Essence", uses: [
        ["Spend Essence (power or Charm)", 1, null, ""],
        ["Regain Essence", -1, null, "Cost -1 adds a point."]
    ] },
    faith: { title: "Faith", uses: [
        ["Spend Faith (hand of God / Edge)", 1, null, ""],
        ["Regain Faith", -1, null, ""]
    ] },
    conviction: { title: "Conviction", uses: [
        ["Spend Conviction (Edge)", 1, null, ""],
        ["Regain Conviction", -1, null, ""]
    ] },
    torment: { title: "Torment", uses: [["Torment surge (ST ruling)", 0, { pool: "torment", diff: 6 }, ""], ["Gain Torment", -1, null, ""]] },
    sekhem: { title: "Sekhem", uses: [["Spend Sekhem", 1, null, ""], ["Regain Sekhem", -1, null, ""]] },
    balance: { title: "Balance", uses: [["Balance check", 0, { pool: "balance", diff: 6 }, ""], ["Shift Balance", -1, null, ""]] }
};

/** W20 character-sheet form table. */
export const FORMS = {
    homid:  { label: "Homid",  mods: "No change", diff: 6 },
    glabro: { label: "Glabro", mods: "Strength +2, Stamina +2, Appearance -1, Manipulation -2", diff: 7 },
    crinos: { label: "Crinos", mods: "Strength +4, Dexterity +1, Stamina +3, Manipulation -3 (Appearance 0)", diff: 6 },
    hispo:  { label: "Hispo",  mods: "Strength +3, Dexterity +2, Stamina +3, Manipulation -3, +1 die to bite damage", diff: 7 },
    lupus:  { label: "Lupus",  mods: "Strength +1, Dexterity +2, Stamina +2, Manipulation -3, -2 Perception difficulty", diff: 6 }
};

export const RULES = {
    ghoul: "<b>Ghouls and revenants</b> soak bashing and lethal damage with Stamina (+ Fortitude); ghouls gain this after the third sip of Blood. Aggravated damage affects them as a mortal. Elder ghouls and old revenants may soak bashing as a vampire does (halved): mark the actor with the <i>elder</i> flag. A ghoul without a regular sip of vitae loses its powers and ages. (Ghouls &amp; Revenants p. 262)",
    mortal: "<b>Mortals</b> soak bashing with Stamina; lethal and aggravated damage only with armor, and aggravated damage counts as lethal. (VtDA20 p. 345)",
    beast: "<b>Creatures</b> use the mortal soak rules. Natural weapons (claws, bite, horns) are listed on the sheet as <i>natural</i> weapons; set the Creature profile on any animal for the animal menu.",
    mage: "<b>Mages</b> cannot soak lethal or aggravated damage without armor, protection or magick (Mage 20 p. 334). Coincidental magick: difficulty = highest Sphere + 3. Vulgar without witnesses: +4. Vulgar with witnesses: +5. Use the <i>Cast</i> button; Paradox for vulgar effects is set by the Storyteller.",
    fae: "<b>Changelings</b> soak as mortals (bashing only). Cold iron inflicts aggravated damage and a changeling has no natural defense against it (a Balor has only a difficulty-10 chance). Chimerical damage affects only chimerical beings; Banality eats Glamour. Cantrip: Art + lowest primary Realm, difficulty 8 before modifiers (Changeling 20th).",
    wraith: "<b>Wraiths</b> are immune to Stun damage; a corporeal wraith suffers lethal damage only through Corpus. Corpus loss ends in a Harrowing or Oblivion. House soak in this module: Stamina against bashing and lethal, armor only against aggravated damage."
};

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : 0; };

export function build(ctx) {
    const { post, rollPool, rollBlock, resultLine, diceHtml, API, action, updateActor, willpower, attr, findAbility, setting } = ctx;

    async function pay(actor, resId, cost) {
        if (!cost) return null;
        if (resId === "willpower") {
            if (cost > 0) { if (!(await ctx.spendWillpower(actor, cost))) return false; return `${actor.name} spends ${cost} Willpower.`; }
            const w = willpower(actor);
            if (setting("spendResources")) await updateActor(actor, { "system.advantages.willpower.temporary": Math.min(w.perm, w.temp - cost) });
            return `${actor.name} regains ${-cost} Willpower.`;
        }
        const r = P.resource(actor, resId);
        if (!r.ok) { ctx.notify(`${actor.name} has no ${r.label} trait on the sheet: change it by hand.`); return null; }
        if (cost > 0 && r.value < cost) { ctx.notify(`${actor.name} has only ${r.value} ${r.label}.`); return false; }
        if (!setting("spendResources")) return `${r.label}: ${cost > 0 ? "spend" : "gain"} ${Math.abs(cost)} (not deducted: setting off)`;
        return await P.adjust(actor, resId, -cost);
    }

    function poolDice(actor, spec) {
        if (spec.pool === "willpower") return { dice: willpower(actor).perm, label: "Willpower" };
        const r = P.resource(actor, spec.pool);
        return { dice: r.perm || r.max || r.value, label: r.label };
    }

    /** "Use a resource" dialog. */
    async function uses(actor, resId) {
        const def = USES[resId];
        if (!def) return;
        const r = resId === "willpower" ? { ok: true, value: willpower(actor).temp, max: willpower(actor).perm, label: "Willpower" } : P.resource(actor, resId);
        const options = def.uses.map((u, i) => `<option value="${i}">${esc(u[0])}</option>`).join("");
        const content = `<form class="vta-uses"><p><b>${esc(actor.name)}</b> — ${esc(def.title)}: ${r.ok ? `${r.value}${r.max ? ` / ${r.max}` : ""}` : "<i>not on the sheet</i>"}</p>
          <div class="form-group"><label>Use</label><select name="use">${options}</select></div>
          <div class="form-group"><label>Points (negative gains)</label><input type="number" name="cost" value="${def.uses[0][1]}"/></div>
          <div class="form-group"><label>Roll difficulty / bonus dice</label><input type="number" name="diff" value="${def.uses.find(u => u[2])?.[2]?.diff ?? 6}" style="width:4em"/> <input type="number" name="bonus" value="0" style="width:4em"/></div>
          <p class="vta-note vta-use-note">${esc(def.uses[0][3] ?? "")}</p></form>`;
        return ctx.dialog(`${def.title} — ${actor.name}`, content, "Use", async fd => {
            const u = def.uses[num(fd.use)];
            const note = await pay(actor, resId, fd.cost);
            if (note === false) return null;
            let body = note ? `<div class="vta-parts">${esc(note)}</div>` : "";
            const rolls = [];
            if (u[2]) {
                const pool = poolDice(actor, u[2]);
                const rr = await rollPool(Math.max(0, pool.dice + fd.bonus), fd.diff);
                if (rr.roll) rolls.push(rr.roll);
                body += rollBlock(`${pool.label} roll`, rr, [`${pool.label} ${pool.dice}`, fd.bonus ? `bonus ${fd.bonus}` : ""].filter(Boolean));
            }
            if (u[3]) body += `<div class="vta-note">${esc(u[3])}</div>`;
            return post(actor, `${actor.name}: ${esc(u[0])}`, body, rolls);
        }, {
            render: root => {
                const sel = root.querySelector("[name=use]"), cost = root.querySelector("[name=cost]"), note = root.querySelector(".vta-use-note");
                sel?.addEventListener("change", () => { const u = def.uses[num(sel.value)]; cost.value = u[1]; note.textContent = u[3] ?? ""; });
            }
        });
    }

    /** Changeling cantrip: Art + lowest primary Realm, base difficulty 8 (Changeling 20th). */
    async function cantrip(actor) {
        const g = P.resource(actor, "glamour");
        const content = `<form><p><b>${esc(actor.name)}</b> — Glamour ${g.ok ? `${g.value}/${g.max}` : "—"}, Nightmare ${P.resource(actor, "nightmare").value}</p>
          <div class="form-group"><label>Art rating (level used)</label><input type="number" name="art" value="1" min="0" max="5"/></div>
          <div class="form-group"><label>Lowest primary Realm used</label><input type="number" name="realm" value="1" min="0" max="5"/></div>
          <div class="form-group"><label>Realms or levels not possessed ("cheated")</label><input type="number" name="cheat" value="0" min="0"/></div>
          <div class="form-group"><label>Cantrip type</label><select name="type"><option value="chimerical">Chimerical (free)</option><option value="wyrd">Wyrd (1 Glamour)</option></select></div>
          <fieldset><legend>Difficulty (base 8)</legend>
          <div class="form-group"><label><input type="checkbox" name="tBan"/> Target's Banality above 7 (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="lBan"/> Location Banality above 7 (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="scene"/> Scene Realm used (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="time"/> Time Realm used (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="title"/> Targets a changeling of higher Title without consent (+1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="nm"/> Replace at least 3 dice with Nightmare dice (-1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="freehold"/> Cast in a freehold (-1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="kinain"/> Cast on an enchanted mortal or Kinain (-1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="affinity"/> Kith's affinity Realm (-1)</label></div>
          <div class="form-group"><label>Bunk (-1 to -5, enter 0-5)</label><input type="number" name="bunk" value="0" min="0" max="5"/></div>
          </fieldset>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return ctx.dialog(`Cantrip — ${actor.name}`, content, "Weave", async fd => {
            let diff = 8 + (fd.tBan ? 1 : 0) + (fd.lBan ? 1 : 0) + (fd.scene ? 1 : 0) + (fd.time ? 1 : 0) + (fd.title ? 1 : 0)
                - (fd.nm ? 1 : 0) - (fd.freehold ? 1 : 0) - (fd.kinain ? 1 : 0) - (fd.affinity ? 1 : 0) - Math.min(5, Math.max(0, fd.bunk));
            const cost = (fd.type === "wyrd" ? 1 : 0) + fd.cheat;
            const note = await pay(actor, "glamour", cost);
            if (note === false) return null;
            if (fd.wp && !(await ctx.spendWillpower(actor, 1))) return null;
            const dice = fd.art + fd.realm;
            const rr = await rollPool(dice, diff, { willpower: !!fd.wp });
            const body = (note ? `<div class="vta-parts">${esc(note)}</div>` : "")
                + rollBlock(`Cantrip: Art ${fd.art} + Realm ${fd.realm}`, rr, [`${fd.type === "wyrd" ? "Wyrd" : "chimerical"} cantrip`, `difficulty ${diff} (base 8)`, cost ? `${cost} Glamour` : "no Glamour"])
                + `<div class="vta-note">Replace dice with Nightmare dice equal to the Nightmare rating if it is above 0. Each success sets the strength of the Art's effect; Unleashing ignores Realms. A botch is a Banality backlash.</div>`;
            return post(actor, `${actor.name} weaves a cantrip`, body, [rr.roll].filter(Boolean));
        });
    }

    /** Mage effect: Arete roll, difficulty from the highest Sphere used (Mage 20 p. 3xx). */
    async function cast(actor) {
        const arete = P.resource(actor, "arete");
        const q = P.resource(actor, "quintessence");
        const content = `<form><p><b>${esc(actor.name)}</b> — Arete ${arete.value || arete.perm || 0}, Quintessence ${q.ok ? q.value : "—"}</p>
          <div class="form-group"><label>Highest Sphere used</label><input type="number" name="sphere" value="2" min="1" max="5"/></div>
          <div class="form-group"><label>Kind of effect</label><select name="kind">
            <option value="3">Coincidental (Sphere + 3)</option><option value="4">Vulgar, no witnesses (Sphere + 4)</option><option value="5">Vulgar, with witnesses (Sphere + 5)</option></select></div>
          <div class="form-group"><label>Difficulty modifier (focus, tools, ritual...)</label><input type="number" name="mod" value="0"/></div>
          <div class="form-group"><label>Bonus dice (instruments, assistance)</label><input type="number" name="bonus" value="0"/></div>
          <div class="form-group"><label>Quintessence spent</label><input type="number" name="quint" value="0" min="0"/></div>
          <div class="form-group"><label>Paradox gained (Storyteller)</label><input type="number" name="paradox" value="0" min="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return ctx.dialog(`Cast an effect — ${actor.name}`, content, "Cast", async fd => {
            const diff = Math.min(10, Math.max(2, fd.sphere + num(fd.kind) + fd.mod));
            if (fd.quint) { const n = await pay(actor, "quintessence", fd.quint); if (n === false) return null; }
            if (fd.wp && !(await ctx.spendWillpower(actor, 1))) return null;
            const aret = arete.perm || arete.value || 0;
            const rr = await rollPool(Math.max(0, aret + fd.bonus), diff, { willpower: !!fd.wp });
            let body = rollBlock(`Arete ${aret}`, rr, [`difficulty ${diff} (Sphere ${fd.sphere} + ${fd.kind})`, fd.bonus ? `bonus ${fd.bonus}` : ""].filter(Boolean));
            if (fd.paradox) { const p = await P.adjust(actor, "paradox", fd.paradox); if (p) body += `<div class="vta-parts">${esc(p)}</div>`; }
            if (rr.botch) body += `<div class="vta-warn">Botch: the Storyteller adds Paradox and a Backlash.</div>`;
            else if (!rr.successes) body += `<div class="vta-note">The effect fails. The Storyteller may add Paradox for a failed vulgar effect.</div>`;
            return post(actor, `${actor.name} works magick`, body, [rr.roll].filter(Boolean));
        });
    }

    /** Werewolf shapeshifting. */
    async function shift(actor) {
        const cur = actor.flags?.world?.vtda20?.form || "homid";
        const rage = P.resource(actor, "rage");
        const content = `<form><p><b>${esc(actor.name)}</b> is in <b>${FORMS[cur]?.label ?? cur}</b> form. Rage ${rage.ok ? rage.value : "—"}.</p>
          <div class="form-group"><label>Change to</label><select name="form">${Object.entries(FORMS).map(([k, f]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${f.label} (diff ${f.diff})</option>`).join("")}</select></div>
          <div class="form-group"><label>Method</label><select name="how"><option value="roll">Stamina + Primal-Urge roll</option><option value="rage">Spend 1 Rage (instant)</option></select></div>
          <div class="form-group"><label>Difficulty modifier</label><input type="number" name="mod" value="0"/></div></form>`;
        return ctx.dialog(`Change form — ${actor.name}`, content, "Change", async fd => {
            const f = FORMS[fd.form];
            let body = "", rolls = [];
            if (fd.how === "rage") {
                const n = await pay(actor, "rage", 1); if (n === false) return null;
                body += `<div class="vta-parts">${esc(n ?? "")}</div><div class="vta-big good">The change is instant.</div>`;
            } else {
                const pu = findAbility(actor, "primalurge");
                const dice = attr(actor, "stamina") + (pu?.value ?? 0);
                const rr = await rollPool(dice, Math.min(10, f.diff + fd.mod));
                rolls.push(rr.roll);
                body += rollBlock("Stamina + Primal-Urge", rr, [`to ${f.label}: difficulty ${f.diff}`]);
                if (!rr.successes) body += `<div class="vta-note">Failure: the change does not happen this turn.</div>`;
                if (!rr.successes) return post(actor, `${actor.name} struggles to change`, body, rolls.filter(Boolean));
            }
            if (actor.isOwner) await actor.setFlag("world", "vtda20.form", fd.form);
            body += `<div class="vta-note"><b>${f.label}:</b> ${esc(f.mods)}. Apply these to the sheet (the module does not edit attributes). Claws and bite: +1 damage in Glabro, +2 in Crinos (W20).</div>`;
            return post(actor, `${actor.name} changes to ${f.label}`, body, rolls.filter(Boolean));
        });
    }

    /** Werewolf regeneration: one bashing level per turn; lethal needs Stamina (diff 8) under stress. */
    async function regen(actor) {
        const h = actor.system?.health?.damage ?? {};
        const dmg = { bashing: num(h.bashing), lethal: num(h.lethal), aggravated: num(h.aggravated) };
        const content = `<form><p><b>${esc(actor.name)}</b> — ${dmg.bashing}B / ${dmg.lethal}L / ${dmg.aggravated}A</p>
          <div class="form-group"><label>Heal</label><select name="type"><option value="bashing">1 bashing level (automatic)</option><option value="lethal">1 lethal level (Stamina roll diff 8 in stress)</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="stress" checked/> In a strenuous or stressful situation (roll required)</label></div></form>`;
        return ctx.dialog(`Regenerate — ${actor.name}`, content, "Regenerate", async fd => {
            let body = "", rolls = [], ok = true;
            if (fd.type === "lethal" && fd.stress) {
                const rr = await rollPool(attr(actor, "stamina"), 8); rolls.push(rr.roll);
                body += rollBlock("Stamina (regeneration)", rr, ["difficulty 8"]);
                ok = rr.successes > 0;
            }
            if (ok && dmg[fd.type] > 0) {
                const api = game.vtda20combat;
                if (api?.healDamage) await api.healDamage(actor, fd.type, 1);
                else await updateActor(actor, { [`system.health.damage.${fd.type}`]: dmg[fd.type] - 1 });
                body += `<div class="vta-big good">One ${fd.type} level regenerates.</div>`;
            } else if (ok) body += `<div class="vta-note">No ${fd.type} damage to heal.</div>`;
            else body += `<div class="vta-note">The lethal wound does not close this turn.</div>`;
            body += `<div class="vta-note">Aggravated damage heals only slowly and silver wounds do not regenerate (W20 p. 148).</div>`;
            return post(actor, `${actor.name} regenerates`, body, rolls.filter(Boolean));
        });
    }

    function rules(actor, key) { return post(actor, "Rules reminder", `<div class="vta-note">${RULES[key] ?? ""}</div>`); }

    /** Launcher: sections for the actor's profile, the profile toggle and an Auto/override selector. */
    async function menuFor(actor) {
        const kind = P.detectProfile(actor);
        const def = MENUS[kind] ?? MENUS.mortal;
        const auto = P.detectProfile(actor, { ignoreFlag: true });
        const overridden = kind !== auto;
        const html = `<div class="vta-grp-wrap">
          <p class="vta-menu-head"><span><b>${esc(actor.name)}</b> — ${esc(P.profileLabel(kind))}${overridden ? " <i>(override)</i>" : " <i>(auto)</i>"}</span>
             <button type="button" class="vta-kind" title="Change the actor type"><i class="fas fa-exchange-alt"></i> Type</button></p>
          ${def.sections.map(([title, btns]) => `<fieldset class="vta-grp"><legend>${esc(title)}</legend><div class="vta-grp-btns">${btns.map(([k, l, i]) =>
              `<button type="button" data-k="${esc(k)}"><i class="fas ${i}"></i> ${esc(l)}</button>`).join("")}</div></fieldset>`).join("")}
        </div>`;
        return { kind, html };
    }

    async function run(spec, actor) {
        const [type, arg] = spec.includes(":") ? [spec.slice(0, spec.indexOf(":")), spec.slice(spec.indexOf(":") + 1)] : [spec, ""];
        switch (type) {
            case "action": return action({ actor });
            case "api": return API[arg]?.({ actor });
            case "preset": return action({ actor, preset: arg });
            case "uses": return uses(actor, arg);
            case "cantrip": return cantrip(actor);
            case "cast": return cast(actor);
            case "shift": return shift(actor);
            case "regen": return regen(actor);
            case "rules": return rules(actor, arg);
        }
    }

    return { menuFor, run, uses, cantrip, cast, shift, regen, rules };
}
