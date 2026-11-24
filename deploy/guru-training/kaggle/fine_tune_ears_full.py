# The teacher's ears, FULL fine-tune: every weight of the model is trained (docs/voice/REAL_VOICES.md).
#
# Voices: ai4bharat/IndicVoices and ai4bharat/Kathbath (CC-BY-4.0), Hindi; test: ai4bharat/Lahaja (MIT), accents
# never trained on (the same 120 clips the site's current ears were measured on).
# Base: openai/whisper-large-v3-turbo (MIT, 809M weights). Fits a free 15 GB T4: weights in fp32 with fp16 maths,
# an 8-bit optimiser, gradient checkpointing, 2 clips x 8 steps per update.
# Progress is saved to the owner's Hugging Face (nexora-ears-full-progress, private) every 80 steps (~30 min):
# run it again after any stop and it continues from the last save.
# Output: ears-turbo-hi-full/ (fp16, ~1.6 GB) with ears_report.json (WER/CER before and after, by mother tongue),
# uploaded to nexora-ears-turbo-hi-full (private).
import glob, io, json, os, random, re, subprocess, sys, unicodedata, collections

def hf_token():
    """The owner's Hugging Face token: the HF_TOKEN env (Colab sets it from its Secrets panel), else the Kaggle secret."""
    token = os.environ.get("HF_TOKEN")
    if token: return token
    try:
        from google.colab import userdata
        return userdata.get("HF_TOKEN")
    except Exception:
        pass
    try:
        from kaggle_secrets import UserSecretsClient
        return UserSecretsClient().get_secret("HF_TOKEN")
    except Exception:
        return None

def hf_api():
    token = hf_token()
    if not token: return None
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "huggingface_hub"], check=True)
    from huggingface_hub import HfApi
    return HfApi(token=token)

def publish(folder, name):
    """Upload results to the owner's Hugging Face (private)."""
    api = hf_api()
    if not api:
        print("No HF_TOKEN secret attached: results stay in the output folder only.", flush=True)
        return
    repo = f"{api.whoami()['name']}/{name}"
    api.create_repo(repo, private=True, exist_ok=True)
    api.upload_folder(folder_path=folder, repo_id=repo, commit_message="From the training run")
    print("Uploaded to https://huggingface.co/" + repo, flush=True)

try:
    print(subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout, flush=True)
except FileNotFoundError:
    sys.exit("No GPU: in the notebook editor choose Accelerator → GPU T4 x2 (or GPU P100), then Run All.")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "transformers>=4.57", "accelerate", "bitsandbytes", "soundfile", "librosa", "pyarrow"], check=True)
import numpy as np, pyarrow.parquet as pq, soundfile as sf, librosa, torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor, Seq2SeqTrainer, Seq2SeqTrainingArguments

BASE = "openai/whisper-large-v3-turbo"
# Where the voices are and where results go: Kaggle by default; Colab sets these (its /kaggle is read-only).
IN = os.environ.get("EARS_IN", "/kaggle/input")
OUT = os.environ.get("EARS_OUT", "/kaggle/working")
proc = WhisperProcessor.from_pretrained(BASE, language="hindi", task="transcribe")

def audio16k(blob):
    a, sr = sf.read(io.BytesIO(blob), dtype="float32", always_2d=False)
    if a.ndim > 1: a = a.mean(axis=1)
    return librosa.resample(a, orig_sr=sr, target_sr=16000) if sr != 16000 else a

def norm(s):
    s = unicodedata.normalize("NFC", s or "")
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

# ── the test: the same 120 Lahaja clips as docs/voice/REAL_VOICES.md (same seed and balance) ──
lah = pq.read_table(glob.glob(f"{IN}/**/lahaja0.parquet", recursive=True)[0]).to_pylist()
random.seed(7)
by = collections.defaultdict(list)
for r in lah:
    if float(r["duration"]) <= 20: by[(r["native_language"], r["gender"])].append(r)
