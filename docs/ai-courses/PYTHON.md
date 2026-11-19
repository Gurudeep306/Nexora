# Python in the AI courses

The Foundations course teaches Python from zero, then NumPy, pandas,
Matplotlib and first steps in PyTorch. scikit-learn opens the Machine
Learning course (`ml-sklearn`), and training in PyTorch comes in Deep
Learning (`dl-pytorch`). This file is the contract for every Python lesson.

## Versions (checked 2026-11-19 against PyPI, python.org and npm)

| | Taught from (official docs) | Recorded outputs | In the reader's browser (Pyodide 314.0.8) |
|---|---|---|---|
| Python | 3.15 (docs.python.org/3.15) | 3.15.2 | 3.14.2 |
| NumPy | 2.5 | 2.5.5 | 2.4.6 |
| pandas | 3.1 | 3.1.1 | 3.0.2 |
| Matplotlib | 3.11 | 3.11.2 | 3.10.8 |
| scikit-learn | 1.9 | 1.9.1 | 1.8.0 |
| PyTorch | 2.15 | 2.15.0 (when the PyTorch topics are recorded) | not available in browsers |

When a newer release comes out: update this table, the lesson versions, the
`docs` entries in `sources/courses.json` and `sources/library.json`, rebuild
the recording environment and re-record (below).

## Sources

Only official documentation, collected into the private library
(`private/library/sites/<id>/`, `ingest.mjs`) and searchable with `search.mjs`:

- `python-docs`: the Python 3.15 tutorial, language reference and standard library (the official text archive);
- `numpy-docs`, `pandas-docs`, `matplotlib-docs`, `sklearn-docs`, `pytorch-docs`: each project's user guide.

Lessons explain in our own words with our own examples, follow the order of
the official tutorial where it has one, and cite the exact chapter or section
in "Read more".

## The Python block

```ts
{ t: 'python', title: 'a taxi fare', code: 'fare = 50 + 15 * 8\nprint(fare)' }
```

Each example shows its code, and the reader can:

- **Run** it in the browser (Pyodide, in a Web Worker; stops after 10 seconds);
- **Step through** it: the line that just ran and the line that runs next are marked, and a table shows every variable (its type and value) after each line, with changes highlighted; play, pause, step and scrub;
- **Edit** it in the site's code editor (Python completion and hover docs) and run their own version; **Reset** brings back the lesson's code.

Before anything is run, the output shown is the **recorded output** of a real
run of exactly this code on the versions in the table, including Matplotlib
figures (saved in `client/public/ai-py/`) and real tracebacks.

Options: `stdin` (text the code reads), `error: true` (the example fails on
purpose), `browser: false` (the browser cannot run it: PyTorch, or something
new in 3.15; the recorded output is shown), `step: false`, `note`.

## Recording outputs

```bash
uv python install 3.15.2
uv venv -p 3.15.2 /tmp/py315
VIRTUAL_ENV=/tmp/py315 uv pip install numpy==2.5.5 pandas==3.1.1 matplotlib==3.11.2 scikit-learn==1.9.1
PYTHON=/tmp/py315/bin/python node scripts/ai-courses/record-python.mjs
```

This writes `client/src/learn/content/ai/python.gen.ts`. The tests fail if any
example has no recording (its code changed since), if the recording was not
made with Python 3.15, or if an example fails without `error: true`.
