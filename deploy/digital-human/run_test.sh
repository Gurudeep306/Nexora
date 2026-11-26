#!/usr/bin/env bash
# The first digital-human test: bash run_test.sh "<line>" <en|hi> "<what she does>"   (see README.md)
set -euo pipefail
cd "$(dirname "$0")"
source .venv/bin/activate
LINE=$1; LANG_ID=$2; ACTION=$3
mkdir -p out
: > out/times.txt
t() { local s=$SECONDS; "$@"; echo "$1 ${*: -1}: $((SECONDS - s)) s" >> out/times.txt; }

# 1. Her voice saying the line.
t python3 voice.py "$LINE" "$LANG_ID" in/voice_ref.wav out/voice.wav

# 2. LongCat-Video-Avatar 1.6: photo + voice + the instruction as text (single GPU, INT8 to fit 80 GB).
python3 - "$ACTION" <<'EOF'
import json, os, sys
json.dump({"prompt": sys.argv[1], "cond_image": os.path.abspath("in/person.jpg"),
           "cond_audio": {"person1": os.path.abspath("out/voice.wav")}}, open("out/longcat.json", "w"))
EOF
( cd LongCat-Video && t torchrun --nproc_per_node=1 run_demo_avatar_single_audio_to_video.py --context_parallel_size=1 \
    --checkpoint_dir=./weights/LongCat-Video-Avatar-1.6 --stage_1=ai2v --input_json=../out/longcat.json \
    --use_distill --use_int8 --lora_path loraB/lora.safetensors --model_type avatar-v1.6 --mix_steps=4 --mix_alpha=1.0 \
    --resolution 720p --output_dir ../out/longcat )
cp "$(ls -t out/longcat/*.mp4 | head -1)" out/longcat.mp4

# 3. Wan2.2-S2V: the same photo and voice; follows in/pose.mp4 exactly when it is given.
POSE=(); [ -f in/pose.mp4 ] && POSE=(--pose_video "$(pwd)/in/pose.mp4")
( cd Wan2.2 && t python3 generate.py --task s2v-14B --size 1024*704 --ckpt_dir ./Wan2.2-S2V-14B/ \
    --prompt "$ACTION" --image ../in/person.jpg --audio ../out/voice.wav "${POSE[@]}" --save_file ../out/wan_s2v.mp4 )

# 4. Side by side, with the label the law asks for.
ffmpeg -loglevel error -y -i out/longcat.mp4 -i out/wan_s2v.mp4 -filter_complex \
  "[0:v]scale=-2:720[a];[1:v]scale=-2:720[b];[a][b]hstack=inputs=2,drawtext=text='AI-generated':x=20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5[v]" \
  -map "[v]" -map 0:a? -shortest out/compare.mp4
cat out/times.txt
echo "TEST done: out/compare.mp4. Download out/ and shut the machine down."
