# Training Guru S / M / L on Kaggle (free)

Guru is NexoraGuru's tutor. These two notebooks teach the small Qwen3.5 models
(Apache-2.0) to tutor the NexoraGuru way: hints that climb a ladder and never
give the answer away, reviews of answered questions, short explanations, and a
warm word in conversation, in English, Hinglish and Hindi. Nothing else: chat
and every other AI feature stay on Groq.

## What you do (once, about 15 minutes)

1. **Kaggle:** sign up at kaggle.com → Settings → Phone verification (needed for GPUs).
2. **Hugging Face:** sign up at huggingface.co → Settings → Access Tokens → New token → type **Write**. Copy it.
3. **GitHub token:** github.com → Settings → Developer settings → Fine-grained tokens → New → only the Nexora repository, **Contents: Read-only**. Copy it.
4. On Kaggle: Create → New notebook → File → Import notebook → upload `1-make-data.ipynb`.
   Then Add-ons → Secrets → add `GITHUB_TOKEN`. Settings → Accelerator **GPU T4 ×2**, Internet **On**. Press **Run all**.
5. When it finishes: Output → *New dataset* named `guru-data`.
6. Import `2-fine-tune.ipynb` the same way, add secrets `GITHUB_TOKEN` and `HF_TOKEN`, Add input → your `guru-data`, **Run all**.
   It trains Guru S first (`SIZE = "0.8B"`); change to `"2B"` and `"4B"` and run again for M and L.
7. Tell Claude the result line of the quality gates (`"pass": true` or `false`) and the Hugging Face model name it printed.

Never paste a token into a chat. Kaggle secrets keep them safe.

## What happens next

- If the gates pass and the browser (ONNX) version was made, Claude points Settings → Voice → Guru on this device at your model, in a tested pull request.
- If the ONNX exporter doesn't support Qwen3.5 yet (the notebook says so plainly), the site keeps the base model until it does; your trained model waits on Hugging Face.
- The site also needs the 4-bit browser build (q4f16); Claude makes that step once the export works, because it must be checked on a real device.

Free limits: about 30 GPU hours a week on Kaggle. Step 1 takes about 1.5 hours, step 2 about 1–3 hours per size.
