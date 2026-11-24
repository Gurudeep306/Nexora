# Train Guru on Kaggle's free GPUs (docs/voice/TRAINING.md), run from the repo by the Kaggle API.
#
# Input: a private dataset with train.jsonl / val.jsonl / test.jsonl from
#   make-guru-data.js --ingest  (chat-format examples built with the server's own prompt builder).
# Output (/kaggle/working):
#   guru-<size>/            the merged model (Qwen3.5, Apache-2.0, fine-tuned), fp16
#   test_answers.jsonl      { id, reply } for every held-out test example (questions never trained on)
# Scored back in the repo: node scripts/voice/eval-guru.js --answers test_answers.jsonl --test test.jsonl
# Only a model that passes every gate is published and offered on the site.
import glob, json, os, subprocess, sys

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

SIZE = "__SIZE__"  # "0.8B" (Guru S), "2B" (Guru M), "4B" (Guru L): set when the run is pushed
BASE = f"Qwen/Qwen3.5-{SIZE}"
try:
    print(subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout, flush=True)
except FileNotFoundError:
    sys.exit("No GPU: in the notebook editor choose Accelerator → GPU T4 x2 (or GPU P100), then Run All.")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "transformers>=4.57", "peft>=0.17", "trl>=0.23", "datasets", "accelerate"], check=True)

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTConfig, SFTTrainer

data_dir = os.path.dirname(glob.glob("/kaggle/input/**/train.jsonl", recursive=True)[0])
tok = AutoTokenizer.from_pretrained(BASE)
ds = load_dataset("json", data_files={"train": f"{data_dir}/train.jsonl", "val": f"{data_dir}/val.jsonl"})
keep = lambda ex: {"messages": [{"role": m["role"], "content": m["content"]} for m in ex["messages"]]}
ds = ds.map(keep, remove_columns=[c for c in ds["train"].column_names if c != "messages"])
print(ds, flush=True)

model = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float16, device_map="auto")
model.config.use_cache = False
big = SIZE != "0.8B"
cfg = SFTConfig(
    output_dir="out", num_train_epochs=2, learning_rate=1e-4, warmup_ratio=0.03, lr_scheduler_type="cosine",
    per_device_train_batch_size=2 if big else 4, gradient_accumulation_steps=8 if big else 4,
    gradient_checkpointing=True, fp16=True, logging_steps=25, eval_strategy="steps", eval_steps=300, save_strategy="no",
    max_length=3072, assistant_only_loss=True,  # learn only Guru's replies, not the prompts
    report_to=[], chat_template_kwargs={"enable_thinking": False},  # thinking off, as on the site
)
peft = LoraConfig(r=32, lora_alpha=32, lora_dropout=0.0, target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"], task_type="CAUSAL_LM")
try:
    trainer = SFTTrainer(model=model, args=cfg, train_dataset=ds["train"], eval_dataset=ds["val"], processing_class=tok, peft_config=peft)
except Exception as e:
    # Some chat templates can't mark the assistant's part: then train on the whole conversation.
    print("assistant_only_loss unavailable:", e, flush=True)
    cfg.assistant_only_loss = False
    trainer = SFTTrainer(model=model, args=cfg, train_dataset=ds["train"], eval_dataset=ds["val"], processing_class=tok, peft_config=peft)
trainer.train()
print(trainer.evaluate(), flush=True)

merged = trainer.model.merge_and_unload()
out_dir = f"/kaggle/working/guru-{SIZE.lower()}"
merged.save_pretrained(out_dir, safe_serialization=True)
tok.save_pretrained(out_dir)

# Answer the held-out test set (greedy, thinking off), as the site asks.
merged.eval()
merged.config.use_cache = True
tok.padding_side = "left"
rows = [json.loads(l) for l in open(f"{data_dir}/test.jsonl") if l.strip()]
with open("/kaggle/working/test_answers.jsonl", "w") as out:
    B = 16
    for k in range(0, len(rows), B):
        chunk = rows[k : k + B]
        prompts = [tok.apply_chat_template(r["messages"][:-1], tokenize=False, add_generation_prompt=True, enable_thinking=False) for r in chunk]
        enc = tok(prompts, return_tensors="pt", padding=True).to(merged.device)
        with torch.no_grad():
            gen = merged.generate(**enc, max_new_tokens=260, do_sample=False, temperature=None, top_p=None, pad_token_id=tok.pad_token_id or tok.eos_token_id)
        for r, g in zip(chunk, gen):
            reply = tok.decode(g[enc["input_ids"].shape[1]:], skip_special_tokens=True)
            reply = reply.split("</think>")[-1].strip()
            out.write(json.dumps({"id": r["id"], "reply": reply}, ensure_ascii=False) + "\n")
        print(f"answered {k + len(chunk)}/{len(rows)}", flush=True)
import shutil
shutil.copy("/kaggle/working/test_answers.jsonl", f"{out_dir}/test_answers.jsonl")
publish(out_dir, f"nexora-guru-{SIZE.lower()}")
print("done", flush=True)
