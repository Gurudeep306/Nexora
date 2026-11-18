# Curriculum

Generated from `curriculum.json` by `node scripts/ai-courses/check-curriculum.mjs`. Edit the JSON, not this file.

The courses are in teaching order. Every topic builds only on topics above it ("Builds on"), so a student can start at the first line knowing nothing and reach the last. Topics marked **GATE DA** are in the GATE Data Science & AI syllabus.

200 topics · 9 courses · 210 papers

- [0. Foundations](#0-foundations)
- [1. Math for AI](#1-math-for-ai)
- [2. Machine Learning](#2-machine-learning)
- [3. Deep Learning](#3-deep-learning)
- [4. Computer Vision](#4-computer-vision)
- [5. Natural Language Processing](#5-natural-language-processing)
- [6. Generative Models](#6-generative-models)
- [7. Reinforcement Learning](#7-reinforcement-learning)
- [8. Large Language Models](#8-large-language-models)

## 0. Foundations

School maths and Python, up to exactly what the rest needs. Nobody is assumed to know anything.

Nexus subject: `calc`

### 0.1 Numbers and functions

- **Numbers, sets and intervals** `f-numbers`
- **Functions and their graphs** `f-functions`
  - Builds on: Numbers, sets and intervals
  - See it: Drag x and watch f(x) trace the graph
- **Exponents, logarithms and e** `f-exp-log`
  - Builds on: Functions and their graphs
  - See it: e^x and ln x as mirror images; why log turns products into sums
- **Sums, products and their notation** `f-sums`
  - Builds on: Numbers, sets and intervals
  - See it: Σ unrolled term by term

### 0.2 Python and NumPy

- **Python for maths** `f-python`
  - Builds on: Functions and their graphs
  - See it: Run each line and see the variables change
- **NumPy arrays, shapes and broadcasting** `f-numpy`
  - Builds on: Python for maths; Sums, products and their notation
  - See it: Arrays as grids; broadcasting stretching a row over a matrix

### 0.3 First look at learning

- **Data: examples, features and labels** `f-data`
  - Builds on: NumPy arrays, shapes and broadcasting
  - See it: A table becomes points on a plot
- **What does it mean to learn from data?** `f-what-is-learning`
  - Builds on: Data: examples, features and labels
  - See it: Fit a line by hand; the error shrinks as you drag

## 1. Math for AI

Linear algebra, calculus, probability, statistics, information theory and optimisation, each built from the one before.

Nexus subject: `prob`

### 1.1 Vectors and matrices

- **Vectors: arrows and lists** `m-vectors` · GATE DA
  - Builds on: NumPy arrays, shapes and broadcasting
  - See it: Arrows add tip to tail in 2D and 3D
- **Dot product, length, angle and projection** `m-dot` · GATE DA
  - Builds on: Vectors: arrows and lists
  - See it: Projection of one arrow on another, the shadow length = dot product
- **Norms and distances** `m-norms` · GATE DA
  - Builds on: Dot product, length, angle and projection
  - See it: L1, L2, L∞ unit balls in 2D and 3D
- **Matrices: tables and maps** `m-matrices` · GATE DA
  - Builds on: Dot product, length, angle and projection
  - See it: A matrix bending a grid of space (3D)
- **Matrix multiplication, step by step** `m-matmul` · GATE DA
  - Builds on: Matrices: tables and maps
  - See it: Row × column cell by cell; then as composing two maps
- **Linear systems and Gaussian elimination** `m-systems` · GATE DA
  - Builds on: Matrix multiplication, step by step
  - See it: Row operations one at a time; planes meeting at a point (3D)
- **Span, independence, basis and rank** `m-rank` · GATE DA
  - Builds on: Linear systems and Gaussian elimination
  - See it: Vectors spanning a line, a plane, all of space (3D)
- **Inverse and determinant** `m-inverse-det` · GATE DA
  - Builds on: Span, independence, basis and rank
  - See it: Determinant as the area/volume a map scales by (3D)
- **Orthogonality, Gram–Schmidt and projections** `m-orthogonality` · GATE DA
  - Builds on: Span, independence, basis and rank
  - See it: Gram–Schmidt straightening vectors one by one
- **Eigenvalues and eigenvectors** `m-eigen` · GATE DA
  - Builds on: Inverse and determinant
  - See it: Vectors that stay on their line while the grid bends
- **Symmetric matrices, quadratic forms, positive definite** `m-symmetric` · GATE DA
  - Builds on: Eigenvalues and eigenvectors; Orthogonality, Gram–Schmidt and projections
  - See it: A quadratic form as a 3D bowl or saddle; its axes = eigenvectors
- **Singular value decomposition** `m-svd` · GATE DA
  - Builds on: Symmetric matrices, quadratic forms, positive definite
  - See it: Rotate, stretch, rotate: a circle becomes an ellipse; image compression by rank

### 1.2 Calculus

- **Limits and continuity** `m-limits` · GATE DA
  - Builds on: Functions and their graphs
  - See it: Zooming in on a point until the curve looks straight
- **The derivative** `m-derivative` · GATE DA
  - Builds on: Limits and continuity
  - See it: Secant turning into the tangent as h → 0
- **Rules: sum, product, quotient, chain** `m-derivative-rules` · GATE DA
  - Builds on: The derivative; Exponents, logarithms and e
  - See it: The chain rule as gears turning at different speeds
- **Taylor series and approximations** `m-taylor` · GATE DA
  - Builds on: Rules: sum, product, quotient, chain
  - See it: Polynomials hugging a curve, one term at a time
- **Integrals and area** `m-integrals` · GATE DA
  - Builds on: The derivative
  - See it: Rectangles filling the area as they get thinner
- **Partial derivatives and the gradient** `m-partial` · GATE DA
  - Builds on: Rules: sum, product, quotient, chain; Vectors: arrows and lists
  - See it: A 3D surface sliced along x and along y
- **Directional derivatives and steepest ascent** `m-directional` · GATE DA
  - Builds on: Partial derivatives and the gradient; Dot product, length, angle and projection
  - See it: The gradient arrow on a 3D hill, always pointing uphill
- **The Jacobian** `m-jacobian`
  - Builds on: Partial derivatives and the gradient; Matrix multiplication, step by step
  - See it: A small square mapped to a parallelogram; the Jacobian is that map
- **The Hessian and curvature** `m-hessian`
  - Builds on: The Jacobian; Symmetric matrices, quadratic forms, positive definite
  - See it: Bowl, ridge and saddle from the Hessian's eigenvalues (3D)
- **Matrix calculus: derivatives by vectors and matrices** `m-matrix-calculus`
  - Builds on: The Jacobian
  - See it: Shapes check: every derivative's shape drawn before it is computed
- **The chain rule in many variables and computational graphs** `m-multivariate-chain`
  - Builds on: Matrix calculus: derivatives by vectors and matrices
  - See it: A graph of operations, values forward, derivatives back
  - Papers: Baydin et al. 2015, *Automatic differentiation in machine learning: a survey*

### 1.3 Probability

- **Probability: events and axioms** `m-prob-basics` · GATE DA
  - Builds on: Sums, products and their notation
  - See it: Sample space as a grid of outcomes; events shaded
- **Conditional probability and Bayes' rule** `m-conditional` · GATE DA
  - Builds on: Probability: events and axioms
  - See it: A population split twice; Bayes as reading the tree backwards
- **Random variables and distributions** `m-random-variables` · GATE DA
  - Builds on: Conditional probability and Bayes' rule
  - See it: Outcomes mapped to numbers; the histogram builds as you sample
- **Expectation and variance** `m-expectation` · GATE DA
  - Builds on: Random variables and distributions; Integrals and area
  - See it: The balance point of a distribution; spread as the moment of inertia
- **Common distributions** `m-distributions` · GATE DA
  - Builds on: Expectation and variance
  - See it: Bernoulli to binomial to Gaussian as n grows
- **Joint, marginal, independence, covariance** `m-joint` · GATE DA
  - Builds on: Expectation and variance
  - See it: A 3D joint density with its two shadows (the marginals)
- **The multivariate Gaussian** `m-multivariate-gaussian` · GATE DA
  - Builds on: Joint, marginal, independence, covariance; Symmetric matrices, quadratic forms, positive definite
  - See it: Covariance as an ellipse; eigenvectors as its axes (3D bell)
- **Law of large numbers and the central limit theorem** `m-lln-clt` · GATE DA
  - Builds on: Common distributions
  - See it: Averages of dice settling, and their histogram turning Gaussian

### 1.4 Statistics

- **Estimation and maximum likelihood** `m-estimation` · GATE DA
  - Builds on: Common distributions; Rules: sum, product, quotient, chain
  - See it: The likelihood curve peaking at the estimate as data arrives
- **Priors, posteriors and MAP** `m-map-bayesian` · GATE DA
  - Builds on: Estimation and maximum likelihood; Conditional probability and Bayes' rule
  - See it: Prior × likelihood = posterior, updated point by point
- **Confidence intervals and hypothesis tests** `m-hypothesis` · GATE DA
  - Builds on: Law of large numbers and the central limit theorem
  - See it: Intervals from repeated samples; how many cover the truth
- **Monte Carlo and MCMC** `m-sampling-mc`
  - Builds on: Law of large numbers and the central limit theorem; Conditional probability and Bayes' rule
  - See it: A Metropolis walker exploring a 2D density
  - Papers: Metropolis et al. 1953, *Equation of State Calculations by Fast Computing Machines*; Hastings 1970, *Monte Carlo sampling methods using Markov chains and their applications*

### 1.5 Information theory

- **Entropy** `m-entropy`
  - Builds on: Expectation and variance; Exponents, logarithms and e
  - See it: Coding a message: surprise in bits per symbol
  - Papers: Shannon 1948, *A Mathematical Theory of Communication*
- **Cross-entropy and KL divergence** `m-cross-entropy-kl`
  - Builds on: Entropy
  - See it: Two distributions and the area of their mismatch
  - Papers: Kullback, Leibler 1951, *On Information and Sufficiency*
- **Mutual information** `m-mutual-information`
  - Builds on: Cross-entropy and KL divergence; Joint, marginal, independence, covariance
  - See it: Venn of H(X), H(Y) and what they share

### 1.6 Optimisation

- **Minima, critical points and convexity in one variable** `m-opt-basics` · GATE DA
  - Builds on: Rules: sum, product, quotient, chain; Taylor series and approximations
  - See it: Rolling a ball into a valley; local vs global
- **Convex sets and functions** `m-convexity`
  - Builds on: Minima, critical points and convexity in one variable; The Hessian and curvature
  - See it: Chords above the curve; convex vs non-convex surfaces (3D)
- **Gradient descent** `m-gradient-descent` · GATE DA
  - Builds on: Directional derivatives and steepest ascent; Minima, critical points and convexity in one variable
  - See it: A ball stepping down a 3D loss surface, each step's numbers shown
- **Why gradient descent converges, and step sizes** `m-gd-convergence`
  - Builds on: Gradient descent; Convex sets and functions; Eigenvalues and eigenvectors
  - See it: Too small, right, too large: three paths on an elongated bowl
- **Newton's method** `m-newton`
  - Builds on: The Hessian and curvature; Gradient descent
  - See it: Each step jumps to the bottom of the local parabola
- **Lagrange multipliers, KKT and duality** `m-constrained`
  - Builds on: Convex sets and functions
  - See it: Level curves touching the constraint; gradients lining up
- **Stochastic gradient descent** `m-sgd`
  - Builds on: Gradient descent; Expectation and variance
  - See it: Noisy steps from mini-batches vs full-batch steps
  - Papers: Robbins, Monro 1951, *A Stochastic Approximation Method*
- **Momentum** `m-momentum`
  - Builds on: Stochastic gradient descent
  - See it: A heavy ball vs a light one in a narrow valley (3D)
  - Papers: Polyak 1964, *Some methods of speeding up the convergence of iteration methods*
- **AdaGrad, RMSProp, Adam and AdamW** `m-adaptive`
  - Builds on: Momentum
  - See it: Four optimisers racing on the same 3D surface
  - Papers: Duchi, Hazan, Singer 2011, *Adaptive Subgradient Methods for Online Learning and Stochastic Optimization*; Kingma, Ba 2014, *Adam: A Method for Stochastic Optimization*; Loshchilov, Hutter 2017, *Decoupled Weight Decay Regularization*
- **Learning-rate schedules and warm-up** `m-lr-schedules`
  - Builds on: AdaGrad, RMSProp, Adam and AdamW
  - See it: Loss curves under each schedule
  - Papers: Loshchilov, Hutter 2016, *SGDR: Stochastic Gradient Descent with Warm Restarts*
- **Variational inference and the ELBO** `m-variational`
  - Builds on: Cross-entropy and KL divergence; Priors, posteriors and MAP
  - See it: A simple distribution stretching to fit a complex one
  - Papers: Blei, Kucukelbir, McAuliffe 2016, *Variational Inference: A Review for Statisticians*

## 2. Machine Learning

From fitting a line to ensembles, kernels, unsupervised learning and learning theory.

Nexus subject: `ml`

### 2.1 Learning from data

- **Supervised and unsupervised learning; training and test data** `ml-what-is-ml` · GATE DA
  - Builds on: What does it mean to learn from data?; Estimation and maximum likelihood
  - See it: Data split into train and test, and what each is for
- **Loss functions and empirical risk** `ml-loss-risk` · GATE DA
  - Builds on: Supervised and unsupervised learning; training and test data; Expectation and variance
  - See it: Each point's loss as a bar; the risk is their average

### 2.2 Linear regression

- **Fitting a line: least squares by calculus** `ml-linreg-1d` · GATE DA
  - Builds on: Loss functions and empirical risk; Rules: sum, product, quotient, chain
  - See it: Residuals as squares whose total area shrinks
- **Many features: the normal equations and their geometry** `ml-linreg-normal` · GATE DA
  - Builds on: Fitting a line: least squares by calculus; Orthogonality, Gram–Schmidt and projections; Matrix calculus: derivatives by vectors and matrices
  - See it: y projected onto the column space (3D)
- **Linear regression by gradient descent** `ml-linreg-gd` · GATE DA
  - Builds on: Many features: the normal equations and their geometry; Gradient descent
  - See it: The line moving as the ball moves on the loss surface (3D)
- **The probabilistic view: Gaussian noise and MLE** `ml-linreg-prob` · GATE DA
  - Builds on: Many features: the normal equations and their geometry; Estimation and maximum likelihood
  - See it: Each point with its Gaussian bump around the line
- **Features: polynomials, basis functions and scaling** `ml-features` · GATE DA
  - Builds on: Linear regression by gradient descent
  - See it: The same data fitted with degree 1, 3, 9

### 2.3 Generalisation

- **Overfitting, validation and cross-validation** `ml-overfitting` · GATE DA
  - Builds on: Features: polynomials, basis functions and scaling
  - See it: Train and test error curves crossing; k folds rotating
- **The bias–variance trade-off** `ml-bias-variance` · GATE DA
  - Builds on: Overfitting, validation and cross-validation; Expectation and variance
  - See it: Many fits from many samples: spread vs offset
  - Papers: Geman, Bienenstock, Doursat 1992, *Neural Networks and the Bias/Variance Dilemma*; Belkin et al. 2019, *Reconciling modern machine learning practice and the bias-variance trade-off*
- **Ridge, lasso and elastic net** `ml-regularization` · GATE DA
  - Builds on: The bias–variance trade-off; Priors, posteriors and MAP; Lagrange multipliers, KKT and duality
  - See it: Loss contours meeting the L2 circle vs the L1 diamond
  - Papers: Hoerl, Kennard 1970, *Ridge Regression: Biased Estimation for Nonorthogonal Problems*; Tibshirani 1996, *Regression Shrinkage and Selection via the Lasso*; Zou, Hastie 2005, *Regularization and variable selection via the elastic net*

### 2.4 Classification

- **Classification and decision boundaries** `ml-classification-intro` · GATE DA
  - Builds on: Overfitting, validation and cross-validation
  - See it: Points of two colours and a line between them
- **Logistic regression, derived** `ml-logistic` · GATE DA
  - Builds on: Classification and decision boundaries; Cross-entropy and KL divergence; Gradient descent
  - See it: The sigmoid surface over the plane (3D); the boundary at 0.5
  - Papers: Cox 1958, *The Regression Analysis of Binary Sequences*
- **Many classes: softmax regression** `ml-softmax-regression`
  - Builds on: Logistic regression, derived; The Jacobian
  - See it: Scores to probabilities, row by row
- **Accuracy, precision, recall, ROC and calibration** `ml-metrics` · GATE DA
  - Builds on: Classification and decision boundaries
  - See it: Moving the threshold and the ROC point moving with it
- **k-nearest neighbours** `ml-knn` · GATE DA
  - Builds on: Classification and decision boundaries; Norms and distances
  - See it: Regions changing as k changes
  - Papers: Cover, Hart 1967, *Nearest neighbor pattern classification*
- **Naive Bayes** `ml-naive-bayes` · GATE DA
  - Builds on: Classification and decision boundaries; Conditional probability and Bayes' rule
  - See it: Word counts turning into a spam probability
- **Gaussian discriminant analysis (LDA and QDA)** `ml-lda-qda` · GATE DA
  - Builds on: Naive Bayes; The multivariate Gaussian
  - See it: Two Gaussian ellipses and the boundary between them
- **Exponential families and generalised linear models** `ml-glm`
  - Builds on: Logistic regression, derived; The probabilistic view: Gaussian noise and MLE
  - See it: One recipe producing linear, logistic and Poisson regression

### 2.5 Trees and ensembles

- **Decision trees: impurity, entropy and splits** `ml-decision-trees` · GATE DA
  - Builds on: Classification and decision boundaries; Entropy
  - See it: The plane cut into boxes, split by split, with the tree growing beside it
  - Papers: Quinlan 1986, *Induction of decision trees*
- **Bagging and random forests** `ml-bagging-rf`
  - Builds on: Decision trees: impurity, entropy and splits; The bias–variance trade-off
  - See it: Many trees voting; the vote map smoothing out
  - Papers: Breiman 1996, *Bagging predictors*; Breiman 2001, *Random Forests*
- **Boosting and AdaBoost** `ml-adaboost`
  - Builds on: Decision trees: impurity, entropy and splits
  - See it: Misclassified points growing in weight each round
  - Papers: Freund, Schapire 1997, *A Decision-Theoretic Generalization of On-Line Learning and an Application to Boosting*
- **Gradient boosting, XGBoost, LightGBM and CatBoost** `ml-gradient-boosting`
  - Builds on: Boosting and AdaBoost; Gradient descent; Taylor series and approximations
  - See it: Each new tree fitting the residuals left by the last
  - Papers: Friedman 2001, *Greedy function approximation: A gradient boosting machine*; Chen, Guestrin 2016, *XGBoost: A Scalable Tree Boosting System*; Ke et al. 2017, *LightGBM: A Highly Efficient Gradient Boosting Decision Tree*; Prokhorenkova et al. 2017, *CatBoost: unbiased boosting with categorical features*

### 2.6 Kernels and SVMs

- **Maximum-margin classifiers** `ml-svm-hard` · GATE DA
  - Builds on: Logistic regression, derived; Lagrange multipliers, KKT and duality
  - See it: The widest street between two classes; support vectors lit
  - Papers: Boser, Guyon, Vapnik 1992, *A training algorithm for optimal margin classifiers*
- **Soft margins and the hinge loss** `ml-svm-soft` · GATE DA
  - Builds on: Maximum-margin classifiers
  - See it: C slider trading margin for mistakes
  - Papers: Cortes, Vapnik 1995, *Support-vector networks*
- **The kernel trick** `ml-kernels`
  - Builds on: Soft margins and the hinge loss; Symmetric matrices, quadratic forms, positive definite
  - See it: Points lifted into 3D where a plane separates them
- **Gaussian processes** `ml-gaussian-processes`
  - Builds on: The kernel trick; The multivariate Gaussian
  - See it: Functions drawn from a prior, then pinned by data

### 2.7 Unsupervised learning

- **k-means clustering** `ml-kmeans` · GATE DA
  - Builds on: Supervised and unsupervised learning; training and test data; Norms and distances
  - See it: Centres moving and points re-colouring, step by step
  - Papers: Lloyd 1982, *Least squares quantization in PCM*
- **Gaussian mixtures and the EM algorithm** `ml-gmm-em`
  - Builds on: k-means clustering; The multivariate Gaussian; Estimation and maximum likelihood
  - See it: Soft ellipses fitting the clusters, E and M steps
  - Papers: Dempster, Laird, Rubin 1977, *Maximum Likelihood from Incomplete Data via the EM Algorithm*
- **Principal component analysis** `ml-pca` · GATE DA
  - Builds on: Singular value decomposition; The multivariate Gaussian
  - See it: A 3D cloud and the plane that keeps the most variance
  - Papers: Pearson 1901, *On lines and planes of closest fit to systems of points in space*; Hotelling 1933, *Analysis of a complex of statistical variables into principal components*
- **Independent component analysis** `ml-ica`
  - Builds on: Principal component analysis
  - See it: Two mixed signals pulled apart
  - Papers: Hyvärinen, Oja 2000, *Independent component analysis: algorithms and applications*
- **t-SNE and UMAP** `ml-tsne-umap`
  - Builds on: Principal component analysis; Cross-entropy and KL divergence
  - See it: A high-dimensional dataset settling into a 2D map
  - Papers: van der Maaten, Hinton 2008, *Visualizing Data using t-SNE*; McInnes, Healy, Melville 2018, *UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction*
- **Density-based and spectral clustering** `ml-density-spectral`
  - Builds on: k-means clustering; Eigenvalues and eigenvectors
  - See it: Rings that k-means splits wrong and spectral clustering gets right
  - Papers: Ester et al. 1996, *A density-based algorithm for discovering clusters in large spatial databases with noise*; von Luxburg 2007, *A Tutorial on Spectral Clustering*
- **Hidden Markov models** `ml-hmm`
  - Builds on: Gaussian mixtures and the EM algorithm; Conditional probability and Bayes' rule
  - See it: The trellis: forward probabilities filling column by column
  - Papers: Rabiner 1989, *A tutorial on hidden Markov models and selected applications in speech recognition*
- **Topic models (LDA)** `ml-topic-models`
  - Builds on: Gaussian mixtures and the EM algorithm; Variational inference and the ELBO
  - See it: Documents as mixtures of topics, words coloured by topic
  - Papers: Blei, Ng, Jordan 2003, *Latent Dirichlet Allocation*

### 2.8 Learning theory

- **PAC learning** `ml-pac`
  - Builds on: Overfitting, validation and cross-validation; Probability: events and axioms
  - See it: How many samples until the error is small with high probability
  - Papers: Valiant 1984, *A theory of the learnable*
- **VC dimension and uniform convergence** `ml-vc`
  - Builds on: PAC learning
  - See it: Shattering 3 points with a line, failing on 4
  - Papers: Vapnik, Chervonenkis 1971, *On the Uniform Convergence of Relative Frequencies of Events to Their Probabilities*

### 2.9 In practice

- **Explaining models: importance, LIME and SHAP** `ml-interpretability`
  - Builds on: Gradient boosting, XGBoost, LightGBM and CatBoost
  - See it: SHAP values as forces pushing one prediction
  - Papers: Ribeiro, Singh, Guestrin 2016, *"Why Should I Trust You?": Explaining the Predictions of Any Classifier*; Lundberg, Lee 2017, *A Unified Approach to Interpreting Model Predictions*
- **Fairness and its measures** `ml-fairness`
  - Builds on: Accuracy, precision, recall, ROC and calibration
  - See it: Two groups' ROC curves and the thresholds that equalise them
  - Papers: Hardt, Price, Srebro 2016, *Equality of Opportunity in Supervised Learning*

## 3. Deep Learning

From one neuron to the transformer, with every gradient derived.

Nexus subject: `deep`

### 3.1 One neuron

- **The artificial neuron** `dl-neuron` · GATE DA
  - Builds on: Logistic regression, derived
  - See it: Inputs × weights + bias → activation, every number shown
  - Papers: McCulloch, Pitts 1943, *A logical calculus of the ideas immanent in nervous activity*
- **The perceptron and its learning rule** `dl-perceptron` · GATE DA
  - Builds on: The artificial neuron
  - See it: The boundary rotating with each mistake; the convergence proof step by step
  - Papers: Rosenblatt 1958, *The perceptron: A probabilistic model for information storage and organization in the brain*
- **What one neuron can't do: XOR** `dl-perceptron-limits`
  - Builds on: The perceptron and its learning rule
  - See it: XOR points no line can separate

### 3.2 Networks

- **Layers: the multilayer perceptron** `dl-mlp` · GATE DA
  - Builds on: What one neuron can't do: XOR; Matrix multiplication, step by step
  - See it: A 2-layer net in 3D bending the plane until XOR separates
- **Activation functions** `dl-activations` · GATE DA
  - Builds on: Layers: the multilayer perceptron
  - See it: Sigmoid, tanh, ReLU, GELU and their derivatives side by side
  - Papers: Hendrycks, Gimpel 2016, *Gaussian Error Linear Units (GELUs)*
- **Universal approximation** `dl-universal-approx`
  - Builds on: Activation functions
  - See it: Bumps of ReLUs adding up to any curve
  - Papers: Cybenko 1989, *Approximation by superpositions of a sigmoidal function*; Hornik, Stinchcombe, White 1989, *Multilayer feedforward networks are universal approximators*
- **Loss functions as likelihoods** `dl-losses`
  - Builds on: Layers: the multilayer perceptron; Many classes: softmax regression
  - See it: MSE and cross-entropy surfaces for one output

### 3.3 Backpropagation

- **Computational graphs** `dl-computational-graph`
  - Builds on: The chain rule in many variables and computational graphs; Layers: the multilayer perceptron
  - See it: The net as a graph of operations, values flowing forward
  - Papers: Baydin et al. 2015, *Automatic differentiation in machine learning: a survey*
- **Backpropagation, derived in full** `dl-backprop` · GATE DA
  - Builds on: Computational graphs; Loss functions as likelihoods
  - See it: Gradients flowing back node by node, every number shown (2D and 3D)
  - Papers: Rumelhart, Hinton, Williams 1986, *Learning representations by back-propagating errors*
- **Build an autograd engine** `dl-autograd`
  - Builds on: Backpropagation, derived in full
  - See it: Your own engine's tape replayed step by step
- **Checking gradients numerically** `dl-gradient-check`
  - Builds on: Backpropagation, derived in full
  - See it: Finite differences next to backprop, digit by digit

### 3.4 Training

- **The training loop: mini-batches and epochs** `dl-training-loop`
  - Builds on: Backpropagation, derived in full; Stochastic gradient descent
  - See it: The loss curve and the decision boundary moving together
- **Optimisers in practice** `dl-optimizers`
  - Builds on: The training loop: mini-batches and epochs; AdaGrad, RMSProp, Adam and AdamW
  - See it: The same net trained with SGD, momentum and Adam
  - Papers: Kingma, Ba 2014, *Adam: A Method for Stochastic Optimization*; Loshchilov, Hutter 2017, *Decoupled Weight Decay Regularization*
- **Weight initialisation: Xavier and He, derived** `dl-init`
  - Builds on: The training loop: mini-batches and epochs; Expectation and variance
  - See it: Activation histograms layer by layer for bad vs good init
  - Papers: Glorot, Bengio 2010, *Understanding the difficulty of training deep feedforward neural networks*; He et al. 2015, *Delving Deep into Rectifiers: Surpassing Human-Level Performance on ImageNet Classification*
- **Vanishing and exploding gradients** `dl-vanishing`
  - Builds on: Weight initialisation: Xavier and He, derived
  - See it: Gradient size per layer shrinking or blowing up
  - Papers: Bengio, Simard, Frasconi 1994, *Learning long-term dependencies with gradient descent is difficult*; Pascanu, Mikolov, Bengio 2013, *On the difficulty of training Recurrent Neural Networks*
- **Batch normalisation and layer normalisation** `dl-normalization`
  - Builds on: Vanishing and exploding gradients
  - See it: Which axis each one averages over, drawn on the tensor
  - Papers: Ioffe, Szegedy 2015, *Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift*; Ba, Kiros, Hinton 2016, *Layer Normalization*
- **Weight decay, dropout, early stopping, augmentation** `dl-regularization`
  - Builds on: The training loop: mini-batches and epochs; Ridge, lasso and elastic net
  - See it: Dropout masks changing each step; the ensemble it implies
  - Papers: Hinton et al. 2012, *Improving neural networks by preventing co-adaptation of feature detectors*; Srivastava et al. 2014, *Dropout: A Simple Way to Prevent Neural Networks from Overfitting*
- **Double descent and the lottery ticket** `dl-modern-generalization`
  - Builds on: Weight decay, dropout, early stopping, augmentation; The bias–variance trade-off
  - See it: Test error rising then falling again as width grows
  - Papers: Belkin et al. 2019, *Reconciling modern machine learning practice and the bias-variance trade-off*; Frankle, Carbin 2018, *The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks*

### 3.5 Convolutional networks

- **Convolution, from scratch** `dl-convolution` · GATE DA
  - Builds on: Layers: the multilayer perceptron
  - See it: A kernel sliding over an image, each output computed in view
  - Papers: Fukushima 1980, *Neocognitron*
- **Convolutional networks and pooling; backprop through a convolution** `dl-cnn`
  - Builds on: Convolution, from scratch; Backpropagation, derived in full
  - See it: Feature maps as stacked slabs (3D); draw a digit and watch
  - Papers: LeCun et al. 1998, *Gradient-based learning applied to document recognition*
- **AlexNet, VGG and Inception** `dl-cnn-architectures`
  - Builds on: Convolutional networks and pooling; backprop through a convolution; Batch normalisation and layer normalisation
  - See it: The architectures to scale in 3D; what each layer sees
  - Papers: Krizhevsky, Sutskever, Hinton 2012, *ImageNet Classification with Deep Convolutional Neural Networks*; Deng et al. 2009, *ImageNet: A large-scale hierarchical image database*; Simonyan, Zisserman 2014, *Very Deep Convolutional Networks for Large-Scale Image Recognition*; Szegedy et al. 2014, *Going Deeper with Convolutions*; Zeiler, Fergus 2014, *Visualizing and Understanding Convolutional Networks*
- **Residual networks** `dl-resnet`
  - Builds on: AlexNet, VGG and Inception; Vanishing and exploding gradients
  - See it: Gradient paths with and without the skip connection
  - Papers: He et al. 2016, *Deep Residual Learning for Image Recognition*; He et al. 2016, *Identity Mappings in Deep Residual Networks*; Huang et al. 2017, *Densely Connected Convolutional Networks*
- **Efficient CNNs: depthwise convolutions and scaling** `dl-efficient-cnns`
  - Builds on: Residual networks
  - See it: Cost of a normal vs a depthwise convolution, counted
  - Papers: Howard et al. 2017, *MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications*; Tan, Le 2019, *EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks*

### 3.6 Sequence models

- **Recurrent networks and backprop through time** `dl-rnn`
  - Builds on: Backpropagation, derived in full; Vanishing and exploding gradients
  - See it: The network unrolled over time, gradients flowing back
- **LSTM and GRU** `dl-lstm-gru`
  - Builds on: Recurrent networks and backprop through time
  - See it: The cell's gates opening and closing on a sequence
  - Papers: Hochreiter, Schmidhuber 1997, *Long Short-Term Memory*; Cho et al. 2014, *Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation*
- **Sequence to sequence** `dl-seq2seq`
  - Builds on: LSTM and GRU
  - See it: Encoder squeezing a sentence; decoder unfolding it
  - Papers: Sutskever, Vinyals, Le 2014, *Sequence to Sequence Learning with Neural Networks*
- **Attention** `dl-attention`
  - Builds on: Sequence to sequence; Many classes: softmax regression
  - See it: The alignment matrix filling as each word is translated
  - Papers: Bahdanau, Cho, Bengio 2014, *Neural Machine Translation by Jointly Learning to Align and Translate*; Luong, Pham, Manning 2015, *Effective Approaches to Attention-based Neural Machine Translation*

### 3.7 Transformers

- **Self-attention, and why we divide by √d** `dl-self-attention`
  - Builds on: Attention
  - See it: Q·K scores, softmax, weighted sum of V, every number
- **Multi-head attention** `dl-multihead`
  - Builds on: Self-attention, and why we divide by √d
  - See it: Each head's attention pattern on the same sentence
- **Positional encodings** `dl-positional`
  - Builds on: Multi-head attention
  - See it: Sine waves of position as a heat map; dot products by distance
- **The transformer block: residuals, layer norm, feed-forward** `dl-transformer-block`
  - Builds on: Multi-head attention; Batch normalisation and layer normalisation; Residual networks
  - See it: A token's vector through one block, piece by piece (3D)
  - Papers: Vaswani et al. 2017, *Attention Is All You Need*; Xiong et al. 2020, *On Layer Normalization in the Transformer Architecture*
- **The full transformer: encoder, decoder, masking, training** `dl-transformer`
  - Builds on: The transformer block: residuals, layer norm, feed-forward; Positional encodings
  - See it: Masked attention, then the decoder generating word by word
  - Papers: Vaswani et al. 2017, *Attention Is All You Need*

### 3.8 More architectures

- **Autoencoders and denoising autoencoders** `dl-autoencoders`
  - Builds on: The training loop: mini-batches and epochs; Principal component analysis
  - See it: A 3D bottleneck space of digits
  - Papers: Hinton, Salakhutdinov 2006, *Reducing the Dimensionality of Data with Neural Networks*; Vincent et al. 2008, *Extracting and composing robust features with denoising autoencoders*
- **Graph neural networks: message passing, GCN, GAT** `dl-gnn`
  - Builds on: Layers: the multilayer perceptron; Eigenvalues and eigenvectors
  - See it: Messages passing along edges, round by round
  - Papers: Kipf, Welling 2016, *Semi-Supervised Classification with Graph Convolutional Networks*; Hamilton, Ying, Leskovec 2017, *Inductive Representation Learning on Large Graphs*; Veličković et al. 2017, *Graph Attention Networks*; Gilmer et al. 2017, *Neural Message Passing for Quantum Chemistry*; Xu et al. 2018, *How Powerful are Graph Neural Networks?*
- **Neural ODEs** `dl-neural-ode`
  - Builds on: Residual networks
  - See it: A ResNet's steps shrinking into a smooth flow
  - Papers: Chen et al. 2018, *Neural Ordinary Differential Equations*

### 3.9 Robust and explainable

- **Adversarial examples and robust training** `dl-adversarial`
  - Builds on: Backpropagation, derived in full
  - See it: A tiny pixel change flipping the prediction, the gradient that made it
  - Papers: Szegedy et al. 2013, *Intriguing properties of neural networks*; Goodfellow, Shlens, Szegedy 2014, *Explaining and Harnessing Adversarial Examples*; Madry et al. 2017, *Towards Deep Learning Models Resistant to Adversarial Attacks*
- **Saliency, Grad-CAM and integrated gradients** `dl-interpretability`
  - Builds on: Convolutional networks and pooling; backprop through a convolution
  - See it: Heat maps of what the network looked at
  - Papers: Selvaraju et al. 2016, *Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization*; Sundararajan, Taly, Yan 2017, *Axiomatic Attribution for Deep Networks*
- **Distillation and pruning** `dl-compression`
  - Builds on: The training loop: mini-batches and epochs
  - See it: Soft targets vs hard labels; weights removed and accuracy kept
  - Papers: Hinton, Vinyals, Dean 2015, *Distilling the Knowledge in a Neural Network*; Frankle, Carbin 2018, *The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks*

### 3.10 Looking back

- **How deep learning happened** `dl-history`
  - Builds on: The full transformer: encoder, decoder, masking, training
  - See it: The paper map as a timeline
  - Papers: LeCun, Bengio, Hinton 2015, *Deep learning*; Schmidhuber 2015, *Deep Learning in Neural Networks: An Overview*; Hopfield 1982, *Neural networks and physical systems with emergent collective computational abilities*; Hinton, Osindero, Teh 2006, *A Fast Learning Algorithm for Deep Belief Nets*

## 4. Computer Vision

Images, detection, segmentation, vision transformers, self-supervised learning, 3D scenes.

Nexus subject: `computer-vision`

### 4.1 Images

- **Images as tensors; classical filters** `cv-images`
  - Builds on: Convolution, from scratch
  - See it: An image's channels pulled apart in 3D; edges from filters
- **Transfer learning and fine-tuning** `cv-transfer-learning`
  - Builds on: Residual networks
  - See it: Frozen layers and the new head training

### 4.2 Detection

- **Object detection: R-CNN to Faster R-CNN** `cv-detection-two-stage`
  - Builds on: Transfer learning and fine-tuning
  - See it: Proposals, then boxes refined; IoU computed
  - Papers: Girshick et al. 2013, *Rich feature hierarchies for accurate object detection and semantic segmentation*; Girshick 2015, *Fast R-CNN*; Ren et al. 2015, *Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks*
- **One-stage detection: YOLO, SSD, FPN, focal loss** `cv-detection-one-stage`
  - Builds on: Object detection: R-CNN to Faster R-CNN
  - See it: The grid predicting boxes; focal loss down-weighting easy ones
  - Papers: Redmon et al. 2015, *You Only Look Once: Unified, Real-Time Object Detection*; Liu et al. 2015, *SSD: Single Shot MultiBox Detector*; Lin et al. 2016, *Feature Pyramid Networks for Object Detection*; Lin et al. 2017, *Focal Loss for Dense Object Detection*

### 4.3 Segmentation

- **Segmentation: FCN, U-Net, Mask R-CNN** `cv-segmentation`
  - Builds on: Object detection: R-CNN to Faster R-CNN
  - See it: U-Net's skip connections carrying detail across
  - Papers: Long, Shelhamer, Darrell 2014, *Fully Convolutional Networks for Semantic Segmentation*; Ronneberger, Fischer, Brox 2015, *U-Net: Convolutional Networks for Biomedical Image Segmentation*; He et al. 2017, *Mask R-CNN*

### 4.4 Transformers for vision

- **Vision transformers and Swin** `cv-vit`
  - Builds on: The full transformer: encoder, decoder, masking, training; Transfer learning and fine-tuning
  - See it: An image cut into patches, each a token
  - Papers: Dosovitskiy et al. 2020, *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale*; Liu et al. 2021, *Swin Transformer: Hierarchical Vision Transformer using Shifted Windows*
- **DETR: detection as set prediction** `cv-detr`
  - Builds on: Vision transformers and Swin; One-stage detection: YOLO, SSD, FPN, focal loss
  - See it: Object queries matched to boxes (Hungarian matching)
  - Papers: Carion et al. 2020, *End-to-End Object Detection with Transformers*

### 4.5 Learning without labels

- **Self-supervised learning: SimCLR, MoCo, BYOL, DINO, MAE** `cv-self-supervised`
  - Builds on: Vision transformers and Swin; Cross-entropy and KL divergence
  - See it: Two views of one image pulled together in embedding space (3D)
  - Papers: Chen et al. 2020, *A Simple Framework for Contrastive Learning of Visual Representations*; He et al. 2019, *Momentum Contrast for Unsupervised Visual Representation Learning*; Grill et al. 2020, *Bootstrap your own latent: A new approach to self-supervised Learning*; Caron et al. 2021, *Emerging Properties in Self-Supervised Vision Transformers*; He et al. 2021, *Masked Autoencoders Are Scalable Vision Learners*
- **CLIP: images and text in one space** `cv-clip`
  - Builds on: Self-supervised learning: SimCLR, MoCo, BYOL, DINO, MAE
  - See it: The image–text similarity matrix and its diagonal
  - Papers: Radford et al. 2021, *Learning Transferable Visual Models From Natural Language Supervision*

### 4.6 Foundation models

- **Segment Anything** `cv-sam`
  - Builds on: Vision transformers and Swin; Segmentation: FCN, U-Net, Mask R-CNN
  - See it: A click becoming a mask
  - Papers: Kirillov et al. 2023, *Segment Anything*

### 4.7 3D

- **Neural radiance fields** `cv-nerf`
  - Builds on: Layers: the multilayer perceptron; Images as tensors; classical filters
  - See it: Rays through a 3D scene, colour integrated along each
  - Papers: Mildenhall et al. 2020, *NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis*
- **3D Gaussian splatting** `cv-gaussian-splatting`
  - Builds on: Neural radiance fields
  - See it: Gaussians in 3D projected and blended into a view
  - Papers: Kerbl et al. 2023, *3D Gaussian Splatting for Real-Time Radiance Field Rendering*

## 5. Natural Language Processing

Text to tokens to word vectors to BERT and GPT.

Nexus subject: `nlp`

### 5.1 Text

- **Text as data: tokens, bag of words, TF-IDF** `nlp-text-basics`
  - Builds on: Naive Bayes; Probability: events and axioms
  - See it: A sentence becoming a count vector
- **n-gram language models and perplexity** `nlp-ngram`
  - Builds on: Text as data: tokens, bag of words, TF-IDF; Entropy
  - See it: Next-word probabilities from counts; perplexity as surprise
- **Subword tokenisation: BPE and SentencePiece** `nlp-subwords`
  - Builds on: Text as data: tokens, bag of words, TF-IDF
  - See it: BPE merging the most common pair, merge by merge
  - Papers: Sennrich, Haddow, Birch 2015, *Neural Machine Translation of Rare Words with Subword Units*; Kudo, Richardson 2018, *SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing*

### 5.2 Word vectors

- **word2vec** `nlp-word2vec`
  - Builds on: Text as data: tokens, bag of words, TF-IDF; The training loop: mini-batches and epochs
  - See it: Words moving in 3D as training pulls neighbours together
  - Papers: Mikolov et al. 2013, *Efficient Estimation of Word Representations in Vector Space*; Mikolov et al. 2013, *Distributed Representations of Words and Phrases and their Compositionality*
- **GloVe** `nlp-glove`
  - Builds on: word2vec
  - See it: The co-occurrence matrix and its log-bilinear fit
  - Papers: Pennington, Socher, Manning 2014, *GloVe: Global Vectors for Word Representation*

### 5.3 Neural language models

- **Recurrent language models** `nlp-rnn-lm`
  - Builds on: n-gram language models and perplexity; LSTM and GRU
  - See it: The hidden state carrying the sentence, word by word
- **Contextual word vectors (ELMo)** `nlp-elmo`
  - Builds on: Recurrent language models; word2vec
  - See it: "bank" by a river vs "bank" for money, two vectors
  - Papers: Peters et al. 2018, *Deep contextualized word representations*

### 5.4 Pre-trained transformers

- **BERT and masked language modelling** `nlp-bert`
  - Builds on: The full transformer: encoder, decoder, masking, training; Subword tokenisation: BPE and SentencePiece; Contextual word vectors (ELMo)
  - See it: Masked words predicted from both sides
  - Papers: Devlin et al. 2018, *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*; Liu et al. 2019, *RoBERTa: A Robustly Optimized BERT Pretraining Approach*
- **GPT: decoder-only language models** `nlp-gpt`
  - Builds on: The full transformer: encoder, decoder, masking, training; Subword tokenisation: BPE and SentencePiece
  - See it: Causal mask; one token at a time with its probabilities
  - Papers: Radford et al. 2018, *Improving Language Understanding by Generative Pre-Training*; Radford et al. 2019, *Language Models are Unsupervised Multitask Learners*
- **Text-to-text: T5** `nlp-t5`
  - Builds on: BERT and masked language modelling; GPT: decoder-only language models
  - See it: Every task as input text → output text
  - Papers: Raffel et al. 2019, *Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer*
- **Decoding: greedy, beam, top-k, nucleus, temperature** `nlp-decoding`
  - Builds on: GPT: decoder-only language models
  - See it: The same distribution cut and reshaped by each method
  - Papers: Holtzman et al. 2019, *The Curious Case of Neural Text Degeneration*

## 6. Generative Models

Autoregressive models, VAEs, GANs, flows and diffusion, each likelihood derived.

Nexus subject: `genai-llms`

### 6.1 Basics

- **What a generative model is: likelihood and sampling** `gen-intro`
  - Builds on: Variational inference and the ELBO; Autoencoders and denoising autoencoders
  - See it: Data density in 2D and samples drawn from a model
- **Autoregressive models** `gen-autoregressive`
  - Builds on: What a generative model is: likelihood and sampling; LSTM and GRU
  - See it: A picture drawn pixel by pixel from conditional probabilities
  - Papers: van den Oord, Kalchbrenner, Kavukcuoglu 2016, *Pixel Recurrent Neural Networks*

### 6.2 Latent variable models

- **Variational autoencoders: the ELBO and the reparameterisation trick, derived** `gen-vae`
  - Builds on: What a generative model is: likelihood and sampling; Variational inference and the ELBO
  - See it: The latent space in 3D, decoded as you move
  - Papers: Kingma, Welling 2013, *Auto-Encoding Variational Bayes*; Rezende, Mohamed, Wierstra 2014, *Stochastic Backpropagation and Approximate Inference in Deep Generative Models*
- **Discrete latents: VQ-VAE** `gen-vqvae`
  - Builds on: Variational autoencoders: the ELBO and the reparameterisation trick, derived
  - See it: Vectors snapping to the nearest codebook entry
  - Papers: van den Oord, Vinyals, Kavukcuoglu 2017, *Neural Discrete Representation Learning*

### 6.3 Adversarial

- **Generative adversarial networks: the minimax game, derived** `gen-gan`
  - Builds on: What a generative model is: likelihood and sampling; Convolutional networks and pooling; backprop through a convolution
  - See it: Generator's samples and the discriminator's map, round by round
  - Papers: Goodfellow et al. 2014, *Generative Adversarial Networks*; Mirza, Osindero 2014, *Conditional Generative Adversarial Nets*; Radford, Metz, Chintala 2015, *Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks*
- **Wasserstein GANs** `gen-wgan`
  - Builds on: Generative adversarial networks: the minimax game, derived
  - See it: Earth mover's distance as moving piles of sand
  - Papers: Arjovsky, Chintala, Bottou 2017, *Wasserstein GAN*; Gulrajani et al. 2017, *Improved Training of Wasserstein GANs*
- **Image-to-image and style: pix2pix, CycleGAN, StyleGAN** `gen-gan-applications`
  - Builds on: Wasserstein GANs
  - See it: Style mixing across layers
  - Papers: Isola et al. 2016, *Image-to-Image Translation with Conditional Adversarial Networks*; Zhu et al. 2017, *Unpaired Image-to-Image Translation using Cycle-Consistent Adversarial Networks*; Karras, Laine, Aila 2018, *A Style-Based Generator Architecture for Generative Adversarial Networks*

### 6.4 Flows

- **Normalising flows: change of variables** `gen-flows`
  - Builds on: What a generative model is: likelihood and sampling; The Jacobian
  - See it: A Gaussian bent into a complex shape, layer by layer, the Jacobian volume shown
  - Papers: Rezende, Mohamed 2015, *Variational Inference with Normalizing Flows*; Dinh, Sohl-Dickstein, Bengio 2016, *Density estimation using Real NVP*; Kingma, Dhariwal 2018, *Glow: Generative Flow with Invertible 1x1 Convolutions*

### 6.5 Diffusion

- **Score matching and Langevin sampling** `gen-score`
  - Builds on: What a generative model is: likelihood and sampling; Monte Carlo and MCMC
  - See it: Score arrows over 2D data; samples sliding along them
  - Papers: Song, Ermon 2019, *Generative Modeling by Estimating Gradients of the Data Distribution*
- **Denoising diffusion: the forward process, the ELBO and noise prediction, derived** `gen-ddpm`
  - Builds on: Variational autoencoders: the ELBO and the reparameterisation trick, derived; Score matching and Langevin sampling
  - See it: 2D points noised to a Gaussian and denoised back, every step
  - Papers: Sohl-Dickstein et al. 2015, *Deep Unsupervised Learning using Nonequilibrium Thermodynamics*; Ho, Jain, Abbeel 2020, *Denoising Diffusion Probabilistic Models*; Nichol, Dhariwal 2021, *Improved Denoising Diffusion Probabilistic Models*
- **Faster sampling: DDIM** `gen-ddim`
  - Builds on: Denoising diffusion: the forward process, the ELBO and noise prediction, derived
  - See it: Fewer, larger steps along the same path
  - Papers: Song, Meng, Ermon 2020, *Denoising Diffusion Implicit Models*
- **Diffusion as stochastic differential equations** `gen-sde`
  - Builds on: Faster sampling: DDIM
  - See it: Forward and reverse SDE paths, and the ODE between them
  - Papers: Song et al. 2020, *Score-Based Generative Modeling through Stochastic Differential Equations*
- **Guidance: classifier and classifier-free** `gen-guidance`
  - Builds on: Denoising diffusion: the forward process, the ELBO and noise prediction, derived
  - See it: The guidance scale pushing samples towards a class
  - Papers: Dhariwal, Nichol 2021, *Diffusion Models Beat GANs on Image Synthesis*; Ho, Salimans 2022, *Classifier-Free Diffusion Guidance*
- **Latent diffusion and text-to-image** `gen-latent-diffusion`
  - Builds on: Guidance: classifier and classifier-free; Variational autoencoders: the ELBO and the reparameterisation trick, derived; The full transformer: encoder, decoder, masking, training
  - See it: Denoising in the latent space, cross-attention to the prompt
  - Papers: Rombach et al. 2021, *High-Resolution Image Synthesis with Latent Diffusion Models*; Ramesh et al. 2022, *Hierarchical Text-Conditional Image Generation with CLIP Latents*; Saharia et al. 2022, *Photorealistic Text-to-Image Diffusion Models with Deep Language Understanding*; Peebles, Xie 2022, *Scalable Diffusion Models with Transformers*
- **Flow matching, rectified flow and consistency models** `gen-flow-matching`
  - Builds on: Diffusion as stochastic differential equations; Normalising flows: change of variables
  - See it: Curved paths straightened into lines
  - Papers: Lipman et al. 2022, *Flow Matching for Generative Modeling*; Liu, Gong, Liu 2022, *Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow*; Song et al. 2023, *Consistency Models*

## 7. Reinforcement Learning

Bandits and MDPs to DQN, PPO and AlphaZero.

Nexus subject: `reinforcement-learning`

### 7.1 The problem

- **Agents, environments, rewards and returns** `rl-intro`
  - Builds on: Expectation and variance; Supervised and unsupervised learning; training and test data
  - See it: A grid world: the agent moves, rewards add up with discount
- **Multi-armed bandits: explore vs exploit** `rl-bandits`
  - Builds on: Agents, environments, rewards and returns
  - See it: ε-greedy and UCB pulling arms; regret growing
- **Markov decision processes** `rl-mdp`
  - Builds on: Agents, environments, rewards and returns; Conditional probability and Bayes' rule
  - See it: States, actions and transition probabilities as a graph
- **Value functions and Bellman equations** `rl-bellman`
  - Builds on: Markov decision processes
  - See it: Values spreading over the grid world

### 7.2 Planning with a model

- **Policy and value iteration, and why they converge** `rl-dp`
  - Builds on: Value functions and Bellman equations
  - See it: Value iteration sweep by sweep; the contraction shrinking errors

### 7.3 Learning from experience

- **Monte Carlo methods** `rl-monte-carlo`
  - Builds on: Policy and value iteration, and why they converge; Law of large numbers and the central limit theorem
  - See it: Whole episodes averaged into values
- **Temporal-difference learning** `rl-td`
  - Builds on: Monte Carlo methods
  - See it: One-step updates rippling back along a path
  - Papers: Sutton 1988, *Learning to predict by the methods of temporal differences*
- **Q-learning and SARSA** `rl-q-learning`
  - Builds on: Temporal-difference learning
  - See it: The Q-table filling; the cliff walk with both methods
  - Papers: Watkins, Dayan 1992, *Q-learning*

### 7.4 Deep RL

- **Function approximation** `rl-function-approx`
  - Builds on: Q-learning and SARSA; The training loop: mini-batches and epochs
  - See it: A table replaced by a network; the deadly triad
- **Deep Q-networks and their fixes** `rl-dqn`
  - Builds on: Function approximation
  - See it: Replay buffer and target network, step by step
  - Papers: Mnih et al. 2013, *Playing Atari with Deep Reinforcement Learning*; Mnih et al. 2015, *Human-level control through deep reinforcement learning*; van Hasselt, Guez, Silver 2015, *Deep Reinforcement Learning with Double Q-learning*; Wang et al. 2015, *Dueling Network Architectures for Deep Reinforcement Learning*; Schaul et al. 2015, *Prioritized Experience Replay*

### 7.5 Policy methods

- **Policy gradients: REINFORCE and the policy gradient theorem, derived** `rl-policy-gradient`
  - Builds on: Function approximation
  - See it: Action probabilities nudged by returns
  - Papers: Williams 1992, *Simple statistical gradient-following algorithms for connectionist reinforcement learning*; Sutton et al. 1999, *Policy Gradient Methods for Reinforcement Learning with Function Approximation*
- **Actor-critic and advantage estimation** `rl-actor-critic`
  - Builds on: Policy gradients: REINFORCE and the policy gradient theorem, derived
  - See it: The critic's value line and the actor's updates together
  - Papers: Mnih et al. 2016, *Asynchronous Methods for Deep Reinforcement Learning*; Schulman et al. 2015, *High-Dimensional Continuous Control Using Generalized Advantage Estimation*
- **Trust regions: TRPO and PPO** `rl-trpo-ppo`
  - Builds on: Actor-critic and advantage estimation; Cross-entropy and KL divergence; Lagrange multipliers, KKT and duality
  - See it: The clipped objective as a plot; updates kept inside the region
  - Papers: Schulman et al. 2015, *Trust Region Policy Optimization*; Schulman et al. 2017, *Proximal Policy Optimization Algorithms*
- **Continuous control: DDPG, TD3 and SAC** `rl-continuous`
  - Builds on: Actor-critic and advantage estimation; Deep Q-networks and their fixes
  - See it: A policy over a continuous action; entropy keeping it wide
  - Papers: Lillicrap et al. 2015, *Continuous control with deep reinforcement learning*; Fujimoto, van Hoof, Meger 2018, *Addressing Function Approximation Error in Actor-Critic Methods*; Haarnoja et al. 2018, *Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning with a Stochastic Actor*

### 7.6 Planning and games

- **Tree search and self-play: AlphaGo, AlphaZero, MuZero** `rl-planning`
  - Builds on: Deep Q-networks and their fixes; Policy gradients: REINFORCE and the policy gradient theorem, derived
  - See it: MCTS growing its tree, visit counts as size
  - Papers: Silver et al. 2016, *Mastering the game of Go with deep neural networks and tree search*; Silver et al. 2017, *Mastering the game of Go without human knowledge*; Silver et al. 2017, *Mastering Chess and Shogi by Self-Play with a General Reinforcement Learning Algorithm*; Schrittwieser et al. 2019, *Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model*

## 8. Large Language Models

Scaling, modern architectures, efficient inference, fine-tuning, RLHF and DPO, reasoning and RAG.

Nexus subject: `genai-llms`

### 8.1 Scale

- **In-context learning and GPT-3** `llm-icl`
  - Builds on: GPT: decoder-only language models; Decoding: greedy, beam, top-k, nucleus, temperature
  - See it: The same model answering better with more examples in the prompt
  - Papers: Brown et al. 2020, *Language Models are Few-Shot Learners*
- **Scaling laws and compute-optimal training** `llm-scaling`
  - Builds on: In-context learning and GPT-3
  - See it: Loss vs compute on log axes; the Chinchilla line
  - Papers: Kaplan et al. 2020, *Scaling Laws for Neural Language Models*; Hoffmann et al. 2022, *Training Compute-Optimal Large Language Models*

### 8.2 Modern architecture

- **Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA** `llm-architecture`
  - Builds on: Scaling laws and compute-optimal training; Positional encodings
  - See it: RoPE rotating query and key vectors in 2D pairs (3D)
  - Papers: Su et al. 2021, *RoFormer: Enhanced Transformer with Rotary Position Embedding*; Shazeer 2020, *GLU Variants Improve Transformer*; Shazeer 2019, *Fast Transformer Decoding: One Write-Head is All You Need*; Ainslie et al. 2023, *GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints*; Touvron et al. 2023, *LLaMA: Open and Efficient Foundation Language Models*; Touvron et al. 2023, *Llama 2: Open Foundation and Fine-Tuned Chat Models*; Jiang et al. 2023, *Mistral 7B*
- **Mixture of experts** `llm-moe`
  - Builds on: Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA
  - See it: Tokens routed to experts; load per expert
  - Papers: Shazeer et al. 2017, *Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer*; Fedus, Zoph, Shazeer 2021, *Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity*
- **State-space models: S4 and Mamba** `llm-ssm`
  - Builds on: Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA; Recurrent networks and backprop through time
  - See it: A recurrence and a convolution computing the same output
  - Papers: Gu, Goel, Ré 2021, *Efficiently Modeling Long Sequences with Structured State Spaces*; Gu, Dao 2023, *Mamba: Linear-Time Sequence Modeling with Selective State Spaces*

### 8.3 Efficiency

- **FlashAttention, the KV cache and serving** `llm-efficient-attention`
  - Builds on: Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA
  - See it: Tiles moving between slow and fast memory; the cache growing per token
  - Papers: Dao et al. 2022, *FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness*; Kwon et al. 2023, *Efficient Memory Management for Large Language Model Serving with PagedAttention*
- **Quantisation** `llm-quantization`
  - Builds on: FlashAttention, the KV cache and serving
  - See it: A weight matrix rounded to 8 and 4 bits, the error shown
  - Papers: Dettmers et al. 2022, *LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale*; Frantar et al. 2022, *GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers*

### 8.4 Adapting models

- **Fine-tuning and LoRA** `llm-lora`
  - Builds on: Modern LLM architecture: RoPE, SwiGLU, RMSNorm, GQA; Singular value decomposition
  - See it: A big frozen matrix plus a thin low-rank update
  - Papers: Hu et al. 2021, *LoRA: Low-Rank Adaptation of Large Language Models*; Dettmers et al. 2023, *QLoRA: Efficient Finetuning of Quantized LLMs*
- **RLHF: reward models and PPO with a KL penalty** `llm-rlhf`
  - Builds on: Fine-tuning and LoRA; Trust regions: TRPO and PPO
  - See it: Pairwise preferences becoming a reward; the policy staying near the start
  - Papers: Christiano et al. 2017, *Deep reinforcement learning from human preferences*; Ouyang et al. 2022, *Training language models to follow instructions with human feedback*; Bai et al. 2022, *Constitutional AI: Harmlessness from AI Feedback*
- **Direct preference optimisation, derived** `llm-dpo`
  - Builds on: RLHF: reward models and PPO with a KL penalty
  - See it: The RLHF objective solved in closed form, step by step
  - Papers: Rafailov et al. 2023, *Direct Preference Optimization: Your Language Model is Secretly a Reward Model*

### 8.5 Using models

- **Prompting and reasoning: chain of thought, self-consistency** `llm-reasoning`
  - Builds on: In-context learning and GPT-3
  - See it: Several reasoning paths voting on one answer
  - Papers: Wei et al. 2022, *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*; Wang et al. 2022, *Self-Consistency Improves Chain of Thought Reasoning in Language Models*
- **Retrieval-augmented generation** `llm-rag`
  - Builds on: In-context learning and GPT-3; BERT and masked language modelling
  - See it: A question's embedding finding passages in 3D, then the answer citing them
  - Papers: Lewis et al. 2020, *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*
- **Tools and agents** `llm-agents`
  - Builds on: Prompting and reasoning: chain of thought, self-consistency
  - See it: Thought → action → observation, loop by loop
  - Papers: Yao et al. 2022, *ReAct: Synergizing Reasoning and Acting in Language Models*; Schick et al. 2023, *Toolformer: Language Models Can Teach Themselves to Use Tools*
