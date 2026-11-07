/**
 * WoDX: what is left of VtDA20 (vtda20-actions / vtda20-combat 2.2.1), which this module replaces.
 * Identical copy in WoDX Actions and WoDX Combat.
 *   - New settings start from the old module's stored choice; nothing is written.
 *   - The old API names (game.vtda20actions, game.vtda20combat) keep working for macros the migration has not reached.
 *   - The new module stays off while the old one is enabled, and says so to the Storyteller.
 */

/** A setting's stored value from the old module, or the default. Reads only. */
export function oldSetting(oldModule, key, def) {
    const full = `${oldModule}.${key}`;
    try {
        const world = game.settings?.storage?.get?.("world");
        const row = world?.find?.(s => s.key === full) ?? world?.getSetting?.(full)
            ?? (game.data?.settings ?? []).find?.(s => s.key === full);
        if (!row) return def;
        // Foundry 14 hands back the parsed value; older stores may hold the JSON text
        let v = row.value;
        if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { /* a plain string setting */ } }
        // With no default given (the migration report), any stored value counts
        return (v === undefined || v === null || (def !== undefined && typeof v !== typeof def)) ? def : v;
    } catch (e) {
        return def;
    }
}

export function oldActive(oldModule) {
    return !!game.modules?.get?.(oldModule)?.active;
}

/** game.wodx.<short>, game.wodxActions-style name, and the old VtDA20 name as an alias. */
export function alias(short, oldName, api, oldModule) {
    game.wodx ??= {};
    game.wodx[short] = api;
    if (!oldActive(oldModule)) game[oldName] = api;
}

export function warnOld(title, oldModule) {
    const msg = `${title} is off: ${oldModule} is still enabled. In Manage Modules, disable ${oldModule} and keep ${title}, then reload.`;
    console.warn(`WoDX | ${msg}`);
    if (game.user?.isGM) ui.notifications.error(msg, { permanent: true });
}

export function chronicle() {
    return game.modules?.get?.("wodx-chronicle")?.api ?? null;
}

export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
