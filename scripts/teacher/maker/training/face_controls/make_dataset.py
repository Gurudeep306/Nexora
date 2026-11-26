"""Synthetic training data for the photo -> face-controls model (Pratibimb slot "face_controls").

  blender -b --python scripts/teacher/maker/training/face_controls/make_dataset.py -- <out dir> <count> [seed]

Each sample is a random but natural MakeHuman person (CC0): random gender, age, ancestry mix and build,
and random values for a random subset of the 222 face controls (most stay at 0, as in real faces).
It is rendered from 5 head turns with Cycles, so the photo reader can be run on the images
(`analyse.py <out>/<id> ...`). The answer key (the exact control values) is saved beside the images:
because the faces are generated, the labels are perfect and the data has no licence or privacy issues.
A small network trained on (face points -> control values) then reads a real person's photos in one step.

Output: <out>/<id>/view{-35,-20,+0,+20,+35}.png and <out>/<id>/label.json
{"macros": {...}, "controls": {name: value}}; <out>/names.json lists the 222 control names in order.
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1:]
out, count = argv[0], int(argv[1])
rng = random.Random(int(argv[2]) if len(argv) > 2 else 1)
os.makedirs(out, exist_ok=True)
GROUPS = ["head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin"]
tdir = os.path.join(os.path.dirname(TargetService.target_full_path("nose-scale-horiz-incr")), "..")
names = sorted(fn[:-10] for g in GROUPS for fn in os.listdir(os.path.join(tdir, g)) if fn.endswith(".target.gz"))
json.dump(names, open(os.path.join(out, "names.json"), "w"))
data = LocationService.get_user_data()
skins = [s for s in os.listdir(os.path.join(data, "skins")) if os.path.exists(os.path.join(data, "skins", s, s + ".mhmat")) and "special" not in s and "toon" not in s]
YAWS = [-35, -20, 0, 20, 35]
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.device = "CPU"
scene.render.resolution_x = scene.render.resolution_y = 640


def pair_value(n):
    """Mostly 0; sometimes a moderate value (faces differ in a few features at a time)."""
    return round(rng.betavariate(1.2, 3.5), 3) if rng.random() < 0.18 else 0.0


for k in range(count):
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    macros = TargetService.get_default_macro_info_dict()
    macros["gender"] = rng.choice([0.0, 1.0, rng.random()])
    macros["age"] = rng.uniform(0.35, 0.85)
    macros["weight"] = rng.uniform(0.3, 0.8)
    macros["muscle"] = rng.uniform(0.3, 0.7)
    a, b = rng.random(), rng.random()
    lo, hi = min(a, b), max(a, b)
    macros["race"] = {"african": round(lo, 3), "asian": round(hi - lo, 3), "caucasian": round(1 - hi, 3)}
    human = HumanService.create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=False,
                                      feet_on_ground=True, scale=0.1, macro_detail_dict=macros)
    controls = {}
    # Opposite pairs (incr/decr, up/down, ...) never both set; left and right mostly together.
    for n in names:
        if n.startswith("r-") and "l-" + n[2:] in controls and rng.random() < 0.85:
            controls[n] = controls["l-" + n[2:]]
            continue
        v = pair_value(n)
        if v:
            for opp in (("incr", "decr"), ("up", "down"), ("in", "out"), ("forward", "backward"), ("concave", "convex")):
                for x, y in (opp, opp[::-1]):
                    if n.endswith(x) and controls.get(n[: -len(x)] + y):
                        v = 0.0
            if v:
                controls[n] = v
    for n, v in controls.items():
        TargetService.load_target(human, TargetService.target_full_path(n), weight=v, name=n)
    TargetService.bake_targets(human)
    skin = rng.choice(skins)
    HumanService.set_character_skin(os.path.join(data, "skins", skin, skin + ".mhmat"), human, skin_type="GAMEENGINE")
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    pts = [human.matrix_world @ v.co for v in human.evaluated_get(deps).to_mesh().vertices]
    top = max(p.z for p in pts)
    height = top - min(p.z for p in pts)
    head = [p for p in pts if p.z > top - height * 0.13 and abs(p.x) < height * 0.08]
    centre = sum(head, Vector()) / len(head)
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[1].default_value = rng.uniform(0.8, 1.5)
    scene.world = world
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = rng.uniform(1.5, 4)
    sun.rotation_euler = (math.radians(rng.uniform(30, 70)), 0, math.radians(rng.uniform(-40, 40)))
    scene.collection.objects.link(sun)
    sid = f"{k:06d}"
    os.makedirs(os.path.join(out, sid), exist_ok=True)
    for yaw in YAWS:
        cam = bpy.data.objects.new(f"cam{yaw}", bpy.data.cameras.new(f"cam{yaw}"))
        cam.data.lens = rng.uniform(60, 95)
        scene.collection.objects.link(cam)
        r = height * 0.55 * cam.data.lens / 85
        aa = math.radians(yaw + rng.uniform(-4, 4))
        cam.location = centre + Vector((r * math.sin(aa), -r * math.cos(aa), rng.uniform(-0.04, 0.04)))
        cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        scene.render.filepath = os.path.join(out, sid, f"view{yaw:+d}.png")
        bpy.ops.render.render(write_still=True)
    json.dump({"macros": macros, "skin": skin, "controls": controls}, open(os.path.join(out, sid, "label.json"), "w"))
    print("FACEDATA", sid, len(controls), "controls set", flush=True)
