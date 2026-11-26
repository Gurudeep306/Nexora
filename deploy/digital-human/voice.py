"""The person's own voice saying a line, cloned from 10–15 s of their speech (Chatterbox Multilingual, MIT).
Every output carries Resemble AI's Perth watermark.

  python3 voice.py "<text>" <language: en|hi> <reference.wav> <out.wav>
"""
import sys

import torch
import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

text, lang, ref, out = sys.argv[1:5]
device = "cuda" if torch.cuda.is_available() else "cpu"
model = ChatterboxMultilingualTTS.from_pretrained(device=device)
wav = model.generate(text, language_id=lang, audio_prompt_path=ref)
ta.save(out, wav, model.sr)
print("VOICE", out, round(wav.shape[-1] / model.sr, 2), "s")
