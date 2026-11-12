/**
 * WoDX Storyteller: Start a chronicle, the world template's wizard. In a world made from the WoDX template it opens by
 * itself for the Storyteller until it has run once; anywhere else it waits in the token controls.
 *
 * It asks for the chronicle's name, the opening date (which picks the era profile), the region, latitude and climate,
 * and the lines at the table; in the template world it can also turn on the WoDX modules that are off. Then it makes,
 * or brings up to date, the journals and the group actor in setup-rules.mjs's plan, each found again by its flag so a
 * second run never makes a copy. "Show me first" lists the plan without changing anything.
 */
import * as S from "./setup-rules.mjs";
import {MOD} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const chron = () => game.modules.get("wodx-chronicle")?.api;
const getC = k => { try { return game.settings.get("wodx-chronicle", k); } catch (e) { return null; } };
const isTemplate = () => !!game.world?.flags?.wodx?.template;
const flagOf = doc => doc?.flags?.[MOD]?.template ?? null;
const findDoc = (coll, kind) => all(coll).find(d => flagOf(d)?.kind === kind) ?? null;

export function registerSetupSettings() {
  game.settings.register(MOD, "setup", {scope: "world", config: false, type: Object, default: {}});
}

/** What exists already, for the plan. */
export function have() {
  const out = {};
  for ( const kind of ["screen", "primer"] ) { const j = findDoc(game.journal, kind); out[kind] = j ? {version: flagOf(j).version, id: j.id} : null; }
  const g = findDoc(game.actors, "group");
  out.group = g ? {id: g.id} : null;
  const sz = all(game.journal).find(j => j.flags?.["wodx-chronicle"]?.kind === "session-zero");
  out.sessionZero = sz ? {id: sz.id} : null;
  return out;
}

/** Turn on the WoDX modules that are installed but off. Template world only; Foundry reloads after. */
export async function enableModules() {
  if ( !game.user.isGM || !isTemplate() ) return [];
  const cfg = foundry.utils.deepClone(game.settings.get("core", "moduleConfiguration") ?? {});
  const turned = [];
  for ( const id of S.WODX_MODULES ) if ( game.modules.get(id) && !cfg[id] ) { cfg[id] = true; turned.push(id); }
  if ( turned.length ) await game.settings.set("core", "moduleConfiguration", cfg);
  return turned;
}

async function upsertJournal(kind, name, pages, {ownership} = {}) {
  let j = findDoc(game.journal, kind);
  const flags = {[MOD]: {template: {kind, version: S.TEMPLATE_VERSION}}};
  if ( !j ) {
    let folder = all(game.folders).find(f => f.type === "JournalEntry" && f.name === "WoDX chronicle");
    folder ??= await Folder.create({name: "WoDX chronicle", type: "JournalEntry"});
    return JournalEntry.create({name, folder: folder.id, flags, ...(ownership ? {ownership} : {}),
      pages: pages.map((p, i) => ({name: p.name, type: "text", sort: (i + 1) * 100, text: {content: p.html, format: 1}}))});
  }
  // Pages the wizard wrote are rewritten; pages the Storyteller added are kept
  for ( const [i, p] of pages.entries() ) {
    const page = all(j.pages).find(x => x.name === p.name);
    if ( page ) await page.update({"text.content": p.html});
    else await j.createEmbeddedDocuments("JournalEntryPage", [{name: p.name, type: "text", sort: (i + 1) * 100, text: {content: p.html, format: 1}}]);
  }
  await j.update({name, [`flags.${MOD}.template`]: {kind, version: S.TEMPLATE_VERSION}});
  return j;
}

/**
 * Run the setup. opts: {name, year, month, day, hour, region, latitude, climate, lines, setDate, dry}.
 * Returns {plan, profile, done: [labels]}.
 */
