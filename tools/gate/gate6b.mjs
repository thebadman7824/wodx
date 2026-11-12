/**
 * Phase 6b gate run inside Foundry (rothenstein-wodx), as a Gamemaster. Load from the console:
 *   await (await import(`/wodx-gate/gate6b.mjs?${Date.now()}`)).run()
 * Answers each WoDX dialog itself, records what the sheets and cards show, and uploads the result to
 * Data/wodx-gate/gate6b-result.json. Creates test data only (the "WoDX 6b test pack" folder and its tokens);
 * deletes nothing; puts the clock back where it was.
 */
// Versions are floors: a later build still passes.
const atLeastV = (a, b) => { const p = s => String(s ?? "0").split(".").map(n => parseInt(n, 10) || 0); const x = p(a), y = p(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = () => game.wodxActions;
const ok = (name, pass, detail = {}) => { R.steps.push({ name, pass: !!pass, ...detail }); };

/* Every dialog that opens is answered by the next function in the queue */
const queue = [];
let hook = null;
function answer(fill) { queue.push(fill); }
async function onRender(app, el) {
    const f = queue.shift();
    if (!f) return;
    const root = el instanceof HTMLElement ? el : el?.[0];
    await sleep(150);
    let res;
    try { res = await f(root, app); } catch (e) { R.errors.push(`answer: ${e.message}`); }
    if (res === "cancel") { app.close(); return; }
    const btn = root.querySelector(`button[data-action="${res ?? "ok"}"]`) ?? root.querySelector("button[data-action=ok], button[data-action=attack], button[data-action=go]");
    btn?.click();
}
const set = (root, name, value) => {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) throw new Error(`no field ${name}`);
    if (el.type === "checkbox") el.checked = !!value; else el.value = String(value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
};
const lastMsg = () => game.messages.contents.at(-1);
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tot = (a, k) => Number(a.system.attributes[k].total ?? a.system.attributes[k].value);
const form = a => ["homid", "glabro", "crinos", "hispo", "lupus"].find(k => a.system.shapes?.[k]?.isactive) ?? "homid";
async function untilMsg(after, ms = 4000) { const t = Date.now(); while (Date.now() - t < ms) { if (game.messages.size > after) return lastMsg(); await sleep(100); } return null; }

async function upload() {
    const file = new File([JSON.stringify(R, null, 1)], "gate6b-result.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
}

async function step(name, fn) {
    try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); }
}

export async function run() {
    const origErr = console.error;
    console.error = (...a) => { R.errors.push(a.map(x => x?.message ?? String(x)).join(" ").slice(0, 300)); origErr(...a); };
    window.addEventListener("error", e => R.errors.push(`window: ${e.message}`));
    hook = Hooks.on("renderDialogV2", onRender);
    const time0 = game.time.worldTime;
    try {
        /* 2. Versions */
        await step("versions", async () => {
            const v = id => game.modules.get(id)?.version;
            ok("versions", atLeastV(v("wodx-actions"), "3.1.1") && atLeastV(v("wodx-combat"), "3.1.1") && atLeastV(v("wodx-creation"), "0.4.1"),
                { actions: v("wodx-actions"), combat: v("wodx-combat"), creation: v("wodx-creation"), era: game.modules.get("wodx-chronicle").api.eras.activeEra()?.profile?.id,
                    moonRage: game.settings.get("wodx-actions", "moonRage"), autoRegen: game.settings.get("wodx-actions", "autoRegen"), user: game.user.name });
        });

        /* 3. Test pack and tokens */
        let pack = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6b test pack");
        await step("test pack", async () => {
            if (!pack) await A().makeTestPack({ confirm: false });
            pack = game.folders.find(f => f.type === "Actor" && f.name === "WoDX 6b test pack");
            const n = game.actors.filter(a => a.folder?.id === pack?.id).length;
            ok("test pack", n === 10, { actors: n });
        });
        const byName = p => game.actors.find(a => a.folder?.id === pack?.id && a.name.startsWith(p));
        const W = byName("Wilhelm"), T = byName("Thorn"), M = byName("Miller"), F = byName("Father");
        // The Kinfolk mortal (after the First Change she lives in "WoDX · Before the First Change")
        const H = game.actors.find(a => a.type === "Mortal" && a.name.startsWith("Hedda"));
        const tok = {};
        await step("tokens", async () => {
            // The pack's own scene: an earlier gate's clean-up can leave the canvas on no scene
            let sc = canvas.scene;
            if (!sc) { sc = game.scenes.find(x => x.tokens.some(t => t.actorId === W?.id)) ?? game.scenes.active ?? game.scenes.contents[0]; await sc.view(); await sleep(1500); sc = canvas.scene; }
            const cx = sc.dimensions.sceneX + 200, cy = sc.dimensions.sceneY + 200, g = sc.grid.size;
            const want = [W, T, M, F, H].filter(a => !sc.tokens.some(t => t.actorId === a.id));
            const docs = [];
            for (const [i, a] of want.entries()) docs.push((await a.getTokenDocument({ x: cx + i * g * 2, y: cy })).toObject());
            if (docs.length) await sc.createEmbeddedDocuments("Token", docs);
            // Linked tokens (the pack made before 3.1.1 had unlinked ones), and the totals worked out
            for (const a of game.actors.filter(x => x.folder?.id === pack.id)) {
                if (!a.prototypeToken.actorLink) await a.update({ "prototypeToken.actorLink": true });
                await a.update({ "system.settings.isupdated": false }); await sleep(300);
            }
            const unlinked = sc.tokens.filter(t => [W, T, M, F, H].some(a => a.id === t.actorId) && !t.actorLink).map(t => ({ _id: t.id, actorLink: true }));
            if (unlinked.length) await sc.updateEmbeddedDocuments("Token", unlinked);
            for (const a of [W, T, M, F, H]) tok[a.name] = sc.tokens.find(t => t.actorId === a.id);
            await W.update({ "system.advantages.rage.temporary": 5, "system.health.damage.lethal": 0, "system.health.damage.bashing": 0, "system.health.damage.aggravated": 0, "system.settings.isupdated": false });
            await T.update({ "system.health.damage.bashing": 0, "system.settings.isupdated": false });
            if (form(W) !== "homid") { answer(r => { set(r, "how", "breed"); }); await A().shiftForm({ actor: { actor: W } }); await sleep(1500); }
            // A run that crashed between shifts can leave form bonuses behind while the werewolf is back in Homid
            if (form(W) === "homid") {
                const left = W.items.filter(i => i.type === "Bonus" && ["glabro", "crinos", "hispo", "lupus"].includes(i.system.parentid) && i.system.isactive).map(i => ({ _id: i.id, "system.isactive": false }));
                if (left.length) { await W.updateEmbeddedDocuments("Item", left); await W.update({ "system.settings.isupdated": false }); await sleep(800); R.formBonusesReset = left.length; }
            }
            ok("tokens", Object.values(tok).every(Boolean) && Object.values(tok).every(t => t.actorLink), { scene: sc.name, str: tot(W, "strength") });
        });

        /* 4. Change form */
        await step("change form", async () => {
            const base = { str: tot(W, "strength"), man: tot(W, "manipulation") };
            await W.update({ "system.attributes.manipulation.value": 3, "system.settings.isupdated": false }); await sleep(1200);
            base.man = tot(W, "manipulation");
            answer(r => { set(r, "form", "glabro"); set(r, "how", "rage"); });
            await A().shiftForm({ actor: { actor: W } }); await sleep(1800);
            const gm = W.items.find(i => i.type === "Bonus" && i.system.parentid === "glabro" && i.system.settingtype === "manipulation");
            const g = { form: form(W), str: tot(W, "strength"), man: tot(W, "manipulation"), bonus: gm?.system.value, oldEffect: !!W.effects.find(e => e.getFlag("wodx-actions", "formFix")) };
            answer(r => { set(r, "form", "crinos"); set(r, "how", "rage"); });
            const before = game.messages.size;
            await A().shiftForm({ actor: { actor: W } }); await sleep(1800);
            // Other cards can follow the Delirium card (a crossover "Seen by another kind" card when a vampire is on the scene), so look through every new one
            const delirium = game.messages.contents.slice(before).find(x => /Delirium/.test(text(x))) ?? lastMsg();
            const c = { form: form(W), str: tot(W, "strength"), man: tot(W, "manipulation"), card: text(delirium) };
            ok("change form", g.form === "glabro" && g.bonus === -1 && g.man === base.man - 1 && g.str === base.str + 2 && !g.oldEffect && c.form === "crinos" && c.str === base.str + 4 && /Delirium/.test(c.card),
                { base, glabro: g, crinos: { ...c, card: c.card.slice(0, 300) }, rageLeft: W.system.advantages.rage.temporary });
            await W.update({ "system.advantages.rage.temporary": 5 });
            // A roll back toward Homid, to see the roll card (random)
            answer(r => { set(r, "form", "homid"); set(r, "how", "roll"); });
            const n = game.messages.size; await A().shiftForm({ actor: { actor: W } }); const m = await untilMsg(n);
            ok("change form by roll (record only)", true, { card: text(m).slice(0, 220), nowIn: form(W) });
        });

        /* 5. Rage and frenzy */
        await step("rage and frenzy", async () => {
            await W.update({ "system.advantages.rage.permanent": 7, "system.advantages.rage.temporary": 7 });
            let m = null, tries = 0, frenzied = false, thrallOnly = null;
            while (tries++ < 10 && !frenzied) {
                answer(r => { set(r, "diff", 5); });
                const n = game.messages.size; await A().rageRoll({ actor: { actor: W } }); m = await untilMsg(n);
                const c = m?.content ?? "";
                if (/data-garou="berserk"/.test(c) && !/data-garou="fox"/.test(c)) thrallOnly = m;
                frenzied = /data-garou="fox"/.test(c);
            }
            if (!frenzied && thrallOnly) { m = thrallOnly; frenzied = true; }
            const hasResist = /data-garou="resist"/.test(m?.content ?? ""), hasFox = /data-garou="fox"/.test(m?.content ?? "");
            await sleep(300);
            const btn = document.querySelector(`[data-message-id="${m.id}"] button[data-garou="berserk"]`);
            btn?.click(); await sleep(1200);
            const after = { isfrenzy: !!W.system.conditions?.isfrenzy, form: form(W), status: W.statuses?.has?.("wodx-frenzy") };
            ok("rage roll and berserk", frenzied && !!btn && after.isfrenzy && ["crinos", "hispo"].includes(after.form),
                { tries, hasResist, hasFox, buttonFound: !!btn, after, card: text(m).slice(0, 200) });
            let ended = false, t2 = 0;
            while (!ended && t2++ < 8) { answer(r => { set(r, "diff", 2); }); await A().garouEndFrenzy({ actor: { actor: W } }); await sleep(500); ended = !W.system.conditions?.isfrenzy; }
            ok("end frenzy", ended, { tries: t2 });
            await W.update({ "system.advantages.rage.permanent": 5, "system.advantages.rage.temporary": 5 });
        });

        /* 6. Moon Rage at nightfall (B40) */
        await step("moon rage", async () => {
            const cal = await import("/modules/wodx-chronicle/scripts/calendar.mjs");
            const lat = game.settings.get("wodx-chronicle", "latitude");
            const now = cal.describeTime(game.time.worldTime, lat);
            await W.update({ "system.advantages.rage.temporary": 1 });
            await game.settings.set("wodx-actions", "moonNight", -1);
            const n = game.messages.size;
            if (now.isNight) await game.time.advance(60);
            else await game.time.advance(cal.secondsToNextDusk(game.time.worldTime, lat) + 120);
            await sleep(2500);
            const card = game.messages.contents.slice(n).find(x => /Moonrise/.test(x.content));
            const t = cal.describeTime(game.time.worldTime, lat);
            ok("moon rage at nightfall", !!card && W.system.advantages.rage.temporary > 1 && card.whisper?.length > 0,
                { wasNight: now.isNight, moon: t.moon.name, rageNow: W.system.advantages.rage.temporary, card: text(card).slice(0, 300), whisperedTo: card?.whisper?.length });
        });

        /* 7. Gifts */
        await step("gifts", async () => {
            let pick = null, info = {};
            answer(r => {
                const radios = [...r.querySelectorAll("input[name=gift]")];
                info = { search: !!r.querySelector("input.wodx-search"), total: radios.length, greyed: radios.filter(x => x.disabled).length };
                const own = radios.find(x => !x.disabled && /· 3 XP|· 6 XP/.test(x.closest("li")?.textContent ?? "") && !/\(outside\)/.test(x.closest("li")?.textContent ?? ""));
                (own ?? radios.find(x => !x.disabled)).checked = true;
                pick = (own ?? radios.find(x => !x.disabled)).value;
                set(r, "xp", false);
            });
            await A().learnGift({ actor: { actor: W } }); await sleep(800);
            const item = W.items.find(i => i.getFlag("wodx-actions", "gift") === pick);
            const g = A().gifts().find(x => x.id === pick);
            ok("learn a Gift", !!item && info.search && info.greyed > 0, { ...info, gift: g?.n, level: g?.l, cost: g?.c });
            await W.update({ "system.advantages.gnosis.temporary": W.system.advantages.gnosis.permanent });
            const g0 = W.system.advantages.gnosis.temporary, e0 = W.effects.size;
            answer(r => { set(r, "gift", item.id); });
            const n = game.messages.size; await A().useGift({ actor: { actor: W } }); const m = await untilMsg(n); await sleep(500);
            const cost = A().garouRules ? (await import("/modules/wodx-actions/scripts/garou-rules.js")).giftCost(g?.c) : {};
            ok("use a Gift", W.system.advantages.gnosis.temporary === g0 - (cost.gnosis ?? 0), { gnosisBefore: g0, gnosisAfter: W.system.advantages.gnosis.temporary,
                effectAdded: W.effects.size > e0, duration: g?.t, card: text(m).slice(0, 220) });
        });

        /* 8. Silver and natural weapons */
        await step("silver", async () => {
            let knife = M.items.find(i => i.name === "Silver knife (test)");
            if (!knife) [knife] = await M.createEmbeddedDocuments("Item", [{ name: "Silver knife (test)", type: "Melee Weapon",
                system: { damage: { attribute: "strength", bonus: 1, type: "lethal" }, attack: { attribute: "dexterity", ability: "melee" }, difficulty: 6, isequipped: true } }]);
            const res = {};
            for (const f of ["crinos", "homid"]) {
                // Each run starts unhurt: the silver hit of an earlier run stays as aggravated damage
                await W.update({ "system.advantages.rage.temporary": 5, "system.advantages.willpower.temporary": 4,
                    "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0, "system.settings.isupdated": false });
                answer(r => { set(r, "form", f); set(r, "how", f === "homid" ? "breed" : "rage"); });
                await A().shiftForm({ actor: { actor: W } }); await sleep(1500);
                let m = null;
                for (let i = 0; i < 6; i++) {
                    answer(r => { set(r, "weapon", knife.id); if (r.querySelector("[name=defense]")) set(r, "defense", "none"); return "attack"; });
                    const n = game.messages.size; await game.wodxCombat.attack({ attacker: M, target: W, weaponId: knife.id }); m = await untilMsg(n, 6000);
                    if (/Soak/.test(text(m))) break;
                }
                res[f] = { form: form(W), full: text(m) };
            }
            const pass = /can.t be soaked and is aggravated/i.test(res.crinos.full) && /breed form: soaked at 6/i.test(res.homid.full);
            for (const f of Object.keys(res)) { res[f].card = res[f].full.slice(0, 900); delete res[f].full; }
            ok("silver by form", pass, res);
            await W.update({ "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0, "system.settings.isupdated": false });
            // Teeth and claws by form (Glabro)
            await W.update({ "system.advantages.rage.temporary": 5 });
            answer(r => { set(r, "form", "glabro"); set(r, "how", "rage"); });
            await A().shiftForm({ actor: { actor: W } }); await sleep(1500);
            let opts = [];
            answer(r => { opts = [...r.querySelectorAll("select[name=weapon] option")].map(o => o.textContent.trim()); return "cancel"; });
            await game.wodxCombat.attack({ attacker: W, target: M }); await sleep(800);
            ok("teeth and claws in Glabro", opts.some(o => /Bite \(Glabro, lethal\)/.test(o)) && !opts.some(o => /^Claw/.test(o)), { options: opts });
            answer(r => { set(r, "how", "breed"); });
            await A().shiftForm({ actor: { actor: W } }); await sleep(500);
        });

        /* 9. Fetish and talen */
        await step("talen", async () => {
            const tal = T.items.find(i => i.system?.type === "wod.types.talen");
            await T.update({ "system.advantages.gnosis.temporary": 3 });
            // A spent talen stays on the sheet, so a talen spent by an earlier run is made whole again first
            if (tal.getFlag("wodx-actions", "spent")) await tal.update({ "flags.wodx-actions.spent": false });
            answer(r => { set(r, "item", tal.id); set(r, "how", "spend"); });
            await A().useFetish({ actor: { actor: T } }); await sleep(800);
            ok("talen spent, kept", !!T.items.get(tal.id)?.getFlag("wodx-actions", "spent") && T.system.advantages.gnosis.temporary === 2, { gnosis: T.system.advantages.gnosis.temporary });
        });

        /* 10. Renown */
        await step("renown", async () => {
            const g0 = W.system.renown.glory.temporary;
            answer(r => { set(r, `a_${W.id}`, true); set(r, "glory", 3); set(r, "reason", "gate test"); });
            const n = game.messages.size; await A().awardRenown(); await untilMsg(n); await sleep(500);
            const card = game.messages.contents.slice(n).find(x => /Renown/.test(x.content));
            ok("award Renown", W.system.renown.glory.temporary === g0 + 3 && !!game.journal.find(j => j.getFlag("wodx-actions", "kind") === "renown") && card?.whisper?.length > 0,
                { glory: W.system.renown.glory.temporary, card: text(card).slice(0, 200) });
        });

        /* 11. The Delirium */
        await step("delirium", async () => {
            await T.update({ "system.advantages.rage.temporary": 2 });
            if (form(T) !== "crinos") { answer(r => { set(r, "form", "crinos"); set(r, "how", "rage"); }); await A().shiftForm({ actor: { actor: T } }); await sleep(800); }
            const target = (d, on) => d.object?.setTarget(on, { releaseOthers: false, groupSelection: true });
            for (const t of [...game.user.targets]) t.setTarget(false, { releaseOthers: false });
            let hTok = canvas.scene.tokens.find(t => t.actorId === H.id);
            if (!hTok) { const g = canvas.scene.grid.size; [hTok] = await canvas.scene.createEmbeddedDocuments("Token", [(await H.getTokenDocument({ x: canvas.scene.dimensions.sceneX + 200, y: canvas.scene.dimensions.sceneY + 200 + g * 2 })).toObject()]); await sleep(500); }
            for (const d of [tok[M.name], tok[F.name], hTok]) target(d, true); await sleep(300);
            R.targets = [...game.user.targets].map(t => t.name);
            answer(() => {});
            const n = game.messages.size; await A().delirium(); const m = await untilMsg(n);
            const t = text(m);
            ok("the Delirium", /Kinfolk, untouched/.test(t) && /Miller/.test(t) && /Father Anselm/.test(t) && m.whisper?.length > 0, { card: t.slice(0, 400) });
            for (const t of [...game.user.targets]) t.setTarget(false, { releaseOthers: false });
        });

        /* 12. The First Change */
        await step("first change", async () => {
            const FC = await import("/modules/wodx-creation/scripts/first-change.mjs");
            if (!FC.canChange(H)) { const wolf = game.actors.find(a => a.type === "Werewolf" && a.name === H.name);
                ok("the First Change (done in the first run)", !!wolf && H.folder?.name === "WoDX · Before the First Change", { wolf: wolf?.name, str: wolf && tot(wolf, "strength") }); return; }
            let marked = [];
            answer(r => {
                set(r, "mortal", H.id);
                const tribe = r.querySelector("[name=tribe]").value;
                const lis = [...r.querySelectorAll("ul.wodx-fc-gifts li")];
                const picked = {};
                for (const li of lis) {
                    const tag = li.querySelector(".wodx-fc-tag")?.textContent ?? "";
                    for (const part of ["breed", "auspice", "tribe"]) if (tag.includes(part) && !picked[part]) { picked[part] = li; li.querySelector("input").checked = true; break; }
                }
                marked = Object.values(picked).map(li => li.querySelector("input").dataset.name);
                R.fcTribe = tribe;
            });
            await FC.firstChangeDialog(); await sleep(1500);
            const wolf = game.actors.find(a => a.type === "Werewolf" && a.name === H.name);
            const gi = wolf ? A().garouInfo(wolf) : {};
            ok("the First Change", !!wolf && H.folder?.name === "WoDX · Before the First Change" && tok[H.name]?.actorId === wolf?.id && R.fcTribe === "fenrir",
                { tribeOffered: R.fcTribe, gifts: marked, info: { breed: gi.breed, auspice: gi.auspice, tribe: gi.tribe, rage: gi.rage, gnosis: gi.gnosis }, items: wolf?.items.filter(i => i.system?.type === "wod.types.gift").map(i => i.name) });
        });

        /* 13. Pack pools Hunting Grounds */
        await step("pack pool", async () => {
            const GS = await import("/modules/wodx-creation/scripts/group-sheet.mjs");
            ok("Hunting Grounds poolable (Dark Ages)", GS.poolableFor("pack")?.list.includes("Hunting Grounds"), { list: GS.poolableFor("pack")?.list });
        });

        /* 14. Regeneration each round */
        await step("regeneration", async () => {
            await T.update({ "system.health.damage.bashing": 3 });
            const combat = await Combat.create({ scene: canvas.scene.id, active: true });
            await combat.createEmbeddedDocuments("Combatant", [{ tokenId: tok[T.name].id, sceneId: canvas.scene.id, actorId: T.id }]);
            await combat.startCombat(); await sleep(2000);
            const before = T.system.health.damage.bashing;
            const n = game.messages.size;
            await combat.nextRound(); await sleep(2500);
            const card = game.messages.contents.slice(n).find(x => /Regeneration/.test(x.content));
            ok("regeneration each round", T.system.health.damage.bashing === before - 1 && !!card, { before, after: T.system.health.damage.bashing, card: text(card).slice(0, 200), combatId: combat.id });
            R.leftCombat = combat.id;
        });
    } finally {
        Hooks.off("renderDialogV2", hook);
        console.error = origErr;
        // The regeneration fight is the gate's own: end it so it does not stay running on the testbed
        try { if (R.leftCombat && game.combats.get(R.leftCombat)) { await game.combats.get(R.leftCombat).delete(); R.combatDeleted = true; } } catch (e) { R.errors.push(`combat: ${e.message}`); }
        // The clock goes back to where it was
        try { if (game.time.worldTime !== time0) { R.clockMoved = game.time.worldTime - time0; await game.time.set(time0); } } catch (e) { R.errors.push(`clock: ${e.message}`); }
        R.finished = new Date().toISOString();
        R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
        await upload();
    }
    return R.summary;
}
