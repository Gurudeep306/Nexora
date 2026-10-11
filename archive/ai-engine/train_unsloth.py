#!/usr/bin/env python3
"""
Nexora-Core Fine-Tuning Pipeline
Uses Unsloth + LoRA to fine-tune Qwen2.5-Coder-7B-Instruct on Nexora tasks.
Supports:
- 4-bit quantization (runs on 16GB-24GB VRAM)
- Merged 16-bit export for vLLM
- GGUF export for local Ollama / llama.cpp inference
"""

import argparse
import os
import sys

def train(args):
    try:
        from unsloth import FastLanguageModel
        from datasets import load_dataset
        from trl import SFTTrainer
        from transformers import TrainingArguments
    except ImportError:
        print("Missing required libraries. Please run: pip install -r ai-engine/requirements.txt")
        print("And install Unsloth via: pip install 'unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git'")
        sys.exit(1)

    max_seq_length = args.max_seq_length
    model_name = args.model_name
    print(f"[*] Loading foundation model: {model_name} (max_seq_length={max_seq_length})")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        load_in_4bit=args.load_in_4bit,
    )

    # Attach LoRA adapters
    print("[*] Adding LoRA target adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_r,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=args.lora_alpha,
        lora_dropout=0,  # Unsloth supports 0 dropout for optimized speed
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    # Format dataset using tokenizer chat template
    print(f"[*] Loading dataset from: {args.data_path}")
    dataset = load_dataset("json", data_files=args.data_path, split="train")

    def format_prompts(batch):
        formatted_texts = []
        for conversation in batch:
            text = tokenizer.apply_chat_template(conversation, tokenize=False, add_generation_prompt=False)
            formatted_texts.append(text)
        return {"text": formatted_texts}

    dataset = dataset.map(lambda samples: {"text": [tokenizer.apply_chat_template(s, tokenize=False) for s in samples]})

    # Trainer configuration
    output_dir = args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        dataset_num_proc=2,
        packing=False,  # Can set to True for faster training on large corpora
        args=TrainingArguments(
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=args.grad_accum,
            warmup_steps=args.warmup_steps,
            max_steps=args.max_steps if args.max_steps > 0 else None,
            num_train_epochs=args.epochs if args.max_steps <= 0 else 1,
            learning_rate=args.learning_rate,
            fp16=not args.use_bf16,
            bf16=args.use_bf16,
            logging_steps=10,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="cosine",
            seed=42,
            output_dir=output_dir,
            save_strategy="steps",
            save_steps=100,
        ),
    )

    print("[*] Starting Nexora-Core training...")
    trainer.train()

    print(f"[*] Training finished! Saving LoRA adapters to {output_dir}/lora")
    model.save_pretrained(os.path.join(output_dir, "lora"))
    tokenizer.save_pretrained(os.path.join(output_dir, "lora"))

    if args.export_merged:
        merged_path = os.path.join(output_dir, "merged-16bit")
        print(f"[*] Merging model into full 16-bit weights for vLLM: {merged_path}")
        model.save_pretrained_merged(merged_path, tokenizer, save_method="merged_16bit")

    if args.export_gguf:
        gguf_path = os.path.join(output_dir, "gguf")
        print(f"[*] Exporting GGUF for Ollama: {gguf_path}")
        model.save_pretrained_gguf(gguf_path, tokenizer, quantization_method="q4_k_m")

    print("[*] All stages completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune Nexora-Core LLM")
    parser.add_argument("--model_name", type=str, default="Qwen/Qwen2.5-Coder-7B-Instruct", help="Base model")
    parser.add_argument("--data_path", type=str, default="ai-engine/data/train.jsonl", help="Training JSONL path")
    parser.add_argument("--output_dir", type=str, default="ai-engine/output/nexora-core-v1", help="Output path")
    parser.add_argument("--max_seq_length", type=int, default=4096, help="Max context length")
    parser.add_argument("--load_in_4bit", action="store_true", default=True, help="Use 4-bit QLoRA")
    parser.add_argument("--lora_r", type=int, default=16, help="LoRA rank")
    parser.add_argument("--lora_alpha", type=int, default=16, help="LoRA alpha")
    parser.add_argument("--batch_size", type=int, default=2, help="Per device batch size")
    parser.add_argument("--grad_accum", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--learning_rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--max_steps", type=int, default=-1, help="Max steps (-1 for full epochs)")
    parser.add_argument("--warmup_steps", type=int, default=10, help="Warmup steps")
    parser.add_argument("--use_bf16", action="store_true", default=False, help="Use BF16 (requires Ampere+ GPU)")
    parser.add_argument("--export_merged", action="store_true", default=True, help="Export 16-bit merged weights for vLLM")
    parser.add_argument("--export_gguf", action="store_true", default=False, help="Export GGUF for Ollama")
    
    args = parser.parse_args()
    train(args)
