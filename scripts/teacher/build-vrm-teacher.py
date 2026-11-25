"""Build the new virtual teacher as a VRM 1.0 file, headless in Blender (docs/voice/TEACHER_HANDOFF.md).

Run (Blender 5.2 with the extensions "mpfb" and "vrm", and these CC0 asset packs installed in MPFB's
user data folder: makehuman_system_assets, faceunits01, visemes02):

  blender -b --factory-startup --python scripts/teacher/build-vrm-teacher.py -- \
      scripts/teacher/recipes/<teacher>.json client/public/teachers/<teacher>.vrm

Everything the teacher is made of is CC0 (docs/voice/licences/2026-11-25/README.md): the MakeHuman
base mesh, skin, hair, clothes, eyes, the 52 ARKit face units (faceunits01) and the 15 Oculus visemes
(visemes02). The script only checks that each worn item's own file says CC0 and refuses otherwise.

Adapted from ffunch/vrm-avatar-maker's pipeline/build_avatar.py (MIT, 2026 Flemming Funch): the
T-pose, the lighter teeth and the VRM export follow it. What is ours: every face shape is kept (the
full ARKit 52 and Oculus 15, so p/b/m close the lips and the mouth can round), the VRM five vowels are
made from the Oculus visemes, the texture budget is 1024 px, and the build reports the triangle and
material budget (30–70k triangles, at most 8 materials) and fails when it is missed.
"""

import json
import os
import sys

import bpy
from mathutils import Vector

from bl_ext.user_default.mpfb.services.exportservice import ExportService
from bl_ext.user_default.mpfb.services.faceservice import ARKIT_FACEUNITS, META_VISEMES, FaceService
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.rigservice import RigService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argv = sys.argv[sys.argv.index("--") + 1:]
recipe_path, out_path = argv[0], argv[1]
with open(recipe_path) as handle:
    recipe = json.load(handle)
DATA = LocationService.get_user_data()
MAX_TEXTURE = recipe.get("max_texture", 1024)
BUDGET_TRIS = recipe.get("budget_triangles", [30000, 70000])
BUDGET_MATERIALS = recipe.get("budget_materials", 8)

# VRM 1.0 preset expressions → (shape key, weight). The engine drives the ARKit and Oculus shapes
# itself; these presets are for any other VRM app that opens the file.
EXPRESSIONS = {
    "aa": [("viseme_aa", 1.0)],
    "ih": [("viseme_I", 1.0)],
    "ou": [("viseme_U", 1.0)],
    "ee": [("viseme_E", 1.0)],
    "oh": [("viseme_O", 1.0)],
    "blink": [("eyeBlinkLeft", 1.0), ("eyeBlinkRight", 1.0)],
    "blinkLeft": [("eyeBlinkLeft", 1.0)],
    "blinkRight": [("eyeBlinkRight", 1.0)],
    "happy": [("mouthSmileLeft", 0.8), ("mouthSmileRight", 0.8), ("cheekSquintLeft", 0.5), ("cheekSquintRight", 0.5), ("eyeSquintLeft", 0.25), ("eyeSquintRight", 0.25)],
    "relaxed": [("mouthSmileLeft", 0.35), ("mouthSmileRight", 0.35), ("eyeSquintLeft", 0.15), ("eyeSquintRight", 0.15)],
    "sad": [("mouthFrownLeft", 0.8), ("mouthFrownRight", 0.8), ("browInnerUp", 0.7)],
    "angry": [("browDownLeft", 0.8), ("browDownRight", 0.8), ("mouthPressLeft", 0.5), ("mouthPressRight", 0.5)],
    "surprised": [("browInnerUp", 0.9), ("browOuterUpLeft", 0.9), ("browOuterUpRight", 0.9), ("eyeWideLeft", 0.6), ("eyeWideRight", 0.6), ("jawOpen", 0.3)],
}


def asset(relative):
    path = os.path.join(DATA, relative)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Asset not installed: {relative}")
    with open(path, encoding="utf-8", errors="replace") as handle:
        if "CC0" not in handle.read(4000):
            raise SystemExit(f"Refused: {relative} does not say CC0 in its own header")
    return path


def log(*parts):
    print("BUILD", *parts, flush=True)


for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

# --- Body ---------------------------------------------------------------------------------------
macros = TargetService.get_default_macro_info_dict()
for key, value in recipe.get("body", {}).items():
    if key == "race":
        macros["race"].update(value)
    else:
        macros[key] = value
basemesh = HumanService.create_human(
    mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True,
    feet_on_ground=True, scale=0.1, macro_detail_dict=macros,
)
# Shape targets on top of the macros (face proportions: the soft, friendly "animated film" look).
for target, value in recipe.get("targets", {}).items():
    TargetService.load_target(basemesh, TargetService.target_full_path(target), weight=value, name=target)
    log("target", target, value)
