/**
 * WoDX Library: the Hunter kit for the wonders registry (B3717-B3719). Inquisitors' blessings and relics. Data in
 * data/wonders-hunter.mjs; no Foundry calls here except in after(), which gets the actor.
 *
 *   Who: hunters in the inquisitor years (before 1500, as WoDX Actions' hunterLine reads them) with Conviction or an
 *     order. Their True Faith equivalent comes from their stage (Dark Ages: Inquisitor p. 158), or a True Faith Background.
 *   Bless water, salt or a weapon: one roll of Charisma + Religion at 6 and a Willpower point (a house reading, B3719).
 *     Water and salt are made, a vial or a line a success; a weapon carried is marked. All of it lasts the scene: the
 *     Storyteller (or the user) ends it with a button.
 *   Enshrine a relic: an order's work on a carried thing; Intelligence + Religion at 7, ten successes, a roll a week;
 *     the Storyteller approves the thing as truly holy before it starts. Its rating is a success in five, 1 to 3; the
 *     Storyteller can raise it on the item.
 */
import * as H from "../data/wonders-hunter.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const WILL = "system.advantages.willpower.temporary";
const DA_UNTIL = 1500;
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const NOT_THINGS = ["Power", "Ability", "Advantage", "Sphere", "Realm", "Bonus", "Experience", "Feature", "Splat", "Trait"];
const STAGE_FAITH = {servant: 1, acolyte: 2, advocate: 3, judge: 4};
const stageOf = f => { const t = n(f.faith) + n(f.wisdom) + n(f.zeal); return t >= 10 ? "judge" : t >= 5 ? "advocate" : t >= 1 ? "acolyte" : "servant"; };
const WEAPONS = ["Melee Weapon", "Ranged Weapon"];

