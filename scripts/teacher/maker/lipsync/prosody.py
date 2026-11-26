"""Prosody track for a voice clip: loudness, pitch and stressed-syllable peaks, 100 per second.

  python3 scripts/teacher/maker/lipsync/prosody.py <voice.wav> <out.json>

The player uses it for the parts of talking that are not the lips: brows lift a little on pitch
peaks, the head nods on stressed syllables, blinks land at phrase ends, a breath in each pause.
Pitch is found with pYIN (librosa, ISC licence); loudness is RMS.
"""
import json
import sys

import librosa
import numpy as np

wav, out = sys.argv[1:3]
y, sr = librosa.load(wav, sr=16000)
hop = 160  # 10 ms
rms = librosa.feature.rms(y=y, frame_length=640, hop_length=hop)[0]
rms = rms / (np.percentile(rms, 95) + 1e-6)
f0, voiced, _ = librosa.pyin(y, fmin=70, fmax=450, sr=sr, frame_length=1024, hop_length=hop)
f0 = np.where(voiced, f0, np.nan)
med = np.nanmedian(f0) if np.isfinite(f0).any() else 200.0
semis = np.where(np.isfinite(f0), 12 * np.log2(f0 / med), 0.0)  # pitch in semitones around the speaker's median
n = min(len(rms), len(semis))
rms, semis = rms[:n], semis[:n]
# Stressed syllables: loudness peaks at least 180 ms apart, clearly above the local level.
sm = np.convolve(rms, np.ones(5) / 5, "same")
peaks = [i for i in range(2, n - 2) if sm[i] == sm[max(0, i - 9):i + 10].max() and sm[i] > 0.55]
stress = []
for i in peaks:
    if not stress or i - stress[-1] >= 18:
        stress.append(i)
# Pauses: at least 180 ms of near-silence.
quiet = sm < 0.08
pauses, i = [], 0
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]:
            j += 1
        if j - i >= 18:
            pauses.append([i / 100, j / 100])
        i = j
    else:
        i += 1
json.dump({"rate": 100, "loud": np.round(rms, 3).tolist(), "pitch": np.round(semis, 2).tolist(),
           "stress": [round(i / 100, 2) for i in stress], "pauses": pauses}, open(out, "w"))
print("PROSODY", round(n / 100, 2), "s;", len(stress), "stresses;", len(pauses), "pauses")
