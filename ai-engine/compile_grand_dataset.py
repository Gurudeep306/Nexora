#!/usr/bin/env python3
"""
Nexora-Core Grand Master Corpus Compiler
Merges:
1. 35 Years of GATE CSE Rigorous Reasoning (GATE_PYQ corpus)
2. Automated Production-Grade Algorithm Animation Synthesizers
3. Socratic Competitive Programming Tutoring & Error Diagnostics
Into a unified master dataset ready for DeepSeek-R1 / Qwen-32B fine-tuning.
"""

import glob
import json
import os
import random

def compile_master(data_dir="ai-engine/data", output_file="ai-engine/data/nexora_grand_master.jsonl"):
    all_conversations = []
    
    # Read all jsonl files in data directory except the master output itself
    files = glob.glob(os.path.join(data_dir, "*.jsonl"))
    for file_path in files:
        if "master" in file_path:
            continue
        print(f"[*] Ingesting: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        all_conversations.append(json.loads(line))
                    except Exception as e:
                        print(f"Skipping malformed row in {file_path}: {e}")
                        
    random.seed(42)
    random.shuffle(all_conversations)
    
    with open(output_file, "w", encoding="utf-8") as f:
        for conv in all_conversations:
            f.write(json.dumps(conv) + "\n")
            
    print(f"[✓] Grand Master Corpus Compiled: {len(all_conversations)} high-density samples -> {output_file}")

if __name__ == "__main__":
    compile_master()
