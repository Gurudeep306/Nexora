"""Export the MakeHuman base body (after its body settings) for the photo solver, from Blender.

  blender -b --python scripts/teacher/maker/export_base.py -- <recipe.json> <out.npz>

Writes the body mesh's vertex positions in the object's local frame (metres, z up, -y forward),
its triangles and UVs, and one sample target's delta so the solver can check it reads the target
files in the same frame.
"""
import json
import sys

import bpy
import numpy as np

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1:]
recipe = json.load(open(argv[0]))
out = argv[1]
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
macros = TargetService.get_default_macro_info_dict()
for k, v in recipe.get("body", {}).items():
    if k == "race":
        macros["race"].update(v)
    else:
        macros[k] = v
human = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True,
                                  feet_on_ground=True, scale=0.1, macro_detail_dict=macros)
TargetService.bake_targets(human)
mesh = human.data
n = len(mesh.vertices)
co = np.empty(n * 3, dtype=np.float64)
mesh.vertices.foreach_get("co", co)
co = co.reshape(n, 3)
# A sample target, loaded by MPFB, to calibrate the solver's reading of target files.
sample = "nose-scale-horiz-incr"
TargetService.load_target(human, TargetService.target_full_path(sample), weight=1.0, name=sample)
key = human.data.shape_keys.key_blocks[sample]
moved = np.empty(n * 3)
key.data.foreach_get("co", moved)
delta = moved.reshape(n, 3) - co
mesh.calc_loop_triangles()
tris = np.array([t.vertices[:] for t in mesh.loop_triangles], dtype=np.int32)
loops = np.array([t.loops[:] for t in mesh.loop_triangles], dtype=np.int32)
uv = np.empty(len(mesh.loops) * 2)
mesh.uv_layers.active.data.foreach_get("uv", uv)
uv = uv.reshape(-1, 2)[loops]  # (triangles, 3, 2)
np.savez_compressed(out, co=co, tris=tris, uv=uv, sample_delta=delta, sample=sample, body_faces=len(mesh.polygons))
print("EXPORT", n, "vertices", len(tris), "triangles")
