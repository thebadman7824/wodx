import {MODULE_ID, esc, isActiveGM, setting, setSetting, log} from "./util.mjs";
import {planMigrations, carriesFlags, backupName, targetVersion} from "./migrations-rules.mjs";

/**
 * Data versions and migrations for every WoDX module.
 *
 * A module that changes how it stores its data registers a step, in a wodxRegisterMigrations hook:
 *   Hooks.on("wodxRegisterMigrations", reg => reg.register("wodx-npc", {steps: {2: {name: "routines by place id", run: async ctx => {...}}}}));
 * When the active Storyteller loads the world, each module whose data is behind is brought up to date, one step
 * at a time. Before the first step, the module's data (every world document carrying its flags, with the
 * embedded documents, and its world settings) is written to Data/wodx-backups/migrations. A step that fails stops
 * that module where it is: its version is not raised, and the Storyteller is told where the backup is.
 */

export const BACKUP_DIR = "wodx-backups/migrations";
const registry = {};

export function registerMigrationSettings() {
  // null until the first stamp; then {moduleId: version}
  game.settings.register(MODULE_ID, "dataVersions", {scope: "world", config: false, type: Object, default: null});
  game.settings.register(MODULE_ID, "migrationLog", {scope: "world", config: false, type: Array, default: []});
}

/** Register a module's data version and steps. Several calls for one module merge. */
export function register(moduleId, {version, steps = {}} = {}) {
  const entry = registry[moduleId] ??= {version: 1, steps: {}};
  if ( version ) entry.version = Math.max(entry.version, version);
  Object.assign(entry.steps, steps);
  return entry;
}

const wodxModules = () => [...game.modules.entries()].filter(([id, m]) => m?.active && String(id).startsWith("wodx-")).map(([id]) => id);

/** Each WoDX module on in this world, with the version its data is at and the version its code wants. */
export function status() {
  const stored = setting("dataVersions") ?? {};
  return wodxModules().map(id => ({module: id, data: stored[id] ?? null, code: targetVersion(registry[id])}));
}

/** World collections a migration may need to touch, scenes last. */
const COLLECTIONS = () => [["actors", game.actors], ["items", game.items], ["journal", game.journal], ["macros", game.macros],
  ["tables", game.tables], ["cards", game.cards], ["playlists", game.playlists], ["folders", game.folders], ["scenes", game.scenes]];

/** Write a module's data to a backup file. Returns the path. */
export async function backupModule(moduleId, from) {
  const out = {world: game.world.id, module: moduleId, dataVersion: from, written: new Date().toISOString(),
    coreVersion: game.version, moduleVersion: game.modules.get(moduleId)?.version, documents: {}, settings: {}};
  for ( const [name, collection] of COLLECTIONS() ) {
    const docs = [];
    for ( const doc of collection ?? [] ) {
      const data = doc.toObject();
      if ( carriesFlags(data, moduleId) ) docs.push(data);
    }
    if ( docs.length ) out.documents[name] = docs;
  }
  for ( const s of game.settings.settings?.values?.() ?? [] ) {
    if ( s.namespace !== moduleId || s.scope !== "world" ) continue;
    try { out.settings[s.key] = game.settings.get(moduleId, s.key); } catch { /* unregistered or unreadable */ }
  }
  const FP = foundry.applications.apps.FilePicker.implementation;
  for ( const dir of ["wodx-backups", BACKUP_DIR] ) {
    try { await FP.createDirectory("data", dir, {notify: false}); }
    catch (err) { if ( !/exists/i.test(String(err?.message ?? err)) ) throw err; }
  }
  const name = backupName(game.world.id, moduleId, from);
  const file = new File([JSON.stringify(out)], name, {type: "application/json"});
  const result = await FP.upload("data", BACKUP_DIR, file, {}, {notify: false});
  if ( result === false || result?.status === "error" ) throw new Error(`The backup of ${moduleId}'s data could not be written.`);
  return `${BACKUP_DIR}/${name}`;
}

