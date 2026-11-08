/**
 * WoDX Creation — the First Change (Phase 6b). A mortal (often Kinfolk) becomes a Garou: a new Werewolf sheet is made
 * and the system builds its forms; the mortal's Traits and items are copied across; breed, auspice and tribe set the
 * starting Rage, Gnosis, Willpower, Renown and three Gifts (DA:W pp. 79–85, 107). The mortal sheet stays, linked.
 * Rules data comes from WoDX Actions (data/garou.json and the Gift library).
 */
import {MODULE_ID, esc, lineOf, lineage} from "./actor-data.mjs";
import {setLineage, setChronology, writeLineageJournal, dateLabel} from "./lineage.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const BEFORE_FOLDER = "WoDX · Before the First Change";
const COPY = ["player", "nature", "demeanor", "concept", "appearance", "background", "roleplaytip", "derangement", "notes", "gear", "money", "traits"];

const actions = () => game.wodxActions ?? game.modules.get("wodx-actions")?.api ?? null;
const GD = () => actions()?.garouRules?.data?.()?.garou ?? null;

/** Who can undergo the First Change: a mortal sheet that has not already changed. */
export function canChange(actor) {
  return lineOf(actor) === "mortal" && !lineage(actor).became;
}

/** Starting traits for a breed, auspice and tribe (DA:W pp. 80–85). Ragabash pick their own three Renown. */
export function startingTraits({breed, auspice, tribe}, D = GD()) {
  const b = D?.breeds?.[breed], a = D?.auspices?.[auspice], t = D?.tribes?.[tribe];
  const renown = {glory: 0, honor: 0, wisdom: 0};
  for ( const [k, v] of Object.entries(a?.renown ?? {}) ) if ( k in renown ) renown[k] = v;
  if ( a?.renown?.any ) { renown.glory = 1; renown.honor = 1; renown.wisdom = 1; }
  return {
    rage: a?.rage ?? 1, gnosis: b?.gnosis ?? 1, willpower: t?.willpower ?? 3, renown,
    gifts: [...(b?.gifts ?? []).slice(0, 3), ...(a?.gifts ?? []), ...(t?.gifts ?? [])],
    lupusOnly: !!t?.lupusOnly, notes: [t?.noBackgrounds?.length ? `${t.label} may not take ${t.noBackgrounds.join(", ")}.` : "",
      t?.minBackgrounds ? `${t.label} need ${Object.entries(t.minBackgrounds).map(([k, v]) => `${k} ${v}`).join(", ")}.` : "",
      t?.doubleCost?.length ? `${t.label} pay double for ${t.doubleCost.join(" and ")}.` : ""].filter(Boolean)
  };
}

