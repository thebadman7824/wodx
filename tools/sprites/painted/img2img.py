# FLUX img2img over a Blender render: python img2img.py <input name in ComfyUI/input> <prefix> <denoise> <seed> "<prompt>"
import json, sys, time, urllib.request
inp, prefix, den, seed, P = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
wf = {
"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux1-schnell-fp8.safetensors"}},
"2":{"class_type":"CLIPTextEncode","inputs":{"text":P,"clip":["1",1]}},
"3":{"class_type":"CLIPTextEncode","inputs":{"text":"","clip":["1",1]}},
"4":{"class_type":"LoadImage","inputs":{"image":inp}},
"8":{"class_type":"VAEEncode","inputs":{"pixels":["4",0],"vae":["1",2]}},
"5":{"class_type":"KSampler","inputs":{"model":["1",0],"positive":["2",0],"negative":["3",0],"latent_image":["8",0],"seed":seed,"steps":4,"cfg":1.0,"sampler_name":"euler","scheduler":"simple","denoise":den}},
"6":{"class_type":"VAEDecode","inputs":{"samples":["5",0],"vae":["1",2]}},
"7":{"class_type":"SaveImage","inputs":{"images":["6",0],"filename_prefix":prefix}}}
pid = json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8188/prompt", json.dumps({"prompt": wf}).encode(), {"Content-Type": "application/json"})))["prompt_id"]
while True:
    h = json.load(urllib.request.urlopen(f"http://127.0.0.1:8188/history/{pid}"))
    if pid in h:
        for o in h[pid]["outputs"].values():
            for im in o.get("images", []): print(im["filename"])
        break
    time.sleep(1)
