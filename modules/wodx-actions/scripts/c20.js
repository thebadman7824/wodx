/**
 * WoDX Actions 3.9 (Phase 6h): changelings of the later eras (Changeling 20th).
 *
 *   Arts and Realms      read from the sheet (Power items of the art and realms kinds), the sheet's Tempers (Glamour,
 *                        Banality, Nightmare, Willpower and its Imbalances); seeming, kith and antithesis in the fields
 *   Cast a cantrip       Art + the lowest primary Realm, Scene and Time, cheated Realms, Wyrd or chimerical, Nightmare
 *                        dice (and volunteering three), bunks; Nightmare from 10s and botches; Imbalance at 10
 *   Unleash              2 Glamour and a Nightmare, Glamour + Nightmare at 7, the four outcomes
 *   The Wyrd, the Autumn invoking either; a Banality trigger roll; the Mists for mortals
 *   Epiphany             Reverie, Rapture, Ravaging, Revelry, Rhapsody, sanctuary; a gained point can clear Banality
 *   Bedlam               spending an Imbalanced Willpower brings a threshold for as many scenes as Imbalances
 *   Cold iron            aggravated to both bodies through WoDX Combat, and a Glamour point a level
 *
 * Built by main.js with its helpers (ctx). Pure rules: c20-rules.js.
 */
