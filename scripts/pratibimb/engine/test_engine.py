"""Quick checks of the engine's language-independent parts: python3 -m engine.test_engine"""
import numpy as np

from .phonemes import TARGETS, lip_check, mouth_track, viseme

NAMES = sorted({k for t in TARGETS.values() for k in t} | {"mouthClose", "jawOpen", "mouthRollLower"})


def test_every_language_sound_has_a_mouth():
    # A sample of sounds from English, Hindi, Tamil, French, German, Mandarin and Spanish.
    for p in "p b m bʱ f v ʋ θ t d ʈ ɖ ɳ ʃ tʃ k g ɡ x j w i ɪ e ɛ a ə ɐ o ɔ ɒ u ʊ y ø œ ɯ ɨ ã ɲ ʂ ɻ c ɟ".split():
        assert viseme(p) != "SIL", p
    assert TARGETS[viseme("ə")]["jawOpen"] < TARGETS[viseme("aː")]["jawOpen"]  # schwa is not as wide as /a/


def test_lip_closures_and_teeth():
    ph = [("m", 0, .08), ("aː", .08, .3), ("b", .35, .45), ("ɛ", .45, .6), ("f", .8, .9), ("aɪ", .9, 1.05), ("v", 1.05, 1.12)]
    tr = mouth_track(ph, NAMES)
    ok, fails = lip_check(tr, ph, NAMES)
    assert ok, fails
    assert tr.shape[1] == len(NAMES) and np.isfinite(tr).all()


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
