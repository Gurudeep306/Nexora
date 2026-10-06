#!/usr/bin/env python3
"""
Nexora-Core Grand Model Fine-Tuner (32B Deep Reasoning & Code Synthesizer)
Fine-tunes:
- Base Model: deepseek-ai/DeepSeek-R1-Distill-Qwen-32B OR Qwen/Qwen2.5-Coder-32B-Instruct
- Data: ai-engine/data/nexora_grand_master.jsonl (GATE CSE + CS Books + Visualizer DSL)
- Technique: 4-bit QLoRA with Rank 32 / Alpha 32 for maximum capacity retention.
"""

import argparse
import os
import sys

def train_grand(args):
    try:
        from unsloth import FastLanguageModel
        from datasets import load_dataset
        from trl import SFTTrainer
        from transformers import TrainingArguments
    except ImportError:
        print("[!] Missing unsloth/transformers. Please run:")
        print("    pip install -r ai-engine/requirements.txt")
        print("    pip install 'unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git'")
        sys.exit(1)

    print("==================================================================")
    print(f"[*] NEXORA GRAND 32B TRAINING INITIALIZATION")
    print(f"[*] Base Model:      {args.model_name}")
    print(f"[*] Context Length:  {args.max_seq_length} tokens")
    print(f"[*] LoRA Rank (r):   {args.lora_r}")
    print(f"[*] Training Corpus: {args.data_path}")
    print("==================================================================")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model_name,
        max_seq_length=args.max_seq_length,
        load_in_4bit=True,
    )

    # Attach wide LoRA adapters across both Attention and MLP blocks
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_r,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ],
        lora_alpha=args.lora_alpha,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    dataset = load_dataset("json", data_files=args.data_path, split="train")
    dataset = dataset.map(lambda samples: {"text": [tokenizer.apply_chat_template(s, tokenize=False) for s in samples]})

    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        dataset_num_proc=2,
        packing=True,  # Pack multiple sequences to maximize GPU throughput
        args=TrainingArguments(
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=args.grad_accum,
            warmup_steps=args.warmup_steps,
            max_steps=args.max_steps if args.max_steps > 0 else None,
            num_train_epochs=args.epochs if args.max_steps <= 0 else 1,
            learning_rate=args.learning_rate,
            fp16=not args.use_bf16,
            bf16=args.use_bf16,
            logging_steps=5,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="cosine",
            seed=42,
            output_dir=output_dir,
            save_strategy="steps",
            save_steps=50,
        ),
    )

    print("[*] Launching Nexora Grand 32B SFT loop...")
    trainer.train()

    print(f"[*] Training finished. Saving adapters to {output_dir}/lora")
    model.save_pretrained(os.path.join(output_dir, "lora"))
    tokenizer.save_pretrained(os.path.join(output_dir, "lora"))

    if args.export_merged:
        merged_path = os.path.join(output_dir, "merged-16bit")
        print(f"[*] Exporting 16-bit standalone weights for vLLM: {merged_path}")
        model.save_pretrained_merged(merged_path, tokenizer, save_method="merged_16bit")

    if args.export_gguf:
        gguf_path = os.path.join(output_dir, "gguf")
        print(f"[*] Exporting quantized GGUF (Q4_K_M) for Ollama: {gguf_path}")
        model.save_pretrained_gguf(gguf_path, tokenizer, quantization_method="q4_k_m")

    print("[✓] Grand Model training & export complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Nexora Grand 32B Model")
    parser.add_argument("--model_name", type=str, default="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", help="Base model")
    parser.add_argument("--data_path", type=str, default="ai-engine/data/nexora_grand_master.jsonl", help="Master dataset")
    parser.add_argument("--output_dir", type=str, default="ai-engine/output/nexora-grand-32b", help="Output path")
    parser.add_argument("--max_seq_length", type=int, default=8192, help="Context length")
    parser.add_argument("--lora_r", type=int, default=32, help="LoRA rank")
    parser.add_argument("--lora_alpha", type=int, default=32, help="LoRA alpha")
    parser.add_argument("--batch_size", type=int, default=1, help="Batch size per GPU")
    parser.add_argument("--grad_accum", type=int, default=8, help="Gradient accumulation")
    parser.add_argument("--learning_rate", type=float, default=1.5e-4, help="Learning rate")
    parser.add_argument("--epochs", type=int, default=3, help="Epochs")
    parser.add_argument("--max_steps", type=int, default=-1, help="Max steps")
    parser.add_argument("--warmup_steps", type=int, default=10, help="Warmup steps")
    parser.add_argument("--use_bf16", action="store_true", default=True, help="Use BF16")
    parser.add_argument("--export_merged", action="store_true", default=True, help="Export 16-bit merged weights")
    parser.add_argument("--export_gguf", action="store_true", default=True, help="Export GGUF")

    args = parser.parse_args()
    train_grand(args)
