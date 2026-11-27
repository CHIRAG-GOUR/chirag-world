"""
Build Chirag's player character with MPFB (MakeHuman for Blender) and export a game-ready GLB.

Prerequisite (once):  python assets/blender/scripts/install_mh_assets.py
Run headless from the repo root:
    G:\\blender.exe -b --python assets/blender/scripts/build_chirag.py -- public/models/chirag.glb

- Body: male, mid-20s, ~80 kg, fit, ~1.75 m, game_engine skeleton (UE-style bone names).
- Real MakeHuman assets fitted + skinned by MPFB: textured skin, brown eyes, brows, lashes, teeth,
  short textured hair (darkened, sides tapered into a fade), denim jeans, sneakers (re-textured plain white),
  hooded sweat jacket (re-coloured olive, "CHIRAG" across the back).
- Moustache, beard, stubble and the fade are painted strand-by-strand into the skin texture in UV space
  (growth directions projected per triangle), plus alpha-strand shells over the moustache and beard for volume.
"""
import glob
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = os.path.join(ROOT, argv[0] if argv else "public/models/chirag.glb")
OUT_BLEND = os.path.join(ROOT, "assets", "blender", "source", "chirag.blend")

from bl_ext.blender_org.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.blender_org.mpfb.services.exportservice import ExportService  # noqa: E402
from bl_ext.blender_org.mpfb.services.locationservice import LocationService  # noqa: E402

DATA = LocationService.get_user_data()


def asset(rel):
    hits = glob.glob(os.path.join(DATA, rel))
    if not hits:
        sys.exit(f"Missing MakeHuman asset '{rel}' - run: python assets/blender/scripts/install_mh_assets.py")
    return hits[0]


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


def activate(obj):
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


# Face shaped after Chirag's photo: longer oval face, long full nose with a rounded tip, low heavy brows,
# full lower lip, fuller cheeks, prominent ears. (MakeHuman targets, weights 0..1.)
from bl_ext.blender_org.mpfb.services.targetservice import TargetService  # noqa: E402
FACE = {
    "head/head-oval": 0.4, "head/head-fat-incr": 0.22, "head/head-round": 0.12, "head/head-scale-vert-incr": 0.12, "forehead/forehead-scale-vert-incr": 0.15,
    "nose/nose-scale-vert-incr": 0.4, "nose/nose-volume-incr": 0.35, "nose/nose-point-width-incr": 0.45,
    "nose/nose-flaring-incr": 0.3, "nose/nose-width2-incr": 0.25, "nose/nose-scale-depth-incr": 0.25,
    "nose/nose-point-down": 0.15,
    "eyebrows/eyebrows-trans-down": 0.35, "eyebrows/eyebrows-trans-forward": 0.25,
    "chin/chin-height-incr": 0.12, "chin/chin-width-incr": 0.2,
    "mouth/mouth-lowerlip-volume-incr": 0.35, "mouth/mouth-scale-horiz-incr": 0.1,
    "cheek/l-cheek-volume-incr": 0.45, "cheek/r-cheek-volume-incr": 0.45,
    "ears/l-ear-scale-incr": 0.2, "ears/r-ear-scale-incr": 0.2, "ears/l-ear-wing-incr": 0.3, "ears/r-ear-wing-incr": 0.3,
    "eyes/l-eye-eyefold-down": 0.25, "eyes/r-eye-eyefold-down": 0.25,
}
TARGETS = os.path.join(os.path.dirname(os.path.dirname(sys.modules[HumanService.__module__].__file__)), "data", "targets")
for rel, wgt in FACE.items():
    path = os.path.join(TARGETS, rel + ".target.gz")
    if os.path.exists(path):
        TargetService.load_target(body, path, weight=wgt)
    else:
        print("WARNING: missing target", rel)

# Bake the macro + face shape into the mesh (the exporter would otherwise write MakeHuman's neutral basis).
activate(body)
if body.data.shape_keys:
    bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
rig = HumanService.add_builtin_rig(body, "game_engine")
rig.name = "ChiragRig"

# ---------------------------------------------------------------- MakeHuman assets (fitted + rigged by MPFB)
PARTS = [
    ("ChiragEyes", "Eyes", "eyes/high-poly/high-poly.mhclo"),
    ("ChiragBrows", "Eyebrows", "eyebrows/eyebrow001/eyebrow001.mhclo"),
    ("ChiragLashes", "Eyelashes", "eyelashes/eyelashes01/eyelashes01.mhclo"),
    ("ChiragTeeth", "Teeth", "teeth/teeth_base/teeth_base.mhclo"),
    ("ChiragTongue", "Tongue", "tongue/tongue01/tongue01.mhclo"),
    ("ChiragHair", "Hair", "hair/short02/short02.mhclo"),
    ("ChiragOutfit", "Clothes", "clothes/male_casualsuit02/male_casualsuit02.mhclo"),
    ("ChiragShoes", "Clothes", "clothes/shoes05/shoes05.mhclo"),
]

obj_of = {}
for name, typ, rel in PARTS:
    o = HumanService.add_mhclo_asset(asset(rel), body, asset_type=typ, subdiv_levels=0, material_type="GAMEENGINE")
    o.name = name
    obj_of[name] = o
HumanService.set_character_skin(asset("skins/young_asian_male/young_asian_male.mhmat"), body, skin_type="GAMEENGINE")



def group_points(obj, gname, min_w=0.5):
    g = obj.vertex_groups.get(gname)
    if g is None:
        return np.zeros((0, 3))
    return np.array([v.co[:] for v in obj.data.vertices if any(x.group == g.index and x.weight >= min_w for x in v.groups)])


EYE = group_points(body, "helper-l-eye")            # read before the helpers are removed
EYE_Z = float(EYE[:, 2].mean()) if len(EYE) else None

# remove helper geometry and bake the "hide body under clothes" masks
ExportService.bake_modifiers_remove_helpers(body, bake_masks=True, bake_subdiv=False, remove_helpers=True)
bpy.context.view_layer.update()


# ---------------------------------------------------------------- small utilities
def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def tex_node(obj, prefer="DiffuseTexture"):
    mat = obj.data.materials[0]
    nodes = [n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    for n in nodes:
        if n.name == prefer:
            return mat, n
    return mat, (nodes[0] if nodes else None)


def pixels(img):
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4).astype(np.float64)


def new_image(name, arr, alpha=True):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=alpha)
    img.pixels.foreach_set(np.ascontiguousarray(arr, dtype=np.float32).ravel())
    img.pack()
    debug = os.environ.get("CHIRAG_DEBUG_DIR")
    if debug:
        os.makedirs(debug, exist_ok=True)
        img.save_render(os.path.join(debug, name + ".png"))
    return img


def source_rgba(obj):
    """RGBA of the material: colour from DiffuseTexture, alpha from AlphaMapTexture (MakeHuman keeps them apart)."""
    mat = obj.data.materials[0]
    nodes = {n.name: n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image}
    rgba = pixels(nodes["DiffuseTexture"].image)
    am = nodes.get("AlphaMapTexture")
    if am and am.image.size[:] == nodes["DiffuseTexture"].image.size[:]:
        rgba[..., 3] = pixels(am.image)[..., 3]
    return rgba


