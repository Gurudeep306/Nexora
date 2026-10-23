"""Write one chapter's teacher-style v2 solutions into src/gate/solutions:
python3 content/gate-notes/_checks/pds/_sol.py <chapter>"""
import sys

import chapterlib as L

L.write_solutions(L.merge_solutions(int(sys.argv[1])))
