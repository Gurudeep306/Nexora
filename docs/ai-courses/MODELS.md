# Models timeline

Generated from `sources/models.json` by `node scripts/ai-courses/check-curriculum.mjs`. Each model links to the papers that describe it and the topics that explain its parts. "Published" says honestly how much the makers disclosed. To add a new model, see [UPDATING.md](UPDATING.md).

| Year | Model | Made by | Published | What was new | Learn it in | Papers |
|---|---|---|---|---|---|---|
| 1998 | LeNet-5 | AT&T Bell Labs | paper | Convolutions and pooling trained end to end by backprop; read cheques. | Convolutional networks and pooling; backprop through a convolution | LeCun et al. 1998 |
| 2012 | AlexNet | University of Toronto | paper | A deep CNN on GPUs with ReLU and dropout won ImageNet by a wide margin. | AlexNet, VGG and Inception | Krizhevsky, Sutskever, Hinton 2012; Deng et al. 2009 |
| 2013 | word2vec | Google | paper | Word meanings as vectors learned from context. | word2vec | Mikolov et al. 2013; Mikolov et al. 2013 |
| 2014 | GAN | Université de Montréal | paper | A generator and a discriminator trained against each other. | Generative adversarial networks: the minimax game, derived | Goodfellow et al. 2014 |
| 2015 | ResNet | Microsoft Research | paper | Skip connections let networks go 100+ layers deep. | Residual networks | He et al. 2016 |
| 2016 | AlphaGo | DeepMind | paper | Tree search guided by policy and value networks beat a Go champion. | Tree search and self-play: AlphaGo, AlphaZero, MuZero | Silver et al. 2016 |
| 2017 | Transformer | Google | paper | Attention only, no recurrence: the base of every modern LLM. | The full transformer: encoder, decoder, masking, training | Vaswani et al. 2017 |
| 2018 | BERT | Google | paper | Pre-train by filling in masked words, then fine-tune for any task. | BERT and masked language modelling | Devlin et al. 2018 |
| 2019 | GPT-2 | OpenAI | paper | A bigger decoder-only model doing tasks it was never trained for. | GPT: decoder-only language models | Radford et al. 2019 |
| 2020 | GPT-3 | OpenAI | paper | 175B parameters; learns new tasks from examples in the prompt. | In-context learning and GPT-3; Scaling laws and compute-optimal training | Brown et al. 2020 |
| 2021 | CLIP | OpenAI | paper | Images and text in one embedding space, from 400M image–text pairs. | CLIP: images and text in one space | Radford et al. 2021 |
| 2022 | InstructGPT | OpenAI | paper | RLHF makes a model follow instructions; the method behind ChatGPT. | RLHF: reward models and PPO with a KL penalty | Ouyang et al. 2022 |
| 2022 | Latent diffusion (Stable Diffusion) | LMU Munich / Runway / Stability AI | paper | Diffusion in a compressed latent space, conditioned on text. | Latent diffusion and text-to-image | Rombach et al. 2021 |
| 2022 | Chinchilla | DeepMind | paper | Train on many more tokens for the same compute. | Scaling laws and compute-optimal training | Hoffmann et al. 2022 |
| 2022 | Claude models | Anthropic | not published (architecture, data and training recipe); research on methods is published | Anthropic has published its alignment methods (constitutional AI, RLHF) and interpretability work on Claude 3 Sonnet, not how its models are built. Lessons say exactly this. | Post-training: instruction tuning, RLHF and constitutional methods; Superposition and features: sparse autoencoders | Bai et al. 2022; Bai et al. 2022; Templeton et al. 2024 |
| 2023 | LLaMA and Llama 2 | Meta | paper | Open weights with RoPE, SwiGLU and RMSNorm; Llama 2 adds chat tuning. | Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA | Touvron et al. 2023; Touvron et al. 2023 |
| 2023 | GPT-4 | OpenAI | technical report (architecture and training not disclosed) | Multimodal; the report gives results and predictable scaling, not the architecture. | A pre-training run, end to end: the plan, the compute, the loss curve; Measuring a model: benchmarks and their limits | OpenAI 2023 |
| 2023 | Mistral 7B | Mistral AI | paper | Grouped-query and sliding-window attention in a small strong model. | Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA | Jiang et al. 2023 |
| 2023 | Mamba | CMU / Princeton | paper | Selective state spaces: linear-time sequence modelling. | State-space models: S4 and Mamba | Gu, Dao 2023 |
| 2024 | Llama 3 | Meta | paper | A detailed public account of training a frontier-scale model: data, 4D parallelism, post-training. | A pre-training run, end to end: the plan, the compute, the loss curve; Pre-training data: crawl, filter, deduplicate, mix; Post-training: instruction tuning, RLHF and constitutional methods | Grattafiori et al. (Llama Team) 2024 |
| 2024 | DeepSeek-V3 | DeepSeek | technical report | A large mixture-of-experts model trained with FP8 and multi-token prediction. | Mixture of experts; A pre-training run, end to end: the plan, the compute, the loss curve; Mixed-precision training and loss scaling | DeepSeek-AI 2024 |
| 2025 | DeepSeek-R1 | DeepSeek | technical report | Reasoning learned with reinforcement learning on checkable answers (GRPO). | Reasoning models: RL on verifiable answers, process rewards, thinking longer | DeepSeek-AI 2025; Shao et al. 2024 |
