# Blender: a head-and-shoulders portrait of a rigged figure: front view, soft even warm light, dark background.
# blender -b <rigged.blend> -P portrait.py -- <out.png> [size=512]
import bpy, sys, math, os
from mathutils import Euler, Vector
args = sys.argv[sys.argv.index("--") + 1:]; out = args[0]; size = int(args[1]) if len(args) > 1 else 512
sc = bpy.context.scene
body = bpy.data.objects["townsman"]
co = [body.matrix_world @ v.co for v in body.data.vertices]
top = max(c.z for c in co)
head = [c for c in co if c.z > top - 0.25]
cx = sum(c.x for c in head) / len(head); front = min(c.y for c in head)
# Head only (Ben, 27 Nov): clothing, neck and shoulders are removed from the model, so nothing below the jaw shows.
import bmesh
CHIN = float(os.environ.get("P_CHIN", "0.235")); SIDE = float(os.environ.get("P_SIDE", "0.085"))
for m in [m for m in body.modifiers if m.type == "ARMATURE"]: m.show_render = m.show_viewport = False
bm = bmesh.new(); bm.from_mesh(body.data)
NECK = float(os.environ.get("P_NECK", "0.195"))   # below this the head keeps only the beard and chin, at the front
def gone(c):
    if c.z < top - CHIN: return True
    if c.z < top - CHIN + 0.07 and abs(c.x - cx) > SIDE: return True
    return c.z < top - NECK and (abs(c.x - cx) > 0.06 or c.y > front + 0.075)
cut = [f for f in bm.faces if gone(body.matrix_world @ f.calc_center_median())]
bmesh.ops.delete(bm, geom=cut, context="FACES"); bm.to_mesh(body.data); bm.free()
cam = bpy.data.objects.new("pcam", bpy.data.cameras.new("pcam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; import os; cam.data.ortho_scale = float(os.environ.get("P_ORTHO", "0.42"))
cz = top - float(os.environ.get("P_DROP", "0.17"))
cam.location = (cx, front - 3, cz); cam.rotation_euler = Euler((math.radians(90), 0, 0))
w = bpy.data.worlds.new("pw"); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (1.0, 0.86, 0.7, 1); bg.inputs[1].default_value = 0.9
key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA")); sc.collection.objects.link(key)
key.data.energy = 60; key.data.size = 2.5; key.data.color = (1.0, 0.88, 0.72)
key.location = (cx - 0.8, front - 1.6, cz + 0.8); key.rotation_euler = (Vector((cx, 0, cz)) - key.location).to_track_quat("-Z", "Y").to_euler()
sc.render.engine = "BLENDER_EEVEE"; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = size
sc.view_settings.view_transform = "Standard"
sc.render.filepath = out; sc.frame_set(0)
bpy.ops.render.render(write_still=True)
