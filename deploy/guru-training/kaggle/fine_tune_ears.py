# The teacher's ears, trained on real Indian voices (docs/voice/REAL_VOICES.md), on Kaggle's free GPUs.
#
# Inputs (private Kaggle datasets made from the repo):
#   nexora-ears-hindi   parquet shards of ai4bharat/IndicVoices and ai4bharat/Kathbath (CC-BY-4.0), Hindi
#   nexora-ears-test    ai4bharat/Lahaja (MIT): accents never trained on, the test
# Base: openai/whisper-large-v3-turbo (MIT), LoRA, fp16 on a T4.
# Output (/kaggle/working): ears-turbo-hi/ (merged model), ears_report.json (WER/CER before and after on
# the same 120 Lahaja clips the site's current ears were measured on, by mother tongue).
import glob, io, json, os, random, re, subprocess, sys, unicodedata, collections

def publish(folder, name):
    """Upload results to the owner's Hugging Face (private) when the HF_TOKEN Kaggle secret is attached: lets an
    interactive run (no queue) hand its results back, since only saved batch runs are reachable through the Kaggle API."""
    try:
        token = os.environ.get("HF_TOKEN")  # Colab: set from its Secrets panel
        if not token:
            from kaggle_secrets import UserSecretsClient
            token = UserSecretsClient().get_secret("HF_TOKEN")
    except Exception as e:
        print("No HF_TOKEN secret attached: results stay in the output folder only.", e, flush=True)
        return
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "huggingface_hub"], check=True)
    from huggingface_hub import HfApi
    api = HfApi(token=token)
    repo = f"{api.whoami()['name']}/{name}"
    api.create_repo(repo, private=True, exist_ok=True)
    api.upload_folder(folder_path=folder, repo_id=repo, commit_message="From the Kaggle run")
    print("Uploaded to https://huggingface.co/" + repo, flush=True)

try:
    print(subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout, flush=True)
except FileNotFoundError:
    sys.exit("No GPU: in the notebook editor choose Accelerator → GPU T4 x2 (or GPU P100), then Run All.")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "transformers>=4.57", "peft>=0.17", "accelerate", "soundfile", "librosa", "pyarrow"], check=True)
# Colab ships an old torchao that the new peft refuses to load: LoRA here doesn't need it.
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "-q", "torchao"], check=False)
import numpy as np, pyarrow.parquet as pq, soundfile as sf, librosa, torch
from peft import LoraConfig, get_peft_model
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
        feats = proc.feature_extractor([audio16k(r["audio_filepath"]["bytes"]) for r in chunk], sampling_rate=16000, return_tensors="pt").input_features.to(model.device, torch.float16)
        with torch.no_grad():
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

model = WhisperForConditionalGeneration.from_pretrained(BASE, torch_dtype=torch.float16, device_map={"": 0})
before = evaluate(model, BASE)

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
    return {"input_features": feats["input_features"].to(torch.float16), "labels": lab}

model.config.forced_decoder_ids = None
model = get_peft_model(model, LoraConfig(r=32, lora_alpha=64, lora_dropout=0.05, target_modules=["q_proj", "k_proj", "v_proj", "out_proj", "fc1", "fc2"]))
model.print_trainable_parameters()
for p in model.parameters():  # the small trained part in full precision (fp16 training needs it)
    if p.requires_grad: p.data = p.data.float()
args = Seq2SeqTrainingArguments(output_dir="out", per_device_train_batch_size=2, gradient_accumulation_steps=8, gradient_checkpointing=True, gradient_checkpointing_kwargs={"use_reentrant": False}, learning_rate=1e-4, warmup_steps=100,
    max_steps=min(4000, len(train) // 16 * 2), fp16=True, logging_steps=50, save_strategy="no", report_to=[], remove_unused_columns=False, label_names=["labels"])
Seq2SeqTrainer(model=model, args=args, train_dataset=DS(), data_collator=collate).train()

model = model.merge_and_unload()
after = evaluate(model, "nexora-ears-turbo-hi")
model.save_pretrained(f"{OUT}/ears-turbo-hi", safe_serialization=True)
proc.save_pretrained(f"{OUT}/ears-turbo-hi")
json.dump({"before": before, "after": after, "train_clips": len(train)}, open(f"{OUT}/ears_report.json", "w"), ensure_ascii=False, indent=1)
import shutil
shutil.copy(f"{OUT}/ears_report.json", f"{OUT}/ears-turbo-hi/ears_report.json")
publish(f"{OUT}/ears-turbo-hi", "nexora-ears-turbo-hi")
print("done", flush=True)
