
/* NexoraGuru dry-run runtime for Java (appended to the student's program by
   src/dryrun/java.js). It writes the same JSON events as the Python tracer
   (format: src/dryrun/index.js) to stderr after the marker "\u001eNXT ".
   Nothing here prints to stdout. */
final class __Nx {
  static boolean on = true;
  static long events = 0, bytes = 0, outn = 0;
  static final long MAXEV = 3000, MAXB = 1500000;
  static final int MAXOBJ = 300;
  static int calls = 0, depth = 0, nextId = 0;
  static final java.io.PrintStream err = System.err;
  static F top = null;
  static final java.util.IdentityHashMap<Object, Integer> ids = new java.util.IdentityHashMap<>();
  static final java.util.HashMap<Integer, String> lastObj = new java.util.HashMap<>();
  static final java.util.LinkedHashMap<Integer, String> seen = new java.util.LinkedHashMap<>();
  static final java.util.Set<Throwable> reported = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());

  static {
    // Count what the program prints (characters, as the page shows them).
    final java.io.PrintStream out = System.out;
    System.setOut(new java.io.PrintStream(new java.io.OutputStream() {
      public void write(int b) { if ((b & 0xC0) != 0x80) outn++; out.write(b); }
      public void write(byte[] b, int o, int n) { for (int i = o; i < o + n; i++) if ((b[i] & 0xC0) != 0x80) outn++; out.write(b, o, n); }
      public void flush() { out.flush(); }
    }, false));
    // No shutdown-hook thread: some sandboxes cannot start threads, and Java
    // prints a warning into the output. The outermost call flushes on exit.
  }

  /* ── JSON ── */
  static void str(StringBuilder w, String s) {
    w.append('"');
    int n = 0;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (++n > 300) { w.append('…'); break; }
      if (c == '"' || c == '\\') w.append('\\').append(c);
      else if (c < 0x20) w.append(String.format("\\u%04x", (int) c));
      else w.append(c);
    }
    w.append('"');
  }
  static void integer(StringBuilder w, long v) {
    if (Math.abs((double) v) > 9007199254740992.0) w.append("{\"t\":\"big\",\"s\":\"").append(v).append("\"}");
    else w.append(v);
  }
  static void num(StringBuilder w, double v) {
    if (Double.isNaN(v)) w.append("{\"t\":\"num\",\"s\":\"nan\"}");
    else if (Double.isInfinite(v)) w.append(v > 0 ? "{\"t\":\"num\",\"s\":\"inf\"}" : "{\"t\":\"num\",\"s\":\"-inf\"}");
    else if (v == Math.rint(v) && Math.abs(v) < 1e15) w.append((long) v);
    else w.append(v);
  }

  static boolean blank(Object x) {
    if (x == null) return true;
    if (x instanceof Number) return ((Number) x).doubleValue() == 0;
    if (x instanceof Boolean) return !((Boolean) x);
    if (x instanceof Character) return ((Character) x) == 0;
    if (x.getClass().isArray()) return java.lang.reflect.Array.getLength(x) == 0;
    if (x instanceof java.util.Collection) return ((java.util.Collection<?>) x).isEmpty();
    return false;
  }
  /** A big array (int[200005]) shows the part in use; one still all zeros shows its first 10. */
  static int inUse(Object a) {
    int n = java.lang.reflect.Array.getLength(a);
    if (n <= 80) return n;
    // Look at the first 10 000 only: a sieve of a million is not read whole on every step.
    int k = 0, lim = Math.min(n, 10000);
    for (int i = 0; i < lim; i++) if (!blank(java.lang.reflect.Array.get(a, i))) k = i + 1;
    return k > 0 ? k : 10;
  }
  static void items(StringBuilder w, Iterable<?> it, int n, String t) {
    w.append("{\"t\":\"").append(t).append("\",\"n\":").append(n).append(",\"i\":[");
    int k = 0;
    for (Object x : it) {
      if (k == 80) break;
      if (k++ > 0) w.append(',');
      if (!ser(w, x)) w.append("null");
    }
    w.append("]}");
  }

  static boolean userClass(Class<?> c) {
    return c.getClassLoader() != null && !c.isSynthetic() && !c.getName().contains("$$Lambda") && !c.getName().startsWith("__Nx");
  }

  static boolean ser(StringBuilder w, Object v) {
    if (v == null) { w.append("null"); return true; }
    if (v instanceof Boolean) { w.append(((Boolean) v) ? "true" : "false"); return true; }
    if (v instanceof Character) { str(w, String.valueOf(v)); return true; }
    if (v instanceof Integer || v instanceof Long || v instanceof Short || v instanceof Byte) { integer(w, ((Number) v).longValue()); return true; }
    if (v instanceof Float || v instanceof Double) { num(w, ((Number) v).doubleValue()); return true; }
    if (v instanceof java.math.BigInteger || v instanceof java.math.BigDecimal) { w.append("{\"t\":\"big\",\"s\":\"").append(v).append("\"}"); return true; }
    if (v instanceof CharSequence) { str(w, v.toString()); return true; }
    if (v instanceof Enum) { str(w, ((Enum<?>) v).name()); return true; }
    Class<?> c = v.getClass();
    if (c.isArray()) {
      int n = java.lang.reflect.Array.getLength(v), k = inUse(v);
      // Rows of a 2D array share one width, so the grid stays square.
      boolean nested = c.getComponentType().isArray();
      int cols = -1;
      if (nested && n > 0) {
        cols = 0;
        for (int i = 0; i < k; i++) { Object row = java.lang.reflect.Array.get(v, i); if (row != null) cols = Math.max(cols, inUse(row)); }
      }
      w.append("{\"t\":\"list\",\"n\":").append(n).append(",\"i\":[");
      for (int i = 0; i < k && i < 80; i++) {
        if (i > 0) w.append(',');
        Object x = java.lang.reflect.Array.get(v, i);
        if (nested && x != null) {
          int m = java.lang.reflect.Array.getLength(x);
          w.append("{\"t\":\"list\",\"n\":").append(m).append(",\"i\":[");
          for (int j = 0; j < Math.min(cols, m) && j < 80; j++) { if (j > 0) w.append(','); if (!ser(w, java.lang.reflect.Array.get(x, j))) w.append("null"); }
          w.append("]}");
        } else if (!ser(w, x)) w.append("null");
      }
      w.append("]}");
      return true;
    }
    if (v instanceof java.util.Map) {
      java.util.Map<?, ?> m = (java.util.Map<?, ?>) v;
      w.append("{\"t\":\"dict\",\"n\":").append(m.size()).append(",\"k\":[");
      int k = 0;
      for (java.util.Map.Entry<?, ?> e : m.entrySet()) {
        if (k == 80) break;
        if (k++ > 0) w.append(',');
        w.append('[');
        if (!ser(w, e.getKey())) w.append("null");
        w.append(',');
        if (!ser(w, e.getValue())) w.append("null");
        w.append(']');
      }
      w.append("]}");
      return true;
    }
    if (v instanceof java.util.PriorityQueue) { items(w, (java.util.Collection<?>) v, ((java.util.Collection<?>) v).size(), "list"); return true; }
    if (v instanceof java.util.Set) { items(w, (java.util.Collection<?>) v, ((java.util.Collection<?>) v).size(), "set"); return true; }
    if (v instanceof java.util.Deque || (v instanceof java.util.Queue && !(v instanceof java.util.List))) { items(w, (java.util.Collection<?>) v, ((java.util.Collection<?>) v).size(), "deque"); return true; }
    if (v instanceof java.util.Collection) { items(w, (java.util.Collection<?>) v, ((java.util.Collection<?>) v).size(), "list"); return true; }
    if (userClass(c)) return ref(w, v);
    return false;
  }

  /* ── objects: by identity, so links between them can be drawn ── */
  static boolean ref(StringBuilder w, Object o) {
    Integer id = ids.get(o);
    if (id == null) { id = ++nextId; ids.put(o, id); }
    w.append("{\"t\":\"ref\",\"id\":").append(id).append('}');
    if (seen.containsKey(id) || seen.size() >= MAXOBJ) return true;
    seen.put(id, "");
    StringBuilder b = new StringBuilder("{\"c\":");
    str(b, o.getClass().getSimpleName());
    b.append(",\"f\":{");
    boolean first = true;
    for (Class<?> k = o.getClass(); k != null && userClass(k); k = k.getSuperclass()) {
      for (java.lang.reflect.Field f : k.getDeclaredFields()) {
        if (java.lang.reflect.Modifier.isStatic(f.getModifiers()) || f.isSynthetic()) continue;
        try {
          f.setAccessible(true);
          StringBuilder t = new StringBuilder();
          if (!ser(t, f.get(o))) continue;
          if (!first) b.append(',');
          first = false;
          str(b, f.getName());
          b.append(':').append(t);
        } catch (Throwable e) { /* a field we may not read: leave it out */ }
      }
    }
    b.append("}}");
    seen.put(id, b.toString());
    return true;
  }

  static void emit(String s) {
    if (!on) return;
    events++; bytes += s.length();
    if (events > MAXEV || bytes > MAXB) { on = false; err.print("\u001eNXT {\"e\":\"cap\"}\n"); err.flush(); return; }
    err.print("\u001eNXT " + s + "\n");
    err.flush();
  }
  static String heapDelta() {
    StringBuilder h = new StringBuilder();
    for (java.util.Map.Entry<Integer, String> e : seen.entrySet()) {
      String before = lastObj.get(e.getKey());
      if (e.getValue().equals(before)) continue;
      lastObj.put(e.getKey(), e.getValue());
      if (h.length() > 0) h.append(',');
      h.append('"').append(e.getKey()).append("\":").append(e.getValue());
    }
    seen.clear();
    return h.toString();
  }
  /** name/value pairs → name → JSON, leaving out what can't be drawn. */
  static java.util.LinkedHashMap<String, String> vars(Object[] nv) {
    java.util.LinkedHashMap<String, String> m = new java.util.LinkedHashMap<>();
    if (nv == null) return m;
    for (int i = 0; i + 1 < nv.length; i += 2) {
      StringBuilder w = new StringBuilder();
      try { if (ser(w, nv[i + 1])) m.put((String) nv[i], w.toString()); } catch (Throwable e) { /* skip */ }
    }
    return m;
  }

  static final class F {
    final int k;
    int pend = -1, line;
    final F up = top;
    final java.util.HashMap<String, String> last = new java.util.HashMap<>();
    String retv = null;

    F(String fn, int l, Object[] nv) {
      k = ++calls;
      line = l;
      top = this;
      if (on) {
        StringBuilder ch = new StringBuilder();
        for (java.util.Map.Entry<String, String> e : vars(nv).entrySet()) {
          last.put(e.getKey(), e.getValue());
          if (ch.length() > 0) ch.append(',');
          ch.append('"').append(e.getKey()).append("\":").append(e.getValue());
        }
        StringBuilder ev = new StringBuilder("{\"e\":\"call\",\"f\":");
        str(ev, fn);
        ev.append(",\"k\":").append(k).append(",\"d\":").append(depth).append(",\"l\":").append(l).append(",\"o\":").append(outn);
        if (ch.length() > 0) ev.append(",\"v\":{").append(ch).append('}');
        String h = heapDelta();
        if (!h.isEmpty()) ev.append(",\"h\":{").append(h).append('}');
        emit(ev.append('}').toString());
      }
      depth++;
    }
    void flush(Object[] nv, boolean withVars) {
      if (pend < 0) return;
      StringBuilder ch = new StringBuilder(), gone = new StringBuilder();
      if (withVars) {
        java.util.LinkedHashMap<String, String> now = vars(nv);
        for (java.util.Map.Entry<String, String> e : now.entrySet()) {
          if (e.getValue().equals(last.get(e.getKey()))) continue;
          last.put(e.getKey(), e.getValue());
          if (ch.length() > 0) ch.append(',');
          ch.append('"').append(e.getKey()).append("\":").append(e.getValue());
        }
        for (java.util.Iterator<String> it = last.keySet().iterator(); it.hasNext();) {
          String n = it.next();
          if (now.containsKey(n)) continue;
          if (gone.length() > 0) gone.append(',');
          gone.append('"').append(n).append('"');
          it.remove();
        }
      }
      StringBuilder ev = new StringBuilder("{\"e\":\"line\",\"l\":").append(pend).append(",\"k\":").append(k).append(",\"o\":").append(outn);
      if (ch.length() > 0) ev.append(",\"v\":{").append(ch).append('}');
      if (gone.length() > 0) ev.append(",\"x\":[").append(gone).append(']');
      String h = heapDelta();
      if (!h.isEmpty()) ev.append(",\"h\":{").append(h).append('}');
      emit(ev.append('}').toString());
      pend = -1;
    }
    /** Line l is about to run: the line before it has finished, so send it with the variables as they are now. */
    void at(int l, Object[] nv) {
      if (!on) return;
      if (pend >= 0) flush(nv, true);
      pend = l;
    }
    /** The top of a loop pass: send the loop line (its update has run) before the body starts. */
    void head(Object[] nv) { if (on && pend >= 0) flush(nv, true); }
    /** The end of a loop pass, before the loop's own update (i++) runs. */
    boolean tail(int l, Object[] nv) { at(l, nv); return true; }
    void end(Object[] nv) { if (on && pend >= 0) { line = pend; flush(nv, true); } }
    void keep(Object v, Object[] nv) {
      if (!on) return;
      StringBuilder w = new StringBuilder();
      if (ser(w, v)) retv = w.toString();
      if (pend >= 0) { line = pend; flush(nv, true); }
    }
    <T> T ret(T v, Object[] nv) { keep(v, nv); return v; }
    int ret(int v, Object[] nv) { keep(v, nv); return v; }
    long ret(long v, Object[] nv) { keep(v, nv); return v; }
    double ret(double v, Object[] nv) { keep(v, nv); return v; }
    float ret(float v, Object[] nv) { keep(v, nv); return v; }
    boolean ret(boolean v, Object[] nv) { keep(v, nv); return v; }
    char ret(char v, Object[] nv) { keep(v, nv); return v; }
    /** An exception: reported once, on the line that was running in the call where it started. */
    void exc(Throwable t) {
      if (!reported.add(t)) return;
      StringBuilder ev = new StringBuilder("{\"e\":\"exc\",\"k\":").append(k).append(",\"l\":").append(pend >= 0 ? pend : line).append(",\"m\":");
      str(ev, t.toString().replaceFirst("^java\\.lang\\.", ""));
      ev.append(",\"o\":").append(outn).append('}');
      boolean was = on;
      on = true;
      events = Math.min(events, MAXEV - 1);
      emit(ev.toString());
      on = was;
      pend = -1; // that line did not finish
    }
    void exit() {
      depth--;
      top = up;
      if (up == null) System.out.flush();
      if (!on) return;
      int l = pend >= 0 ? pend : line;
      flush(null, false);
      StringBuilder ev = new StringBuilder("{\"e\":\"ret\",\"k\":").append(k).append(",\"l\":").append(l).append(",\"o\":").append(outn);
      if (retv != null) ev.append(",\"r\":").append(retv);
      String h = heapDelta();
      if (!h.isEmpty()) ev.append(",\"h\":{").append(h).append('}');
      emit(ev.append('}').toString());
    }
  }
  static F call(String fn, int l, Object[] nv) { return new F(fn, l, nv); }
}
