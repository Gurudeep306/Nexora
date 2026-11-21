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

## 2. Make the hint data

`scripts/voice/make-guru-data.js` sends each GATE question (with its key, so
the teacher knows what not to say) to an open-licence teacher, asks for a
student's question and three hints that climb the ladder, drops any set our
Leak Guard catches, and writes chat-format JSONL (`data/guru/`, not committed).

```bash
node scripts/voice/make-guru-data.js --dry --limit 3
```

```bash
TEACHER_BASE_URL=http://localhost:8000/v1 TEACHER_MODEL=Qwen/Qwen3-32B node scripts/voice/make-guru-data.js --limit 500 --out data/guru/hints.jsonl
```

Each line: `{ id, messages: [system, question, …, assistant hint], meta: { question, step, subject, teacher } }`.
Tests: `tests/voice-training-data.test.js`.

## 3. Where it runs (free)

1. **Teacher**: a Kaggle notebook with 2×T4 GPUs runs vLLM serving a Qwen
   model that fits (e.g. Qwen3-14B in 4-bit), and the script runs in the same
   notebook against `http://localhost:8000/v1`. ~30 free GPU hours a week.
2. **Fine-tune**: a second Kaggle notebook, Unsloth + TRL, LoRA on Qwen3.5
   0.8B / 2B / 4B (Guru-S/M/L) with the JSONL.
3. **Check**: the quality gates in `BLUEPRINT.md` §5 (`docs/voice/tests/tutor.json`,
   leak ≤ 2%) before any model is used on the site.

The notebooks are written once the Kaggle account exists (founder's task),
because they must be run and checked there — not here.

## 4. What still needs the founder

- Edit `GURU_SPEC.md` in your own words, and write the 50 example
  conversations (those are the most valuable training data we can have).
- Create the Kaggle and Hugging Face accounts (free), and turn on phone
  verification on Kaggle (needed for GPUs).
