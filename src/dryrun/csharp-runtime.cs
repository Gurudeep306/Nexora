
/* NexoraGuru dry-run runtime for C# (appended to the student's program by
   src/dryrun/csharp.js). It writes the same JSON events as the Python
   tracer (format: src/dryrun/index.js) to stderr after the marker
   "\u001eNXT ". It only counts what the program prints; it never prints. */
static class __Nx {
    public static bool on = true;
    static long events = 0, bytes = 0;
    public static long outn = 0;
    const long MAXEV = 3000, MAXB = 1500000;
    const int MAXOBJ = 300;
    static long calls = 0, depth = 0;
    static int nextId = 0;
    public static F top = null;
    static readonly System.IO.TextWriter err = System.Console.Error;
    static readonly System.Runtime.CompilerServices.ConditionalWeakTable<object, object> ids = new System.Runtime.CompilerServices.ConditionalWeakTable<object, object>();
    static readonly System.Collections.Generic.Dictionary<int, string> lastObj = new System.Collections.Generic.Dictionary<int, string>();
    static readonly System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<int, string>> seen = new System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<int, string>>();
    static bool reported = false;

    sealed class CountW : System.IO.TextWriter {
        readonly System.IO.TextWriter w;
        public CountW(System.IO.TextWriter w) { this.w = w; }
        public override System.Text.Encoding Encoding { get { return w.Encoding; } }
        public override void Write(char c) { outn++; w.Write(c); }
        public override void Write(string s) { if (s != null) { outn += s.Length; w.Write(s); } }
        public override void Write(char[] b, int i, int n) { outn += n; w.Write(b, i, n); }
        public override void WriteLine(string s) { outn += (s == null ? 0 : s.Length) + 1; w.WriteLine(s); }
        public override void Flush() { w.Flush(); }
    }

    static __Nx() {
        System.Console.SetOut(new CountW(System.Console.Out));
        System.AppDomain.CurrentDomain.UnhandledException += (s, e) => { var ex = e.ExceptionObject as System.Exception; if (top != null && ex != null) top.Exc(ex); };
    }

    /* ── JSON ── */
    static void Str(System.Text.StringBuilder w, string s) {
        w.Append('"');
        int n = 0;
        foreach (char c in s) {
            if (++n > 300) { w.Append('…'); break; }
            if (c == '"' || c == '\\') w.Append('\\').Append(c);
            else if (c < 0x20) w.Append("\\u").Append(((int)c).ToString("x4"));
            else w.Append(c);
        }
        w.Append('"');
    }
    static void Int(System.Text.StringBuilder w, decimal v) {
        if (System.Math.Abs(v) > 9007199254740992m) w.Append("{\"t\":\"big\",\"s\":\"").Append(v.ToString(System.Globalization.CultureInfo.InvariantCulture)).Append("\"}");
        else w.Append(v.ToString(System.Globalization.CultureInfo.InvariantCulture));
    }
    static void Num(System.Text.StringBuilder w, double v) {
        if (double.IsNaN(v)) w.Append("{\"t\":\"num\",\"s\":\"nan\"}");
        else if (double.IsInfinity(v)) w.Append(v > 0 ? "{\"t\":\"num\",\"s\":\"inf\"}" : "{\"t\":\"num\",\"s\":\"-inf\"}");
        else if (v == System.Math.Floor(v) && System.Math.Abs(v) < 1e15) w.Append(((long)v).ToString(System.Globalization.CultureInfo.InvariantCulture));
        else w.Append(v.ToString("R", System.Globalization.CultureInfo.InvariantCulture));
    }

