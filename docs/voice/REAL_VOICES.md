# Real Indian voices: measuring and training the ears

The owner wants the teacher to understand every kind of Indian voice. This
file records what is measured on **real recorded voices** (not test clips
written by us), and the training plan. Voices are never committed to the repo.

## Datasets (licences checked on their Hugging Face pages, 2026-11-24)

| Dataset | What | Licence | Use |
|---|---|---|---|
| ai4bharat/Lahaja | Hindi read and spoken by people of many mother tongues, with state, district, gender, age | MIT | **Test only** (accents the model is never trained on) |
| ai4bharat/IndicVoices | Very large; real people across India, many styles | CC-BY-4.0 | Training |
| ai4bharat/Kathbath | Read speech, Indian languages | CC-BY-4.0 | Training |
| ai4bharat/Shrutilipi | Radio news, Indian languages | CC-BY-4.0 | Training |
| google/fleurs | Read speech, many languages | CC-BY-4.0 | Extra test |
| ai4bharat/Svarah | Indian-accented English | **Not stated** | Not used until its licence is clear |

All AI4Bharat sets are gated: the owner accepted their terms on Hugging Face.
CC-BY-4.0 needs credit: AI4Bharat is credited in Settings → Voice and here.

## Measurement 1: Groq Whisper large-v3 (the site's ears) on Lahaja, 2026-11-24

120 clips, balanced across 12 mother tongues and both genders, ≤ 20 s each;
`scripts/voice/real/eval_groq.py`. WER and CER after removing punctuation and
the bracketed English glosses.

| Mother tongue | n | WER | CER |
|---|---|---|---|
| Malayalam | 8 | 0.382 | 0.259 |
| Bodo | 7 | 0.293 | 0.174 |
| Tamil | 8 | 0.292 | 0.149 |
| Bengali | 7 | 0.289 | 0.243 |
| Assamese | 16 | 0.279 | 0.160 |
| Nepali | 15 | 0.279 | 0.196 |
| Marathi | 16 | 0.240 | 0.135 |
| Gujarati | 15 | 0.224 | 0.164 |
| Dogri | 7 | 0.206 | 0.149 |
| Punjabi | 7 | 0.203 | 0.126 |
| Konkani | 7 | 0.167 | 0.100 |
| Kannada | 7 | 0.118 | 0.058 |
| **All** | **120** | **0.251** | **0.161** |

Men 0.269, women 0.241. Part of the WER is spelling variation in Hindi
(nukta, numbers written as digits); the CER shows the size of real mishearing.
South Indian and North-Eastern accents are the weakest.

## Training plan (Kaggle, free GPUs)

1. Fine-tune an open Whisper (MIT) on Hindi, Hinglish and Indian English from
   IndicVoices, Kathbath and Shrutilipi. Balance speakers by state and gender;
   oversample the weakest accents above.
2. Test on Lahaja (never trained on), the same 120 clips plus the rest of
   Lahaja. Ship only if it beats the line above.
3. Run it on the student's device (transformers.js, WebGPU) as free ears, with
   Groq Whisper kept as the fallback.
