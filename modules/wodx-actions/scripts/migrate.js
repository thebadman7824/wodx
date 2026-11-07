/**
 * WoDX Actions: the one-time move from VtDA20 (vtda20-actions and vtda20-combat 2.2.1) to WoDX Actions and WoDX Combat.
 *
 * What it copies (nothing is deleted; the old flags stay where they were):
 *   - flags.world.vtda20.*            -> flags.world.wodx.*      (actor type, Garou form, elder)
 *   - flags["vtda20-actions"].*       -> flags["wodx-actions"].*  (frenzy type, Blood Oaths, torpor, Quickening...)
 *   - flags["vtda20-combat"].*        -> flags["wodx-combat"].*
 *   - the "VtDA20: ..." macros the old modules made -> renamed "WoDX: ...", calling game.wodxActions / game.wodxCombat
 * Keys already present on the WoDX side are never overwritten.
 * Settings are not copied: each WoDX setting starts from the old stored choice (see legacy.js).
 */
import { oldSetting, chronicle, esc } from "./legacy.js";

const MOD = "wodx-actions";
export const TYPE = "wodx-vtda20-migration";
const OLD_SCOPES = { "vtda20-actions": "wodx-actions", "vtda20-combat": "wodx-combat" };
const OLD_SETTINGS = {
    "vtda20-actions": ["flavorText", "spendResources", "applyChanges", "showDice", "untrained", "createMacros", "profileMenu", "nightlyBlood"],
    "vtda20-combat": ["autoApply", "spendResources", "celerityDice", "potenceDice", "statusEffects", "createMacros", "showDice", "classicManeuvers", "showKindMenus", "flavorText"]
};

export function registerSettings() {
    game.settings.register(MOD, "migration", { scope: "world", config: false, type: Object, default: { done: false } });
}

/** Every actor whose data the migration might touch: world actors and unlinked tokens. */
function* everyActor() {
    for (const a of game.actors ?? []) yield { actor: a, where: a.name };
    for (const s of game.scenes ?? []) for (const t of s.tokens ?? []) {
        if (t.actorLink === false && t.actor) yield { actor: t.actor, where: `${t.name} (token on ${s.name})` };
    }
}

const rewrite = cmd => String(cmd ?? "").replaceAll("game.vtda20actions", "game.wodxActions").replaceAll("game.vtda20combat", "game.wodxCombat");

/** What the migration would do, without doing it. */
export function planMigration() {
    const actors = [];
    for (const { actor, where } of everyActor()) {
        const update = {};
        const keys = [];
        const oldWorld = actor.flags?.world?.vtda20 ?? {};
        const newWorld = actor.flags?.world?.wodx ?? {};
        for (const [k, v] of Object.entries(oldWorld)) {
            if (newWorld[k] === undefined) { update[`flags.world.wodx.${k}`] = v; keys.push(`world.${k}`); }
        }
        for (const [oldScope, newScope] of Object.entries(OLD_SCOPES)) {
            const o = actor.flags?.[oldScope] ?? {};
            const n = actor.flags?.[newScope] ?? {};
            for (const [k, v] of Object.entries(o)) {
                if (n[k] === undefined) { update[`flags.${newScope}.${k}`] = v; keys.push(`${oldScope}.${k}`); }
            }
        }
        if (keys.length) actors.push({ actor, where, update, keys });
    }
    const macros = [];
    const others = [];
    for (const m of game.macros ?? []) {
        const usesOld = /game\.vtda20(actions|combat)/.test(m.command ?? "");
        if (/^VtDA20: /.test(m.name)) {
            const name = m.name.replace(/^VtDA20: /, "WoDX: ");
            const clash = !!game.macros.find(x => x !== m && x.name === name);
            macros.push({ macro: m, name, command: rewrite(m.command), clash });
        } else if (usesOld) others.push(m);
    }
    const settings = [];
    for (const [mod, keys] of Object.entries(OLD_SETTINGS)) for (const k of keys) {
        const v = oldSetting(mod, k, undefined);
        if (v !== undefined) settings.push({ key: `${mod}.${k}`, value: v });
    }
    const oldActive = Object.keys(OLD_SCOPES).filter(id => game.modules.get(id)?.active);
    const work = actors.length + macros.filter(x => !x.clash).length;
    return { actors, macros, others, settings, oldActive, work };
}

export function planSummary(plan) {
    const parts = [];
    if (plan.actors.length) parts.push(`${plan.actors.length} actor(s): copy ${plan.actors.reduce((n, a) => n + a.keys.length, 0)} VtDA20 flag(s) to the WoDX names`);
    const ren = plan.macros.filter(x => !x.clash).length;
    if (ren) parts.push(`${ren} "VtDA20:" macro(s): rename to "WoDX:" and call the WoDX modules`);
    if (plan.macros.some(x => x.clash)) parts.push(`${plan.macros.filter(x => x.clash).length} macro(s) left as they are: a "WoDX:" macro of that name exists`);
    if (plan.others.length) parts.push(`${plan.others.length} other macro(s) use the old names; they keep working through the alias and are not changed`);
    if (plan.settings.length) parts.push(`${plan.settings.length} old setting(s) are read as the WoDX settings' starting values; nothing is written`);
    return parts;
}

