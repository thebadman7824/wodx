import {MODULE_ID, esc, lineOf, xpTotals, purchaseOptions, newDisciplineOption, newAbilityOption, kindLabel, lineage, generationOf,
  clanNameOf, domitorOf, allyOf, patronOf, payerOf, canSpendFor, spendableFor} from "./actor-data.mjs";
import {embraceDialog, vitaeDialog} from "./change-of-state.mjs";
import {award, requestSpend, writeLogPage} from "./xp.mjs";
import {writeLineageJournal, ordinal} from "./lineage.mjs";
import {XP} from "../data/vampire.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {PassYearsApp} from "./pass-years.mjs";
import {runSkipTest, isTestWorld} from "./skip-test.mjs";

const {ApplicationV2} = foundry.applications.api;
const OBSERVER = 2;
const byName = (a, b) => a.name.localeCompare(b.name);
const isPC = a => !!a.hasPlayerOwner;

function describeActor(a) {
  if ( lineOf(a) === "vampire" ) return `${clanNameOf(a) || "Vampire"}, ${generationOf(a) ? ordinal(generationOf(a)) : "?"}`;
  if ( lineOf(a) === "ghoul" ) return `Ghoul of ${domitorOf(a)?.name ?? lineage(a).domitor?.name ?? "?"}`;
  return "Mortal";
}

/* -------------------------------------------- */
/*  Storyteller window                          */
/* -------------------------------------------- */