    static bool Blank(object x) {
        if (x == null) return true;
        if (x is bool) return !(bool)x;
        if (x is char) return (char)x == '\0';
        if (x is System.IConvertible && x.GetType().IsPrimitive) { try { return System.Convert.ToDouble(x) == 0; } catch { return false; } }
        return false;
    }
    /** A big array (new int[200005]) shows the part in use; one still all zeros shows its first 10. */
    static int InUse(System.Collections.IList a) {
        int n = a.Count;
        if (n <= 80) return n;
        int k = 0, lim = System.Math.Min(n, 10000);
        for (int i = 0; i < lim; i++) if (!Blank(a[i])) k = i + 1;
        return k > 0 ? k : 10;
    }
    static void Items(System.Text.StringBuilder w, System.Collections.IEnumerable it, int n, string t) {
        w.Append("{\"t\":\"").Append(t).Append("\",\"n\":").Append(n).Append(",\"i\":[");
        int k = 0;
        foreach (object x in it) {
            if (k == 80) break;
            if (k++ > 0) w.Append(',');
            if (!Ser(w, x, 1)) w.Append("null");
        }
        w.Append("]}");
    }
    static bool UserType(System.Type t) {
        return t.Assembly == typeof(__Nx).Assembly && !t.Name.StartsWith("<") && !t.Name.StartsWith("__Nx") && t.GetCustomAttributes(typeof(System.Runtime.CompilerServices.CompilerGeneratedAttribute), false).Length == 0;
    }

