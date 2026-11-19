"""Structural check for the Chapter 2 lessons (the house style in content/gate-notes/_style.md): see
dmlib.check_lessons. Prints a size report per lesson."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402

if dmlib.chapter_dir(2) is None:
    print("lessons_ch2: chapter not started")
    sys.exit(0)
# Floor raised for Chapter 2 per dm.md §3 (raising a bar is allowed; lowering never is).
report, problems = dmlib.check_lessons(2, min_words=7000, min_viz=8, min_animated=7, min_examples=25, min_practice=10, min_labs=1)
print("\n".join(report))
assert not problems, "\n" + "\n".join(problems)
print("lessons_ch2: structure OK")
