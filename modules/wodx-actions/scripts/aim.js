/**
 * WoDX Targeting's panel in an action window, when that module is on; nothing otherwise.
 *   aim(root, {actor, lib, power: root => the chosen power, onPick: actor => ...})
 *   aim(root, {actor, cast: {intent}, onPick})   a casting window with no power list
 * The window's own "target" line (.wodx-hdr-tgt) is hidden while the panel shows the target.
 */
const api = () => {
    const m = globalThis.game?.modules?.get?.("wodx-targeting");
    return m?.active && m.api?.attach ? m.api : null;
};
export function tagOf(lib, p) {
    const A = api();
    if (!A || !p) return null;
    return A.tagFor(lib, p.id, { name: p.n ?? p.name, text: p.e ?? p.text ?? "", diff: p.diff ?? p.d, passive: !!p.passive });
}
export function aim(root, { actor, lib = "none", power = () => null, onPick = () => {}, cast = null } = {}) {
    const A = api();
    if (!A || !root) return null;
    try {
        const h = A.attach(root, { actor, cast, onPick, tag: () => tagOf(lib, power(root)) });
        if (h) root.querySelectorAll?.(".wodx-hdr-tgt").forEach(e => { e.hidden = true; });
        return h;
    } catch (e) { console.warn("WoDX | targeting panel", e); return null; }
}
/** The default aim of a casting window from what it uses (Spheres, Arts, Realms). */
export const castIntent = args => api()?.rules?.castIntent?.(args) ?? "e";