/** Copy the flags and rename the macros. GM only. Returns the report. */
export async function migrate({ confirmed = false } = {}) {
    if (!game.user.isGM) return null;
    const plan = planMigration();
    if (!confirmed) {
        const ok = await foundry.applications.api.DialogV2.confirm({
            classes: ["wodx", "wodx-dialog"], window: { title: "Move from VtDA20 to WoDX" },
            content: `<p>This copies the VtDA20 modules' data to WoDX Actions and WoDX Combat:</p>
              <ul>${planSummary(plan).map(p => `<li>${esc(p)}</li>`).join("") || "<li>Nothing to copy.</li>"}</ul>
              <p>Nothing is deleted. The old flags stay where they are.</p>`,
            rejectClose: false
        });
        if (!ok) return null;
    }
    const done = { actors: [], macros: [], skipped: [] };
    for (const a of plan.actors) {
        try { await a.actor.update(a.update); done.actors.push(`${a.where}: ${a.keys.join(", ")}`); }
        catch (e) { console.error("WoDX | migration", e); done.skipped.push(`${a.where}: ${e.message}`); }
    }
    for (const m of plan.macros) {
        if (m.clash) { done.skipped.push(`Macro "${m.macro.name}": "${m.name}" already exists; left as it is`); continue; }
        try { await m.macro.update({ name: m.name, command: m.command }); done.macros.push(`"${m.macro.name}" → "${m.name}"`); }
        catch (e) { console.error("WoDX | migration", e); done.skipped.push(`Macro "${m.macro.name}": ${e.message}`); }
    }
    const report = await writeReport(plan, done);
    await game.settings.set(MOD, "migration", { done: true, at: Date.now(), actors: done.actors.length, macros: done.macros.length });
    ui.notifications.info(`Moved from VtDA20: ${done.actors.length} actor(s), ${done.macros.length} macro(s). See the "WoDX Migration from VtDA20" journal.`);
    return { ...done, report };
}

async function writeReport(plan, done) {
    const li = list => list.length ? `<ul>${list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p>None.</p>";
    const html = `<p>Run ${esc(new Date().toLocaleString())}. Nothing was deleted; the VtDA20 flags are still on the actors.</p>
      <h2>Actors</h2>${li(done.actors)}
      <h2>Macros renamed</h2>${li(done.macros)}
      <h2>Left alone</h2>${li(done.skipped)}
      <h2>Other macros using the old names</h2>${li(plan.others.map(m => m.name))}
      <p>They keep working: game.vtda20actions and game.vtda20combat point at the WoDX modules.</p>
      <h2>Settings read from VtDA20</h2>${li(plan.settings.map(s => `${s.key}: ${JSON.stringify(s.value)}`))}
      ${plan.oldActive.length ? `<p><strong>Still enabled:</strong> ${esc(plan.oldActive.join(", "))}. Disable them in Manage Modules.</p>` : ""}`;
    let j = game.journal.find(x => x.getFlag?.(MOD, "kind") === "migration");
    if (!j) j = await JournalEntry.create({ name: "WoDX Migration from VtDA20", flags: { [MOD]: { kind: "migration" } },
        pages: [{ name: "Report", type: "text", text: { content: html } }] });
    else await j.pages.getName("Report")?.update({ "text.content": html });
    return j;
}

/** Active GM: offer the migration once, through the WoDX approval queue. */
export async function offerMigration() {
    const api = chronicle();
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return false;
    if (game.settings.get(MOD, "migration")?.done) return false;
    const plan = planMigration();
    if (!plan.work) return false;
    if (!api?.propose) {
        ui.notifications.info("WoDX Actions: VtDA20 data can be moved over. Run game.wodxActions.migrate() as the Storyteller.");
        return false;
    }
    api.registerApprovalHandler?.(TYPE, { label: "Move from VtDA20", approve: () => migrate({ confirmed: true }) });
    await api.propose({ type: TYPE, key: TYPE, title: "Move VtDA20 data to WoDX Actions and WoDX Combat",
        detail: `${planSummary(plan).join(". ")}. Nothing is deleted.`, data: {} });
    return true;
}

/** The approval handler must exist on every load, so an approval made later still runs. */
export function registerHandler() {
    chronicle()?.registerApprovalHandler?.(TYPE, { label: "Move from VtDA20", approve: () => migrate({ confirmed: true }) });
}
