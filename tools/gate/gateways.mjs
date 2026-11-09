/**
 * Ways and realms (WoDX Otherworlds 0.6.0), in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateways.mjs?${Date.now()}`)).run()
 * It makes two realm scenes and two plain scenes of its own, and deletes them all at the end.
 *   1. the module: Otherworlds 0.6.0 or later, api.ways
 *   2. realm scenes: Stygia and the Tempest, dark, out of the navigation bar, in WoDX realms
 *   3. a Byway between them: a region on each, each carrying a token to the other
 *   4. a trod between two scenes on their Near Dreaming levels
 *   5. an Anchorhead from a scene with no Shadowlands is refused, and makes nothing
 *   6. the window offers every kind and lists the scenes
 *   7. clean up
 * Result: Data/wodx-gate/gateways-result.json.
 */
const MOD = "wodx-otherworlds";
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateways-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), W = M?.api?.ways, made = [];
  const links = (a, b) => {
    const ra = [...a.regions].find(r => r.flags?.[MOD]?.to === b.id), rb = [...b.regions].find(r => r.flags?.[MOD]?.to === a.id);
    const to = (r, o) => [...(r?.behaviors ?? [])].some(x => x.type === "teleportToken" && (x.system?.destinations ?? []).some(d => String(d).includes(o?.id ?? "@@")));
    return {ra, rb, ok: !!ra && !!rb && to(ra, rb) && to(rb, ra)};
  };
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.6.0", M.version) && typeof W?.make === "function", {version: M?.version});
    const sty = await W.realm("stygia", "WoDX gate: Stygia"), tem = await W.realm("tempest", "WoDX gate: Tempest");
    made.push(sty.id, tem.id);
    ok("2. realm scenes", [sty, tem].every(s => s.flags?.[MOD]?.realm && s.navigation === false && s.folder?.name === "WoDX realms") && sty.flags[MOD].realm === "stygia", {levels: sty.levels?.size});
    await W.make("byway", sty, tem);
    const by = links(game.scenes.get(sty.id), game.scenes.get(tem.id));
    ok("3. a Byway", by.ok, {a: by.ra?.name, b: by.rb?.name});
    const a = await Scene.create({name: "WoDX gate: Ways A", width: 1000, height: 800, padding: 0});
    const b = await Scene.create({name: "WoDX gate: Ways B", width: 1000, height: 800, padding: 0});
    made.push(a.id, b.id);
    await M.api.realms.addDreamingLevel(a); await M.api.realms.addDreamingLevel(b);
    await W.make("trod", game.scenes.get(a.id), game.scenes.get(b.id));
    const tr = links(game.scenes.get(a.id), game.scenes.get(b.id));
    const dreamLevel = [...game.scenes.get(a.id).levels].find(l => l.flags?.[MOD]?.layer === "dreaming");
    ok("4. a trod", tr.ok && (tr.ra?.levels ? [...tr.ra.levels].includes(dreamLevel?.id) : false), {level: dreamLevel?.id});
    const before = game.scenes.get(a.id).regions.size;
    let refused = false;
    try { await W.make("anchorhead", game.scenes.get(a.id), game.scenes.get(sty.id)); } catch (e) { refused = /Shadowlands|shadowlands|layer/.test(e.message); R.notes.push(e.message); }
    ok("5. refused", refused && game.scenes.get(a.id).regions.size === before);
    const {DialogV2} = foundry.applications.api, wait = DialogV2.wait, seen = [];
    DialogV2.wait = async cfg => { seen.push(cfg); return "close"; };
    try { await W.dialog(); } finally { DialogV2.wait = wait; }
    const html = seen[0]?.content ?? "";
    ok("6. the window", W.rules.WAY_ORDER.every(k => html.includes(`value="${k}"`)) && html.includes("WoDX gate: Stygia") && html.includes("input"), {len: html.length});
  } catch (err) { R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`); }
  finally {
    try {
      for ( const id of made ) await game.scenes.get(id)?.delete();
      ok("7. clean up", made.every(id => !game.scenes.get(id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
