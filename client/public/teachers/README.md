# Virtual teachers (3D people)

The seven teachers are converted from the **Microsoft Rocketbox Avatar Library**
(https://github.com/microsoft/Microsoft-Rocketbox), released by Microsoft under
the MIT licence (see `LICENSE-rocketbox.md`, which must ship with them). They
were chosen, and some toned (warmer skin, brown eyes), to look Indian:

| File | Rocketbox avatar | Toning (`scripts/teacher/tint-skin.py`) |
|---|---|---|
| `priya.glb` | Adults/Female_Adult_11 | `--depth 0.8 --warm 1.3 --eyes` |
| `kavya.glb` | Adults/Female_Adult_08 | `--depth 0.78 --warm 1.3 --eyes` |
| `neha.glb` | Adults/Female_Adult_05 | `--depth 0.78 --warm 1.3 --eyes` |
| `ananya.glb` | Professions/Business_Female_01 | `--depth 1 --warm 1 --eyes` |
| `arjun.glb` | Professions/Business_Male_05 | `--depth 1 --warm 1 --eyes` |
| `rohan.glb` | Adults/Male_Adult_17 | `--depth 1 --warm 1 --eyes` |
| `dev.glb` | Professions/Medical_Male_01 | `--depth 0.8 --warm 1.25 --eyes` |

How they were made:

1. `python3 scripts/teacher/tint-skin.py <avatar>/Textures <toned dir> …` (as above).
2. `python scripts/teacher/convert-rocketbox.py -- <avatar>/Export/<name>_facial.fbx <toned dir> <reference.glb> <name>.glb`
   (Blender as a Python module): posed and re-rigged with Mixamo bone names for
   TalkingHead (MIT), face shapes renamed to ARKit and Oculus visemes,
   textures resized.

The `.jpg` portraits are renders of the same teachers in the site's lighting.
