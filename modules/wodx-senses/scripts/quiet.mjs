/**
 * WoDX Senses 0.5.0: the quiet interface. One switch on each player's own screen tucks away the sidebar, the
 * hotbar and the player list and puts words where roll cards show numbers. Alt+Q brings it all back, or tucks it
 * away again. The rules are in quiet-rules.mjs.
 */
import * as Q from "./quiet-rules.mjs";

const MOD = "wodx-senses";
const on = () => { try { return !!game.settings.get(MOD, "quiet"); } catch (e) { return false; } };

export function registerQuiet(refresh) {
  game.settings.register(MOD, "quiet", {
    name: "A quiet interface", hint: "Tuck the sidebar, hotbar and player list away, show my character's health as a word at the top, and put difficulties on roll cards in words. Alt+Q shows or hides the panels at any time.",
    scope: "client", config: true, type: Boolean, default: false, onChange: () => { applyQuiet(); refresh?.(); }
  });
  game.keybindings?.register?.(MOD, "quietToggle", {
    name: "Show or hide the panels (quiet interface)", editable: [{key: "KeyQ", modifiers: ["Alt"]}],
    onDown: () => { game.settings.set(MOD, "quiet", !on()); return true; }
  });
}

export function applyQuiet() { globalThis.document?.body?.classList?.toggle("wsn-quiet", on()); }
export const quietOn = on;

/** Put a roll card's difficulties in words, on this player's screen only. */
export function quietCard(el) {
  if ( !on() || !el ) return;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for ( let n = walk.nextNode(); n; n = walk.nextNode() ) {
    if ( !/difficulty/i.test(n.nodeValue) ) continue;
    const t = Q.quietText(n.nodeValue);
    if ( t !== n.nodeValue ) n.nodeValue = t;
  }
}
