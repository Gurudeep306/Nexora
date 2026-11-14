# Hive and Nexora: what has been built, and why

This page records the decisions and work from the owner's long working sessions
with Claude Code, so any agent (or person) can pick up where they left off.
`AGENTS.md` holds the rules and preferences. This page holds the story.

## Nexora site work

- **Landing and login redesign.** The best animation sits on the login page,
  and the site reads as an end-to-end CS learning platform.
- **The DSA course**, meant to be "the god of all DSA courses":
  - deep lessons with derivations and proofs, and many animations;
  - lots of problems with detailed editorials;
  - solutions in C++, Java, Python, JavaScript and C, all verified against
    every test.
  - The work went topic by topic: each topic was finished completely before
    the next started (Arrays, then Complexity & Big-O, and so on).
  - A handoff for other agents continuing the course was written at the time; it is no longer in the repo, so this page and `client/src/learn/AUTHORING.md` replace it.
- **GATE platform.**
  - Practice, review (spaced repetition), daily questions, timed tests in an
    exam console, and leaderboards.
  - Notes, and PYQ solutions verified against the official papers.
  - Figures: crops of the official papers plus SVG redraws.
- **Nexus.** A radial map of 60+ subjects with server-side mastery.
- **Homepage.** Rebuilt to match the theme.

## Hive, in the order it was built

1. **Foundation.**
   - Claude Code and Codex as agents on the owner's own plans, run through a
     bridge on an always-on worker machine.
   - A smart router with a model catalogue.
   - Budgets, the Drive file manager and the Judge.
   - Pipelines (plus the Pipeline Architect) and automations, so work survives
     overnight and restarts.
   - Chat with tools, documents and images.
2. **Toolbox, Token Steward, shared workspace and team chat.**
3. **Dispatcher.**
   - Splits a request into parts and gives each part the cheapest model that
     clears the quality bar.
   - Agent health uses a circuit breaker, so agents that fail are routed around.
4. **Copilot.**
   - A chief-of-staff assistant that runs the hive through tools.
   - Autopilot by default: it ships verified work as PRs. Merging is
     admin-only and off by default.
5. **Free models.** Many free sources and next-generation open models, a
   one-screen free setup, and limit bars that show real numbers.
6. **Model testing.** Every model is tested with a real call, and only the
   ones that answer are offered. A 403 on one model no longer takes down a
   whole key.
7. **Alibaba Model Studio** (Qwen 3.8 Max on the free quota).
8. **Your GitHub.** Every repo one click away, and projects get a brief
   written from their code.
9. **GPU model farm** (`deploy/model-farm/`): open specialist models behind one
   key. The Copilot saves Claude tokens with a cross-family quality gate and
   Claude-only areas.
10. **Claude accounts and folders.**
    - Parent and worker Claude accounts: the parent leads and the workers do
      the tasks.
    - Upload a folder of any size; it becomes a private GitHub repo.
    - Connect any number of Claude accounts.
11. **The NexoraGuru look.** Nexora styling, one clear sidebar, and a limit bar
    on every connection.
12. **Claude plan usage** is read for every account, not only after a run.
13. **OneAIAPIKey**, and keys whose gateway has no model list.
14. **Mistral Vibe** as a third plan agent (the Le Chat Pro / student plan).
15. **Machine agents** get the repo copied onto their machine automatically.
    Projects move off a GitHub connection whose token has died.
16. **Projects and the Copilot.**
    - Each project gets its own chat, and you can add any repo by name or link.
    - Pickers offer only working models.
    - The Copilot gets a project picker, a Quick mode, a live status line, and
      copy / ask-again buttons.
17. **Shared context** (this page and `AGENTS.md`) for every model.
18. **Flow fixes (PRs #88–#100).**
    - Mistral Vibe and Claude plan tokens are checked before saving; browsers
      can no longer autofill a saved password into a key field.
    - Routing keeps the kind of work the Copilot chose; one broken model no
      longer throws away a whole key; the Judge never adopts "A by default".
    - Provider calls time out instead of hanging; daily caps wait until their
      reset; free tiers are paced below their limits, and staff can set
      requests a minute / a day on any key.
    - Work goes to the machine with the best agent, starts from the latest
      code on GitHub, and Autopilot approves only tests, builds and read-only
      commands.
    - Compare attempts on a machine each get their own git worktree; the
      Judge runs each one's tests (on machines that run commands without
      asking), and the winner is squash-merged into the session.
    - Command approvals are stored, so a restart doesn't make a person
      approve the same command twice. Judge verdicts feed the router's
      measured quality.
19. **Premium UI v2 (PRs #90–#94).** See `docs/hive/UI-PREMIUM.md`.
20. **Coding test, view transitions, Lighthouse (PR #101).** Golden coding tasks score each model; the session title glides from the project into the session; phone panels close with a swipe; Hive stops downloading the learning site's pages.

## Infrastructure the owner set up

- **`hive-worker`**: an AWS EC2 `t3.small` running Ubuntu 24.04 in Europe
  (Stockholm), on the AWS Free plan's credits. It runs the bridge as a systemd
  user service.
  - It has Claude Code, Codex and Mistral Vibe installed.
  - Claude tokens are made on the owner's Mac with `claude setup-token`; the
    AWS browser terminal breaks Claude's login link.
- **Oracle Cloud** sign-up didn't work for the owner, which is why the worker
  runs on AWS.

## Advice already given (don't contradict it without new facts)

- **No free unlimited GPU exists.**
  - Kaggle gives about 30 GPU hours a week, Modal gives about $30 of credit a
    month, and AMD Developer Cloud has given $100 in credits.
  - Paid GPUs (RunPod, Vast.ai) run about $0.6–4 an hour depending on size.
- **Open models are below Claude on UI and hard engineering.** They are equal
  or better for:
  - OCR (PaddleOCR-VL)
  - embeddings
  - Indian-language translation (Sarvam)
  - maths and GATE reasoning (Nemotron)
- **Several free accounts per person at one provider breaks the terms.** Use
  each staff member's own keys, and paid plans connected one per account.
- **Mistral student plan.** Use it through the Vibe CLI on the worker, not as
  an API key. The plan doesn't include API credits.
- **Suggested next step: fine-tune Nexora's own small models** on Nexora's
  data (about 4,000 GATE solutions and about 180 animation scenes).