export async function runSetup(opts = {}) {
  if ( !game.user.isGM ) return null;
  const C = chron();
  const lines = (opts.lines ?? []).filter(l => S.LINES[l]);
  const year = Number(opts.year) || 1197;
  const profile = C?.eras?.targetEra?.(year)?.profile ?? null;
  const plan = S.plan(have());
  if ( opts.dry ) return {plan, profile, done: []};
  const done = [];
  // The homeland (Chronicle 0.47.0) sets the part of the world, the people's names and, unless one was typed, the latitude
  const world = game.modules.get("wodx-chronicle")?.api?.world;
  const land = world?.regionOf?.(opts.homeland);
  if ( land && world.setHomeland && land.id !== world.homeland() ) {
    const typed = Number.isFinite(Number(opts.latitude)) && opts.latitude !== "" && Number(opts.latitude) !== getC("latitude");
    await world.setHomeland(land.id, {latitude: typed ? Number(opts.latitude) : land.lat});
    opts = {...opts, region: land.part, latitude: typed ? opts.latitude : land.lat};
    done.push("homeland");
  }
  if ( opts.region && getC("region") !== opts.region ) { await game.settings.set("wodx-chronicle", "region", opts.region); done.push("region"); }
  if ( Number.isFinite(Number(opts.latitude)) && Number(opts.latitude) !== getC("latitude") ) { await game.settings.set("wodx-chronicle", "latitude", Number(opts.latitude)); done.push("latitude"); }
  if ( opts.climate && game.modules.get("wodx-atmosphere")?.active ) {
    try { await game.settings.set("wodx-atmosphere", "climate", opts.climate); done.push("climate"); } catch (e) { /* off */ }
  }
  let dateLabel = "";
  calMod ??= await import("../../wodx-chronicle/scripts/calendar.mjs").catch(() => null);
  if ( opts.setDate !== false ) {
    const engine = calMod.getEngine();
    const d = {year, month: Number(opts.month) || 1, day: Number(opts.day) || 1, hour: Number(opts.hour) || 21, minute: 0};
    try {
      await game.time.set(engine.dateToTime(d));
      await game.settings.set("wodx-chronicle", "openingSet", true);
      done.push("date");
    } catch (e) {
      ui.notifications.warn(`${d.day}.${d.month}.${d.year} cannot be set: it was skipped at the calendar reform, or the month is too short.`);
      return {plan, profile, done, error: "date"};
    }
  }
  try { dateLabel = cal0()?.describeTime?.(game.time.worldTime, Number(getC("latitude")) || 50.1)?.dateLabel ?? ""; } catch (e) { dateLabel = ""; }
  const active = C?.eras?.activeEra?.()?.profile ?? profile;
  const regionLabel = game.modules.get("wodx-chronicle")?.api?.world?.here?.(null)?.label ?? {europe: "Europe", americas: "The Americas", other: "Elsewhere"}[getC("region")] ?? "";
  let climateLabel = "";
  try { const A = game.modules.get("wodx-atmosphere")?.api; climateLabel = A ? A.rules.W.CLIMATES[A.weather.climate()]?.label ?? "" : ""; } catch (e) { climateLabel = ""; }

  const name = String(opts.name ?? "").trim();
  await upsertJournal("screen", name ? `Storyteller screen: ${name}` : "Storyteller screen", [
    {name: "The era", html: S.eraPage(active, {lines, date: dateLabel, region: regionLabel, climate: climateLabel})},
    {name: "Rolls", html: S.ROLLS_PAGE},
    {name: "Health and damage", html: S.HEALTH_PAGE},
    {name: "WoDX tools", html: S.TOOLS_PAGE}
  ], {ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE}});
  done.push("screen");
  await upsertJournal("primer", `The world in ${active?.name ?? "this era"}`, [{name: "What everyone knows", html: S.playerPrimer(active)}],
    {ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}});
  done.push("primer");
  if ( !findDoc(game.actors, "group") ) {
    try {
      await Actor.create({name: S.groupName(lines, name), type: "Group", flags: {[MOD]: {template: {kind: "group", version: S.TEMPLATE_VERSION}}},
        ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}});
      done.push("group");
    } catch (e) { console.warn(`${MOD} | group actor`, e); }
  }
  try { const J = await import("../../wodx-chronicle/scripts/journals.mjs"); await J.ensureSessionZero(); done.push("sessionZero"); } catch (e) { console.warn(`${MOD} | session zero`, e); }
  try { await C?.eras?.refreshRulesJournal?.(); done.push("rules"); } catch (e) { console.warn(`${MOD} | rules`, e); }
  await game.settings.set(MOD, "setup", {done: true, at: Date.now(), name, lines, version: S.TEMPLATE_VERSION, era: active?.id ?? null});
  return {plan, profile: active, done};
}
let calMod = null;
const cal0 = () => calMod;

