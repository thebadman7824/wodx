# Blender: walk cycle on the Rigify FK controls, then render 4 directions x 9 frames, 3/4 top-down ortho.
# blender -b <rigged.blend> -P walk.py -- <out_dir> [test]
import bpy, sys, math, os, time
from mathutils import Euler
t0 = time.time()
args = sys.argv[sys.argv.index("--") + 1:]
out = args[0]; test = len(args) > 1
sc = bpy.context.scene
rig = bpy.data.objects["rig"]
pb = rig.pose.bones
for side in ("L", "R"):
    for p in ("thigh_parent", "upper_arm_parent"):
        n = f"{p}.{side}"
        if n in pb and "IK_FK" in pb[n]: pb[n]["IK_FK"] = 1.0
for b in pb: b.rotation_mode = "XYZ"

N = 8  # walk frames; frame 0 = stand
SW, KN, AR = math.radians(20), math.radians(32), math.radians(20)
from mathutils import Quaternion, Vector
# Rotations are given about the world X axis (the walking swing axis), whatever roll Rigify gave each FK control.
# Sign: positive swings a bone's lower end backward, negative forward.
def wrot(b, q):
    """set a world-space rotation q on a bone, about its own head"""
    rest = rig.data.bones[b.name].matrix_local.to_quaternion()
    b.rotation_mode = "QUATERNION"; b.rotation_quaternion = rest.inverted() @ q @ rest
def wx(b, ang): wrot(b, Quaternion(Vector((1, 0, 0)), ang))
# Arms modelled held out (A-pose, often reaching a little forward) are first lowered to hang at the sides:
# the turn that takes each upper arm from its modelled direction to straight down and 15 degrees out (clear of a full tunic).
DROP = {}
for side, sg in (("L", 1), ("R", -1)):
    bn = rig.data.bones[f"DEF-upper_arm.{side}"]
    d = (bn.tail_local - bn.head_local).normalized()
    want = Vector((sg * math.sin(math.radians(15)), 0, -math.cos(math.radians(15))))
    DROP[side] = d.rotation_difference(want) if math.degrees(d.angle(want)) > 12 else Quaternion()
# Forearms modelled bent or reaching forward are straightened onto the upper arm's line first.
FORE = {}
for side in ("L", "R"):
    ub, fb = rig.data.bones[f"DEF-upper_arm.{side}"], rig.data.bones[f"DEF-forearm.{side}"]
    FORE[side] = (fb.tail_local - fb.head_local).normalized().rotation_difference((ub.tail_local - ub.head_local).normalized())
# Legs modelled splayed or with the toes turned out are brought straight under the hip, toes forward, so both
# legs walk the same way (pass 2 limped on a splayed right leg).
LEGQ = {}
for side in ("L", "R"):
    th, sh, ft = (rig.data.bones[f"DEF-{n}.{side}"] for n in ("thigh", "shin", "foot"))
    d = (sh.tail_local - th.head_local).normalized()
    q = d.rotation_difference(Vector((0, 0, -1)))
    f = q @ (ft.tail_local - ft.head_local); f.z = 0
    yaw = Vector((f.x, f.y, 0)).normalized().rotation_difference(Vector((0, -1, 0))) if f.length > 1e-4 else Quaternion()
    LEGQ[side] = yaw @ q
def warm(b, side, swing):
    wrot(b, Quaternion(Vector((1, 0, 0)), swing) @ DROP[side])
def wleg(b, side, swing):
    wrot(b, Quaternion(Vector((1, 0, 0)), swing) @ LEGQ[side])
def key(f, phase):
    s = math.sin(phase); c = math.cos(phase)
    for side, sg in (("L", 1), ("R", -1)):
        th, sh, ft = pb[f"thigh_fk.{side}"], pb[f"shin_fk.{side}"], pb[f"foot_fk.{side}"]
        ua, fa = pb[f"upper_arm_fk.{side}"], pb[f"forearm_fk.{side}"]
        a = sg * s
        wleg(th, side, -SW * a)
        bend = max(0.0, sg * c) * KN + 0.06      # knee bends while the leg swings through the passing pose
        wx(sh, bend)
        wx(ft, 0.3 * SW * a - 0.5 * bend)
        warm(ua, side, AR * a)                    # each arm hangs at the side and swings against the leg on its side
        wrot(fa, Quaternion(Vector((1, 0, 0)), -(0.15 + 0.3 * max(0.0, -a))) @ FORE[side])   # straight arm, the elbow bending forward on the forward swing
        for bb in (th, sh, ft, ua, fa): bb.keyframe_insert("rotation_quaternion", frame=f)
    tor = pb["torso"]
    tor.location = (0, 0, 0.018 * abs(math.cos(phase)) - 0.018) if f else (0, 0, 0)
    tor.keyframe_insert("location", frame=f)
def stand(f):
    for side in ("L", "R"):
        for n in ("thigh_fk", "shin_fk", "foot_fk", "upper_arm_fk", "forearm_fk"):
            bb = pb[f"{n}.{side}"]; bb.rotation_mode = "QUATERNION"; bb.rotation_quaternion = Quaternion()
            if n == "upper_arm_fk": warm(bb, side, 0.0)
            if n == "thigh_fk": wleg(bb, side, 0.0)
            if n == "forearm_fk": wrot(bb, Quaternion(Vector((1, 0, 0)), -0.15) @ FORE[side])
            bb.keyframe_insert("rotation_quaternion", frame=f)
    pb["torso"].location = (0, 0, 0); pb["torso"].keyframe_insert("location", frame=f)
stand(0)
for i in range(N): key(i + 1, 2 * math.pi * i / N)

# camera: orthographic, 3/4 top-down like LPC (about 30 degrees down)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = 2.0
el = math.radians(30); dist = 10
cam.location = (0, -dist * math.cos(el), 0.9 + dist * math.sin(el))
cam.rotation_euler = Euler((math.radians(90) - el, 0, 0))
# soft even light
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.85, 0.78, 1)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 2.0; sun.rotation_euler = Euler((math.radians(50), 0, math.radians(-40)))  # from the north-west
sc.render.engine = "BLENDER_EEVEE"
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Standard"

# LPC row order: up (north, back to camera), left, down (south, facing camera), right
dirs = [("up", 180), ("left", -90), ("down", 0), ("right", 90)]
frames = [0, 3, 7] if test else range(N + 1)
os.makedirs(out, exist_ok=True)
for name, deg in dirs:
    if test and name not in ("down", "left"): continue
    rig.rotation_euler = Euler((0, 0, math.radians(deg)))
    for f in frames:
        sc.frame_set(f)
        sc.render.filepath = os.path.join(out, f"{name}_{f}.png")
        bpy.ops.render.render(write_still=True)
print(f"WALK DONE {time.time()-t0:.1f}s")