# Bake the body shape now, so the face fit below edits the final shape (shape keys hide edits).
TargetService.bake_targets(basemesh)
if recipe.get("fit"):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "fit"))
    from apply import fit_face  # noqa: E402

    here = os.path.dirname(os.path.abspath(recipe_path))
    fit = recipe["fit"]
    fit_face(basemesh, os.path.join(here, fit["shape"]), os.path.join(os.path.dirname(os.path.abspath(__file__)), "fit", "corr.json"),
             amount=fit.get("amount", 1.0), depth=fit.get("depth", 0.6), log=log)
rig = HumanService.add_builtin_rig(basemesh, "game_engine", import_weights=True)

# --- Skin and worn assets -------------------------------------------------------------------------
HumanService.set_character_skin(asset(recipe["skin"]), basemesh, skin_type="GAMEENGINE")
worn = [("Eyes", recipe["eyes"]), ("Teeth", recipe.get("teeth", "teeth/teeth_base/teeth_base.mhclo"))]
worn += [("Tongue", recipe["tongue"])] if recipe.get("tongue") else []
worn += [("Eyebrows", recipe["eyebrows"])] if recipe.get("eyebrows") else []
worn += [("Eyelashes", recipe["eyelashes"])] if recipe.get("eyelashes") else []
worn += [("Hair", recipe["hair"])] if recipe.get("hair") else []
worn += [("Clothes", item) for item in recipe.get("clothes", [])]
for asset_type, relative in worn:
    HumanService.add_mhclo_asset(asset(relative), basemesh, asset_type=asset_type, subdiv_levels=0, material_type="GAMEENGINE")
    log("wear", asset_type, relative)

if basemesh.data.shape_keys:
    TargetService.bake_targets(basemesh)

# --- T-pose as rest (VRM 1.0 wants a T-pose at rest) ---------------------------------------------
aims = []
for side, sign in (("l", 1.0), ("r", -1.0)):
    for name in (f"upperarm_{side}", f"lowerarm_{side}", f"hand_{side}"):
        head = rig.matrix_world @ rig.data.bones[name].head_local
        aim = bpy.data.objects.new(f"aim_{name}", None)
        aim.location = head + Vector((sign * 10.0, 0.0, 0.0))
        bpy.context.scene.collection.objects.link(aim)
        aims.append(aim)
        track = rig.pose.bones[name].constraints.new("DAMPED_TRACK")
        track.target = aim
        track.track_axis = "TRACK_Y"
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="POSE")
bpy.ops.pose.select_all(action="SELECT")
bpy.ops.pose.visual_transform_apply()
for bone in rig.pose.bones:
    for constraint in list(bone.constraints):
        bone.constraints.remove(constraint)
for aim in aims:
    bpy.data.objects.remove(aim, do_unlink=True)
bpy.ops.object.mode_set(mode="OBJECT")
RigService.apply_pose_as_rest_pose(rig)
bpy.ops.object.mode_set(mode="OBJECT")
bpy.context.view_layer.update()

# --- Face shapes: all 52 ARKit face units and the 15 Oculus visemes --------------------------------
FaceService.load_targets(basemesh, load_microsoft_visemes=False, load_meta_visemes=True, load_arkit_faceunits=True)
FaceService.interpolate_targets(basemesh)
names = {b.name for b in basemesh.data.shape_keys.key_blocks}
missing = [n for n in ARKIT_FACEUNITS + META_VISEMES if n not in names]
if missing:
    raise SystemExit(f"Face shapes missing: {missing}")
log("face shapes", len(names) - 1, "(ARKit", len(ARKIT_FACEUNITS), "+ Oculus", len(META_VISEMES), ")")

# --- Bake (clothes' delete groups remove hidden body faces; shape keys are kept) ------------------
ExportService.bake_modifiers_remove_helpers(basemesh, bake_masks=True, remove_helpers=True)
for obj in rig.children:
    for modifier in list(obj.modifiers) if obj.type == "MESH" else []:
        if modifier.type == "SUBSURF":
            obj.modifiers.remove(modifier)