def finish_material(obj, rgba, name, use_alpha):
    """One RGBA texture drives colour (+ alpha); opaque materials drop the alpha link entirely."""
    mat = obj.data.materials[0]
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    diff = nt.nodes["DiffuseTexture"]
    diff.image = new_image(name, rgba, alpha=use_alpha)
    am = nt.nodes.get("AlphaMapTexture")
    if am:
        nt.nodes.remove(am)
    for link in list(bsdf.inputs["Alpha"].links):
        nt.links.remove(link)
    if use_alpha:
        nt.links.new(diff.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.use_backface_culling = False
    else:
        bsdf.inputs["Alpha"].default_value = 1.0
    if name.startswith("T_"):
        mat.name = "M_" + name[2:]


def norm_density(buf, pct=97):
    v = buf[buf > 1e-6]
    return buf / np.percentile(v, pct) if len(v) else buf


def luminance(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def dist_field(points):
    """P (n,3) -> distance to the nearest of `points`."""
    from mathutils.kdtree import KDTree
    kd = KDTree(len(points))
    for i, p in enumerate(points):
        kd.insert(p, i)
    kd.balance()

    def f(P):
        return np.array([kd.find(p)[2] for p in P]) if len(points) else np.full(len(P), 1e9)
    return f


# ---------------------------------------------------------------- face landmarks from MakeHuman's own vertex groups
LIPS, EARS, SCALP = group_points(body, "lips"), group_points(body, "ears"), group_points(body, "scalp")
VCO = np.array([v.co[:] for v in body.data.vertices])
LIP_TOP, LIP_BOT = LIPS[:, 2].max(), LIPS[:, 2].min()
MOUTH_HW, LIP_FRONT = np.abs(LIPS[:, 0]).max(), LIPS[:, 1].min()
SUBNASALE = LIP_TOP + 0.0075
mid = VCO[(np.abs(VCO[:, 0]) < 0.004) & (VCO[:, 1] < LIP_FRONT + 0.06) & (VCO[:, 2] < LIP_BOT) & (VCO[:, 2] > LIP_BOT - 0.12)]
CHIN_Z, CHIN_Y = mid[:, 2].min(), mid[np.argmin(mid[:, 2]), 1]
EAR_FRONT, EAR_LOBE, EAR_TOP = EARS[:, 1].min(), EARS[:, 2].min(), EARS[:, 2].max()
TOP = SCALP[:, 2].max()
EYE_Z = EYE_Z or (EAR_TOP - 0.006)
d_lips, d_ears, d_scalp = dist_field(LIPS), dist_field(EARS), dist_field(SCALP)
print("LANDMARKS", json.dumps({k: round(float(v), 4) for k, v in dict(
    lip_top=LIP_TOP, lip_bot=LIP_BOT, mouth_hw=MOUTH_HW, chin_z=CHIN_Z, chin_y=CHIN_Y, ear_front=EAR_FRONT,
    ear_lobe=EAR_LOBE, ear_top=EAR_TOP, top=TOP, eye_z=EYE_Z).items()}))

# ---------------------------------------------------------------- strand painter (UV space)
me = body.data
me.calc_loop_triangles()
uv_layer = me.uv_layers.active.data
TRI_V = np.array([[me.vertices[i].co[:] for i in t.vertices] for t in me.loop_triangles], dtype=np.float64)
TRI_UV = np.array([[uv_layer[li].uv[:] for li in t.loops] for t in me.loop_triangles], dtype=np.float64)
TRI_N = np.array([t.normal[:] for t in me.loop_triangles], dtype=np.float64)
E = np.stack([TRI_V[:, 1] - TRI_V[:, 0], TRI_V[:, 2] - TRI_V[:, 0]], axis=2)          # (n,3,2)
U = np.stack([TRI_UV[:, 1] - TRI_UV[:, 0], TRI_UV[:, 2] - TRI_UV[:, 0]], axis=2)      # (n,2,2)
TRI_J = U @ np.linalg.pinv(E)                                                          # (n,2,3): d3D -> dUV
TRI_AREA = 0.5 * np.linalg.norm(np.cross(E[:, :, 0], E[:, :, 1]), axis=1)
TRI_C = TRI_V.mean(axis=1)
NEAR_HEAD = TRI_C[:, 2] > CHIN_Z - 0.08
_BODY_GEO = (TRI_V, TRI_UV, E, U, TRI_J, TRI_N, TRI_AREA, TRI_C, NEAR_HEAD)


def tri_data(obj):
    """World-space triangles, UVs and the per-triangle 3D->UV Jacobian of obj (for painting in its texture)."""
    m = obj.data
    m.calc_loop_triangles()
    uvl = m.uv_layers.active.data
    mw = obj.matrix_world
    V = np.array([[(mw @ m.vertices[i].co)[:] for i in t.vertices] for t in m.loop_triangles])
    T = np.array([[uvl[li].uv[:] for li in t.loops] for t in m.loop_triangles])
    Ed = np.stack([V[:, 1] - V[:, 0], V[:, 2] - V[:, 0]], axis=2)
    Ud = np.stack([T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]], axis=2)
    N = np.cross(Ed[:, :, 0], Ed[:, :, 1])
    area = 0.5 * np.linalg.norm(N, axis=1)
    return dict(V=V, UV=T, E=Ed, U=Ud, J=Ud @ np.linalg.pinv(Ed), N=N / (2 * area[:, None] + 1e-12),
                AREA=area, C=V.mean(axis=1), SEL=np.ones(len(V), bool))


def paint_strands(buf, weight_fn, dir_fn, count, length, seed, samples=10, width=1.0, jitter=0.35, curve=0.25, geo=None):
    """Accumulate `count` hair strokes into density buffer `buf` (h,w). weight_fn(P)->[0,1], dir_fn(P)->(n,3)."""
    if geo is not None:
        g = geo
        TRI_V, TRI_UV, E, U, TRI_J, TRI_N, TRI_AREA, TRI_C, NEAR_HEAD = (g[k] for k in ("V", "UV", "E", "U", "J", "N", "AREA", "C", "SEL"))
    else:
        TRI_V, TRI_UV, E, U, TRI_J, TRI_N, TRI_AREA, TRI_C, NEAR_HEAD = _BODY_GEO
    rnd = np.random.default_rng(seed)
    h, w = buf.shape
    idx = np.nonzero(NEAR_HEAD)[0]
    prob = TRI_AREA[idx] * weight_fn(TRI_C[idx])
    if prob.sum() <= 0:
        return
    tri = idx[rnd.choice(len(idx), size=count, p=prob / prob.sum())]
    r1, r2 = rnd.random(count), rnd.random(count)
    flip = r1 + r2 > 1
    r1[flip], r2[flip] = 1 - r1[flip], 1 - r2[flip]
    P = TRI_V[tri, 0] + E[tri, :, 0] * r1[:, None] + E[tri, :, 1] * r2[:, None]
    UV0 = TRI_UV[tri, 0] + U[tri, :, 0] * r1[:, None] + U[tri, :, 1] * r2[:, None]
    wt = weight_fn(P)
    n = TRI_N[tri]
    d = dir_fn(P)
    d = d - n * np.sum(d * n, axis=1, keepdims=True)                      # lie on the skin
    side = np.cross(n, d)
    d = d + side * (rnd.random((count, 1)) - 0.5) * 2 * jitter
    d /= np.linalg.norm(d, axis=1, keepdims=True) + 1e-9
    L = length * (0.6 + 0.8 * rnd.random(count))
    duv = np.einsum("nij,nj->ni", TRI_J[tri], d * L[:, None])
    bend = np.einsum("nij,nj->ni", TRI_J[tri], side * (L * (rnd.random(count) - 0.5) * 2 * curve)[:, None])
    t = np.linspace(0, 1, samples)
    pts = UV0[:, None, :] + duv[:, None, :] * t[None, :, None] + bend[:, None, :] * (t * t)[None, :, None]
    op = (wt[:, None] * (1.0 - 0.65 * t)[None, :] * width).ravel()
    x = (pts[..., 0] * w - 0.5).ravel()
    y = (pts[..., 1] * h - 0.5).ravel()
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    for dx, dy, k in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xi, yi = np.clip(x0 + dx, 0, w - 1), np.clip(y0 + dy, 0, h - 1)
        np.add.at(buf, (yi, xi), op * k)


# ---------------------------------------------------------------- facial hair regions (vectorised over P: (n,3))
def not_lips(P):
    return smooth(0.0005, 0.003, d_lips(P))


def not_ears(P):
    return smooth(0.002, 0.007, d_ears(P))


def moustache_w(P):
    ax, z, y = np.abs(P[:, 0]), P[:, 2], P[:, 1]
    # Chirag's moustache is full and twirled: combed outward, ends running past the mouth corners and turning
    # up (the curled tips themselves are 3D locks, see twirl_tip()).
    dip = np.maximum(0.0, ax - 0.012) * 0.22
    lo = LIP_TOP - 0.0015 - dip + np.maximum(0.0, ax - MOUTH_HW) * 0.35
    hi = SUBNASALE - 0.0012 - np.maximum(0.0, ax - 0.016) * 0.12
    return (smooth(lo - 0.002, lo + 0.0015, z) * smooth(hi + 0.0015, hi - 0.0015, z)
            * smooth(MOUTH_HW + 0.012, MOUTH_HW + 0.006, ax) * (y < LIP_FRONT + 0.04) * not_lips(P))


def jaw_floor(P):
    slope = ((EAR_LOBE - 0.006) - (CHIN_Z - 0.012)) / max(1e-3, EAR_FRONT - CHIN_Y)
    return CHIN_Z - 0.012 + np.maximum(0.0, P[:, 1] - CHIN_Y) * slope


def beard_w(P):
    ax, z, y = np.abs(P[:, 0]), P[:, 2], P[:, 1]
    cheek_top = LIP_TOP + np.maximum(0.0, ax - MOUTH_HW) * 0.72
    upper = smooth(cheek_top + 0.004, cheek_top - 0.004, z)
    upper = np.where(ax < MOUTH_HW + 0.002, smooth(LIP_BOT + 0.001, LIP_BOT - 0.003, z), upper)   # below the lower lip
    floor = jaw_floor(P)
    lower = smooth(floor - 0.004, floor + 0.002, z)
    back = smooth(EAR_FRONT + 0.004, EAR_FRONT - 0.004, y)
    dense = 0.5 + 0.5 * smooth(LIP_BOT, LIP_BOT - 0.02, z)                 # chin + jaw fuller than the cheeks
    w = upper * lower * back * dense
    sideburn = (smooth(EAR_FRONT - 0.018, EAR_FRONT - 0.012, y) * smooth(EAR_FRONT + 0.004, EAR_FRONT - 0.001, y)
                * smooth(EAR_LOBE - 0.004, EAR_LOBE + 0.006, z) * smooth(EAR_TOP + 0.01, EAR_TOP - 0.004, z) * 0.8)
    return np.maximum(w, sideburn) * not_lips(P) * not_ears(P) * (1 - moustache_w(P))


def neck_w(P):
    floor = jaw_floor(P)
    z = P[:, 2]
    return smooth(floor - 0.03, floor - 0.008, z) * smooth(floor + 0.001, floor - 0.004, z) * (P[:, 1] < EAR_FRONT) * 0.3


def scalp_w(P):
    """Buzzed hair over the scalp and the temples/around the ears; thinner toward the neck and ear rims (the fade)."""
    ax, z, y = np.abs(P[:, 0]), P[:, 2], P[:, 1]
    inside = smooth(0.006, 0.001, d_scalp(P))
    temple = (smooth(EAR_FRONT - 0.016, EAR_FRONT - 0.008, y) * smooth(EAR_LOBE - 0.01, EAR_LOBE + 0.004, z)
              * smooth(0.055, 0.065, ax) * smooth(TOP - 0.03, TOP - 0.05, z))
    fade = 0.5 + 0.5 * smooth(EAR_LOBE - 0.015, EAR_TOP + 0.012, z)
    return np.maximum(inside, temple) * fade * not_ears(P)


def dirv(x, y, z):
    def f(P):
        d = np.zeros_like(P)
        d[:, 0], d[:, 1], d[:, 2] = x, y, z
        return d
    return f


def moustache_dir(P):
    d = np.zeros_like(P)
    ax = np.abs(P[:, 0])
    d[:, 0] = np.sign(P[:, 0]) * np.minimum(1.0, ax / 0.01)                  # combed out from the philtrum
    d[:, 1] = -0.1
    d[:, 2] = -0.45 + 0.6 * smooth(MOUTH_HW - 0.004, MOUTH_HW + 0.008, ax)     # ...turning up at the ends
    return d


def scalp_dir(P):
    """Top: forward (fringe); sides/back: down."""
    d = np.zeros_like(P)
    top = smooth(EAR_TOP + 0.02, TOP - 0.02, P[:, 2])
    d[:, 1] = -1.0 * top + 0.3 * (1 - top)
    d[:, 2] = -1.0 * (1 - top)
    return d


BROW_PTS = np.array([(obj_of["ChiragBrows"].matrix_world @ v.co)[:] for v in obj_of["ChiragBrows"].data.vertices])
d_brow = dist_field(BROW_PTS)


def brow_w(P):
    """Fill under the brow card so the brows read thick and dark like the photo."""
    ax = np.abs(P[:, 0])
    inner = 0.75 + 0.25 * smooth(0.06, 0.02, ax)
    return smooth(0.003, 0.0005, d_brow(P)) * smooth(EYE_Z + 0.004, EYE_Z + 0.009, P[:, 2]) * (P[:, 1] < EAR_FRONT - 0.04) * inner


def brow_dir(P):
    d = np.zeros_like(P)
    d[:, 0], d[:, 2] = np.sign(P[:, 0]), 0.3
    return d


HAIR_RGB = np.array([0.03, 0.025, 0.022])           # black (sRGB)
SKIN_TARGET = np.array([0.71, 0.51, 0.39])          # fair, warm Indian tone (sRGB mean of the face)

# ---------------------------------------------------------------- skin texture: tone + facial hair + scalp fade
mat_skin, skin_node = tex_node(body)
src = pixels(skin_node.image)
h, w = src.shape[:2]
rgb = src[..., :3]
cheeks = ((np.abs(TRI_C[:, 0]) > 0.035) & (np.abs(TRI_C[:, 0]) < 0.06) & (TRI_C[:, 2] > LIP_TOP + 0.005)
          & (TRI_C[:, 2] < EYE_Z - 0.018) & (TRI_C[:, 1] < EAR_FRONT - 0.03))
fuv = TRI_UV[cheeks].reshape(-1, 2)
fx_, fy_ = np.clip((fuv[:, 0] * w).astype(int), 0, w - 1), np.clip((fuv[:, 1] * h).astype(int), 0, h - 1)
rgb = np.clip(rgb * (SKIN_TARGET / np.median(rgb[fy_, fx_], axis=0)), 0, 1)


def layer(weight_fn, dir_fn, count, length, seed, k, **kw):
    """Paint one hair region, normalise its density, return coverage (0..1) = 1 - exp(-k * density)."""
    buf = np.zeros((h, w))
    paint_strands(buf, weight_fn, dir_fn, count, length, seed, **kw)
    return 1.0 - np.exp(-k * norm_density(buf))


cov = np.zeros((h, w))
for c in (
    layer(beard_w, dirv(0, -0.25, -1), 30000, 0.0042, 1, 3.3, curve=0.4),
    layer(moustache_w, moustache_dir, 6000, 0.0065, 2, 3.4, width=1.1),
    layer(neck_w, dirv(0, 0.7, -0.5), 4000, 0.003, 3, 0.8),
    layer(scalp_w, scalp_dir, 60000, 0.0028, 4, 3.2, samples=6),
    layer(brow_w, brow_dir, 2500, 0.006, 6, 1.4, samples=8, jitter=0.2),
):
    cov = 1 - (1 - cov) * (1 - c)
shade = layer(lambda P: np.maximum(beard_w(P), np.maximum(moustache_w(P), scalp_w(P))), dirv(0, 0, -1),
              80000, 0.0012, 5, 1.0, samples=3)
rgb = rgb * (1 - 0.28 * shade[..., None])                             # root shadow under the hair
rgb = rgb * (1 - cov[..., None] * 0.92) + HAIR_RGB * (cov[..., None] * 0.92)


def raster_field(geo, vals, hh, ww):
    """Rasterise a per-triangle-corner scalar field (n,3) into UV space (max-combined)."""
    out = np.zeros((hh, ww))
    for uv3, f in zip(geo * (ww, hh) - 0.5, vals):
        if f.max() < 1e-3:
            continue
        a, b, c = uv3
        x0, y0 = np.floor(uv3.min(axis=0)).astype(int)
        x1, y1 = np.ceil(uv3.max(axis=0)).astype(int)
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, ww)), np.arange(max(y0, 0), min(y1 + 1, hh)))
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-12:
            continue
        l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den
        l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den
        l3 = 1 - l1 - l2
        inside = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
        v = (l1 * f[0] + l2 * f[1] + l3 * f[2])[inside]
        out[ys[inside], xs[inside]] = np.maximum(out[ys[inside], xs[inside]], v)
    return out


