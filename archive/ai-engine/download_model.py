#!/usr/bin/env python3
"""
Nexora Kronos Model Weight Downloader
Downloads genuine physical open-source weights directly into ai-engine/models/
so the AI model is 100% physically present on your machine with ZERO external APIs.
"""

import os
import sys
import urllib.request
import time

MODELS = {
    "1": {
        "name": "Qwen2.5-Coder-0.5B-Instruct (Ultralight - 397 MB)",
        "filename": "kronos-coder-0.5b.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf",
        "size_mb": 397
    },
    "2": {
        "name": "Qwen2.5-Coder-1.5B-Instruct (Recommended - 986 MB)",
        "filename": "kronos-coder-1.5b.gguf",
        "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        "size_mb": 986
    },
    "3": {
        "name": "DeepSeek-R1-Distill-Qwen-1.5B (Reasoning - 1.1 GB)",
        "filename": "kronos-deepseek-1.5b.gguf",
        "url": "https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf",
        "size_mb": 1120
    }
}

def download_with_progress(url, dest_path):
    print(f"\n[↓] Downloading physical model weights from:\n    {url}")
    print(f"[→] Saving directly to local drive:\n    {dest_path}\n")

    start_time = time.time()
    def reporthook(count, block_size, total_size):
        if total_size <= 0:
            return
        downloaded = count * block_size
        pct = downloaded / total_size * 100
        mb_down = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        elapsed = time.time() - start_time
        speed = (mb_down / elapsed) if elapsed > 0 else 0
        sys.stdout.write(f"\r  [{pct:5.1f}%] {mb_down:.1f} MB / {mb_total:.1f} MB ({speed:.1f} MB/s) ...")
        sys.stdout.flush()

    urllib.request.urlretrieve(url, dest_path, reporthook)
    print("\n\n[✓] Download Complete! Physical model weights are now stored on your machine.")

def main():
    target_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(target_dir, exist_ok=True)

    choice = sys.argv[1] if len(sys.argv) > 1 else "1"
    model_info = MODELS.get(choice, MODELS["1"])
    dest_path = os.path.join(target_dir, model_info["filename"])

    if os.path.exists(dest_path):
        print(f"[✓] Model weights already physically present at:\n    {dest_path}")
        return

    print(f"============================================================")
    print(f"  NEXORA KRONOS: DOWNLOADING PHYSICAL NEURAL WEIGHTS")
    print(f"  Target: {model_info['name']}")
    print(f"============================================================")

    download_with_progress(model_info["url"], dest_path)

if __name__ == "__main__":
    main()
