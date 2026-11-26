"""
Build Chirag's player character with MPFB (MakeHuman for Blender) and export a game-ready GLB.

Run headless from the repo root:
    G:\\blender.exe -b --python assets/blender/scripts/build_chirag.py -- public/models/chirag.glb

- Body: male, mid-20s, ~80 kg, healthy and fit, ~1.75 m, game_engine skeleton (UE-style bone names).
- Clothes are real garment meshes made from the body surface (extract → inflate → thicken → smooth),
  skinned to the same skeleton: olive hoodie with hood, blue jeans, white sneakers.
- Hair cap, beard, moustache and eyebrows from the head region; interim eyeballs from MakeHuman's
  eye helpers. When MakeHuman asset packs are installed, they can replace these.
"""
import os
import sys
import json
import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = os.path.join(ROOT, argv[0] if argv else "public/models/chirag.glb")
OUT_BLEND = os.path.join(ROOT, "assets", "blender", "source", "chirag.blend")

from bl_ext.blender_org.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.blender_org.mpfb.services.exportservice import ExportService  # noqa: E402

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

# ---------------------------------------------------------------- body: a normal, fit 80 kg guy
MACROS = {
    "gender": 1.0, "age": 0.5, "muscle": 0.68, "weight": 0.6, "proportions": 0.62, "height": 0.52,
    "cupsize": 0.5, "firmness": 0.5,
    "race": {"asian": 0.5, "caucasian": 0.35, "african": 0.15},
}
body = HumanService.create_human(macro_detail_dict=MACROS, scale=0.1, feet_on_ground=True)
body.name = "ChiragBody"
rig = HumanService.add_builtin_rig(body, "game_engine")
rig.name = "ChiragRig"


def activate(obj):
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


# Bake the macro shape (male / fit / 80 kg) into the mesh itself — the exporter would otherwise
# write MakeHuman's neutral basis shape.
activate(body)
if body.data.shape_keys:
    bpy.ops.object.shape_key_remove(all=True, apply_mix=True)


def material(name, rgb, rough=0.8, metal=0.0, vertex_color=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if vertex_color:
        vc = m.node_tree.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = vertex_color
        m.node_tree.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    m.diffuse_color = (*rgb, 1.0)
    return m


M = {
    "skin": material("M_Skin", (0.42, 0.24, 0.155), 0.5, vertex_color="SkinCol"),
    "hair": material("M_Hair", (0.018, 0.012, 0.009), 0.85),
    "hoodie": material("M_Hoodie", (0.13, 0.165, 0.045), 0.92),
    "hoodie_rib": material("M_HoodieRib", (0.085, 0.11, 0.03), 0.95),
    "jeans": material("M_Jeans", (0.045, 0.1, 0.28), 0.9),
    "sneaker": material("M_Sneaker", (0.86, 0.86, 0.84), 0.45),
    "sole": material("M_Sole", (0.62, 0.62, 0.6), 0.7),
    "eyes": material("M_Eyes", (0.85, 0.85, 0.85), 0.15, vertex_color="Col"),
}

# ---------------------------------------------------------------- helpers
bone_names = {b.name for b in rig.data.bones}


def dominant_bone(obj, poly, names):
    acc = {}
    for vi in poly.vertices:
        for g in obj.data.vertices[vi].groups:
            n = names.get(g.group)
            if n in bone_names:
                acc[n] = acc.get(n, 0.0) + g.weight
    return max(acc, key=acc.get) if acc else None


def duplicate(src, name):
    o = src.copy()
    o.data = src.data.copy()
    o.name = name
    bpy.context.collection.objects.link(o)
    return o


def keep_faces(obj, predicate):
    """Delete every face for which predicate(poly) is False, plus loose verts."""
    names = {g.index: g.name for g in obj.vertex_groups}
    keep = {p.index for p in obj.data.polygons if predicate(p, dominant_bone(obj, p, names))}
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()


def garment(obj, inflate, thickness, subdiv=1):
    """Push the surface out along normals, give it thickness, smooth it; keep skinning (armature last)."""
    activate(obj)
    for m in list(obj.modifiers):
        if m.type != "ARMATURE":
            obj.modifiers.remove(m)
    disp = obj.modifiers.new("Inflate", "DISPLACE")
    disp.strength = inflate
    disp.mid_level = 0.0
    disp.direction = "NORMAL"
    sol = obj.modifiers.new("Thickness", "SOLIDIFY")
    sol.thickness = thickness
    sol.offset = -1
    if subdiv:
        sub = obj.modifiers.new("Smooth", "SUBSURF")
        sub.levels = sub.render_levels = subdiv
    arm = next((m for m in obj.modifiers if m.type == "ARMATURE"), None)
    if arm:  # deformation must come after the shape-building modifiers
        while obj.modifiers.find(arm.name) != len(obj.modifiers) - 1:
            bpy.ops.object.modifier_move_down(modifier=arm.name)
    for m in [m for m in obj.modifiers if m.type != "ARMATURE"]:
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_smooth()


# ---------------------------------------------------------------- interim eyeballs (before helpers are removed)
def build_eyes():
    eyes = duplicate(body, "ChiragEyes")
    activate(eyes)
    for m in list(eyes.modifiers):
        if m.type != "ARMATURE":
            eyes.modifiers.remove(m)
    keep = {eyes.vertex_groups[n].index for n in ("helper-l-eye", "helper-r-eye") if n in eyes.vertex_groups}
    bm = bmesh.new()
    bm.from_mesh(eyes.data)
    deform = bm.verts.layers.deform.active
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (deform and any(g in keep and w > 0.5 for g, w in v[deform].items()))], context="VERTS")
    bm.to_mesh(eyes.data)
    bm.free()
    me = eyes.data
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    sides = {s: [v.co for v in me.vertices if (v.co.x > 0) == s] for s in (True, False)}
    centres = {s: sum(c, Vector()) / max(1, len(c)) for s, c in sides.items()}
    for v in me.vertices:
        front = -(v.co - centres[v.co.x > 0]).normalized().y  # Blender front is -Y
        attr.data[v.index].color = (0.02, 0.015, 0.012, 1) if front > 0.965 else (0.16, 0.085, 0.04, 1) if front > 0.88 else (0.9, 0.88, 0.85, 1)
    me.materials.clear()
    me.materials.append(M["eyes"])
    return eyes