    static bool Ser(System.Text.StringBuilder w, object v, int depth) {
        if (v == null) { w.Append("null"); return true; }
        if (depth > 6) { w.Append("{\"t\":\"more\"}"); return true; }
        var t = v.GetType();
        if (v is bool) { w.Append((bool)v ? "true" : "false"); return true; }
        if (v is char) { Str(w, v.ToString()); return true; }
        if (v is sbyte || v is byte || v is short || v is ushort || v is int || v is uint || v is long || v is ulong) { Int(w, System.Convert.ToDecimal(v)); return true; }
        if (v is float || v is double) { Num(w, System.Convert.ToDouble(v)); return true; }
        if (v is decimal || t.FullName == "System.Numerics.BigInteger") { w.Append("{\"t\":\"big\",\"s\":\"").Append(v.ToString()).Append("\"}"); return true; }
        if (v is string) { Str(w, (string)v); return true; }
        if (v is System.Text.StringBuilder) { Str(w, v.ToString()); return true; }
        if (t.IsEnum) { Str(w, v.ToString()); return true; }
        if (t.IsArray) {
            var a = (System.Array)v;
            if (a.Rank == 2) {
                int r = a.GetLength(0), c = a.GetLength(1);
                w.Append("{\"t\":\"list\",\"n\":").Append(r).Append(",\"i\":[");
                for (int i = 0; i < System.Math.Min(r, 80); i++) {
                    if (i > 0) w.Append(',');
                    w.Append("{\"t\":\"list\",\"n\":").Append(c).Append(",\"i\":[");
                    for (int j = 0; j < System.Math.Min(c, 80); j++) { if (j > 0) w.Append(','); if (!Ser(w, a.GetValue(i, j), depth + 2)) w.Append("null"); }
                    w.Append("]}");
                }
                w.Append("]}");
                return true;
            }
            if (a.Rank != 1) return false;
            var l = (System.Collections.IList)a;
            int k = InUse(l), n = l.Count;
            // Rows of a jagged array share one width, so the grid stays square.
            bool nested = t.GetElementType().IsArray;
            int cols = -1;
            if (nested) { cols = 0; for (int i = 0; i < k && i < 80; i++) { var row = l[i] as System.Collections.IList; if (row != null) cols = System.Math.Max(cols, InUse(row)); } }
            w.Append("{\"t\":\"list\",\"n\":").Append(n).Append(",\"i\":[");
            for (int i = 0; i < k && i < 80; i++) {
                if (i > 0) w.Append(',');
                var row = l[i] as System.Collections.IList;
                if (nested && row != null) {
                    w.Append("{\"t\":\"list\",\"n\":").Append(row.Count).Append(",\"i\":[");
                    for (int j = 0; j < System.Math.Min(cols, row.Count) && j < 80; j++) { if (j > 0) w.Append(','); if (!Ser(w, row[j], depth + 2)) w.Append("null"); }
                    w.Append("]}");
                } else if (!Ser(w, l[i], depth + 1)) w.Append("null");
            }
            w.Append("]}");
            return true;
        }
        string gn = t.IsGenericType ? t.GetGenericTypeDefinition().Name : t.Name;
        if (v is System.Collections.IDictionary) {
            var m = (System.Collections.IDictionary)v;
            w.Append("{\"t\":\"dict\",\"n\":").Append(m.Count).Append(",\"k\":[");
            int k = 0;
            foreach (System.Collections.DictionaryEntry e in m) {
                if (k == 80) break;
                if (k++ > 0) w.Append(',');
                w.Append('[');
                if (!Ser(w, e.Key, depth + 1)) w.Append("null");
                w.Append(',');
                if (!Ser(w, e.Value, depth + 1)) w.Append("null");
                w.Append(']');
            }
            w.Append("]}");
            return true;
        }
        if (gn.StartsWith("Stack`")) {
            // C# lists a stack from its top: draw it from the bottom, like the others.
            var items = new System.Collections.ArrayList();
            foreach (object x in (System.Collections.IEnumerable)v) items.Insert(0, x);
            Items(w, items, items.Count, "list");
            return true;
        }
        if (gn.StartsWith("Queue`")) { Items(w, (System.Collections.IEnumerable)v, ((System.Collections.ICollection)v).Count, "deque"); return true; }
        if (gn.StartsWith("HashSet`") || gn.StartsWith("SortedSet`")) {
            var items = new System.Collections.ArrayList();
            foreach (object x in (System.Collections.IEnumerable)v) items.Add(x);
            try { items.Sort(); } catch { }
            Items(w, items, items.Count, "set");
            return true;
        }
        if (gn.StartsWith("PriorityQueue`")) {
            // Its items in heap order (UnorderedItems), each the element.
            var p = t.GetProperty("UnorderedItems");
            var items = new System.Collections.ArrayList();
            if (p != null) foreach (object x in (System.Collections.IEnumerable)p.GetValue(v, null)) { var ip = x.GetType().GetField("Item1"); items.Add(ip != null ? ip.GetValue(x) : x); }
            Items(w, items, items.Count, "list");
            return true;
        }
        if (v is System.Collections.ICollection) { Items(w, (System.Collections.IEnumerable)v, ((System.Collections.ICollection)v).Count, "list"); return true; }
        if (gn.StartsWith("ValueTuple`") || gn.StartsWith("Tuple`") || gn.StartsWith("KeyValuePair`")) {
            var fs = new System.Collections.Generic.List<object>();
            if (gn.StartsWith("KeyValuePair`")) { fs.Add(t.GetProperty("Key").GetValue(v, null)); fs.Add(t.GetProperty("Value").GetValue(v, null)); }
            else for (int i = 1; i <= 7; i++) { var f = t.GetField("Item" + i); var pr = t.GetProperty("Item" + i); if (f != null) fs.Add(f.GetValue(v)); else if (pr != null) fs.Add(pr.GetValue(v, null)); else break; }
            Items(w, fs, fs.Count, "tuple");
            return true;
        }
        if (UserType(t)) {
            if (t.IsValueType) {
                // A struct: its fields, inline (a value has no identity to link to).
                if (depth > 6) return false;
                w.Append("{\"t\":\"rec\",\"c\":");
                Str(w, t.Name);
                w.Append(",\"f\":{");
                bool first = true;
                foreach (var f in t.GetFields(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic)) {
                    var fv = new System.Text.StringBuilder();
                    try { if (!Ser(fv, f.GetValue(v), depth + 1)) continue; } catch { continue; }
                    if (!first) w.Append(',');
                    first = false;
                    // An auto-property's field (<Val>k__BackingField) goes by the property's name.
                    Str(w, f.Name.StartsWith("<") ? f.Name.Substring(1, f.Name.IndexOf('>') - 1) : f.Name);
                    w.Append(':').Append(fv);
                }
                w.Append("}}");
                return true;
            }
            return Ref(w, v);
        }
        return false;
    }

