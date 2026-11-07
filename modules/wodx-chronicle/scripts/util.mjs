export const MODULE_ID = "wodx-chronicle";
export const SOCKET = `module.${MODULE_ID}`;

/** Escape text for HTML. */
export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** Is this client the one GM who handles shared work? */
export function isActiveGM() {
  return !!game.user?.isGM && (game.users.activeGM?.id === game.user.id);
}

export function setting(key) {
  return game.settings.get(MODULE_ID, key);
}

export async function setSetting(key, value) {
  return game.settings.set(MODULE_ID, key, value);
}

/** A house rule's current value. */
export function rule(id) {
  try {
    return !!game.settings.get(MODULE_ID, `rule.${id}`);
  } catch {
    return false;
  }
}

/** Fetch a JSON file served by Foundry. Returns null when it is missing. */
export async function fetchJSON(path) {
  const url = foundry.utils.getRoute ? foundry.utils.getRoute(path) : path;
  try {
    const response = await fetch(url, {cache: "no-store"});
    if ( !response.ok ) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Send a message to other clients. Returns false when no GM is online to receive a GM-only request. */
export function emit(type, payload = {}, {needsGM = false} = {}) {
  if ( needsGM && !game.users.activeGM ) {
    ui.notifications.warn("No Storyteller is connected, so this could not be sent.");
    return false;
  }
  game.socket.emit(SOCKET, {type, payload});
  return true;
}

export const log = (...args) => console.log("WoDX |", ...args);
