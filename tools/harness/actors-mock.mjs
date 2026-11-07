/**
 * Actors, items, folders and scenes shaped like upstream worldofdarkness 7.3.2 data, for harness tests.
 * Actor.create runs a small copy of upstream's creation step: the sheet is built from template.json for its type,
 * the era's abilities are shown (assets/data/sheet/ability.js) and the Dark Ages secondary Abilities are added.
 */
import {readFileSync} from "node:fs";
import {join} from "node:path";

export function setPath(obj, path, value) {
  const parts = path.split("."); let o = obj;
  for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {});
  o[parts.at(-1)] = value;
}

export class Coll extends Map {
  find(f) { for ( const v of this.values() ) if ( f(v) ) return v; }
  filter(f) { return [...this.values()].filter(f); }
  some(f) { return [...this.values()].some(f); }
  getName(n) { return this.find(v => v.name === n); }
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
}

export async function installActors(root) {
  const sys = join(root, "system/worldofdarkness");
  const template = JSON.parse(readFileSync(join(sys, "template.json"), "utf8")).Actor;
  const {dataability} = await import(join(sys, "assets/data/sheet/ability.js"));
  game.worldofdarkness = {abilities: dataability};
  const merge = (a, b) => { for ( const [k, v] of Object.entries(b) ) { if ( v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" ) merge(a[k], v); else a[k] = structuredClone(v); } return a; };
  const systemFor = type => {
    const t = template[type];
    const out = {};
    for ( const name of t?.templates ?? [] ) merge(out, template.templates[name]);
    const {templates, ...own} = t ?? {};
    return merge(out, own);
  };
  const TYPE_LINE = {Mortal: "mortal", Vampire: "vampire", Werewolf: "werewolf", Mage: "mage"};
  const SECONDARY = {darkages: [["talent", "legerdemain"], ["skill", "archery"], ["skill", "commerce"], ["skill", "ride"], ["knowledge", "hearthwisdom"], ["knowledge", "seneschal"], ["knowledge", "theology"]],
    victorian: [["skill", "ride"]]};

  let ids = 0;
  const newId = () => `doc${String(++ids).padStart(13, "0")}`;
  class Item {
    constructor(data, parent) { Object.assign(this, structuredClone(data)); this.id = data._id ?? newId(); this.parent = parent; this.flags ??= {}; this.system ??= {}; this._stats = {createdTime: ++ids}; }
    async update(changes) { for ( const [k, v] of Object.entries(changes) ) setPath(this, k, v); return this; }
    getFlag(s, k) { return this.flags?.[s]?.[k]; }
  }
  class Actor {
    constructor(data) {
      const {items = [], ...rest} = structuredClone(data);
      Object.assign(this, rest);
      this.id = data._id ?? newId();
      this.flags ??= {};
      this.ownership ??= {default: 0};
      this.items = new Coll();
      for ( const i of items ) { const it = new Item(i, this); this.items.set(it.id, it); }
    }
    static async create(data) {
      data = structuredClone(data);
      if ( !data.system?.settings?.iscreated ) {
        // Upstream's _preCreate, in short: build the sheet for the era in force
        const line = TYPE_LINE[data.type];
        const era = CONFIG.worldofdarkness[`default${line ? line[0].toUpperCase() + line.slice(1) : "Mortal"}Era`] ?? "modern";
        const system = merge(systemFor(data.type), data.system ?? {});
        system.settings.iscreated = true;
        system.settings.era = CONFIG.worldofdarkness.era[era];
        const set = dataability[line ?? "mortal"]?.[era];
        for ( const [k, a] of Object.entries(system.abilities ?? {}) ) a.isvisible = !!set && [...set.talents, ...set.skills, ...set.knowledges].includes(k);
        if ( data.type === "Vampire" ) Object.assign(system.settings, {haspath: true, hasbloodpool: true, hasvirtue: true}), system.settings.powers.hasdisciplines = true;
        data.system = system;
        data.items = [...(data.items ?? []), ...(SECONDARY[era] ?? []).map(([g, k]) => ({name: `wod.abilities.${k}`, type: "Trait", system: {type: `wod.types.${g}secondability`, value: 0}}))];
      }
      const a = new Actor(data);
      game.actors.set(a.id, a);
      return a;
    }
    getFlag(s, k) { return this.flags?.[s]?.[k]; }
    async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); return this; }
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; }
    async update(changes) {
      for ( const [k, v] of Object.entries(changes) ) {
        const del = k.match(/^(.*)\.-=(.+)$/);
        if ( del ) { let o = this; for ( const p of del[1].split(".") ) o = o?.[p]; if ( o ) delete o[del[2]]; }
        else setPath(this, k, v);
      }
      return this;
    }
    async createEmbeddedDocuments(type, list) {
      if ( type !== "Item" ) throw new Error(`Unexpected embedded type ${type}`);
      return list.map(d => { const it = new Item(d, this); this.items.set(it.id, it); return it; });
    }
    toObject() { const {items, ...rest} = this; return structuredClone({...rest, _id: this.id, items: [...items.values()].map(i => { const {parent, ...r} = i; return {...structuredClone(r), _id: i.id}; })}); }
    testUserPermission(user) { return user.isGM || (this.ownership?.[user.id] ?? this.ownership?.default ?? 0) >= 3; }
    get isOwner() { return this.testUserPermission(game.user); }
    get hasPlayerOwner() { return Object.entries(this.ownership).some(([id, l]) => id !== "default" && l >= 3 && !game.users.get(id)?.isGM); }
  }
  globalThis.Actor = Actor;
  game.actors = new Coll();
  game.scenes ??= new Coll();
  return {Actor, Item};
}
