#!/usr/bin/env bash
# Installs the digital-human test on a rented 80 GB GPU (Ubuntu, CUDA 12.4). See README.md.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m venv .venv && source .venv/bin/activate
pip install -U pip "huggingface_hub[cli]" ninja psutil packaging
pip install torch==2.6.0+cu124 torchvision==0.21.0+cu124 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
pip install flash_attn==2.7.4.post1

# LongCat-Video-Avatar 1.6 (MIT)
[ -d LongCat-Video ] || git clone --single-branch --branch main https://github.com/meituan-longcat/LongCat-Video
pip install -r LongCat-Video/requirements.txt -r LongCat-Video/requirements_avatar.txt
huggingface-cli download meituan-longcat/LongCat-Video --local-dir LongCat-Video/weights/LongCat-Video
huggingface-cli download meituan-longcat/LongCat-Video-Avatar-1.6 --local-dir LongCat-Video/weights/LongCat-Video-Avatar-1.6

# Wan2.2-S2V-14B (Apache-2.0)
[ -d Wan2.2 ] || git clone https://github.com/Wan-Video/Wan2.2
pip install -r Wan2.2/requirements.txt
huggingface-cli download Wan-AI/Wan2.2-S2V-14B --local-dir Wan2.2/Wan2.2-S2V-14B

# Chatterbox Multilingual voice clone (MIT, watermarked)
pip install chatterbox-tts
sudo apt-get install -y ffmpeg >/dev/null 2>&1 || apt-get install -y ffmpeg
echo "SETUP done"
