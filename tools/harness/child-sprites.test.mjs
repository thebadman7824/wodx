// Children (B3480): the sprite rig draws a child as the same figure, shorter, with the feet on the same row.
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const py = (() => { for ( const p of ["python3", "python"] ) { try { execFileSync(p, ["-c", "import numpy, PIL"]); return p; } catch (e) { /* next */ } } return null; })();
test("child sprites: the Python checks pass", {skip: !py && "needs Python 3 with numpy and Pillow", timeout: 300000}, () => {
  const out = execFileSync(py, [fileURLToPath(new URL("../sprites/test_child.py", import.meta.url))], {encoding: "utf8"});
  assert.match(out, /child sprites ok/);
});
