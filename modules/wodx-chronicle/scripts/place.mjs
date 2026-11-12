import {MODULE_ID, esc, setting} from "./util.mjs";
import {describeTime} from "./calendar.mjs";
import * as PR from "./place-rules.mjs";
import * as WR from "./world-rules.mjs";

/** WoDX Chronicle 0.39.0: a scene's own place for the sun (the rules are in place-rules.mjs). */

const {DialogV2} = foundry.applications.api;
export const placeOf = scene => PR.cleanPlace(scene?.flags?.[MODULE_ID]?.place ?? {});

/** The time as it reads on a scene: describeTime at the scene's latitude and hour. */
export function describeAt(scene = globalThis.canvas?.scene ?? null, time = game.time.worldTime) {
  const pt = PR.placeTime(placeOf(scene), time, setting("latitude"));
  return {...describeTime(pt.time, pt.latitude), latitude: pt.latitude, ownPlace: pt.own, offset: pt.offset};
}
/** The latitude to use for a scene. */
export const latitudeFor = (scene = globalThis.canvas?.scene ?? null) => PR.placeTime(placeOf(scene), 0, setting("latitude")).latitude;

/** The chronicle's homeland (a region id). */
export function homeland() {
  try {
    const r = WR.regionOf(setting("homeland")) ?? WR.regionOf(WR.DEFAULT_REGION);
    // A chronicle set in the Americas before the homeland setting existed
    if ( setting("region") === "americas" && r.part !== "americas" ) return "north-america-east";
    return r.id;
  } catch (e) { return WR.DEFAULT_REGION; }
}
/** The region a scene stands in: its own, else the homeland. {id, label, part, lat, lon, climate, money, ...}. */
export const regionHere = (scene = globalThis.canvas?.scene ?? null) => WR.regionHere(placeOf(scene), homeland());
/** Is the scene abroad (given a region other than the homeland)? */
export const isAbroad = (scene = globalThis.canvas?.scene ?? null) => { const r = placeOf(scene).region; return !!r && r !== homeland(); };

export async function setPlace(scene, place) {
  if ( !game.user.isGM || !scene ) return null;
  const c = PR.cleanPlace(place);
  if ( !PR.hasOwnPlace(c) ) return scene.unsetFlag(MODULE_ID, "place");
  return scene.setFlag(MODULE_ID, "place", c);
}

/** GM: set the viewed scene's own latitude and hour. */
export async function placeDialog(scene = globalThis.canvas?.scene ?? null) {
  if ( !game.user.isGM ) return null;
  if ( !scene ) return ui.notifications.info("Open a scene first.");
  const p = placeOf(scene);
  const home = homeland();
  const sign = n => n > 0 ? `+${n}` : String(n);
  const regions = Object.entries(WR.WORLD_REGIONS).map(([id, r]) =>
    `<option value="${id}" ${p.region === id ? "selected" : ""}>${esc(r.label)} (${r.lat}, ${sign(WR.hoursAhead(id, home))} h)</option>`).join("");
  const res = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"], window: {title: `Where ${scene.navName || scene.name} stands`},
    content: `<p>For a scene far from home. Leave the latitude empty to use the chronicle's (${esc(String(setting("latitude")))}).</p>
      <div class="form-group"><label>Region</label><select name="region"><option value="">Home (${esc(WR.regionOf(home).label)})</option>${regions}</select></div>
      <p class="wodx-quiet">A region gives the scene its people's names and its weather, and its latitude unless one is typed below. The list shows each region's latitude and its hours from home, to copy into the boxes.</p>
      <div class="form-group"><label>Latitude (degrees north)</label><input type="number" name="latitude" step="0.1" min="-89" max="89" value="${p.latitude ?? ""}"></div>
      <div class="form-group"><label>Hours ahead of home (behind: negative)</label><input type="number" name="offset" step="0.5" min="${PR.OFFSET_MIN}" max="${PR.OFFSET_MAX}" value="${p.offset}"></div>
      <p class="wodx-quiet">For example London 51.5 and -1, Cairo 30.0 and +1, New York 40.7 and -6 from Prague. The world clock, routines and dusk and dawn on the Clock keep home time; the sun, the sky and the hour shown for this scene follow this place.</p>`,
    ok: {label: "Save", callback: (ev, b) => ({region: b.form.elements.region.value, latitude: b.form.elements.latitude.value, offset: b.form.elements.offset.value})},
    rejectClose: false
  });
  if ( !res ) return null;
  return setPlace(scene, res);
}
