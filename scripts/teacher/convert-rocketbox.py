"""
Turn a Microsoft Rocketbox avatar (MIT licence) into a web teacher for
TalkingHead (MIT): a GLB with a Mixamo-named skeleton laid out like
TalkingHead's reference rig, ARKit and Oculus-viseme face shapes, and textures
sized for phones. docs/voice/VIRTUAL_TEACHER.md §3.

Run with Blender as a Python module (pip install bpy==5.1.2):

    python scripts/teacher/convert-rocketbox.py -- \
        <avatar>_facial.fbx <avatar>/Textures <reference.glb> <out.glb> [--tex 1024]

<reference.glb> is only read for its skeleton layout (bone directions and
orientations in its rest pose); nothing of it is copied into the output.

What it does:
1. Imports the Rocketbox avatar (3ds Max Biped skeleton, T-pose, 176 face
   shapes: 15 visemes AA_VI_*, 52 ARKit AK_*, 42 Vive SR_*, …).
2. Poses it like the reference (A-pose): every limb bone is turned so the
   limb points the same way as the reference's.
3. Bakes that pose into the mesh, face shape by face shape, as the new rest
   pose.
4. Builds a new skeleton with Mixamo names (Hips, Spine, …, LeftHandIndex3,
   LeftEye) whose bones sit at the avatar's own joints but are oriented like
   the reference's, so TalkingHead's poses and gestures move it correctly;
   the facial bones (jaw, lips, brows) are kept and follow the head.
5. Keeps only the face shapes TalkingHead uses, renamed: viseme_sil …
   viseme_U and the 52 ARKit names (browDownLeft …), plus mouthOpen and
   mouthSmile made from them.
6. Materials: base colour, normal map, roughness; eyelashes and hair cards
   use the opacity texture. Textures are resized (default 1024 px; the head
   keeps 2048 px colour) and saved as JPEG/PNG inside the GLB.
"""
import bpy, sys, os, math
import mathutils
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
FBX, TEXDIR, REF, OUT = argv[:4]
TEX = int(argv[argv.index("--tex") + 1]) if "--tex" in argv else 1024

# Biped → Mixamo.
MAP = {
    "Bip01 Pelvis": "Hips", "Bip01 Spine": "Spine", "Bip01 Spine1": "Spine1", "Bip01 Spine2": "Spine2",
    "Bip01 Neck": "Neck", "Bip01 Head": "Head", "Bip01 LEye": "LeftEye", "Bip01 REye": "RightEye",
}
for side, S in (("L", "Left"), ("R", "Right")):
    MAP.update({
        f"Bip01 {side} Clavicle": f"{S}Shoulder", f"Bip01 {side} UpperArm": f"{S}Arm", f"Bip01 {side} Forearm": f"{S}ForeArm",
        f"Bip01 {side} Hand": f"{S}Hand", f"Bip01 {side} Thigh": f"{S}UpLeg", f"Bip01 {side} Calf": f"{S}Leg",
        f"Bip01 {side} Foot": f"{S}Foot", f"Bip01 {side} Toe0": f"{S}ToeBase",
    })
    for i, f in enumerate(["Thumb", "Index", "Middle", "Ring", "Pinky"]):
        MAP[f"Bip01 {side} Finger{i}"] = f"{S}Hand{f}1"
        MAP[f"Bip01 {side} Finger{i}1"] = f"{S}Hand{f}2"
        MAP[f"Bip01 {side} Finger{i}2"] = f"{S}Hand{f}3"

# Mixamo parent of each mapped bone (the new hierarchy).
PARENT = {"Hips": None, "Spine": "Hips", "Spine1": "Spine", "Spine2": "Spine1", "Neck": "Spine2", "Head": "Neck", "LeftEye": "Head", "RightEye": "Head"}
for S in ("Left", "Right"):
    PARENT.update({f"{S}Shoulder": "Spine2", f"{S}Arm": f"{S}Shoulder", f"{S}ForeArm": f"{S}Arm", f"{S}Hand": f"{S}ForeArm",
                   f"{S}UpLeg": "Hips", f"{S}Leg": f"{S}UpLeg", f"{S}Foot": f"{S}Leg", f"{S}ToeBase": f"{S}Foot"})
    for f in ["Thumb", "Index", "Middle", "Ring", "Pinky"]:
        PARENT[f"{S}Hand{f}1"] = f"{S}Hand"
        PARENT[f"{S}Hand{f}2"] = f"{S}Hand{f}1"
        PARENT[f"{S}Hand{f}3"] = f"{S}Hand{f}2"