/** The wizard. */
export async function openSetup() {
  if ( !game.user.isGM ) return null;
  calMod ??= await import("../../wodx-chronicle/scripts/calendar.mjs").catch(() => null);
  const prev = game.settings.get(MOD, "setup") ?? {};
  let now = null;
  try { now = calMod?.getEngine?.().timeToDate(game.time.worldTime); } catch (e) { now = null; }
  const months = (calMod?.MONTHS ?? Array.from({length: 12}, (_, i) => String(i + 1))).map((m, i) => `<option value="${i + 1}"${i + 1 === (now?.month ?? 1) ? " selected" : ""}>${esc(m)}</option>`).join("");
  const A = game.modules.get("wodx-atmosphere");
  const climates = A?.active ? Object.entries(A.api?.rules?.W?.CLIMATES ?? {}) : [];
  const worldApi = game.modules.get("wodx-chronicle")?.api?.world;
  const homelands = Object.entries(worldApi?.regions ?? {});
  const curHomeland = worldApi?.homeland?.() ?? "moravia";
  const curClimate = (() => { try { return game.settings.get("wodx-atmosphere", "climate"); } catch (e) { return "auto"; } })();
  const off = S.WODX_MODULES.filter(id => game.modules.get(id) && !game.modules.get(id).active);
  const lineBoxes = Object.entries(S.LINES).map(([k, v]) => `<label class="wstory-check"><input type="checkbox" name="line-${k}"${(prev.lines ?? []).includes(k) ? " checked" : ""}> ${esc(v.label)}</label>`).join("");
  const profiles = chron()?.eras?.profiles?.() ?? [];
  const eraList = profiles.filter(p => Number.isFinite(p.start)).map(p => `<li>${esc(p.name)}: ${p.start} to ${p.end}</li>`).join("");
  const content = `
    <p>Sets the chronicle's opening date and place, then makes the Storyteller screen, the era primer for the players, the group actor and
    Session Zero. Run it again at any time: what it made is brought up to date, never copied.</p>
    <div class="form-group"><label>Chronicle name</label><input type="text" name="name" value="${esc(prev.name ?? "")}"></div>
    <fieldset><legend>Opening night</legend>
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${now?.year ?? 1197}" step="1"></div>
      <div class="form-group"><label>Month</label><select name="month" data-fixed>${months}</select></div>
      <div class="form-group"><label>Day</label><input type="number" name="day" value="${now?.day ?? 1}" min="1" max="31" step="1"></div>
      <div class="form-group"><label>Hour</label><input type="number" name="hour" value="${now && game.time.worldTime ? now.hour : 21}" min="0" max="23" step="1"></div>
      <div class="form-group"><label>Set the clock to this date</label><input type="checkbox" name="setDate"${prev.done ? "" : " checked"}></div>
      <details><summary>Which year is which era</summary><ul>${eraList}</ul></details>
    </fieldset>
    <fieldset><legend>Where</legend>
      ${homelands.length
    ? `<div class="form-group"><label>Homeland</label><select name="homeland" data-fixed>${homelands.map(([k, r]) => `<option value="${k}"${curHomeland === k ? " selected" : ""}>${esc(r.label)}</option>`).join("")}</select></div>
      <p class="wodx-quiet">Anywhere in the world. The people's names and the weather follow the homeland, and so does the latitude unless you change it below.</p>`
    : `<div class="form-group"><label>Region</label><select name="region" data-fixed>${[["europe", "Europe"], ["americas", "The Americas"], ["other", "Elsewhere"]].map(([k, l]) => `<option value="${k}"${getC("region") === k ? " selected" : ""}>${l}</option>`).join("")}</select></div>`}
      <div class="form-group"><label>Latitude (degrees north)</label><input type="number" name="latitude" value="${getC("latitude") ?? 50.1}" step="0.1"></div>
      ${climates.length ? `<div class="form-group"><label>Climate</label><select name="climate" data-fixed><option value="auto"${curClimate === "auto" ? " selected" : ""}>Follow the region</option>${climates.map(([k, c]) => `<option value="${k}"${curClimate === k ? " selected" : ""}>${esc(c.label)}</option>`).join("")}</select></div>` : ""}
    </fieldset>
    <fieldset><legend>Lines at the table</legend>${searchBox(".wstory-lines", "Search lines…", "Search lines")}<div class="wstory-lines">${lineBoxes.replaceAll('<label class="wstory-check">', '<label class="wstory-check" data-search-item>')}</div></fieldset>
    ${isTemplate() && off.length ? `<p><b>Off in this world:</b> ${off.map(esc).join(", ")}. <button type="button" data-wstory-modules>Turn them on (Foundry reloads)</button></p>` : ""}
    <p class="wodx-quiet">House rules are in the Chronicle Clock's House rules window; the Chronicle Rules journal lists them for everyone.</p>`;
  const read = form => {
    const f = new foundry.applications.ux.FormDataExtended(form).object;
    return {name: f.name, year: f.year, month: f.month, day: f.day, hour: f.hour, setDate: !!f.setDate, region: f.region, homeland: f.homeland, latitude: f.latitude, climate: f.climate,
      lines: Object.keys(S.LINES).filter(k => f[`line-${k}`])};
  };
  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["wodx-dialog", "wstory-dialog", "wstory-setup"], window: {title: "Start a chronicle", icon: "fa-solid fa-book-open"}, position: {width: 620},
    content, rejectClose: false,
    render: (ev, dialog) => {
      dialog.element.querySelector("[data-wstory-modules]")?.addEventListener("click", async () => {
        const turned = await enableModules();
        if ( turned.length ) { ui.notifications.info(`Turned on: ${turned.join(", ")}. Reloading.`); foundry.utils.debouncedReload?.() ?? window.location.reload(); }
      });
    },
    buttons: [
      {action: "dry", label: "Show me first", callback: (ev, b) => ({...read(b.form), dry: true})},
      {action: "go", label: "Start the chronicle", default: true, callback: (ev, b) => read(b.form)},
      {action: "cancel", label: "Not now"}
    ]
  });
  if ( !result || result === "cancel" ) return null;
  if ( result.dry ) {
    const r = await runSetup(result);
    const rows = r.plan.map(p => `<li>${esc(p.label)}: ${p.action === "make" ? "will be made" : p.action === "update" ? "will be brought up to date" : "already there, kept as it is"}</li>`).join("");
    await foundry.applications.api.DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog"], window: {title: "Start a chronicle: the plan"}, rejectClose: false,
      content: `<p>The year ${esc(result.year)} is in <b>${esc(r.profile?.name ?? "no era profile")}</b>.</p><ul>${rows}</ul>
        <p class="wodx-quiet">${result.setDate ? "The clock will be set to the opening night." : "The clock stays where it is."} Nothing has changed yet.</p>`,
      buttons: [{action: "ok", label: "Back", default: true}]});
    return openSetup();
  }
  const r = await runSetup(result);
  if ( r?.error ) return openSetup();
  ui.notifications.info(`The chronicle is set up in ${r?.profile?.name ?? "its era"}.`);
  findDoc(game.journal, "screen")?.sheet?.render(true);
  // Then the players' characters: Before the First Night (WoDX Creation 0.12.0), when it is on
  try { game.modules.get("wodx-creation")?.api?.firstNight?.(); } catch (e) { console.warn(`${MOD} | first night`, e); }
  return r;
}

/** At ready: in the template world, open the wizard until it has run once. */
export function maybeOpenSetup() {
  if ( !game.user.isGM || !isTemplate() ) return;
  const users = all(game.users).filter(u => u.isGM && u.active);
  if ( users.length && users[0].id !== game.user.id ) return;
  if ( (game.settings.get(MOD, "setup") ?? {}).done ) return;
  setTimeout(() => openSetup().catch(e => console.error(`${MOD} | setup`, e)), 1200);
}