export class CreationApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-creation",
    classes: ["wodx", "wodx-creation"],
    window: {title: "Creation and experience", icon: "fa-solid fa-droplet", resizable: true},
    position: {width: 560, height: "auto"},
    actions: {
      embrace: () => embraceDialog().then(() => CreationApp.refresh()),
      vitae: () => vitaeDialog().then(() => CreationApp.refresh()),
      award: () => awardDialog(),
      spend: CreationApp.#onSpend,
      ally: CreationApp.#onAlly,
      toggleNPCs: CreationApp.#onToggleNPCs,
      lineage: async () => { const j = await writeLineageJournal(); j?.sheet?.render(true); },
      log: CreationApp.#onLog,
      passYears: () => PassYearsApp.open(),
      skipTest: () => runSkipTest().then(() => CreationApp.refresh())
    }
  };

  static #instance;

  /** Storyteller: this window. Player: the spend window, or a choice of their characters and allies. */
  static open() {
    if ( !game.user.isGM ) return chooseAndSpend();
    const height = Math.max(360, Math.min(760, window.innerHeight - 80));
    this.#instance ??= new CreationApp({position: {height}});
    return this.#instance.render({force: true});
  }

  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  /** Show every NPC the module handles, not only player characters and allies. */
  showNPCs = false;

  roster() {
    const all = game.actors.filter(a => lineOf(a) && !lineage(a).became);
    const pcs = all.filter(isPC).sort(byName);
    const allies = all.filter(a => !isPC(a) && allyOf(a)).sort(byName);
    const others = this.showNPCs ? all.filter(a => !isPC(a) && !allyOf(a)).sort(byName) : [];
    return {pcs, allies, others};
  }

  async _renderHTML() {
    const {pcs, allies, others} = this.roster();
    const row = (a, kind) => {
      const payer = payerOf(a);
      const t = xpTotals(payer);
      const who = kind === "ally" ? `Ally of ${esc(patronOf(a)?.name ?? allyOf(a)?.patron?.name ?? "?")}${payer !== a ? ", pays from the patron" : ""}`
        : (kind === "pc" ? "Player character" : "NPC");
      const allyButton = kind === "pc" ? "" : `<button type="button" data-action="ally" data-actor="${a.id}" title="Let a player character's owners improve this NPC">${kind === "ally" ? "Ally…" : "Make ally"}</button>`;
      return `<tr data-search-text="${esc(`${a.name} ${describeActor(a)} ${who}`)}"><td>${esc(a.name)}</td><td>${esc(describeActor(a))}<br><span class="wodx-quiet">${who}</span></td>
        <td>${t.available}</td><td class="wodx-row-buttons"><button type="button" data-action="spend" data-actor="${a.id}">Spend</button>${allyButton}</td></tr>`;
    };
    const rows = [...pcs.map(a => row(a, "pc")), ...allies.map(a => row(a, "ally")), ...others.map(a => row(a, "npc"))].join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top">
        <div class="wodx-buttons">
          <button type="button" data-action="embrace"><i class="fa-solid fa-skull"></i> Embrace a mortal</button>
          <button type="button" data-action="vitae"><i class="fa-solid fa-droplet"></i> Give vitae</button>
          <button type="button" data-action="award"><i class="fa-solid fa-star"></i> Award experience</button>
          <button type="button" data-action="log"><i class="fa-solid fa-book"></i> Experience log</button>
          <button type="button" data-action="lineage"><i class="fa-solid fa-sitemap"></i> Lineage journal</button>
          <button type="button" data-action="passYears"><i class="fa-solid fa-hourglass-half"></i> Pass the years</button>
          ${isTestWorld() ? `<button type="button" data-action="skipTest" title="The Phase 4 gate. Moves this world's clock to 2025"><i class="fa-solid fa-vial"></i> Time-skip test</button>` : ""}
        </div>
        <div class="form-group"><label><input type="checkbox" data-action="toggleNPCs" ${this.showNPCs ? "checked" : ""}> Show every NPC (to make one an ally)</label></div>
        ${searchBox("table.wodx-roster", "Search characters…", "Search characters")}
      </div>
      <div class="wodx-scroll">
        ${rows ? `<table class="wodx-table wodx-roster"><thead><tr><th>Character</th><th>What</th><th>To spend</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
          : `<p class="wodx-quiet">No player owns a mortal, ghoul or vampire yet. Tick "Show every NPC" to see the rest.</p>`}
      </div>
      <footer class="wodx-footer"><p class="wodx-quiet">Allies are NPCs a player character's owners may improve: ghouls, retainers, other followers.
        Players spend from the droplet button; their requests wait in the approval queue.</p></footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static #onSpend(event, target) {
    const actor = game.actors.get(target.dataset.actor);
    if ( actor ) SpendApp.openFor(actor);
  }

  static async #onAlly(event, target) {
    const actor = game.actors.get(target.dataset.actor);
    if ( actor ) await allyDialog(actor);
    this.render();
  }

  static #onToggleNPCs(event, target) {
    this.showNPCs = !!target.checked;
    this.render();
  }

  static async #onLog() {
    let journal = null;
    for ( const a of game.actors.filter(a => a.items.some(i => i.type === "Experience")) ) journal = await writeLogPage(a);
    if ( !journal ) return ui.notifications.info("No experience has been recorded yet.");
    journal.sheet?.render(true);
  }
}

/* -------------------------------------------- */
/*  Allies                                      */
/* -------------------------------------------- */

/**
 * GM: make an NPC an ally of a player character, change it, or end it. Optionally lets the patron's owners see
 * the NPC's sheet (Observer); ending the alliance puts those permissions back as they were.
 */
export async function setAlly(actor, {patron = null, payer = "self", observe = true} = {}) {
  if ( !game.user.isGM ) return null;
  const before = allyOf(actor);
  // Put back any permission given last time; a user who had no entry of their own loses it again
  const restore = {};
  const Del = foundry.data?.operators?.ForcedDeletion;
  for ( const [uid, level] of Object.entries(before?.granted ?? {}) ) {
    if ( level !== null ) restore[`ownership.${uid}`] = level;
    else if ( Del ) restore[`ownership.${uid}`] = new Del();
    else restore[`ownership.-=${uid}`] = null;
  }
  if ( Object.keys(restore).length ) await actor.update(restore);
  if ( !patron ) {
    await actor.unsetFlag(MODULE_ID, "ally");
    return null;
  }
  const granted = {};
  if ( observe ) {
    const grant = {};
    for ( const u of game.users.filter(u => !u.isGM && patron.testUserPermission(u, "OWNER")) ) {
      const own = actor.ownership?.[u.id];
      const effective = (own === undefined || own === -1) ? (actor.ownership?.default ?? 0) : own;
      if ( effective >= OBSERVER ) continue;
      granted[u.id] = own === undefined ? null : own;
      grant[`ownership.${u.id}`] = OBSERVER;
    }
    if ( Object.keys(grant).length ) await actor.update(grant);
  }
  // In `granted`, null means the user had no entry of their own
  const ally = {patron: {id: patron.id, name: patron.name}, payer: payer === "patron" ? "patron" : "self", granted};
  // setFlag merges objects; clear the old record first so no stale permission entry survives
  if ( before ) await actor.unsetFlag(MODULE_ID, "ally");
  await actor.setFlag(MODULE_ID, "ally", ally);
  return ally;
}

export async function allyDialog(actor) {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const pcs = game.actors.filter(a => isPC(a) && a.id !== actor.id && lineOf(a) && !lineage(a).became).sort(byName);
  if ( !pcs.length ) return ui.notifications.warn("No player character to be this NPC's patron.");
  const current = allyOf(actor);
  // A ghoul of a player character's domitor is that character's by default
  const guess = current?.patron?.id ?? (lineOf(actor) === "ghoul" && domitorOf(actor) && isPC(domitorOf(actor)) ? domitorOf(actor).id : pcs[0].id);
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: `Ally: ${actor.name}`},
    content: `
      <p>An ally's patron is a player character. The patron's owners may spend experience on the ally.</p>
      <div class="form-group"><label>Patron</label>${searchBox("select[name=patron]", "Search player characters…", "Search patrons")}
        <select name="patron"><option value="">No patron (not an ally)</option>${pcs.map(p => `<option value="${p.id}" ${p.id === guess ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Pays with</label><select name="payer" data-fixed>
        <option value="self" ${current?.payer !== "patron" ? "selected" : ""}>Its own experience</option>
        <option value="patron" ${current?.payer === "patron" ? "selected" : ""}>The patron's experience</option></select></div>
      <div class="form-group"><label><input type="checkbox" name="observe" checked> The patron's players can see this sheet (Observer)</label></div>`,
    ok: {
      label: "Save",
      callback: (event, button) => ({patron: button.form.elements.patron.value, payer: button.form.elements.payer.value, observe: button.form.elements.observe.checked})
    },
    rejectClose: false
  });
  if ( !result ) return null;
  const ally = await setAlly(actor, {patron: result.patron ? game.actors.get(result.patron) : null, payer: result.payer, observe: result.observe});
  ui.notifications.info(ally ? `${actor.name} is now an ally of ${ally.patron.name}.` : `${actor.name} is no longer an ally.`);
  return ally;
}

/** Player: spend for the selected token's character, else pick from their characters and allies. */
async function chooseAndSpend() {
  const selected = canvas?.tokens?.controlled?.[0]?.actor;
  if ( selected && canSpendFor(selected) && lineOf(selected) ) return SpendApp.openFor(selected);
  const list = spendableFor(game.user);
  if ( !list.length ) return ui.notifications.warn("You have no character WoDX can spend experience for.");
  if ( list.length === 1 ) return SpendApp.openFor(list[0]);
  const {DialogV2} = foundry.applications.api;
  const id = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Spend experience for…"},
    content: `<div class="form-group"><label>Character</label>${searchBox("select[name=who]", "Search…", "Search characters")}
      <select name="who">${list.map(a => `<option value="${a.id}">${esc(a.name)}${allyOf(a) ? ` (ally of ${esc(allyOf(a).patron?.name ?? "?")})` : ""}</option>`).join("")}</select></div>`,
    ok: {label: "Open", callback: (event, button) => button.form.elements.who.value},
    rejectClose: false
  });
  const actor = id ? game.actors.get(id) : null;
  return actor ? SpendApp.openFor(actor) : null;
}