test, groups = [], list(by.values())
while len(test) < 120 and any(groups):
    for g in groups:
        if g and len(test) < 120: test.append(g.pop(random.randrange(len(g))))

def evaluate(model, tag):
    model.eval()
    rows = []
    for k in range(0, len(test), 8):
        chunk = test[k : k + 8]
        feats = proc.feature_extractor([audio16k(r["audio_filepath"]["bytes"]) for r in chunk], sampling_rate=16000, return_tensors="pt").input_features.to(model.device, model.dtype)
        with torch.no_grad(), torch.autocast("cuda", dtype=torch.float16):
            ids = model.generate(input_features=feats, language="hindi", task="transcribe", max_new_tokens=200, max_length=None)
        for r, h in zip(chunk, proc.batch_decode(ids, skip_special_tokens=True)):
            ref, hyp = norm(r["text"]), norm(h)
            rows.append({"lang": r["native_language"], "gender": r["gender"], "wer": ed(ref.split(), hyp.split()) / max(1, len(ref.split())), "cer": ed(ref, hyp) / max(1, len(ref))})
    m = lambda xs, k: round(sum(x[k] for x in xs) / max(1, len(xs)), 4)
    langs = collections.defaultdict(list)
    for x in rows: langs[x["lang"]].append(x)
    out = {"model": tag, "n": len(rows), "wer": m(rows, "wer"), "cer": m(rows, "cer"), "by_mother_tongue": {k: {"n": len(v), "wer": m(v, "wer")} for k, v in sorted(langs.items())}}
    print(json.dumps(out, ensure_ascii=False), flush=True)
    return out

# ── progress is kept on the owner's Hugging Face (private), so a stopped session continues where it stopped ──
SAVES = "nexora-ears-full-progress"
CKPT = f"{OUT}/progress"
api = hf_api()
save_repo = None
resume = None
before = None
if api:
    save_repo = f"{api.whoami()['name']}/{SAVES}"
    api.create_repo(save_repo, private=True, exist_ok=True)
    from huggingface_hub import snapshot_download
    snapshot_download(save_repo, local_dir=CKPT, token=hf_token())
    found = sorted(glob.glob(f"{CKPT}/checkpoint-*"), key=lambda d: int(d.rsplit("-", 1)[1]))
    if found and os.path.exists(f"{found[-1]}/trainer_state.json"):
        resume = found[-1]
        print(f"Continuing from the last save: step {resume.rsplit('-', 1)[1]}", flush=True)
    if os.path.exists(f"{CKPT}/before.json"):
        before = json.load(open(f"{CKPT}/before.json"))
else:
    print("No HF_TOKEN: progress can't be saved, so a stopped session would start again.", flush=True)

# All weights in full precision (they are what is trained); the maths runs in fp16.
model = WhisperForConditionalGeneration.from_pretrained(BASE, torch_dtype=torch.float32, device_map={"": 0})
if before is None:
    before = evaluate(model, BASE)
    os.makedirs(CKPT, exist_ok=True)
    json.dump(before, open(f"{CKPT}/before.json", "w"), ensure_ascii=False)
    if api: api.upload_file(path_or_fileobj=f"{CKPT}/before.json", path_in_repo="before.json", repo_id=save_repo)

# ── training data: real voices, balanced by state and gender ──
rows = []
for f in sorted(glob.glob(f"{IN}/**/*.parquet", recursive=True)):
    if "lahaja" in f.lower(): continue
    t = pq.read_table(f, columns=[c for c in ["audio_filepath", "audio", "text", "duration", "state", "gender"] if c in pq.read_schema(f).names]).to_pylist()
    for r in t:
        a = r.get("audio_filepath") or r.get("audio")
        if a and r.get("text") and 1 <= float(r.get("duration") or 5) <= 25: rows.append({"bytes": a["bytes"], "text": r["text"], "key": (r.get("state"), r.get("gender"))})
