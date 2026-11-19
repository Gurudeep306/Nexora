/*
  The lessons' Python, in a Web Worker (so a long or endless loop never freezes
  the page: the main thread can end this worker). Pyodide, the official
  CPython build for the browser, loads from jsDelivr at the version the main
  thread passes in.

  Messages in:  { id, type: 'run', code, stdin, trace }
  Messages out: { type: 'ready', python, packages } once loaded
                { id, type: 'done', ok, out, error, steps, figures }
*/
/* global importScripts, loadPyodide */
let py = null
let booting = null

const HELPER = `
import sys, io, json, base64, traceback, builtins, linecache

def _nx_repr(v):
    try:
        r = repr(v)
    except Exception:
        r = '<unprintable>'
    return r if len(r) <= 120 else r[:117] + '...'

def _nx_kind(v):
    t = type(v)
    return t.__name__

def _nx_run(src, stdin, trace, limit=600):
    out = io.StringIO()
    old = sys.stdout, sys.stderr, sys.stdin
    sys.stdout = sys.stderr = out
    sys.stdin = io.StringIO(stdin)
    g = {'__name__': '__main__'}
    steps = []
    truncated = [False]

    def snap(frame, line, event):
        if len(steps) >= limit:
            truncated[0] = True
            return
        stack = []
        f = frame
        while f is not None and f.f_code.co_filename == 'lesson.py':
            stack.append(f.f_code.co_name if f.f_code.co_name != '<module>' else 'main')
            f = f.f_back
        local = {}
        for k, v in list(frame.f_locals.items()):
            if k.startswith('__') or k.startswith('_nx'):
                continue
            if type(v).__name__ == 'module':
                continue
            local[k] = [_nx_kind(v), _nx_repr(v)]
        steps.append({'line': line, 'event': event, 'stack': stack[::-1], 'vars': local, 'out': len(out.getvalue())})

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != 'lesson.py':
            return None
        if event in ('line', 'return'):
            snap(frame, frame.f_lineno, event)
        return tracer

    ok = True
    error = None
    linecache.cache['lesson.py'] = (len(src), None, src.splitlines(True), 'lesson.py')
    try:
        code = compile(src, 'lesson.py', 'exec')
        if trace:
            sys.settrace(tracer)
        try:
            exec(code, g)
        finally:
            sys.settrace(None)
    except BaseException as e:
        ok = False
        te = traceback.TracebackException.from_exception(e)
        te.stack = traceback.StackSummary.from_list([f for f in te.stack if f.filename == 'lesson.py'])
        where = te.stack[-1].lineno if len(te.stack) else getattr(e, 'lineno', None)
        error = {'type': type(e).__name__, 'message': str(e), 'line': where, 'text': ''.join(te.format()).rstrip()}
        if trace and where:
            steps.append({'line': where, 'event': 'exception', 'stack': [], 'vars': {}, 'out': len(out.getvalue())})
    finally:
        sys.stdout, sys.stderr, sys.stdin = old
    figures = []
    if 'matplotlib.pyplot' in sys.modules:
        plt = sys.modules['matplotlib.pyplot']
        for n in plt.get_fignums():
            buf = io.BytesIO()
            plt.figure(n).savefig(buf, format='png', dpi=110, bbox_inches='tight')
            figures.append(base64.b64encode(buf.getvalue()).decode())
        plt.close('all')
    return json.dumps({'ok': ok, 'out': out.getvalue(), 'error': error, 'steps': steps, 'truncated': truncated[0], 'figures': figures})
`

async function boot(indexURL) {
  importScripts(`${indexURL}pyodide.js`)
  py = await loadPyodide({ indexURL, env: { MPLBACKEND: 'Agg' } })
  await py.runPythonAsync(HELPER)
  const version = py.runPython('import sys; sys.version.split()[0]')
  self.postMessage({ type: 'ready', python: version })
}

self.onmessage = async (e) => {
  const m = e.data
  if (m.type === 'boot') {
    booting ??= boot(m.indexURL).catch((err) => self.postMessage({ type: 'failed', message: String(err && err.message ? err.message : err) }))
    return
  }
  if (m.type !== 'run') return
  try {
    await booting
    if (!py) throw new Error('Python did not load')
    // Packages a lesson imports (numpy, pandas, matplotlib, scikit-learn …) load on first use.
    await py.loadPackagesFromImports(m.code)
    py.globals.set('_nx_src', m.code)
    py.globals.set('_nx_stdin', m.stdin || '')
    py.globals.set('_nx_trace', !!m.trace)
    const res = JSON.parse(await py.runPythonAsync('_nx_run(_nx_src, _nx_stdin, _nx_trace)'))
    self.postMessage({ id: m.id, type: 'done', ...res })
  } catch (err) {
    self.postMessage({ id: m.id, type: 'done', ok: false, out: '', error: { type: 'Error', message: String(err && err.message ? err.message : err), line: null, text: String(err) }, steps: [], figures: [] })
  }
}
