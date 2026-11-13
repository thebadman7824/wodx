/**
 * A guided first night (Chronicle 0.52.0, B2838). An optional walk-through for a new player: open your sheet, make one
 * roll, move your token, read a chat card, ask the Storyteller something, find the X-card. Each step lights up where to
 * look and ticks itself when it is done. It is offered once, the first time a player joins, and can be skipped, or
 * taken again from What can I do now?, Find anything or api.playerView.tour(). It shows and ticks; it changes no rule.
 */
import {MODULE_ID, esc} from "./util.mjs";

const {ApplicationV2, DialogV2} = foundry.applications.api;

/** The steps. target: where to look (a selector); the tick comes from a hook, or from the player's own I see it. */
export const STEPS = [
  {id: "sheet", label: "Open your sheet", how: "Double-click your token, or your character in the Actors list. Everything your character can do is on it.",
    target: "#sidebar [data-tab='actors'], #sidebar-tabs [data-tab='actors']"},
  {id: "roll", label: "Make one roll", how: "On the sheet, click a Quick roll or any trait name; or press the question-mark button and pick Look around.",
    target: ".wodx-quickrolls, [data-tool='wodxNow']"},
  {id: "move", label: "Move your token", how: "Drag your token on the map to somewhere new. Walls and doors stop it where they should.",
    target: "#board"},
  {id: "card", label: "Read a chat card", how: "The chat, on the right, shows every roll and what the world does. Open it and read the latest card.",
    target: "#sidebar-tabs [data-tab='chat'], #sidebar [data-tab='chat']", manual: "I read one"},
  {id: "ask", label: "Ask the Storyteller something", how: "Type /w gm and your question in the chat box, then press Enter. Only the Storyteller sees it.",
    target: "#chat-message, .chat-form textarea"},
  {id: "xcard", label: "Find the X-card", how: "This button, always on the toolbar, stops anything you do not want in the game, without saying who pressed it. You do not need to press it now.",
    target: "[data-tool='wodxXCard']", manual: "I see it"}
];

const get = () => { try { return game.settings.get(MODULE_ID, "guide") ?? {}; } catch { return {}; } };
const put = v => game.settings.set(MODULE_ID, "guide", {...get(), ...v}).catch(() => null);
const doneSet = () => new Set(get().done ?? []);

export function registerGuideSettings() {
  game.settings.register(MODULE_ID, "guide", {scope: "client", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "guideOffer", {name: "Offer new players a guided first night",
    hint: "The first time a player joins, a short walk-through is offered: the sheet, a roll, moving, the chat, asking the Storyteller and the X-card.",
    scope: "world", config: true, type: Boolean, default: true});
}

/** The next step not done, or null. Pure. */
export const nextStep = (done = new Set()) => STEPS.find(s => !done.has(s.id)) ?? null;

async function tick(id) {
  const done = doneSet();
  if ( done.has(id) || !STEPS.some(s => s.id === id) ) return;
  done.add(id);
  await put({done: [...done]});
  const app = foundry.applications.instances.get("wodx-guide");
  if ( !app?.rendered ) return;
  if ( !nextStep(done) ) { ui.notifications.info("That is the whole tour. What can I do now? (the question mark) helps from here."); await put({finished: true}); }
  app.render();
}

export function installGuide() {
  if ( game.user.isGM ) return;
  const mine = a => a?.isOwner && !game.user.isGM;
  Hooks.on("renderActorSheet", app => { if ( mine(app.actor) ) tick("sheet"); });
  Hooks.on("createChatMessage", m => {
    if ( m.author?.id !== game.user.id ) return;
    const gms = new Set(game.users.filter(u => u.isGM).map(u => u.id));
    if ( (m.whisper ?? []).some(id => gms.has(id)) && !m.rolls?.length ) tick("ask");
    if ( m.rolls?.length || m.flags?.["wodx-actions"] ) tick("roll");
  });
  Hooks.on("updateToken", (doc, ch, o, userId) => { if ( userId === game.user.id && ("x" in ch || "y" in ch) ) tick("move"); });
  Hooks.on("changeSidebarTab", app => { if ( app?.tabName === "chat" || app?.id === "chat" ) tick("card"); });
  offer();
}

/** Offer the tour once, the first time this player joins. */
async function offer() {
  let on = true;
  try { on = game.settings.get(MODULE_ID, "guideOffer"); } catch { on = true; }
  const g = get();
  if ( !on || g.offered ) return;
  await put({offered: true});
  const yes = await DialogV2.confirm({classes: ["wodx", "wodx-dialog"], window: {title: "Your first night"}, rejectClose: false,
    content: "<p>A short tour of six steps: your sheet, a roll, moving, the chat, asking the Storyteller and the X-card. Each one lights up where to look. Take it now?</p><p class=\"wodx-quiet\">You can take it later from the question-mark button, What can I do now?</p>",
    yes: {label: "Show me"}, no: {label: "Not now"}});
  if ( yes ) GuideApp.open();
}

export class GuideApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-guide", classes: ["wodx", "wodx-guide"],
    window: {title: "Your first night", icon: "fa-solid fa-route", resizable: false},
    position: {width: 330, height: "auto", top: 90, left: 130}
  };
  static async open({again = false} = {}) {
    if ( again ) await put({done: [], finished: false});
    return (foundry.applications.instances.get("wodx-guide") ?? new GuideApp()).render({force: true});
  }
  #timer = null;

  async _renderHTML() {
    const done = doneSet(), next = nextStep(done);
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<p class="wodx-quiet">${done.size} of ${STEPS.length} done.</p>
      <ol class="wodx-guide-steps">${STEPS.map(s => {
        const is = s === next, ok = done.has(s.id);
        return `<li class="${ok ? "wodx-guide-done" : is ? "wodx-guide-next" : ""}"${is ? ' aria-current="step"' : ""}>
          <b>${ok ? '<i class="fa-solid fa-check" aria-hidden="true"></i> ' : ""}${esc(s.label)}</b>
          ${is ? `<p>${esc(s.how)}</p>${s.manual ? `<button type="button" data-tick="${s.id}">${esc(s.manual)}</button>` : ""}<button type="button" data-skip="${s.id}" class="wodx-quiet">Skip this one</button>` : ""}</li>`;
      }).join("")}</ol>
      <div class="wodx-buttons"><button type="button" data-close>${next ? "Stop the tour" : "Done"}</button></div>`;
    return div;
  }
  _replaceHTML(result, content) {
    content.replaceChildren(result);
    content.querySelectorAll("[data-tick], [data-skip]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); tick(b.dataset.tick ?? b.dataset.skip); }));
    content.querySelector("[data-close]")?.addEventListener("click", ev => { ev.preventDefault(); put({finished: true}); this.close(); });
    this.#glow();
    clearInterval(this.#timer);
    this.#timer = setInterval(() => this.#glow(), 1000);
  }
  /** Light up where the next step happens; the screen redraws, so this runs again each second. */
  #glow() {
    const next = nextStep(doneSet());
    document.querySelectorAll(".wodx-guide-glow").forEach(e => { if ( !next || !e.matches(next.target) ) e.classList.remove("wodx-guide-glow"); });
    if ( !next ) return;
    const el = [...document.querySelectorAll(next.target)].find(e => e.offsetParent !== null || e.id === "board");
    el?.classList.add("wodx-guide-glow");
  }
  _onClose(o) {
    clearInterval(this.#timer);
    document.querySelectorAll(".wodx-guide-glow").forEach(e => e.classList.remove("wodx-guide-glow"));
    return super._onClose?.(o);
  }
}