def decimate_keeping_shapes(source, ratio):
    """A lighter copy that keeps the armature weights and every face shape (Surface Deform)."""
    keys = [block.name for block in source.data.shape_keys.key_blocks[1:]] if source.data.shape_keys else []
    low = source.copy()
    low.data = source.data.copy()
    bpy.context.scene.collection.objects.link(low)
    low.parent = source.parent
    low.matrix_world = source.matrix_world.copy()
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = low
    low.select_set(True)
    if low.data.shape_keys:
        bpy.ops.object.shape_key_remove(all=True, apply_mix=False)
    for modifier in list(low.modifiers):
        low.modifiers.remove(modifier)
    decimate = low.modifiers.new("Decimate", "DECIMATE")
    decimate.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    low.vertex_groups.clear()
    for group in source.vertex_groups:
        low.vertex_groups.new(name=group.name)
    transfer = low.modifiers.new("Weights", "DATA_TRANSFER")
    transfer.object = source
    transfer.use_vert_data = True
    transfer.data_types_verts = {"VGROUP_WEIGHTS"}
    transfer.vert_mapping = "NEAREST"
    transfer.layers_vgroup_select_src = "ALL"
    transfer.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    if keys:
        for block in source.data.shape_keys.key_blocks:
            block.value = 0.0
        deform = low.modifiers.new("Follow", "SURFACE_DEFORM")
        deform.target = source
        bpy.ops.object.surfacedeform_bind(modifier=deform.name)
        low.shape_key_add(name="Basis", from_mix=False)
        for key in keys:
            source.data.shape_keys.key_blocks[key].value = 1.0
            bpy.context.view_layer.update()
            bpy.ops.object.modifier_apply_as_shapekey(keep_modifier=True, modifier=deform.name)
            low.data.shape_keys.key_blocks[-1].name = key
            source.data.shape_keys.key_blocks[key].value = 0.0
        low.modifiers.remove(deform)
    for modifier in source.modifiers:
        if modifier.type == "ARMATURE":
            armature = low.modifiers.new("Armature", "ARMATURE")
            armature.object = modifier.object
    name = source.name
    bpy.data.objects.remove(source, do_unlink=True)
    low.name = name
    return low


for key, ratio in recipe.get("decimate", {"teeth": 0.15}).items():
    for obj in list(rig.children):
        if obj.type == "MESH" and key in obj.name.lower():
            before = len(obj.data.polygons)
            low = decimate_keeping_shapes(obj, ratio)
            log("lighter", key, before, "->", len(low.data.polygons), "faces")

# Shape keys that move nothing on a mesh (e.g. visemes on the hair) only add weight: drop them.
for obj in rig.children:
    if obj.type != "MESH" or not obj.data.shape_keys:
        continue
    basis = obj.data.shape_keys.key_blocks[0].data
    for block in list(obj.data.shape_keys.key_blocks[1:]):
        if max(((a.co - b.co).length for a, b in zip(block.data, basis)), default=0) < 1e-5:
            obj.shape_key_remove(block)
    if len(obj.data.shape_keys.key_blocks) == 1:
        obj.shape_key_remove(obj.data.shape_keys.key_blocks[0])

# --- Textures within budget -----------------------------------------------------------------------
for image in list(bpy.data.images):
    if image.size[0] == 0:
        continue
    longest = max(image.size)
    if longest > MAX_TEXTURE:
        factor = MAX_TEXTURE / longest
        image.scale(max(1, int(image.size[0] * factor)), max(1, int(image.size[1] * factor)))
        log("scaled", image.name, "from", longest)

# --- Colours: recolour a texture's coloured parts (keeps white and grey, e.g. a shirt under a jacket) --
import colorsys  # noqa: E402

import numpy as np  # noqa: E402


def recolour(image, hue, sat, value, min_sat=0.2):
    px = np.array(image.pixels[:], dtype=np.float32).reshape(-1, 4)
    rgb = px[:, :3]
    mx, mn = rgb.max(1), rgb.min(1)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    coloured = s > min_sat
    # Value relative to the brightest coloured pixel, so the cloth keeps its folds and shading.
    v = mx / max(float(np.percentile(mx[coloured], 95)) if coloured.any() else 1.0, 1e-6)
    r, g, b = colorsys.hsv_to_rgb(hue, sat, 1.0)
    target = np.array([r, g, b], dtype=np.float32)
    shade = np.clip(v * value, 0, 1)[:, None] * target[None, :]
    rgb[coloured] = shade[coloured]
    px[:, :3] = rgb
    image.pixels[:] = px.ravel()
    image.update()


def tint(image, factor):
    px = np.array(image.pixels[:], dtype=np.float32).reshape(-1, 4)
    px[:, :3] = np.clip(px[:, :3] * np.array(factor, dtype=np.float32)[None, :], 0, 1)
    image.pixels[:] = px.ravel()
    image.update()


def colour_maps(word):
    """Base-colour textures whose name has `word` (never normal, bump or specular maps)."""
    return [i for i in bpy.data.images if word in i.name.lower() and i.size[0] and not any(k in i.name.lower() for k in ("norm", "bump", "spec", "_ao"))]