/** The Werewolf sheet's data, from the mortal's. Pure apart from CONFIG; nothing is saved. */
export function firstChangeData(mortal, {breed, auspice, tribe, rage, gnosis, willpower, renown, eraKey}) {
  const src = mortal.toObject();
  const sys = {};
  for ( const k of COPY ) if ( src.system?.[k] !== undefined ) sys[k] = foundry.utils.deepClone(src.system[k]);
  // Attribute and Ability dots only: the Werewolf sheet keeps its own labels, visibility and form bonuses
  const dots = {};
  for ( const [k, a] of Object.entries(src.system?.attributes ?? {}) ) if ( a && typeof a === "object" && "value" in a ) dots[`system.attributes.${k}.value`] = Number(a.value) || 0;
  for ( const [k, a] of Object.entries(src.system?.abilities ?? {}) ) if ( a && typeof a === "object" && "value" in a ) {
    dots[`system.abilities.${k}.value`] = Number(a.value) || 0;
    if ( Number(a.value) > 0 ) dots[`system.abilities.${k}.isvisible`] = true;
  }
  const D = GD();
  sys.breed = `wod.bio.breedname.${breed}`;
  sys.auspice = `wod.bio.auspicename.${auspice}`;
  sys.tribe = "custom";
  sys.custom = {tribe: D?.tribes?.[tribe]?.label ?? tribe};
  sys.changingbreed = "";
  const wp = Math.max(Number(willpower) || 3, 1);
  sys.advantages = {
    rage: {permanent: rage, temporary: rage}, gnosis: {permanent: gnosis, temporary: gnosis},
    willpower: {permanent: wp, temporary: wp}
  };
  sys.renown = {rank: 1, glory: {permanent: renown.glory, temporary: 0}, honor: {permanent: renown.honor, temporary: 0},
    wisdom: {permanent: renown.wisdom, temporary: 0}};
  // Every Garou has at least a dot of Primal-Urge once the wolf wakes (house rule)
  dots["system.abilities.primalurge.value"] = Math.max(1, Number(src.system?.abilities?.primalurge?.value) || 0);
  dots["system.abilities.primalurge.isvisible"] = true;
  const health = foundry.utils.deepClone(src.system?.health?.damage ?? null);
  const items = (src.items ?? []).map(i => { const c = {...i}; delete c._id; return c; });
  const flags = foundry.utils.deepClone(src.flags ?? {});
  delete flags[MODULE_ID];
  return {
    // Created bare so the system builds the Werewolf's settings, shapes and form bonuses; the rest is applied after
    create: {name: mortal.name, type: CONFIG.worldofdarkness?.sheettype?.werewolf ?? "Werewolf", img: src.img, folder: src.folder ?? null,
      ownership: src.ownership, prototypeToken: src.prototypeToken, flags,
      system: {settings: {iscreated: false}}},
    // isupdated false: the system works out the new sheet's totals after this update
    update: {...Object.fromEntries(Object.entries(sys).map(([k, v]) => [`system.${k}`, v])), ...dots, ...(health ? {"system.health.damage": health} : {}),
      "system.settings.isupdated": false},
    items, eraKey
  };
}

/** GM: the First Change. Returns the new Werewolf. */
export async function firstChange(mortal, {breed = "homid", auspice = "ragabash", tribe = "fianna", rage, gnosis, willpower, renown, gifts = [],
  time = game.time.worldTime, moveTokens = true} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !canChange(mortal) ) throw new Error(`${mortal?.name} is not a mortal who can undergo the First Change`);
  const A = actions();
  if ( !A?.garouRules ) throw new Error("The First Change needs WoDX Actions (its Werewolf rules and Gift library).");
  await A.garouRules.loadData?.();
  const st = startingTraits({breed, auspice, tribe});
  const era = game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id;
  const eraKey = ["dark-ages", "long-night"].includes(era) ? "darkages" : era === "victorian" ? "victorian" : "modern";
  const built = firstChangeData(mortal, {breed, auspice, tribe, rage: rage ?? st.rage, gnosis: gnosis ?? st.gnosis,
    willpower: willpower ?? Math.max(st.willpower, Number(mortal.system?.advantages?.willpower?.permanent) || 0), renown: renown ?? st.renown, eraKey});
  const wolf = await Actor.create(built.create);
  await wolf.update(built.update);
  if ( CONFIG.worldofdarkness?.era?.[eraKey] ) await wolf.update({"system.settings.era": CONFIG.worldofdarkness.era[eraKey]});
  // The mortal's items come across; ability items the system already made are not doubled
  const have = new Set([...(wolf.items ?? [])].map(i => `${i.type}|${i.name}`.toLowerCase()));
  const carry = built.items.filter(i => !have.has(`${i.type}|${i.name}`.toLowerCase()));
  const lib = A.gifts?.() ?? [];
  const giftData = gifts.map(id => lib.find(g => g.id === id)).filter(Boolean).filter(g => !have.has(`power|${g.n}`.toLowerCase()));
  const all = [...carry, ...giftData.map(g => A.giftItem(g))];
  if ( all.length ) await wolf.createEmbeddedDocuments("Item", all);

  const before = lineage(mortal);
  await setLineage(wolf, {formerly: {id: mortal.id, name: mortal.name}, bonds: before.bonds ?? {}});
  await setChronology(wolf, {firstChange: time});
  await setLineage(mortal, {became: {id: wolf.id, name: wolf.name}});
  await setChronology(mortal, {firstChange: time});

  const folder = game.folders.find(f => f.type === "Actor" && f.name === BEFORE_FOLDER)
    ?? await Folder.create({name: BEFORE_FOLDER, type: "Actor", flags: {[MODULE_ID]: {kind: "before-first-change"}}});
  await mortal.update({folder: folder.id});

  let moved = 0;
  if ( moveTokens ) {
    for ( const scene of game.scenes ?? [] ) {
      const tokens = [...(scene.tokens ?? [])].filter(t => t.actorId === mortal.id);
      if ( !tokens.length ) continue;
      await scene.updateEmbeddedDocuments("Token", tokens.map(t => ({_id: t.id, actorId: wolf.id})));
      moved += tokens.length;
    }
  }
  const D = GD();
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-embrace"><h3>The First Change</h3>
      <p><strong>${esc(wolf.name)}</strong> wakes as Garou: ${esc(D?.breeds?.[breed]?.label ?? breed)}, ${esc(D?.auspices?.[auspice]?.label ?? auspice)}, ${esc(D?.tribes?.[tribe]?.label ?? tribe)}.</p>
      <p>Rage ${built.update["system.advantages"].rage.permanent}, Gnosis ${built.update["system.advantages"].gnosis.permanent}, Willpower ${built.update["system.advantages"].willpower.permanent}; Rank 1 (Cliath).
        ${giftData.length ? `Gifts: ${esc(giftData.map(g => g.n).join(", "))}.` : ""}</p>
      ${st.notes.length ? `<p class="wodx-quiet">${esc(st.notes.join(" "))}</p>` : ""}
      <p class="wodx-quiet">DA:W pp. 79–85. ${esc(dateLabel(time))}</p></div>`,
    speaker: {alias: "Chronicle"},
    whisper: game.users.filter(u => u.isGM || wolf.testUserPermission?.(u, "OWNER")).map(u => u.id)
  });
  await writeLineageJournal();
  ui.notifications.info(`${wolf.name} undergoes the First Change.${moved ? ` ${moved} token(s) now show the Garou.` : ""}`);
  return wolf;
}

const byName = (a, b) => a.name.localeCompare(b.name);
const opts = (rows, sel) => rows.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(l)}</option>`).join("");

