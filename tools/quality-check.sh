#!/usr/bin/env bash
# WoDX quality gate, automatic part. Usage: tools/quality-check.sh [package dir ...]
# Default: every WoDX module plus the system fork's changed files.
set -u
cd "$(dirname "$0")/.."
fail=0
# Windows: the python3 on the PATH may be the Microsoft Store stub, and Python reads files in the ANSI code page
PY=python3
python3 -c "" 2>/dev/null || PY=python
export PYTHONUTF8=1
TMPD="${TMPDIR:-${TEMP:-/tmp}}"
targets=("$@")
[ ${#targets[@]} -eq 0 ] && targets=(modules/*)

echo "== Parse check"
for t in "${targets[@]}"; do
  while IFS= read -r f; do
    node --check "$f" 2>"$TMPD/qc.err" || { echo "FAIL parse: $f"; cat "$TMPD/qc.err"; fail=1; }
  done < <(find "$t" -name '*.mjs' -o -name '*.js' | grep -v node_modules)
  while IFS= read -r f; do
    "$PY" -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>"$TMPD/qc.err" || { echo "FAIL json: $f"; cat "$TMPD/qc.err"; fail=1; }
  done < <(find "$t" -name '*.json' | grep -v node_modules)
done

echo "== module.json"
for m in modules/*/module.json; do
  "$PY" - "$m" <<'PY' || fail=1
import json, os, sys
p = sys.argv[1]; d = json.load(open(p)); root = os.path.dirname(p); bad = []
for k in ("id", "title", "version", "compatibility"):
    if k not in d: bad.append(f"missing {k}")
if d.get("id") != os.path.basename(root): bad.append("id does not match folder")
for k in ("esmodules", "scripts", "styles"):
    for f in d.get(k, []):
        if not os.path.exists(os.path.join(root, f)): bad.append(f"{k} path missing: {f}")
for l in d.get("languages", []):
    if not os.path.exists(os.path.join(root, l["path"])): bad.append(f"language missing: {l['path']}")
if bad: print("FAIL", p, "; ".join(bad)); sys.exit(1)
print("ok", p)
PY
done

echo "== Imports resolve"
for t in "${targets[@]}"; do
  while IFS= read -r f; do
    dir=$(dirname "$f")
    grep -oE "from \"\./[^\"]+\"|from \"\.\./[^\"]+\"" "$f" | sed -E 's/from "(.*)"/\1/' | while read -r imp; do
      # Foundry's Data folder keeps systems/ beside modules/; in the repo the system fork is system/
      [ -f "$dir/$imp" ] || [ -f "${dir}/${imp/..\/..\/..\/systems\//../../../system/}" ] || { echo "FAIL import in $f: $imp"; echo x >> "$TMPD/qc.fail"; }
    done
  done < <(find "$t" \( -name '*.mjs' -o -name '*.js' \) | grep -v node_modules)
done
[ -f "$TMPD/qc.fail" ] && { fail=1; rm -f "$TMPD/qc.fail"; }

echo "== Unit tests"
for t in "${targets[@]}"; do
  if [ -d "$t/tests" ]; then
    (cd "$t" && node --test tests/*.test.mjs 2>&1 | grep -E "^# (pass|fail)") ; 
    (cd "$t" && node --test tests/*.test.mjs >/dev/null 2>&1) || { echo "FAIL tests in $t"; fail=1; }
  fi
done

echo "== Mock-Foundry harness"
if [ -d tools/harness/node_modules ]; then
  (cd tools/harness && node --test --test-concurrency=1 *.test.mjs 2>&1 | grep -E "^# (pass|fail)")
  (cd tools/harness && node --test --test-concurrency=1 *.test.mjs >/dev/null 2>&1) || { echo "FAIL harness"; fail=1; }
else
  echo "  skipped: run 'npm install' in tools/harness first"
fi

echo "== UI fit (rule B17)"
FOUNDRY_CSS="${FOUNDRY_CSS:-/mnt/user-data/uploads/Foundry Virtual Tabletop/resources/app/public/css/foundry2.css}"
# Ben's PC: Foundry is installed on G:
[ -f "$FOUNDRY_CSS" ] || [ ! -f "/g/Foundry Virtual Tabletop/resources/app/public/css/foundry2.css" ] || FOUNDRY_CSS="/g/Foundry Virtual Tabletop/resources/app/public/css/foundry2.css"
if [ -f "$FOUNDRY_CSS" ] && [ -d tools/harness/node_modules ]; then
  (cd tools/harness && node ui-fit.mjs "$FOUNDRY_CSS" 2>&1 | grep -E "^(FAIL|== UI)")
  (cd tools/harness && node ui-fit.mjs "$FOUNDRY_CSS" >/dev/null 2>&1) || { echo "FAIL ui-fit"; fail=1; }
else
  echo "  skipped: needs Foundry's foundry2.css (set FOUNDRY_CSS) and the harness installed"
fi

echo "== Writes and deletes to review"
for t in "${targets[@]}"; do
  grep -nE "\.(delete|deleteEmbeddedDocuments|update|updateEmbeddedDocuments|setFlag|unsetFlag|create|createEmbeddedDocuments)\(|settings\.set\(|setSetting\(|togglePause\(|time\.(set|advance)\(" -r "$t" --include=*.mjs | grep -v "/tests/" | sed 's/^/  /'
done

[ $fail -eq 0 ] && echo "== All automatic checks passed" || echo "== Automatic checks FAILED"
exit $fail
