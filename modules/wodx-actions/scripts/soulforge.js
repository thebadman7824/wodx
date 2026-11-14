/**
 * WoDX Actions (B3553, B3554): soulforging, the Foundry part. Rules: soulforge-rules.js.
 *
 * A wraith picks what to make and from what; the soulfire's Pathos is paid at the start (and, for an Artificer's own
 * plasm, a Corpus level for good); the work runs as a WoDX Storyteller long task of kind "soulforge". When the task
 * ends (wodxTaskDone) the item is made: soulsteel arms or armor as gear, an Artifact, or oboli into the purse as the
 * Underworld's money (WoDX Storyteller receiveForeign, region "underworld").
 *
 * The plan is kept on the actor flag wodx-actions.soulforge[task id], so the finished task knows what it was for.
 *
 * B3723: Artifacts and reworked relics go through the shared crafting table (WoDX Library wonders, WoDX Storyteller
 * wonders.mjs), as Ben picked on the Item Crafting Desk; this window hands them on and keeps arms, armour and oboli.
 */
import * as S from "./soulforge-rules.js";
import * as P from "./profiles.js";

const MOD = "wodx-actions";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };

/** Does the sheet name the Artificers (a feature, a background, a note)? */
export const isArtificer = actor => [...(actor?.items ?? [])].some(i => /artificer/i.test(i.name ?? "")) || /artificer/i.test(String(actor?.system?.bio?.guild ?? actor?.system?.guild ?? ""));

