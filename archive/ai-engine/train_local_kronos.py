#!/usr/bin/env python3
"""
Kronos-1 fine-tuning entry point.

IMPORTANT: this script does NOT train anything yet. An earlier version printed
invented loss numbers and wrote a fake adapter; that has been removed. Real
fine-tuning needs a training backend (e.g. `pip install mlx-lm` on Apple Silicon,
or unsloth/peft on a CUDA GPU) and a much larger, verified dataset than the
221 samples currently in data/nexora_grand_master.jsonl.

What it does today: validates the dataset so you know what you'd be training on.
"""

import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data" / "nexora_grand_master.jsonl"


def main():
    if not DATA.exists():
        sys.exit(f"dataset not found: {DATA}")
    n, bad, chars = 0, 0, 0
    for line in DATA.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            msgs = json.loads(line)
            assert isinstance(msgs, list) and any(m.get("role") == "assistant" for m in msgs)
            n += 1
            chars += len(line)
        except Exception:
            bad += 1
    print(f"dataset: {n} valid samples, {bad} invalid, ~{chars // 4:,} tokens")
    print("No training was run. See the docstring for what real fine-tuning requires.")


if __name__ == "__main__":
    main()
