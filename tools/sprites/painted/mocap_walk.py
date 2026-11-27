# Blender: drive the figure's skeleton (mocap_rig.py) with a recorded walk, then render 4 directions x 9 frames.
# blender -b <rigged.blend> -P mocap_walk.py -- <out_dir> <walk.bvh> [test]
# The walk is retargeted by direction: each bone is turned to point the way the matching joint pair points in the
# recording, so the figure's own proportions stay and the motion is a real person's. One full gait cycle (two steps)
# is cut from the recording and sampled into 8 frames; frame 0 is a standing pose.
import bpy, sys, math, os, time
from mathutils import Euler, Vector, Quaternion, Matrix
t0 = time.time()
args = sys.argv[sys.argv.index("--") + 1:]
out, bvh = args[0], args[1]; test = len(args) > 2
sc = bpy.context.scene
rig = bpy.data.objects["rig"]; pb = rig.pose.bones
N = 8
PALM = float(os.environ.get("WALK_PALM", "0"))   # extra twist of the hands about the forearm, radians (L; R mirrored)

# ---- the recording ----
bpy.ops.import_anim.bvh(filepath=bvh, axis_forward="-Z", axis_up="Y", update_scene_fps=False, update_scene_duration=False)
mc = [o for o in sc.objects if o.type == "ARMATURE" and o != rig][0]
act = mc.animation_data.action
f0, f1 = [int(x) for x in act.frame_range]
MAP = {  # our bone: (joint it starts at, joint it points to) in the CMU skeleton
    "spine": ("LowerBack", "Spine1"), "chest": ("Spine1", "Neck1"), "neck": ("Neck1", "Head"), "head": ("Head", "Head@tail"),
"upper_arm.L": ("LeftArm", "LeftForeArm"), "forearm.L": ("LeftForeArm", "LeftHand"), "hand.L": ("LeftForeArm", "LeftHand"),
"upper_arm.R": ("RightArm", "RightForeArm"), "forearm.R": ("RightForeArm", "RightHand"), "hand.R": ("RightForeArm", "RightHand"),
    "thigh.L": ("LeftUpLeg", "LeftLeg"), "shin.L": ("LeftLeg", "LeftFoot"), "foot.L": ("LeftFoot", "LeftFoot@tail"),
    "thigh.R": ("RightUpLeg", "RightLeg"), "shin.R": ("RightLeg", "RightFoot"), "foot.R": ("RightFoot", "RightFoot@tail"),
}
def joints(f):
    sc.frame_set(f); bpy.context.view_layer.update()
    P = {}
    for b in mc.pose.bones:
        P[b.name] = mc.matrix_world @ b.head; P[b.name + "@tail"] = mc.matrix_world @ b.tail
    return P
first, last = joints(f0), joints(f1)
fwd = last["Hips"] - first["Hips"]; fwd.z = 0; fwd.normalize()
HEAD = fwd.to_track_quat("-Y", "Z").inverted()   # turns the walking direction to -Y, the figure's front
# the figure's left must be the recording's left: check with the hips and mirror x if needed
lr = HEAD @ (first["LeftUpLeg"] - first["RightUpLeg"])
MIRROR = lr.x < 0
def look(P, a, b):
    d = HEAD @ (P[b] - P[a])
    if MIRROR: d.x = -d.x
    return d.normalized()
# one gait cycle: between two moments when the left foot is furthest ahead of the right
lead = []
for f in range(f0, f1 + 1):
    P = joints(f); lead.append((f, -(HEAD @ (P["LeftFoot"] - P["RightFoot"])).y))
peaks = [lead[i][0] for i in range(2, len(lead) - 2) if lead[i][1] == max(v for _, v in lead[i - 2:i + 3]) and lead[i][1] > 0]
c0, c1 = peaks[0], peaks[1]
print("cycle frames", c0, c1, "mirror", MIRROR)
hipz = [joints(f)["Hips"].z for f in range(c0, c1)]
mean_hz = sum(hipz) / len(hipz)
leg_mc = (first["LeftUpLeg"] - first["LeftFoot"]).length
leg_us = (rig.data.bones["thigh.L"].head_local - rig.data.bones["shin.L"].tail_local).length
BOB = leg_us / leg_mc

# ---- posing our skeleton ----
ORDER = ["spine", "chest", "neck", "head", "shoulder.L", "upper_arm.L", "forearm.L", "hand.L", "shoulder.R", "upper_arm.R",
         "forearm.R", "hand.R", "thigh.L", "shin.L", "foot.L", "thigh.R", "shin.R", "foot.R"]
