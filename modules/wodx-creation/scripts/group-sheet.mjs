import {MODULE_ID, esc} from "./actor-data.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * The sheet for the fork's Group actor: a coterie, pack, cabal, motley, circle, cell...
 * A roster of members, the Backgrounds they pool, and shared notes.
 * Pooling follows V20 Dark Ages p. 182 (coteries) and W20 pp. 140–141 (packs).
 */

/** Which Backgrounds each kind of group may pool, by the book. Other kinds pool what the Storyteller allows. */
export const POOLABLE = {
  coterie: {source: "V20 Dark Ages p. 182", list: ["Allies", "Contacts", "Domain", "Herd", "Influence", "Resources", "Retainers"]},
  pack: {source: "W20 pp. 140–141", list: ["Allies", "Contacts", "Fate", "Kinfolk", "Resources"],
    note: "Totem already belongs to the pack as a whole, so it is not pooled (W20 p. 140)."}
};
/** The pool list for a kind of group in the era in force: a Dark Ages pack also pools Hunting Grounds, its best Anchor (DA:W p. 84). */
export function poolableFor(kind) {
  const base = POOLABLE[kind];
  if ( !base ) return null;
  const era = game.modules?.get?.("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id;
  if ( kind === "pack" && ["dark-ages", "long-night"].includes(era) )
    return {...base, source: `${base.source}; DA:W p. 84`, list: [...base.list, "Hunting Grounds"],
      note: `${base.note} In the Dark Ages, Hunting Grounds is the pack's best Anchor (DA:W p. 84).`};
  return base;
}
/** The Storyteller's usual cap on a pooled Background (V20 Dark Ages p. 182). */
export const POOL_CAP = 10;

export const KINDS = () => CONFIG.worldofdarkness?.groupKinds ?? {coterie: "Coterie", pack: "Pack", other: "Other"};

/** Dots in a pooled Background: the sum of what each member put in. */
export function poolTotal(bg) {
  return Object.values(bg?.contributions ?? {}).reduce((n, v) => n + (Number(v) || 0), 0);
}

/** Warnings for a group's pools: over the Anchor, over the usual cap, from someone who left. */
export function poolWarnings(group) {
  const sys = group.system ?? {};
  const out = [];
  const anchor = (sys.backgrounds ?? []).find(b => b.anchor || b.id === sys.anchorId);
  const anchorDots = anchor ? poolTotal(anchor) : null;
  const members = new Set((sys.roster ?? []).filter(r => !r.left).map(r => r.actorId));
  for ( const b of sys.backgrounds ?? [] ) {
    const t = poolTotal(b);
    if ( anchor && b !== anchor && t > anchorDots ) out.push(`${b.name} (${t}) is above the Anchor, ${anchor.name} (${anchorDots}): no pool may have more dots than the Anchor (V20 Dark Ages p. 182).`);
    if ( t > POOL_CAP ) out.push(`${b.name} has ${t} dots; the Storyteller usually caps a pool at ${POOL_CAP} (V20 Dark Ages p. 182).`);
    for ( const id of Object.keys(b.contributions ?? {}) ) {
      if ( !members.has(id) && Number(b.contributions[id]) ) out.push(`${b.name}: ${game.actors.get(id)?.name ?? "someone"} is no longer a member but still has dots in it.`);
    }
  }
  return out;
}

/** Add an actor to a group's roster (no duplicates; a member who left comes back). */
export async function addMember(group, actor, role = "") {
  if ( !group || !actor || actor.type === "Group" ) return false;
  const roster = foundry.utils.deepClone(group.system.roster ?? []);
  const old = roster.find(r => r.actorId === actor.id);
  if ( old && !old.left ) return false;
  if ( old ) { old.left = null; old.joined = game.time.worldTime; }
  else roster.push({actorId: actor.id, role, joined: game.time.worldTime, left: null});
  await group.update({"system.roster": roster});
  return true;
}

/**
 * A member leaves. The roster keeps them, marked as gone, so the group's history stays; their pooled dots
 * come out one short (V20 Dark Ages p. 182), which the card says, and the Storyteller moves on their sheet.
 */
export async function removeMember(group, actorId) {
  const roster = foundry.utils.deepClone(group.system.roster ?? []);
  const r = roster.find(x => x.actorId === actorId && !x.left);
  if ( !r ) return null;
  r.left = game.time.worldTime;
  const bgs = foundry.utils.deepClone(group.system.backgrounds ?? []);
  const back = [];
  for ( const b of bgs ) {
    const n = Number(b.contributions?.[actorId]) || 0;
    if ( n ) { back.push(`${b.name}: ${n} in, ${Math.max(0, n - 1)} back`); delete b.contributions[actorId]; }
  }
  await group.update({"system.roster": roster, "system.backgrounds": bgs});
  return {back};
}

export function makeGroupSheet() {
  const Base = foundry.applications.sheets?.ActorSheetV2;
  if ( !Base ) return null;
  return class GroupSheet extends Base {
    static DEFAULT_OPTIONS = {
      classes: ["wodx", "wodx-group"],
      position: {width: 720, height: 680},
      window: {resizable: true, icon: "fa-solid fa-people-group"},
      form: {submitOnChange: true, closeOnSubmit: false},
      actions: {
        addMember: GroupSheet.#onAddMember,
        removeMember: GroupSheet.#onRemoveMember,
        openMember: GroupSheet.#onOpenMember,
        addBackground: GroupSheet.#onAddBackground,
        removeBackground: GroupSheet.#onRemoveBackground,
        anchor: GroupSheet.#onAnchor
      }
    };

    get group() { return this.document; }

    async _renderHTML() {
      const g = this.group;
      const sys = g.system;
      const kinds = KINDS();
      const kindOptions = Object.entries(kinds).map(([k, v]) => `<option value="${k}" ${k === sys.kind ? "selected" : ""}>${esc(v)}</option>`).join("");
      const members = (sys.roster ?? []).map(r => ({...r, actor: game.actors.get(r.actorId)}));
      const current = members.filter(m => !m.left);
      const former = members.filter(m => m.left);
      const canEdit = g.isOwner;
      const rows = current.map(m => `<tr data-search-text="${esc(m.actor?.name ?? "")}">
          <td><a data-action="openMember" data-actor="${m.actorId}">${esc(m.actor?.name ?? "(missing)")}</a></td>
          <td>${esc(m.actor?.type ?? "")}</td>
          <td><input type="text" data-role="${m.actorId}" value="${esc(m.role)}" placeholder="Role" ${canEdit ? "" : "disabled"}></td>
          <td>${canEdit ? `<button type="button" data-action="removeMember" data-actor="${m.actorId}" title="Leaves the group; kept in the history">Leaves</button>` : ""}</td>
        </tr>`).join("");
      const inRoster = new Set(current.map(m => m.actorId));
      const candidates = [...game.actors].filter(a => a.type !== "Group" && !inRoster.has(a.id)).sort((a, b) => a.name.localeCompare(b.name));
      const pool = poolableFor(sys.kind);
      const bgs = (sys.backgrounds ?? []).map(b => {
        const cells = current.map(m => `<td><input type="number" min="0" max="10" step="1" data-contrib="${b.id}" data-actor="${m.actorId}" value="${Number(b.contributions?.[m.actorId]) || 0}" ${canEdit ? "" : "disabled"} aria-label="${esc(m.actor?.name ?? "")}"></td>`).join("");
        const anchor = b.id === sys.anchorId;
        return `<tr data-search-text="${esc(b.name)}">
          <td>${esc(b.name)}${anchor ? ` <strong title="The Anchor: no pool may have more dots">(Anchor)</strong>` : ""}</td>
          <td class="total">${poolTotal(b)}</td>${cells}
          <td>${canEdit ? `${anchor ? "" : `<button type="button" data-action="anchor" data-bg="${b.id}">Make Anchor</button>`} <button type="button" data-action="removeBackground" data-bg="${b.id}">Remove</button>` : ""}</td>
        </tr>`;
      }).join("");
      const warnings = poolWarnings(g);
      const suggestions = pool ? pool.list.filter(n => !(sys.backgrounds ?? []).some(b => b.name === n)) : [];
      const div = document.createElement("div");
      div.className = "wodx-body wodx-scroll";
      div.innerHTML = `
        <header class="wodx-group-head">
          <input type="text" name="name" value="${esc(g.name)}" aria-label="Name" ${canEdit ? "" : "disabled"}>
          <select name="system.kind" data-fixed aria-label="Kind" ${canEdit ? "" : "disabled"}>${kindOptions}</select>
        </header>
        <h3>Members</h3>
        ${searchBox("table.wodx-group-roster", "Search members…", "Search members")}
        <table class="wodx-table wodx-group-roster"><thead><tr><th>Name</th><th>Sheet</th><th>Role</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="4">No members yet.</td></tr>`}</tbody></table>
        ${canEdit ? `<div class="form-group wodx-add-member">
          <label>Add</label>${searchBox("select.wodx-new-member", "Search characters…", "Search characters")}
          <select class="wodx-new-member" aria-label="Character to add">${candidates.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select>
          <button type="button" data-action="addMember" ${candidates.length ? "" : "disabled"}>Add member</button></div>` : ""}
        ${former.length ? `<p class="wodx-quiet">Former members: ${former.map(m => esc(m.actor?.name ?? "(missing)")).join(", ")}</p>` : ""}
        <h3>Pooled Backgrounds</h3>
        <p class="wodx-quiet">${pool ? `${esc(kinds[sys.kind] ?? sys.kind)} may pool: ${esc(pool.list.join(", "))} (${esc(pool.source)}).${pool.note ? ` ${esc(pool.note)}` : ""}` : "Which Backgrounds this kind of group may pool is the Storyteller's call (house rule)."}
          Everyone who puts dots in has equal use of the pool. A member who takes their dots out gets back one less.</p>
        ${searchBox("table.wodx-group-pools", "Search Backgrounds…", "Search Backgrounds")}
        <table class="wodx-table wodx-group-pools"><thead><tr><th>Background</th><th>Dots</th>${current.map(m => `<th>${esc(m.actor?.name ?? "")}</th>`).join("")}<th></th></tr></thead>
          <tbody>${bgs || `<tr><td colspan="${3 + current.length}">No pooled Backgrounds.</td></tr>`}</tbody></table>
        ${warnings.length ? `<ul class="wodx-warnings">${warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
        ${canEdit ? `<div class="form-group wodx-add-bg">
          <label>Pool</label>
          <input type="text" class="wodx-new-bg" list="wodx-bg-${g.id}" placeholder="Background" aria-label="Background to pool">
          <datalist id="wodx-bg-${g.id}">${suggestions.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>
          <button type="button" data-action="addBackground">Add Background</button></div>` : ""}
        <h3>Notes</h3>
        <textarea name="system.notes" rows="6" aria-label="Notes" ${canEdit ? "" : "disabled"}>${esc(sys.notes)}</textarea>`;
      return div;
    }

    _replaceHTML(result, content) {
      content.replaceChildren(result);
    }

    _onRender(context, options) {
      super._onRender?.(context, options);
      const el = this.element;
      for ( const i of el.querySelectorAll("input[data-role]") ) i.addEventListener("change", ev => this.#setRole(ev.target.dataset.role, ev.target.value));
      for ( const i of el.querySelectorAll("input[data-contrib]") ) i.addEventListener("change", ev => this.#setContribution(ev.target.dataset.contrib, ev.target.dataset.actor, ev.target.value));
      // Drop an actor from the sidebar onto the sheet to add it
      el.addEventListener("drop", ev => this.#onDrop(ev));
    }

    async #setRole(actorId, role) {
      const roster = foundry.utils.deepClone(this.group.system.roster ?? []);
      const r = roster.find(x => x.actorId === actorId && !x.left);
      if ( !r ) return;
      r.role = String(role).slice(0, 80);
      await this.group.update({"system.roster": roster});
    }

    async #setContribution(bgId, actorId, value) {
      const bgs = foundry.utils.deepClone(this.group.system.backgrounds ?? []);
      const b = bgs.find(x => x.id === bgId);
      if ( !b ) return;
      const n = Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
      b.contributions = {...(b.contributions ?? {})};
      if ( n ) b.contributions[actorId] = n; else delete b.contributions[actorId];
      await this.group.update({"system.backgrounds": bgs});
    }

    async #onDrop(ev) {
      try {
        const data = JSON.parse(ev.dataTransfer?.getData("text/plain") ?? "{}");
        if ( data.type !== "Actor" ) return;
        const actor = await fromUuid(data.uuid);
        if ( actor && this.group.isOwner ) await addMember(this.group, actor);
      } catch (err) { /* not an actor */ }
    }

    static async #onAddMember() {
      const id = this.element.querySelector("select.wodx-new-member")?.value;
      const actor = id ? game.actors.get(id) : null;
      if ( actor ) await addMember(this.group, actor);
    }

    static async #onRemoveMember(event, target) {
      const actor = game.actors.get(target.dataset.actor);
      const ok = await foundry.applications.api.DialogV2.confirm({
        classes: ["wodx", "wodx-dialog"], window: {title: "A member leaves"},
        content: `<p><strong>${esc(actor?.name ?? "This member")}</strong> leaves ${esc(this.group.name)}? They stay in the group's history. Their pooled dots come out, one short each (V20 Dark Ages p. 182); move them on their sheet.</p>`,
        rejectClose: false
      });
      if ( !ok ) return;
      const r = await removeMember(this.group, target.dataset.actor);
      if ( r?.back?.length ) await ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "WoDX"},
        content: `<div class="wodx-card"><p><strong>${esc(actor?.name ?? "A member")}</strong> leaves ${esc(this.group.name)}.</p><ul>${r.back.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>`});
    }

    static #onOpenMember(event, target) {
      game.actors.get(target.dataset.actor)?.sheet?.render(true);
    }

    static async #onAddBackground() {
      const name = String(this.element.querySelector("input.wodx-new-bg")?.value ?? "").trim();
      if ( !name ) return ui.notifications.warn("Name the Background to pool.");
      const bgs = foundry.utils.deepClone(this.group.system.backgrounds ?? []);
      if ( bgs.some(b => b.name.toLowerCase() === name.toLowerCase()) ) return ui.notifications.warn(`${name} is already pooled.`);
      const pool = poolableFor(this.group.system.kind);
      if ( pool && !pool.list.includes(name) ) ui.notifications.info(`${name} is not on the book's list for this kind of group (${pool.source}); added as the Storyteller's call.`);
      bgs.push({id: foundry.utils.randomID(), name, note: "", contributions: {}});
      await this.group.update({"system.backgrounds": bgs});
    }

    static async #onRemoveBackground(event, target) {
      const bgs = foundry.utils.deepClone(this.group.system.backgrounds ?? []);
      const b = bgs.find(x => x.id === target.dataset.bg);
      if ( !b ) return;
      const ok = await foundry.applications.api.DialogV2.confirm({
        classes: ["wodx", "wodx-dialog"], window: {title: "Stop pooling"},
        content: `<p>Stop pooling <strong>${esc(b.name)}</strong> (${poolTotal(b)} dots)? The dots go back to the members, one short each; move them on their sheets.</p>`,
        rejectClose: false
      });
      if ( !ok ) return;
      await this.group.update({"system.backgrounds": bgs.filter(x => x !== b), ...(this.group.system.anchorId === b.id ? {"system.anchorId": ""} : {})});
    }

    static async #onAnchor(event, target) {
      await this.group.update({"system.anchorId": target.dataset.bg});
    }
  };
}

let registered = null;
export function registerGroupSheet() {
  if ( registered ) return registered;
  const Sheet = makeGroupSheet();
  const Actors = foundry.documents?.collections?.Actors;
  if ( !Sheet || !Actors || !CONFIG.Actor?.dataModels?.Group ) return null;
  Actors.registerSheet(MODULE_ID, Sheet, {types: ["Group"], makeDefault: true, label: "WoDX Group"});
  registered = Sheet;
  return Sheet;
}
