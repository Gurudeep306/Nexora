# Nexora-Core Grand AI System (32B CS Canon + GATE CSE + Animation Synthesizer)

Nexora-Core Grand is the dedicated, high-reasoning Computer Science AI engine for **Nexora**. It is architected for:

1. **Complete Computer Science Canon**:
   - Deep algorithmic reasoning and formal proofs (CLRS, Kleinberg-Tardos).
   - Core systems: OS (Galvin/Tanenbaum), Networks (Kurose/Ross), DBMS (Korth/Navathe), Architecture (Patterson/Hennessy), Compilers (Aho-Ullman Dragon Book), Automata (Sipser/Hopcroft-Ullman).
2. **GATE CSE Mastery**:
   - Ingestion of 35 years of official GATE CSE papers (`GATE_PYQ/`, 1991–2025).
   - Chain-of-thought `<think>` proofs, virtual memory math, pipeline hazard calculations, and Turing undecidability analysis.
3. **Automated Production-Grade Animation Synthesizer**:
   - Automatic generation of executable TypeScript algorithm modules matching `client/src/learn/engine/tracer.ts`.
   - Polyglot synced code tabs (Pseudocode, C++, Java, Python, JavaScript, C) with line tags (`//@tag`).
   - Reversible step-by-step state machine frames (`t.array()`, `t.tree()`, `t.grid()`, `t.graph()`).

---

## Architecture & Recommended Model

- **Base Model**: `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B` OR `Qwen/Qwen2.5-Coder-32B-Instruct`
  - *Context*: 8k to 32k tokens.
  - *Training*: 4-bit QLoRA (Rank 32, Alpha 32) packed dataset.
  - *Compute Required*: 1x NVIDIA A100 (80GB) or 2x RTX 4090 on RunPod / Lambda Labs (~$2/hr).

---

## Directory Layout

```
ai-engine/
├── data/
│   ├── gate_reasoning_corpus.jsonl    # 35 years of GATE CSE exam questions with CoT proofs
│   ├── animator_corpus.jsonl          # Production-grade Nexora TypeScript visualizer modules
│   ├── train.jsonl                    # Socratic tutoring & competitive programming debugging
│   └── nexora_grand_master.jsonl      # Grand merged training dataset
│
├── ingest_gate_corpus.py              # Ingests GATE_PYQ/ PDFs and builds reasoning pairs
├── animation_generator.py             # Generates animation training corpus
├── compile_grand_dataset.py           # Merges all corpora into the grand master dataset
├── train_nexora_grand.py              # 32B Deep-Reasoning fine-tuner (Unsloth + LoRA)
├── generate_animation_cli.py          # Automated CLI to create new algorithm visualizers (.ts)
├── serve_api.py                       # Private inference server (X-Nexora-Secret authentication)
└── requirements.txt                   # GPU training & serving dependencies
```

---

## How to Train the Grand 32B Model

1. **Generate and compile the complete dataset**:
   ```bash
   python ai-engine/ingest_gate_corpus.py
   python ai-engine/animation_generator.py
   python ai-engine/dataset_generator.py
   python ai-engine/compile_grand_dataset.py
   ```

2. **Run Grand Fine-Tuning** (on GPU server):
   ```bash
   python ai-engine/train_nexora_grand.py \
       --model_name "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B" \
       --data_path "ai-engine/data/nexora_grand_master.jsonl" \
       --output_dir "ai-engine/output/nexora-grand-32b" \
       --max_seq_length 8192 \
       --lora_r 32 \
       --batch_size 1 \
       --grad_accum 8 \
       --epochs 3 \
       --export_merged \
       --export_gguf
   ```

---

## Automating Animations for the Website

Whenever you want to add a new interactive animation to your DSA or GATE courses:

```bash
python ai-engine/generate_animation_cli.py \
    --topic "Red Black Tree Rotations" \
    --output "client/src/learn/algorithms/rbtree.ts"
```

The model generates the complete TypeScript module conforming to the Nexora Animation Engine, with polyglot code and step-by-step tracer frames ready to play in the browser!
