# Training Guru — data rules and the steps (Phase 4)

> Plan: `BLUEPRINT.md` §5. This file is the practical part: what data we may
> use, the script that makes it, and where it runs. Nothing here costs money.

## 1. What may become training data

| Source | Training data? | Why |
|---|---|---|
| Official GATE questions, options, answer keys | **Yes** | Public exam content. |
| The Guru Spec (`GURU_SPEC.md`) | **As instructions only** | It steers the teacher model; the founder's own example conversations in it may be used once the founder has written them. |
| Our written solutions, notes and lessons | **No — lookup only** | Most were drafted with AI agents (Claude and others). Their terms forbid using their output to train other models. Guru *reads* them at answer time (retrieval); it never *learns from* them. |
| Conversations written by an **open-licence** model (Qwen, DeepSeek, gpt-oss, Apache Mistral, OLMo) | **Yes** | Their licences allow it. The script refuses any other teacher. |
| Outputs of Claude, ChatGPT, Gemini, Gemma, Llama, Sarvam, Grok | **Never** | Their terms forbid it, or limit it to their own model family. |
| Our voice test sets (`docs/voice/tests/`) | **No — tests only** | Drafted with an AI agent. They measure models; the router learns from open-teacher and opted-in student data instead. |
| Students' voices and words | **Only with the corpus opt-in** (18+ or guardian) | `prefs.ts`; asked again before any recording. |
| The third-party reference notes in Materials | **Never** | Not ours. |

## 2. Make the data (v2)

`scripts/voice/make-guru-data.js` (pure parts in `scripts/voice/guru-data.js`)
asks an open-licence teacher for four kinds of tutoring conversation, and
nothing else, because Guru is built for one job:

| Kind | Input (public only) | Guru learns to |
|---|---|---|
| `hint` | an unsolved GATE question + official key | give hints 1–3 up the ladder, never the answer |
| `review` | an answered question + official key | say why the key is right (and the tempting option wrong) |
| `concept` | a topic name from the Nexus map | explain it briefly with one tiny example |
| `talk` | a topic name | answer small talk warmly and come back to study |

In English (45%), Hinglish (35%) and Hindi in Devanagari (20%), as one of the
seven teachers or as Guru. Every example is built with the server's own
`buildMessages`, so the model learns exactly the prompt it gets on the site.

Every reply must pass: the Leak Guard (hints), naming the key (reviews), spoken
style (no markdown or code), a length limit, and the right script (Devanagari
for Hindi, Roman otherwise). Duplicates are dropped. Train / val / test are
split by question or topic, so the test set holds questions never trained on.

```bash
node scripts/voice/make-guru-data.js --dry --hint 3
TEACHER_BASE_URL=http://localhost:8000/v1 TEACHER_MODEL=Qwen/Qwen3-14B-AWQ \
  node scripts/voice/make-guru-data.js --hint 1500 --review 800 --concept 1200 --talk 300 --out-dir data/guru
```

Tests: `tests/voice-training-data.test.js`.

## 3. Where it runs (free), and the quality gates

`deploy/guru-training/` has the two Kaggle notebooks and the owner's steps:
`1-make-data.ipynb` (vLLM serving Qwen3-14B-AWQ on 2 × T4, then the script) and
`2-fine-tune.ipynb` (Unsloth LoRA on Qwen3.5 0.8B / 2B / 4B, trained on Guru's
replies only, thinking off as on the site).

A model is used on the site only if `scripts/voice/eval-guru.js` passes on the
held-out test set: leaks ≤ 2% of hints, reviews name the key ≥ 95%, clean
(spoken style, length, script) ≥ 95%. Then the browser build: ONNX export (the
notebook stops plainly if the exporter doesn't support Qwen3.5 yet) and the
4-bit q4f16 build, checked on a real device before the site points at it.

## 4. What still needs the founder

- Edit `GURU_SPEC.md` in your own words, and write the 50 example
  conversations (those are the most valuable training data we can have).
- Create the Kaggle and Hugging Face accounts (free), and turn on phone
  verification on Kaggle (needed for GPUs).
