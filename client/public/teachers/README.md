# Virtual teachers (3D avatars)

The four teachers are converted from the **Microsoft Rocketbox Avatar Library**
(https://github.com/microsoft/Microsoft-Rocketbox), released by Microsoft under
the MIT licence (see `LICENSE-rocketbox.md`, which must ship with them):

| File | Rocketbox avatar |
|---|---|
| `maya.glb` | Professions/Business_Female_01 |
| `elena.glb` | Professions/Business_Female_04 |
| `kai.glb` | Professions/Business_Male_02 |
| `victor.glb` | Professions/Business_Male_04 |

Converted by `scripts/teacher/convert-rocketbox.py` (Blender as a Python
module): posed and re-rigged with Mixamo bone names for TalkingHead (MIT),
face shapes renamed to ARKit and Oculus visemes, textures resized. The `.jpg`
portraits are renders of the same avatars.
