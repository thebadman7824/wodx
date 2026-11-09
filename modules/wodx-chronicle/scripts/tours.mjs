import {MODULE_ID} from "./util.mjs";

/**
 * Foundry tours for WoDX (Configure Settings, Tours, or the Help button on the Chronicle Clock). One for players, one
 * for the Storyteller. A step whose button is hidden (a module off, a button the Storyteller turned off for players)
 * is shown in the middle of the screen instead, so a tour never stalls.
 */

const tool = name => `#scene-controls-tools button[data-tool="${name}"]`;

export const PLAYER_TOUR = {
  id: "wodx-players",
  title: "WoDX: playing your character",
  description: "Where your character's rolls, the clock, the safety tools and your own time in the night are.",
  canBeResumed: true,
  display: true,
  steps: [
    {id: "welcome", title: "Welcome to the chronicle", content: "<p>This short tour shows where the WoDX tools live. Press Next to go on, or close it at any time. It is in Configure Settings, Tours, if you want it again.</p>"},
    {id: "tokens", selector: "#scene-controls-layers button[data-control=\"tokens\"]", title: "Token controls",
      content: "<p>The WoDX buttons sit with the Token controls on the left of the screen.</p>"},
    {id: "actions", selector: "#hud", title: "Your character's actions",
      content: "<p>Click your token, right-click it, and press the book on the left of the token's menu: WoDX Actions. Everything your character does is there, grouped by what you want to do.</p><p>Type in the box at the top to find anything. Typing <em>Perception</em> finds Notice something; typing <em>climb</em> finds Climbing.</p>"},
    {id: "checks", title: "Common checks",
      content: "<p>Common checks, in the Roll group of the menu, has the everyday rolls: noticing, searching, reading a person, keeping going, keeping a straight face. It picks the best pool your sheet has and shows it before you roll.</p>"},
    {id: "clock", selector: tool("wodxClock"), title: "The Chronicle Clock",
      content: "<p>The moon button opens the Chronicle Clock: the date, how long until dawn, the moon, and the era's rules. The Languages button there sets the tongues your character speaks.</p>"},
    {id: "xcard", selector: tool("wodxXCard"), title: "The X-card",
      content: "<p>If something in the story is too much, press X. The scene pauses and nobody is told who pressed it. Lines and veils are on the Clock too.</p>"},
    {id: "own", selector: tool("wodxOnYourOwn"), title: "Out on your own",
      content: "<p>Between scenes you can travel and act alone: hunt, study, call on someone. Your character keeps their own time in the night, and the Storyteller sees what you do.</p>"},
    {id: "speaking", selector: ".wodx-speaking", title: "Speaking a language",
      content: "<p>Above the chat box, choose the language your character is speaking, or type <em>/in Latin</em> and then the words. Players whose characters do not know it see other words in its place.</p>"},
    {id: "find", selector: tool("wodxFindMe"), title: "Find my character",
      content: "<p>This brings the map to your character's token wherever it is.</p>"},
    {id: "done", title: "That's the tour", content: "<p>When in doubt, open WoDX Actions and type what you want to do.</p>"}
  ]
};

export const STORYTELLER_TOUR = {
  id: "wodx-storyteller",
  title: "WoDX: running the chronicle",
  description: "The clock, the approval queue, the tracker, the Ledger and the switches a Storyteller uses most.",
  canBeResumed: true,
  display: true,
  steps: [
    {id: "clock", selector: tool("wodxClock"), title: "The Chronicle Clock",
      content: "<p>The clock moves the night: dusk, dawn, a day, a week, a set date, Pass the years. The era follows the date unless you lock it. Hold the world lets the clock move with nothing reacting, for a flashback or a test.</p>"},
    {id: "approvals", selector: tool("wodxApprovals"), title: "The approval queue",
      content: "<p>Anything automation proposes that touches a player character waits here: era changes, faction moves, encounters, inheritances. Approve or reject each card.</p>"},
    {id: "tracker", selector: tool("wodxTracker"), title: "The tracker",
      content: "<p>What each player character has done on their own, who needs a look, and the spotlight since the last session. Convene characters into a scene from here.</p>"},
    {id: "ledger", selector: tool("wodxLedger"), title: "The Ledger",
      content: "<p>Oaths, debts, boons and consequences with dates. They come due on their own as the clock passes them. The Veil track falls with breaches and mends in quiet months.</p>"},
    {id: "settings", title: "Dated events and the archive",
      content: "<p>In Configure Settings: Dated events (turn history on or off, or move a date) and the Archive of the dead (move the dead out of the world to keep it light).</p>"},
    {id: "players", selector: tool("wodxPlayerTools"), title: "Which buttons players see",
      content: "<p>Choose which WoDX buttons each player has. The safety tools always stay.</p>"}
  ]
};

/** A tour that shows a step in the middle when its button is not on screen. */
function tourClass() {
  const Base = foundry.nue?.Tour;
  if ( !Base ) return null;
  return class WoDXTour extends Base {
    async _preStep() {
      const s = this.currentStep;
      if ( s?.selector && !document.querySelector(s.selector) ) delete s.selector;
      return super._preStep();
    }
  };
}

export function registerTours() {
  const T = tourClass();
  if ( !T || !game.tours?.register ) return false;
  try {
    game.tours.register(MODULE_ID, PLAYER_TOUR.id, new T({...PLAYER_TOUR, namespace: MODULE_ID}));
    if ( game.user.isGM ) game.tours.register(MODULE_ID, STORYTELLER_TOUR.id, new T({...STORYTELLER_TOUR, namespace: MODULE_ID}));
    return true;
  } catch (err) {
    console.warn("WoDX | Tours could not be registered", err);
    return false;
  }
}

/** Start a tour: the player's, or the Storyteller's for a GM. */
export function startTour(id = game.user.isGM ? STORYTELLER_TOUR.id : PLAYER_TOUR.id) {
  return game.tours?.get?.(`${MODULE_ID}.${id}`)?.start();
}