export function build(ctx) {
    const { post, dialog, setFlag, notify, attr, findAbility } = ctx;
    const year = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
    const st = () => game.modules.get("wodx-storyteller")?.api;
    const plans = actor => actor?.getFlag?.(MOD, "soulforge") ?? {};

    async function forge(actor) {
        if (!actor) return null;
        if (!st()?.tasks?.save) return notify("Soulforging runs as a long task: WoDX Storyteller must be on.");
        const y = year(), f = S.forgesIn(y), art = isArtificer(actor);
        const dex = n(attr?.(actor, "dexterity")), crafts = n(findAbility?.(actor, "crafts")?.value ?? findAbility?.(actor, "crafts"));
        const content = `<form><p><b>${esc(actor.name)}</b> at the soulforge. ${esc(f.label)}. ${esc(f.text)}</p>
          <div class="form-group"><label>Make</label><select name="product" data-fixed>${S.PRODUCT_KEYS.map(k => `<option value="${k}">${esc(S.PRODUCTS[k].label)}</option>`).join("")}</select></div>
          <div class="form-group"><label>From</label><select name="source" data-fixed>${Object.entries(S.SOURCES).map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join("")}</select></div>
          <div class="form-group"><label><input type="checkbox" name="artificer"${art ? " checked" : ""}/> A member of the Artificers' Guild</label></div>
          <p class="hint">Dexterity + Crafts (${dex + crafts} dice), a roll a week; a botch ruins the work and the Corpus. The soulfire's Pathos is paid now. ${S.REF}; the dice and time are WoDX's own.</p></form>`;
        return dialog(`Soulforge: ${actor.name}`, content, "Start", async fd => {
            if (S.PRODUCTS[fd.product]?.kind === "artifact") return toTable(actor, fd.product, fd.source, !!fd.artificer);
            const pl = S.plan({ product: fd.product, source: fd.source, artificer: !!fd.artificer, year: y, dexterity: dex, crafts });
            if (!pl.ok) { notify(`${actor.name}: ${pl.why}.`); return null; }
            const pathos = P.resource(actor, "pathos");
            if (pathos.ok && pathos.value < pl.pathos) { notify(`${actor.name} needs ${pl.pathos} Pathos for the soulfire and has ${pathos.value}.`); return null; }
            if (pathos.ok) await P.adjust(actor, "pathos", -pl.pathos);
            if (pl.selfCost) await pledge(actor);
            const t = await st().tasks.save(actor, S.taskOf(pl));
            if (!t) return null;
            await setFlag(actor, "soulforge", { ...plans(actor), [t.id]: { product: pl.product, source: pl.source, year: y } });
            if (pl.illicit) ChatMessage.create({ whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: { alias: "The forges" },
                content: `<div class="wodx-card"><p>${esc(actor.name)} forges outside the Artificers' Guild. Stygia's law forbids it; who hears of it is the Storyteller's.</p></div>` });
            return post(actor, `${actor.name} lights the soulforge`, `<div class="vta-res">${esc(S.PRODUCTS[pl.product].label)}: ${pl.goal} successes at difficulty ${pl.diff}, a roll a week (a long task).</div>
              <div class="vta-note">${pathos.ok ? `${pl.pathos} Pathos spent on soulfire.` : `Soulfire for ${pl.pathos} Pathos, bought or given (no Pathos track on the sheet).`}${pl.selfCost ? " A Corpus level pledged to the forge, gone for good." : ""}${pl.lostShare ? ` Forging an obolus again loses ${pl.lostShare === 0.5 ? "half" : "a quarter"} of the soul's mass.` : ""}</div><div class="wodx-quiet">${S.REF}</div>`);
        }, { width: 540 });
    }

    /** B3723: an Artifact or a reworked relic: the crafting table sets up the task and pays for it when it ends. */
    async function toTable(actor, product, source, artificer) {
        const W = st()?.wonders, lib = game.modules.get("wodx-library")?.api?.wonders;
        if (!W?.start || !lib) { notify("Artifacts and relics are made from the crafting table: WoDX Library must be on."); return null; }
        if (!lib.enabled?.("wraith")) { notify("Soulforging Artifacts and relics is switched off in this world."); return null; }
        const key = lib.kitFor?.("wraith")?.rows?.().find(w => w.product === product)?.key;
        if (!key) { notify("The crafting table has no Wraith line yet."); return null; }
        return W.start(actor, key, { line: "wraith", source: product === "relic" ? "relic" : source, artificer });
    }

    /** An Artificer's own plasm: the Corpus track loses a level for good. */
    async function pledge(actor) {
        const item = [...(actor.items ?? [])].find(i => i.type === "Advantage" && i.system?.id === "corpus");
        if (item) {
            const key = Number.isFinite(Number(item.system?.permanent)) && item.system.permanent > 0 ? "permanent" : "max";
            return item.update({ [`system.${key}`]: Math.max(1, n(item.system?.[key]) - 1) });
        }
        const legacy = actor.system?.advantages?.corpus;
        if (legacy && Number.isFinite(Number(legacy.permanent))) return actor.update({ "system.advantages.corpus.permanent": Math.max(1, n(legacy.permanent) - 1) });
        return null;
    }

    /** A soulforge task has ended: make the thing (GM, from the wodxTaskDone hook). */
    async function onTaskDone({ actor, task } = {}) {
        if (!actor || task?.kind !== "soulforge" || !game.user?.isGM) return null;
        const all = plans(actor), pl = all[task.id];
        if (!pl) return null;
        await actor.update({ [`flags.${MOD}.soulforge.-=${task.id}`]: null });
        if (task.status !== "done") return post(actor, `${actor.name}: the forging fails`, `<div class="vta-res bad">The work is ruined, and the Corpus that went into it is lost to the dark.</div><div class="wodx-quiet">${S.REF}</div>`);
        const oboli = S.oboliOf(pl.product);
        if (oboli) {
            const r = await st()?.money?.receiveForeign?.(actor, "underworld", oboli * S.SLIVERS, { note: "Fresh from the soulforge" });
            if (!r?.ok) await actor.createEmbeddedDocuments("Item", [{ name: `${oboli} obol${oboli === 1 ? "us" : "i"}`, type: "Item", flags: { [MOD]: { soulforged: { product: pl.product } } } }]);
            return post(actor, `${actor.name} strikes an obolus`, `<div class="vta-res good">${oboli} obol${oboli === 1 ? "us" : "i"}, the seal of Stygia on one face and the Deathmask on the other${r?.ok ? ", into the purse as the Underworld's money" : ""}.</div><div class="wodx-quiet">${S.REF}</div>`);
        }
        const data = S.itemData(pl.product, { maker: actor.name, year: pl.year });
        if (data) await actor.createEmbeddedDocuments("Item", [data]);
        return post(actor, `${actor.name} finishes the forging`, `<div class="vta-res good">${esc(data?.name ?? S.PRODUCTS[pl.product]?.label)}: soulsteel, hard and lasting. It moans now and then.</div><div class="wodx-quiet">${S.REF}</div>`);
    }

    return { forge, onTaskDone, rules: S };
}
