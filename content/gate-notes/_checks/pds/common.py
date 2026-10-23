"""Shared helpers for the Programming & Data Structures checks (not a check itself: the leading
underscore-free name is imported by the checks, and run_checks.py runs only files without a leading
underscore, so this module must stay side-effect free).

- paths (ROOT, CONTENT, VIZ_DIR, chapter folders) and the question bank;
- `run_c`: compile a C program with the system C compiler in a fresh temporary directory and run it
  with a time limit, returning (status, stdout). Every C fact the lessons state, every C PYQ key and
  every C practice answer is produced this way, so nothing about C output is taken on trust.
  Results are cached on disk by a hash of (source, stdin, flags) so repeated runs stay fast;
  delete the cache directory to force recompilation.
- `outline_pyqs`: the PYQ ids the outline assigns to a lesson.
"""
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[4]
CONTENT = ROOT / "content" / "gate-notes" / "pds"
VIZ_DIR = CONTENT / "viz"
OUTLINE = CONTENT / "_outline.md"
CHAPTERS = {
    1: CONTENT / "01-c-foundations",
    2: CONTENT / "02-pointers-memory",
    3: CONTENT / "03-recursion",
    4: CONTENT / "04-arrays-lists",
    5: CONTENT / "05-stacks-queues",
    6: CONTENT / "06-trees",
    7: CONTENT / "07-heaps-hashing-graphs",
}
CACHE = pathlib.Path(tempfile.gettempdir()) / "nexora-pds-cbox-cache"
CC = os.environ.get("CC") or shutil.which("cc") or shutil.which("gcc") or "cc"


def bank():
    return {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}


def key_letters(answer):
    if isinstance(answer, list):
        return sorted(answer)
    return sorted(x for x in re.split(r"[\s,;]+", str(answer)) if x)


def opt(letter, correct, reason):
    return {"option": letter, "correct": correct, "reason": reason}


def outline_pyqs(plan_id):
    text = OUTLINE.read_text()
    sec = text.split(f"### {plan_id} ")[1].split("\n### ")[0].split("\n## ")[0]
    line = next(l for l in sec.splitlines() if l.startswith("- PYQs"))
    return re.findall(r"`([a-z0-9-]+)`", line)


class CResult:
    def __init__(self, compiled, status, out, err):
        self.compiled, self.status, self.out, self.err = compiled, status, out, err

    @property
    def ok(self):
        return self.compiled and self.status == 0

    @property
    def crashed(self):
        """Killed by a signal (segmentation fault, stack overflow, abort) or timed out."""
        return self.compiled and (self.status is None or self.status < 0 or self.status > 128)

    def __repr__(self):
        return f"CResult(compiled={self.compiled}, status={self.status}, out={self.out!r})"


def run_c(src, stdin="", std="c11", flags=(), timeout=5, cache=True):
    """Compile `src` (a complete C program) with `cc -std=<std> -O0` and run it.

    Returns a CResult: `compiled` (bool), `status` (exit code; negative = killed by that signal;
    None = timed out), `out` (stdout) and `err` (compiler diagnostics when compilation failed).
    `std` may be "c89", "c99", "c11", "gnu11"; extra compiler `flags` (e.g. "-Wall") are passed on.
    The program runs in a fresh temporary directory with a CPU time limit and no input but `stdin`.
    """
    key = hashlib.sha256(json.dumps([src, stdin, std, list(flags), CC]).encode()).hexdigest()
    cfile = CACHE / f"{key}.json"
    if cache and cfile.exists():
        d = json.loads(cfile.read_text())
        return CResult(d["compiled"], d["status"], d["out"], d["err"])
    with tempfile.TemporaryDirectory(prefix="pds-cbox-") as tmp:
        t = pathlib.Path(tmp)
        (t / "prog.c").write_text(src)
        cmd = [CC, f"-std={std}", "-O0", "-w", *flags, "prog.c", "-o", "prog", "-lm"]
        c = subprocess.run(cmd, cwd=tmp, capture_output=True, text=True, timeout=60)
        if c.returncode != 0:
            res = CResult(False, None, "", c.stderr)
        else:
            try:
                r = subprocess.run(["sh", "-c", "ulimit -t 5; ulimit -s 8192; ./prog"], cwd=tmp, input=stdin,
                                   capture_output=True, text=True, timeout=timeout, errors="replace")
                status = r.returncode
                # sh reports a signal-killed child as 128 + signal.
                if status > 128:
                    status = -(status - 128)
                res = CResult(True, status, r.stdout, "")
            except subprocess.TimeoutExpired as e:
                out = e.stdout.decode(errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or "")
                res = CResult(True, None, out, "")
    if cache:
        CACHE.mkdir(parents=True, exist_ok=True)
        cfile.write_text(json.dumps({"compiled": res.compiled, "status": res.status, "out": res.out, "err": res.err}))
    return res


def c_out(src, **kw):
    """stdout of a C program that must compile and exit normally."""
    r = run_c(src, **kw)
    assert r.compiled, f"does not compile:\n{r.err}\n{src}"
    assert r.status == 0, f"exit status {r.status}:\n{src}\nstdout: {r.out!r}"
    return r.out


def c_compiles(src, std="c11", flags=("-pedantic-errors",)):
    """True when the program compiles (with -pedantic-errors by default, so constraint violations fail)."""
    return run_c(src, std=std, flags=flags).compiled


def main_wrap(body, includes=("stdio.h",), before=""):
    """A complete program from a main body (and optional declarations before main)."""
    inc = "".join(f"#include <{h}>\n" for h in includes)
    return f"{inc}{before}\nint main(void) {{\n{body}\nreturn 0;\n}}\n"


def code_block(q):
    """The first ```c / ```pascal / ``` code block of a question's text."""
    m = re.search(r"```[a-z]*\n(.*?)```", q["text"], re.S)
    return m.group(1) if m else None


def option_text(q, letter):
    return next(o["t"] for o in q["options"] if o["l"] == letter)
