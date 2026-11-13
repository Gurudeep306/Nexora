# Nexora model farm

Your own open models on a cloud GPU, behind **one address and one key**, connected to Hive. Claude (the Copilot) leads and checks; these models do the work. That saves Claude tokens without lowering quality:

- **Hard work stays with Claude.** The quality bars keep it there: no farm model clears the bar for hard engineering.
- **Claude-only areas** you choose (signature UI, shaders, architecture, final review) always go to Claude.
- **Farm work has to pass a check.** It's accepted only when tests and a reviewer from a *different* model family pass it. A second failure hands it to Claude.

## What runs

| Name in Hive | Model | Job |
|---|---|---|
| `qwen3.8-27b` | Qwen 3.8 27B | UI, Nexora scene JSON, motion code, everyday coding (the main worker) |
| `uigen-x-32b` | Tesslate UIGEN-X 32B | UI-only specialist |
| `qwen3-coder-next` | Qwen3 Coder Next (80B, 3B active) | Backend, tests, refactors |
| `nemotron-cascade-2-30b` | NVIDIA Nemotron Cascade 2 (30B, 3B active) | Maths and GATE solutions |
| `devstral-small-2` | Mistral Devstral Small 2 | Design/screenshot to code, second-opinion reviewer |
| `gemma-4-31b` | Google Gemma 4 31B | Reviewer from another family, maths |
| `paddleocr-vl` | PaddleOCR-VL | Reading scanned GATE papers |
| `sarvam-translate` | Sarvam Translate | 22 Indian languages |
| `qwen3-embedding` | Qwen3 Embedding 0.6B | Search and recommendations |

`models.json` holds the Hugging Face repo of each model. Repos get renamed now and then. `farm.sh` checks each one before downloading, and skips any it can't find with a message, so the rest still start. To fix a skipped model, put the current repo name in `models.json`.

## Profiles (pick one with `FARM_PROFILE`)

| Profile | GPU | Serves | About (24/7) |
|---|---|---|---|
| `budget` (default) | 1× 48 GB: L40S, RTX 6000 Ada, A6000 | Qwen 3.8 27B, OCR, translation, embeddings | $0.6–0.9/h → $430–650/month |
| `plus` | 1× 80 GB: A100 80GB, H100 | adds Nemotron (maths) | $1.2–2/h → $870–1,450/month |
| `pro` | 2× 80 GB | adds Qwen3 Coder Next | $2.5–4/h → $1,800–2,900/month |
| `ui` | 1× 80 GB | Qwen 3.8 27B + UIGEN-X | $1.2–2/h |

Or name exactly what you want: `FARM_MODELS=qwen3.8-27b,paddleocr-vl`.

**Save money:**
- **Stop the pod when you aren't working.** Downloads stay on the volume, so the next start takes minutes, not a re-download.
- **Free credits:** AMD Developer Cloud gives $100 (about 50 h on an MI300X with 192 GB). It can serve the `pro` set on one GPU. Use the ROCm vLLM image.

## Start it on RunPod (about 10 minutes)

1. **Create the pod.** On runpod.io, open **Pods → Deploy**:
   - pick a GPU for your profile, e.g. **L40S** for `budget`
   - choose a template with PyTorch/CUDA 12, or the **vLLM** template
   - set **Container disk** to 40 GB and **Volume** to 150 GB (models stay on `/workspace`)
   - under **Expose HTTP ports**, add **8000**
2. **Open the pod's terminal** and run:
   ```bash
   git clone https://github.com/Gurudeep306/Nexora.git /workspace/Nexora   # or copy deploy/model-farm there
   cd /workspace/Nexora/deploy/model-farm
   export FARM_KEY=$(openssl rand -hex 24); echo "FARM_KEY=$FARM_KEY"   # save this
   export HF_TOKEN=hf_...            # only needed for gated models (Gemma)
   FARM_PROFILE=budget nohup bash farm.sh > farm.log 2>&1 &
   tail -f farm.log                  # wait for "serving: …"
   ```
   The first run downloads the models, which takes 10–30 minutes depending on the profile.
3. **Check it:** open `https://<pod-id>-8000.proxy.runpod.net/health`. Every model should show `true`.
4. **Connect Hive:** open **Hive → Keys → Add → "Your GPU farm"**.
   - **Address:** `https://<pod-id>-8000.proxy.runpod.net/v1`
   - **Key:** your `FARM_KEY`

   Hive tests every model on it, offers only the ones that answer, and the Copilot starts using them.

**Vast.ai:** the same steps with the `vllm/vllm-openai` image. Open port 8000, then run `farm.sh` from the instance's terminal.

**Any Linux GPU box:** `FARM_KEY=… bash farm.sh` works the same way. Put it behind HTTPS (Caddy, a Cloudflare Tunnel or the provider's proxy) before giving Hive the address.

## How Hive uses it

- **Copilot → brain menu → "Save Claude tokens"** is on by default. Claude plans and checks, and the farm and free models write.
- **"Always done by Claude":** edit the list of areas Claude always handles.
- **`check_session`:** a reviewer from another model family runs the tests and reads the changes. It returns a short verdict, so Claude doesn't spend tokens reading whole diffs.
- **Agent health:** shows each farm model's state and measured speed. Hive routes around any that stop answering.

## Files

- `farm.sh`: installs vLLM if needed, then starts everything.
- `launch.py`: starts each model in its own vLLM server, one at a time, then the gateway, and restarts anything that stops. `FARM_DRY_RUN=1` prints the commands without running them.
- `gateway.py`: the only public part. It checks the key, lists the models at `/v1/models`, and routes chat, completions and embeddings (streaming included). `/health` needs no key and shows no secrets. It uses Python's standard library only.
- `models.json`: the models and profiles.