# A skin texture painted from the person's photos (scripts/teacher/maker/bake_skin.py) replaces the base skin.
if recipe.get("skin_image"):
    painted = bpy.data.images.load(os.path.join(os.path.dirname(os.path.abspath(recipe_path)), recipe["skin_image"]))
    for image in colour_maps(recipe.get("skin_match", "skinned")):
        painted.scale(image.size[0], image.size[1])
        image.pixels[:] = painted.pixels[:]
        image.update()
        image.pack()
        log("painted skin", image.name)

for word, args in recipe.get("recolour", {}).items():
    for image in colour_maps(word):
        recolour(image, *args)
        image.pack()
        log("recoloured", image.name)
for word, factor in recipe.get("tint", {}).items():
    for image in colour_maps(word):
        tint(image, factor)
        image.pack()
        log("tinted", image.name)

# --- Budget -----------------------------------------------------------------------------------------
meshes = [obj for obj in rig.children if obj.type == "MESH"]
tris = sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in meshes)
materials = {slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}
for obj in meshes:
    keys = len(obj.data.shape_keys.key_blocks) - 1 if obj.data.shape_keys else 0
    log("mesh", obj.name, sum(len(p.vertices) - 2 for p in obj.data.polygons), "tris,", keys, "shapes")
log("budget", tris, "triangles,", len(materials), "materials")
if not (BUDGET_TRIS[0] <= tris <= BUDGET_TRIS[1]) or len(materials) > BUDGET_MATERIALS:
    raise SystemExit(f"Over budget: {tris} triangles (want {BUDGET_TRIS}), {len(materials)} materials (want <= {BUDGET_MATERIALS})")

# --- VRM 1.0 --------------------------------------------------------------------------------------
ext = rig.data.vrm_addon_extension
ext.spec_version = "1.0"
bpy.context.view_layer.objects.active = rig
bpy.ops.vrm.assign_vrm1_humanoid_human_bones_automatically(armature_object_name=rig.name)
ext.vrm1.humanoid.pose = "restPositionPose"

preset = ext.vrm1.expressions.preset
with_keys = [obj for obj in meshes if obj.data.shape_keys]
for expression, binds in EXPRESSIONS.items():
    group = getattr(preset, {"blinkLeft": "blink_left", "blinkRight": "blink_right"}.get(expression, expression))
    for obj in with_keys:
        for key, weight in binds:
            if key in obj.data.shape_keys.key_blocks:
                bind = group.morph_target_binds.add()
                bind.node.mesh_object_name = obj.name
                bind.index = key
                bind.weight = weight
for obj in with_keys:
    for block in obj.data.shape_keys.key_blocks:
        block.value = 0.0

meta = ext.vrm1.meta
meta.vrm_name = recipe.get("name", "NexoraGuru teacher")
meta.version = "1"
if not len(meta.authors):
    meta.authors.add()
meta.authors[0].value = "NexoraGuru"
meta.copyright_information = "Made from CC0 MakeHuman assets (MPFB 2) and CC0 face units and visemes by Mika Suominen"
for field, value in {
    "avatar_permission": "everyone",
    "commercial_usage": "corporation",
    "credit_notation": "unnecessary",
    "modification": "allowModificationRedistribution",
}.items():
    setattr(meta, field, value)
meta.allow_redistribution = True

result = bpy.ops.export_scene.vrm(filepath=out_path, armature_object_name=rig.name, export_try_sparse_sk=True)
log("export", result, out_path, os.path.getsize(out_path) // 1024, "KB")

# --- Materials: what is see-through ---------------------------------------------------------------
# The exporter marks every material BLEND, which draws skin and clothes in the wrong order. Only
# hair cards, brows and lashes have holes (cut out with a mask); everything else is solid.
import struct  # noqa: E402

CUTOUT = tuple(recipe.get("cutout", ["hair", "braid", "long", "ponytail", "bob", "eyebrow", "eyelash"]))


def fix_materials(path):
    with open(path, "rb") as handle:
        data = handle.read()
    json_len = struct.unpack("<I", data[12:16])[0]
    doc = json.loads(data[20:20 + json_len])
    rest = data[20 + json_len:]
    for material in doc.get("materials", []):
        name = material["name"].lower()
        if any(word in name for word in CUTOUT):
            material["alphaMode"] = "MASK"
            material["alphaCutoff"] = 0.5
            material["doubleSided"] = True
        else:
            material.pop("alphaCutoff", None)
            material["alphaMode"] = "OPAQUE"
            material["doubleSided"] = False
        log("material", material["name"], material["alphaMode"])
    text = json.dumps(doc, separators=(",", ":")).encode()
    text += b" " * ((4 - len(text) % 4) % 4)
    body = struct.pack("<I", len(text)) + b"JSON" + text + rest
    with open(path, "wb") as handle:
        handle.write(data[:8] + struct.pack("<I", 12 + len(body)) + body)


fix_materials(out_path)
