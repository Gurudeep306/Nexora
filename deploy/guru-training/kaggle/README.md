# Guru on Kaggle, run from the repo (no notebook clicking)

Claude (or anyone with the Kaggle key in the session's environment) runs these
with the Kaggle API; nothing secret goes into a notebook:

1. `node scripts/voice/make-guru-data.js --export-jobs jobs.jsonl --hint 3419 --review 3419 --concept 1353 --talk 1353 --seeds 1,2`
2. Upload `jobs.jsonl` as a private Kaggle dataset; push `make_data.py` as a private
   kernel with GPU T4 x2 and internet on, the dataset attached.
3. Download `answers.jsonl`, then
   `TEACHER_MODEL=Qwen/Qwen3-14B-AWQ node scripts/voice/make-guru-data.js --ingest answers.jsonl --jobs jobs.jsonl --out-dir data/guru`
   (the same checks as the live mode: Leak Guard, spoken style, script, length, duplicates).
4. Upload `data/guru` as a private dataset; push `fine_tune.py` (GPU, internet on).
   It trains on Qwen3.5 (Apache-2.0), writes the model, and answers the held-out
   test set (`test_answers.jsonl`).
5. Score with `node scripts/voice/eval-guru.js --answers test_answers.jsonl --test data/guru/test.jsonl`.
   Only a model that passes every gate is uploaded to Hugging Face and offered on the site.