/** Helpers a step gets. */
function context(moduleId) {
  return {
    moduleId,
    /** Every actor: world actors, then unlinked tokens' actors. */
    *actors() {
      for ( const a of game.actors ?? [] ) yield a;
      for ( const s of game.scenes ?? [] ) for ( const t of s.tokens ?? [] ) if ( t.actorLink === false && t.actor ) yield t.actor;
    },
    /** Every world document of the collections above, with its collection name. */
    *documents() {
      for ( const [name, collection] of COLLECTIONS() ) for ( const doc of collection ?? [] ) yield [name, doc];
    },
    /** A flag read without getFlag, so a step works even if the scope's module is off. */
    flag: (doc, key, scope = moduleId) => String(key).split(".").reduce((o, k) => o?.[k], doc.flags?.[scope]),
    log: (...args) => log(`Migration ${moduleId}:`, ...args)
  };
}

async function record(entry) {
  const list = [...(setting("migrationLog") ?? []), {at: new Date().toISOString(), ...entry}].slice(-50);
  await setSetting("migrationLog", list);
}

let running = null;

/** Bring every WoDX module's data up to date. The active Storyteller only. */
export function runMigrations(options = {}) {
  running ??= _run(options).finally(() => { running = null; });
  return running;
}

async function _run({quiet = false} = {}) {
  if ( !isActiveGM() ) return null;
  Hooks.callAll("wodxRegisterMigrations", {register});
  const stored = setting("dataVersions");
  const plan = planMigrations(registry, stored, wodxModules());
  const versions = {...(stored ?? {}), ...plan.stamp};
  if ( Object.keys(plan.stamp).length ) await setSetting("dataVersions", versions);
  for ( const p of plan.problems ) ui.notifications.error(`WoDX: ${p}`, {permanent: true});
  const done = [];
  const failed = [];
  for ( const job of plan.pending ) {
    let backup;
    try { backup = await backupModule(job.module, job.from); }
    catch (err) {
      failed.push({...job, error: `no backup could be written (${err.message}), so nothing was changed`});
      continue;
    }
    let at = job.from;
    try {
      for ( const step of job.steps ) {
        log(`Migrating ${job.module} to data version ${step.version}: ${step.name}`);
        await step.run(context(job.module));
        at = step.version;
        versions[job.module] = at;
        await setSetting("dataVersions", {...versions});
      }
      done.push({...job, backup});
      await record({module: job.module, from: job.from, to: at, backup});
    } catch (err) {
      console.error(`WoDX | Migration of ${job.module} failed at version ${at + 1}`, err);
      failed.push({...job, at, backup, error: err.message});
      await record({module: job.module, from: job.from, to: at, backup, error: err.message});
    }
  }
  if ( (done.length || failed.length) && !quiet ) await postCard(done, failed);
  return {stamped: plan.stamp, done, failed, problems: plan.problems};
}

async function postCard(done, failed) {
  const title = m => esc(game.modules.get(m)?.title ?? m);
  const parts = ["<h3>WoDX data updated</h3>"];
  if ( done.length ) parts.push(`<ul>${done.map(j => `<li>${title(j.module)}: version ${j.from} to ${j.to}. Backup: <code>${esc(j.backup)}</code></li>`).join("")}</ul>`);
  if ( failed.length ) {
    parts.push(`<p><strong>Not finished:</strong></p><ul>${failed.map(j => `<li>${title(j.module)}: stopped at version ${j.at ?? j.from}, ${esc(j.error)}.${j.backup ? ` Backup: <code>${esc(j.backup)}</code>` : ""}</li>`).join("")}</ul>`);
    parts.push("<p>The module works on as before; the step is tried again next time the world loads.</p>");
    ui.notifications.error("WoDX: a data update did not finish. See the chat card.", {permanent: true});
  }
  await ChatMessage.create({content: `<div class="wodx-card wodx-migrations">${parts.join("")}</div>`,
    speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id)});
}
