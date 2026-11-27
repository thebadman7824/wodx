# Reference drafts for one figure spec: python flux2.py figures/<id>.json <seed> [<seed> ...]
import json, sys, time, urllib.request, os
spec = json.load(open(sys.argv[1], encoding="utf-8")); seeds = [int(s) for s in sys.argv[2:]]
P = (f"full body photo of {spec.get('subject','a historical reenactor')}, {spec['role']}, year {spec['era']}, {spec['person']}, wearing {spec['dress']}. "
     "Standing still and straight, arms hanging down relaxed at the sides with a small gap between each arm and the body, "
     "feet slightly apart, facing the viewer, front view, whole figure visible head to toe including both feet, "
     "even soft studio lighting, plain light grey background, clean game character concept, realistic proportions, historically accurate costume")
def wf(seed, prefix): return {
"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux1-schnell-fp8.safetensors"}},
"2":{"class_type":"CLIPTextEncode","inputs":{"text":P,"clip":["1",1]}},
"3":{"class_type":"CLIPTextEncode","inputs":{"text":"","clip":["1",1]}},
"4":{"class_type":"EmptyLatentImage","inputs":{"width":768,"height":1344,"batch_size":1}},
"5":{"class_type":"KSampler","inputs":{"model":["1",0],"positive":["2",0],"negative":["3",0],"latent_image":["4",0],"seed":seed,"steps":4,"cfg":1.0,"sampler_name":"euler","scheduler":"simple","denoise":1.0}},
"6":{"class_type":"VAEDecode","inputs":{"samples":["5",0],"vae":["1",2]}},
"7":{"class_type":"SaveImage","inputs":{"images":["6",0],"filename_prefix":prefix}}}
for seed in seeds:
    prefix = f"sprite-{spec['id']}-{seed}"
    r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8188/prompt", json.dumps({"prompt": wf(seed, prefix)}).encode(), {"Content-Type": "application/json"}))
    pid = json.load(r)["prompt_id"]; t = time.time()
    while True:
        h = json.load(urllib.request.urlopen(f"http://127.0.0.1:8188/history/{pid}"))
        if pid in h:
            for o in h[pid]["outputs"].values():
                for im in o.get("images", []): print(im["filename"], f"{time.time()-t:.1f}s", flush=True)
            break
        time.sleep(1)