# The joint each bone points at (to aim limbs like the reference).
CHILD = {"Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head"}
for S in ("Left", "Right"):
    CHILD.update({f"{S}Shoulder": f"{S}Arm", f"{S}Arm": f"{S}ForeArm", f"{S}ForeArm": f"{S}Hand", f"{S}Hand": f"{S}HandMiddle1",
                  f"{S}UpLeg": f"{S}Leg", f"{S}Leg": f"{S}Foot", f"{S}Foot": f"{S}ToeBase"})
    for f in ["Thumb", "Index", "Middle", "Ring", "Pinky"]:
        CHILD[f"{S}Hand{f}1"] = f"{S}Hand{f}2"
        CHILD[f"{S}Hand{f}2"] = f"{S}Hand{f}3"
# Bones turned to match the reference pose (limbs; the spine and head stay as modelled).
AIM = [b for b in CHILD if not b.startswith(("Spine", "Neck"))]

ARKIT = ["browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "cheekPuff", "cheekSquintLeft",
         "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight",
         "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight", "eyeWideLeft",
         "eyeWideRight", "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose", "mouthDimpleLeft", "mouthDimpleRight",
         "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight",
         "mouthPressLeft", "mouthPressRight", "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower",
         "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight", "mouthUpperUpLeft",
         "mouthUpperUpRight", "noseSneerLeft", "noseSneerRight", "tongueOut"]
VISEMES = {"Sil": "sil", "PP": "PP", "FF": "FF", "TH": "TH", "DD": "DD", "KK": "kk", "CH": "CH", "SS": "SS", "nn": "nn", "RR": "RR",
           "aa": "aa", "E": "E", "I": "I", "O": "O", "U": "U"}


def shape_name(k):
    """Rocketbox face shape name → TalkingHead's, or None to drop it."""
    if k.startswith("AA_VI_"):
        tag = k.split("_", 3)[3]
        return "viseme_" + VISEMES[tag] if tag in VISEMES else None
    if k.startswith("AK_"):
        n = k.split("_", 2)[2]
        n = n[0].lower() + n[1:]
        lower = {a.lower(): a for a in ARKIT}
        return lower.get(n.lower())
    return None


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def world_heads(arm):
    return {b.name: arm.matrix_world @ b.head for b in arm.pose.bones}


# ── 1. the reference skeleton (read only) ──
bpy.ops.import_scene.gltf(filepath=REF)
ref = next(o for o in scene.objects if o.type == "ARMATURE")
ref_heads = {b.name: ref.matrix_world @ b.head_local for b in ref.data.bones}
ref_rot = {b.name: (ref.matrix_world.to_3x3() @ b.matrix_local.to_3x3()).normalized() for b in ref.data.bones}
ref_objs = [o for o in scene.objects]

# ── 2. the Rocketbox avatar ──
before = set(scene.objects)
bpy.ops.import_scene.fbx(filepath=FBX)
new = [o for o in scene.objects if o not in before]
src = next(o for o in new if o.type == "ARMATURE")
mesh = next(o for o in new if o.type == "MESH")
for o in ref_objs:
    bpy.data.objects.remove(o, do_unlink=True)
bymix = {v: k for k, v in MAP.items()}

# Pose the limbs like the reference (parents first, so children follow).
bpy.context.view_layer.objects.active = src
bpy.ops.object.mode_set(mode="POSE")
order = [b for b in ["LeftShoulder", "RightShoulder", "LeftArm", "RightArm", "LeftForeArm", "RightForeArm", "LeftHand", "RightHand",
                     "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "LeftFoot", "RightFoot"]]
order += [b for b in AIM if b not in order]
for mix in order:
    child = CHILD[mix]
    if mix not in bymix or child not in bymix or mix not in ref_heads or child not in ref_heads:
        continue
    bpy.context.view_layer.update()
    heads = world_heads(src)
    pb = src.pose.bones[bymix[mix]]
    v = heads[bymix[child]] - heads[bymix[mix]]
    t = ref_heads[child] - ref_heads[mix]
    if v.length < 1e-6 or t.length < 1e-6:
        continue
    q = v.normalized().rotation_difference(t.normalized())
    h = heads[bymix[mix]]
    W = src.matrix_world @ pb.matrix
    W2 = Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h) @ W
    pb.matrix = src.matrix_world.inverted() @ W2
bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode="OBJECT")

# ── 3. bake the pose into the mesh, shape by shape ──
keys = mesh.data.shape_keys.key_blocks if mesh.data.shape_keys else []
keep = [(k.name, shape_name(k.name)) for k in keys if k.name != "Basis" and shape_name(k.name)]
dg = bpy.context.evaluated_depsgraph_get()


def evaluated_coords():
    dg.update()
    ev = mesh.evaluated_get(dg)
    m = ev.to_mesh()
    co = [mesh.matrix_world @ v.co for v in m.vertices]
    ev.to_mesh_clear()
    return co


for k in keys:
    k.value = 0.0
base = evaluated_coords()
baked = {}
for old, newname in keep:
    keys[old].value = 1.0
    baked[newname] = evaluated_coords()
    keys[old].value = 0.0