    /* ── objects: by identity, so links between them can be drawn ── */
    static bool Ref(System.Text.StringBuilder w, object o) {
        object box;
        int id;
        if (ids.TryGetValue(o, out box)) id = (int)box; else { id = ++nextId; ids.Add(o, id); }
        w.Append("{\"t\":\"ref\",\"id\":").Append(id).Append('}');
        foreach (var e in seen) if (e.Key == id) return true;
        if (seen.Count >= MAXOBJ) return true;
        seen.Add(new System.Collections.Generic.KeyValuePair<int, string>(id, ""));
        var b = new System.Text.StringBuilder("{\"c\":");
        Str(b, o.GetType().Name);
        b.Append(",\"f\":{");
        bool first = true;
        for (var k = o.GetType(); k != null && UserType(k); k = k.BaseType) {
            foreach (var f in k.GetFields(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.DeclaredOnly)) {
                try {
                    var t = new System.Text.StringBuilder();
                    if (!Ser(t, f.GetValue(o), 1)) continue;
                    if (!first) b.Append(',');
                    first = false;
                    // An auto-property's field (<Val>k__BackingField) goes by the property's name.
                    string name = f.Name.StartsWith("<") ? f.Name.Substring(1, f.Name.IndexOf('>') - 1) : f.Name;
                    Str(b, name);
                    b.Append(':').Append(t);
                } catch { }
            }
        }
        b.Append("}}");
        for (int i = 0; i < seen.Count; i++) if (seen[i].Key == id) seen[i] = new System.Collections.Generic.KeyValuePair<int, string>(id, b.ToString());
        return true;
    }

    static void Emit(string s) {
        if (!on) return;
        events++; bytes += s.Length;
        if (events > MAXEV || bytes > MAXB) { on = false; err.Write("\u001eNXT {\"e\":\"cap\"}\n"); err.Flush(); return; }
        err.Write("\u001eNXT " + s + "\n");
        err.Flush();
    }
    static string HeapDelta() {
        var h = new System.Text.StringBuilder();
        foreach (var e in seen) {
            string before;
            if (lastObj.TryGetValue(e.Key, out before) && before == e.Value) continue;
            lastObj[e.Key] = e.Value;
            if (h.Length > 0) h.Append(',');
            h.Append('"').Append(e.Key).Append("\":").Append(e.Value);
        }
        seen.Clear();
        return h.ToString();
    }
    /** name/value pairs → name → JSON, leaving out what can't be drawn. */
    static System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<string, string>> Vars(object[] nv) {
        var m = new System.Collections.Generic.List<System.Collections.Generic.KeyValuePair<string, string>>();
        if (nv == null) return m;
        for (int i = 0; i + 1 < nv.Length; i += 2) {
            var w = new System.Text.StringBuilder();
            try {
                if (Ser(w, nv[i + 1], 0)) {
                    string name = (string)nv[i];
                    m.RemoveAll(e => e.Key == name);
                    m.Add(new System.Collections.Generic.KeyValuePair<string, string>(name, w.ToString()));
                }
            } catch { }
        }
        return m;
    }

    public sealed class F {
        readonly long k;
        int pend = -1, line;
        readonly F up;
        readonly System.Collections.Generic.Dictionary<string, string> last = new System.Collections.Generic.Dictionary<string, string>();
        readonly System.Collections.Generic.List<string> order = new System.Collections.Generic.List<string>();
        string retv = null;

