// Live check of WoDX Combat 3.4.0's automatic options in rothenstein-wodx. Clears its own earlier test combats, makes one, and deletes it at the end.
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function run() {
    const out = { steps: [] };
    const W = game.actors.find(a => a.name.startsWith("Wilhelm Eisenfang (test)")), M = game.actors.find(a => a.name.startsWith("Miller Jost (test)"));
    const sc = canvas.scene;
    const tW = sc.tokens.find(t => t.actorId === W.id), tM = sc.tokens.find(t => t.actorId === M.id);
    // Fit and healthy for the test, so the second attack still has dice
    await M.update({ "system.attributes.dexterity.value": 3, "system.abilities.melee.value": 2, "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0, "system.settings.isupdated": false });
    await W.update({ "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0, "system.settings.isupdated": false });
    // A "dead" status left by an earlier gate makes automatic initiative skip a fighter: clear it on both
    for ( const a of [M, W] ) if ( a.statuses?.has?.("dead") ) await a.toggleStatusEffect("dead", {active: false});
    await sleep(1500);
    // Put Miller next to Wilhelm, behind him (Wilhelm faces up the screen: rotation 180)
    const g = sc.grid.size;
    await tW.update({ rotation: 180 });
    await tM.update({ x: tW.x, y: tW.y + g }); await sleep(800);
    // A fight: initiative should roll itself
    // Earlier runs of this and the other check gates may have left test combats with these two: remove only those
    const mine = c => c.combatants.size > 0 && c.combatants.contents.every(x => [W.id, M.id].includes(x.actorId));
    const stale = game.combats.filter(c => c.scene?.id === sc.id && mine(c)).map(c => c.id);
    if ( stale.length ) await Combat.deleteDocuments(stale);
    out.cleared = stale.length;
    const n0 = game.messages.size;
    const combat = await Combat.create({ scene: sc.id, active: true });
    // Earlier check gates leave their own test combats active: switch them off for the fight (put back at the end) so this one is the combat in view, and the turn counts read it
    const others = game.combats.filter(c => c.active && c.id !== combat.id).map(c => c.id);
    if (others.length) await Combat.updateDocuments(others.map(_id => ({ _id, active: false })));
    await combat.activate(); await sleep(300);
    // A headless client can keep its combat tracker on an older fight: point the tracker at this one as well
    const view = () => game.combat?.id === combat.id;
    out.viewTries = [];
    if ( !view() ) { try { await ui.combat?.initialize?.({combat, render: false}); } catch (e) { out.viewTries.push(`initialize: ${e.message}`); } out.viewTries.push(`initialize ${view()}`); }
    if ( !view() ) { try { ui.combat.viewed = combat; } catch (e) { out.viewTries.push(`viewed=: ${e.message}`); } out.viewTries.push(`viewed= ${view()}`); }
    if ( !view() ) { try { await combat.update({active: true}); await ui.combat?.render?.(); } catch (e) { out.viewTries.push(`render: ${e.message}`); } out.viewTries.push(`render ${view()}`); }
    out.inView = view();
    out.viewedId = game.combat?.id ?? null;
    await combat.createEmbeddedDocuments("Combatant", [{ tokenId: tW.id, sceneId: sc.id, actorId: W.id }, { tokenId: tM.id, sceneId: sc.id, actorId: M.id }]);
    await combat.startCombat(); await sleep(2500);
    const t1 = Date.now(); while (!game.messages.contents.slice(n0).some(m => /Initiative/.test(m.content)) && Date.now() - t1 < 8000) await sleep(100);
    const init1 = game.messages.contents.slice(n0).find(m => /Initiative/.test(m.content));
    out.steps.push({ name: "initiative at the start", pass: !!init1 && combat.combatants.contents.every(c => c.initiative != null), card: init1?.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200) });
    const n1 = game.messages.size;
    await combat.nextRound(); await sleep(2500);
    const init2 = game.messages.contents.slice(n1).find(m => /Initiative, turn 2/.test(m.content));
    out.steps.push({ name: "initiative each turn", pass: !!init2 });
    // Two quick attacks by Miller on Wilhelm this turn
    const notes = [];
    for (let i = 0; i < 2; i++) {
        const n = game.messages.size;
        await game.wodxCombat.quickAttack({ attacker: tM.object, target: tW.object });
        const card = () => game.messages.contents.slice(n).find(m => /Automatic:/.test(m.content));
        const t0 = Date.now(); while (!card() && Date.now() - t0 < 8000) await sleep(100);
        notes.push((card()?.content.match(/Automatic:[^<]*/) ?? [""])[0]);
    }
    out.steps.push({ name: "quick attack, rear, counts", inView: out.inView, pass: /from behind/.test(notes[0]) && /attack 2 this turn/.test(notes[1]) && /defense 2 this turn/.test(notes[1]), notes });
    // Hints for Miller
    const hints = game.wodxCombat.attackHints(M, W, { weapon: "auto", maneuver: "normal", defense: "auto", flank: "auto", multi: "auto", defIndex: "auto", oppAuto: true }, { attackerTok: tM.object, targetTok: tW.object });
    out.steps.push({ name: "suggestions", pass: hints.length > 0, hints });
    await combat.delete();
    try { await ui.combat?.initialize?.({render: false}); } catch { /* the tracker picks its own fight again */ }
    // put the other test combats back as they were
    if (others.length) await Combat.updateDocuments(others.map(_id => ({ _id, active: true })));
    out.summary = `${out.steps.filter(s => s.pass).length}/${out.steps.length}`;
    const file = new File([JSON.stringify(out, null, 1)], "auto-check.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return out.summary;
}