import * as C from "./c20-rules.js";
import * as P from "./profiles.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REF = C.REF;
const keyOf = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, spendWillpower, notify } = ctx;

    function ratingsFrom(actor, kind) {
        const out = {};
        for (const i of actor?.items ?? []) {
            const t = String(i.system?.type ?? "");
            // Arts are Power items; the system keeps Realms as Trait items with a label key such as "wod.realms.actor"
            if (!(kind === "art" ? /types\.art$/.test(t) && i.type === "Power" : /types\.realms?$/.test(t) && (i.type === "Trait" || i.type === "Power"))) continue;
            const raw = String(i.system?.label || i.name || "");
            const k = keyOf(raw.includes(".") ? raw.split(".").pop() : raw).replace(/^dragons?ire$/, "dragonsire");
            out[k] = Math.max(out[k] ?? 0, n(i.system?.value));
        }
        return out;
    }
    function info(actor) {
        const s = actor.system ?? {}, a = s.advantages ?? {};
        const f = actor.getFlag(MOD, "c20") ?? {};
        const arts = { ...ratingsFrom(actor, "art"), ...(f.arts ?? {}) };
        const realms = { ...ratingsFrom(actor, "realm"), ...(f.realms ?? {}) };
        return { f, arts, realms, seeming: keyOf(s.seeming) || f.seeming || "", kith: s.kith || s.custom?.kith || "", antithesis: s.antithesis || "", threshold: s.threshold || "",
            glamour: { perm: n(a.glamour?.permanent), temp: n(a.glamour?.temporary) }, banality: { perm: n(a.banality?.permanent), temp: n(a.banality?.temporary) },
            nightmare: n(a.nightmare?.temporary), willpower: { perm: n(a.willpower?.permanent), temp: n(a.willpower?.temporary) }, imbalances: n(a.willpower?.imbalance),
            wyrd: n(f.wyrdUntil) > game.time.worldTime || (f.wyrdScene && f.wyrdScene === sceneKey()), closed: f.closed?.scene === sceneKey() ? f.closed : null,
            freehold: ctx.background?.(actor, "Holdings") ?? 0 };
    }
    const sceneKey = () => `${game.scenes?.viewed?.id ?? ""}:${Math.floor(game.time.worldTime / 3600)}`;
    const saveFlag = (actor, patch) => ctx.setFlag(actor, "c20", { ...(actor.getFlag(MOD, "c20") ?? {}), ...patch });
    const setT = (actor, upd) => updateActor(actor, upd);

    /** Nightmare (p. 275): add, roll over into an Imbalance with a Glamour point back. Returns a note. */
    async function nightmare(actor, k) {
        if (!k) return "";
        const i = info(actor);
        const r = C.addNightmare({ nightmare: i.nightmare, imbalances: i.imbalances, willpower: i.willpower.perm }, k);
        const upd = { "system.advantages.nightmare.temporary": r.nightmare, "system.advantages.willpower.imbalance": r.imbalances };
        if (r.glamourBack) upd["system.advantages.glamour.temporary"] = Math.min(i.glamour.perm, i.glamour.temp + 1);
        await setT(actor, upd);
        return r.glamourBack ? `Nightmare reaches 10: it clears and an Imbalance is marked (${r.imbalances}); +1 Glamour.${r.bedlam ? " Every Willpower box is Imbalanced: lost to Bedlam." : ""}`
            : `+${k} Nightmare (${r.nightmare}).`;
    }
    /** Banality points (pp. 174, 258): an 11th point becomes a dot. */
    async function banality(actor, k) {
        if (!k) return "";
        const i = info(actor);
        const r = C.addBanality({ rating: i.banality.perm, points: i.banality.temp }, k);
        await setT(actor, { "system.advantages.banality.temporary": r.points, "system.advantages.banality.permanent": r.rating });
        return r.newDot ? `Banality passes 10 points: a Banality dot (${r.rating}).${C.undone(r.rating) ? " Banality 10: Undone." : ""}` : `+${k} Banality (${r.points} points).`;
    }
    async function glamour(actor, delta) {
        const i = info(actor);
        const next = Math.max(0, Math.min(i.glamour.perm, i.glamour.temp + delta));
        if (delta < 0 && i.glamour.temp + delta < 0) { notify(`${actor.name} has ${i.glamour.temp} Glamour; this needs ${-delta}.`); return false; }
        await setT(actor, { "system.advantages.glamour.temporary": next });
        return true;
    }

    /** A Banality trigger (pp. 174, 269): Glamour at 8 (or the Storyteller's difficulty). */
    async function trigger(actor, { difficulty = 8, why = "" } = {}, postIt = true) {
        const i = info(actor);
        const r = await rollPool(i.glamour.perm, difficulty);
        const k = C.triggerOutcome(r);
        const note = await banality(actor, k);
        const body = rollBlock("Glamour against Banality", r, why ? [esc(why)] : []) + `<div class="vta-res ${k ? "bad" : "good"}">${k ? esc(note) : "The faerie soul holds."}</div><div class="wodx-quiet">${REF} pp. 173, 268–269</div>`;
        return postIt ? post(actor, `${actor.name}: a Banality trigger`, body, [r.roll].filter(Boolean)) : { body, roll: r.roll };
    }

    /* -------------------------------------------------------------- */

    const artOpts = (i, sel) => Object.entries(C.ARTS).map(([k, a]) => `<option value="${k}"${k === sel ? " selected" : ""}${!n(i.arts[k]) ? " disabled" : ""}>${esc(a.label)} ${n(i.arts[k])}</option>`).join("");
    const realmRow = (i, r) => `<div class="form-group"><label>${esc(C.REALMS[r].label)} <small>knows ${n(i.realms[r])}</small></label><select name="r-${r}" data-fixed><option value="0">not used</option>${C.REALMS[r].levels.map((l, k) => `<option value="${k + 1}">${k + 1}: ${esc(l)}${k + 1 > n(i.realms[r]) ? " (cheated)" : ""}</option>`).join("")}</select></div>`;

    async function cantrip(actor) {
        const i = info(actor);
        if (!Object.values(i.arts).some(v => v > 0)) notify(`${actor.name} has no Arts on the sheet: add them as Powers (Art).`);
        const content = `<form>
          <p><b>${esc(actor.name)}</b> — Glamour ${i.glamour.temp}/${i.glamour.perm}, Banality ${i.banality.perm} (${i.banality.temp}), Nightmare ${i.nightmare}${i.imbalances ? `, Imbalances ${i.imbalances}` : ""}${i.wyrd ? "; <b>the Wyrd is invoked</b>" : ""}.</p>
          <div class="form-group"><label>Art</label><select name="art" data-fixed>${artOpts(i)}</select></div>
          <div class="form-group"><label>The power's level</label><input type="number" name="lvl" min="1" max="5" value="1"/></div>
          <fieldset><legend>Realms</legend>${Object.keys(C.REALMS).map(r => realmRow(i, r)).join("")}</fieldset>
          <div class="form-group"><label><input type="checkbox" name="wyrd"${i.wyrd ? " checked" : ""}/> Wyrd (real in the waking world: 1 Glamour)</label></div>
          <fieldset><legend>Difficulty (base 8)</legend>
            <div class="form-group"><label>Target's Banality</label><input type="number" name="tb" min="0" max="10" value="0"/></div>
            <div class="form-group"><label>The place's Banality</label><input type="number" name="pb" min="0" max="10" value="0"/></div>
            <div class="form-group"><label><input type="checkbox" name="title"/> A changeling of higher Title, unwilling (+1)</label></div>
            <div class="form-group"><label><input type="checkbox" name="freehold"/> In a freehold (−1)</label></div>
            <div class="form-group"><label><input type="checkbox" name="ench"/> An enchanted mortal or kinain (−1)</label></div>
            <div class="form-group"><label><input type="checkbox" name="aff"/> The kith's affinity Realm (−1)</label></div>
            <div class="form-group"><label>Bunk (0 to 5)</label><input type="number" name="bunk" min="0" max="5" value="0"/></div>
            <div class="form-group"><label><input type="checkbox" name="vol"/> Three more Nightmare dice (−1)</label></div>
          </fieldset>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
        </form>`;
        return dialog(`Cast a cantrip — ${actor.name}`, content, "Cast", async fd => {
            if (i.closed?.all) { notify(`${actor.name} is cut off from the Dreaming for this scene.`); return null; }
            if (i.closed?.art === fd.art) { notify(`${C.ARTS[fd.art].label} is closed to ${actor.name} for this scene.`); return null; }
            if (i.f.leashUntil === sceneKey()) { notify(`${actor.name} is in Bedlam's grip: only Unleashing this scene.`); return null; }
            const used = Object.keys(C.REALMS).map(r => ({ realm: r, level: n(fd[`r-${r}`]) })).filter(u => u.level > 0);
            const plan = C.cantripPlan({ art: i.arts[fd.art], artLevel: n(fd.lvl), used, known: i.realms, nightmare: i.nightmare, wyrd: !!fd.wyrd, wyrdInvoked: i.wyrd },
                { targetBanality: n(fd.tb), placeBanality: n(fd.pb), higherTitle: !!fd.title, freehold: !!fd.freehold, enchanted: !!fd.ench, affinity: !!fd.aff, bunk: n(fd.bunk), volunteer: !!fd.vol });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (plan.cost && !(await glamour(actor, -plan.cost))) return null;
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp });
            const nmK = C.nightmareFrom(r.faces, plan.nightmareDice, r.botch);
            const nmNote = await nightmare(actor, nmK);
            const art = C.ARTS[fd.art];
            let body = rollBlock(`${esc(art.label)} ${i.arts[fd.art]} + Realm`, r, [...plan.notes, ...(plan.nightmareDice ? [`${plan.nightmareDice} Nightmare ${plan.nightmareDice === 1 ? "die" : "dice"} (the first ${plan.nightmareDice} shown)`] : []), ...(wp ? ["Willpower"] : [])]);
            body += r.botch ? `<div class="vta-big bad">The cantrip twists.</div>` : r.successes ? `<div class="vta-big good">${esc(art.label)} ${n(fd.lvl)}: ${r.successes} success${r.successes === 1 ? "" : "es"}.</div>` : `<div class="vta-big">The cantrip does not take.</div>`;
            if (used.length) body += `<div class="vta-res">Reaches ${used.map(u => `${esc(C.REALMS[u.realm].label)} ${u.level} (${esc(C.REALMS[u.realm].levels[u.level - 1])})`).join("; ")}.</div>`;
            if (nmNote) body += `<div class="vta-note">${esc(nmNote)}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 193–196, ${art.page}, 274</div>`;
            return post(actor, `${actor.name} weaves a cantrip`, body, [r.roll].filter(Boolean));
        }, { width: 540 });
    }

    async function unleash(actor) {
        const i = info(actor);
        const content = `<form><p><b>${esc(actor.name)}</b> — Glamour ${i.glamour.temp}/${i.glamour.perm}, Nightmare ${i.nightmare}. Unleashing costs 2 Glamour and a Nightmare; no Realm is needed.</p>
          <div class="form-group"><label>Art</label><select name="art" data-fixed>${artOpts(i)}</select></div>
          <div class="form-group stacked"><label>The intent, in a few words</label><input type="text" name="intent" value=""/></div></form>`;
        return dialog(`Unleash an Art — ${actor.name}`, content, "Unleash", async fd => {
            if (i.closed?.all || i.closed?.art === fd.art) { notify(`${actor.name} cannot Unleash that now (closed for the scene).`); return null; }
            const plan = C.unleashPlan({ glamour: i.glamour.perm, nightmare: i.nightmare, glamourPool: i.glamour.temp });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (!(await glamour(actor, -2))) return null;
            const pre = await nightmare(actor, 1);
            const now = info(actor);
            const r = await rollPool(now.glamour.perm + now.nightmare, 7);
            const out = C.unleashOutcome(r, i.arts[fd.art]);
            const art = C.ARTS[fd.art];
            let body = rollBlock(`Glamour ${now.glamour.perm} + Nightmare ${now.nightmare}`, r, [`${esc(pre)}`, fd.intent ? `intent: ${esc(String(fd.intent).slice(0, 120))}` : ""].filter(Boolean));
            const notes = [];
            if (out.result === "controlled") {
                await saveFlag(actor, { wyrdUntil: game.time.worldTime + now.glamour.perm * 6 });
                body += `<div class="vta-big good">${esc(art.label)} answers and obeys: the player narrates.</div><div class="vta-res">The Wyrd for ${now.glamour.perm} turns (a Willpower point keeps it for the scene); the mien shows.</div>`;
            } else if (out.result === "wild") {
                notes.push(await nightmare(actor, 1));
                await saveFlag(actor, { wyrdScene: sceneKey() });
                body += `<div class="vta-big bad">The intent comes twisted: the Storyteller narrates, with a complication.</div><div class="vta-res">The Wyrd for the scene.</div>`;
            } else if (out.result === "failed") {
                await saveFlag(actor, { closed: { scene: sceneKey(), art: fd.art } });
                const t = await trigger(actor, { why: "a failed Unleashing" }, false);
                body += `<div class="vta-big">Nothing breaks through. ${esc(art.label)} is closed for the scene.</div>${t.body}`;
            } else {
                await setT(actor, { "system.advantages.willpower.imbalance": now.imbalances + 1 });
                await saveFlag(actor, { closed: { scene: sceneKey(), all: true } });
                const t = await trigger(actor, { why: "Banality answers the breach" }, false);
                body += `<div class="vta-big bad">Havoc for a turn: the Dreaming floods through. An Imbalance is marked (${now.imbalances + 1}); no Glamour or Arts for the scene.</div>${t.body}`;
            }
            if (notes.filter(Boolean).length) body += `<div class="vta-note">${notes.filter(Boolean).map(esc).join(" ")}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 196–197, ${art.page}</div>`;
            return post(actor, `${actor.name} Unleashes ${art.label}`, body, [r.roll].filter(Boolean));
        });
    }

    async function invoke(actor) {
        const i = info(actor);
        const content = `<form><div class="form-group"><label>Invoke</label><select name="k" data-fixed>
            <option value="wyrd">The Wyrd (1 Glamour, 1 Willpower; Glamour against Banality)</option>
            <option value="autumn">The Autumn (1 Willpower; chimerical effects pass by for an action; a Banality trigger)</option></select></div>
          <div class="form-group"><label>The place's Banality</label><input type="number" name="pb" min="0" max="10" value="5"/></div></form>`;
        return dialog(`Invoke — ${actor.name}`, content, "Invoke", async fd => {
            if (fd.k === "autumn") {
                if (!(await spendWillpower(actor, 1))) return null;
                const t = await trigger(actor, { why: "invoking the Autumn" }, false);
                return post(actor, `${actor.name} invokes the Autumn`, `<div class="vta-res">For one action no chimerical effect touches ${esc(actor.name)}; Wyrd effects still do.</div>${t.body}<div class="wodx-quiet">${REF} p. 271</div>`, [t.roll].filter(Boolean));
            }
            if (i.glamour.temp < 1) return notify(`${actor.name} has no Glamour to spend.`);
            if (!(await spendWillpower(actor, 1))) return null;
            await glamour(actor, -1);
            const diff = C.wyrdDifficulty(n(fd.pb), i.banality.perm);
            const r = await rollPool(i.glamour.perm, diff);
            let body = rollBlock("Glamour", r, [`difficulty: the higher Banality (${diff})`]);
            if (r.successes && !r.botch) { await saveFlag(actor, { wyrdScene: sceneKey() }); body += `<div class="vta-big good">The Wyrd for the scene.</div><div class="vta-res">${C.WYRD_EFFECTS.map(esc).join("; ")}.</div>`; }
            else { const note = await banality(actor, r.botch ? Math.max(1, r.ones) : 0); body += r.botch ? `<div class="vta-big bad">${esc(note)}</div>` : `<div class="vta-big">The Wyrd will not come.</div>${(await trigger(actor, { why: "a failed Wyrd" }, false)).body}`; }
            body += `<div class="wodx-quiet">${REF} p. 259</div>`;
            return post(actor, `${actor.name} invokes the Wyrd`, body, [r.roll].filter(Boolean));
        });
    }

    async function triggerDialog(actor) {
        const i = info(actor);
        const S = C.SEEMINGS[i.seeming];
        const content = `<form><div class="form-group stacked"><label>What triggers it</label><input type="text" name="why" value=""/></div>
          <div class="form-group"><label>Difficulty (8; higher for severe)</label><input type="number" name="d" min="8" max="10" value="8"/></div>
          <div class="form-group"><label><input type="checkbox" name="auto"/> So egregious it is automatic (+1 Banality)</label></div>
          <p class="wodx-quiet">${S ? `${esc(S.label)}: also ${esc(S.trigger)}; immune to ${esc(S.immunity)}.` : ""}${i.antithesis ? ` Antithesis: ${esc(i.antithesis)}.` : ""}</p></form>`;
        return dialog(`Banality trigger — ${actor.name}`, content, "Roll", async fd => {
            if (fd.auto) return post(actor, `${actor.name}: Banality`, `<div class="vta-res bad">${esc(await banality(actor, 1))}</div>`);
            return trigger(actor, { difficulty: n(fd.d) || 8, why: fd.why });
        });
    }

    async function epiphany(actor) {
        const i = info(actor);
        const content = `<form><div class="form-group"><label>The path</label><select name="k" data-fixed>
            <option value="reverie">Reverie: inspire a Dreamer (Manipulation + Ability, 6)</option>
            <option value="rapture">Rapture: self-inspiration (Attribute + Ability, Banality − Glamour + 6)</option>
            <option value="ravaging">Ravaging: theft (Banality dice, 6)</option>
            <option value="revelry">Revelry: the kith's own (once a story; fills Glamour)</option>
            <option value="rhapsody">Rhapsody: forbidden (Manipulation + Expression + Glamour invested, 7)</option>
            <option value="sanctuary">Sanctuary: a night by a freehold's balefire</option></select></div>
          <div class="form-group"><label>Dice from the Attribute and Ability (Reverie, Rapture, Rhapsody)</label><input type="number" name="dice" min="0" max="15" value="5"/></div>
          <div class="form-group"><label><input type="checkbox" name="thr"/> Following the Musing or Ravaging Threshold</label></div>
          <div class="form-group"><label>Glamour invested (Rhapsody, 1–5)</label><input type="number" name="inv" min="1" max="5" value="1"/></div>
          <div class="form-group"><label>Freehold rating and sleepers (Sanctuary)</label><input type="number" name="fr" min="0" max="10" value="${i.freehold || 2}"/><input type="number" name="sl" min="1" max="12" value="1"/></div>
          <div class="form-group"><label><input type="checkbox" name="imb"/> Heal an Imbalance instead of taking Glamour</label></div>
          <div class="form-group"><label><input type="checkbox" name="clear"/> Spend the Glamour gained on Banality points instead</label></div></form>`;
        return dialog(`Epiphany — ${actor.name}`, content, "Seek it", async fd => {
            const k = fd.k;
            let r = null, out, body = "";
            if (k === "revelry") out = C.epiphany("revelry");
            else if (k === "sanctuary") out = { glamour: C.sanctuary(n(fd.fr), n(fd.sl)) };
            else {
                if (k === "rhapsody" && !(await glamour(actor, -Math.max(1, n(fd.inv))))) return null;
                const dice = k === "ravaging" ? i.banality.perm : n(fd.dice) + (k === "rhapsody" ? n(fd.inv) : 0);
                const diff = k === "rapture" ? C.raptureDifficulty(i.banality.perm, i.glamour.perm) : k === "rhapsody" ? 7 : 6;
                r = await rollPool(dice, diff);
                out = C.epiphany(k, r, { threshold: !!fd.thr, invested: n(fd.inv) });
                body += rollBlock({ reverie: "Reverie", rapture: "Rapture", ravaging: "Ravaging (Banality)", rhapsody: "Rhapsody (the artist)" }[k], r);
            }
            const notes = [];
            let gained = out.refill ? Math.max(0, i.glamour.perm - i.glamour.temp) : n(out.glamour);
            if (out.dot) { await setT(actor, { "system.advantages.glamour.permanent": Math.min(10, i.glamour.perm + 1) }); notes.push("+1 Glamour dot"); }
            const okEpiphany = (gained > 0 || out.refill || out.dot) && k !== "rhapsody";
            if (fd.imb && okEpiphany && i.imbalances > 0) { await setT(actor, { "system.advantages.willpower.imbalance": i.imbalances - 1 }); notes.push("one Imbalance healed instead of Glamour"); gained = 0; }
            if (fd.clear && gained) { const k2 = Math.min(gained, i.banality.temp); if (k2) await setT(actor, { "system.advantages.banality.temporary": i.banality.temp - k2 }); notes.push(`${k2} Banality point${k2 === 1 ? "" : "s"} cleared`); gained -= k2; }
            if (gained) { const now = info(actor); await setT(actor, { "system.advantages.glamour.temporary": Math.min(now.glamour.perm, now.glamour.temp + gained) }); notes.push(`+${gained} Glamour`); }
            if (out.refill && !gained && !fd.imb && !fd.clear) notes.push("the Glamour pool is full");
            if (out.banality) notes.push(await banality(actor, out.banality));
            if (out.banalityDot) { await setT(actor, { "system.advantages.banality.permanent": Math.min(10, i.banality.perm + 1) }); notes.push("the Ravaging backfires: +1 Banality dot"); }
            if (out.masterpiece) notes.push(`a masterpiece holding ${out.masterpiece} Glamour, ${esc(out.note)}`);
            if (out.blockedMonths) notes.push(`the artist cannot finish anything for ${out.blockedMonths} month${out.blockedMonths === 1 ? "" : "s"}`);
            if (out.artistBanalityDots) notes.push(`the artist gains ${out.artistBanalityDots} Banality dot${out.artistBanalityDots === 1 ? "" : "s"}`);
            if (out.note && !out.masterpiece) notes.push(out.note);
            if (out.trigger) body += (await trigger(actor, { why: k === "ravaging" ? "Ravaging a mortal" : "Rhapsody" }, false)).body;
            body += `<div class="vta-res">${notes.filter(Boolean).map(esc).join("; ") || "Nothing gained."}</div><div class="wodx-quiet">${REF} pp. 173, 259–264</div>`;
            return post(actor, `${actor.name}: ${k === "sanctuary" ? "Sanctuary" : `Epiphany (${k})`}`, body, r ? [r.roll].filter(Boolean) : []);
        });
    }

    async function bedlam(actor) {
        const i = info(actor);
        const content = `<form><p><b>${esc(actor.name)}</b> — Willpower ${i.willpower.temp}/${i.willpower.perm}, Imbalances ${i.imbalances}, Nightmare ${i.nightmare}.</p>
          <div class="form-group"><label>Do</label><select name="k" data-fixed><option value="spend">Spend an Imbalanced Willpower</option><option value="nm">Add Nightmare by hand</option></select></div>
          <div class="form-group"><label>The threshold (the Storyteller's pick)</label><select name="t" data-fixed>${Object.entries(C.BEDLAM).map(([k, t]) => `<option value="${k}">${esc(t.split(":")[0])}</option>`).join("")}</select></div>
          <div class="form-group"><label>Nightmare to add</label><input type="number" name="nm" min="1" max="10" value="1"/></div></form>`;
        return dialog(`Nightmare and Bedlam — ${actor.name}`, content, "Do it", async fd => {
            if (fd.k === "nm") return post(actor, `${actor.name}: Nightmare`, `<div class="vta-res">${esc(await nightmare(actor, n(fd.nm)))}</div><div class="wodx-quiet">${REF} p. 274</div>`);
            if (!C.spendIsImbalanced({ temp: i.willpower.temp, perm: i.willpower.perm, imbalances: i.imbalances })) notify(`${actor.name}'s next Willpower point is not an Imbalanced one; spending it anyway.`);
            if (!(await spendWillpower(actor, 1))) return null;
            const scenes = Math.max(1, i.imbalances);
            let extra = "";
            if (fd.t === "self") { await saveFlag(actor, { wyrdScene: sceneKey() }); extra = await nightmare(actor, 2); }
            if (fd.t === "drowning") await setT(actor, { "system.advantages.glamour.temporary": i.glamour.perm });
            if (fd.t === "leash") await saveFlag(actor, { leashUntil: sceneKey() });
            return post(actor, `${actor.name}: a Bedlam Threshold`, `<div class="vta-big bad">${esc(C.BEDLAM[fd.t])}</div><div class="vta-res">For ${scenes} scene${scenes === 1 ? "" : "s"} (one per Imbalance). Invoking the Autumn eases it for a scene.${extra ? ` ${esc(extra)}` : ""}</div><div class="wodx-quiet">${REF} pp. 274, 294–295</div>`);
        });
    }

    async function coldIron(actor) {
        return dialog(`Cold iron — ${actor.name}`, `<form><div class="form-group"><label>Levels after soak</label><input type="number" name="k" min="1" max="10" value="1"/></div>
          <p class="wodx-quiet">Aggravated to the physical and chimerical bodies at once, and a Glamour point a level (pp. 290–291).</p></form>`, "Apply", async fd => {
            const k = Math.max(1, n(fd.k)), i = info(actor);
            const r = await game.wodxCombat?.applyDamage?.(actor, "aggravated", k);
            const ch = actor.system?.health?.damage?.chimerical;
            if (ch) await setT(actor, { "system.health.damage.chimerical.aggravated": n(ch.aggravated) + k });
            const lost = Math.min(i.glamour.temp, k);
            if (lost) await setT(actor, { "system.advantages.glamour.temporary": i.glamour.temp - lost });
            return post(actor, `Cold iron: ${actor.name}`, `<div class="vta-big bad">${k} aggravated level${k === 1 ? "" : "s"} to both bodies; −${lost} Glamour.</div>${r?.woundLabel ? `<div class="vta-res">Now ${esc(r.woundLabel)}.</div>` : ""}<div class="wodx-quiet">${REF} pp. 290–291</div>`);
        });
    }

    async function mists(actor) {
        const content = `<form><div class="form-group"><label>The mortal's Banality</label><input type="number" name="b" min="0" max="10" value="6"/></div>
          <div class="form-group"><label><input type="checkbox" name="kithain"/> Other changelings were there (two steps lower, for a changeling's own memory)</label></div></form>`;
        return dialog("The Mists", content, "Read", async fd => {
            const b = Math.max(0, n(fd.b) - (fd.kithain ? 2 : 0));
            const m = C.mistsFor(b);
            return post(actor, "The Mists", `<div class="vta-res">Banality ${b}: ${m.time ? `within ${esc(m.time)}, ` : ""}${esc(m.effect)}.</div><div class="wodx-quiet">${REF} pp. 269–270</div>`);
        });
    }

    return { info, cantrip, unleash, invoke, trigger: triggerDialog, epiphany, bedlam, coldIron, mists, nightmare, banality, rules: C };
}
