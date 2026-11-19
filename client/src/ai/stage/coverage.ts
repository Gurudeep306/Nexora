/*
  Which Stage elements draw each topic's signature visual (the "visual" line
  in docs/ai-courses/curriculum.json). A test checks that every topic is here
  and names only element types the library has, so no topic is left without a
  way to be animated. A lesson author starts from these; the kit demos on
  /ai-lab show each element working.
*/
const MAP = `
f-numbers: curve shape label line
f-functions: curve path label
f-exp-log: curve line label
f-sums: tokens bars label
f-python: code table
f-py-strings: tokens code
f-py-control: code graph
f-py-functions: code graph table
f-py-lists: code tokens graph
f-py-dicts: code table graph
f-py-iteration: code tokens
f-py-errors-files: code graph table
f-py-classes: code graph
f-py-modules: code graph
f-py-clean: code table
f-numpy: tiles tensor beads
f-numpy-index: tiles code
f-numpy-ops: tiles beads bars
f-numpy-linalg: tiles tensor beads
f-pandas: table code
f-pandas-clean: table graph code
f-matplotlib: chart curve points code
f-pytorch: tensor membar code
f-data: table points axes chart
f-what-is-learning: points line bars chart
m-vectors: arrow axes label
m-dot: arrow line label
m-norms: shape curve ellipsoid
m-matrices: lattice arrow axes
m-matmul: tiles beads lattice
m-systems: plane points tiles
m-rank: arrow plane lattice
m-inverse-det: lattice shape ellipsoid
m-orthogonality: arrow line
m-eigen: lattice arrow
m-symmetric: surface contours arrow
m-svd: shape ellipsoid image tiles
m-limits: curve points
m-derivative: curve
m-derivative-rules: graph curve
m-taylor: curve
m-integrals: curve
m-partial: surface curve
m-directional: surface arrow field
m-jacobian: lattice shape
m-hessian: surface contours arrow
m-matrix-calculus: tensor tiles graph
m-multivariate-chain: graph
m-prob-basics: tiles region
m-conditional: graph shape
m-random-variables: chart tokens
m-expectation: chart curve arrow
m-distributions: chart curve
m-joint: surface curve
m-multivariate-gaussian: surface ellipsoid contours arrow
m-lln-clt: chart
m-estimation: curve points chart
m-map-bayesian: curve chart
m-hypothesis: chart line
m-sampling-mc: contours path points
m-entropy: tokens bars chart
m-cross-entropy-kl: chart curve
m-mutual-information: shape label
m-opt-basics: surface path curve
m-convexity: curve surface line
m-gradient-descent: surface path contours
m-gd-convergence: contours path
m-newton: curve path
m-constrained: contours curve arrow
m-sgd: contours path
m-momentum: surface path
m-adaptive: surface path
m-lr-schedules: chart
m-variational: curve chart
ml-what-is-ml: table points
ml-sklearn: code table region points
ml-loss-risk: points line bars
ml-linreg-1d: points line shape
ml-linreg-normal: arrow plane points
ml-linreg-gd: surface path points line
ml-linreg-prob: points line curve
ml-features: points curve
ml-overfitting: chart timeline
ml-bias-variance: points curve
ml-regularization: contours shape
ml-classification-intro: points region
ml-logistic: region surface points
ml-softmax-regression: tiles bars
ml-metrics: chart points region
ml-knn: region points
ml-naive-bayes: tokens bars table
ml-lda-qda: ellipsoid region points
ml-glm: curve points
ml-decision-trees: region graph points
ml-bagging-rf: region graph
ml-adaboost: points region
ml-gradient-boosting: points curve chart
ml-svm-hard: region line points
ml-svm-soft: region points
ml-kernels: points surface plane
ml-gaussian-processes: curve points
ml-kmeans: points shape
ml-gmm-em: ellipsoid points
ml-pca: points plane arrow
ml-ica: chart curve points
ml-tsne-umap: points
ml-density-spectral: points graph
ml-hmm: graph tiles
ml-topic-models: tokens bars
ml-pac: chart curve
ml-vc: points line
ml-interpretability: bars arrow
ml-fairness: chart
dl-neuron: network beads
dl-perceptron: points line region
dl-perceptron-limits: points region
dl-mlp: network lattice region
dl-activations: curve
dl-universal-approx: curve
dl-losses: surface curve
dl-computational-graph: graph
dl-backprop: network graph
dl-autograd: graph code tiles
dl-pytorch: code graph chart
dl-gradient-check: table code
dl-training-loop: chart region
dl-optimizers: surface path chart
dl-init: chart
dl-vanishing: chart bars
dl-normalization: tensor
dl-regularization: network tiles
dl-modern-generalization: chart
dl-convolution: image tiles bars
dl-cnn: image tensor
dl-cnn-architectures: tensor graph
dl-resnet: graph
dl-efficient-cnns: tensor bars
dl-rnn: graph network
dl-lstm-gru: graph tiles tokens
dl-seq2seq: tokens graph
dl-attention: tokens tiles
dl-self-attention: tiles bars beads
dl-multihead: tiles tokens
dl-positional: tiles curve
dl-transformer-block: tiles bars graph
dl-transformer: tokens tiles
dl-autoencoders: points image
dl-gnn: graph
dl-neural-ode: path field
dl-adversarial: image bars
dl-interpretability: image
dl-compression: bars tiles
dl-history: timeline
cv-images: image
cv-transfer-learning: tensor graph
cv-detection-two-stage: image boxes
cv-detection-one-stage: image boxes tiles
cv-segmentation: image graph tensor
cv-vit: image tokens
cv-detr: boxes graph
cv-self-supervised: points image
cv-clip: tiles image tokens
cv-sam: image region
cv-nerf: line points surface
cv-gaussian-splatting: ellipsoid image
nlp-text-basics: tokens bars
nlp-ngram: tokens bars
nlp-subwords: tokens table
nlp-word2vec: points label
nlp-glove: tiles
nlp-rnn-lm: tokens graph bars
nlp-elmo: tokens arrow
nlp-bert: tokens bars
nlp-gpt: tokens tiles bars
nlp-t5: tokens
nlp-decoding: bars tokens
gen-intro: surface points
gen-autoregressive: image bars
gen-vae: points image
gen-vqvae: points line
gen-gan: points region
gen-wgan: bars beads
gen-gan-applications: image graph
gen-flows: lattice points surface
gen-score: field points path
gen-ddpm: points path
gen-ddim: points path
gen-sde: path
gen-guidance: field points
gen-latent-diffusion: points tokens tiles
gen-flow-matching: path points
rl-intro: gridworld
rl-bandits: bars chart
rl-mdp: graph
rl-bellman: gridworld
rl-dp: gridworld chart
rl-monte-carlo: gridworld
rl-td: gridworld
rl-q-learning: gridworld tiles
rl-function-approx: network gridworld
rl-dqn: timeline network
rl-policy-gradient: bars
rl-actor-critic: chart bars
rl-trpo-ppo: curve
rl-continuous: curve
rl-planning: graph
llm-icl: tokens chart
llm-scaling: chart
llm-architecture: arrow axes
llm-moe: tokens graph bars
llm-ssm: tokens tiles
llm-efficient-attention: tiles timeline
llm-quantization: tiles chart
llm-lora: tiles
llm-rlhf: chart bars
llm-dpo: chart curve
llm-reasoning: graph tokens
llm-rag: points tokens
llm-agents: graph timeline
sys-computer-basics: graph beads tokens
sys-floats: tokens
sys-gpu: shape tensor
sys-memory-hierarchy: graph beads chart
sys-matmul-kernel: tiles tensor
sys-attention-kernel: tiles timeline
sys-memory-budget: membar
sys-mixed-precision: chart tokens
sys-checkpointing: timeline membar
sys-collectives: graph
sys-data-parallel: graph membar
sys-zero-fsdp: membar
sys-tensor-parallel: tiles graph
sys-pipeline-parallel: timeline
sys-expert-sequence-parallel: graph tokens
sys-pretraining-data: graph tokens
sys-pretraining-run: chart
sys-post-training: tokens
sys-reasoning-rl: bars table
sys-evaluation: table
sys-inference-serving: tokens timeline
sys-circuits: tiles tokens
sys-features: arrow points
sys-build-gpt: chart tokens
sys-inside-gpt: tensor tiles network
`

/** topic id → the element types that draw its visual. */
export const COVERAGE: Record<string, string[]> = Object.fromEntries(
  MAP.trim()
    .split('\n')
    .map((l) => l.split(':'))
    .map(([k, v]) => [k.trim(), v.trim().split(/\s+/)]),
)
