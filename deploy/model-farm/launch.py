#!/usr/bin/env python3
"""Start the Nexora model farm: every model in the chosen profile in its own
vLLM server, then the gateway in front of them. Keeps them running: a server
that dies is restarted.

  FARM_PROFILE   budget | plus | pro | ui            (default budget)
  FARM_MODELS    optional comma list to serve instead of the profile
  FARM_KEY       key Hive must send (required unless FARM_ALLOW_OPEN=1)
  FARM_PORT      gateway port (default 8000)
  HF_TOKEN       Hugging Face token, for gated models (Gemma)
  FARM_DRY_RUN=1 print what would run, start nothing
"""
import json
import os
import shlex
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, "models.json")))
PROFILE = os.environ.get("FARM_PROFILE", "budget")
DRY = os.environ.get("FARM_DRY_RUN") == "1"
BASE_PORT = 8101


def log(msg):
    print(f"[farm] {msg}", flush=True)


def plan():
    """[(name, model_cfg, serve_cfg)] in start order (largest first)."""
    if os.environ.get("FARM_MODELS"):
        names = [n.strip() for n in os.environ["FARM_MODELS"].split(",") if n.strip()]
        serve = {n: {"mem": round(0.9 / len(names), 2)} for n in names}
    else:
        prof = CFG["profiles"].get(PROFILE)
        if not prof:
            sys.exit(f"Unknown FARM_PROFILE '{PROFILE}'. Choose one of: {', '.join(CFG['profiles'])}")
        serve = prof["serve"]
    out = []
    for name, s in serve.items():
        m = CFG["models"].get(name)
        if not m:
            log(f"skip {name}: not in models.json")
            continue
        out.append((name, m, s))
    return sorted(out, key=lambda x: -x[2].get("mem", 0) * x[2].get("gpus", 1))


def exists_on_hub(repo):
    if DRY:
        return True
    try:
        from huggingface_hub import HfApi

        HfApi().model_info(repo, token=os.environ.get("HF_TOKEN") or None)
        return True
    except Exception as e:  # renamed, gated without a token, or offline
        log(f"  can't find {repo} on Hugging Face ({type(e).__name__}: {str(e)[:160]})")
        return False


def command(name, m, s, port):
    cmd = ["vllm", "serve", m["hf"], "--served-model-name", name, "--host", "127.0.0.1", "--port", str(port), "--gpu-memory-utilization", str(s.get("mem", 0.9)), "--max-model-len", str(m.get("max_len", 32768))]
    if m.get("fp8"):
        cmd += ["--quantization", "fp8"]
    if s.get("gpus", 1) > 1:
        cmd += ["--tensor-parallel-size", str(s["gpus"])]
    if m.get("kind") == "embed":
        cmd += ["--task", "embed"]
    if m.get("tool_parser"):
        cmd += ["--enable-auto-tool-choice", "--tool-call-parser", m["tool_parser"]]
    if m.get("reasoning_parser"):
        cmd += ["--reasoning-parser", m["reasoning_parser"]]
    cmd += m.get("extra", [])
    env = dict(os.environ)
    if s.get("gpus", 1) > 1:
        env["CUDA_VISIBLE_DEVICES"] = ",".join(str(i) for i in range(s["gpus"]))
    elif "gpu" in s:
        env["CUDA_VISIBLE_DEVICES"] = str(s["gpu"])
    return cmd, env


def wait_ready(port, proc, timeout=1800):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/v1/models", timeout=3) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(5)
    return False


def main():
    if not os.environ.get("FARM_KEY") and os.environ.get("FARM_ALLOW_OPEN") != "1":
        sys.exit("Set FARM_KEY to a long random secret first (e.g. FARM_KEY=$(openssl rand -hex 24)). Hive sends it with every request.")
    os.makedirs(os.path.join(HERE, "logs"), exist_ok=True)
    servers = {}
    routes = {}
    port = BASE_PORT
    log(f"profile: {PROFILE if not os.environ.get('FARM_MODELS') else 'custom'}")
    for name, m, s in plan():
        if not exists_on_hub(m["hf"]):
            log(f"skip {name} — fix its 'hf' in models.json (search huggingface.co for the current repo name)")
            continue
        cmd, env = command(name, m, s, port)
        log(f"start {name} ({m['role']}) on :{port}")
        log("  " + " ".join(shlex.quote(c) for c in cmd))
        if DRY:
            routes[name] = f"http://127.0.0.1:{port}"
            port += 1
            continue
        out = open(os.path.join(HERE, "logs", f"{name}.log"), "ab")
        proc = subprocess.Popen(cmd, env=env, stdout=out, stderr=subprocess.STDOUT)
        # One at a time: each server measures free GPU memory when it starts.
        if wait_ready(port, proc):
            log(f"  {name} is ready")
            routes[name] = f"http://127.0.0.1:{port}"
            servers[name] = (proc, cmd, env, port)
        else:
            log(f"  {name} failed to start — see logs/{name}.log (often: not enough GPU memory; lower 'mem' or pick a smaller profile)")
            proc.kill()
        port += 1
    log(f"serving: {', '.join(routes) or 'nothing'}")
    if DRY:
        print(json.dumps(routes))
        return
    if not routes:
        sys.exit("No model started.")
    genv = dict(os.environ, FARM_ROUTES=json.dumps(routes))
    gateway = subprocess.Popen([sys.executable, os.path.join(HERE, "gateway.py")], env=genv)
    # Supervise: restart anything that dies.
    while True:
        time.sleep(15)
        if gateway.poll() is not None:
            log("gateway stopped — restarting")
            gateway = subprocess.Popen([sys.executable, os.path.join(HERE, "gateway.py")], env=genv)
        for name, (proc, cmd, env, p) in list(servers.items()):
            if proc.poll() is not None:
                log(f"{name} stopped (exit {proc.returncode}) — restarting")
                out = open(os.path.join(HERE, "logs", f"{name}.log"), "ab")
                servers[name] = (subprocess.Popen(cmd, env=env, stdout=out, stderr=subprocess.STDOUT), cmd, env, p)


if __name__ == "__main__":
    main()
