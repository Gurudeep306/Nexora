# Licence checks for the new teacher, Phase 1 (2026-11-25)

Each source was read on 2026-11-25. Copies of the pages saved in this folder
are marked "copy". Nothing here was guessed: a source that could not be read
says so.

| Part | Source read | Licence | Use in Phase 1 |
|---|---|---|---|
| MakeHuman / MPFB2 base mesh, targets, skins, hair, eyebrows, clothes, rigs, expressions | `mpfb2-LICENSE.md` (copy) | Assets **CC0 1.0**; code GPLv3 (only run offline in Blender, never shipped). §D: "no claim whatsoever" over exports, "graphical data generated via scripting or plugins", renderings or saved models | **Yes** |
| MakeHuman FAQ on character generators | makehumancommunity.org did not answer from this machine | — | Not needed: §D of the MPFB licence already covers output made by scripts. Re-read the FAQ by hand before the Teacher Maker (Phase 2) ships |
| ffunch/vrm-avatar-maker code | `ffunch-LICENSE.txt` (copy) | **MIT** (2026 Flemming Funch) | **Yes**, as a reference and pipeline |
| ffunch/vrm-avatar-maker assets | `ffunch-ASSETS.md` (copy) | Every item listed **CC0**. Two items have an unknown author but are still marked CC0 ("Long, loose" hair, "Galactic uniform") | **Yes**. Avoid those two items anyway, to be safe |
| three.js | repository LICENSE (MIT, known) | MIT | Yes |
| `@pixiv/three-vrm` | `three-vrm-LICENSE.txt` (copy) | **MIT** (pixiv Inc.) | Yes |
| HeadTTS | `HeadTTS-LICENSE.txt` (copy) | **MIT** (Mika Suominen) | Yes (the voice server already runs it) |
| HeadAudio | read online | **MIT** | Yes (instant lip fallback) |
| TalkingHead (gesture templates to port) | read online | **MIT** | Yes |
| wav2arkit_cpu | Hugging Face README front matter | **Apache-2.0** (base model LAM_audio2exp) | Yes (voice server) |
| Quaternius Universal Animation Library | `quaternius-UAL.html` (copy) | **CC0**: "Free to use in personal, educational and commercial projects" | **Yes** |
| VRoid "VRM Animation 7-set" (BOOTH 5512385) | `booth-vroid-7set.html` (copy) | Commercial use allowed with a credit, **but it forbids redistributing the motions, or edited versions, "in a state where they can be extracted" without permission** | **No.** A website must send motion files to every visitor's browser, so they can be extracted. Do not use it without pixiv's written permission |
| Mixamo | — (research: raw files may not be distributed) | — | No |

Decision: Phase 1 uses MPFB2/MakeHuman CC0 assets, the ffunch pipeline (MIT)
as a reference, three-vrm, HeadTTS, HeadAudio, wav2arkit_cpu, TalkingHead's
gesture templates, and Quaternius CC0 clips. The VRoid 7-set is dropped.