/* -------------------------------------------- */
/*  Spending window                             */
/* -------------------------------------------- */

export class SpendApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-spend"],
    window: {title: "Spend experience", icon: "fa-solid fa-star", resizable: true},
    position: {width: 540, height: 640},
    actions: {
      buy: SpendApp.#onBuy,
      buyNewDiscipline: SpendApp.#onNewDiscipline,
      buyNewAbility: SpendApp.#onNewAbility
    }
  };

  /** Open for an actor, or for the selected token's actor, or for the user's own character. */
  static openFor(actor = null) {
    actor ??= canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
    if ( !actor ) return ui.notifications.warn("Select your character's token first.");
    if ( !canSpendFor(actor) ) return ui.notifications.warn("You can only spend experience for your own character or its allies.");
    if ( !lineOf(actor) ) return ui.notifications.warn(`WoDX does not handle experience for a ${actor.type} yet; use the sheet.`);
    const height = Math.max(360, Math.min(640, window.innerHeight - 120));
    const app = new SpendApp({id: `wodx-spend-${actor.id}`, actor, position: {height}});
    return app.render({force: true});
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
  }

  get title() {
    return `Spend experience: ${this.actor?.name ?? ""}`;
  }

  async _renderHTML() {
    const actor = this.actor;
    const line = lineOf(actor);
    const payer = payerOf(actor);
    const t = xpTotals(payer);
    const verb = game.user.isGM ? "Buy" : "Ask";
    const opts = purchaseOptions(actor);
    const groups = ["attribute", "ability", "discipline", "virtue", "road", "willpower"].map(kind => {
      const list = opts.filter(o => o.kind === kind);
      if ( !list.length ) return "";
      return `<h3>${esc(kindLabel(kind))}</h3><table class="wodx-table wodx-traits"><tbody>${list.map(o => `
        <tr class="${o.ok ? "" : "wodx-muted"}" data-search-text="${esc(o.label)}"><td>${esc(o.label)}${o.discipline === "clan" ? ' <span class="wodx-tag">clan</span>' : ""}</td>
          <td>${o.current} → ${o.next}</td><td>${o.cost ?? "–"} xp</td>
          <td><button type="button" data-action="buy" data-kind="${o.kind}" data-key="${esc(o.key)}" ${o.ok ? "" : "disabled"} title="${esc(o.reason)}">${verb}</button></td></tr>`).join("")}
        </tbody></table>`;
    }).join("");
    const discBlock = line === "mortal" ? "" : `
      <div class="form-group"><label>New Discipline (${XP[line].newDiscipline} xp)</label>
        <input type="text" name="newDiscipline" placeholder="Name, e.g. Celerity">
        <button type="button" data-action="buyNewDiscipline">${verb}</button></div>`;
    const pays = payer === actor ? "" : ` <em>Paid from ${esc(payer.name)}'s experience.</em>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top"><p><strong>${t.available}</strong> experience to spend (earned ${t.earned}, spent ${t.spent}).${pays}
        Costs follow ${esc(XP[line].source)}.</p>
        ${searchBox("table.wodx-traits", "Search traits…", "Search traits")}</div>
      <div class="wodx-scroll">
        ${groups}
        <h3>Something new</h3>
        ${discBlock}
        <div class="form-group"><label>New Ability (${XP[line].newAbility} xp)</label>
          <select name="newAbilityGroup" data-fixed><option value="talent">Talent</option><option value="skill" selected>Skill</option><option value="knowledge">Knowledge</option></select>
          <input type="text" name="newAbility" placeholder="Name, e.g. Ride">
          <button type="button" data-action="buyNewAbility">${verb}</button></div>
      </div>
      <footer class="wodx-footer"><p class="wodx-quiet">${game.user.isGM ? "Buying spends at once and records it in the experience log." : "Your request goes to the Storyteller, who approves it."}</p></footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  async #spend(option) {
    const r = await requestSpend(this.actor, option);
    if ( r?.ok ) this.render();
  }

  static #onBuy(event, target) {
    const option = purchaseOptions(this.actor).find(o => o.kind === target.dataset.kind && o.key === target.dataset.key);
    return this.#spend(option);
  }

  static #onNewDiscipline() {
    const name = this.element.querySelector("input[name=newDiscipline]")?.value;
    const option = newDisciplineOption(this.actor, name);
    if ( !option ) return ui.notifications.warn("Type the Discipline's name.");
    return this.#spend(option);
  }

  static #onNewAbility() {
    const name = this.element.querySelector("input[name=newAbility]")?.value;
    const group = this.element.querySelector("select[name=newAbilityGroup]")?.value ?? "skill";
    const option = newAbilityOption(this.actor, name, group);
    if ( !option ) return ui.notifications.warn("Type the Ability's name.");
    return this.#spend(option);
  }
}

/* -------------------------------------------- */
/*  Award dialog                                */
/* -------------------------------------------- */

export async function awardDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const actors = game.actors.filter(a => lineOf(a) && !lineage(a).became).sort((a, b) =>
    (Number(isPC(b)) - Number(isPC(a))) || (Number(!!allyOf(b)) - Number(!!allyOf(a))) || a.name.localeCompare(b.name));
  if ( !actors.length ) return ui.notifications.warn("There is no character to award.");
  const note = a => isPC(a) ? "" : (allyOf(a) ? ` <span class="wodx-quiet">(ally of ${esc(allyOf(a).patron?.name ?? "?")})</span>` : ' <span class="wodx-quiet">(NPC)</span>');
  const rows = actors.map(a => `<li><label><input type="checkbox" name="who" value="${a.id}" ${isPC(a) ? "checked" : ""}> ${esc(a.name)}${note(a)}</label></li>`).join("");
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Award experience"},
    content: `
      <div class="form-group"><label>Points each</label><input type="number" name="amount" value="1" min="1" max="50" step="1"></div>
      <div class="form-group"><label>For</label><input type="text" name="note" maxlength="120" placeholder="Session, story or deed"></div>
      <p>Characters (player characters are ticked; allies come next):</p>
      ${searchBox("ul.wodx-award", "Search characters…", "Search characters")}
      <ul class="wodx-list wodx-award">${rows}</ul>`,
    ok: {
      label: "Award",
      callback: (event, button) => ({
        amount: Number(button.form.elements.amount.value),
        note: button.form.elements.note.value,
        ids: [...button.form.querySelectorAll("input[name=who]:checked")].map(i => i.value)
      })
    },
    rejectClose: false
  });
  if ( !result?.ids?.length ) return null;
  const done = await award(result.ids.map(id => game.actors.get(id)).filter(Boolean), result.amount, result.note);
  CreationApp.refresh();
  return done;
}
