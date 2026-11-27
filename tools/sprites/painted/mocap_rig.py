# Blender: import the TRELLIS GLB, clean it, fit a Rigify human, generate the rig, skin the mesh.
# blender -b -P rig.py -- <in.glb> <out.blend>
import bpy, bmesh, sys, time, addon_utils, math
from mathutils import Vector
t0 = time.time()
glb, out = sys.argv[sys.argv.index("--") + 1:][:2]

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=glb)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = "townsman"
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
for o in list(bpy.context.scene.objects):
    if o.type == "EMPTY": bpy.data.objects.remove(o)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# clean: merge doubles, drop islands under 300 faces, decimate to ~40k faces
bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
bm.faces.ensure_lookup_table()
seen = set(); drop = []
for f in bm.faces:
    if f.index in seen: continue
    stack = [f]; isl = []
    seen.add(f.index)
    while stack:
        g = stack.pop(); isl.append(g)
        for e in g.edges:
            for h in e.link_faces:
                if h.index not in seen: seen.add(h.index); stack.append(h)
    if len(isl) < 300: drop += isl
bmesh.ops.delete(bm, geom=list(set(drop)), context="FACES")
bm.to_mesh(body.data); bm.free()
print("islands dropped faces", len(drop))
d = body.modifiers.new("dec", "DECIMATE"); d.ratio = 40000 / max(1, len(body.data.polygons))
bpy.ops.object.modifier_apply(modifier="dec")

# scale to 1.75 m, feet on the floor, centred
co = [body.matrix_world @ v.co for v in body.data.vertices]
zmin = min(c.z for c in co); zmax = max(c.z for c in co)
ymin = min(c.y for c in co); ymax = max(c.y for c in co)
xmin = min(c.x for c in co); xmax = max(c.x for c in co)
print("bbox x", xmin, xmax, "y", ymin, ymax, "z", zmin, zmax)
s = 1.75 / (zmax - zmin)
body.scale = (s, s, s)
body.location = (-(xmin + xmax) / 2 * s, -(ymin + ymax) / 2 * s, -zmin * s)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
print("faces", len(body.data.polygons))


# Footwear: TRELLIS invents the unseen sides of the shoe and tends to add a light rubber-coloured sole rim.
# Faces below the ankle get a muted copy of the material (less saturation, a little darker), so the shoe reads
# as one dark piece of leather. FOOT_MUTE=0 turns this off (for eras where a bright sole is right).
import os
if os.environ.get("FOOT_MUTE", "1") != "0" and body.data.materials:
    src = body.data.materials[0]; mm = src.copy(); mm.name = src.name + "_foot"
    nt = mm.node_tree; bsdf = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    link = bsdf.inputs["Base Color"].links[0]; tex_out = link.from_socket
    hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 0.35; hs.inputs["Value"].default_value = 0.8
    nt.links.new(tex_out, hs.inputs["Color"]); nt.links.new(hs.outputs["Color"], bsdf.inputs["Base Color"])
    body.data.materials.append(mm); mi = len(body.data.materials) - 1
    ank = 0.075 * 1.75; nf = 0
    for p in body.data.polygons:
        if max(body.data.vertices[i].co.z for i in p.vertices) < ank: p.material_index = mi; nf += 1
    print("foot faces muted", nf)

# The inside of cloth (backfaces at a hem or sleeve opening) is shaded dark, as it would be in shadow,
# instead of showing the light texture as a pale stripe when the hem lifts.
for m in body.data.materials:
    nt = m.node_tree; bsdf = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    lk = bsdf.inputs["Base Color"].links[0]; srcs = lk.from_socket
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[7].default_value = (0.05, 0.04, 0.03, 1)
    nt.links.new(geo.outputs["Backfacing"], mix.inputs[0]); nt.links.new(srcs, mix.inputs[6]); nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])


