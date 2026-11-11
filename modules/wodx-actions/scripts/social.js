import * as SR from "./social-rules.js";

/**
 * WoDX Actions 3.20.0: "With this person". A player picks one NPC (the target, the token given, or the nearest in
 * reach) and deals with them: Talk (WoDX NPC's topic window), the social rolls in social-rules.js, Charm or seduce
 * (the Seduction action), or Use a power (the line's menu). The NPC's resisting roll goes to the Storyteller only;
 * the player's card says what happened. Attitude changes go through WoDX NPC (the approval queue for players).
 */
export function build(ctx) {
    const { R, PRESETS, pickPool, readPool, woundPenalty, setting, road, rollPool, rollBlock, post, opponentPool, esc, dialog, opts,
        willpower, spendWillpower, seduction, menu, resolveActor } = ctx;
    const npcApi = () => game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api : null;
    const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
    const tokenOf = t => t?.object ?? t ?? null;
    const reach = () => { try { return Number(game.settings.get("wodx-npc", "talkReach")) || 2; } catch (e) { return 2; } };

    /** The NPC to deal with: the token given, else the one target, else the nearest NPC in reach. */
    function findNpc(given, me) {
        const g = tokenOf(given);
        if (g?.actor) return g;
        const tg = [...(game.user.targets ?? [])].filter(t => t.actor);
        if (tg.length === 1) return tg[0];
        if (!me || !canvas?.tokens) return null;
        const size = canvas.grid?.size || 100, max = (reach() + 0.5) * size;
        let best = null, bestD = Infinity;
        for (const t of canvas.tokens.placeables) {
            if (!t.actor || t.id === me.id || t.actor.hasPlayerOwner || (t.document.hidden && !game.user.isGM)) continue;
            const d = Math.hypot(t.center.x - me.center.x, t.center.y - me.center.y);
            if (d <= max && d < bestD) { best = t; bestD = d; }
        }
        return best;
    }
    const nameFor = tok => tok?.document?.name ?? tok?.name ?? "They";
    const attitudeOf = (npc, me) => { try { return npcApi()?.attitude?.of?.(npc, me) ?? null; } catch (e) { return null; } };

    /** The window: who it is, and what the character can do. */
    async function withPerson(arg = {}) {
        const opt = arg?.actor instanceof Actor && !(arg instanceof Token) && !arg?.documentName ? arg : { token: arg };
        const meTok = canvas.tokens?.controlled?.[0] ?? null;
        const actor = opt.actor ?? resolveActor(null);
        if (!actor) { ui.notifications.warn("WoDX Actions: select your character's token first."); return null; }
        const npcTok = findNpc(opt.token ?? opt.target ?? null, meTok ?? actor.getActiveTokens?.()[0]);
        if (!npcTok?.actor) { ui.notifications.warn("Target the person you want to deal with, or stand next to them."); return null; }
        if (npcTok.actor.hasPlayerOwner) { ui.notifications.info("That is a player's character: deal with them yourselves."); return null; }
        const npc = npcTok.actor, name = nameFor(npcTok);
        const at = attitudeOf(npc, actor);
        const gmLine = game.user.isGM && at ? `<p class="vta-note">Storyteller: ${esc(name)} regards ${esc(actor.name)} as <b>${esc(at.word)}</b>${at.met ? "" : at.from ? ` (not met yet: from ${esc(at.from)})` : " (not met yet)"}.
            Set it: <select name="setAttitude" data-fixed><option value="">(leave)</option>${opts(Object.entries(npcApi().attitude.rules.STEPS).map(([k, w]) => [k, w]), "")}</select></p>` : "";
        const btn = (k, icon, label, hint) => `<button type="button" class="wodx-wp-act" data-act="${k}" title="${esc(hint)}"><i class="fas ${icon}"></i> ${esc(label)}</button>`;
        const content = `<form class="wodx-with-person">
          <p>${esc(actor.name)} deals with <b>${esc(name)}</b>.</p>${gmLine}
          <div class="wodx-wp-grid">
            ${npcApi()?.openTalk ? btn("talk", "fa-comment", "Talk", "Ask about the topics they will talk about") : ""}
            ${SR.ACTS.map(a => btn(a.key, a.icon, a.label, `${a.note} (${a.ref})`)).join("")}
            ${btn("charm", "fa-heart", "Charm or seduce", "The three-stage Seduction (V20 p. 266)")}
            ${btn("power", "fa-hand-sparkles", "Use a power on them", "Opens your menu with them still targeted")}
          </div>
          <input type="hidden" name="act" value=""/>
        </form>`;
        const render = root => {
            const form = root.querySelector("form");
            form.querySelectorAll(".wodx-wp-act").forEach(b => b.addEventListener("click", () => {
                form.querySelector("[name=act]").value = b.dataset.act;
                root.closest?.(".application, .app, dialog")?.querySelector?.("[data-action=ok], button[data-button=ok], footer button")?.click();
            }));
        };
        return dialog(`With ${name}`, content, "Choose", async fd => {
            if (game.user.isGM && fd.setAttitude !== undefined && fd.setAttitude !== "") await npcApi()?.attitude?.apply?.(npc, actor, { to: Number(fd.setAttitude), why: "Set by the Storyteller" });
            const act = fd.act;
            if (!act) return null;
            if (act === "talk") return npcApi().openTalk(npcTok.document ?? npcTok);
            if (act === "charm") {
                npcTok.setTarget?.(true, { releaseOthers: true });
                return seduction({ actor, target: npc, onDone: res => after(actor, npc, name, { key: "charm", sway: "charmed", moves: { win: 1, lose: 0, botch: -1 } }, { result: res }) });
            }
            if (act === "power") { npcTok.setTarget?.(true, { releaseOthers: true }); return menu({ actor }); }
            return social(actor, npcTok, act);
        }, { render, width: 520 });
    }

    /** One social roll against the NPC. */
    async function social(actor, npcTok, key, given = null) {
        const act = SR.actByKey(key);
        const npc = npcTok?.actor;
        if (!act || !npc) return null;
        const preset = PRESETS[act.preset] ?? {};
        const name = nameFor(npcTok);
        const pick = pickPool(actor, preset.alts ?? [[preset.attr, preset.ability]]);
        const at = attitudeOf(npc, actor);
        const shift = at ? npcApi().attitude.rules.difficultyShift(at.step, { ignore: !!act.noShift }) : 0;
        let fd = given;
        if (!fd) {
            const content = `<form>
              <p>${esc(actor.name)}: ${esc(act.label.toLowerCase())}, against <b>${esc(name)}</b>.</p>
              <p class="vta-note">${esc(act.note)} (${esc(act.ref)})</p>
              <p class="vta-note">Pool: ${esc(pick ? `${pick.attr.replace(/^./, c => c.toUpperCase())} + ${pick.abilityName}` : "none")}, difficulty ${preset.diff ?? 6}. How they regard ${esc(actor.name)} may change it.</p>
              ${act.offer ? `<div class="form-group"><label>What is offered</label><select name="offer" data-fixed>${opts(SR.OFFERS.map(o => [o[0], o[1]]), "fair")}</select></div>
                <div class="form-group"><label>The offer, in a few words</label><input type="text" name="offerText" value=""/></div>` : ""}
              <div class="form-group"><label>Bonus dice / extra difficulty</label><input type="number" name="bonus" value="0" style="width:4em"/> <input type="number" name="extraDiff" value="0" style="width:4em"/></div>
              <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
              <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success) [${willpower(actor).temp}]</label></div>
              <div class="form-group"><label><input type="checkbox" name="aura" ${preset.aura ? "checked" : ""}/> Apply Road aura</label></div>
            </form>`;
            fd = await dialog(act.label, content, "Roll", d => d);
            if (!fd) return null;
        }
        if (!pick) { ui.notifications.warn("No pool fits."); return null; }
        if (fd.wp && !(await spendWillpower(actor, 1))) return null;
        const pool = readPool(actor, pick.attr, pick.abilityId);
        const rd = road(actor);
        const built = R.actionPool({
            attribute: pool.attribute, attributeLabel: pool.attributeLabel, ability: pool.ability, abilityLabel: pool.abilityLabel || pick.abilityName,
            abilityType: setting("untrained") ? pool.abilityType : "talent", abilityKey: pool.abilityKey,
            bonusDice: (Number(fd.bonus) || 0) + (act.offer ? SR.offerDice(fd.offer) : 0), extraDiff: (Number(fd.extraDiff) || 0) + shift,
            baseDifficulty: preset.diff ?? 6, woundPenalty: woundPenalty(actor), multiIndex: 0, retries: 0,
            aura: fd.aura ? R.auraModifier(rd.value) : 0
        });
        if (built.blocked) { ui.notifications.warn(built.blocked); return null; }
        const me = await rollPool(built.dice, built.difficulty, { specialty: !!fd.specialty, willpower: !!fd.wp });
        const op = opponentPool(npc, preset.opp, { oppPool: "preset", diff: preset.diff ?? 6, oppDice: 3, oppDiff: 6 }, actor);
        const them = await rollPool(op.dice, op.diff);
        const res = SR.outcome(me, them, { needMore: !!preset.opp?.needMore });
        const label = [pool.attributeLabel, pool.abilityLabel || pick.abilityName].filter(Boolean).join(" + ");
        let body = rollBlock(label, me, built.parts.concat(fd.specialty ? ["specialty"] : [], fd.wp ? ["Willpower"] : []), !!fd.specialty);
        if (act.offer && fd.offerText) body += `<div class="vta-note">Offered: ${esc(fd.offerText)}</div>`;
        body += `<div class="vta-big">${esc(SR.outcomeText(act, res, name))}</div>`;
        if (key === "question" && res.result === "win" && res.margin > willpower(npc).perm) body += `<div class="vta-note">${esc(name)} tells everything.</div>`;
        await post(actor, `${actor.name}: ${act.label.toLowerCase()}`, body, [me.roll]);
        // The NPC's side, for the Storyteller only
        const why = `${actor.name}: ${act.label.toLowerCase()}, ${res.result}`;
        const move = SR.attitudeMove(act, res.result);
        await ChatMessage.create({
            speaker: { alias: name }, whisper: gmIds(), blind: true, rolls: them.roll ? [them.roll] : [],
            content: `<div class="vta-card wodx-x"><div class="vta-body"><p><b>${esc(name)}</b> resists ${esc(actor.name)} (${esc(act.label.toLowerCase())}).</p>`
                + `${rollBlock(`${esc(name)} (${esc(op.label)})`, them)}<p>${esc(res.result === "win" ? `${actor.name} wins by ${res.margin}.` : res.result === "tie" ? "A tie." : res.result === "botch" ? `${actor.name} botches.` : `${name} resists by ${res.margin}.`)}</p>`
                + `${at ? `<p class="vta-note">Attitude ${esc(at.word)}: difficulty ${shift > 0 ? "+" : ""}${shift}.${move ? ` It moves ${move > 0 ? "up" : "down"} ${Math.abs(move)}${game.user.isGM ? "" : " (in the approval queue)"}.` : ""}</p>` : ""}</div></div>`
        });
        await after(actor, npc, name, act, res, why);
        return res;
    }

    /** What follows an act: the note on the character, the attitude move, and a hook for routines. */
    async function after(actor, npc, name, act, res, why = "") {
        const now = game.time.worldTime;
        if (res.result === "win" && act.sway && actor.isOwner) {
            const list = SR.addSway(actor.flags?.["wodx-actions"]?.sways, { kind: act.sway, npc: npc.id, npcName: name }, now);
            await actor.update({ "flags.wodx-actions.sways": list });
        }
        const move = SR.attitudeMove(act, res.result);
        if (move) await npcApi()?.attitude?.propose?.(npc, actor, { delta: move, why: why || `${actor.name}: ${act.key}, ${res.result}` });
        Hooks.callAll("wodxSocial", { actor, npc, act: act.key, result: res.result });
        return res;
    }

    return { withPerson, social, findNpc, rules: SR };
}
