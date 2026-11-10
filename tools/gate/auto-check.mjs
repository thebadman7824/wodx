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
    // Earlier check gates leave their own test combats active: make this one the combat in view, so the turn counts read it
    await combat.activate(); await sleep(300);
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
    out.steps.push({ name: "quick attack, rear, counts", pass: /from behind/.test(notes[0]) && /attack 2 this turn/.test(notes[1]) && /defense 2 this turn/.test(notes[1]), notes });
    // Hints for Miller
    const hints = game.wodxCombat.attackHints(M, W, { weapon: "auto", maneuver: "normal", defense: "auto", flank: "auto", multi: "auto", defIndex: "auto", oppAuto: true }, { attackerTok: tM.object, targetTok: tW.object });
    out.steps.push({ name: "suggestions", pass: hints.length > 0, hints });
    await combat.delete();
    out.summary = `${out.steps.filter(s => s.pass).length}/${out.steps.length}`;
    const file = new File([JSON.stringify(out, null, 1)], "auto-check.json", { type: "application/json" });
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
    return out.summary;
}