# A clean copy of the mesh with the baked rest shape and the kept face shapes.
me = mesh.data.copy()
out = bpy.data.objects.new("Teacher", me)
scene.collection.objects.link(out)
out.matrix_world = Matrix.Identity(4)
bpy.context.view_layer.objects.active = out
for o in [mesh]:
    pass
# Remove every shape key, then set the baked basis.
out.shape_key_clear()
for i, v in enumerate(me.vertices):
    v.co = base[i]
out.shape_key_add(name="Basis")
for name, co in baked.items():
    sk = out.shape_key_add(name=name)
    for i, c in enumerate(co):
        sk.data[i].co = c
# mouthOpen and mouthSmile, which TalkingHead also reads.
if "jawOpen" in baked:
    sk = out.shape_key_add(name="mouthOpen")
    for i, c in enumerate(baked["jawOpen"]):
        sk.data[i].co = c
if "mouthSmileLeft" in baked and "mouthSmileRight" in baked:
    sk = out.shape_key_add(name="mouthSmile")
    for i in range(len(base)):
        sk.data[i].co = baked["mouthSmileLeft"][i] + baked["mouthSmileRight"][i] - base[i]

# ── 4. the new skeleton ──
heads = world_heads(src)
posed = {b.name: (src.matrix_world @ b.matrix) for b in src.pose.bones}
arm_data = bpy.data.armatures.new("Armature")
arm = bpy.data.objects.new("Armature", arm_data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for mix, parent in PARENT.items():
    if mix not in bymix:
        continue
    b = arm_data.edit_bones.new(mix)
    h = heads[bymix[mix]]
    R = ref_rot.get(mix)
    if R is None:
        R = posed[bymix[mix]].to_3x3().normalized()
    length = (ref_heads[CHILD[mix]] - ref_heads[mix]).length if mix in CHILD and CHILD[mix] in ref_heads and mix in ref_heads else 0.05
    b.head = h
    b.tail = h + R.col[1].normalized() * max(0.01, length)
    # Roll so the bone's X axis matches the reference's.
    b.align_roll(R.col[2])
    eb[mix] = b
for mix, parent in PARENT.items():
    if mix in eb and parent in eb:
        eb[mix].parent = eb[parent]
# Facial and other extra bones: kept with their names, following their Biped parent.
for b in src.pose.bones:
    if b.name in MAP or b.name in ("Bip01",) or not b.name.startswith("Bip01"):
        continue
    nb = arm_data.edit_bones.new(b.name)
    M = posed[b.name]
    nb.head = M.translation
    nb.tail = M.translation + M.to_3x3().col[1].normalized() * 0.01
    nb.align_roll(M.to_3x3().col[2])
    par = b.parent
    while par is not None and par.name not in MAP and par.name not in arm_data.edit_bones:
        par = par.parent
    if par is not None:
        nb.parent = arm_data.edit_bones.get(MAP.get(par.name, par.name))
bpy.ops.object.mode_set(mode="OBJECT")

# Rebind: vertex groups renamed to the new bone names; same weights.
for vg in out.vertex_groups:
    if vg.name in MAP:
        vg.name = MAP[vg.name]
for mod in list(out.modifiers):
    out.modifiers.remove(mod)
out.parent = arm
mod = out.modifiers.new("Armature", "ARMATURE")
mod.object = arm

# Remove the source objects.
for o in new:
    bpy.data.objects.remove(o, do_unlink=True)

# ── 5. materials ──
def load(path, color=True):
    img = bpy.data.images.load(path)
    if not color:
        img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    side = 2048 if (color and "head_color" in path) else TEX
    if max(w, h) > side:
        img.scale(side, side)
    return img


def tex_for(mat_name, suffix):
    key = mat_name.split("_")[-1]
    for f in sorted(os.listdir(TEXDIR)):
        if f.endswith(suffix + ".tga") and key in f:
            return os.path.join(TEXDIR, f)
    return None


for slot in out.material_slots:
    m = slot.material
    if m is None:
        continue
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    outn = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], outn.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.5 if "head" in m.name else 0.65
    col = tex_for(m.name, "_color")
    if col:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = load(col)
        nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
        if "opacity" in m.name:
            nt.links.new(t.outputs["Alpha"], bsdf.inputs["Alpha"])
            if hasattr(m, "blend_method"):
                m.blend_method = "CLIP"
    nrm = tex_for(m.name, "_normal")
    if nrm and "opacity" not in m.name:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = load(nrm, color=False)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])

# ── 6. export ──
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
out.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB", use_selection=True, export_morph=True, export_morph_normal=False,
    export_skins=True, export_animations=False, export_image_format="JPEG", export_jpeg_quality=86,
    export_yup=True, export_apply=False,
)
print("WROTE", OUT, "shapes", len(baked) + 2, "bones", len(arm_data.bones))
