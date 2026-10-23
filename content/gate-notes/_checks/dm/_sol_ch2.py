"""Teacher-style v2 solutions for the PYQs of Discrete Mathematics Chapter 2: merges the per-lesson
modules _sol_ch2_lNN.py (each a SOLUTIONS dict) and writes them into src/gate/solutions/<paper>.json.
Every key is re-derived by script in the lesson checks (l2_NN_*.py).

    python3 content/gate-notes/_checks/dm/_sol_ch2.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402

SOLUTIONS = dmlib.parts("_sol_ch2_l", "SOLUTIONS")

if __name__ == "__main__":
    print("wrote", ", ".join(dmlib.write_solutions(SOLUTIONS)))