export const hunterKit = {
  title: "Inquisitors: blessings and relics",
  noun: "a blessing or a relic",
  setting: "craftHunter",
  settingName: "Blessings and relics (inquisitors)",
  settingHint: "Inquisitors of the Dark Ages bless water, salt and weapons for a scene, and their orders enshrine relics. The books have no such rules; this is a house rule, always approved by the Storyteller.",
  settingDefault: true,
  ref: "Dark Ages: Inquisitor pp. 156 and 158; V20 Dark Ages True Faith pdf 393 to 396.",
  rows: () => H.ROWS,
  row: key => H.byKey[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const items = a.items ?? [];
    const f = a.flags?.["wodx-actions"]?.inquisitor ?? {};
    const tf = items.filter(i => /true faith/i.test(String(i.name ?? ""))).reduce((m, i) => Math.max(m, n(i.system?.value)), 0);
    const stage = stageOf(f);
    return {profile: ctx.profile ?? "mortal", year: n(ctx.year), name: String(a.name ?? ""), order: String(f.order ?? ""), conviction: n(f.conviction),
      stage, faithRating: Math.max(tf, f.order || n(f.conviction) ? STAGE_FAITH[stage] : 0),
      willpower: n(a.system?.advantages?.willpower?.temporary),
      objects: items.filter(i => i?.type && !NOT_THINGS.includes(i.type)).map(i => ({id: String(i._id ?? i.id ?? ""), name: String(i.name ?? ""), type: i.type,
        wonder: i.flags?.["wodx-library"]?.wonder?.spent ? "" : i.flags?.["wodx-library"]?.wonder?.key ?? ""}))};
  },
  makerOf: f => ({...f, kind: f.profile === "hunter" && (!f.year || f.year < DA_UNTIL) && (f.order || f.conviction > 0) ? "inquisitor" : null}),
  listFor: m => (m?.kind ? H.ROWS.filter(r => r.kind !== "relic" || m.order) : []),

  blockers(r, m = {}, o = {}) {
    const out = [];
    if ( !r ) return ["no such work"];
    if ( !m.kind ) return [m.year >= DA_UNTIL ? "only the inquisitors of the Dark Ages bless and enshrine (later hunters have no such rite)" : "only inquisitors bless and enshrine"];
    if ( r.kind === "bless" && n(m.willpower) < 1 ) out.push("needs a Willpower point for the prayer");
    if ( r.kind === "relic" && !m.order ) out.push("only an order can keep the rites of a relic");
    const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    if ( (r.item === "weapon" || r.kind === "relic") && !t ) out.push(r.kind === "relic" ? "pick the remains or the saint's thing" : "pick the weapon to bless");
    if ( r.item === "weapon" && t && !WEAPONS.includes(t.type) ) out.push(`${t.name} is not a weapon`);
    if ( t?.wonder ) out.push(`${t.name} already holds something`);
    return out;
  },
  cautions(r) {
    const out = ["The books give no rule for this; it is WoDX's house rule from Ben's pick, and the Storyteller approves each one."];
    if ( r.kind === "relic" ) out.push("V20 Dark Ages holds that Holy Artifacts arise on their own: the Storyteller judges whether the remains are truly holy before the rites begin.");
    return out;
  },
  fields(m = {}) {
    const objs = (m.objects ?? []).filter(x => !x.wonder);
    return [{name: "target", label: "The weapon, or the remains to enshrine", type: "select", value: "", options: [["", "(none)"], ...objs.map(x => [x.id, `${x.name} (${x.type})`])]}];
  },

  taskFor(r, m = {}, o = {}) {
    const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    const opts = {target: t?.id ?? "", targetName: t?.name ?? "", faith: Math.max(1, n(m.faithRating)), order: m.order ?? ""};
    const ref = `${r.book} p. ${r.page}; ${H.DA} pdf ${r.pdf}`;
    if ( r.kind === "relic" ) return {kind: "wonder", line: "hunter", name: `Enshrine ${t?.name ?? "a relic"}`, attr: "intelligence", ability: "religion", diff: 7,
      goal: 10, interval: "week", delicate: true, delay: 0, opts, note: `Weeks of vigil and rite; Intelligence + Religion at 7, ten successes (${ref}).`};
    return {kind: "wonder", line: "hunter", name: `${r.name}${t ? `: ${t.name}` : ""}`, attr: "charisma", ability: "religion", diff: 6, goal: 1, interval: "hour",
      maxRolls: 1, delicate: false, delay: 0, opts, perRoll: [{path: WILL, amount: 1, label: "A Willpower point for the prayer", floor: 0}],
      note: `A prayer: Charisma + Religion at 6 and a Willpower point (${ref}).`};
  },

  flagFor(r, {maker = "", at = 0, task = {}, successes = 1} = {}) {
    const o = task.opts ?? {}, ref = `${r.book} p. ${r.page}; ${H.DA} pdf ${r.pdf}`, faith = Math.max(1, n(o.faith));
    const base = {key: r.key, line: "hunter", kind: r.kind, maker: String(maker), at: n(at), ref, does: r.does};
    if ( r.kind === "relic" ) {
      const rating = Math.max(1, Math.min(3, Math.floor(n(successes) / 5) || 1));
      return {...base, relic: {rating, order: o.order}, powers: [
        {id: "pray", label: `Pray over it (True Faith ${rating}, once a story)`, roll: {dice: rating, diff: 6},
          text: "Successes draw back Conviction for an inquisitor, once a story (Dark Ages: Inquisitor p. 156); anyone faithful holding it adds its rating to their True Faith."}]};
    }
    const holy = {id: "present", label: `Raise it against the dark (True Faith ${faith})`, spend: {pool: `actor:${WILL}`, amount: 1},
      text: `Roll ${faith} against the creature's current Willpower: each success a turn it flees, or aggravated harm if it is touched (V20 Dark Ages pdf 394).`};
    const end = {id: "end", label: "The scene is over", consume: true, text: "The blessing fades."};
    if ( r.item === "weapon" ) return {...base, blessed: {faith}, powers: [holy, end]};
    return {...base, blessed: {faith}, uses: {value: Math.max(1, n(successes)), max: Math.max(1, n(successes))}, spentText: "None is left.",
      powers: [{...holy, label: r.item === "salt" ? `Pour the line (True Faith ${faith})` : holy.label}, end]};
  },

  itemsFor(r, {maker = "", at = 0, task = {}, successes = 1} = {}) {
    if ( !r || task.opts?.target ) return [];
    const flag = hunterKit.flagFor(r, {maker, at, task, successes});
    return [{name: r.item === "salt" ? "Blessed salt" : "Holy water", type: "Item", img: "icons/svg/holy-shield.svg",
      system: {description: para(r.does) + para("It lasts the scene.") + para(`${flag.ref}.`), reference: flag.ref}, flags: {"wodx-library": {wonder: flag}}}];
  },
  marks: (r, t = {}) => !!t.opts?.target,
  costs: () => [],

  /** Bless the weapon or enshrine the relic on the carried thing. */
  async after({row: r, task: t = {}, status, services = {}} = {}) {
    const a = services.actor, o = t.opts ?? {};
    if ( status === "ruined" ) return [r.kind === "relic" ? "The rites are broken; the order must begin again." : "The prayer goes unanswered."];
    if ( status !== "done" || !a || !o.target ) return [];
    const it = a.items?.get?.(o.target);
    if ( !it ) return ["The thing was not there at the end."];
    const flag = hunterKit.flagFor(r, {maker: a.name, at: globalThis.game?.time?.worldTime ?? 0, task: t, successes: n(t.total)});
    await it.update({"flags.wodx-library.wonder": flag, ...(r.kind === "relic" ? {"system.description": `${it.system?.description ?? ""}${para(r.does)}`} : {})});
    return [r.kind === "relic" ? `${it.name} is enshrined: a relic of True Faith ${flag.relic.rating}.` : `${it.name} is blessed for the scene.`];
  },
  label: r => r.name,
  detail: (r, t = {}) => t.note ?? "",
  intro: m => `${m.order ? "Order member" : "Inquisitor"}, True Faith equivalent ${n(m.faithRating)}, Willpower ${n(m.willpower)}.`,
  approvalText: "is it truly holy, and is the prayer sincere?"
};

registerLine("hunter", hunterKit);
