/**
 * B8130: points git at tools/git-hooks (the merge-train push guard) in this clone, once. Called by review.mjs,
 * claim.mjs and merge-stamp.mjs; never throws, and leaves a hooks path someone set to something else alone.
 */
import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export function installHooks(root = ROOT) {
  try {
    const git = (...a) => execFileSync("git", a, {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
    let now = "";
    try { now = git("config", "--local", "--get", "core.hooksPath"); } catch { /* unset */ }
    if ( now === "tools/git-hooks" ) return "already";
    if ( now ) return "other";
    git("config", "--local", "core.hooksPath", "tools/git-hooks");
    return "set";
  } catch { return "failed"; }
}
if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) console.log(`core.hooksPath: ${installHooks()}`);
