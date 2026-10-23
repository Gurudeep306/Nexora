"""Structural check for the Chapter 3 lessons (the house style in content/gate-notes/_style.md): see
dmlib.check_lessons. Prints a size report per lesson."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import dmlib  # noqa: E402

if dmlib.chapter_dir(3) is None:
    print("lessons_ch3: chapter not started")
    sys.exit(0)
report, problems = dmlib.check_lessons(3, min_words=3500)
print("\n".join(report))
assert not problems, "\n" + "\n".join(problems)
print("lessons_ch3: structure OK")
