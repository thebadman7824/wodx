/**
 * WoDX NPC (B3590-B3596): day jobs for a character's mortal agents. Rules in day-jobs-rules.mjs.
 *
 * The Day jobs window, opened from the Followers window or api.openDayJobs(actor): pick the agent (a follower who
 * serves the character, or a dot of Allies, Contacts, Retainers or Influence from the sheet), the job, the power of
 * the age it works through, the place and, if the player wants, the faction it is aimed at. The job becomes a long
 * task on WoDX Storyteller's clock: on the follower's own sheet (its tokens leave the map while it works), or on the
 * master's sheet for a Background dot (Manipulation + the dots). A player's request goes by socket to the active
 * Storyteller. When the task ends a card says how it went, and the faction holding the sphere reacts: a lost dot of
 * Influence through the approval queue, a worse regard for the master, or a breach for a body found.
 * Stored on the actor carrying the task: flags.wodx-npc.dayJobs.<taskId> = {job, channel, sphere, scene, place,
 * master, faction, agent}. Hook out: wodxDayJobDone {master, agent, job, status, faction}.
 */
import * as J from "./day-jobs-rules.mjs";
import * as F from "./faction-rules.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, chron, factions, followers} = ctx;
  const SOCKET = `module.${MOD}`;
  const ST = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
  const all = c => (c ? [...(c.contents ?? c)] : []);
  const opt = (v, t, sel = false) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
  const worldOf = a => { const x = a?.actor ?? a; return x?.id ? (game.actors.get(x.id) ?? x) : null; };
  const faithAt = scene => {
    let region = null;
    try { region = chron()?.world?.here?.(scene)?.id ?? chron()?.world?.homeland?.() ?? null; } catch (e) { region = null; }
    try { return faithFor(region ?? "moravia", yearNow()) ?? "western"; } catch (e) { return "western"; }
  };
  const bgDots = (a, re) => all(a?.items).filter(i => /background/i.test(String(i.type ?? "") + String(i.system?.type ?? "")) && re.test(String(i.name ?? "").trim()))
    .reduce((n, i) => n + (Number(i.system?.value) || 0), 0);

  /** The agents a master can send: followers who serve them, and Background dots on the sheet. */
  function agentsOf(master) {
    const out = [];
    for ( const r of followers.rowsFor(master) ?? [] ) if ( ["ally", "retainer", "contact", "ghoul", "herd", "follower"].includes(r.kind) ) out.push({key: `npc:${r.id}`, kind: r.kind === "follower" ? "retainer" : r.kind, id: r.id, label: `${r.name} (${r.kindLabel ?? r.kind})`});
    for ( const [kind, re] of Object.entries(J.BACKGROUND_AGENTS) ) { const d = bgDots(master, re); if ( d > 0 ) out.push({key: `bg:${kind}`, kind, dots: d, label: `${J.AGENTS[kind]}: ${d} ${d === 1 ? "dot" : "dots"}`}); }
    return out;
  }

  /** Start a job (the active Storyteller). req: {masterId, agent, job, channel, sceneId, faction, note, cost}. */
  async function start(req, {userId = null} = {}) {
    if ( !isActiveGM() ) { game.socket.emit(SOCKET, {type: "dayjob", payload: {...req, userId: game.user.id}}); ui.notifications.info("The job goes to the Storyteller's clock."); return {ok: true, sent: true}; }
    const master = game.actors.get(req.masterId);
    if ( !master ) return {ok: false, why: "No such character."};
    if ( userId ) { const u = game.users.get(userId); if ( !(u && master.testUserPermission?.(u, "OWNER")) ) return {ok: false, why: "That is not your character."}; }
    if ( !ST()?.tasks?.save ) return {ok: false, why: "Day jobs need WoDX Storyteller's long tasks."};
    if ( !J.JOBS[req.job] ) return {ok: false, why: "Pick a job."};
    const agent = agentsOf(master).find(a => a.key === req.agent);
    if ( !agent ) return {ok: false, why: "That agent does not serve this character."};
    const scene = game.scenes.get(req.sceneId) ?? null, place = scene ? (scene.navName || scene.name) : "";
    const spheres = F.spheresFor(null, yearNow());
    const channel = J.channelsFor(yearNow(), faithAt(scene), spheres).find(c => c.key === req.channel) ?? null;
    const carrier = agent.id ? game.actors.get(agent.id) : master;
    const data = J.jobTask(req.job, {agent: {kind: agent.id ? agent.kind : agent.kind, sheet: carrier?.system?.abilities ?? {}, dots: agent.dots}, place, channel, masterName: master.name, note: req.note, cost: req.cost});
    const t = await ST().tasks.save(carrier, {...data, master: master.id, scene: scene?.id ?? ""});
    if ( !t ) return {ok: false, why: "The long task could not be saved."};
    await carrier.update({[`flags.${MOD}.dayJobs.${t.id}`]: {job: req.job, channel: channel?.key ?? null, sphere: channel?.sphere ?? null, scene: scene?.id ?? null, place,
      master: master.id, faction: req.faction || null, agent: agent.key}});
    if ( agent.id ) for ( const sc of game.scenes ) for ( const d of sc.tokens ) if ( d.actorId === carrier.id && !d.hidden ) await d.update({hidden: true, [`flags.${MOD}.errandHidden`]: true});
    await tell(master, `<p><b>${esc(agent.label)}</b> sets out: ${esc(t.name)}.</p>`);
    return {ok: true, task: t};
  }

  const tell = (master, html) => {
    const users = new Set(gmIds());
    for ( const u of all(game.users) ) if ( !u.isGM && master?.testUserPermission?.(u, "OWNER") ) users.add(u.id);
    return ChatMessage.create({speaker: {alias: "Day jobs"}, whisper: [...users], content: `<div class="wodx-card wnpc wnpc-dayjob">${html}</div>`});
  };

  /** A long task ended: if it was a day job, the agent comes back, a card says how it went, and the faction reacts. */
  async function onTaskDone({actor, task} = {}) {
    if ( !isActiveGM() || !actor || !J.jobOfTask(task) ) return null;
    const carrier = worldOf(actor), meta = carrier?.flags?.[MOD]?.dayJobs?.[task.id];
    if ( !meta ) return null;
    const master = game.actors.get(meta.master), job = meta.job, status = task.status;
    const fs = factions.state().factions ?? [];
    const target = J.targetFaction(fs, {sphere: meta.sphere, picked: meta.faction, masterId: master?.id});
    const re = J.reaction(job, status, target, {sphereName: meta.sphere ? F.sphereName(meta.sphere) : ""});
    const lines = [];
    let paid = "";
    if ( job === "debt" && status === "done" && task.cost > 0 && master ) {
      try { const r = await ST()?.upkeep?.money?.pay?.(master, task.cost, {note: `Buying a debt at ${meta.place || "a place"}`}); paid = r?.ok === false ? " The purse could not pay all of it." : " Paid from the purse."; } catch (e) { paid = ""; }
    }
    if ( re.lose && target && meta.sphere ) {
      try { await factions.proposeChanges(`${target.name} loses ground in ${F.sphereName(meta.sphere)}`, `${master?.name ?? "Someone"}'s agents worked against it at ${meta.place || "a place"}.`,
        [{op: "bg", faction: target.id, key: "influence", sphere: meta.sphere, delta: -1}], {key: `dayjob:${carrier.id}:${task.id}`, kind: "dayjob"}); } catch (e) { console.error(`${MOD} | day job`, e); }
    }
    if ( re.standing && target && master ) { try { await factions.adjustPeople(target.id, master.id, {delta: re.standing}); } catch (e) { console.error(`${MOD} | day job standing`, e); } }
    if ( re.breach ) { try { await factions.reportBreach({severity: 1, place: meta.scene, by: master?.id ?? null, event: `a body found at ${meta.place || "a place"}`}); } catch (e) { console.error(`${MOD} | day job breach`, e); } }
    if ( re.text ) lines.push(re.text);
    // The agent's tokens come back
    for ( const sc of game.scenes ) for ( const d of sc.tokens ) if ( d.actorId === carrier.id && d.flags?.[MOD]?.errandHidden ) await d.update({hidden: false, [`flags.${MOD}.-=errandHidden`]: null});
    await carrier.update({[`flags.${MOD}.dayJobs.-=${task.id}`]: null});
    const who = carrier.id === master?.id ? (J.AGENTS[String(meta.agent).replace(/^bg:/, "")] ?? "The agent") : carrier.name;
    await tell(master ?? carrier, `<p><b>${esc(who)}</b> ${esc(J.resultText(job, status))}${esc(paid)}</p>${lines.map(l => `<p class="wodx-quiet">${esc(l)}</p>`).join("")}`);
    Hooks.callAll("wodxDayJobDone", {master: master?.id ?? null, agent: carrier.id, job, status, faction: target?.id ?? null});
    return re;
  }

  /** The Day jobs window. */
  async function openDayJobs(actorLike) {
    const master = worldOf(actorLike) ?? worldOf(canvas?.tokens?.controlled?.[0]?.actor) ?? game.user.character ?? null;
    if ( !master ) return ui.notifications.warn("Pick a character: select its token or open this from its sheet.");
    if ( !(game.user.isGM || master.isOwner) ) return ui.notifications.warn("You can send the agents of your own characters only.");
    const agents = agentsOf(master);
    if ( !agents.length ) return ui.notifications.info(`${master.name} has no one to send: no allies, contacts or retainers, and no Influence.`);
    const scene0 = canvas?.scene ?? null, year = yearNow();
    const channels = J.channelsFor(year, faithAt(scene0), F.spheresFor(null, year));
    const scenes = all(game.scenes).filter(s => !F.NOT_A_PLACE.test(s.name ?? ""));
    const fs = (factions.state().factions ?? []).filter(f => !f.dormant && (game.user.isGM || !f.secret));
    const content = `<form class="wnpc-dayjobs">
      <div class="form-group"><label>Who goes</label><select name="agent" data-fixed>${agents.map(a => opt(a.key, a.label)).join("")}</select></div>
      <div class="form-group"><label>The job</label><select name="job" data-fixed>${Object.entries(J.JOBS).map(([k, j]) => opt(k, j.label)).join("")}</select></div>
      <div class="form-group"><label>Working through</label><select name="channel" data-fixed>${channels.map(c => opt(c.key, `${c.label} (${F.sphereName(c.sphere)})`)).join("")}</select></div>
      ${scenes.length > 8 ? searchBox("select[name=sceneId]", "Search places…", "Search places") : ""}
      <div class="form-group"><label>Where</label><select name="sceneId">${opt("", "Nowhere in particular")}${scenes.map(s => opt(s.id, s.navName || s.name, s.id === scene0?.id)).join("")}</select></div>
      ${fs.length > 8 ? searchBox("select[name=faction]", "Search factions…", "Search factions") : ""}
      <div class="form-group"><label>Aimed at</label><select name="faction">${opt("", "Whoever holds that power here")}${fs.map(f => opt(f.id, f.name)).join("")}</select></div>
      <div class="form-group"><label>Money to spend (a debt)</label><input type="number" name="cost" value="0" min="0"/></div>
      <div class="form-group"><label>Note</label><input type="text" name="note" maxlength="80"/></div>
      <p class="wodx-quiet">The job runs on the clock as a long task. A follower rolls its own sheet; a Background dot rolls ${esc(master.name)}'s Manipulation and the dots. When it ends, the faction holding that power hears of it.</p>
    </form>`;
    const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: `Day jobs: ${master.name}`, icon: "fa-solid fa-briefcase"}, classes: ["wodx-dialog", "wodx-npc-dialog"], position: {width: 520}, content,
      buttons: [{action: "send", label: "Send", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
    if ( !res || res === "cancel" ) return null;
    const r = await start({masterId: master.id, agent: res.agent, job: res.job, channel: res.channel, sceneId: res.sceneId || null, faction: res.faction || null, note: res.note || "", cost: Number(res.cost) || 0});
    if ( !r.ok ) ui.notifications.warn(r.why);
    return r;
  }

  function hooks() {
    Hooks.once("ready", () => {
      game.socket.on(SOCKET, async m => {
        if ( m?.type !== "dayjob" || !isActiveGM() ) return;
        const r = await start(m.payload, {userId: m.payload?.userId}).catch(e => { console.error(`${MOD} | day jobs`, e); return {ok: false, why: "The job could not start."}; });
        if ( !r.ok ) await ChatMessage.create({content: `<div class="wodx-card wnpc-dayjob"><p>The job did not start: ${esc(r.why)}</p></div>`, whisper: [m.payload?.userId].filter(Boolean), speaker: {alias: "Day jobs"}});
      });
    });
    Hooks.on("wodxTaskDone", e => onTaskDone(e).catch(err => console.error(`${MOD} | day job`, err)));
  }

  return {openDayJobs, start, agentsOf, onTaskDone, hooks, rules: J};
}
