/**
 * WoDX Actions (B3555, B3556): Banality from everyday life, the Foundry part. Rules: banal-life-rules.js.
 *
 *   End of a scene     changelings on the scene count a banal place (the WoDX NPC place tag) and any Autumn People
 *   A long task done   each week of it worked on a scene tagged as a banal place counts
 *   The card           when enough has gathered the Storyteller gets a card suggesting the point (Give it, or Not
 *                      this time); one short of it, the player hears that the grey is close
 *   Storyteller        the panel shows each changeling's count and marks selected tokens as Autumn People
 *
 * The count is the actor flag wodx-actions.banalLife {tally}; Autumn People carry wodx-actions.autumn.
 */
import * as B from "./banal-life-rules.js";
import * as P from "./profiles.js";

const MOD = "wodx-actions";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DAY = 86400;

export function build(ctx) {
    const { setFlag, notify, banality, seemingOf } = ctx;
    const year = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
    const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
    const playersOf = a => game.users.filter(u => !u.isGM && a.testUserPermission(u, "OWNER")).map(u => u.id);
    const kindOf = scene => String(scene?.flags?.["wodx-npc"]?.place?.kind ?? "");
    const isFae = a => !!a && P.detectProfile(a) === "fae";
    const tallyOf = a => Math.max(0, Number(a?.getFlag?.(MOD, "banalLife")?.tally) || 0);
    const changelingsOn = scene => [...(scene?.tokens ?? [])].map(t => t.actor).filter(a => isFae(a) && a.hasPlayerOwner);
    const autumnOn = scene => [...(scene?.tokens ?? [])].filter(t => t.actor?.getFlag?.(MOD, "autumn")).map(t => t.name ?? t.actor.name);

    /** Count exposure for one changeling; post the cards it calls for. */
    async function expose(actor, count, why) {
        if (!count || B.spared(seemingOf(actor))) return null;
        const r = B.add(tallyOf(actor), count, year());
        await setFlag(actor, "banalLife", { tally: r.tally });
        if (r.points) return ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Everyday Banality" },
            content: `<div class="wodx-card wodx-banal-life"><h3>${esc(actor.name)}: the grey clings</h3><p>${esc(why.join("; "))}. ${esc(B.WEIGHT_WORDS[B.weightOf(year())])}.</p>
              <p>Suggested: +${r.points} temporary Banality.</p><p><button type="button" data-banal="give">Give it</button> <button type="button" data-banal="skip">Not this time</button></p>
              <p class="wodx-quiet">The Storyteller decides how much exposure is enough. Grumps are spared. ${B.REF}</p></div>`,
            flags: { [MOD]: { banalLife: { actor: actor.uuid, points: r.points } } } });
        if (r.close) return ChatMessage.create({ whisper: [...playersOf(actor), ...gmIds()], speaker: { alias: "Everyday Banality" },
            content: `<div class="wodx-card"><p>${esc(actor.name)} feels the grey of the waking world settle on the faerie soul. One more such stretch, and it may leave Banality behind.</p><p class="wodx-quiet">${B.REF}</p></div>` });
        return null;
    }

    /** End of a scene (GM): every changeling on it. */
    async function endScene(scene = canvas?.scene) {
        if (!game.user?.isGM || !scene) return;
        const e = B.sceneExposure({ kind: kindOf(scene), autumn: autumnOn(scene) });
        if (!e.count) return;
        for (const a of changelingsOn(scene)) await expose(a, e.count, e.why);
    }

    /** A long task has ended (wodxTaskDone): weeks of it in a banal place. */
    async function onTaskDone({ actor, task } = {}) {
        if (!game.user?.isGM || !isFae(actor) || !task) return null;
        const scene = game.scenes?.get?.(task.scene || task.haven) ?? null;
        const days = Math.max(0, (Number(task.next) || 0) - (Number(task.started) || 0)) / DAY;
        const count = B.taskExposure({ kind: kindOf(scene), days });
        return count ? expose(actor, count, [`${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} of ${task.name} in ${B.BANAL_KINDS[kindOf(scene)]}`]) : null;
    }

    /** The card's buttons (Storyteller). */
    function bind(message, el) {
        const f = message?.flags?.[MOD]?.banalLife;
        if (!f || !el?.querySelectorAll) return;
        for (const b of el.querySelectorAll("[data-banal]")) b.addEventListener("click", async ev => {
            ev.preventDefault();
            if (!game.user.isGM) return;
            const a = await fromUuid(f.actor);
            const give = b.dataset.banal === "give";
            const note = give && a ? await banality(a, f.points) : "Not this time.";
            await message.update({ content: `<div class="wodx-card"><p>${esc(a?.name ?? "")}: ${esc(note)}</p><p class="wodx-quiet">${B.REF}</p></div>`, [`flags.${MOD}.banalLife`]: null });
        });
    }

    /** The Storyteller's panel. */
    async function panel() {
        if (!game.user?.isGM) return notify("Everyday Banality is the Storyteller's.");
        const scene = canvas?.scene, kind = kindOf(scene), fae = changelingsOn(scene), sel = [...(canvas?.tokens?.controlled ?? [])].filter(t => t.actor);
        const need = B.needFor(year());
        const content = `<form><p>${esc(scene?.name ?? "No scene")}: ${B.isBanalKind(kind) ? `tagged as ${esc(B.BANAL_KINDS[kind])}` : "not a banal place (tag it as an office, a court of law or a Technocracy site in Places)"}. ${esc(B.WEIGHT_WORDS[B.weightOf(year())])}.</p>
          <ul>${fae.map(a => `<li>${esc(a.name)}: ${tallyOf(a)} of ${need}${B.spared(seemingOf(a)) ? " (a Grump: spared)" : ""}</li>`).join("") || "<li>No changeling on this scene.</li>"}</ul>
          <p>Autumn People here: ${esc(autumnOn(scene).join(", ") || "none")}.</p>
          <div class="form-group"><label>Do</label><select name="mode" data-fixed><option value="count">Count this scene now</option><option value="mark">Mark the selected tokens (${sel.length}) as Autumn People</option><option value="unmark">Unmark the selected tokens</option></select></div>
          <p class="hint">Scenes count by themselves when the scene ends. ${B.REF}.</p></form>`;
        return ctx.dialog("Everyday Banality", content, "Go", async fd => {
            if (fd.mode === "count") return endScene(scene);
            for (const t of sel) await (fd.mode === "mark" ? t.actor.setFlag(MOD, "autumn", true) : t.actor.unsetFlag(MOD, "autumn"));
            return true;
        });
    }

    return { endScene, onTaskDone, bind, panel, expose, rules: B };
}
