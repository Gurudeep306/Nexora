# Notation for every AI course

One notation from Foundations to LLMs, so a student never has to re-learn
symbols. When a paper uses other symbols, show the paper's form once and map
it to ours. Based on the conventions of Goodfellow et al. (*Deep Learning*,
2016) and Deisenroth et al. (*Mathematics for Machine Learning*, 2020).

## Basics

| Thing | Write | Example |
|---|---|---|
| Scalar | italic lowercase | $x$, $\eta$, $\lambda$ |
| Vector (column by default) | bold lowercase | $\mathbf{x} \in \mathbb{R}^{d}$ |
| Matrix | bold uppercase | $\mathbf{W} \in \mathbb{R}^{m \times n}$ ($m$ rows, $n$ columns) |
| Tensor (3+ axes) | bold sans-serif | $\mathsf{X} \in \mathbb{R}^{B \times C \times H \times W}$ |
| Element | subscripts | $x_i$, $W_{ij}$ (row $i$, column $j$) |
| Transpose | $^\top$ | $\mathbf{x}^\top \mathbf{y}$ |
| Sets, spaces | blackboard / calligraphic | $\mathbb{R}$, $\mathcal{D}$ (a dataset) |
| Identity, zeros, ones | | $\mathbf{I}$, $\mathbf{0}$, $\mathbf{1}$ |
| Norm | | $\lVert \mathbf{x} \rVert_2$, $\lVert \mathbf{x} \rVert_1$ |
| Element-wise product | $\odot$ | $\mathbf{a} \odot \mathbf{b}$ |

## Data and models

| Thing | Write |
|---|---|
| Dataset of $N$ examples | $\mathcal{D} = \{(\mathbf{x}^{(i)}, y^{(i)})\}_{i=1}^{N}$ (superscript in brackets = example index) |
| Design matrix | $\mathbf{X} \in \mathbb{R}^{N \times d}$, one example per **row** |
| Prediction | $\hat{y}$, $\hat{\mathbf{y}}$ |
| Parameters (all) | $\boldsymbol{\theta}$ |
| Weights, bias of layer $\ell$ | $\mathbf{W}^{[\ell]} \in \mathbb{R}^{n_\ell \times n_{\ell-1}}$, $\mathbf{b}^{[\ell]} \in \mathbb{R}^{n_\ell}$ (square brackets = layer) |
| Pre-activation, activation | $\mathbf{z}^{[\ell]} = \mathbf{W}^{[\ell]} \mathbf{a}^{[\ell-1]} + \mathbf{b}^{[\ell]}$, $\mathbf{a}^{[\ell]} = \sigma(\mathbf{z}^{[\ell]})$, $\mathbf{a}^{[0]} = \mathbf{x}$ |
| Loss for one example, cost over data | $\ell(\hat{y}, y)$, $J(\boldsymbol{\theta}) = \frac{1}{N}\sum_i \ell(\hat{y}^{(i)}, y^{(i)})$ |
| Error signal in backprop | $\boldsymbol{\delta}^{[\ell]} = \partial J / \partial \mathbf{z}^{[\ell]}$ |
| Learning rate | $\eta$ |
| Regularisation strength | $\lambda$ |
| Batch size, sequence length, model width | $B$, $T$, $d_{\text{model}}$ |
| Attention | $\mathbf{Q}, \mathbf{K}, \mathbf{V}$, head size $d_k$; $\operatorname{softmax}(\mathbf{Q}\mathbf{K}^\top / \sqrt{d_k})\mathbf{V}$ |
| Tokens, vocabulary | $x_1, \dots, x_T$; $\mathcal{V}$, size $\lvert \mathcal{V} \rvert$ |

Code uses row vectors in batches (`X @ W.T + b`, shapes `(B, d)`); the math
uses column vectors for one example. Every lab says this once and shows both.

## Calculus

| Thing | Write |
|---|---|
| Derivative, partial | $\frac{df}{dx}$, $\frac{\partial f}{\partial x}$ |
| Gradient (same shape as the variable) | $\nabla_{\mathbf{x}} f \in \mathbb{R}^{d}$ |
| Jacobian of $\mathbf{f}: \mathbb{R}^n \to \mathbb{R}^m$ | $\mathbf{J} \in \mathbb{R}^{m \times n}$, $J_{ij} = \partial f_i / \partial x_j$ |
| Hessian | $\mathbf{H} = \nabla^2 f$, $H_{ij} = \partial^2 f / \partial x_i \partial x_j$ |
| Derivative by a matrix | same shape as the matrix (denominator layout for gradients) |

## Probability

| Thing | Write |
|---|---|
| Probability, density | $P(A)$, $p(x)$ |
| Random variable | uppercase $X$; its value lowercase $x$ |
| Distribution of a variable | $X \sim \mathcal{N}(\mu, \sigma^2)$, $\mathbf{x} \sim \mathcal{N}(\boldsymbol{\mu}, \boldsymbol{\Sigma})$ |
| Expectation, variance, covariance | $\mathbb{E}[X]$, $\operatorname{Var}[X]$, $\operatorname{Cov}[X, Y]$; with the distribution: $\mathbb{E}_{x \sim p}[f(x)]$ |
| Model with parameters | $p_{\boldsymbol{\theta}}(\mathbf{x})$, $p_{\boldsymbol{\theta}}(y \mid \mathbf{x})$ |
| Entropy, cross-entropy, KL | $H(p)$, $H(p, q)$, $D_{\mathrm{KL}}(p \,\Vert\, q)$ |
| Logarithm | $\log$ is natural log; bits are written $\log_2$ |

## Reinforcement learning

States $s \in \mathcal{S}$, actions $a \in \mathcal{A}$, reward $r$, discount
$\gamma$, policy $\pi(a \mid s)$, return $G_t$, values $V^\pi(s)$ and $Q^\pi(s, a)$,
advantage $A^\pi(s, a) = Q^\pi(s, a) - V^\pi(s)$ (Sutton & Barto, 2nd ed.).

## Generative models

Data $\mathbf{x}$, latent $\mathbf{z}$, encoder $q_{\boldsymbol{\phi}}(\mathbf{z} \mid \mathbf{x})$,
decoder $p_{\boldsymbol{\theta}}(\mathbf{x} \mid \mathbf{z})$. Diffusion: steps
$t = 1..T$, $\mathbf{x}_0$ data, $\mathbf{x}_T$ noise, $\beta_t$, $\alpha_t = 1 - \beta_t$,
$\bar\alpha_t = \prod_{s \le t} \alpha_s$, noise $\boldsymbol{\epsilon}$ (Ho et al., 2020).

## Colour of meaning in scenes and equations

The same idea has the same colour everywhere (design tokens only):
forward values = text ink; gradients = `state-info`; the thing being updated
or the current step = `accent-brand`; errors and loss = `state-error`;
correct/converged = `state-success`. Clay is never text.