# A plain deforming skeleton fitted to the mesh, with the joints a motion-capture walk drives (mocap_walk.py).
# No Rigify: the walk comes from a recorded person, so no control rig is needed (Ben, 27 Nov: hand-made walks looked wrong).
H = 1.75
V = [v.co.copy() for v in body.data.vertices]
def slice_(z, w=0.012): return [c for c in V if abs(c.z - z) < w]
def med(vals):
    vals = sorted(vals); return vals[len(vals) // 2]
_pv = sorted(c.x for c in V if abs(c.z - 0.53 * H) < 0.015 and abs(c.x) < 0.3)
PX = (_pv[0] + _pv[-1]) / 2 if _pv else 0.0
def centre(z, w=0.02):
    sl = [c for c in V if abs(c.z - z) < w and abs(c.x - PX) < 0.12]
    return Vector((PX, med([c.y for c in sl]) if sl else 0.0, z))
pelvis, chest, neck, headb, top = centre(0.53 * H), centre(0.70 * H), centre(0.82 * H), centre(0.87 * H), centre(0.99 * H)
J = {}
for side, sx in (("L", 1), ("R", -1)):
    sl = [c for c in slice_(0.80 * H) if c.x * sx > 0]
    edge = max(c.x * sx for c in sl) if sl else 0.2
    sh = Vector((sx * (edge - 0.07), med([c.y for c in sl]) if sl else 0.0, 0.80 * H))
    side_v = [c for c in V if c.x * sx > 0 and 0.3 * H < c.z < 0.85 * H]
    tip = max(side_v, key=lambda c: c.x * sx)
    if abs(tip.x) > 0.32:   # arms held out (the reference asks for it)
        arm = tip - sh; el = sh + arm * 0.45; wr = sh + arm * 0.84
        near = [c for c in V if (c - el).length < 0.05]
        if near: el = sum(near, Vector()) / len(near)
        near = [c for c in V if (c - wr).length < 0.05]
        if near: wr = sum(near, Vector()) / len(near)
        he = tip
    else:                   # arms hanging: slices at the usual joint heights
        def apt(z):
            s2 = [c for c in slice_(z) if c.x * sx > 0]; e = max(c.x * sx for c in s2)
            a2 = [c for c in s2 if c.x * sx > e - 0.08]
            return Vector((sx * (e - 0.04), med([c.y for c in a2]), z))
        el, wr = apt(0.62 * H), apt(0.49 * H); he = wr + (wr - el).normalized() * 0.09
    hip = Vector((PX + sx * 0.09, pelvis.y, 0.50 * H))
    feet = [c for c in V if c.z < 0.04 and (c.x - PX) * sx > 0.01]
    fy = sorted(feet, key=lambda c: c.y); k = max(5, len(fy) // 10)
    toe = sum(fy[:k], Vector()) / k; heel = sum(fy[-k:], Vector()) / k
    ank = Vector((heel.x * 0.7 + toe.x * 0.3, heel.y - 0.03, 0.06 * H))
    kn = hip.lerp(ank, 0.5); kn.y -= 0.02   # knee on the leg as modelled; the walk sets each leg's direction
    toe_t = Vector((toe.x, toe.y + 0.02, 0.02))
    J[side] = dict(sh=sh, el=el, wr=wr, he=he, hip=hip, kn=kn, ank=ank, toe=toe_t)
    print(side, {k2: tuple(round(x, 2) for x in v) for k2, v in J[side].items()})

arm_data = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("rig", arm_data)
bpy.context.scene.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT"); eb = arm_data.edit_bones
def bone(name, h, t, parent=None, conn=False):
    b = eb.new(name); b.head = h; b.tail = t
    if parent:
        b.parent = eb[parent]; b.use_connect = conn
    return b
bone("spine", pelvis, chest); bone("chest", chest, neck, "spine", True)
bone("neck", neck, headb, "chest", True); bone("head", headb, top, "neck", True)
for s in ("L", "R"):
    j = J[s]
    bone(f"shoulder.{s}", Vector((neck.x, neck.y, j["sh"].z)), j["sh"], "chest")
    bone(f"upper_arm.{s}", j["sh"], j["el"], f"shoulder.{s}", True)
    bone(f"forearm.{s}", j["el"], j["wr"], f"upper_arm.{s}", True)
    bone(f"hand.{s}", j["wr"], j["he"], f"forearm.{s}", True)
    bone(f"thigh.{s}", j["hip"], j["kn"], "spine")
    bone(f"shin.{s}", j["kn"], j["ank"], f"thigh.{s}", True)
    bone(f"foot.{s}", j["ank"], j["toe"], f"shin.{s}", True)
for b in eb: b.roll = 0
bpy.ops.object.mode_set(mode="OBJECT")
rig["wodx_mocap_rig"] = 1

# skin: automatic weights on a voxel proxy (TRELLIS meshes come in loose pieces), copied back to the textured mesh
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.duplicate(); proxy = bpy.context.active_object; proxy.name = "proxy"; proxy.data.materials.clear()
r = proxy.modifiers.new("vox", "REMESH"); r.mode = "VOXEL"; r.voxel_size = 0.012
bpy.ops.object.modifier_apply(modifier="vox")
bpy.ops.object.select_all(action="DESELECT")
proxy.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
dt = body.modifiers.new("wt", "DATA_TRANSFER"); dt.object = proxy
dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
bpy.ops.object.datalayout_transfer(modifier="wt"); bpy.ops.object.modifier_apply(modifier="wt")
bpy.data.objects.remove(proxy)
G = {g.name: g.index for g in body.vertex_groups}
armg = {i for n, i in G.items() if n.split(".")[0] in ("upper_arm", "forearm", "hand")}

# Near the forearm and hand, a vertex is all arm (a hand held out in front sits at hip height, where the automatic
# weights give fingers to the thighs and spine).
n_hand = 0
for v in body.data.vertices:
    j = J["L" if v.co.x > PX else "R"]; hit = False
    for a, b, rr in ((j["el"], j["wr"], 0.08), (j["wr"], j["he"], 0.13)):
        ab = b - a; t = (v.co - a).dot(ab) / max(1e-9, ab.dot(ab))
        if -0.05 <= t <= 1.15 and (v.co - (a + ab * t)).length < rr:
            hit = True; break
    if not hit: continue
    ws = [(g.group, g.weight) for g in v.groups]; tot = sum(w for gi, w in ws if gi in armg)
    if tot <= 0 or tot >= 0.999: continue
    for gi, w in ws:
        if gi in armg: body.vertex_groups[gi].add([v.index], w / tot, "REPLACE")
        else: body.vertex_groups[gi].remove([v.index])
    n_hand += 1
print("hand and forearm verts made all arm:", n_hand)

# Feet and shins: a vertex low on the left belongs to the left leg only (boots modelled close together share weights,
# and a step then drags a shard of the other boot along the ground).
other = {s: {G[n] for n in G if n.endswith("." + ("R" if s == "L" else "L")) and n.split(".")[0] in ("thigh", "shin", "foot")} for s in ("L", "R")}
n_leg = 0
for v in body.data.vertices:
    if v.co.z > 0.35 * H: continue
    s = "L" if v.co.x > PX else "R"
    ws = [(g.group, g.weight) for g in v.groups]
    bad = [gi for gi, w in ws if gi in other[s]]
    if not bad: continue
    keep = sum(w for gi, w in ws if gi not in other[s])
    for gi, w in ws:
        if gi in other[s]: body.vertex_groups[gi].remove([v.index])
        elif keep > 0: body.vertex_groups[gi].add([v.index], w / keep, "REPLACE")
    if keep <= 0: body.vertex_groups[f"shin.{s}"].add([v.index], 1.0, "REPLACE")
    n_leg += 1
print("low leg verts given to one leg:", n_leg)
# A shoe is stiff: below the ankle a vertex follows the foot only, above it the shin only, with a short blend.
for v in body.data.vertices:
    if v.co.z > 0.2 * H: continue
    s = "L" if v.co.x > PX else "R"; az = J[s]["ank"].z
    t = min(1.0, max(0.0, (v.co.z - (az - 0.03)) / 0.06))   # 0 under the ankle, 1 above it
    for g in list(v.groups):
        if g.group not in (G[f"shin.{s}"], G[f"foot.{s}"]): body.vertex_groups[g.group].remove([v.index])
    body.vertex_groups[f"foot.{s}"].add([v.index], 1.0 - t, "REPLACE")
    body.vertex_groups[f"shin.{s}"].add([v.index], t, "REPLACE")

# Skirt: a tunic's hem follows the hips, with up to 55% of each thigh blended across front and back.
hip_z = 0.50 * H
centre_z = [v.co.z for v in body.data.vertices if abs(v.co.x - PX) < 0.015 and 0.15 < v.co.z < hip_z + 0.1]
bands = [0.15 + i * 0.02 for i in range(int((hip_z - 0.17) / 0.02))]
full = [sum(1 for z in centre_z if zb <= z < zb + 0.02) >= 3 for zb in bands]
hem_z = next((bands[i] for i in range(len(bands)) if all(full[i:])), None)
if hem_z is not None and hem_z < hip_z - 0.15:
    n_sk = 0
    for v in body.data.vertices:
        z = v.co.z
        if not (hem_z - 0.01 <= z <= hip_z + 0.05): continue
        if sum(g.weight for g in v.groups if g.group in armg) > 0.2: continue
        t = min(1.0, max(0.0, (hip_z + 0.05 - z) / (hip_z + 0.05 - hem_z))); f = 0.55 * t * t * (3 - 2 * t)
        s = min(1.0, max(0.0, 0.5 + (v.co.x - PX) / 0.18))
        for g in list(v.groups): body.vertex_groups[g.group].remove([v.index])
        body.vertex_groups["spine"].add([v.index], 1.0 - f, "REPLACE")
        body.vertex_groups["thigh.L"].add([v.index], f * s, "REPLACE")
        body.vertex_groups["thigh.R"].add([v.index], f * (1 - s), "REPLACE")
        n_sk += 1
    print("skirt hem", round(hem_z, 3), "verts", n_sk)
else:
    print("no skirt found", hem_z)

# Webbing: TRELLIS can join two feet (or legs) that stand close; once each side is given to its own leg, those faces
# stretch into strips as a foot lifts. Below the hem, faces with corners on both sides of the centre line are removed.
_bm = bmesh.new(); _bm.from_mesh(body.data)
_low = (hem_z if hem_z is not None else 0.35 * 1.75) - 0.02
_web = [f for f in _bm.faces if f.calc_center_median().z < _low and len({v.co.x > PX for v in f.verts}) == 2]   # joins the left leg to the right
bmesh.ops.delete(_bm, geom=_web, context="FACES")
_bm.faces.ensure_lookup_table(); _seen = set(); _crumbs = []
for _f in _bm.faces:   # crumbs left behind by the cut: small loose pieces low on the body
    if _f.index in _seen: continue
    _st = [_f]; _isl = []; _seen.add(_f.index)
    while _st:
        _g = _st.pop(); _isl.append(_g)
        for _e in _g.edges:
            for _h in _e.link_faces:
                if _h.index not in _seen: _seen.add(_h.index); _st.append(_h)
    if len(_isl) < 60 and max(_x.calc_center_median().z for _x in _isl) < _low: _crumbs += _isl
bmesh.ops.delete(_bm, geom=_crumbs, context="FACES")
print("crumb faces removed:", len(_crumbs))
_bm.to_mesh(body.data); _bm.free()
print("webbing faces removed:", len(_web))

am = body.modifiers.new("rig", "ARMATURE"); am.object = rig; body.parent = rig
bpy.ops.wm.save_as_mainfile(filepath=out)
print(f"RIG DONE {time.time()-t0:.1f}s")
