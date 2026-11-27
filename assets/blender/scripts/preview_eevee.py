"""Quality-control renders (Eevee, 3-point lighting): face front/side/three-quarter/rear + full body."""
import os
import sys
import math
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = os.path.abspath(argv[0]) if argv else os.path.join(ROOT, "assets", "blender", "previews")
os.makedirs(OUT_DIR, exist_ok=True)

scene = bpy.context.scene
for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try:
        scene.render.engine = eng
        break
    except TypeError:
        continue
scene.render.resolution_x, scene.render.resolution_y = 800, 1000
scene.view_settings.view_transform = "AgX"
world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.36, 0.37, 0.4, 1)
bg.inputs["Strength"].default_value = 0.45


def light(name, kind, loc, energy, color=(1, 1, 1), size=1.0):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "AREA":
        data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    d = [-loc[0], -loc[1], 1.5 - loc[2]]
    obj.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    return obj


light("Key", "AREA", (1.6, -2.2, 2.4), 140, (1.0, 0.95, 0.88), 1.5)
light("Fill", "AREA", (-2.2, -1.6, 1.8), 60, (0.85, 0.9, 1.0), 2.0)
light("Rim", "AREA", (0.6, 2.4, 2.4), 110, (1.0, 0.97, 0.92), 1.2)

cam_data = bpy.data.cameras.new("QC")
cam = bpy.data.objects.new("QC", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def shoot(name, deg, dist, height, target_z, lens):
    a = math.radians(deg)
    cam_data.lens = lens
    cam.location = (math.sin(a) * dist, -math.cos(a) * dist, height)
    d = [-cam.location[0], -cam.location[1], target_z - cam.location[2]]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    scene.render.filepath = os.path.join(OUT_DIR, f"qc_{name}.png")
    bpy.ops.render.render(write_still=True)


head_z = max(v.co.z for v in bpy.data.objects["ChiragBody"].data.vertices) - 0.12
shoot("face_front", 0, 0.75, head_z + 0.02, head_z, 85)
shoot("face_three_quarter", 38, 0.75, head_z + 0.03, head_z, 85)
shoot("face_side", 90, 0.75, head_z + 0.02, head_z, 85)
shoot("head_rear", 180, 0.8, head_z + 0.08, head_z, 85)
shoot("full_body", 25, 4.6, 1.1, 0.9, 60)
print("QC_DONE", OUT_DIR)
