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
def wx(b, ang):
    ax = (rig.data.bones[b.name].matrix_local.to_3x3().inverted() @ Vector((1, 0, 0))).normalized()
    b.rotation_mode = "QUATERNION"; b.rotation_quaternion = Quaternion(ax, ang)
def key(f, phase):
    s = math.sin(phase); c = math.cos(phase)
    for side, sg in (("L", 1), ("R", -1)):
        th, sh, ft = pb[f"thigh_fk.{side}"], pb[f"shin_fk.{side}"], pb[f"foot_fk.{side}"]
        ua, fa = pb[f"upper_arm_fk.{side}"], pb[f"forearm_fk.{side}"]
        a = sg * s
        wx(th, -SW * a)
        bend = max(0.0, sg * c) * KN + 0.06      # knee bends while the leg swings through the passing pose
        wx(sh, bend)
        wx(ft, 0.3 * SW * a - 0.5 * bend)
        wx(ua, AR * a)                            # each arm swings against the leg on its side
        wx(fa, 0.25 - 0.15 * max(0.0, -a))       # the mesh already holds an elbow bend: straighten it a little, less on the forward swing
        for bb in (th, sh, ft, ua, fa): bb.keyframe_insert("rotation_quaternion", frame=f)
    tor = pb["torso"]
    tor.location = (0, 0, 0.018 * abs(math.cos(phase)) - 0.018) if f else (0, 0, 0)
    tor.keyframe_insert("location", frame=f)
def stand(f):
    for side in ("L", "R"):
        for n in ("thigh_fk", "shin_fk", "foot_fk", "upper_arm_fk", "forearm_fk"):
            bb = pb[f"{n}.{side}"]; bb.rotation_mode = "QUATERNION"; bb.rotation_quaternion = Quaternion(); bb.keyframe_insert("rotation_quaternion", frame=f)
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
