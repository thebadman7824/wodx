# Era check on reference drafts with the local vision model: python vcheck.py figures/<id>.json img...
import json, sys, base64, urllib.request
spec = json.load(open(sys.argv[1], encoding="utf-8"))
for f in sys.argv[2:]:
    b = base64.b64encode(open(f, "rb").read()).decode(); ans = []
    for q in spec["check"]:
        body = {"model": "qwen2.5vl:7b", "stream": False, "options": {"temperature": 0}, "messages": [{"role": "user", "content": q, "images": [b]}]}
        r = json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:11434/api/chat", json.dumps(body).encode(), {"Content-Type": "application/json"})))
        ans.append(r["message"]["content"].strip().lower()[:3].strip(" .,"))
    ok = all(a.startswith(e) for a, e in zip(ans, spec["expect"]))
    print(("PASS" if ok else "FAIL"), f, ans, flush=True)