eyes = build_eyes()

# remove helper geometry (eyes/teeth/tights proxies) from the body
ExportService.bake_modifiers_remove_helpers(body, bake_masks=True, bake_subdiv=False, remove_helpers=True)
bpy.context.view_layer.update()

# ---------------------------------------------------------------- head landmarks (for hair / beard)
names = {g.index: g.name for g in body.vertex_groups}
head_v = [body.data.vertices[i].co for p in body.data.polygons if dominant_bone(body, p, names) == "head" for i in p.vertices]
top = max(v.z for v in head_v)
chin = min(v.z for v in head_v)
H = top - chin
head_cy = sum(v.y for v in head_v) / len(head_v)
front_y = min(v.y for v in head_v)  # nose tip (front is -Y)


def is_head(b):
    return b == "head"


# ---------------------------------------------------------------- garments
SLEEVE = ("upperarm_", "lowerarm_", "clavicle_")
hoodie = duplicate(body, "ChiragHoodie")
keep_faces(hoodie, lambda p, b: b is not None and (b.startswith(("spine_",) + SLEEVE) or (b == "pelvis" and p.center.z > 0.86)))
garment(hoodie, inflate=0.024, thickness=0.006)
hoodie.data.materials.clear()
hoodie.data.materials.append(M["hoodie"])

jeans = duplicate(body, "ChiragJeans")
keep_faces(jeans, lambda p, b: b is not None and (b.startswith(("thigh_", "calf_")) or (b == "pelvis" and p.center.z <= 0.95)) and p.center.z > 0.085)
garment(jeans, inflate=0.02, thickness=0.006)
jeans.data.materials.clear()
jeans.data.materials.append(M["jeans"])

