/**
 * Feed vitae from the token menu (B5049). A vampire's player, or the Storyteller, picks an animal or a mortal next to
 * one of their vampires and feeds it a point of blood. The Storyteller's own feed happens at once; a player's goes to
 * the approval queue and, once approved (or by itself when that type is set to auto-approve, as in the Lone
 * Chronicle), happens by itself: the drinker becomes a ghoul, the bond moves on and the token shows the drink.
 */
import {MODULE_ID, esc, lineOf, lineage, isAnimal} from "./actor-data.mjs";
import {giveVitae} from "./change-of-state.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const VITAE_TYPE = "wodx-vitae";
const SOCKET = `module.${MODULE_ID}`;
/** Next to: within this many grid squares, centre to centre. */
const REACH = 1.5;

const chronicle = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => game.user?.isGM && game.users?.activeGM?.id === game.user.id;

/** Can this actor be fed vitae? Mortals, ghouls and animals; never a vampire or one who changed state. */
export const canDrink = actor => !!actor && !lineage(actor).became && lineOf(actor) !== "vampire" && (!!lineOf(actor) || isAnimal(actor));

/** The user's vampires with a token near this one. */
export function feedersNear(tok, user = game.user) {
  const grid = canvas?.grid?.size || 100;
  return (canvas?.tokens?.placeables ?? []).filter(t => t !== tok && t.actor && lineOf(t.actor) === "vampire"
    && (user.isGM || t.actor.testUserPermission?.(user, "OWNER"))
    && Math.hypot(t.center.x - tok.center.x, t.center.y - tok.center.y) <= REACH * grid);
}

/** Show the drink on the map: red droplets rise from the drinker's token. */
export function showDrink(tokenDoc, text = "Vitae") {
  const t = tokenDoc?.object ?? canvas?.tokens?.get?.(tokenDoc?.id);
  if ( !t ) return;
  try {
    canvas.interface?.createScrollingText?.(t.center, text, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fill: "#b3121f", stroke: "#1a0306",
      strokeThickness: 4, fontSize: 30, jitter: 0.2, duration: 2200});
  } catch (e) { /* no canvas */ }
}

async function feed({drinkerTokenId, feederTokenId, sceneId, points = 1}) {
  const scene = game.scenes.get(sceneId) ?? canvas.scene;
  const dt = scene?.tokens?.get(drinkerTokenId), ft = scene?.tokens?.get(feederTokenId);
  if ( !dt?.actor || !ft?.actor ) throw new Error("The tokens are gone");
  const r = await giveVitae(dt.actor, ft.actor, {points});
  game.socket.emit(SOCKET, {type: "vitae.shown", payload: {sceneId: scene.id, tokenId: dt.id}});
  showDrink(dt);
  return r;
}

/** Any client: ask to feed. */
export async function requestFeed(drinkerTok, feederTok, points = 1) {
  const payload = {drinkerTokenId: drinkerTok.document.id, feederTokenId: feederTok.document.id, sceneId: drinkerTok.document.parent?.id, points,
    userId: game.user.id};
  if ( game.user.isGM ) return feed(payload);
  if ( !game.users.activeGM ) return ui.notifications.warn("No Storyteller is connected, so this could not be sent.");
  game.socket.emit(SOCKET, {type: "vitae.request", payload});
  ui.notifications.info("Sent to the Storyteller for approval.");
  return {sent: true};
}

/** Active GM: a player's request arrives and goes to the queue. */
export async function onRequest(payload) {
  if ( !isActiveGM() ) return;
  const user = game.users.get(payload?.userId);
  const scene = game.scenes.get(payload?.sceneId);
  const dt = scene?.tokens?.get(payload?.drinkerTokenId), ft = scene?.tokens?.get(payload?.feederTokenId);
  if ( !user || !dt?.actor || !ft?.actor || !ft.actor.testUserPermission?.(user, "OWNER") || !canDrink(dt.actor) ) return;
  await chronicle()?.approvals?.addToQueue?.({
    id: foundry.utils.randomID(), type: VITAE_TYPE, key: `vitae:${dt.id}:${ft.id}`,
    title: `${ft.actor.name} feeds vitae to ${dt.name}`,
    detail: `${payload.points} blood point${payload.points === 1 ? "" : "s"}. ${lineOf(dt.actor) === "ghoul" ? "Already a ghoul: the blood is topped up and the bond moves on." : "The drinker becomes a ghoul with Potence 1."}`,
    data: {drinkerTokenId: dt.id, feederTokenId: ft.id, sceneId: scene.id, points: payload.points}, from: user.id, createdAt: Date.now(), worldTime: game.time.worldTime
  });
}

export function registerFeedVitae() {
  chronicle()?.registerApprovalHandler?.(VITAE_TYPE, {label: "Feeding vitae", approve: entry => feed(entry.data)});
  Hooks.on("renderTokenHUD", (hud, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const tok = hud.object, col = root?.querySelector(".col.left");
    if ( !tok?.actor || !col || !canDrink(tok.actor) ) return;
    const near = feedersNear(tok);
    if ( !near.length ) return;
    const b = document.createElement("div");
    b.className = "control-icon wodx-feed-vitae";
    b.dataset.tooltip = `Feed vitae to ${esc(tok.name)}`;
    b.innerHTML = `<i class="fa-solid fa-droplet"></i>`;
    b.addEventListener("click", async () => {
      let feeder = near[0];
      if ( near.length > 1 ) {
        const id = await foundry.applications.api.DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "Feed vitae"}, rejectClose: false,
          content: `<div class="form-group"><label>Whose blood</label>${searchBox("select[name=who]", "Search…", "Search who gives the blood")}<select name="who">${near.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select></div>`,
          ok: {label: "Feed", callback: (e, button) => button.form.elements.who.value}});
        feeder = near.find(t => t.id === id);
      }
      if ( feeder ) await requestFeed(tok, feeder).catch(e => ui.notifications.error(e.message));
    });
    col.appendChild(b);
  });
}