random.seed(1)
cap = collections.Counter()
random.shuffle(rows)
train = []
for r in rows:  # no single state and gender above 12% of the data: every accent gets a fair share
    if cap[r["key"]] < max(400, int(0.12 * len(rows))):
        cap[r["key"]] += 1
        train.append(r)
print(f"{len(rows)} clips available, {len(train)} used", flush=True)

class DS(torch.utils.data.Dataset):
    def __len__(self): return len(train)
    def __getitem__(self, i):
        r = train[i]
        f = proc.feature_extractor(audio16k(r["bytes"]), sampling_rate=16000).input_features[0]
        return {"input_features": f, "labels": proc.tokenizer(r["text"]).input_ids}

def collate(batch):
    feats = proc.feature_extractor.pad([{"input_features": b["input_features"]} for b in batch], return_tensors="pt")
    labels = proc.tokenizer.pad([{"input_ids": b["labels"]} for b in batch], return_tensors="pt")
    lab = labels["input_ids"].masked_fill(labels.attention_mask.ne(1), -100)
    if (lab[:, 0] == model.config.decoder_start_token_id).all(): lab = lab[:, 1:]
    return {"input_features": feats["input_features"], "labels": lab}

model.config.forced_decoder_ids = None
model.config.use_cache = False
print(f"Training all {sum(p.numel() for p in model.parameters() if p.requires_grad):,} weights", flush=True)
from transformers import TrainerCallback

class SaveToHub(TrainerCallback):
    """After each save (every 80 steps, about 30 minutes on a T4), copy it to Hugging Face and drop older saves there."""
    def on_save(self, args, state, control, **kw):
        if not api: return
        d = f"{CKPT}/checkpoint-{state.global_step}"
        try:
            api.upload_folder(folder_path=d, path_in_repo=f"checkpoint-{state.global_step}", repo_id=save_repo, commit_message=f"step {state.global_step}")
            old = {f.split("/")[0] for f in api.list_repo_files(save_repo) if f.startswith("checkpoint-") and not f.startswith(f"checkpoint-{state.global_step}/")}
            for o in old: api.delete_folder(path_in_repo=o, repo_id=save_repo, commit_message="older save")
            print(f"Saved step {state.global_step} to Hugging Face: safe to stop now.", flush=True)
        except Exception as e:
            print("Couldn't save to Hugging Face this time (will try at the next save):", e, flush=True)

args = Seq2SeqTrainingArguments(output_dir=CKPT, per_device_train_batch_size=2, gradient_accumulation_steps=8, gradient_checkpointing=True, gradient_checkpointing_kwargs={"use_reentrant": False}, learning_rate=1e-5, warmup_steps=150,
    # One pass over every voice: with all weights moving, a gentle rate and one pass keep what it already knows.
    max_steps=len(train) // 16, lr_scheduler_type="linear", optim="adamw_bnb_8bit", weight_decay=0.01, max_grad_norm=1.0,
    fp16=True, logging_steps=20, save_strategy="steps", save_steps=80, save_total_limit=1, seed=1,
    report_to=[], remove_unused_columns=False, label_names=["labels"])
Seq2SeqTrainer(model=model, args=args, train_dataset=DS(), data_collator=collate, callbacks=[SaveToHub()]).train(resume_from_checkpoint=resume)

model = model.half()
model.config.use_cache = True
after = evaluate(model, "nexora-ears-turbo-hi-full")
model.save_pretrained(f"{OUT}/ears-turbo-hi-full", safe_serialization=True)
proc.save_pretrained(f"{OUT}/ears-turbo-hi-full")
json.dump({"before": before, "after": after, "train_clips": len(train), "full_fine_tune": True}, open(f"{OUT}/ears-turbo-hi-full/ears_report.json", "w"), ensure_ascii=False, indent=1)
publish(f"{OUT}/ears-turbo-hi-full", "nexora-ears-turbo-hi-full")
print("BEFORE WER:", before["wer"], " AFTER WER:", after["wer"], flush=True)
print("done", flush=True)