def pose(dirs, lift=Vector()):
    for b in pb: b.rotation_mode = "QUATERNION"; b.rotation_quaternion = Quaternion(); b.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for n in ORDER:
        b = pb[n]; rest = b.bone.matrix_local
        if b.parent:
            par = b.parent
            head = (par.matrix @ par.bone.matrix_local.inverted()) @ rest.translation
        else:
            head = rest.translation + lift
        rd = (rest.to_3x3() @ Vector((0, 1, 0))).normalized()
        q = rd.rotation_difference(dirs[n])
        if PALM and n.startswith("hand."):
            q = Quaternion(dirs[n], PALM * (1 if n.endswith("L") else -1)) @ q
        M = Matrix.Translation(head) @ (q.to_matrix() @ rest.to_3x3()).to_4x4()
        b.matrix = M
        bpy.context.view_layer.update()
def key(f):
    for b in pb:
        b.keyframe_insert("rotation_quaternion", frame=f); b.keyframe_insert("location", frame=f)
# frame 0: standing, everything plumb, arms hanging just clear of the body, toes forward
down = Vector((0, 0, -1)); up = Vector((0, 0, 1))
R0 = {n: (pb[n].bone.matrix_local.to_3x3() @ Vector((0, 1, 0))).normalized() for n in pb.keys()}
stand = {"spine": R0["spine"], "chest": R0["chest"], "neck": R0["neck"], "head": R0["head"],
         "shoulder.L": R0["shoulder.L"], "shoulder.R": R0["shoulder.R"],
         "thigh.L": down, "shin.L": down, "thigh.R": down, "shin.R": down,
         "foot.L": Vector((0, -1, -0.35)).normalized(), "foot.R": Vector((0, -1, -0.35)).normalized()}
for s, sx in (("L", 1), ("R", -1)):
    a = Vector((sx * math.sin(math.radians(8)), 0, -math.cos(math.radians(8))))
    stand[f"upper_arm.{s}"] = a; stand[f"forearm.{s}"] = Vector((a.x, -0.12, a.z)).normalized(); stand[f"hand.{s}"] = stand[f"forearm.{s}"]
pose(stand); key(0)
TORSO = ("spine", "chest", "neck", "head")
REST = {n: (pb[n].bone.matrix_local.to_3x3() @ Vector((0, 1, 0))).normalized() for n in pb.keys()}
cyc = [joints(round(c0 + (c1 - c0) * i / N)) for i in range(N)]
MEAN = {n: sum((look(P, *MAP[n]) for P in cyc), Vector()).normalized() for n in TORSO}
for i in range(N):
    P = joints(round(c0 + (c1 - c0) * i / N))
    dirs = {n: look(P, a, b) for n, (a, b) in MAP.items()}
    for n in TORSO: dirs[n] = MEAN[n].rotation_difference(dirs[n]) @ REST[n]
    # our hips are set wider than the recorded person's walking line: keep only part of the legs' sideways lean,
    # so each foot lands under its own hip and the legs do not cross
    for n in ("thigh.L", "shin.L", "thigh.R", "shin.R"):
        d = dirs[n].copy(); d.x *= 0.3; dirs[n] = d.normalized()
    for s_ in ("L", "R"): dirs[f"shoulder.{s_}"] = REST[f"shoulder.{s_}"]
    lift = Vector((0, 0, (P["Hips"].z - mean_hz) * BOB))
    pose(dirs, lift); key(i + 1)
mc.hide_render = True
# the recorded joints of the 8 sampled frames, side-on, for the frame check (check_walk.py)
import json
STICK = ["LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot", "LeftArm", "LeftForeArm", "LeftHand",
         "RightArm", "RightForeArm", "RightHand", "Hips", "Neck1", "Head"]
rec = []
for i in range(N):
    P = joints(round(c0 + (c1 - c0) * i / N))
    rec.append({k: list(HEAD @ (P[k] - P["Hips"])) for k in STICK})
os.makedirs(out, exist_ok=True)
json.dump(rec, open(os.path.join(out, "mocap_joints.json"), "w"))
sc.frame_set(0)

# camera: orthographic, 3/4 top-down like LPC (about 30 degrees down)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 2.0
el = math.radians(30); dist = 10
cam.location = (0, -dist * math.cos(el), 0.9 + dist * math.sin(el))
cam.rotation_euler = Euler((math.radians(90) - el, 0, 0))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.85, 0.78, 1)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 2.0; sun.rotation_euler = Euler((math.radians(50), 0, math.radians(-40)))
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Standard"
# the figure stands at the centre of its pelvis
px = rig.data.bones["spine"].head_local
rig.location = (0, 0, 0)
dirs4 = [("up", 180), ("left", -90), ("down", 0), ("right", 90)]
frames = [0, 1, 3, 5, 7] if test else range(N + 1)
os.makedirs(out, exist_ok=True)
for name, deg in dirs4:
    if test and name not in ("down", "left"): continue
    rig.rotation_euler = Euler((0, 0, math.radians(deg)))
    rig.location = Matrix.Rotation(math.radians(deg), 4, "Z") @ Vector((-px.x, -px.y, 0))
    for f in frames:
        sc.frame_set(f)
        sc.render.filepath = os.path.join(out, f"{name}_{f}.png")
        bpy.ops.render.render(write_still=True)
print(f"WALK DONE {time.time()-t0:.1f}s")
