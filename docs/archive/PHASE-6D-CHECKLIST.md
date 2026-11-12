# Phase 6d checklist: the inner voice

One shared layer for the Beast, the Shadow, Rage and the Impulse (B47, B53–B56). Each line keeps its own rules; the layer adds who voices it, a private channel, a pressure meter, prompts, proposals and consent.

## Done by Claude (2026-11-08)

- [x] **WoDX Actions 3.5.0:** `voice.js` (engine) and `voice-rules.js` (pure rules).
  - **Which voice** (B54): the Kindred and ghoul Beast, the wraith's Shadow, Garou Rage, and the hunter's Impulse (an inquisitor's Callousness, an imbued's derangements). Other lines plug in when they are built.
  - **The meter, read from the sheet:**
    - the Beast: blood against the hunger line, 7 − Self-Control;
    - the Shadow: Angst against Willpower;
    - Rage: Rage against Willpower (a WoDX reading);
    - the Impulse: Conviction against Piety, or the highest Virtue (7+).
    - It shows as Quiet, Stirring, Rising or Breaking. Only the character's player, the voice and the Storyteller see it (B55).
  - **The voice's panel** (any voiced character's menu → Scene → The inner voice):
    - whisper (to the character's player, the voice and the Storyteller only);
    - propose a check;
    - the player's opt-in and opt-out;
    - the Storyteller's assignment of the voice.
    - Voices I play lists the characters a player voices.
  - **Proposals** (B53): frenzy, Rötschreck, a sin; Catharsis, a Dark Passion, a Harrowing; a Rage roll; the Impulse, a derangement. They go into the Chronicle approval queue. Approved, a card lets the character's player answer it with the line's own roll; the Shadowguide rolls Catharsis.
  - **Prompts:** when a meter rises (through the sheet, Combat, a spend or an item), the voice is told.
  - **Consent** (B56): the Inner voices switch (Configure Settings → WoDX Actions, off by default), each player's opt-in, and the X-card pausing every voice until the scene ends.
  - The wraith's Shadowguide reads its guide from the voice, and assigning one sets both.
- [x] **WoDX Chronicle 0.2.1:** the X-card now fires a `wodxXCard` hook on every screen.
- [x] **Checks:** harness 196 tests (4 new in `phase6d.test.mjs`); UI fit passes with the new panel; quality check passes.
- [x] **Installed** and checked by MD5; backup in `Backups\wodx-6d-pre-deploy`.
- [x] **Automatic gate, run by Claude in the desktop app (Gamemaster Test): 10/10** (`Data/wodx-gate/gate6d.mjs`).
  - Each line's voice and silence until the switch and the opt-in.
  - The Storyteller's assignment.
  - Whisper recipients.
  - Prompts as the Beast, Shadow and Rage rise.
  - A frenzy proposal through the queue, its card opening the frenzy roll.
  - The Shadowguide link, the X-card pause and its end, and opting out.
  - Regression: gate 6c still passes; its version check now accepts later versions.

## For you (the plan's gate: in one session, a Beast, a Shadow and Rage each voiced by another player)

1. Configure Settings → WoDX Actions → turn on **Inner voices**.
2. For three player characters (a Kindred, a wraith, a Garou), each player opens their character's menu → The inner voice → **Opt in**.
3. As the Storyteller, open each one's The inner voice → **Assign who voices it** → choose another player.
4. In play, each voice player opens **Voices I play** and whispers to their character. Check that the others at the table don't see it.
5. Let a meter rise (spend blood, gain Angst or Rage): the voice gets a "grows" whisper. The voice proposes a check, you approve it in the queue, and the character's player rolls it from the card.
6. Press the X-card: the voices fall silent until you end the scene.
7. One player opts out: their voice stays silent.
8. Tell Claude how it felt: too much, too little, missing levers.
