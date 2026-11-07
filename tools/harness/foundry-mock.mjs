/**
 * A small stand-in for Foundry VTT 14's client, enough to run WoDX modules' logic in Node.
 * It is not Foundry: every API a module uses must still be checked against the installed Foundry source.
 */
import {JSDOM} from "jsdom";
import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";

export function installMock({dataRoot, worldFlags = {wodx: {phase: 1}}, worldId = "test-world"} = {}) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://localhost:30000/game"});
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Event = dom.window.Event;

  const log = {notifications: [], chat: [], socket: [], paused: [], errors: []};

  /* Hooks */
  const hooks = new Map();
  globalThis.Hooks = {
    on: (name, fn) => { if ( !hooks.has(name) ) hooks.set(name, []); hooks.get(name).push({fn, once: false}); },
    once: (name, fn) => { if ( !hooks.has(name) ) hooks.set(name, []); hooks.get(name).push({fn, once: true}); },
    callAll: (name, ...args) => {
      const list = hooks.get(name) ?? [];
      const results = list.map(h => h.fn(...args));
      hooks.set(name, list.filter(h => !h.once));
      return Promise.all(results.map(r => Promise.resolve(r)));
    }
  };

  /* Utils */
  let idCounter = 0;
  const utils = {
    deepClone: o => (o === undefined ? o : structuredClone(o)),
    randomID: () => `id${(++idCounter).toString().padStart(14, "0")}`,
    getRoute: p => `/${p}`,
    isSubclass: (a, b) => a === b || a.prototype instanceof b
  };

  /* Calendar base: holds config like Foundry's DataModel would */
  class CalendarData {
    constructor(config) { Object.assign(this, structuredClone(config)); }
    static formatTimestamp(cal, c) { return `${c.year}-${c.month + 1}-${c.dayOfMonth + 1}`; }
  }
  const SIMPLIFIED = {
    name: "Simplified Gregorian", description: "",
    years: {yearZero: 0, firstWeekday: 0, leapYear: {leapStart: 8, leapInterval: 4}},
    months: {values: Array.from({length: 12}, (_, i) => ({name: `M${i + 1}`, ordinal: i + 1, days: 30}))},
    days: {values: Array.from({length: 7}, (_, i) => ({name: `D${i + 1}`, ordinal: i + 1})), daysPerYear: 365,
      hoursPerDay: 24, minutesPerHour: 60, secondsPerMinute: 60},
    seasons: {values: [{name: "Spring", monthStart: 3, monthEnd: 5}, {name: "Summer", monthStart: 6, monthEnd: 8},
      {name: "Fall", monthStart: 9, monthEnd: 11}, {name: "Winter", monthStart: 12, monthEnd: 2}]}
  };

  /* Applications */
  class ApplicationV2 {
    static DEFAULT_OPTIONS = {};
    constructor(options = {}) { this.options = {...this.constructor.DEFAULT_OPTIONS, ...options}; this.rendered = false; }
    async render() {
      if ( !this.element ) {
        this.element = document.createElement(this.options.tag ?? "div");
        this.content = document.createElement("section");
        this.content.className = "window-content";
        this.element.append(this.content);
        document.body.append(this.element);
        this.element.addEventListener("click", ev => {
          const target = ev.target.closest("[data-action]");
          if ( !target ) return;
          const handler = this.constructor.DEFAULT_OPTIONS.actions?.[target.dataset.action];
          if ( handler ) this._pending = handler.call(this, ev, target);
        });
        if ( this.options.tag === "form" ) {
          this.element.addEventListener("submit", ev => {
            ev.preventDefault();
            this._pending = this.constructor.DEFAULT_OPTIONS.form.handler.call(this, ev, this.element, {});
          });
        }
      }
      const result = await this._renderHTML({}, {});
      this._replaceHTML(result, this.content, {});
      this.rendered = true;
      await this._onRender?.({}, {});
      return this;
    }
    /** Test helper: click a data-action element and wait for its handler. */
    async click(selector) {
      const el = this.element.querySelector(selector);
      if ( !el ) throw new Error(`No element ${selector}`);
      el.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
      await this._pending;
    }
    async submit() {
      this.element.dispatchEvent(new window.Event("submit", {bubbles: true, cancelable: true}));
      await this._pending;
    }
    close() { this.rendered = false; }
  }

  const dialogQueue = [];
  class DialogV2 {
    /** Tests push a function per expected dialog: (form) => "ok" | null to dismiss */
    static queue(fn) { dialogQueue.push(fn); }
    static async prompt({content, ok}) {
      const fn = dialogQueue.shift();
      if ( !fn ) throw new Error("Unexpected dialog");
      const form = document.createElement("form");
      form.innerHTML = content;
      const go = await fn(form);
      if ( !go ) return null;
      return ok.callback(new window.Event("click"), {form}, {});
    }
    static async confirm() {
      const fn = dialogQueue.shift();
      if ( !fn ) throw new Error("Unexpected confirm");
      return !!(await fn());
    }
  }

  globalThis.foundry = {
    utils,
    data: {CalendarData, SIMPLIFIED_GREGORIAN_CALENDAR_CONFIG: SIMPLIFIED},
    applications: {api: {ApplicationV2, DialogV2}}
  };

  globalThis.CONST = {DOCUMENT_OWNERSHIP_LEVELS: {NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3}};
  globalThis.CONFIG = {
    time: {worldCalendarClass: CalendarData, worldCalendarConfig: SIMPLIFIED, formatters: {timestamp: CalendarData.formatTimestamp}},
    worldofdarkness: {
      era: {modern: "wod.era.modern", victorian: "wod.era.victorian", darkages: "wod.era.darkages",
        classical: "wod.era.classical", livinggods: "wod.era.livinggods"},
      sheettype: {mortal: "Mortal", vampire: "Vampire", werewolf: "Werewolf", mage: "Mage"},
      defaultMortalEra: "modern", defaultVampireEra: "modern", defaultWerewolfEra: "modern", defaultMageEra: "modern"
    }
  };
  globalThis.ui = {
    notifications: {
      info: m => log.notifications.push(["info", m]),
      warn: m => log.notifications.push(["warn", m]),
      error: m => log.notifications.push(["error", m])
    }
  };

  /* Documents */
  class Doc {
    constructor(data) { Object.assign(this, structuredClone(data)); this.id ??= utils.randomID(); this.flags ??= {}; }
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
    async setFlag(scope, key, value) { this.flags[scope] ??= {}; this.flags[scope][key] = structuredClone(value); return this; }
    get sheet() { return {render: () => { this.sheetOpened = true; }}; }
  }
  class Collection extends Map {
    find(fn) { for ( const v of this.values() ) if ( fn(v) ) return v; return undefined; }
    filter(fn) { return [...this.values()].filter(fn); }
    getName(n) { return this.find(v => v.name === n); }
    get contents() { return [...this.values()]; }
  }
  class Page extends Doc {
    async update(changes) { for ( const [k, v] of Object.entries(changes) ) foundry.utils.setPath?.(this, k, v) ?? setPath(this, k, v); return this; }
  }
  function setPath(obj, path, value) {
    const parts = path.split("."); let o = obj;
    for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {});
    o[parts.at(-1)] = value;
  }
  class JournalEntry extends Doc {
    constructor(data) {
      const {pages = [], ...rest} = data;
      super(rest);
      this.pages = new Collection();
      for ( const p of pages ) { const page = new Page(p); this.pages.set(page.id, page); }
    }
    static async create(data) { const j = new JournalEntry(data); game.journal.set(j.id, j); return j; }
    async createEmbeddedDocuments(type, list) { return list.map(p => { const page = new Page(p); this.pages.set(page.id, page); return page; }); }
  }
  /** Imitates the upstream system's _preCreate: era from CONFIG defaults, some abilities shown. */
  class Actor extends Doc {
    static async create(data) {
      const line = Object.entries(CONFIG.worldofdarkness.sheettype).find(([, t]) => t === data.type)?.[0];
      if ( !line ) throw new Error(`Unknown actor type ${data.type}`);
      const key = CONFIG.worldofdarkness[`default${line[0].toUpperCase()}${line.slice(1)}Era`];
      const valid = {mortal: ["modern", "victorian", "darkages", "classical", "livinggods"], vampire: ["modern", "victorian", "darkages", "classical", "livinggods"],
        werewolf: ["modern", "victorian", "darkages"], mage: ["modern", "victorian"]}[line];
      if ( !valid.includes(key) ) throw new TypeError(`Cannot read properties of undefined (reading 'talents') for ${line}/${key}`);
      const a = new Actor({...data, system: {settings: {era: CONFIG.worldofdarkness.era[key]}, abilities: {a: {isvisible: true}, b: {isvisible: true}, c: {isvisible: false}}}});
      game.actors.set(a.id, a);
      return a;
    }
  }
  class Folder extends Doc {
    static async create(data) { const f = new Folder(data); game.folders.set(f.id, f); return f; }
  }
  globalThis.JournalEntry = JournalEntry;
  globalThis.Actor = Actor;
  globalThis.Folder = Folder;
  globalThis.ChatMessage = {create: async data => { log.chat.push(data); return data; }};

  /* Settings */
  const registered = new Map();
  const values = new Map();
  const settings = {
    register(ns, key, data) { registered.set(`${ns}.${key}`, data); },
    registerMenu() {},
    get(ns, key) {
      const k = `${ns}.${key}`;
      if ( !registered.has(k) ) throw new Error(`Setting ${k} is not registered`);
      return values.has(k) ? structuredClone(values.get(k)) : structuredClone(registered.get(k).default);
    },
    async set(ns, key, value) {
      const k = `${ns}.${key}`;
      const data = registered.get(k);
      if ( !data ) throw new Error(`Setting ${k} is not registered`);
      if ( data.scope === "world" && !game.user.isGM ) throw new Error(`Player cannot set world setting ${k}`);
      if ( data.choices && !(value in data.choices) ) throw new Error(`${value} is not a choice for ${k}`);
      values.set(k, structuredClone(value));
      await data.onChange?.(value);
      return value;
    }
  };
  // Upstream system settings WoDX writes
  for ( const k of ["eraMortal", "eraVampire", "eraWerewolf", "eraMage"] ) {
    settings.register("worldofdarkness", k, {scope: "world", default: "modern",
      choices: Object.fromEntries((k === "eraMage" ? ["modern", "victorian"] : k === "eraWerewolf" ? ["modern", "victorian", "darkages"]
        : ["modern", "victorian", "darkages", "classical", "livinggods"]).map(c => [c, c]))});
  }

  const gm = {id: "gm", name: "Storyteller", isGM: true};
  const player = {id: "p1", name: "Anna", isGM: false};
  const users = new Collection([[gm.id, gm], [player.id, player]]);
  Object.defineProperty(users, "activeGM", {get: () => (globalThis.__gmOnline === false ? null : gm)});

  const socketHandlers = new Map();
  globalThis.game = {
    world: {id: worldId, flags: worldFlags},
    system: {version: "7.3.2-wodx.1"},
    settings,
    users,
    user: gm,
    keybindings: {register() {}},
    modules: new Map([["wodx-chronicle", {}]]),
    journal: new Collection(),
    actors: new Collection(),
    folders: new Collection(),
    i18n: {localize: s => s},
    paused: false,
    togglePause(p, opts) { this.paused = p; log.paused.push([p, opts]); },
    socket: {
      on: (name, fn) => socketHandlers.set(name, fn),
      emit: (name, data) => log.socket.push({name, data: structuredClone(data)})
    }
  };

  globalThis.fetch = async url => {
    const path = join(dataRoot, String(url).replace(/^\//, ""));
    if ( !existsSync(path) ) return {ok: false, status: 404, json: async () => null};
    return {ok: true, status: 200, json: async () => JSON.parse(readFileSync(path, "utf8"))};
  };

  /** Create game.time the way Foundry's setupGame does, after init. */
  function setupTime() {
    let worldTime = 0;
    game.time = {
      calendar: null,
      get worldTime() { return worldTime; },
      initializeCalendar() { this.calendar = new CONFIG.time.worldCalendarClass(structuredClone(CONFIG.time.worldCalendarConfig)); },
      async advance(s) { return this.set(worldTime + s); },
      async set(t) {
        const dt = t - worldTime; worldTime = t;
        await Hooks.callAll("updateWorldTime", worldTime, dt, {}, game.user.id);
        return t;
      }
    };
    game.time.initializeCalendar();
  }

  return {
    log, DialogV2, setupTime,
    asPlayer: () => { game.user = player; },
    asGM: () => { game.user = gm; },
    /** Deliver the socket messages sent so far to the other side, as the given user. */
    async deliver(as) {
      const prev = game.user;
      game.user = as === "gm" ? gm : player;
      const msgs = log.socket.splice(0);
      for ( const m of msgs ) await socketHandlers.get(m.name)?.(m.data);
      game.user = prev;
    },
    settle: () => new Promise(r => setTimeout(r, 0))
  };
}
