/**
 * Ways and realms (WoDX Otherworlds 0.6.0), the pure part. Deep realms as scenes of their own, and the ways between
 * places as Teleport Token regions: a trod (Near Dreaming to Near Dreaming), a Moon Path and an airt (Penumbra to
 * Penumbra, or into a realm), an Anchorhead (Shadowlands into the Tempest) and a Byway (realm to realm). The journey
 * rolls stay with the journey window; a way only carries the token. No Foundry here.
 */

/** Deep realms. A scene made for one gets the colour and the note; the Storyteller draws the rest. */
export const DEEP_REALMS = {
  tempest: {label: "The Tempest", line: "wraith", color: "#141a22", note: "The storm beneath the Shadowlands. Every hour here risks the Maelstrom's notice."},
  stygia: {label: "Stygia", line: "wraith", color: "#1b1b20", note: "The Dark Kingdom of Iron, beyond the Tempest."},
  labyrinth: {label: "The Labyrinth", line: "wraith", color: "#0b0a0d", note: "Oblivion's maze under the Tempest. Spectres' ground."},
  "far-dreaming": {label: "The Far Dreaming", line: "changeling", color: "#1a1130", note: "Beyond the Near Dreaming: reached by trods and gateways that open at set times."},
  "deep-umbra": {label: "The Deep Umbra", line: "mage", color: "#05070f", note: "Past the Horizon, where the Avatar Storm and the void wait."},
  "umbral-realm": {label: "A Realm of the Middle Umbra", line: "werewolf", color: "#10180f", note: "A realm of its own laws: name it when you make it."}
};
export const REALM_ORDER = ["tempest", "stygia", "labyrinth", "far-dreaming", "deep-umbra", "umbral-realm"];

/** The kinds of way: the layer each end sits on ("realm" means the realm scene's own level). */
export const WAY_KINDS = {
  trod: {label: "A trod (Near Dreaming)", from: "dreaming", to: "dreaming", color: "#e6b8ff", lines: ["changeling"]},
  moonpath: {label: "A Moon Path (Penumbra)", from: "penumbra", to: "penumbra", color: "#dfe6ff", lines: ["werewolf", "mage"]},
  airt: {label: "An airt (Penumbra, or into a realm)", from: "penumbra", to: "penumbra", color: "#9fc4ff", lines: ["werewolf", "mage"]},
  anchorhead: {label: "An Anchorhead (Shadowlands into a realm)", from: "shadowlands", to: "realm", color: "#7fb59a", lines: ["wraith"]},
  byway: {label: "A Byway (realm to realm)", from: "realm", to: "realm", color: "#6f7f8f", lines: ["wraith", "mage", "werewolf"]}
};
export const WAY_ORDER = ["trod", "moonpath", "airt", "anchorhead", "byway"];

/**
 * Which layer a way's end sits on. A way into a realm scene always lands on that scene's own level, whatever the
 * kind says; an airt or a Moon Path into a realm scene does too.
 */
export function endLayer(kind, end, {isRealm = false} = {}) {
  const k = WAY_KINDS[kind];
  if ( !k ) return null;
  if ( isRealm ) return "realm";
  const want = end === "from" ? k.from : k.to;
  return want === "realm" ? null : want;
}

/** The region for one end: a square two grid spaces wide at the scene's centre (or at x, y), on one level. */
export function wayRegion({name, color = "#ffffff", grid = 100, cx = 1000, cy = 1000, levelId = null, flags = {}} = {}) {
  const size = (Number(grid) || 100) * 2;
  return {name: String(name ?? "A way").slice(0, 120), color, shapes: [{type: "rectangle", x: cx, y: cy, width: size, height: size, anchorX: 0.5, anchorY: 0.5, rotation: 0}],
    elevation: {bottom: null, top: null}, levels: levelId ? [levelId] : [], flags};
}

/** The scene data for a realm: dark, gridded, marked as a realm, not in the navigation bar. */
export function realmScene(realm, name = "") {
  const R = DEEP_REALMS[realm] ?? DEEP_REALMS["umbral-realm"];
  const key = DEEP_REALMS[realm] ? realm : "umbral-realm";
  return {name: String(name || R.label).slice(0, 120), width: 3000, height: 3000, padding: 0, navigation: false, backgroundColor: R.color,
    grid: {size: 100}, flags: {realm: key, note: R.note}};
}