def sneaker(side):
    """Rounded sneaker sized to the foot, bound to the foot bone: upper + sole + laces."""
    sx = 1 if side == "l" else -1
    fv = [body.data.vertices[i].co for p in body.data.polygons
          if (dominant_bone(body, p, names) or "").endswith("_" + side) and (dominant_bone(body, p, names) or "").startswith(("foot_", "ball_")) for i in p.vertices]
    xs, ys = [v.x for v in fv], [v.y for v in fv]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    w, length = (max(xs) - min(xs)) + 0.026, (max(ys) - min(ys)) + 0.035
    objs = []
    # upper
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, 0.07))
    up = bpy.context.object
    up.scale = (w, length, 0.11)
    bpy.ops.object.transform_apply(scale=True)
    for v in up.data.vertices:  # toe box slopes down toward the front (-Y)
        if v.co.y < cy - length * 0.1 and v.co.z > 0.07:
            v.co.z -= 0.045 * min(1.0, (cy - v.co.y) / (length * 0.5))
    bev = up.modifiers.new("Round", "BEVEL"); bev.width = 0.03; bev.segments = 5
    sub = up.modifiers.new("Smooth", "SUBSURF"); sub.levels = 1
    for m in list(up.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_smooth()
    up.data.materials.append(M["sneaker"])
    objs.append(up)
    # sole
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, 0.012))
    sole = bpy.context.object
    sole.scale = (w + 0.008, length + 0.01, 0.024)
    bpy.ops.object.transform_apply(scale=True)
    b2 = sole.modifiers.new("Round", "BEVEL"); b2.width = 0.01; b2.segments = 3
    bpy.ops.object.modifier_apply(modifier=b2.name)
    sole.data.materials.append(M["sole"])
    objs.append(sole)
    # laces
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy - length * 0.08, 0.112))
    lace = bpy.context.object
    lace.scale = (w * 0.42, length * 0.34, 0.01)
    lace.rotation_euler = (-0.22, 0, 0)
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    lace.data.materials.append(M["sole"])
    objs.append(lace)
    for o in objs:
        activate(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = up
    bpy.ops.object.join()
    shoe = bpy.context.object
    shoe.name = f"ChiragShoe_{side}"
    g = shoe.vertex_groups.new(name=f"foot_{side}")
    g.add(range(len(shoe.data.vertices)), 1.0, "REPLACE")
    arm = shoe.modifiers.new("Armature", "ARMATURE")
    arm.object = rig
    _ = sx
    return shoe


shoe_l, shoe_r = sneaker("l"), sneaker("r")

# short hair cap (top + back of the head, clear of the face)
hair = duplicate(body, "ChiragHair")
keep_faces(hair, lambda p, b: is_head(b) and (p.center.z > top - 0.33 * H or (p.center.z > top - 0.62 * H and p.center.y > head_cy + 0.015)) and not (p.center.y < front_y + 0.05 and p.center.z < top - 0.27 * H))
garment(hair, inflate=0.006, thickness=0.004)
hair.data.materials.clear()
hair.data.materials.append(M["hair"])

# hood: a soft roll of fabric sitting behind the neck, bound to spine_03
bpy.ops.mesh.primitive_torus_add(major_radius=0.075, minor_radius=0.03, location=(0, head_cy + 0.075, top - 1.12 * H))
hood = bpy.context.object
hood.name = "ChiragHood"
hood.scale = (1.2, 0.75, 0.55)
hood.rotation_euler = (1.45, 0, 0)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.shade_smooth()
hood.data.materials.append(M["hoodie_rib"])
vg = hood.vertex_groups.new(name="spine_03")
vg.add(range(len(hood.data.vertices)), 1.0, "REPLACE")
mod = hood.modifiers.new("Armature", "ARMATURE")
mod.object = rig

# ---------------------------------------------------------------- smooth body + soft-painted beard, moustache, brows
activate(body)
for m in list(body.modifiers):
    if m.type != "ARMATURE":
        body.modifiers.remove(m)
sub = body.modifiers.new("Smooth", "SUBSURF")
sub.levels = 1
arm_mod = next((m for m in body.modifiers if m.type == "ARMATURE"), None)
if arm_mod:
    while body.modifiers.find(arm_mod.name) != len(body.modifiers) - 1:
        bpy.ops.object.modifier_move_down(modifier=arm_mod.name)
bpy.ops.object.modifier_apply(modifier=sub.name)
bpy.ops.object.shade_smooth()
body.data.materials.clear()
body.data.materials.append(M["skin"])


def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


SKIN, HAIR = (0.42, 0.24, 0.155), (0.03, 0.02, 0.015)
mouth_z, brow_z = top - 0.69 * H, top - 0.385 * H
col = body.data.color_attributes.new("SkinCol", "FLOAT_COLOR", "POINT")
for v in body.data.vertices:
    c = v.co
    k = 0.0
    if c.z > chin - 0.04 and c.z < top and c.y < head_cy + 0.03 and abs(c.x) < 0.095:
        ax = abs(c.x)
        # beard: chin + jaw line, fading out over the cheeks
        beard = smooth(mouth_z + 0.025 - ax * 0.25, mouth_z - 0.005 - ax * 0.25, c.z) * smooth(chin - 0.035, chin - 0.005, c.z)
        beard *= smooth(0.098, 0.07, ax)
        # keep the lips clear
        lips = smooth(0.032, 0.022, ax) * smooth(0.013, 0.004, abs(c.z - (mouth_z - 0.002))) * smooth(front_y + 0.03, front_y + 0.012, c.y)
        # moustache: band above the lip, ends drooping down
        stache = smooth(0.038, 0.03, ax) * smooth(0.012, 0.004, abs(c.z - (mouth_z + 0.013 - ax * 0.35))) * smooth(front_y + 0.045, front_y + 0.03, c.y)
        # brows: two soft ellipses
        bx = (ax - 0.032) / 0.022
        bz = (c.z - (brow_z + 0.004 - (ax - 0.02) * 0.08)) / 0.0065
        brows = smooth(1.0, 0.6, (bx * bx + bz * bz) ** 0.5) * smooth(front_y + 0.06, front_y + 0.04, c.y)
        k = max(beard * (1 - lips) * 0.95, stache * 0.95, brows * 0.95)
    col.data[v.index].color = tuple(SKIN[i] * (1 - k) + HAIR[i] * k for i in range(3)) + (1.0,)

# ---------------------------------------------------------------- export
parts = [body, eyes, hoodie, hood, jeans, shoe_l, shoe_r, hair]
bpy.ops.object.select_all(action="DESELECT")
for o in parts + [rig]:
    o.select_set(True)
bpy.context.view_layer.objects.active = rig
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB, export_format="GLB", use_selection=True, export_yup=True,
    export_skins=True, export_animations=False, export_morph=False, export_apply=False,
    export_vertex_color="MATERIAL",
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
)
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

print("CHIRAG_BUILD_REPORT " + json.dumps({
    "glb_kb": round(os.path.getsize(OUT_GLB) / 1024),
    "height_m": round(body.dimensions.z, 3),
    "verts": {o.name: len(o.data.vertices) for o in parts},
}))
