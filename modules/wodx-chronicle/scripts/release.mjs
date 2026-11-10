/** Shows the Storyteller which WoDX build the server runs: a line in the Settings sidebar,
 * one in the console, and a warning when the packages come from different commits. */
import {parseStamp, summarise} from "./release-rules.mjs";

let summary = null;

/** The WoDX packages in play: the system (when it is the WoDX fork) and every active wodx- module. */
function packages() {
  const list = [];
  if ( game.system?.id === "worldofdarkness" ) list.push({id: "worldofdarkness", path: "systems/worldofdarkness/release.json"});
  for ( const m of game.modules ) {
    if ( m.active && m.id.startsWith("wodx-") ) list.push({id: m.id, path: `modules/${m.id}/release.json`});
  }
  return list;
}

async function readStamp(path) {
  try {
    const url = foundry.utils.getRoute ? foundry.utils.getRoute(path) : `/${path}`;
    const r = await fetch(url, {cache: "no-store"});
    if ( !r.ok ) return null;
    return parseStamp(await r.json());
  } catch {
    return null;
  }
}

/** Read every package's stamp (once) and return the summary. */
export async function check({force = false} = {}) {
  if ( summary && !force ) return summary;
  const list = packages();
  const stamps = await Promise.all(list.map(async p => ({id: p.id, stamp: await readStamp(p.path)})));
  summary = summarise(stamps);
  return summary;
}

export const current = () => summary;

/** Run at ready: log the build and warn the GM about a mixed release. */
export async function announce() {
  const s = await check();
  console.log(`WoDX | ${s.line}`);
  if ( game.user?.isGM && s.state === "mixed" ) {
    ui.notifications.warn(`${s.line}. The WoDX packages on this server come from different commits.`);
  }
  if ( ui.settings?.rendered ) ui.settings.render();
  return s;
}

/** renderSettings hook: add the build line to the Settings sidebar, for the GM only. */
export function onRenderSettings(app, html) {
  if ( !game.user?.isGM || !summary ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if ( !root ) return;
  root.querySelector(".wodx-release")?.remove();
  const p = document.createElement("p");
  p.className = `wodx-release wodx-release-${summary.state}`;
  p.title = summary.groups.map(g => `${g.commit}: ${g.ids.join(", ")}`).concat(
    summary.unstamped.length ? [`not stamped: ${summary.unstamped.join(", ")}`] : []).join("\n");
  p.textContent = summary.line;
  const info = root.querySelector("section.info, .info, section") ?? root;
  info.append(p);
}
