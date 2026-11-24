# Guru training data on Kaggle's free GPUs (docs/voice/TRAINING.md), batch mode.
#
# Input: a private Kaggle dataset with jobs.jsonl, written by
#   node scripts/voice/make-guru-data.js --export-jobs jobs.jsonl ...
# (one line per conversation to ask for: { i, kind, lang, teacher, item, messages }).
# Output: /kaggle/working/answers.jsonl, one line { i, content } per job, written as it goes, so a run
# that hits Kaggle's time limit still keeps everything done so far.
# The answers are checked back in the repo with the same rules as the live mode:
#   node scripts/voice/make-guru-data.js --ingest answers.jsonl --jobs jobs.jsonl --out-dir data/guru
#
# The teacher is an open-licence model (Qwen3, Apache-2.0), on 2 x T4 with vLLM.
import glob, json, os, subprocess, sys, time

def publish(folder, name):
    """Upload results to the owner's Hugging Face (private) when the HF_TOKEN Kaggle secret is attached: lets an
    interactive run (no queue) hand its results back, since only saved batch runs are reachable through the Kaggle API."""
    try:
        from kaggle_secrets import UserSecretsClient
        token = UserSecretsClient().get_secret("HF_TOKEN")
    except Exception as e:
        print("No HF_TOKEN secret attached: results stay in /kaggle/working only.", e, flush=True)
        return
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "huggingface_hub"], check=True)
    from huggingface_hub import HfApi
    api = HfApi(token=token)
    repo = f"{api.whoami()['name']}/{name}"
    api.create_repo(repo, private=True, exist_ok=True)
    api.upload_folder(folder_path=folder, repo_id=repo, commit_message="From the Kaggle run")
    print("Uploaded to https://huggingface.co/" + repo, flush=True)

print(subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,compute_cap", "--format=csv"], capture_output=True, text=True).stdout, flush=True)
gpus = [l for l in subprocess.run(["nvidia-smi", "--query-gpu=compute_cap", "--format=csv,noheader"], capture_output=True, text=True).stdout.split() if l]
if not gpus or float(gpus[0]) < 7.0:
    sys.exit(f"Needs GPU T4 x2 (vLLM needs compute capability 7.0+); got {gpus}. Choose 'GPU T4 x2' for this notebook.")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "vllm==0.9.2"], check=True)
os.environ["VLLM_USE_V1"] = "0"  # T4s (compute 7.5): the V0 engine
from vllm import LLM, SamplingParams

TEACHER = "Qwen/Qwen3-14B-AWQ"
jobs_file = glob.glob("/kaggle/input/**/jobs.jsonl", recursive=True)[0]
jobs = [json.loads(l) for l in open(jobs_file) if l.strip()]
out_path = "/kaggle/working/answers.jsonl"
done = set()
if os.path.exists(out_path):
    done = {json.loads(l)["i"] for l in open(out_path) if l.strip()}
todo = [j for j in jobs if j["i"] not in done]
print(f"{len(jobs)} jobs, {len(todo)} to do", flush=True)

llm = LLM(TEACHER, tensor_parallel_size=len(gpus), dtype="half", max_model_len=6144, gpu_memory_utilization=0.92, enforce_eager=False)
params = SamplingParams(temperature=0.7, top_p=0.9, max_tokens=900)
t0 = time.time()
BATCH = 256
with open(out_path, "a") as out:
    for k in range(0, len(todo), BATCH):
        chunk = todo[k : k + BATCH]
        # Thinking off: the teacher writes the example directly, as JSON.
        res = llm.chat([j["messages"] for j in chunk], params, use_tqdm=False, chat_template_kwargs={"enable_thinking": False})
        for j, r in zip(chunk, res):
            out.write(json.dumps({"i": j["i"], "content": r.outputs[0].text}, ensure_ascii=False) + "\n")
        out.flush()
        print(f"{k + len(chunk)}/{len(todo)} in {time.time() - t0:.0f}s", flush=True)
os.makedirs("/kaggle/working/out", exist_ok=True)
import shutil
shutil.copy(out_path, "/kaggle/working/out/answers.jsonl")
publish("/kaggle/working/out", "nexora-guru-answers")
print("done", flush=True)
