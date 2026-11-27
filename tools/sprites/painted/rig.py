# Blender: import the TRELLIS GLB, clean it, fit a Rigify human, generate the rig, skin the mesh.
# blender -b -P rig.py -- <in.glb> <out.blend>
import bpy, bmesh, sys, time, addon_utils
from mathutils import Vector
t0 = time.time()
glb, out = sys.argv[sys.argv.index("--") + 1:][:2]
addon_utils.enable("rigify", default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable("rigify", default_set=True)
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

# Rigify human metarig, scaled to the body (metarig is ~1.85 m tall), then fitted to the mesh's arms and legs.
# The stock metarig holds its arms out at 45 degrees; TRELLIS figures stand with arms down, so without the fit the
# arm weights land on the torso and the arms barely swing (pass 1 fault).
bpy.ops.object.armature_human_metarig_add()
meta = bpy.context.active_object
mz = max((meta.matrix_world @ b.tail_local).z for b in meta.data.bones)
k = 1.75 / mz
meta.scale = (k, k, k)
bpy.ops.object.transform_apply(scale=True)
H = 1.75
V = [v.co.copy() for v in body.data.vertices]
def slice_(z, w=0.012): return [c for c in V if abs(c.z - z) < w]
def arm_pt(z, side):
    sl = slice_(z)
    if side > 0: edge = max(c.x for c in sl); arm = [c for c in sl if c.x > edge - 0.08]; x = edge - 0.04
    else: edge = min(c.x for c in sl); arm = [c for c in sl if c.x < edge + 0.08]; x = edge + 0.04
    ys = sorted(c.y for c in arm); return Vector((x, ys[len(ys) // 2], z))
def leg_pt(z, side):
    sl = [c for c in slice_(z) if c.x * side > 0.01]
    xs = sorted(c.x for c in sl); ys = sorted(c.y for c in sl)
    return Vector((xs[len(xs) // 2], ys[len(ys) // 2], z))
ARMX = {}; ARMPTS = {}; HELD = {}
_pz = 0.53 * H
_pv = sorted(c.x for c in V if abs(c.z - _pz) < 0.015 and abs(c.x) < 0.3)
PELVIS_X = (_pv[0] + _pv[-1]) / 2 if _pv else 0.0
print("pelvis centre x", round(PELVIS_X, 3))
bpy.ops.object.mode_set(mode="EDIT")
eb = meta.data.edit_bones
def drop_children(name):
    for c in list(eb[name].children):
        drop_children(c.name); eb.remove(c)
for side, sx in (("L", 1), ("R", -1)):
    drop_children(f"hand.{side}")
    sh = arm_pt(0.80 * H, sx); sh.x -= sx * 0.03
    # arms held out (A-pose, the preferred reference: arms clear of the body skin cleanly) are found by the
    # fingertip farthest from the body; arms hanging down by slices at the usual joint heights
    side_v = [c for c in V if c.x * sx > 0 and 0.3 * H < c.z < 0.85 * H]
    tip = max(side_v, key=lambda c: c.x * sx)
    if abs(tip.x) > 0.32:
        arm = tip - sh
        el = sh + arm * 0.45; el.y += 0.02
        wr = sh + arm * 0.84
        near = [c for c in V if (c - wr).length < 0.06]
        if near: wr = sum(near, Vector()) / len(near)
        el_near = [c for c in V if (c - el).length < 0.05]
        if el_near: e2 = sum(el_near, Vector()) / len(el_near); el = Vector((e2.x, e2.y + 0.02, e2.z))
        he = wr + (wr - el).normalized() * 0.09
        HELD[side] = True
        print(side, "arm held out, tip", tuple(round(v, 2) for v in tip))
    else:
        el = arm_pt(0.62 * H, sx); el.y += 0.02          # elbow a touch behind, so it bends forward
        wr = arm_pt(0.49 * H, sx); he = wr + (wr - el).normalized() * 0.09   # hand carries on the forearm line
    eb[f"shoulder.{side}"].head = Vector((sx * 0.02, sh.y - 0.03, sh.z + 0.02)); eb[f"shoulder.{side}"].tail = Vector((sh.x - sx * 0.02, sh.y, sh.z + 0.02))
    eb[f"upper_arm.{side}"].head = sh; eb[f"upper_arm.{side}"].tail = el
    eb[f"forearm.{side}"].head = el; eb[f"forearm.{side}"].tail = wr
    eb[f"hand.{side}"].head = wr; eb[f"hand.{side}"].tail = he
    ARMX[side] = (abs(wr.x), he.z); ARMPTS[side] = [sh.copy(), el.copy(), wr.copy(), he.copy(), he + (he - wr).normalized() * 0.1]   # the last stretch reaches the fingertips
    # legs are read below any skirt: find the highest slice that still shows two separate legs
    lz = 0.06 * H
    for zz in [0.27 * H - i * 0.02 for i in range(20)]:
        if zz < 0.08 * H: break
        sl = slice_(zz)
        if sl and not any(abs(c.x) < 0.02 for c in sl): lz = zz; break
    lp = leg_pt(lz, sx); an = leg_pt(0.06 * H, sx)
    kn = Vector((lp.x, lp.y - 0.015, 0.27 * H))      # knee a touch forward
    feet = [c for c in V if c.z < 0.04 and c.x * sx > 0.01]
    toe = Vector((an.x, min(c.y for c in feet) + 0.02, 0.01))
    # the hip joint sits under the pelvis, 9 cm out from its centre, whatever stance the legs were modelled in
    # (a leg modelled splayed out kept its hip above the foot in pass 2, and the figure limped)
    hip = Vector((PELVIS_X + sx * 0.09, kn.y + 0.015, eb[f"thigh.{side}"].head.z))
    eb[f"thigh.{side}"].head = hip; eb[f"thigh.{side}"].tail = kn
    eb[f"shin.{side}"].head = kn; eb[f"shin.{side}"].tail = an
    eb[f"foot.{side}"].head = an; eb[f"foot.{side}"].tail = toe
    zax = eb[f"thigh.{side}"].z_axis.copy()
    for n in ("upper_arm", "forearm", "hand"): eb[f"{n}.{side}"].align_roll(zax)
    if f"heel.02.{side}" in eb:
        h2 = eb[f"heel.02.{side}"]; h2.head = Vector((an.x - sx * 0.04, an.y + 0.05, 0.0)); h2.tail = Vector((an.x + sx * 0.04, an.y + 0.05, 0.0))
    print(side, "shoulder", tuple(round(v, 3) for v in sh), "elbow", tuple(round(v, 3) for v in el), "wrist", tuple(round(v, 3) for v in wr), "knee", tuple(round(v, 3) for v in kn))
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.pose.rigify_generate()
rig = bpy.data.objects.get("rig") or [o for o in bpy.context.scene.objects if o.type == "ARMATURE" and o != meta][0]
print("rig", rig.name, len(rig.data.bones), "bones")

# skin: automatic weights on a voxel proxy, then copy the weights to the textured mesh
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.duplicate()
proxy = bpy.context.active_object; proxy.name = "proxy"
proxy.data.materials.clear()
r = proxy.modifiers.new("vox", "REMESH"); r.mode = "VOXEL"; r.voxel_size = 0.012
bpy.ops.object.modifier_apply(modifier="vox")
bpy.ops.object.select_all(action="DESELECT")
proxy.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
print("proxy groups", len(proxy.vertex_groups))
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); bpy.context.view_layer.objects.active = body
dt = body.modifiers.new("wt", "DATA_TRANSFER"); dt.object = proxy
dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"
bpy.ops.object.datalayout_transfer(modifier="wt")
bpy.ops.object.modifier_apply(modifier="wt")

# Arms that touch the body in the mesh share weights with it, so a swinging arm drags a sheet of cloth with it.
# A vertex counts as arm only within 6 cm of the fitted arm line; every other vertex loses its arm weights.
ARM_R = [0.06, 0.06, 0.13, 0.13]   # upper arm, forearm, hand, fingers: an open hand is wider than the sleeve
ARM_R_HELD = [0.10, 0.10, 0.13, 0.13]   # an arm held clear of the body can take its whole loose sleeve
def is_arm(co, r=None):
    """within reach of the arm's bone chain (shoulder, elbow, wrist, hand, fingertips)"""
    side = "L" if co.x > 0 else "R"; p = ARMPTS[side]
    for i, (a, b) in enumerate(zip(p, p[1:])):
        ab = b - a; t = (co - a).dot(ab) / max(1e-9, ab.dot(ab))
        rr = (ARM_R_HELD if HELD.get(side) else ARM_R)[i]
        if 0.0 <= t <= 1.0 and (co - (a + ab * t)).length < (r if r and i < 2 else rr): return True
    return False
G = {g.name: g.index for g in body.vertex_groups}
armg = {i for n, i in G.items() if any(k in n for k in ("upper_arm", "forearm", "hand"))}
spines = [n for n in ("DEF-spine", "DEF-spine.001", "DEF-spine.002", "DEF-spine.003") if n in G]
spz = {n: (rig.matrix_world @ rig.data.bones[n].head_local).z for n in spines}
n_fix = 0
for v in body.data.vertices:
    if HELD.get("L" if v.co.x > 0 else "R"): continue   # arms held clear of the body: the automatic weights are already clean
    if is_arm(v.co): continue
    ws = [(g.group, g.weight) for g in v.groups]
    if not any(gi in armg and w > 0.001 for gi, w in ws): continue
    for gi, w in ws:
        if gi in armg: body.vertex_groups[gi].remove([v.index])
    if sum(w for gi, w in ws if gi not in armg) < 0.05:
        n = min(spines, key=lambda n: abs(spz[n] - v.co.z)); body.vertex_groups[n].add([v.index], 1.0, "REPLACE")
    n_fix += 1
print("arm weights removed from", n_fix, "body verts")
# The reverse for arms held clear: a hand held out in front sits at hip height, where the automatic weights hand
# some of its fingers to the thighs and spine. Near the forearm and hand, a vertex is all arm.
n_hand = 0
for v in body.data.vertices:
    side = "L" if v.co.x > 0 else "R"
    if not HELD.get(side): continue
    p = ARMPTS[side]; hit = False
    for a, b, r in ((p[1], p[2], 0.08), (p[2], p[3], 0.13), (p[3], p[4], 0.13)):
        ab = b - a; t = (v.co - a).dot(ab) / max(1e-9, ab.dot(ab))
        if -0.05 <= t <= 1.05 and (v.co - (a + ab * t)).length < r: hit = True; break
    if not hit: continue
    ws = [(g.group, g.weight) for g in v.groups]
    tot = sum(w for gi, w in ws if gi in armg)
    if tot <= 0 or tot >= 0.999: continue
    for gi, w in ws:
        if gi in armg: body.vertex_groups[gi].add([v.index], w / tot, "REPLACE")
        else: body.vertex_groups[gi].remove([v.index])
    n_hand += 1
print("hand and forearm verts made all arm:", n_hand)

# Free arms (Ben, 27 Nov: the arms stretched the torso). TRELLIS fuses a hanging arm to the side of the body, so
# any weighting leaves faces that join a moving arm to a still torso. Cut the mesh there: a face belongs to the arm
# when most of its corners are on the arm line, the edges between arm faces and body faces are split, the arm side
# keeps only arm weights and the body side keeps none. The opening this leaves on the torso is shaded as the
# inside of the cloth (dark), and the arm hides most of it.
if os.environ.get("FREE_ARMS", "0") == "1":   # off by default: on a fused arm it leaves holes; use an A-pose reference instead
    bm = bmesh.new(); bm.from_mesh(body.data)
    dl = bm.verts.layers.deform.verify()
    in_arm = is_arm
    R_ARM = float(os.environ.get("ARM_R", "0.045"))   # about a sleeved arm's radius; the 6 cm weight test took in the torso's side
    armface = {f.index: in_arm(f.calc_center_median(), R_ARM) for f in bm.faces}
    cut = [e for e in bm.edges if len(e.link_faces) == 2 and armface[e.link_faces[0].index] != armface[e.link_faces[1].index]]
    bmesh.ops.split_edges(bm, edges=cut)
    bm.faces.ensure_lookup_table()
    na = nb = 0
    for v in bm.verts:
        fs = v.link_faces
        if not fs: continue
        a = sum(1 for f in fs if armface.get(f.index, False))
        d = v[dl]
        if a * 2 >= len(fs):   # a corner shared by both sides goes with the side that has most of its faces
            tot = sum(w for g, w in d.items() if g in armg)
            if tot > 0:
                for g in [g for g in d.keys() if g not in armg]: del d[g]
                for g in list(d.keys()): d[g] = d[g] / tot
                na += 1
        else:
            for g in [g for g in d.keys() if g in armg]: del d[g]
            if not d.keys():
                n = min(spines, key=lambda n: abs(spz[n] - v.co.z)); d[G[n]] = 1.0
            nb += 1
    bm.to_mesh(body.data); bm.free(); body.data.update()
    print("free arms: cut edges", len(cut), "arm verts", na, "body verts", nb)

# Skirt: the hem of a tunic, gown or coat follows the hips, with a share of each thigh that grows toward the hem
# and is blended across the front and back, so the cloth swings with the legs instead of stretching (pass 1 fault).
# Figures without a skirt (hose, trousers) have no gap between the legs at the crotch, so this finds no hem and skips.
G = {g.name: g.index for g in body.vertex_groups}
need = ["DEF-spine", "DEF-thigh.L", "DEF-thigh.R"]
hip_z = max((rig.matrix_world @ rig.data.bones["DEF-thigh.L"].head_local).z, 0.5)
# hem = the lowest 1 cm band that has cloth across the centre line (legs stop short of it)
centre = [v.co.z for v in body.data.vertices if abs(v.co.x) < 0.015 and 0.15 < v.co.z < hip_z]
# (cloth must run unbroken from there up to the hips; legs or boots touching low down do not count)
bands = [0.15 + i * 0.02 for i in range(int((hip_z - 0.17) / 0.02))]
full = [sum(1 for z in centre if zb <= z < zb + 0.02) >= 3 for zb in bands]
hem_z = None
for i in range(len(bands)):
    if all(full[i:]): hem_z = bands[i]; break
armg = {i for n, i in G.items() if any(k in n for k in ("arm", "hand", "shoulder"))}
if hem_z is not None and hem_z < hip_z - 0.15 and all(n in G for n in need):
    n_sk = 0
    for v in body.data.vertices:
        z = v.co.z
        if not (hem_z - 0.01 <= z <= hip_z): continue
        if is_arm(v.co): continue
        if HELD.get("L" if v.co.x > 0 else "R") and sum(g.weight for g in v.groups if g.group in armg) > 0.2: continue   # a held-out hand at hip height
        t = min(1.0, max(0.0, (hip_z - z) / (hip_z - hem_z))); f = 0.55 * t * t * (3 - 2 * t)
        s = min(1.0, max(0.0, 0.5 + v.co.x / 0.18))
        for g in list(v.groups): body.vertex_groups[g.group].remove([v.index])
        body.vertex_groups["DEF-spine"].add([v.index], 1.0 - f, "REPLACE")
        body.vertex_groups["DEF-thigh.L"].add([v.index], f * s, "REPLACE")
        body.vertex_groups["DEF-thigh.R"].add([v.index], f * (1 - s), "REPLACE")
        n_sk += 1
    print("skirt hem", round(hem_z, 3), "hip", round(hip_z, 3), "verts", n_sk)
else:
    print("no skirt found", hem_z, hip_z)
am = body.modifiers.new("rig", "ARMATURE"); am.object = rig
body.parent = rig
bpy.data.objects.remove(proxy)
meta.hide_set(True); meta.hide_render = True
print("body groups", len(body.vertex_groups))
bpy.ops.wm.save_as_mainfile(filepath=out)
print(f"RIG DONE {time.time()-t0:.1f}s")
