"""Render quick front / three-quarter previews of the built character (Workbench, material colours)."""
import os
import sys
import math
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_DIR = argv[0] if argv else os.path.join(ROOT, "assets", "blender", "previews")
os.makedirs(OUT_DIR, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.render.resolution_x, scene.render.resolution_y = 720, 960
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new("W")

cam_data = bpy.data.cameras.new("PreviewCam")
cam_data.lens = 70
cam = bpy.data.objects.new("PreviewCam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

shots = {"front": 0.0, "three_quarter": 35.0, "face": 0.0}
for name, deg in shots.items():
    a = math.radians(deg)
    if name == "face":
        cam.location = (math.sin(a) * 1.1, -math.cos(a) * 1.1, 1.62)
        target = (0, 0, 1.6)
    else:
        cam.location = (math.sin(a) * 5.2, -math.cos(a) * 5.2, 1.0)
        target = (0, 0, 0.88)
    d = [target[i] - cam.location[i] for i in range(3)]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    scene.render.filepath = os.path.join(OUT_DIR, f"chirag_{name}.png")
    bpy.ops.render.render(write_still=True)
print("PREVIEWS_DONE", OUT_DIR)