        public F(string fn, int l, object[] nv) {
            k = ++calls;
            line = l;
            up = top;
            top = this;
            if (on) {
                var ch = new System.Text.StringBuilder();
                foreach (var e in Vars(nv)) {
                    last[e.Key] = e.Value;
                    order.Add(e.Key);
                    if (ch.Length > 0) ch.Append(',');
                    Str(ch, e.Key);
                    ch.Append(':').Append(e.Value);
                }
                var ev = new System.Text.StringBuilder("{\"e\":\"call\",\"f\":");
                Str(ev, fn);
                ev.Append(",\"k\":").Append(k).Append(",\"d\":").Append(depth).Append(",\"l\":").Append(l).Append(",\"o\":").Append(outn);
                if (ch.Length > 0) ev.Append(",\"v\":{").Append(ch).Append('}');
                var h = HeapDelta();
                if (h.Length > 0) ev.Append(",\"h\":{").Append(h).Append('}');
                Emit(ev.Append('}').ToString());
            }
            depth++;
        }
        void Flush(object[] nv, bool withVars) {
            if (pend < 0) return;
            var ch = new System.Text.StringBuilder();
            var gone = new System.Text.StringBuilder();
            if (withVars) {
                var now = Vars(nv);
                var names = new System.Collections.Generic.HashSet<string>();
                foreach (var e in now) {
                    names.Add(e.Key);
                    string was;
                    if (last.TryGetValue(e.Key, out was) && was == e.Value) continue;
                    if (!last.ContainsKey(e.Key)) order.Add(e.Key);
                    last[e.Key] = e.Value;
                    if (ch.Length > 0) ch.Append(',');
                    Str(ch, e.Key);
                    ch.Append(':').Append(e.Value);
                }
                foreach (var n in order.ToArray()) {
                    if (names.Contains(n)) continue;
                    last.Remove(n);
                    order.Remove(n);
                    if (gone.Length > 0) gone.Append(',');
                    Str(gone, n);
                }
            }
            var ev = new System.Text.StringBuilder("{\"e\":\"line\",\"l\":").Append(pend).Append(",\"k\":").Append(k).Append(",\"o\":").Append(outn);
            if (ch.Length > 0) ev.Append(",\"v\":{").Append(ch).Append('}');
            if (gone.Length > 0) ev.Append(",\"x\":[").Append(gone).Append(']');
            var h = HeapDelta();
            if (h.Length > 0) ev.Append(",\"h\":{").Append(h).Append('}');
            Emit(ev.Append('}').ToString());
            pend = -1;
        }
        /** Line l is about to run: the line before it has finished, so send it with the variables as they are now. */
        public void At(int l, object[] nv) { if (!on) return; if (pend >= 0) Flush(nv, true); pend = l; }
        /** The top of a loop pass: send the loop line before the body starts. */
        public void Head(object[] nv) { if (on && pend >= 0) Flush(nv, true); }
        /** The end of a loop pass, before the loop's update (i++) runs. */
        public bool Tail(int l, object[] nv) { At(l, nv); return true; }
        public void End(object[] nv) { if (on && pend >= 0) { line = pend; Flush(nv, true); } }
        public T Ret<T>(T v, object[] nv) {
            if (on) {
                var w = new System.Text.StringBuilder();
                try { if (Ser(w, v, 0)) retv = w.ToString(); } catch { }
                if (pend >= 0) { line = pend; Flush(nv, true); }
            }
            return v;
        }
        /** An exception: reported once, on the line that was running where it started. Never catches it. */
        public bool Exc(System.Exception t) {
            if (reported) return false;
            reported = true;
            var ev = new System.Text.StringBuilder("{\"e\":\"exc\",\"k\":").Append(k).Append(",\"l\":").Append(pend >= 0 ? pend : line).Append(",\"m\":");
            Str(ev, t.GetType().Name + ": " + t.Message);
            ev.Append(",\"o\":").Append(outn).Append('}');
            bool was = on;
            on = true;
            if (events >= MAXEV) events = MAXEV - 1;
            Emit(ev.ToString());
            on = was;
            pend = -1;
            return false;
        }
        public void Exit() {
            depth--;
            top = up;
            if (!on) return;
            int l = pend >= 0 ? pend : line;
            Flush(null, false);
            var ev = new System.Text.StringBuilder("{\"e\":\"ret\",\"k\":").Append(k).Append(",\"l\":").Append(l).Append(",\"o\":").Append(outn);
            if (retv != null) ev.Append(",\"r\":").Append(retv);
            var h = HeapDelta();
            if (h.Length > 0) ev.Append(",\"h\":{").Append(h).Append('}');
            Emit(ev.Append('}').ToString());
        }
    }
    public static F Call(string fn, int l, object[] nv) { return new F(fn, l, nv); }
}