/** GM: the First Change dialog. */
export async function firstChangeDialog() {
  if ( !game.user.isGM ) return null;
  const A = actions();
  if ( !A?.garouRules ) return ui.notifications.warn("The First Change needs WoDX Actions.");
  await A.garouRules.loadData?.();
  const D = GD();
  const mortals = game.actors.filter(canChange).sort(byName);
  if ( !mortals.length ) return ui.notifications.warn("There is no mortal to undergo the First Change.");
  const sel = canvas?.tokens?.controlled?.[0]?.actor;
  const pick = sel && canChange(sel) ? sel : mortals[0];
  const kin = a => a.getFlag?.("world", "wodx")?.kinfolk;
  const tribeOf = a => (kin(a) && D.tribes[kin(a)]) ? kin(a) : "fianna";
  const lib = A.gifts();
  const giftRows = lib.filter(g => g.l === 1);
  const {DialogV2} = foundry.applications.api;
  const sync = form => {
    const f = form.elements;
    const st = startingTraits({breed: f.breed.value, auspice: f.auspice.value, tribe: f.tribe.value}, D);
    f.rage.value = st.rage; f.gnosis.value = st.gnosis; f.willpower.value = st.willpower;
    for ( const k of ["glory", "honor", "wisdom"] ) f[k].value = st.renown[k];
    // The breed's, auspice's and tribe's own Gifts go to the top, marked; the player picks one of each
    const src = {};
    for ( const [part, key] of [["breed", f.breed.value], ["auspice", f.auspice.value], ["tribe", f.tribe.value]] )
      for ( const n of (D[`${part}s`]?.[key]?.gifts ?? []) ) (src[n.toLowerCase()] ??= []).push(part);
    const ul = form.querySelector("ul.wodx-fc-gifts");
    const items = [...ul.children];
    for ( const li of items ) {
      const c = li.querySelector("input[name=gift]");
      const from = src[c.dataset.name.toLowerCase()];
      li.querySelector(".wodx-fc-tag").textContent = from ? ` (${from.join(", ")})` : "";
      li.dataset.start = from ? "1" : "";
    }
    items.sort((x, y) => (y.dataset.start === "1") - (x.dataset.start === "1")).forEach(li => ul.appendChild(li));
    form.querySelector(".wodx-fc-notes").textContent = [st.lupusOnly && f.breed.value !== "lupus" ? "Red Talons are lupus only (DA:W p. 84)." : "", ...st.notes].filter(Boolean).join(" ");
  };
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "The First Change"},
    position: {width: 560},
    content: `
      <p>A mortal's Garou blood wakes (DA:W pp. 79–85). A Werewolf sheet is made from the mortal's; the mortal sheet is kept,
        in the folder "${BEFORE_FOLDER}". Kinfolk start with their tribe chosen.</p>
      <div class="form-group"><label>Mortal</label>${searchBox("select[name=mortal]", "Search mortals…", "Search mortals")}<select name="mortal">${opts(mortals.map(a => [a.id, `${a.name}${kin(a) ? " (Kinfolk)" : ""}`]), pick.id)}</select></div>
      <div class="form-group"><label>Breed</label><select name="breed">${opts(Object.entries(D.breeds).map(([k, v]) => [k, v.label]), "homid")}</select></div>
      <div class="form-group"><label>Auspice</label><select name="auspice">${opts(Object.entries(D.auspices).map(([k, v]) => [k, v.label]), "ragabash")}</select></div>
      <div class="form-group"><label>Tribe</label>${searchBox("select[name=tribe]", "Search tribes…", "Search tribes")}<select name="tribe">${opts(Object.entries(D.tribes).map(([k, v]) => [k, v.label]), tribeOf(pick))}</select></div>
      <div class="form-group"><label>Rage · Gnosis · Willpower</label><input type="number" name="rage" min="1" max="10"><input type="number" name="gnosis" min="1" max="10"><input type="number" name="willpower" min="1" max="10"></div>
      <div class="form-group"><label>Glory · Honor · Wisdom</label><input type="number" name="glory" min="0" max="10"><input type="number" name="honor" min="0" max="10"><input type="number" name="wisdom" min="0" max="10"></div>
      <fieldset><legend>Starting Gifts: one each from breed, auspice and tribe, marked at the top (DA:W p. 107)</legend>
        ${searchBox("ul.wodx-fc-gifts", "Search Gifts…", "Search Gifts")}
        <ul class="wodx-fc-gifts" style="max-height:220px;overflow-y:auto;flex:none;list-style:none;padding-left:0">${giftRows.map(g =>
          `<li data-search-item><label><input type="checkbox" name="gift" value="${esc(g.id)}" data-name="${esc(g.n)}"> ${esc(g.n)} <b class="wodx-fc-tag"></b> <span class="wodx-quiet">(${esc(g.g.join(", "))}; p. ${g.p})</span></label></li>`).join("")}</ul>
      </fieldset>
      <p class="wodx-fc-notes wodx-quiet"></p>
      <div class="form-group"><label><input type="checkbox" name="moveTokens" checked> Tokens of the mortal become the Garou</label></div>`,
    render: (event, dialog) => {
      const form = dialog.element.querySelector("form");
      if ( !form ) return;
      sync(form);
      for ( const n of ["breed", "auspice", "tribe"] ) form.elements[n].addEventListener("change", () => sync(form));
      form.elements.mortal.addEventListener("change", () => { const a = game.actors.get(form.elements.mortal.value); if ( a ) { form.elements.tribe.value = tribeOf(a); sync(form); } });
    },
    ok: {
      label: "Change",
      callback: (event, button) => {
        const f = button.form.elements, form = button.form;
        return {mortal: f.mortal.value, breed: f.breed.value, auspice: f.auspice.value, tribe: f.tribe.value,
          rage: Number(f.rage.value), gnosis: Number(f.gnosis.value), willpower: Number(f.willpower.value),
          renown: {glory: Number(f.glory.value), honor: Number(f.honor.value), wisdom: Number(f.wisdom.value)},
          gifts: [...form.querySelectorAll("input[name=gift]:checked")].map(c => c.value), moveTokens: f.moveTokens.checked};
      }
    },
    rejectClose: false
  });
  if ( !result ) return null;
  const mortal = game.actors.get(result.mortal);
  return firstChange(mortal, result);
}
