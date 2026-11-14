/**
 * WoDX gate: a made person's want, secret and look act in the game (B3925), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepeoplewants.mjs?${Date.now()}`)).run()
 * Makes its own people and character and removes them; never moves the clock.
 *   1. a person made by WoDX Creation carries the want, the talk offer, a secret and the look
 *   2. WoDX NPC's secrets list holds the secret, with a stable id
 *   3. WoDX Library's witness description names the look (when it is one a witness sees)
 *   4. the Storyteller's "They saw to it" raises the person's attitude toward the character by one step, once
 * Result: Data/wodx-gate/gatepeoplewants-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gatepeoplewants");
  const made = new Set(), msgs = new Set();
  try {
    await G.scene();
    const P = game.modules.get("wodx-creation")?.api?.people, NPC = game.modules.get("wodx-npc")?.api, LIB = game.modules.get("wodx-library")?.api;
    const [pc] = await G.make(Actor, [{name: "Gate Wants Asker", type: "Mortal"}]);
    let person = null;

    await G.step("1. flags on a made person", async () => {
      // a look a witness sees: re-roll the row until one comes up (seeded, so this is the same every run)
      let p = null;
      for ( let n = 0; n < 12; n++ ) { p = P.generate({batch: `gate${G.run}`, row: 0, nonce: n}); if ( LIB?.look?.rules?.noticedFeatures?.([p.look])?.length ) break; }
      [person] = await P.create({people: [p]});
      if ( person ) made.add(person.id);
      const f = person?.flags ?? {};
      G.ok("1. flags on a made person", f["wodx-npc"]?.want?.topic === "a favour" && /\[offer\] a favour/.test(f["wodx-npc"]?.behavior?.talk ?? "")
        && (f["wodx-npc"]?.secrets ?? []).length === 1 && (f["wodx-library"]?.features ?? []).length === 1,
        {want: f["wodx-npc"]?.want, secrets: f["wodx-npc"]?.secrets?.length, features: f["wodx-library"]?.features});
    });

    await G.step("2. the secret is in the secrets system", async () => {
      const list = NPC?.secrets?.of?.(person) ?? [];
      const again = NPC?.secrets?.of?.(person) ?? [];
      G.ok("2. the secret is in the secrets system", list.length === 1 && /^Hides that this person/.test(list[0].text) && again[0]?.id === list[0]?.id,
        {secrets: list.map(s => ({kind: s.kind, text: s.text, id: s.id})), api: Object.keys(NPC?.secrets ?? {})});
    });

    await G.step("3. witness description", async () => {
      const d = LIB?.look?.describe?.(person);
      const feat = (person.flags["wodx-library"].features[0] ?? "").toLowerCase();
      G.ok("3. witness description", !!d?.text && d.text.includes(feat), {text: d?.text, feat});
    });

    await G.step("4. they saw to it", async () => {
      const before = NPC.attitude.of(person, pc)?.step ?? 0;
      const msg = await ChatMessage.create({content: "<div class=\"vta-card wodx-x wnpc wnpc-talk-card\"><div class=\"vta-body\"><p>gate</p></div></div>", whisper: game.users.filter(u => u.isGM).map(u => u.id),
        flags: {"wodx-npc": {talk: {actor: pc.id, topic: "a favour", said: "", want: {npc: person.id}}}}});
      msgs.add(msg.id);
      const n0 = game.messages.size;
      await NPC.talk.wantMet(msg);
      const after = NPC.attitude.of(person, pc)?.step ?? 0;
      await NPC.talk.wantMet(msg); // a second press does nothing
      const after2 = NPC.attitude.of(person, pc)?.step ?? 0;
      for ( const m of game.messages.contents.slice(n0) ) if ( /saw to what/.test(m.content ?? "") ) msgs.add(m.id);
      G.ok("4. they saw to it", after === before + 1 && after2 === after && !!person.flags["wodx-npc"].want.met?.[pc.id], {before, after, after2});
    });
  } finally {
    try {
      for ( const m of game.messages.filter(m => /New people|saw to what/.test(m.content ?? "") && [...made].some(id => (m.content ?? "").includes(id) || (m.speaker?.alias && game.actors.get(id)?.name === m.speaker.alias))) ) msgs.add(m.id);
      if ( made.size ) await Actor.deleteDocuments([...made].filter(id => game.actors.get(id)));
      if ( msgs.size ) await ChatMessage.deleteDocuments([...msgs].filter(id => game.messages.get(id)));
    } catch (e) { G.R.notes.push(`cleanup: ${e?.message ?? e}`); }
    return G.finish();
  }
}