# natural lips: no pink/lipstick look - a muted tone derived from his skin, blended softly into the face
near_mouth = (np.abs(TRI_C[:, 0]) < 0.05) & (np.abs(TRI_C[:, 2] - (LIP_TOP + LIP_BOT) / 2) < 0.03)
lip_corner = smooth(0.006, 0.0, d_lips(TRI_V[near_mouth].reshape(-1, 3))).reshape(-1, 3)
lip_mask = raster_field(TRI_UV[near_mouth], lip_corner, h, w)[..., None]
lum_now = luminance(rgb)[..., None]
lip_ref = float(np.median(lum_now[lip_mask[..., 0] > 0.8])) if (lip_mask > 0.8).any() else 0.45
lip_tone = np.clip(np.array([0.64, 0.44, 0.37]) * (lum_now / max(lip_ref, 1e-3)) ** 0.7, 0, 1)
rgb = rgb * (1 - 0.8 * lip_mask) + lip_tone * (0.8 * lip_mask)
finish_material(body, np.concatenate([rgb, np.ones((h, w, 1))], axis=2), "T_ChiragSkin", use_alpha=False)
_skin_bsdf = next(n for n in body.data.materials[0].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_skin_bsdf.inputs["Roughness"].default_value = 0.62          # skin, not plastic
if "Specular IOR Level" in _skin_bsdf.inputs:
    _skin_bsdf.inputs["Specular IOR Level"].default_value = 0.35

# ---------------------------------------------------------------- moustache + beard volume: alpha-strand shell
shell_a = 1 - (1 - layer(moustache_w, moustache_dir, 3500, 0.0075, 11, 2.8, width=1.2, curve=0.3)) * \
    (1 - layer(lambda P: beard_w(P) * smooth(LIP_BOT - 0.004, LIP_BOT - 0.014, P[:, 2]) * smooth(0.05, 0.035, np.abs(P[:, 0])),
               dirv(0, -0.25, -1), 6000, 0.0055, 12, 0.9, curve=0.5))   # chin only: the fullest part of the beard
var = np.random.default_rng(13).random((h, w))[..., None] * 0.6 + 0.7
shell_img = new_image("T_ChiragFacialHair", np.concatenate([np.clip(HAIR_RGB * var, 0, 1), shell_a[..., None]], axis=2))


def alpha_material(name, img, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    tn = m.node_tree.nodes.new("ShaderNodeTexImage")
    tn.image = img
    m.node_tree.links.new(tn.outputs["Color"], bsdf.inputs["Base Color"])
    m.node_tree.links.new(tn.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = rough
    m.surface_render_method = "DITHERED"
    m.use_backface_culling = False
    return m


def facial_weights(co):
    P = np.array([co[:]])
    return float(moustache_w(P)[0]), float(beard_w(P)[0])


VW = {v.index: max(facial_weights(v.co)) for v in me.vertices
      if CHIN_Z - 0.04 < v.co.z < SUBNASALE + 0.01 and v.co.y < EAR_FRONT + 0.01}
shell = body.copy()
shell.data = body.data.copy()
shell.name = "ChiragFacialHair"
bpy.context.collection.objects.link(shell)
bm = bmesh.new()
bm.from_mesh(shell.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if max(VW.get(v.index, 0.0) for v in f.verts) < 0.08], context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(shell.data)
bm.free()
shell.data.update()
for v in shell.data.vertices:   # lift: thick at the moustache, thin at the borders
    mw_, bw_ = facial_weights(v.co)
    v.co += v.normal * (0.0007 + 0.0024 * mw_ + 0.0011 * bw_)
shell.data.materials.clear()
shell.data.materials.append(alpha_material("M_FacialHair", shell_img))
for m in list(shell.modifiers):
    if m.type != "ARMATURE":
        shell.modifiers.remove(m)

# ---------------------------------------------------------------- hair: near-black with strand highlights, short sides
hair = obj_of["ChiragHair"]
hp = source_rgba(hair)
lum = luminance(hp[..., :3])
ref = np.percentile(lum[hp[..., 3] > 0.5], 97) if (hp[..., 3] > 0.5).any() else lum.max()
tt = np.clip(lum / max(ref, 1e-4), 0, 1)[..., None] ** 1.5
dark, hi = np.array([0.012, 0.01, 0.009]), np.array([0.1, 0.085, 0.075])     # jet black
hp[..., :3] = dark + (hi - dark) * tt

bm = bmesh.new()
bm.from_mesh(body.data)
bvh = BVHTree.FromBMesh(bm)
bm.free()
front_line = SCALP[:, 1].min() + 0.03
SCALP_CY = float(SCALP[:, 1].mean())
CUT_SIDE, CUT_BACK = EAR_TOP + 0.012, EAR_LOBE + 0.014    # side fade starts higher than the nape taper


def cut_z(x, y):
    return CUT_SIDE + (CUT_BACK - CUT_SIDE) * float(smooth(SCALP_CY - 0.005, SCALP_CY + 0.05, y))


def is_fringe(p):
    return p.y < front_line and abs(p.x) < 0.045


def hair_thickness(p):
    """Short on top (fuller at the front), tight on the sides, tapered at the back: the 'short + side fade' cut."""
    front = float(smooth(SCALP_CY + 0.03, SCALP_CY - 0.07, p.y))
    toward_right = float(smooth(0.03, -0.045, p.x))                 # combed over to his right (-X)
    part = 1.0 - 0.35 * float(smooth(0.012, 0.0, abs(p.x - 0.034)))  # side parting on his left
    top = (0.008 + 0.009 * front + 0.006 * front * toward_right) * part
    fall = float(smooth(cut_z(p.x, p.y), cut_z(p.x, p.y) + 0.05, p.z))
    lateral = 1.0 - 0.4 * float(smooth(0.05, 0.072, abs(p.x)))
    return max(0.0012, top * fall * lateral)


def conform(bmv, mw, mwi):
    """Re-seat every hair vertex at hair_thickness() above the scalp (removes the stock mesh's crown lumps)."""
    for v in bmv:
        p = mw @ v.co
        loc, nrm, _, dist = bvh.find_nearest(p)
        if loc is None:
            continue
        d = (p - loc)
        d = d.normalized() if d.length > 1e-5 and d.dot(nrm) > 0 else nrm
        v.co = mwi @ (loc + d * hair_thickness(loc))


hb = bmesh.new()
hb.from_mesh(hair.data)
mw, mwi = hair.matrix_world, hair.matrix_world.inverted()
drop = [f for f in hb.faces if all((lambda p: p.z < cut_z(p.x, p.y) - 0.006 and not is_fringe(p))(mw @ v.co) for v in f.verts)]
bmesh.ops.delete(hb, geom=drop, context="FACES")
bmesh.ops.delete(hb, geom=[v for v in hb.verts if not v.link_faces], context="VERTS")
for _ in range(4):
    conform(hb.verts, mw, mwi)
    bmesh.ops.smooth_vert(hb, verts=list(hb.verts), factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
conform(hb.verts, mw, mwi)
hb.normal_update()
hb.to_mesh(hair.data)
hb.free()


def bake_alpha_fade(obj, rgba, fade_fn):
    """Multiply texture alpha by fade_fn(world position): rasterise every triangle in UV space and
    interpolate the per-vertex fade, so the hair thins out by height instead of ending in a hard cut."""
    m = obj.data
    m.calc_loop_triangles()
    uvl = m.uv_layers.active.data
    hh, ww = rgba.shape[:2]
    fmap = np.ones((hh, ww))
    vf = fade_fn(np.array([(obj.matrix_world @ v.co)[:] for v in m.vertices]))
    for tri in m.loop_triangles:
        uv = np.array([uvl[li].uv[:] for li in tri.loops]) * (ww, hh) - 0.5
        f = vf[list(tri.vertices)]
        if f.min() > 0.999:
            continue
        x0, y0 = np.floor(uv.min(axis=0)).astype(int)
        x1, y1 = np.ceil(uv.max(axis=0)).astype(int)
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, ww)), np.arange(max(y0, 0), min(y1 + 1, hh)))
        a, b, c = uv
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-12:
            continue
        l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den
        l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den
        l3 = 1 - l1 - l2
        inside = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
        fmap[ys[inside], xs[inside]] = np.minimum(fmap[ys[inside], xs[inside]],
                                                  (l1 * f[0] + l2 * f[1] + l3 * f[2])[inside])
    rgba[..., 3] *= np.clip(fmap, 0, 1)
    return rgba


def hair_fade(P):
    fringe = (P[:, 1] < front_line) & (np.abs(P[:, 0]) < 0.045)
    cz = np.array([cut_z(x, y) for x, y in P[:, :2]])
    return np.where(fringe, 1.0, smooth(cz - 0.004, cz + 0.03, P[:, 2]))


# combed to his right: directional strand sheen painted into the hair texture
hgeo = tri_data(hair)
hh_, hw_ = hp.shape[:2]


def combed_dir(P):
    d = np.zeros_like(P)
    d[:, 0] = -1.0                                              # toward his right
    d[:, 1] = 0.25 + 0.6 * smooth(SCALP_CY, SCALP_CY + 0.05, P[:, 1])   # bending back toward the crown
    d[:, 2] = -0.15
    return d


def top_w(P):
    return smooth(CUT_SIDE + 0.02, CUT_SIDE + 0.05, P[:, 2])


lightb, darkb = np.zeros((hh_, hw_)), np.zeros((hh_, hw_))
paint_strands(lightb, top_w, combed_dir, 9000, 0.03, 81, samples=16, width=1.0, jitter=0.12, curve=0.2, geo=hgeo)
paint_strands(darkb, top_w, combed_dir, 9000, 0.03, 82, samples=16, width=1.0, jitter=0.12, curve=0.2, geo=hgeo)
la = (1 - np.exp(-1.2 * norm_density(lightb)))[..., None]
da = (1 - np.exp(-1.2 * norm_density(darkb)))[..., None]
hp[..., :3] = hp[..., :3] * (1 - 0.55 * la) + np.array([0.13, 0.11, 0.095]) * 0.55 * la
hp[..., :3] = hp[..., :3] * (1 - 0.6 * da)
finish_material(hair, bake_alpha_fade(hair, hp, hair_fade), "T_ChiragHair", use_alpha=True)

# ---------------------------------------------------------------- twirled moustache tips (Chirag's signature)
def strand_texture(name, n=256, seed=21):
    rnd = np.random.default_rng(seed)
    cols = rnd.random(n) ** 2                                  # one value per strand around the lock
    img = np.zeros((n * 2, n, 4))
    t = np.linspace(0, 1, n * 2)[:, None]
    shade = 0.55 + 0.9 * cols[None, :] * (0.75 + 0.25 * np.sin(t * 40 + cols[None, :] * 9))
    img[..., :3] = np.clip(HAIR_RGB[None, None, :] * shade[..., None], 0, 1)
    img[..., 3] = 1.0
    return new_image(name, img, alpha=False)


def twirl_tip(side, samples=44, sides=6, locks=7):
    """A twisted bundle of locks that sweeps out from the moustache corner along the cheek and curls upward."""
    s = 1.0 if side == "l" else -1.0
    x0, z0 = MOUTH_HW - 0.003, LIP_TOP + 0.001               # start inside the painted moustache so it blends
    verts, faces, uvs = [], [], []
    path = []
    for i in range(samples):
        t = i / (samples - 1)
        if t < 0.55:                                         # sweep outward along the upper lip line
            u, v = 0.016 * t / 0.55, -0.001 * math.sin(math.pi * t / 0.55)
        else:                                                # curl: out, up and back over itself
            phi = (t - 0.55) / 0.45 * 1.15 * math.pi
            r = 0.0052 * (1 - 0.3 * (t - 0.55) / 0.45)
            u, v = 0.016 + r * math.sin(phi), r - r * math.cos(phi)
        x, z = s * (x0 + u), z0 + v
        hit, nrm, _, _ = bvh.ray_cast(Vector((x, -0.4, z)), Vector((0, 1, 0)))
        if hit is None:
            hit, nrm, _, _ = bvh.find_nearest(Vector((x, LIP_FRONT, z)))
        rad = 0.0032 * (1 - t) ** 0.8 + 0.0003
        lift = rad * 0.8 + 0.0005 + 0.003 * max(0.0, t - 0.55)  # the curl stands a little off the cheek
        path.append((hit + nrm * lift, nrm, rad))
    frames = []
    for i, (p, n, r) in enumerate(path):
        fwd = (path[min(i + 1, samples - 1)][0] - path[max(i - 1, 0)][0]).normalized()
        a = n.cross(fwd).normalized()
        frames.append((p, a, fwd.cross(a).normalized(), r))
    for j in range(locks):                                   # locks twist around the bundle's centre line
        phase = 2 * math.pi * j / max(1, locks - 1)
        rho = 0.0 if j == locks - 1 else 0.58
        sub = 0.62 if j == locks - 1 else 0.5
        base = len(verts)
        for i, (p, a, b, r) in enumerate(frames):
            t = i / (samples - 1)
            tw = phase + t * 2.4 * math.pi * s
            c = p + (a * math.cos(tw) * 1.1 + b * math.sin(tw) * 0.75) * r * rho * (1 - 0.5 * t)
            sr = r * sub
            for k in range(sides + 1):                       # seam column duplicated for clean UVs
                ang = 2 * math.pi * k / sides
                verts.append(c + (a * math.cos(ang) + b * math.sin(ang)) * sr)
                uvs.append(((k / sides + j * 0.137) % 1.0, t))
        for i in range(samples - 1):
            for k in range(sides):
                r0, r1 = base + i * (sides + 1), base + (i + 1) * (sides + 1)
                faces.append((r0 + k, r0 + k + 1, r1 + k + 1, r1 + k))
    meshd = bpy.data.meshes.new(f"MoustacheTip_{side}")
    meshd.from_pydata([v[:] for v in verts], [], faces)
    uvl = meshd.uv_layers.new(name="UVMap")
    for poly in meshd.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            uvl.data[li].uv = uvs[meshd.loops[li].vertex_index]
    o = bpy.data.objects.new(f"ChiragMoustacheTip_{side}", meshd)
    bpy.context.collection.objects.link(o)
    o.vertex_groups.new(name="head").add(range(len(verts)), 1.0, "REPLACE")
    o.modifiers.new("Armature", "ARMATURE").object = rig
    return o


m_tip = bpy.data.materials.new("M_MoustacheTip")
m_tip.use_nodes = True
_b = m_tip.node_tree.nodes["Principled BSDF"]
_t = m_tip.node_tree.nodes.new("ShaderNodeTexImage")
_t.image = strand_texture("T_ChiragMoustacheTip")
m_tip.node_tree.links.new(_t.outputs["Color"], _b.inputs["Base Color"])
_b.inputs["Roughness"].default_value = 0.72
tips = [twirl_tip("l"), twirl_tip("r")]
for o in tips:
    o.data.materials.append(m_tip)

# ---------------------------------------------------------------- brows: darker, fuller
brows = obj_of["ChiragBrows"]
bp = source_rgba(brows)
bp[..., :3] = HAIR_RGB * (0.7 + 0.6 * np.clip(luminance(bp[..., :3]), 0, 1))[..., None]
bp[..., 3] = np.clip(bp[..., 3] ** 0.55 * 1.15, 0, 1)
finish_material(brows, bp, "T_ChiragBrows", use_alpha=True)
finish_material(obj_of["ChiragLashes"], source_rgba(obj_of["ChiragLashes"]), "T_ChiragLashes", use_alpha=True)

# ---------------------------------------------------------------- eyes: dark brown iris
eyes = obj_of["ChiragEyes"]
ep = source_rgba(eyes)
mx, mn = ep[..., :3].max(axis=2), ep[..., :3].min(axis=2)
iris = smooth(0.25, 0.45, (mx - mn) / np.maximum(mx, 1e-4))[..., None]
el = luminance(ep[..., :3])[..., None]
ep[..., :3] = ep[..., :3] * (1 - iris) + np.clip(np.array([0.36, 0.22, 0.12]) * (el / 0.25) ** 0.9, 0, 1) * iris
finish_material(eyes, ep, "T_ChiragEyes", use_alpha=True)   # outer cornea layer is transparent

# ---------------------------------------------------------------- sneakers: clean plain white (no stripes/branding)
shoes = obj_of["ChiragShoes"]
sp = source_rgba(shoes)
lu = luminance(sp[..., :3])
shade = 0.8 + 0.2 * np.clip((lu - lu.min()) / (np.percentile(lu, 98) - lu.min() + 1e-4), 0, 1)
sp[..., :3] = np.clip(np.array([0.95, 0.95, 0.93]) * shade[..., None], 0, 1)
finish_material(shoes, sp, "T_ChiragSneaker", use_alpha=False)
for name in ("ChiragTeeth", "ChiragTongue"):
    if "DiffuseTexture" in obj_of[name].data.materials[0].node_tree.nodes:
        finish_material(obj_of[name], source_rgba(obj_of[name]), "T_" + name, use_alpha=False)


# ---------------------------------------------------------------- binding helpers for add-on geometry
def bind_to(obj, target):
    """Copy skin weights from the nearest surface of `target` and add the armature."""
    activate(obj)
    dt = obj.modifiers.new("Weights", "DATA_TRANSFER")
    dt.object = target
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    bpy.ops.object.datalayout_transfer(modifier=dt.name)
    bpy.ops.object.modifier_apply(modifier=dt.name)
    obj.modifiers.new("Armature", "ARMATURE").object = rig
    return obj


def bind_rigid(obj, bone):
    obj.vertex_groups.new(name=bone).add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    obj.modifiers.new("Armature", "ARMATURE").object = rig
    return obj


def flat_material(name, rgb, rough=0.6, metal=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        m.use_backface_culling = False
    return m


def mesh_object(name, verts, faces, uvs=None):
    md = bpy.data.meshes.new(name)
    md.from_pydata([tuple(v) for v in verts], [], faces)
    if uvs is not None:
        ul = md.uv_layers.new(name="UVMap")
        for poly in md.polygons:
            for li in poly.loop_indices:
                ul.data[li].uv = uvs[md.loops[li].vertex_index]
    for poly in md.polygons:
        poly.use_smooth = True
    o = bpy.data.objects.new(name, md)
    bpy.context.collection.objects.link(o)
    return o


def tube(name, pts, radius, sides=8):
    """Tube along pts; radius may be a callable(t)."""
    verts, faces = [], []
    n = len(pts)
    for i, p in enumerate(pts):
        fwd = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        a = fwd.orthogonal().normalized()
        b = fwd.cross(a).normalized()
        r = radius(i / (n - 1)) if callable(radius) else radius
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            verts.append(p + (a * math.cos(ang) + b * math.sin(ang)) * r)
    for i in range(n - 1):
        for k in range(sides):
            faces.append((i * sides + k, i * sides + (k + 1) % sides, (i + 1) * sides + (k + 1) % sides, (i + 1) * sides + k))
    faces.append(tuple(range(sides))[::-1])
    faces.append(tuple((n - 1) * sides + k for k in range(sides)))
    return mesh_object(name, verts, faces)


# ---------------------------------------------------------------- hoodie: dark olive drab, hood round the neck, pocket, cords
outfit = obj_of["ChiragOutfit"]
OLIVE = np.array([0.25, 0.27, 0.19])                  # the hoodie in the photo: dark olive drab (sRGB)


def is_top_uv(u, v):
    """male_casualsuit02 layout: top (front/back panels) in the upper half, both sleeves in the right column."""
    return v > 0.595 or (u > 0.745 and v < 0.43)


ol = outfit.data
uvo = ol.uv_layers.active.data
top_v = set()
for poly in ol.polygons:                                 # whole faces only: seam loops must not leak into the jeans
    if all(is_top_uv(*uvo[li].uv) for li in poly.loop_indices):
        top_v.update(poly.vertices)

# heavier fleece: stand the top a few mm off the body
for v in ol.vertices:
    if v.index in top_v:
        v.co += v.normal * 0.005

op = source_rgba(outfit)
oh, ow = op.shape[:2]
U_, V_ = np.meshgrid((np.arange(ow) + 0.5) / ow, (np.arange(oh) + 0.5) / oh)
top_mask = ((V_ > 0.595) | ((U_ > 0.745) & (V_ < 0.43))).astype(float)[..., None]
ao_path = asset("clothes/male_casualsuit02/male_casualsuit02_ao.png")
ao = pixels(bpy.data.images.load(ao_path))[..., 0]
if ao.shape != (oh, ow):
    ao = np.ones((oh, ow))
knit = np.random.default_rng(31).random((oh, ow)) * 0.08 + 0.96
fleece = np.clip(OLIVE * ((0.62 + 0.38 * ao) * knit)[..., None], 0, 1)
op[..., :3] = op[..., :3] * (1 - top_mask) + fleece * top_mask   # logo, stripes and neck band are gone
finish_material(outfit, op, "T_ChiragOutfit", use_alpha=False)
fleece_mat = outfit.data.materials[0]

OVC = np.array([(outfit.matrix_world @ v.co)[:] for v in ol.vertices])
TOPC = OVC[list(top_v)]
NECK_BACK = TOPC[(np.abs(TOPC[:, 0]) < 0.03) & (TOPC[:, 1] > 0), 2].max()
NECK_FRONT = TOPC[(np.abs(TOPC[:, 0]) < 0.02) & (TOPC[:, 1] < 0), 2].max()
HEM = float(np.percentile(TOPC[(np.abs(TOPC[:, 0]) < 0.08) & (TOPC[:, 1] < 0), 2], 2))
print("HOODIE_HEM", round(HEM, 3), "NECK_FRONT", round(float(NECK_FRONT), 3))
obm = bmesh.new()
obm.from_mesh(ol)
obm.transform(outfit.matrix_world)
obvh = BVHTree.FromBMesh(obm)
obm.free()


def on_outfit(x, z, off, front=True):
    """Point on the hoodie surface at (x, z), seen from the front (-Y) or the back (+Y), lifted by `off`."""
    y0, dy = (-0.6, 1.0) if front else (0.6, -1.0)
    hit, nrm, _, _ = obvh.ray_cast(Vector((x, y0, z)), Vector((0, dy, 0)))
    if hit is None:
        return None, None
    return hit + nrm * off, nrm


NECKV = VCO[(VCO[:, 2] > NECK_FRONT + 0.01) & (VCO[:, 2] < NECK_FRONT + 0.035) & (np.abs(VCO[:, 0]) < 0.09)]
NECK_CY = float((NECKV[:, 1].max() + NECKV[:, 1].min()) / 2)
NECK_RX = float(np.abs(NECKV[:, 0]).max())
NECK_RY = float((NECKV[:, 1].max() - NECKV[:, 1].min()) / 2)


# hood: a soft fleece cowl round the neck, rising behind into the folded-down hood
def hood_ring(t_count=48, s_count=10):
    verts, faces, uvs = [], [], []
    for i in range(t_count):
        a = 2 * math.pi * i / t_count                       # 0 = front centre, pi = back centre
        back = 0.5 - 0.5 * math.cos(a)                      # 0 front .. 1 back
        cx, cy = 0.0, NECK_CY
        rx, ry = NECK_RX + 0.008 + 0.018 * back, NECK_RY + 0.006 + 0.026 * back
        z0 = NECK_FRONT - 0.01 + (NECK_BACK - NECK_FRONT + 0.005) * back
        for j in range(s_count):
            s = j / (s_count - 1)
            ang = math.pi * s                               # tube cross-section: inner -> over the top -> outer
            tube_r = 0.011 + 0.019 * back ** 1.5            # thicker at the back: the folded hood
            radial = -math.cos(ang) * tube_r
            up = math.sin(ang) * tube_r * (0.9 + 0.5 * back)
            sag = -0.07 * back ** 2.2 * s                   # outer layer drapes down the upper back
            px = cx + math.sin(a) * (rx + radial + 0.02 * back * s)
            py = cy - math.cos(a) * (ry + radial + 0.025 * back * s)
            verts.append(Vector((px, py, z0 + up + sag)))
            uvs.append((0.05 + 0.6 * i / t_count, 0.62 + 0.3 * s))     # samples plain fleece in the texture
    for i in range(t_count):
        for j in range(s_count - 1):
            a0, a1 = i * s_count + j, ((i + 1) % t_count) * s_count + j
            faces.append((a0, a1, a1 + 1, a0 + 1))
    return mesh_object("ChiragHood", verts, faces, uvs)


hood = hood_ring()
sol = hood.modifiers.new("Thick", "SOLIDIFY")
sol.thickness, sol.offset = 0.004, -1
sub = hood.modifiers.new("Soft", "SUBSURF")
sub.levels = 1
activate(hood)
for m in list(hood.modifiers):
    bpy.ops.object.modifier_apply(modifier=m.name)
hood.data.materials.append(fleece_mat)
bind_to(hood, outfit)

# kangaroo pocket
pv, pf, puv = [], [], []
NX, NZ = 14, 8
for j in range(NZ):
    z = HEM + 0.035 + 0.15 * j / (NZ - 1)
    half = 0.125 - 0.04 * j / (NZ - 1)
    for i in range(NX):
        x = -half + 2 * half * i / (NX - 1)
        p, _ = on_outfit(x, z, 0.003)
        pv.append(p if p is not None else Vector((x, -0.12, z)))
        puv.append((0.1 + 0.3 * i / NX, 0.65 + 0.2 * j / NZ))
for j in range(NZ - 1):
    for i in range(NX - 1):
        a0 = j * NX + i
        pf.append((a0, a0 + 1, a0 + NX + 1, a0 + NX))
pocket = mesh_object("ChiragPocket", pv, pf, puv)
sol = pocket.modifiers.new("Thick", "SOLIDIFY")
sol.thickness, sol.offset, sol.use_rim = 0.003, 1, True
activate(pocket)
bpy.ops.object.modifier_apply(modifier=sol.name)
pocket.data.materials.append(fleece_mat)
bind_to(pocket, outfit)

# drawstrings with metal grommets
cord_mat = flat_material("M_Drawstring", (0.2, 0.21, 0.16), 0.8)
metal_mat = flat_material("M_Grommet", (0.62, 0.62, 0.6), 0.3, 1.0)
extras = []
for sx in (-1, 1):
    x0 = sx * 0.032
    z0 = NECK_FRONT - 0.018
    pts = []
    for k in range(14):
        t = k / 13
        p, _ = on_outfit(x0 + sx * 0.004 * t, z0 - 0.17 * t, 0.006 + 0.004 * t)
        if p is not None:
            pts.append(p)
    if len(pts) >= 3:
        cord = tube(f"ChiragCord_{'l' if sx > 0 else 'r'}", pts, 0.0028)
        cord.data.materials.append(cord_mat)
        extras.append(bind_to(cord, outfit))
        tip = tube(f"ChiragAglet_{'l' if sx > 0 else 'r'}", [pts[-1], pts[-1] + (pts[-1] - pts[-2]).normalized() * 0.018], 0.0032)
        tip.data.materials.append(metal_mat)
        extras.append(bind_to(tip, outfit))
        g, n = on_outfit(x0, z0 + 0.004, 0.004)
        if g is not None:
            bpy.ops.mesh.primitive_torus_add(major_radius=0.0065, minor_radius=0.0022, location=g)
            ring = bpy.context.object
            ring.name = f"ChiragGrommet_{'l' if sx > 0 else 'r'}"
            ring.rotation_euler = n.to_track_quat("Z", "Y").to_euler()
            activate(ring)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            ring.data.materials.append(metal_mat)
            extras.append(bind_to(ring, outfit))


def back_lettering(target, text="CHIRAG"):
    """Flat lettering shrink-wrapped onto the back of `target`, below the folded hood."""
    bpy.ops.object.text_add(location=(0, 0, 0))
    t = bpy.context.object
    t.data.body = text
    t.data.align_x, t.data.align_y = "CENTER", "CENTER"
    t.data.size = 0.075
    t.data.space_character = 1.1
    t.rotation_euler = (math.radians(90), 0, math.radians(180))   # readable from behind (+Y)
    t.location = (0, 0.4, NECK_BACK - 0.2)
    bpy.ops.object.convert(target="MESH")
    t = bpy.context.object
    t.name = "ChiragLettering"
    activate(t)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    sw = t.modifiers.new("Wrap", "SHRINKWRAP")
    sw.target = target
    sw.wrap_method = "PROJECT"
    sw.use_project_y = True
    sw.use_negative_direction = True
    sw.use_positive_direction = True
    sw.offset = 0.0015
    bpy.ops.object.modifier_apply(modifier=sw.name)
    t.data.materials.append(flat_material("M_Lettering", (0.86, 0.84, 0.76), 0.85))
    return bind_to(t, target)


lettering = back_lettering(outfit)
extras += [hood, pocket]

# ---------------------------------------------------------------- glasses: clear geometric acetate frames
def clear_of_head(p, gap=0.004):
    loc, nrm, _, dist = bvh.find_nearest(p)
    if loc is None:
        return p
    if (p - loc).dot(nrm) < gap:
        return loc + nrm * gap
    return p


def lens_outline(n_per_side=6):
    """Squarish hexagon with softened corners (u = outward, v = up), metres."""
    w, hgt, ch = 0.0205, 0.0165, 0.007                # half-width, half-height, lower chamfer (small frames)
    corners = [(-w, hgt), (w, hgt), (w, -hgt + ch), (w - ch, -hgt), (-w + ch * 0.6, -hgt), (-w, -hgt + ch * 0.6)]
    pts = []
    for i in range(len(corners)):
        a, b = Vector(corners[i] + (0,)), Vector(corners[(i + 1) % len(corners)] + (0,))
        for k in range(n_per_side):
            pts.append(a.lerp(b, k / n_per_side))
    # soften: two Chaikin passes
    for _ in range(2):
        nxt = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            nxt += [a.lerp(b, 0.25), a.lerp(b, 0.75)]
        pts = nxt
    return [(p.x, p.y) for p in pts]


EYE_C = Vector((float(abs(EYE[:, 0]).mean()), float(EYE[:, 1].mean()), float(EYE[:, 2].mean()))) if len(EYE) \
    else Vector((0.0295, -0.1247, EYE_Z))
OUTLINE = lens_outline()
WRAP = math.radians(9)
front_pts = VCO[(np.abs(np.abs(VCO[:, 0]) - EYE_C.x) < 0.03) & (np.abs(VCO[:, 2] - EYE_C.z) < 0.022)]
PLANE_Y = float(front_pts[:, 1].min()) - 0.006
glass_parts = []
acetate = flat_material("M_GlassesFrame", (0.86, 0.86, 0.84), 0.08, alpha=0.32)    # clear acetate front
steel = flat_material("M_GlassesSteel", (0.72, 0.72, 0.74), 0.22, metal=1.0)           # steel temples
lens_mat = flat_material("M_GlassesLens", (0.95, 0.97, 1.0), 0.02, alpha=0.04)


def lens_frame(s):
    """Flat acetate rim (5 mm face, 4 mm deep) round one lens; s = +1 left eye (+X), -1 right eye."""
    c = Vector((s * (EYE_C.x + 0.002), PLANE_Y, EYE_C.z - 0.003))
    out = Vector((s * math.cos(WRAP), math.sin(WRAP), 0))
    up = Vector((0, 0, 1))
    depth = out.cross(up).normalized() * (-s)          # toward the face (+Y)
    if depth.y < 0:
        depth = -depth
    ring_in, ring_out = [], []
    for u, v in OUTLINE:
        d2 = Vector((u, v)).normalized()
        p = c + out * u + up * v
        ring_in.append(p)
        ring_out.append(p + (out * d2.x + up * d2.y) * 0.003)
    n = len(OUTLINE)
    verts = []
    for ring in (ring_in, ring_out):
        verts += [p for p in ring]
    verts += [p + depth * 0.003 for p in ring_out] + [p + depth * 0.003 for p in ring_in]
    faces = []
    for k in range(n):
        k2 = (k + 1) % n
        for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
            faces.append((a * n + k, a * n + k2, b * n + k2, b * n + k))
    frame = mesh_object(f"ChiragGlassesRim_{'l' if s > 0 else 'r'}", verts, faces)
    lens = mesh_object(f"ChiragGlassesLens_{'l' if s > 0 else 'r'}", [c + depth * 0.002] + [p + depth * 0.002 for p in ring_in],
                       [(0, k + 1, (k + 1) % n + 1) for k in range(n)])
    return frame, lens, c, out, up


rims = [lens_frame(1), lens_frame(-1)]
for frame, lens, c, out, up in rims:
    frame.data.materials.append(acetate)
    lens.data.materials.append(lens_mat)
    glass_parts += [frame, lens]

# bridge over the nose
(_, _, cl, outl, _), (_, _, cr, outr, _) = rims
inner_l = cl + outl * -0.0215 + Vector((0, 0, 0.009))
inner_r = cr + outr * -0.0215 + Vector((0, 0, 0.009))
nose_y = float(VCO[(np.abs(VCO[:, 0]) < 0.006) & (np.abs(VCO[:, 2] - (EYE_C.z + 0.01)) < 0.006), 1].min()) - 0.004
bridge = tube("ChiragGlassesBridge", [inner_r, Vector((0, min(nose_y, inner_l.y), inner_l.z + 0.003)), inner_l], 0.0024)
bridge.data.materials.append(acetate)
glass_parts.append(bridge)

# temples: hinge at the outer top corner, back over the ear, small drop behind it
for s, (frame, lens, c, out, up) in zip((1, -1), rims):
    hinge = c + out * 0.0235 + up * 0.01
    ear_x = float(np.abs(EARS[:, 0]).max()) * 0.92
    path = []
    for k in range(16):
        t = k / 15
        y = hinge.y + (EAR_FRONT + 0.018 - hinge.y) * t
        x = s * (abs(hinge.x) + (ear_x - abs(hinge.x)) * min(1.0, t * 1.6))
        z = hinge.z + (EAR_TOP - 0.004 - hinge.z) * t
        path.append(clear_of_head(Vector((x, y, z)), 0.003))
    path.append(clear_of_head(path[-1] + Vector((0, 0.012, -0.014)), 0.002))
    arm = tube(f"ChiragGlassesTemple_{'l' if s > 0 else 'r'}", path, lambda t: 0.0012 - 0.0002 * t, sides=6)
    arm.data.materials.append(steel)
    glass_parts.append(arm)

for o in glass_parts:
    bind_rigid(o, "head")

# ---------------------------------------------------------------- textures: keep the GLB light
for img in list(bpy.data.images):
    if img.size[0] > 1024 and img.name != "T_ChiragSkin":
        img.scale(1024, 1024)
        img.pack()

# ---------------------------------------------------------------- export
parts = [body, shell, lettering] + tips + extras + glass_parts + list(obj_of.values())
for o in parts:
    for m in list(o.modifiers):
        if m.type != "ARMATURE":
            activate(o)
            bpy.ops.object.modifier_apply(modifier=m.name)

# ---------------------------------------------------------------- animation clips (real locomotion, not procedural wiggles)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anims  # noqa: E402

for act in list(bpy.data.actions):          # only our clips go into the GLB
    bpy.data.actions.remove(act)
clip_info = anims.bake_locomotion(rig)
clip_info.update(anims.bake_seated(rig))
anims.write_info(clip_info, os.path.join(ROOT, "src", "game", "player", "chiragClips.json"))
if rig.animation_data:
    rig.animation_data.action = None
print("CLIPS " + json.dumps(clip_info))

bpy.ops.object.select_all(action="DESELECT")
for o in parts + [rig]:
    o.select_set(True)
bpy.context.view_layer.objects.active = rig
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB, export_format="GLB", use_selection=True, export_yup=True,
    export_skins=True, export_morph=False, export_apply=False,
    export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
    export_optimize_animation_size=True, export_anim_single_armature=True, export_reset_pose_bones=True,
    export_image_format="WEBP", export_image_quality=82, export_vertex_color="MATERIAL",
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
)
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

print("CHIRAG_BUILD_REPORT " + json.dumps({
    "glb_kb": round(os.path.getsize(OUT_GLB) / 1024),
    "top_m": round(float(TOP), 3),
    "verts": {o.name: len(o.data.vertices) for o in parts},
}))
