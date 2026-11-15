import "./win-paths.mjs";
import {test} from "node:test";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The pixel drawer's object library (tools/pixelmap/library, B6330-B6349): every object's true size, the checks that
   stop a map with objects in walls, doorways or facing walls, shutters clipping, or bare rooms. Needs Python 3 with
   numpy and Pillow, else skipped. */
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "pixelmap");
const py = (() => { for ( const p of ["python3", "python"] ) { try { execFileSync(p, ["-c", "import numpy, PIL"]); return p; } catch (e) { /* next */ } } return null; })();

test("pixel library: catalogue, sizes, placement checks and migrated maps", {skip: !py && "needs Python 3 with numpy and Pillow"}, () => {
  execFileSync(py, ["-W", "ignore", "-m", "unittest", "library.test_library"], {cwd: dir, encoding: "utf8", timeout: 600000});
});
