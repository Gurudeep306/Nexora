"""Where MediaPipe's 478 face points sit on the MakeHuman base mesh (run once; the mesh layout never changes).

  blender -b --python scripts/teacher/fit/corr.py -- render <dir>   # renders the bare head from 5 angles
  python3 scripts/teacher/fit/detect.py <dir> face_landmarker.task <dir>/points.json
  blender -b --python scripts/teacher/fit/corr.py -- cast <dir> scripts/teacher/fit/corr.json

`cast` shoots a ray through each detected point into the mesh and keeps the hit (triangle and
barycentric weights on base-mesh vertices), averaged over the views where the point faces the camera.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1:]
mode, folder = argv[0], argv[1]
YAWS = [0, -20, 20, -35, 35]
RES = 900

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
macros = TargetService.get_default_macro_info_dict()
macros["gender"] = 0.0
human = HumanService.create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=False,
                                  feet_on_ground=True, scale=0.1, macro_detail_dict=macros)
TargetService.bake_targets(human)
data = LocationService.get_user_data()
HumanService.set_character_skin(os.path.join(data, "skins/young_caucasian_female/young_caucasian_female.mhmat"), human, skin_type="GAMEENGINE")
bpy.context.view_layer.update()
mesh = human.data
# The head: vertices above the neck, centred.
deps0 = bpy.context.evaluated_depsgraph_get()
shown = human.evaluated_get(deps0).to_mesh()
world_pts = [human.matrix_world @ v.co for v in shown.vertices]
top = max(p.z for p in world_pts)
height = top - min(p.z for p in world_pts)
head = [p for p in world_pts if p.z > top - height * 0.13 and abs(p.x) < height * 0.08]
centre = sum(head, Vector()) / len(head)
print("CORR height", round(height, 3), "head centre", tuple(round(c, 3) for c in centre))


def camera_for(yaw):
    cam_data = bpy.data.cameras.new(f"cam{yaw}")
    cam_data.lens = 85
    cam = bpy.data.objects.new(f"cam{yaw}", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    r = height * 0.55
    a = math.radians(yaw)
    target = centre.copy()
    cam.location = target + Vector((r * math.sin(a), -r * math.cos(a), 0.0))
    direction = target - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return cam


scene = bpy.context.scene
scene.render.resolution_x = scene.render.resolution_y = RES
cams = {yaw: camera_for(yaw) for yaw in YAWS}

if mode == "render":
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 16
    scene.cycles.device = "CPU"
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.2
    scene.world = world
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3
    sun.rotation_euler = (math.radians(60), 0, math.radians(15))
    scene.collection.objects.link(sun)
    os.makedirs(folder, exist_ok=True)
    for yaw, cam in cams.items():
        scene.camera = cam
        scene.render.filepath = os.path.join(folder, f"view{yaw:+d}.png")
        bpy.ops.render.render(write_still=True)
    print("CORR rendered", len(cams))
else:
    out = argv[2]
    points = json.load(open(os.path.join(folder, "points.json")))
    deps = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(human, deps)
    world = human.matrix_world
    inv = world.inverted()
    acc = [dict() for _ in range(478)]
    for yaw, cam in cams.items():
        rec = points.get(f"view{yaw:+d}.png")
        if not rec or not rec.get("found"):
            print("CORR no face in view", yaw)
            continue
        scene.camera = cam
        frame = cam.data.view_frame(scene=scene)  # local corners at depth -1 (top-right, bottom-right, bottom-left, top-left)
        tr, bl = frame[0], frame[2]
        origin = inv @ cam.matrix_world.translation
        for i, (px, py, _) in enumerate(rec["landmarks"]):
            u, v = px / RES, py / RES
            local = Vector((bl.x + (tr.x - bl.x) * u, tr.y - (tr.y - bl.y) * v, tr.z))
            d = (inv.to_3x3() @ (cam.matrix_world.to_3x3() @ local)).normalized()
            loc, normal, face, dist = bvh.ray_cast(origin, d)
            if loc is None:
                continue
            facing = -normal.dot(d)
            if facing < 0.35:
                continue  # grazing: the point is on the side of the face, not seen well here
            poly = mesh.polygons[face]
            vs = [mesh.vertices[k].co for k in poly.vertices]
            # Barycentric on the polygon's first triangle that holds the point (quads: two triangles).
            best = None
            for tri in ((0, 1, 2), (0, 2, 3)) if len(vs) == 4 else ((0, 1, 2),):
                a, b, c = (vs[t] for t in tri)
                from mathutils.geometry import barycentric_transform
                w = barycentric_transform(loc, a, b, c, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
                if min(w) > -0.05 and (best is None or min(w) > min(best[1])):
                    best = ([poly.vertices[t] for t in tri], w)
            if best is None:
                continue
            for vid, w in zip(best[0], best[1]):
                acc[i][vid] = acc[i].get(vid, 0) + w * facing
    corr = []
    for i, weights in enumerate(acc):
        total = sum(weights.values())
        corr.append({str(k): round(w / total, 5) for k, w in weights.items() if w / total > 0.01} if total > 0 else None)
    missing = [i for i, c in enumerate(corr) if not c]
    json.dump({"points": corr, "missing": missing}, open(out, "w"))
    print("CORR placed", 478 - len(missing), "of 478; missing", missing[:20])
