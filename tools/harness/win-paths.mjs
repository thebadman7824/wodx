/**
 * Lets the harness run on Windows. The tests load modules with import(join(root, ...)), and on Windows that gives a
 * path like C:\...\main.mjs, which Node's ESM loader reads as a URL with the scheme "c:". This hook turns such a path
 * into a file:// URL, keeping a ?query (one test imports legacy.js?again to load it a second time). Elsewhere it does
 * nothing. Every test file and ui-fit.mjs import this first.
 */
import {registerHooks} from "node:module";
import {pathToFileURL} from "node:url";

const isDrivePath = s => typeof s === "string" && /^[a-zA-Z]:[\\/]/.test(s);

export function toURL(s) {
  if ( !isDrivePath(s) ) return s;
  const q = s.search(/[?#]/);
  return q < 0 ? pathToFileURL(s).href : pathToFileURL(s.slice(0, q)).href + s.slice(q);
}

if ( process.platform === "win32" && typeof registerHooks === "function" ) {
  // Only for import(): the hook also sees require(), which takes a plain C:\ path and fails on a file:// one
  // (Playwright's own require of its package.json broke ui-fit.mjs that way)
  const isRequire = context => context?.conditions?.includes?.("require");
  registerHooks({resolve: (specifier, context, next) => next(isRequire(context) ? specifier : toURL(specifier), context)});
}
