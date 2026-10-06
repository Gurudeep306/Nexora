#!/usr/bin/env bash
# ==============================================================================
# Nexora-Omni Autonomous Cloud Training Pipeline
# Run this on any NVIDIA GPU server (A100, H100, RTX 4090) to execute full
# institutional fine-tuning and launch the private inference server.
# ==============================================================================

set -e

echo "=================================================================="
echo "          NEXORA OMNI AUTONOMOUS TRAINING LAUNCHER                "
echo "=================================================================="

# 1. Hardware Check
if command -v nvidia-smi &> /dev/null; then
    echo "[✓] GPU Detected:"
    nvidia-smi --query-gpu=gpu_name,memory.total --format=csv,noheader
else
    echo "[!] Warning: No NVIDIA GPU detected. Training will fall back to CPU emulation."
fi

# 2. Dependency Installation
echo "[*] Step 1: Installing dependencies..."
pip install -q -r ai-engine/requirements.txt
pip install -q "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git" || true

# 3. Dataset Compilation & Verification
echo "[*] Step 2: Compiling all training corpora..."
python3 ai-engine/mass_corpus_builder.py
python3 ai-engine/generate_omni_curriculum.py
python3 ai-engine/generate_code_to_animation_corpus.py
python3 ai-engine/ingest_gate_corpus.py
python3 ai-engine/compile_grand_dataset.py

echo "[*] Step 3: Running rigorous dataset quality audit..."
python3 ai-engine/corpus_verifier.py

# 4. Launch Fine-Tuning
MODEL_NAME=${1:-"deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"}
OUTPUT_DIR=${2:-"ai-engine/output/nexora-grand-32b"}

echo "[*] Step 4: Launching 32B Deep-Reasoning LoRA Fine-Tuning on: ${MODEL_NAME}"
python3 ai-engine/train_nexora_grand.py \
    --model_name "${MODEL_NAME}" \
    --data_path "ai-engine/data/nexora_grand_master.jsonl" \
    --output_dir "${OUTPUT_DIR}" \
    --max_seq_length 8192 \
    --lora_r 32 \
    --batch_size 1 \
    --grad_accum 8 \
    --epochs 3 \
    --export_merged \
    --export_gguf

echo "=================================================================="
echo "[✓] Training complete! Weights merged and saved to: ${OUTPUT_DIR}"
echo "[*] Launching private authenticated inference server..."
echo "=================================================================="

export NEXORA_INTERNAL_SECRET="nexora-secret-key-change-me"
export NEXORA_MODEL_PATH="${OUTPUT_DIR}/merged-16bit"
export PORT=8080

python3 ai-engine/serve_api.py
