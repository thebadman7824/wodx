/**
 * WoDX Actions: demonic pacts, infernal investments and the Supplicium (Dark Ages Companion 2002 ch. 7, B7696), the
 * Foundry side; infernal-rules.js holds the rules.
 *
 *   The Infernal pacts window (Storyteller): the character's pacts and what each has left; record a new pact; spend a
 *   pact's points. A purchase writes the sheet: Armor as soak dice (a bonus row WoDX Combat reads) and, every third
 *   time, a point of Appearance; Claws, Flight and Limbs as lasting body changes (WoDX Storyteller's record, which the
 *   body plan in WoDX Combat reads for claws, wings and flight); Attributes, Abilities, Disciplines and Dark
 *   Thaumaturgy on the sheet. Flame gives a "Breathe flame" action. Everything is in the flag wodx-actions.infernal.
 *   Each pact, purchase and new level of Dark Thaumaturgy whispers a Supplicium card to the Storyteller: "The demon
 *   prevails" takes a Road point (no remorse roll) and at 0 moves the character to the Road of Sin, Path of the Devil;
 *   on that Path a fall to 0 asks for the last Supplicium.
 */
import * as I from "./infernal-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const cap = s => String(s).replace(/^\w/, c => c.toUpperCase());

export function build(ctx) {
    const { dialog, notify, logEvent, rollPool, rollBlock, post, attr, findAbility } = ctx;
    const flagOf = actor => foundry.utils.deepClone(actor?.getFlag?.(MOD, "infernal") ?? {});
    const save = (actor, d) => actor.setFlag(MOD, "infernal", d);
    const disciplines = actor => (actor?.items ?? []).filter(i => i.type === "Power" && i.system?.type === "wod.types.discipline");
    const darkPaths = actor => (actor?.items ?? []).filter(i => i.type === "Power" && i.system?.type === "wod.types.disciplinepath" && /^Dark Thaumaturgy:/i.test(i.name));

    function stateOf(actor) {
        const d = flagOf(actor);
        const pacts = (d.pacts ?? []).map(p => ({ ...p, left: I.pointsLeft(p) }));
        return { d, pacts, owned: d.owned ?? {}, damned: !!d.damned };
    }

    /** The options the purchase list offers for this sheet. */
    function buyOptions(actor) {
        const o = [];
        for (const [k, v] of Object.entries(I.INVESTMENTS)) {
            o.push([`inv:${k}`, `${v.label} (${v.cost}): ${v.does}`]);
            for (const [xk, x] of Object.entries(v.extras ?? {})) o.push([`inv:${k}.${xk}`, `${v.label}, ${x.label} (${x.cost})`]);
        }
        for (const a of ATTRS) { const now = n(actor.system?.attributes?.[a]?.value); if (now < 5) o.push([`attr:${a}`, `${cap(a)} ${now} → ${now + 1} (${I.costOf.attribute(now + 1)})`]); }
        for (const [k, v] of Object.entries(actor.system?.abilities ?? {})) {
            const now = n(v?.value); if (now < 5) o.push([`ab:${k}`, `${game.i18n.localize(v?.label || k)} ${now} → ${now + 1} (${I.costOf.ability(now + 1)})`]);
        }
        for (const d of disciplines(actor)) { const now = n(d.system?.value); if (now < 5) o.push([`disc:${d.name}`, `${d.name} ${now} → ${now + 1} (${I.costOf.discipline(now + 1)})`]); }
        // B7697: the infernal Disciplines of the Dark Ages Companion (2002) pp. 109-111, when not yet on the sheet
        for (const d of I.DARK_DISCIPLINES) if (!disciplines(actor).some(x => x.name.toLowerCase() === d.toLowerCase())) o.push([`disc:${d}`, `${d} at 1 (4)`]);
        o.push(["disc:", "A Discipline not on the sheet, at 1 (4): name it below"]);
        for (const p of darkPaths(actor)) { const now = n(p.system?.value); if (now < 5) o.push([`dark:${p.name.replace(/^Dark Thaumaturgy:\s*/i, "")}`, `${p.name} ${now} → ${now + 1} (${now + 1})`]); }
        // B7697: the four paths of pp. 105-108 by name, then any other the Storyteller names
        for (const [k, label] of I.DARK_PATHS) if (!darkPaths(actor).some(x => x.name.toLowerCase() === `dark thaumaturgy: ${k}`.toLowerCase())) o.push([`dark:${k}`, `Dark Thaumaturgy: ${k} (${label}) at 1 (1)`]);
        o.push(["dark:", "Another path of Dark Thaumaturgy at 1 (1): name it below"]);
        o.push(["power:", "One power of a Discipline (its level + 1): name it and give the level below"]);
        o.push(["life:", "Years of life for a mortal (1 a year): years below"]);
        o.push(["servant:", "A possessed servant (1)"], ["boundDemon:", "A bound demon (2)"]);
        return o;
    }

    async function window(actor) {
        if (!actor) return notify("Choose the infernalist.");
        if (!game.user.isGM) return notify("The Storyteller keeps the pacts.");
        const s = stateOf(actor);
        const pactRows = s.pacts.map(p => `<tr><td>${esc(p.demon || "A demon")}</td><td>${p.rating} (${esc(I.PACTS[p.rating]?.name ?? "")})</td><td>${esc(p.service ?? "")}</td><td>${p.left}</td></tr>`).join("");
        const owned = Object.entries(s.owned).filter(([, v]) => v > 0).map(([k, v]) => `${esc(k)}${v > 1 ? ` ×${v}` : ""}`).join(", ");
        const content = `<form>
          <p class="vta-note">Demonic pacts and infernal investments, ${esc(I.BOOK)} ch. 7 (${I.page(175)}-${177}). Every pact and every purchase brings a Supplicium.</p>
          ${pactRows ? `<table class="vta-table"><tr><th>Demon</th><th>Pact</th><th>Service</th><th>Points left</th></tr>${pactRows}</table>` : `<p class="wodx-quiet">No pacts yet.</p>`}
          ${owned ? `<p><b>Investments:</b> ${owned}</p>` : ""}
          <fieldset><legend>A new pact</legend>
            <div class="form-group"><label>Demon</label><input type="text" name="demon" placeholder="Name of the demon"/></div>
            <div class="form-group"><label>Rating</label><select name="rating"><option value="0">None (spend only)</option>${I.PACTS.slice(1).map((p, i) => `<option value="${i + 1}">${i + 1}: ${esc(p.name)}, ${esc(p.service)}</option>`).join("")}</select></div>
            <div class="form-group"><label>The service</label><input type="text" name="service" placeholder="What the demon asks"/></div>
          </fieldset>
          <fieldset><legend>Spend a pact</legend>
            <div class="form-group"><label>From</label><select name="pact"><option value="">The new pact above, or none</option>${s.pacts.filter(p => p.left > 0).map(p => `<option value="${p.id}">${esc(p.demon || "A demon")} (${p.left} left)</option>`).join("")}</select></div>
            <div class="form-group"><label>On</label><select name="buy" data-fixed><option value="">Nothing</option>${buyOptions(actor).map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></div>
            <div class="form-group"><label>Name or years</label><input type="text" name="name" placeholder="Discipline, path or power name; years of life"/></div>
            <div class="form-group"><label>Power level</label><input type="number" name="level" value="1" min="1" max="5"/></div>
          </fieldset></form>`;
        return dialog(`Infernal pacts: ${actor.name}`, content, "Record", fd => record(actor, fd), { width: 620 });
    }

    /** Record a pact and/or a purchase from the window's form data. */
    async function record(actor, fd = {}) {
        let pactId = fd.pact || null;
        const out = [];
        if (n(fd.rating) > 0) {
            const p = await makePact(actor, { demon: fd.demon, rating: n(fd.rating), service: fd.service });
            if (!pactId) pactId = p.id;
            out.push(p);
        }
        if (fd.buy && pactId) {
            const [kind, rest] = String(fd.buy).split(":");
            const name = String(fd.name ?? "").trim();
            const b = kind === "inv" ? { kind: "investment", key: rest.split(".")[0], extra: rest.split(".")[1] }
                : kind === "attr" ? { kind: "attribute", key: rest } : kind === "ab" ? { kind: "ability", key: rest }
                : kind === "disc" ? { kind: "discipline", key: rest || name } : kind === "dark" ? { kind: "darkThaum", key: rest || name }
                : kind === "power" ? { kind: "power", key: name, to: n(fd.level) || 1 } : kind === "life" ? { kind: "life", years: n(name) || 1 }
                : { kind };
            out.push(await spend(actor, pactId, b));
        }
        return out;
    }

    async function makePact(actor, { demon = "", rating = 1, service = "" } = {}) {
        const d = flagOf(actor);
        const p = { id: foundry.utils.randomID(), demon: String(demon || "").trim(), rating: Math.min(10, Math.max(1, n(rating))), service: String(service || "").trim(), at: game.time.worldTime, spent: [] };
        d.pacts = [...(d.pacts ?? []), p];
        await save(actor, d);
        await logEvent?.(actor, `Makes a pact of ${I.PACTS[p.rating].name} with ${p.demon || "a demon"}.`, "infernal");
        await supplicium(actor, `a pact of ${I.PACTS[p.rating].name} (${p.rating})${p.demon ? ` with ${p.demon}` : ""}`);
        return p;
    }

    /** Spend a pact on one purchase. Returns {ok, why, cost}. */
    async function spend(actor, pactId, b) {
        const d = flagOf(actor);
        const pact = (d.pacts ?? []).find(p => p.id === pactId);
        const owned = d.owned ?? {};
        // The rating now, for the one-level-a-pact rule
        if (b.kind === "attribute") { b.from = n(actor.system?.attributes?.[b.key]?.value); b.to = b.from + 1; }
        if (b.kind === "ability") { b.from = n(actor.system?.abilities?.[b.key]?.value); b.to = b.from + 1; }
        if (b.kind === "discipline") { b.from = n(disciplines(actor).find(x => x.name.toLowerCase() === String(b.key).toLowerCase())?.system?.value); b.to = b.from + 1; }
        if (b.kind === "darkThaum") { b.from = n(darkPaths(actor).find(x => x.name.toLowerCase() === `dark thaumaturgy: ${String(b.key).toLowerCase()}`)?.system?.value); b.to = b.from + 1; }
        const chk = I.canBuy(pact, b, owned);
        if (!chk.ok) { notify(chk.why); return chk; }
        const label = await applyPurchase(actor, b, owned);
        pact.spent = [...(pact.spent ?? []), { kind: b.kind, key: b.key ?? null, extra: b.extra ?? null, to: b.to ?? null, years: b.years ?? null, cost: chk.cost, label, at: game.time.worldTime }];
        const fresh = flagOf(actor);
        fresh.pacts = (fresh.pacts ?? []).map(p => p.id === pactId ? pact : p);
        fresh.owned = owned;
        await save(actor, fresh);
        await logEvent?.(actor, `An infernal investment: ${label}.`, "infernal");
        await post(actor, `Infernal investment: ${actor.name}`, `<p>${esc(label)}, for ${chk.cost} point${chk.cost === 1 ? "" : "s"} of the pact with ${esc(pact.demon || "a demon")} (${I.pointsLeft(pact)} left).</p><p class="wodx-quiet">${I.page(177)}</p>`);
        await supplicium(actor, b.kind === "darkThaum" ? `Dark Thaumaturgy (${b.key} ${b.to})` : label);
        return { ...chk, label };
    }

    /** Write a purchase onto the sheet. Returns its label. */
    async function applyPurchase(actor, b, owned) {
        switch (b.kind) {
            case "investment": {
                const Iv = I.INVESTMENTS[b.key];
                if (b.extra) {
                    owned[`${b.key}.${b.extra}`] = n(owned[`${b.key}.${b.extra}`]) + 1;
                    if (b.key === "flight" && b.extra === "barbed") await addBody(actor, "infernalBarbs");
                    return `${Iv.label}: ${Iv.extras[b.extra].label}`;
                }
                owned[b.key] = n(owned[b.key]) + 1;
                if (b.key === "armor") await armor(actor, owned.armor);
                if (Iv.body && b.key !== "armor") await addBody(actor, Iv.body);
                return Iv.label;
            }
            case "attribute": await actor.update({ [`system.attributes.${b.key}.value`]: b.to }); return `${cap(b.key)} ${b.to}`;
            case "ability": await actor.update({ [`system.abilities.${b.key}.value`]: b.to, [`system.abilities.${b.key}.isvisible`]: true }); return `${game.i18n.localize(actor.system?.abilities?.[b.key]?.label || b.key)} ${b.to}`;
            case "discipline": {
                const it = disciplines(actor).find(x => x.name.toLowerCase() === String(b.key).toLowerCase());
                if (it) await it.update({ "system.value": b.to, "system.level": b.to });
                else await actor.createEmbeddedDocuments("Item", [{ name: cap(b.key), type: "Power", system: { type: "wod.types.discipline", value: 1, level: 1, max: 5 } }]);
                return `${cap(b.key)} ${b.to}`;
            }
            case "darkThaum": {
                const name = `Dark Thaumaturgy: ${b.key}`;
                const it = darkPaths(actor).find(x => x.name.toLowerCase() === name.toLowerCase());
                if (it) await it.update({ "system.value": b.to });
                else await actor.createEmbeddedDocuments("Item", [{ name, type: "Power", system: { type: "wod.types.disciplinepath", value: 1, max: 5 } }]);
                return `${name} ${b.to}`;
            }
            case "power": owned[`power:${b.key}`] = n(b.to); return `The power ${b.key} (level ${b.to})`;
            case "life": owned.lifeYears = n(owned.lifeYears) + n(b.years); return `${b.years} more year${b.years === 1 ? "" : "s"} of life`;
            case "servant": owned.servants = n(owned.servants) + 1; return "A possessed servant";
            case "boundDemon": owned.boundDemons = n(owned.boundDemons) + 1; return "A bound demon";
        }
        return "";
    }

    /** Armor: the soak rows on one Power item, and a point of Appearance at every third time. */
    async function armor(actor, times) {
        const a = I.armorOf(times);
        const rows = ["bashing", "lethal"].map(k => ({ name: `Infernal armor: ${k}`, type: "soak_buff", settingtype: k, value: a.soak, isactive: true, wodxInfernal: "armor" }));
        const it = actor.items.find(i => i.getFlag?.(MOD, "infernal") === "armor");
        const sys = { type: "wod.types.power", value: a.soak, description: `Scales, fur or plates: +${a.soak} soak against bashing and lethal (${I.page(176)}).`, bonuslist: rows };
        if (it) await it.update({ system: sys });
        else await actor.createEmbeddedDocuments("Item", [{ name: "Infernal armor", type: "Power", img: "icons/svg/shield.svg", system: sys, flags: { [MOD]: { infernal: "armor" } } }]);
        if (times % 3 === 0) await actor.update({ "system.attributes.appearance.value": Math.max(0, n(actor.system?.attributes?.appearance?.value) - 1) });
    }

    /** A lasting body change on WoDX Storyteller's record. */
    async function addBody(actor, feature) {
        const list = foundry.utils.deepClone(actor.getFlag?.("wodx-storyteller", "body") ?? []);
        list.push({ id: foundry.utils.randomID(), feature, what: "An infernal investment", at: game.time.worldTime });
        await actor.setFlag("wodx-storyteller", "body", list);
    }

    /** The Supplicium card, whispered to the Storyteller. */
    async function supplicium(actor, why) {
        await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Supplicium" }, flags: { [MOD]: { kind: "buttons", supplicium: actor.uuid } },
            content: `<div class="vta-card"><h3>Supplicium: ${esc(actor.name)}</h3><p>For ${esc(why)}. Play out the demon's passion play: a past failing returns and the character is offered a chance to atone.</p>
              <button class="vta-btn" data-ix="prevails" data-actor="${actor.uuid}">The demon prevails</button> <button class="vta-btn" data-ix="atones" data-actor="${actor.uuid}">The character atones</button>
              <p class="wodx-quiet">${I.page(165)}</p></div>` });
    }

    const roadOf = actor => actor.getFlag?.(MOD, "road") ?? null;

    /** The demon prevails: a Road point, the fall to the Via Diabolis, or the last Supplicium. */
    async function prevails(actor) {
        const rating = n(actor.system?.advantages?.path?.permanent);
        const devil = I.onViaDiabolis(roadOf(actor));
        const r = I.suppliciumLost({ rating, devil });
        await actor.update({ "system.advantages.path.permanent": r.rating, "system.advantages.path.value": r.rating });
        let text = `${actor.name} loses a point of the Road to ${r.rating} (no remorse roll).`;
        if (r.fall) {
            await actor.setFlag(MOD, "road", { key: "sin", path: "Path of the Devil" });
            await actor.update({ "system.advantages.path.custom": "Path of the Devil", "system.advantages.path.label": "custom" });
            text = `${actor.name}'s Road falls to nothing: they now walk the Via Diabolis (Road of Sin, Path of the Devil) at 1.`;
        }
        if (r.final) {
            text = `${actor.name} has nothing left of the Via Diabolis: the last Supplicium decides the soul.`;
            await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Supplicium" }, flags: { [MOD]: { kind: "buttons" } },
                content: `<div class="vta-card"><h3>The last Supplicium: ${esc(actor.name)}</h3><p>Lost, the soul goes to the Pit and the demon takes the body. Won, the Via Diabolis comes back to 1.</p>
                  <button class="vta-btn" data-ix="finalLost" data-actor="${actor.uuid}">The soul is lost</button> <button class="vta-btn" data-ix="finalWon" data-actor="${actor.uuid}">The infernalist endures</button><p class="wodx-quiet">${I.page(166)}</p></div>` });
        }
        await logEvent?.(actor, text, "infernal");
        const d = flagOf(actor); d.supplicia = n(d.supplicia) + 1; await save(actor, d);
        await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Supplicium" }, content: `<div class="vta-card"><p>${esc(text)}</p><p class="wodx-quiet">${I.page(165)}</p></div>` });
        return r;
    }

    async function finalOutcome(actor, won) {
        const r = I.finalSupplicium(won);
        await actor.update({ "system.advantages.path.permanent": r.rating, "system.advantages.path.value": r.rating });
        if (r.damned) {
            const d = flagOf(actor); d.damned = true; await save(actor, d);
            await actor.createEmbeddedDocuments("ActiveEffect", [{ name: "Damned: the demon has the body", img: "icons/svg/skull.svg", description: `The soul is in the Pit; the Storyteller plays the demon in this body (${I.page(166)}).`, flags: { [MOD]: { infernal: "damned" } } }]);
        }
        const text = won ? `${actor.name} endures: the Via Diabolis comes back to 1, shaken and barely in control.` : `${actor.name}'s soul is lost; the demon takes the body.`;
        await logEvent?.(actor, text, "infernal");
        await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Supplicium" }, content: `<div class="vta-card"><p>${esc(text)}</p><p class="wodx-quiet">${I.page(166)}</p></div>` });
        return r;
    }

    /** Breathe flame: Dexterity + Occult; the target dodges against it; three aggravated levels and more for the extras. */
    async function flame(actor) {
        if (!actor) return notify("Choose the infernalist.");
        const d = flagOf(actor);
        if (!(n(d.owned?.flame) > 0)) return notify(`${actor.name} has no infernal flame.`);
        const pool = n(attr(actor, "dexterity")) + n(findAbility(actor, "occult")?.value);
        const r = await rollPool(pool, 6);
        const levels = I.flameLevels(d.owned?.["flame.hotter"]);
        const tgt = [...(game.user.targets ?? [])].map(t => t.actor).find(a => a && a !== actor) ?? null;
        const btn = r.successes > 0 && tgt ? `<button class="vta-btn" data-ix="burn" data-actor="${tgt.uuid}" data-arg="${levels}">${esc(tgt.name)} failed to dodge: ${levels} aggravated</button>` : "";
        return post(actor, `Infernal flame: ${actor.name}`, `${rollBlock("Dexterity + Occult", r)}<p>${r.successes > 0 ? `A gout of flame${tgt ? ` at ${esc(tgt.name)}` : ""}: ${levels} aggravated health levels unless dodged against these successes.` : "The flame gutters."}</p>${btn}<p class="wodx-quiet">${I.page(177)}. Difficulty 6 is WoDX's reading.</p>`, [r.roll], { kind: "buttons" });
    }

    /** Chat buttons (data-ix). */
    async function onChatButton(b) {
        if (!game.user.isGM) { notify("The Storyteller decides the Supplicium."); return false; }
        const actor = await fromUuid(b.dataset.actor);
        if (!actor) return false;
        switch (b.dataset.ix) {
            case "prevails": return prevails(actor);
            case "atones": await logEvent?.(actor, "Atones in the Supplicium: the Road holds.", "infernal"); return true;
            case "finalLost": return finalOutcome(actor, false);
            case "finalWon": return finalOutcome(actor, true);
            case "burn": { const C = game.wodxCombat; if (!C?.applyDamage) { notify("Burning needs WoDX Combat."); return false; } await C.applyDamage(actor, "aggravated", n(b.dataset.arg)); return true; }
        }
        return false;
    }

    return { window, record, makePact, spend, stateOf, supplicium, prevails, finalOutcome, flame, onChatButton, rules: I };
}
