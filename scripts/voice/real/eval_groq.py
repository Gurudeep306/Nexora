# Usage: GROQ_API_KEY=... python3 scripts/voice/real/eval_groq.py <lahaja test parquet> whisper-large-v3 120
# Data: ai4bharat/Lahaja on Hugging Face (MIT; accept its terms once). Never committed: voices stay out of the repo.
# Real Indian voices vs Groq's Whisper (the site's ears): WER and CER by mother tongue and gender.
import io, json, random, re, sys, time, unicodedata, collections
import pyarrow.parquet as pq, requests
PARQ, MODEL, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
t = pq.read_table(PARQ).to_pylist()
random.seed(7)
by = collections.defaultdict(list)
for r in t:
    if float(r["duration"]) <= 20: by[(r["native_language"], r["gender"])].append(r)
pick = []
groups = list(by.values())
while len(pick) < N and any(groups):
    for g in groups:
        if g and len(pick) < N: pick.append(g.pop(random.randrange(len(g))))
def norm(s):
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\[[^\]]*\]", " ", s)
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()
def ed(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)]
rows = []
for k, r in enumerate(pick):
    for attempt in range(4):
        res = requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers={"Authorization": f"Bearer {__import__('os').environ.get('GROQ_API_KEY', 'dummy')}"},
            files={"file": ("a.wav", io.BytesIO(r["audio_filepath"]["bytes"]), "audio/wav")}, data={"model": MODEL, "language": "hi", "temperature": "0"}, timeout=60,
            )
        if res.status_code == 429: time.sleep(10 * (attempt + 1)); continue
        break
    hyp = res.json().get("text", "") if res.ok else ""
    ref, h = norm(r["text"]), norm(hyp)
    rows.append({"lang": r["native_language"], "gender": r["gender"], "state": r["native_state"], "wer": ed(ref.split(), h.split()) / max(1, len(ref.split())), "cer": ed(ref, h) / max(1, len(ref)), "ok": res.ok, "ref": r["text"], "hyp": hyp})
    print(k, r["native_language"], r["gender"], round(rows[-1]["wer"], 2), flush=True) if k % 10 == 0 else None
json.dump(rows, open(f"{PARQ}.{MODEL}.json", "w"), ensure_ascii=False)
w = lambda xs: sum(x["wer"] for x in xs) / max(1, len(xs))
c = lambda xs: sum(x["cer"] for x in xs) / max(1, len(xs))
print(f"\n{MODEL}: {len(rows)} clips, failed {sum(not x['ok'] for x in rows)}, WER {w(rows):.3f}, CER {c(rows):.3f}")
g = collections.defaultdict(list)
for x in rows: g[x["lang"]].append(x)
for k, xs in sorted(g.items(), key=lambda kv: -w(kv[1])): print(f"  {k:12s} n={len(xs):3d} WER {w(xs):.3f} CER {c(xs):.3f}")
for gen in ("Male", "Female"):
    xs = [x for x in rows if x["gender"] == gen]; print(f"  {gen:12s} n={len(xs):3d} WER {w(xs):.3f}")
