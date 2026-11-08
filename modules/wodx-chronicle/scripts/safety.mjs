import {emit, esc, isActiveGM, rule} from "./util.mjs";
import {searchBox} from "./search.mjs";
import {recordLineOrVeil, ensureSessionZero, getLinesVeils, removeLinesVeils} from "./journals.mjs";

/* -------------------------------------------- */
/*  X-card                                      */
/* -------------------------------------------- */

let overlayTimer = null;

/** Show the X-card on this screen. */
export function showXCard() {
  document.getElementById("wodx-xcard")?.remove();
  const el = document.createElement("div");
  el.id = "wodx-xcard";
  el.className = "wodx-xcard";
  el.setAttribute("role", "alert");
  el.innerHTML = `
    <div class="wodx-xcard-card">
      <div class="wodx-xcard-x" aria-hidden="true">X</div>
      <p><strong>The X-card was used.</strong></p>
      <p>That content stops here. The Storyteller moves the scene on; nobody asks why.</p>
      <p class="wodx-quiet">Click to close</p>
    </div>`;
  el.addEventListener("click", () => el.remove());
  document.body.append(el);
  Hooks.callAll("wodxXCard");
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => el.remove(), 12000);
}

/** Anyone presses the X-card. No name travels with it. */
export function pressXCard() {
  showXCard();
  emit("safety.xcard", {});
  onXCardGM();
}

/** The active GM's side: pause if that switch is on. */
export async function onXCardGM() {
  if ( !isActiveGM() ) return;
  if ( rule("xcardPauses") && !game.paused ) game.togglePause(true, {broadcast: true});
}

/* -------------------------------------------- */
/*  Lines and veils                             */
/* -------------------------------------------- */

export async function submitLineOrVeil() {
  const {DialogV2} = foundry.applications.api;
  const canSign = rule("signedLinesVeils");
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Lines and veils"},
    content: `
      <p>A <strong>line</strong> never appears in the game. A <strong>veil</strong> happens off screen only.</p>
      <div class="form-group"><label>Kind</label>
        <select name="kind" data-fixed><option value="line">Line</option><option value="veil">Veil</option></select></div>
      <div class="form-group"><label>What</label><textarea name="text" rows="3" maxlength="500" required></textarea></div>
      ${canSign ? `<div class="form-group"><label><input type="checkbox" name="sign"> Sign it with my name</label></div>` : ""}
      <p class="wodx-quiet">${canSign ? "Unsigned entries are recorded without a name." : "Entries are recorded without a name."}</p>`,
    ok: {
      label: "Add",
      callback: (event, button) => {
        const f = button.form.elements;
        return {kind: f.kind.value, text: f.text.value.trim(), sign: !!f.sign?.checked};
      }
    },
    rejectClose: false
  });
  if ( !result?.text ) return;
  const entry = {kind: result.kind, text: result.text, by: (canSign && result.sign) ? game.user.name : null};
  if ( game.user.isGM ) await recordLineOrVeil(entry);
  else if ( !emit("safety.lineVeil", entry, {needsGM: true}) ) return;
  ui.notifications.info("Added to Session Zero.");
}

/** Active GM records a player's entry. */
export async function onLineVeilGM(entry) {
  if ( !isActiveGM() ) return;
  await recordLineOrVeil(entry);
}

/** GM: remove entries. */
export async function manageLinesVeils() {
  if ( !game.user.isGM ) return;
  const list = getLinesVeils();
  if ( !list.length ) {
    ui.notifications.info("No lines or veils have been recorded yet.");
    return;
  }
  const {DialogV2} = foundry.applications.api;
  const rows = list.map(e => `<li><label><input type="checkbox" name="rm" value="${e.at}">
    <strong>${e.kind === "veil" ? "Veil" : "Line"}:</strong> ${esc(e.text)}${e.by ? ` <em>(${esc(e.by)})</em>` : ""}</label></li>`).join("");
  const stamps = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Remove lines or veils"},
    content: `<p>Tick the entries to remove.</p>${searchBox("ul.wodx-linesveils", "Search lines and veils…", "Search lines and veils")}
      <ul class="wodx-list wodx-linesveils">${rows}</ul>`,
    ok: {
      label: "Remove ticked",
      callback: (event, button) => [...button.form.querySelectorAll("input[name=rm]:checked")].map(i => Number(i.value))
    },
    rejectClose: false
  });
  if ( stamps?.length ) await removeLinesVeils(stamps);
}

export async function openSessionZero() {
  const journal = game.user.isGM ? await ensureSessionZero()
    : game.journal.find(j => j.getFlag("wodx-chronicle", "kind") === "session-zero");
  if ( !journal ) return ui.notifications.info("The Storyteller has not opened Session Zero yet.");
  journal.sheet.render(true);
}
