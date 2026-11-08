/**
 * WoDX Actions 3.4 — the imbued of Hunter: The Reckoning (1999 on, B42): creed and Virtues, Conviction (spent for
 * second sight and self-control, risked on edges, regained, cashed in at 10), edges from the WoDX edge list,
 * derangements at Virtue 7 and above, and the Imbuing (modern only). Pure rules: reckoning-rules.js.
 */

import * as K from "./reckoning-rules.js";
import * as P from "./profiles.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, attr, findAbility, updateActor } = ctx;
    const sceneKey = () => `${canvas?.scene?.id ?? "none"}:${n(game.settings.get(MOD, "wraithScene"))}`;
    const sessionKey = () => game.settings.get(MOD, "sessionId") || "";

    function info(actor) {
        const s = actor.system ?? {}, v = s.advantages?.virtues ?? {};
        const f = actor.getFlag(MOD, "imbued") ?? {};
        const creedKey = f.creed ?? Object.keys(K.CREEDS).find(k => String(s.creed ?? "").toLowerCase().includes(k)) ?? "";
        const conv = P.resource(actor, "conviction");
        return {
            creed: creedKey, creedDef: K.CREEDS[creedKey] ?? null,
            primary: K.CREEDS[creedKey]?.virtue ?? (String(s.primaryvirtue ?? "").toLowerCase().match(/mercy|vision|zeal/)?.[0] ?? "zeal"),
            virtues: { mercy: n(v.mercy?.permanent), vision: n(v.vision?.permanent), zeal: n(v.zeal?.permanent) },
            conviction: conv.ok ? conv.value : n(f.conviction), convOnSheet: conv.ok,
            edges: [...actor.items].filter(i => i.type === "Power" && /edge/.test(i.system?.type ?? "")).map(i => ({ id: i.id, name: i.name, def: K.edgeFor(i.name) })),
            f
        };
    }
    async function setImbued(actor, patch) { return ctx.setFlag(actor, "imbued", { ...(actor.getFlag(MOD, "imbued") ?? {}), ...patch }); }
    async function setConviction(actor, to) {
        const i = info(actor), v = Math.max(0, Math.min(10, n(to)));
        if (i.convOnSheet) await P.adjust(actor, "conviction", v - i.conviction, { note: false });
        else await setImbued(actor, { conviction: v });
        if (v === 10 && i.conviction < 10) await post(actor, `${actor.name}: Conviction 10`, `<div class="vta-note">Conviction is full: it can be cashed in for a Virtue point (no Virtue above the primary one; Hunter: The Reckoning p. 139). Use <b>Hunter traits</b>.</div>`);
        return v;
    }

    /* ---------------- the sheet: creed, Virtues, cash-in, derangements ---------------- */

    async function sheet(actor) {
        const i = info(actor);
        const content = `<form><p><b>${esc(actor.name)}</b>: ${esc(i.creedDef?.label ?? "no creed")} · Mercy ${i.virtues.mercy}, Vision ${i.virtues.vision}, Zeal ${i.virtues.zeal} · Conviction ${i.conviction}. Hunter: The Reckoning (1999 on).</p>
          <div class="form-group"><label>Creed</label><select name="creed" data-fixed><option value="">—</option>${Object.entries(K.CREEDS).map(([k, c]) => `<option value="${k}" ${k === i.creed ? "selected" : ""}>${esc(c.label)} (${cap(c.virtue)}, Conviction ${c.conviction})</option>`).join("")}</select></div>
          <div class="form-group"><label>What</label><select name="k" data-fixed><option value="save">Save the creed</option><option value="cash" ${i.conviction >= 10 ? "" : "disabled"}>Cash in 10 Conviction for a Virtue point</option><option value="story">A new story: Conviction back to the creed's level</option><option value="gain">Gain 1 Conviction (a feat, the creed, or a convert; once a session each)</option></select></div>
          <div class="form-group"><label>Virtue (cash-in) / reason (gain)</label><select name="virtue" data-fixed>${K.VIRTUES.map(v => `<option value="${v}">${cap(v)}</option>`).join("")}</select> <select name="why" data-fixed><option value="feat">An amazing or inventive feat</option><option value="creed">The creed fulfilled dramatically</option><option value="convert">A hunter of another creed won over</option></select></div></form>`;
        return dialog(`Hunter traits: ${actor.name}`, content, "Go", async fd => {
            if (fd.creed && fd.creed !== i.creed) {
                await setImbued(actor, { creed: fd.creed });
                if (actor.system && "creed" in actor.system) await updateActor(actor, { "system.creed": K.CREEDS[fd.creed].label, "system.primaryvirtue": K.CREEDS[fd.creed].virtue });
            }
            const j = info(actor);
            if (fd.k === "cash") {
                const nv = K.maxOut(j.virtues, j.primary, fd.virtue);
                if (!nv) return ctx.notify(`No Virtue may pass the primary one (${cap(j.primary)} ${j.virtues[j.primary]}).`);
                await updateActor(actor, { [`system.advantages.virtues.${fd.virtue}.permanent`]: nv[fd.virtue] });
                await setConviction(actor, 0);
                const d = K.derangementsDue(j.virtues[fd.virtue], nv[fd.virtue]);
                return post(actor, `${actor.name} grows stronger`, `<div class="vta-res good">${cap(fd.virtue)} ${j.virtues[fd.virtue]} → ${nv[fd.virtue]}; Conviction spent.</div>${d ? `<div class="vta-warn">${cap(fd.virtue)} ${nv[fd.virtue]}: the Storyteller assigns a derangement fitting the hunter and the Virtue (p. 131).</div>` : ""}<div class="wodx-quiet">Hunter: The Reckoning p. 139</div>`);
            }
            if (fd.k === "story") {
                const start = j.creedDef?.conviction ?? 3;
                if (j.conviction < start) await setConviction(actor, start);
                return post(actor, `${actor.name}: a new story`, `<div class="vta-note">Conviction ${Math.max(j.conviction, start)} (the ${esc(j.creedDef?.label ?? "creed")}'s starting level, p. 138).</div>`);
            }
            if (fd.k === "gain") {
                const used = j.f.gained ?? {};
                if (sessionKey() && used[fd.why] === sessionKey()) return ctx.notify("Once a session for that reason (p. 139).");
                await setImbued(actor, { gained: { ...used, [fd.why]: sessionKey() || String(game.time.worldTime) } });
                const to = await setConviction(actor, j.conviction + 1);
                return post(actor, `${actor.name}: Conviction`, `<div class="vta-res good">Conviction ${j.conviction} → ${to}.</div>`);
            }
            return post(actor, `${actor.name}`, `<div class="vta-note">Creed: ${esc(K.CREEDS[fd.creed]?.label ?? "none")}.</div>`);
        });
    }

    /* ---------------- second sight ---------------- */

    async function secondSight(actor) {
        const i = info(actor), active = actor.getFlag(MOD, "sightScene") === sceneKey();
        const content = `<form><p><b>${esc(actor.name)}</b>: Conviction ${i.conviction}${active ? "; <b>second sight is active this scene</b>" : ""}. One Conviction point gives second sight and self-control for the scene (p. 132).</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed><option value="spend">Spend 1 Conviction: second sight and self-control</option><option value="react">React to a warning sign (Attribute + primary Virtue, 6)</option><option value="prerogative">Against a mighty foe (primary Virtue, Storyteller)</option></select></div>
          <div class="form-group"><label>Attribute (reaction)</label><select name="attr" data-fixed>${K.REACT.attrs.map(a => `<option value="${a}">${cap(a)}</option>`).join("")}</select> <label>foe</label> <select name="foe" data-fixed><option value="powerful">Powerful (6)</option><option value="mighty">Mighty (7)</option><option value="titanic">Titanic (8)</option></select></div></form>`;
        return dialog(`Second sight: ${actor.name}`, content, "Go", async fd => {
            if (fd.k === "spend") {
                if (active) return ctx.notify("Already active this scene.");
                if (i.conviction < 1) return ctx.notify("No Conviction: the hunter faces the night as anyone would (p. 132).");
                await setConviction(actor, i.conviction - 1);
                await actor.setFlag(MOD, "sightScene", sceneKey());
                return post(actor, `${actor.name}: second sight`, `<div class="vta-note">For the scene: hidden supernatural beings show as inhuman, spirits look solid, possessors show over their hosts; supernatural fear and mind, emotion or body control fail against the hunter (pp. 132–134).</div>`);
            }
            if (fd.k === "react") {
                const r = await rollPool(attr(actor, fd.attr) + i.virtues[i.primary], K.REACT.difficulty);
                return post(actor, `${actor.name} reacts`, rollBlock(`${cap(fd.attr)} + ${cap(i.primary)}`, r) + `<div class="vta-res">${r.successes > 0 && !r.botch ? "In time: Conviction can be spent now." : "Missed: no Conviction in time."}</div><div class="wodx-quiet">p. 133</div>`, [r.roll]);
            }
            const r = await rollPool(i.virtues[i.primary], K.PREROGATIVE[fd.foe]);
            return post(actor, `${actor.name} against a mighty foe`, rollBlock(`${cap(i.primary)}`, r) + `<div class="vta-res ${r.successes > 0 && !r.botch ? "good" : "bad"}">${r.botch ? "A botch: helpless against it for the scene." : r.successes > 0 ? "Second sight and protection work against it." : "It is beyond the hunter this scene."}</div><div class="wodx-quiet">pp. 135–136</div>`, [r.roll]);
        });
    }

    /* ---------------- edges ---------------- */

    async function useEdge(actor) {
        const i = info(actor);
        const known = i.edges.filter(e => e.def);
        const list = known.length ? known.map(e => e.def) : K.EDGES.filter(e => K.edgeAllowed(e, i.virtues));
        if (!list.length) return ctx.notify(`${actor.name} has no edges (sheet or Virtues).`);
        const tgt = [...(game.user.targets ?? [])][0]?.actor ?? null;
        const risked = actor.getFlag(MOD, "riskScene") === sceneKey();
        const lethal = n(actor.system?.health?.damage?.lethal);
        const content = `<form><p><b>${esc(actor.name)}</b>: Conviction ${i.conviction}; Mercy ${i.virtues.mercy}, Vision ${i.virtues.vision}, Zeal ${i.virtues.zeal}${tgt ? `; target ${esc(tgt.name)}` : ""}.${known.length ? "" : " <i>No edges on the sheet: the list shows what the Virtues allow.</i>"}</p>
          <div class="form-group"><label>Edge</label>${searchBox("select[name=edge]", "Search edges…", "Search edges")}<select name="edge">${list.map(e => `<option value="${e.id}">${esc(`${e.name} (${K.PATHS[e.path].label} ${"•".repeat(e.level)})`)}</option>`).join("")}</select></div>
          <div class="wodx-edge-info vta-note"></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"/> <label>bonus dice</label> <input type="number" name="bonus" value="0" style="width:4em"/></div>
          <div class="form-group"><label>Conviction to risk (once a scene)</label><input type="number" name="risk" value="0" min="0" max="${i.conviction}" ${risked ? "disabled" : ""}/> ${risked ? "<i>already risked this scene</i>" : ""} <label>Storyteller's award on success</label> <select name="award" data-fixed><option>1</option><option>2</option><option>3</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="resisted"/> A resisted roll</label> <label><input type="checkbox" name="won"/> and the hunter won it</label></div></form>`;
        const describe = root => {
            const e = K.edgeFor(root.querySelector("[name=edge]").value);
            if (!e) return;
            const d = K.edgeDifficulty(e, { t: tgt ? { stamina: attr(tgt, "stamina") } : null, lethal });
            if (d !== null) root.querySelector("[name=diff]").value = d;
            const pool = e.roll ? `${e.roll[0] ? `${cap(e.roll[0])} + ` : ""}${cap(e.roll[1])}` : "no roll";
            root.querySelector(".wodx-edge-info").innerHTML = `<b>${esc(e.name)}</b> · ${pool}${typeof e.diff === "number" ? ` at ${e.diff}` : e.diff ? " (difficulty from the target or the page)" : ""}${e.conviction ? ` · ${e.conviction} Conviction` : ""} · p. ${e.p}<br>${esc(e.e)}${K.edgeAllowed(e, i.virtues) ? "" : `<br><b>${cap(e.virtue)} ${i.virtues[e.virtue]} is below this edge's level.</b>`}`;
        };
        return dialog(`Use an edge: ${actor.name}`, content, "Use", async fd => {
            const e = K.edgeFor(fd.edge);
            if (!e) return null;
            const risk = risked || e.id === "surge" ? 0 : Math.min(n(fd.risk), Math.max(0, i.conviction - e.conviction));
            if (e.conviction > i.conviction) return ctx.notify(`${e.name} needs ${e.conviction} Conviction (${i.conviction} left).`);
            let conv = i.conviction - e.conviction - risk;
            await setConviction(actor, conv);
            if (!e.roll) return post(actor, `${actor.name}: ${esc(e.name)}`, `<div class="vta-note">${e.conviction ? `${e.conviction} Conviction. ` : ""}${esc(e.e)}</div><div class="wodx-quiet">Hunter: The Reckoning p. ${e.p}</div>`);
            const [a, v] = e.roll;
            const stat = k => (ATTR.includes(k) ? attr(actor, k) : K.VIRTUES.includes(k) ? i.virtues[k] : (findAbility(actor, k)?.value ?? 0));
            const dice = (a ? stat(a) : 0) + stat(v) + risk + n(fd.bonus);
            const r = await rollPool(dice, fd.diff);
            let body = rollBlock(`${a ? `${cap(a)} + ` : ""}${cap(v)}${risk ? ` + ${risk} risked` : ""}`, r, [e.conviction ? `${e.conviction} Conviction` : ""].filter(Boolean));
            if (risk) {
                await actor.setFlag(MOD, "riskScene", sceneKey());
                const ok = !r.botch && r.successes > 0 && (!fd.resisted || fd.won);
                const R = K.risk(conv + risk, risk, ok ? { successes: 1, botch: false } : { successes: 0, botch: !!r.botch }, { bonus: n(fd.award) });
                await setConviction(actor, R.after);
                body += `<div class="vta-res ${ok ? "good" : "bad"}">Risked ${risk}: Conviction ${conv + risk} → ${R.after}${R.lostAll ? " (a botch: all of it lost)" : ""}. A success counts only if the edge achieves something (p. 137).</div>`;
            }
            body += `<div class="vta-note">${esc(e.e)}</div><div class="wodx-quiet">Hunter: The Reckoning p. ${e.p}</div>`;
            return post(actor, `${actor.name}: ${esc(e.name)}`, body, [r.roll]);
        }, { width: 560, render: root => { describe(root); root.querySelector("[name=edge]")?.addEventListener("change", () => describe(root)); } });
    }

    /* ---------------- the Imbuing (modern only) ---------------- */

    async function imbue(actor) {
        if (!game.user.isGM) return ctx.notify("The Storyteller runs the Imbuing.");
        if (ctx.line?.() && ctx.line() !== "reckoning") return ctx.notify("The Imbuing belongs to 1999 and after (B42): this chronicle's era uses other hunter rules.");
        const content = `<form><p>The Imbuing of <b>${esc(actor.name)}</b> (Hunter: The Reckoning p. 84): Virtues ${K.IMBUE.virtues} points by creed, Willpower ${K.IMBUE.willpower}, Conviction by creed; an edge for each Virtue point, at most the Virtue's level.${actor.type === "Hunter" ? "" : " A new Hunter sheet is made from this one; the mortal sheet stays as it is."}</p>
          <div class="form-group"><label>Creed</label><select name="creed" data-fixed>${Object.entries(K.CREEDS).map(([k, c]) => `<option value="${k}">${esc(c.label)} (${cap(c.virtue)})</option>`).join("")}</select></div>
          <div class="form-group"><label>Mercy / Vision / Zeal</label><input type="number" name="mercy" value="0" min="0" max="3" style="width:4em"/> <input type="number" name="vision" value="0" min="0" max="3" style="width:4em"/> <input type="number" name="zeal" value="3" min="0" max="3" style="width:4em"/></div>
          <p>Edges (one per Virtue point):</p><div class="wodx-edge-picks" style="max-height:220px;overflow-y:auto;columns:2">${K.EDGES.map(e => `<label style="display:block"><input type="checkbox" name="edge_${e.id}"/> ${esc(`${e.name} (${K.PATHS[e.path].label} ${e.level}, ${cap(e.virtue)})`)}</label>`).join("")}</div></form>`;
        return dialog("The Imbuing", content, "Imbue", async fd => {
            const v = { mercy: n(fd.mercy), vision: n(fd.vision), zeal: n(fd.zeal) };
            const bad = K.imbueCheck(fd.creed, v);
            if (bad) return ctx.notify(bad);
            const picks = K.EDGES.filter(e => fd[`edge_${e.id}`]);
            for (const k of K.VIRTUES) {
                const mine = picks.filter(e => e.virtue === k);
                if (mine.length !== v[k] || mine.some(e => e.level > v[k])) return ctx.notify(`${cap(k)} ${v[k]}: pick ${v[k]} ${cap(k)} edge${v[k] === 1 ? "" : "s"} of level ${v[k]} or lower.`);
            }
            const c = K.CREEDS[fd.creed];
            let hunter = actor;
            if (actor.type !== "Hunter") {
                const src = actor.toObject();
                hunter = await Actor.create({ name: actor.name, type: "Hunter", img: src.img, prototypeToken: src.prototypeToken,
                    system: { attributes: src.system?.attributes, abilities: src.system?.abilities },
                    items: (src.items ?? []).filter(i => i.type !== "Advantage"), flags: { [MOD]: { imbuedFrom: actor.uuid } } });
                await actor.setFlag(MOD, "imbuedAs", hunter.uuid);
            }
            await hunter.update({ "system.creed": c.label, "system.primaryvirtue": c.virtue,
                "system.advantages.virtues.mercy.permanent": v.mercy, "system.advantages.virtues.vision.permanent": v.vision, "system.advantages.virtues.zeal.permanent": v.zeal,
                "system.advantages.conviction.permanent": c.conviction, "system.advantages.conviction.temporary": c.conviction,
                "system.advantages.willpower.permanent": Math.max(K.IMBUE.willpower, n(actor.system?.advantages?.willpower?.permanent)),
                "system.advantages.willpower.temporary": Math.max(K.IMBUE.willpower, n(actor.system?.advantages?.willpower?.permanent)),
                "system.settings.hasedges": true });
            await hunter.createEmbeddedDocuments("Item", picks.map(e => ({ name: e.name, type: "Power", system: { type: "wod.types.edge", value: e.level, description: `${K.PATHS[e.path].label} ${e.level}: ${e.e} (Hunter: The Reckoning p. ${e.p})` } })));
            await hunter.setFlag(MOD, "imbued", { creed: fd.creed, at: game.time.worldTime });
            await ctx.logEvent?.(hunter, `Imbued: a ${c.label}.`, "imbuing");
            return post(hunter, `${hunter.name} is imbued`, `<div class="vta-sec">${esc(c.label)} · Mercy ${v.mercy}, Vision ${v.vision}, Zeal ${v.zeal} · Conviction ${c.conviction} · edges: ${picks.map(e => esc(e.name)).join(", ")}</div>${hunter !== actor ? `<div class="vta-note">A new Hunter sheet; the mortal sheet is kept and linked.</div>` : ""}<div class="wodx-quiet">Hunter: The Reckoning p. 84</div>`);
        }, { width: 560 });
    }

    return { info, sheet, secondSight, useEdge, imbue, setConviction };
}
