"""Check: every PYQ embedded in a Chapter 7 lesson has a full teacher-style v2 solution (concept
tested, >= 2 steps, pitfalls, a verification or shortcut, an option analysis that marks exactly the
key, matchesKey), and src/gate/solutions holds exactly what the _sol_ch7_lNN modules define."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402
from _sol_ch7 import SOLUTIONS  # noqa: E402

dmlib.check_solutions_written(SOLUTIONS)
n, problems = dmlib.check_pyqs(7)
assert not problems, "\n" + "\n".join(problems)
print(f"pyq_ch7: {n} embedded PYQs have full teacher-style solutions ({len(SOLUTIONS)} written by the _sol modules)")
