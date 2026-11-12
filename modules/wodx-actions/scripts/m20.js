/**
 * WoDX Actions 3.11 (Phase 6m): mages of the later eras (Mage: The Ascension 20th), on the system's Mage sheet.
 *
 *   The traits     Arete (capped by permanent Willpower), the nine Spheres, Quintessence and Paradox (the wheel), the Avatar
 *   Cast           the Spheres used, coincidental or vulgar, the feat's successes, the modifiers chart, Quintessence, Willpower;
 *                  degrees of success; Paradox gained; damage or duration from the successes
 *   Backlash       the Storyteller's roll of the Paradox pool; staving it off with Willpower; the Quiet
 *   Counter, resist countermagick (Arete at 7), resisting Mind (Willpower at 6); dispelling a Quiet delusion
 *   Shed Paradox   a week without overt magick sheds a point while the pool is under five (the world-time hook)
 *
 * Built by main.js with its helpers (ctx). Pure rules: m20-rules.js.
 */
import * as M from "./m20-rules.js";
import { aim, castIntent } from "./aim.js";
import * as C from "./consensus-rules.js";
import * as EF from "./effects.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REF = M.REF;
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, spendWillpower, notify } = ctx;
    const flag = a => a.getFlag(MOD, "m20") ?? {};
    const saveFlag = (a, patch) => ctx.setFlag(a, "m20", { ...flag(a), ...patch });
    const get = (k, d) => { try { return game.settings.get(MOD, k); } catch (e) { return d; } };
    /** The age of the chronicle's year: what Consensus the caster works under. */
    function age() {
        if (!get("consensusEra", true)) return C.AGES[2];
        let y = null;
        try { y = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { /* no chronicle */ }
        return C.ageFor(y);
    }
    const placeOf = scene => String(scene?.flags?.[MOD]?.consensus?.styles ?? "");
    function suggest(actor, scene = canvas?.scene) {
        const a = age();
        return { age: a, ...C.suggestKind({ age: a.key, style: flag(actor).style ?? "", place: placeOf(scene), zones: get("realityZones", "world") }) };
    }

    function info(actor) {
        const s = actor.system ?? {};
        const spheres = Object.fromEntries(M.SPHERES.map(k => [k, n(s.spheres?.[k]?.value)]));
        const av = (actor.items ?? []).find(i => i.type === "Feature" && /^(avatar|genius)/i.test(i.name ?? ""));
        return { arete: n(s.advantages?.arete?.permanent), willpower: { perm: n(s.advantages?.willpower?.permanent), temp: n(s.advantages?.willpower?.temporary) },
            spheres, affinity: String(s.affinity ?? "").toLowerCase(), avatar: n(av?.system?.value),
            quint: n(s.quintessence?.temporary), paradox: n(s.paradox?.temporary), paradoxPerm: n(s.paradox?.permanent), f: flag(actor),
            dice: M.castingDice(n(s.advantages?.arete?.permanent), n(s.advantages?.willpower?.permanent)) };
    }
    async function setParadox(actor, v) {
        const i = info(actor);
        const p = Math.max(i.paradoxPerm, Math.min(20, n(v)));
        const w = M.wheel(i.quint, p);
        await updateActor(actor, { "system.paradox.temporary": p, "system.quintessence.temporary": w.quintessence });
        return { paradox: p, quintLost: i.quint - w.quintessence };
    }

    async function cast(actor, o = {}) {
        // A Rote item (the system's or WoDX's own) fills the window in
        const roteItem = typeof o.rote === "string" ? actor.items?.get(o.rote) : o.rote;
        const preset = roteItem ? EF.E.roteOfItem(roteItem) : null;
        const i = info(actor);
        const sg = suggest(actor), W = C.WORDS[sg.age.key];
        // Sleepers who can see the caster (3.40.0): only they make vulgar magick witnessed
        const seen = ctx.observersOf?.(actor) ?? null;
        if (seen?.breach.length && sg.kind === "vulgar") sg.kind = "witnessed";
        const row = k => `<div class="form-group"><label>${cap(k)} <small>${i.spheres[k]}</small></label><select name="s-${k}" data-fixed><option value="0">—</option>${[1, 2, 3, 4, 5].filter(l => l <= i.spheres[k]).map(l => `<option value="${l}">${l}</option>`).join("")}</select></div>`;
        const content = `<form><p><b>${esc(actor.name)}</b>: Arete ${i.arete}${i.dice < i.arete ? ` (Willpower ${i.willpower.perm} caps it: ${i.dice} dice)` : ""}; Quintessence ${i.quint}, Paradox ${i.paradox}${i.avatar ? `; Avatar ${i.avatar}` : ""}.</p>
          <fieldset><legend>Spheres used</legend>${M.SPHERES.filter(k => i.spheres[k]).map(row).join("") || "<p>No Spheres on the sheet.</p>"}</fieldset>
          <div class="form-group"><label>The Effect is</label><select name="kind" data-fixed>${Object.entries(M.KINDS).map(([k, x]) => `<option value="${k}"${k === sg.kind ? " selected" : ""}>${esc(W[k] ?? x.label)} (highest + ${x.add})</option>`).join("")}</select></div>
          <div class="form-group"><label>The caster's style</label><input type="text" name="style" value="${esc(i.f.style ?? "")}" placeholder="Hermetic, Christian miracles, witchcraft, Taoist"/></div>
          ${seen ? `<p class="hint">${seen.breach.length ? `Sleepers who can see: ${seen.breach.map(t => esc(t.name)).join(", ")}.` : "No Sleeper can see the caster."}${seen.startled.length ? ` Others who would notice vulgar magick: ${seen.startled.map(t => esc(t.name)).join(", ")}.` : ""}</p>` : ""}
          <p class="hint">${esc(sg.age.label)}${sg.why ? `: ${esc(sg.why)}` : "."}${sg.age.key === "dark" ? " A Dark Ages mage uses the Dark Ages cast." : ""} (${esc(sg.age.ref)})</p>
          ${EF.fieldset(i.spheres, EF.rotesOf(actor))}
          <div class="form-group"><label>The feat</label><select name="feat" data-fixed>${M.FEATS.map(f => `<option value="${f.need}">${esc(f.label)}: ${f.need}</option>`).join("")}</select></div>
          <div class="form-group"><label>More successes declared (targets, damage, duration)</label><input type="number" name="extra" min="0" max="20" value="0"/></div>
          <fieldset><legend>Modifiers (net ±3)</legend>${Object.entries(M.MODIFIERS).map(([k, m]) => `<div class="form-group"><label><input type="checkbox" name="m-${k}"/> ${esc(m.label)} (${m.mod > 0 ? "+" : ""}${m.mod})</label></div>`).join("")}
            <div class="form-group"><label>Other modifier</label><input type="number" name="free" min="-3" max="3" value="0"/></div></fieldset>
          <div class="form-group"><label>Quintessence (−1 difficulty each, 3 at most)</label><input type="number" name="q" min="0" max="${Math.min(3, i.quint)}" value="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="dmg"/> The successes go to damage (else duration)</label></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return dialog(`Cast an Effect: ${actor.name}`, content, "Cast", async fd => {
            const used = M.SPHERES.map(k => ({ sphere: k, level: n(fd[`s-${k}`]) })).filter(x => x.level);
            const mods = Object.keys(M.MODIFIERS).filter(k => fd[`m-${k}`]);
            const form = EF.read(fd);
            if (form.save && form.keywords.length) await EF.saveRote(actor, EF.E.roteFrom(form.save, { keywords: form.keywords, used, plan: form.plan, ctx: form.ctx, kind: fd.kind, feat: n(fd.feat) }));
            const kw = form.keywords.length ? EF.plan(actor, form, 0, { used, feat: n(fd.feat), age: sg.age.key }) : null;
            const plan = M.castPlan({ arete: i.arete, willpower: i.willpower.perm, used, known: i.spheres, kind: fd.kind, mods, quint: n(fd.q), avatar: i.avatar, need: kw ? kw.need : n(fd.feat), extra: n(fd.extra), freeMod: n(fd.free) });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (plan.quintUsed) { if (plan.quintUsed > i.quint) { notify(`${actor.name} has ${i.quint} Quintessence.`); return null; } await updateActor(actor, { "system.quintessence.temporary": i.quint - plan.quintUsed }); }
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp });
            const d = M.degree(r, plan.need);
            const px = M.paradoxGained(fd.kind, plan.highest, r.botch);
            const after = px ? await setParadox(actor, info(actor).paradox + px) : null;
            await saveFlag(actor, { lastMagick: game.time?.worldTime ?? 0, ...(String(fd.style ?? "").trim() ? { style: String(fd.style).trim() } : {}) });
            const fortune = sg.age.key === "crusade" ? await fortuneRoll(actor) : null;
            const label = used.map(x => `${cap(x.sphere)} ${x.level}`).join(" / ");
            let body = rollBlock(`Arete ${plan.dice}`, r, [`${label}: ${(W[fd.kind] ?? M.KINDS[fd.kind].label).toLowerCase()} (${plan.base}${plan.net ? `, ${plan.net > 0 ? "+" : ""}${plan.net}` : ""})`, ...(plan.capped ? ["modifiers capped at ±3"] : []),
                ...(plan.quintUsed ? [`${plan.quintUsed} Quintessence`] : []), ...(plan.over ? [`+${plan.over} needed: past difficulty 10`] : []), ...(wp ? ["Willpower"] : [])]);
            body += `<div class="vta-big ${d.key === "botch" ? "bad" : d.key === "success" || d.key === "extraordinary" ? "good" : ""}">${r.successes} of ${plan.need}: ${esc(d.text)}.</div>`;
            const fx = kw && r.successes && !r.botch ? EF.plan(actor, form, r.successes, { used, feat: n(fd.feat), age: sg.age.key }) : null;
            if (fx?.got?.ok) body += fx.html;
            else if ((d.key === "success" || d.key === "extraordinary" || d.key === "partial") && r.successes) {
                body += fd.dmg ? `<div class="vta-res">Damage: ${EF.E.eraRules(sg.age.key).levels(r.successes, { forces: used.some(x => x.sphere === "forces") })} levels (${M.damageType({ spheres: used.map(x => x.sphere) })}, unless charged with Prime or Pattern-breaking); the Effect is instant.</div>`
                    : `<div class="vta-res">Duration: ${M.duration(r.successes)}.</div>`;
            }
            if (px) body += `<div class="vta-note">+${px} ${sg.age.key === "crusade" ? "Scourge" : "Paradox"} (${after.paradox})${after.quintLost ? `; it cancels ${after.quintLost} Quintessence on the wheel` : ""}.${after.paradox > 5 ? " Past five: the Storyteller may roll a backlash." : ""}${M.overload(after.paradox) ? " Twenty or more: an intense Quiet, a crack in reality, or worse." : ""}</div>`;
            if (fortune) body += fortune.html;
            if (r.botch && sg.age.key !== "crusade") body += `<div class="vta-note">To stave off the backlash: ${esc(M.STAVE)}.</div>`;
            body += `<div class="wodx-quiet">${sg.age.key === "crusade" ? `Sorcerers Crusade pdf pp. 244–249; ${REF} pp. 501–504 for the feats` : `${REF} pp. 501–504`}</div>`;
            const fxData = fx?.got?.ok && fx.items.length ? { kind: "effects", caster: actor.name, items: fx.items.filter(x => x.route !== "off" && x.route !== "st"), recipe: fx.recipe, hold: fx.hold } : null;
            if (["vulgar", "witnessed"].includes(fd.kind)) ctx.revealed?.(actor, { secret: "mage", event: "worked vulgar magick" })?.catch?.(e => console.error("WoDX |", e));
            return post(actor, `${actor.name} works magick`, body, [r.roll].filter(Boolean), fxData?.items.length ? fxData : undefined);
        }, { width: 560, render: root => { EF.wire(root, i.spheres, EF.rotesOf(actor)); if (preset) EF.fill(root, preset); return aim(root, { actor, cast: { from: r => castIntent({ spheres: Object.fromEntries(M.SPHERES.map(k => [k, Number(r.querySelector(`[name=s-${k}]`)?.value) || 0])) }) } }); } });
    }

    async function backlashRoll(actor) {
        const i = info(actor);
        const content = `<form><p>${esc(actor.name)}'s Paradox pool: ${i.paradox}${i.paradoxPerm ? ` (${i.paradoxPerm} permanent)` : ""}. The Storyteller rolls a die a point at 6.</p>
          <div class="form-group"><label><input type="checkbox" name="stave"/> Stave it off: ${esc(M.STAVE)}</label></div></form>`;
        return dialog(`Paradox backlash: ${actor.name}`, content, "Roll", async fd => {
            if (fd.stave) {
                if (!(await spendWillpower(actor, 1))) return null;
                await saveFlag(actor, { staved: game.scenes?.viewed?.id ?? "" });
                return post(actor, `${actor.name} holds the backlash back`, `<div class="vta-res">The Effect fails; the backlash waits for the end of the scene and grows with every Paradox point gathered.</div><div class="wodx-quiet">${REF} p. 549</div>`);
            }
            const r = await rollPool(i.paradox, 6);
            const b = M.backlash(r);
            const out = b.discharge === "all" ? await setParadox(actor, i.paradoxPerm) : b.discharge ? await setParadox(actor, i.paradox - b.discharge) : null;
            const q = b.discharge && b.discharge !== "all" ? M.quietLevel(b.discharge) : null;
            const body = rollBlock("Paradox", r) + `<div class="vta-big ${b.discharge ? "bad" : ""}">${cap(esc(b.text))}.</div>${out ? `<div class="vta-res">Paradox ${out.paradox}.</div>` : ""}${q ? `<div class="vta-note">If the Storyteller chooses Quiet: level ${q.level}, ${esc(q.text)}.</div>` : ""}<div class="wodx-quiet">${REF} pp. 506, 549</div>`;
            return post(actor, `${actor.name}: Paradox backlash`, body, [r.roll].filter(Boolean));
        });
    }
    async function counter(actor, o = {}) {
        // Answering a WoDX keyword card: the successes come off that card (3.25.0)
        const card = o.card ? game.messages?.get(o.card) : null;
        const i = info(actor);
        const content = `<form><div class="form-group"><label>How</label><select name="mode" data-fixed><option value="self">Against an Effect aimed at this mage (Arete at 7)</option><option value="dispel">For another: dispel it (8; Prime 1 and a Quintessence)</option>${EF.E.eraRules(age().key).reflect ? `<option value="reflect">For another: reflect it (9; Prime 1 and a Quintessence)</option>` : ""}
            <option value="mind">Resist Mind magick (Willpower at 6)</option><option value="quiet">Dispel a Quiet delusion (a Willpower point; Willpower at 7)</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="share" checked/> Knows at least one of the attacking Spheres</label></div></form>`;
        return dialog(`Countermagick: ${actor.name}`, content, "Roll", async fd => {
            if (fd.mode === "mind") {
                const r = await rollPool(i.willpower.perm, M.resistMind.difficulty);
                return post(actor, `${actor.name} resists the mind`, rollBlock("Willpower", r) + `<div class="vta-res">${r.successes} taken from the Mind Effect.${r.botch ? " A botch may cost a permanent Willpower point." : ""}</div><div class="wodx-quiet">${REF} p. 330</div>`, [r.roll].filter(Boolean));
            }
            if (fd.mode === "quiet") {
                if (!(await spendWillpower(actor, 1))) return null;
                const r = await rollPool(i.willpower.perm, 7);
                if (r.successes) await setParadox(actor, i.paradox - 1);
                return post(actor, `${actor.name} masters the visions`, rollBlock("Willpower", r) + `<div class="vta-res">${r.successes ? "The delusion lifts, and a Paradox point with it." : "The Willpower point is spent; the delusion stays."}</div><div class="wodx-quiet">${REF} p. 330</div>`, [r.roll].filter(Boolean));
            }
            const plan = M.counterPlan({ arete: i.arete, willpower: i.willpower.perm, sharesSphere: !!fd.share, mode: fd.mode, prime: i.spheres.prime, quint: i.quint });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (plan.quint) await updateActor(actor, { "system.quintessence.temporary": i.quint - 1 });
            const r = await rollPool(plan.dice, plan.difficulty);
            return post(actor, `${actor.name}: countermagick`, rollBlock(`Arete ${plan.dice}`, r) + `<div class="vta-res">${r.successes} of the caster's successes cancelled${fd.mode === "reflect" ? "; any beyond theirs strike the caster" : ""}. A full action.${card ? " The casting's card is worked out again." : ""}</div><div class="wodx-quiet">${REF} p. 545</div>`, [r.roll].filter(Boolean),
                card ? { kind: "counter", card: card.id, successes: r.successes, mode: fd.mode, by: actor.name } : undefined);
        });
    }
    /** The Fortune Dice (Sorcerers Crusade pdf p. 249): a 1 is a Bane, a 10 a Boon; either spends the whole Scourge Pool. */
    async function fortuneRoll(actor) {
        const pool = info(actor).paradox, n = C.fortuneDice(pool);
        const roll = await new Roll(`${n}d10`).evaluate();
        const faces = roll.dice?.[0]?.results?.map(x => x.result) ?? [];
        const hit = C.readFortune(faces);
        let out = null;
        if (hit && pool > info(actor).paradoxPerm) out = await setParadox(actor, info(actor).paradoxPerm);
        const html = `<div class="vta-note">Fortune ${n > 1 ? "Dice" : "Die"}: ${faces.join(", ")}. ${hit ? `A ${hit === "bane" ? "Bane" : "Boon"}: ${esc(C.fortuneSize(pool))}, shaped by the caster's virtue or vice; the Scourge Pool of ${pool} is spent${out ? ` (now ${out.paradox})` : ""}.` : "Fate holds its hand."}</div>`;
        return { faces, hit, pool, html };
    }
    /** Clearing the Scourge (pdf p. 249): a day alone in meditation for each point. */
    async function purify(actor) {
        const i = info(actor), d = C.purifyDays(i.paradox - i.paradoxPerm);
        if (!d) { notify(`${actor.name} has no Scourge to clear.`); return null; }
        return dialog(`Purify: ${actor.name}`, `<p>${esc(actor.name)} must spend ${d} day${d === 1 ? "" : "s"} alone in meditation to clear the Scourge Pool of ${i.paradox}.</p>`, "Done", async () => {
            await setParadox(actor, i.paradoxPerm);
            await saveFlag(actor, { lastShed: game.time?.worldTime ?? 0 });
            return post(actor, `${actor.name} is purified`, `<div class="vta-res">${d} day${d === 1 ? "" : "s"} alone in meditation; the Scourge is cleared.</div><div class="wodx-quiet">Sorcerers Crusade pdf p. 249</div>`);
        });
    }
    /** The Storyteller sets the styles a place accepts (a Reality Zone, or what people believe there). */
    async function placeDialog(scene = canvas?.scene) {
        if (!game.user.isGM || !scene) return null;
        const a = age();
        return dialog(`Consensus: ${scene.navName || scene.name}`, `<form><p>${esc(a.label)}. ${a.key === "crusade" ? `Left empty, the styles of Europe count: ${C.CRUSADE_EUROPE.join(", ")}.` : a.key === "dark" ? "This age has no coincidental or vulgar split." : "Read only when Reality Zones are set to \"the place decides\"."}</p>
          <div class="form-group"><label>Styles accepted here</label><input type="text" name="styles" value="${esc(placeOf(scene))}" placeholder="pagan, christian, alchemy"/></div></form>`, "Save",
            async fd => scene.update({ [`flags.${MOD}.consensus`]: { styles: String(fd.styles ?? "").trim() } }));
    }

    /** Shedding Paradox (p. 549): a point a week without overt magick while the pool is under five. Called by the world-time hook (GM). */
    async function shedAll(actors = game.actors?.filter?.(a => a.type === "Mage") ?? []) {
        if (age().key === "crusade") return; // in the Crusade the Scourge is cleared by meditation, not by time
        const now = game.time?.worldTime ?? 0, week = 7 * 86400;
        for (const a of actors) {
            const i = info(a);
            if (!i.paradox || i.paradox >= 5 || i.paradox <= i.paradoxPerm) continue;
            const since = Math.max(n(i.f.lastMagick), n(i.f.lastShed));
            if (!since) { await saveFlag(a, { lastShed: now }); continue; }
            const weeks = Math.floor((now - since) / week);
            if (weeks < 1) continue;
            await setParadox(a, Math.max(i.paradoxPerm, M.shed(i.paradox, weeks)));
            await saveFlag(a, { lastShed: since + weeks * week });
        }
    }

    /** The system's Rote button: true when WoDX's Cast window takes it (opened here), false to leave it to the system. */
    function castRote(actor, item) {
        if (!EF.takesRote(actor, age().key)) return false;
        cast(actor, { rote: item }).catch(e => console.error("WoDX | rote", e));
        return true;
    }

    return { info, cast, castRote, backlash: backlashRoll, counter, shedAll, purify, placeDialog, age, suggest, rules: M };
}
