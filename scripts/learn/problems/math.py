"""Math for DSA — judged problems.

The problems live in math_parts/p1.py … p4.py (one per quarter of the lesson
pages). They are exec'd here in order, sharing this module's globals, so
helpers defined in one part are visible to later ones.
"""
import os
import random  # noqa: F401
from lib import *  # noqa: F401,F403

_PARTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'math_parts')
for _name in sorted(os.listdir(_PARTS)):
    if _name.endswith('.py'):
        with open(os.path.join(_PARTS, _name), encoding='utf-8') as _f:
            exec(compile(_f.read(), os.path.join(_PARTS, _name), 'exec'), globals())
