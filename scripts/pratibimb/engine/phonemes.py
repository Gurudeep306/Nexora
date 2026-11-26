"""Sounds → mouth: the language-independent layer between the voice and the motion maker.

Every language is turned into IPA phonemes (the international phonetic alphabet) by that language's
converter; the mouth depends only on the sound, so one table covers every language. Adding a language =
adding its converter (and later a few hours of speech to perfect its details); nothing else changes.

  phoneme timeline [(ipa, start_s, end_s), ...]  →  viseme timeline  →  52 ARKit values per frame

The viseme targets are a hand-made prior from articulation (lip closure, rounding, jaw opening, teeth on lip),
used before the trained motion maker exists and as its training prior and lip test afterwards. The person's
own rig then turns those values into *their* mouth.
"""
import numpy as np

# Viseme classes by articulation (shared by every language).
VISEME_OF = {}
for ipas, vis in [
    ("p b m ɓ pʰ bʱ", "PBM"),            # lips fully closed (प फ ब भ म: closure is required)
    ("f v ʋ ɱ", "FV"),                    # lower lip on upper teeth
    ("θ ð", "TH"),                        # tongue between teeth
    ("t d n l ɾ r ɹ tʰ dʱ s z", "TD"),    # tongue tip behind teeth, jaw slightly open
    ("ʈ ɖ ɳ ɭ ɽ ʈʰ ɖʱ", "RETRO"),         # retroflex: as TD with a lower jaw
    ("ʃ ʒ tʃ dʒ tʃʰ dʒʱ ɕ ʑ", "SH"),      # lips pushed forward
    ("k g ŋ x ɣ kʰ gʱ q h ɦ ʔ", "KG"),     # back of the tongue: mouth open, lips relaxed
    ("j", "EE"),
    ("w", "OO"),
    ("i iː ɪ e eː ɛ", "EE"),               # spread lips
    ("a aː ɑ ɑː æ ʌ ə ɐ ɜ ɜː ɚ ɘ ɤ ɯ", "AA"),           # wide open jaw
    ("o oː ɔ ɔː ɒ ø œ", "OH"),                   # rounded, open
    ("u uː ʊ y ʏ ɨ ʉ", "OO"),                      # rounded, nearly closed
]:
    for p in ipas.split():
        VISEME_OF[p] = vis

# Targets on the 52 ARKit values (only the mouth and jaw; the rest come from emotion and the motion maker).
TARGETS = {
    "SIL": {},
    "PBM": {"mouthClose": 0.55, "mouthPressLeft": 0.5, "mouthPressRight": 0.5, "jawOpen": 0.0},
    "FV": {"mouthRollLower": 0.6, "mouthUpperUpLeft": 0.15, "mouthUpperUpRight": 0.15, "jawOpen": 0.08},
    "TH": {"jawOpen": 0.15, "tongueOut": 0.35},
    "TD": {"jawOpen": 0.18, "mouthStretchLeft": 0.1, "mouthStretchRight": 0.1},
    "RETRO": {"jawOpen": 0.26, "mouthStretchLeft": 0.08, "mouthStretchRight": 0.08},
    "SH": {"mouthFunnel": 0.45, "mouthPucker": 0.3, "jawOpen": 0.12},
    "KG": {"jawOpen": 0.25},
    "EE": {"mouthStretchLeft": 0.35, "mouthStretchRight": 0.35, "mouthSmileLeft": 0.15, "mouthSmileRight": 0.15, "jawOpen": 0.12},
    "AA": {"jawOpen": 0.6, "mouthLowerDownLeft": 0.3, "mouthLowerDownRight": 0.3},
    "OH": {"jawOpen": 0.38, "mouthFunnel": 0.5, "mouthPucker": 0.25},
    "OO": {"mouthPucker": 0.75, "mouthFunnel": 0.35, "jawOpen": 0.1},
}
MUST_CLOSE = {"PBM"}  # these never blend away: the lips meet fully at the middle of the sound


def viseme(ipa):
    """The mouth class of one IPA phoneme (diacritics such as length marks fall back to the base sound)."""
    if ipa in VISEME_OF:
        return VISEME_OF[ipa]
    base = ipa.rstrip("ːˑʰʱ̃")
    return VISEME_OF.get(base, VISEME_OF.get(base[:1], "SIL"))


def mouth_track(phones, names, fps=25, lead=0.04, attack=0.06):
    """Per-frame 52-value mouth track from [(ipa, start_s, end_s), ...]. Sounds blend with soft edges; lip
    closures (p, b, m) are forced to full closure at their middle; the mouth moves `lead` s before the sound,
    as real speakers do."""
    end = max((e for _, _, e in phones), default=0)
    n = int(np.ceil((end + 0.3) * fps))
    idx = {k: i for i, k in enumerate(names)}
    out = np.zeros((n, len(names)))
    weight = np.zeros(n)
    for ipa, s, e in phones:
        v = viseme(ipa)
        tgt = TARGETS[v]
        s, e = s - lead, e - lead
        for f in range(max(0, int((s - attack) * fps)), min(n, int((e + attack) * fps) + 1)):
            t = f / fps
            w = min(1.0, max(0.0, (t - (s - attack)) / attack), max(0.0, ((e + attack) - t) / attack))
            if w <= 0:
                continue
            for k, x in tgt.items():
                if k in idx:
                    out[f, idx[k]] += w * x
            weight[f] += w
    out = out / np.maximum(weight, 1.0)[:, None]
    for ipa, s, e in phones:  # closures win
        if viseme(ipa) in MUST_CLOSE:
            f = int(((s + e) / 2 - lead) * fps)
            if 0 <= f < n:
                for k, x in TARGETS["PBM"].items():
                    if k in idx:
                        out[f, idx[k]] = x
                if "jawOpen" in idx:
                    out[f, idx["jawOpen"]] = 0.0
    return out


def lip_check(track, phones, names, fps=25, lead=0.04):
    """Our own lip test: every p/b/m must close (mouthClose high, jaw shut) and every f/v must put the lip on the
    teeth, at the middle of the sound. Returns (passed, failures)."""
    idx = {k: i for i, k in enumerate(names)}
    fails = []
    for ipa, s, e in phones:
        v = viseme(ipa)
        f = int(((s + e) / 2 - lead) * fps)
        if not 0 <= f < len(track):
            continue
        if v == "PBM" and (track[f, idx["mouthClose"]] < 0.4 or track[f, idx["jawOpen"]] > 0.1):
            fails.append((ipa, round(s, 2), "lips not closed"))
        if v == "FV" and track[f, idx["mouthRollLower"]] < 0.3:
            fails.append((ipa, round(s, 2), "lip not on teeth"))
    return not fails, fails
