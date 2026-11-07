/**
 * Search boxes for WoDX menus (rule B24). Every list a person picks from gets a box that filters it as they type.
 *
 *   searchBox("select[name=mortal]")      a box that filters that select's options
 *   searchBox("ul.wodx-list")             ...or a list's items, or a table's rows
 *
 * One listener on the document does the filtering, so it works in windows and in DialogV2 dialogs alike.
 */

const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const escAttr = s => String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

/** The markup for a search box over the elements matching `target` in the same window. */
export function searchBox(target, placeholder = "Search…", label = "Search") {
  return `<input type="search" class="wodx-search" data-search="${escAttr(target)}" placeholder="${escAttr(placeholder)}"
    aria-label="${escAttr(label)}" autocomplete="off" spellcheck="false">`;
}

function itemsOf(el) {
  if ( el.tagName === "TABLE" ) return [...el.querySelectorAll(":scope > tbody > tr")];
  if ( el.tagName === "TBODY" ) return [...el.querySelectorAll(":scope > tr")];
  if ( el.tagName === "UL" || el.tagName === "OL" ) return [...el.querySelectorAll(":scope > li")];
  return [...el.querySelectorAll("[data-search-item]")];
}

/** Filter what a search box points at. Returns how many entries are still shown. */
export function applySearch(box) {
  const scope = box.closest(".application, dialog, .window-content, form") ?? box.ownerDocument;
  const q = norm(box.value);
  let shown = 0;
  for ( const el of scope.querySelectorAll(box.dataset.search) ) {
    if ( el.tagName === "SELECT" ) {
      for ( const opt of el.options ) {
        // An empty choice ("Unknown", "None") always stays
        const keep = !q || opt.value === "" || norm(opt.textContent).includes(q);
        opt.hidden = !keep;
        if ( keep ) shown++;
      }
      // The current choice is never changed by a search: some selects act as soon as they change (the era lock)
      continue;
    }
    for ( const item of itemsOf(el) ) {
      const keep = !q || norm(item.dataset.searchText ?? item.textContent).includes(q);
      item.style.display = keep ? "" : "none";
      if ( keep ) shown++;
    }
  }
  box.dataset.shown = String(shown);
  return shown;
}

/** Install the one document listener (idempotent). */
export function installSearch(doc = globalThis.document) {
  if ( !doc || doc.__wodxSearch ) return;
  doc.__wodxSearch = true;
  doc.addEventListener("input", ev => {
    const box = ev.target?.closest?.("input.wodx-search");
    if ( box ) applySearch(box);
  });
  // Enter in a search box must not submit the dialog it sits in
  doc.addEventListener("keydown", ev => {
    if ( ev.key === "Enter" && ev.target?.matches?.("input.wodx-search") ) ev.preventDefault();
  }, true);
}
