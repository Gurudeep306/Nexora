
/* NexoraGuru dry-run runtime for Kotlin (appended to the student's program by
   src/dryrun/kotlin.js). It writes the same JSON events as the Python tracer
   (format: src/dryrun/index.js) to stderr after the marker "\u001eNXT ".
   It never prints: print/println below count what the program prints and
   pass it on unchanged, and System.out in the program is __Nx.out. */
private fun println() { __Nx.outn++; kotlin.io.println() }
private fun println(message: Any?) { __Nx.count(message); __Nx.outn++; kotlin.io.println(message) }
private fun println(message: CharArray) { __Nx.outn += message.size + 1; kotlin.io.println(message) }
private fun print(message: Any?) { __Nx.count(message); kotlin.io.print(message) }
private fun print(message: CharArray) { __Nx.outn += message.size; kotlin.io.print(message) }

object __Nx {
    @JvmField var on = true
    @JvmField var outn = 0L
    private var events = 0L
    private var bytes = 0L
    private const val MAXEV = 3000L
    private const val MAXB = 1500000L
    private const val MAXOBJ = 300
    private var calls = 0
    private var depth = 0
    private var nextId = 0
    private val err = System.err
    private var top: F? = null
    private val ids = java.util.IdentityHashMap<Any, Int>()
    private val lastObj = HashMap<Int, String>()
    private val seen = LinkedHashMap<Int, String>()
    private val reported = java.util.Collections.newSetFromMap(java.util.IdentityHashMap<Throwable, Boolean>())

    fun count(m: Any?) { val s = m.toString(); outn += s.codePointCount(0, s.length) }

    /** System.out for the program: everything written through it is counted (as characters). */
    @JvmField val out: java.io.PrintStream = run {
        val real = System.out
        java.io.PrintStream(object : java.io.OutputStream() {
            override fun write(b: Int) { if ((b and 0xC0) != 0x80) outn++; real.write(b) }
            override fun write(b: ByteArray, o: Int, n: Int) { for (i in o until o + n) if ((b[i].toInt() and 0xC0) != 0x80) outn++; real.write(b, o, n) }
            override fun flush() { real.flush() }
        }, true)
    }

    /* ── JSON ── */
    private fun str(w: StringBuilder, s: String) {
        w.append('"')
        var n = 0
        for (c in s) {
            if (++n > 300) { w.append('…'); break }
            if (c == '"' || c == '\\') w.append('\\').append(c)
            else if (c < ' ') w.append(String.format("\\u%04x", c.code))
            else w.append(c)
        }
        w.append('"')
    }
    private fun integer(w: StringBuilder, v: Long) {
        if (Math.abs(v.toDouble()) > 9007199254740992.0) w.append("{\"t\":\"big\",\"s\":\"").append(v).append("\"}") else w.append(v)
    }
    private fun num(w: StringBuilder, v: Double) {
        when {
            v.isNaN() -> w.append("{\"t\":\"num\",\"s\":\"nan\"}")
            v.isInfinite() -> w.append(if (v > 0) "{\"t\":\"num\",\"s\":\"inf\"}" else "{\"t\":\"num\",\"s\":\"-inf\"}")
            v == Math.rint(v) && Math.abs(v) < 1e15 -> w.append(v.toLong())
            else -> w.append(v)
        }
    }
    private fun blank(x: Any?): Boolean = when {
        x == null -> true
        x is Number -> x.toDouble() == 0.0
        x is Boolean -> !x
        x is Char -> x.code == 0
        x.javaClass.isArray -> java.lang.reflect.Array.getLength(x) == 0
        x is Collection<*> -> x.isEmpty()
        else -> false
    }
    /** A big array (IntArray(200005)) shows the part in use; one still all zeros shows its first 10. */
    private fun inUse(a: Any): Int {
        val n = java.lang.reflect.Array.getLength(a)
        if (n <= 80) return n
        var k = 0
        for (i in 0 until minOf(n, 10000)) if (!blank(java.lang.reflect.Array.get(a, i))) k = i + 1
        return if (k > 0) k else 10
    }
    private fun items(w: StringBuilder, it: Iterable<*>, n: Int, t: String) {
        w.append("{\"t\":\"").append(t).append("\",\"n\":").append(n).append(",\"i\":[")
        var k = 0
        for (x in it) {
            if (k == 80) break
            if (k++ > 0) w.append(',')
            if (!ser(w, x)) w.append("null")
        }
        w.append("]}")
    }
    private fun userClass(c: Class<*>): Boolean {
        val n = c.name
        return c.classLoader != null && !c.isSynthetic && !n.startsWith("kotlin.") && !n.startsWith("java") &&
            !n.contains("\$Lambda") && !n.startsWith("__Nx") && !Function::class.java.isAssignableFrom(c)
    }

    private fun ser(w: StringBuilder, v: Any?): Boolean {
        when (v) {
            null -> { w.append("null"); return true }
            is Boolean -> { w.append(if (v) "true" else "false"); return true }
            is Char -> { str(w, v.toString()); return true }
            is Int, is Long, is Short, is Byte -> { integer(w, (v as Number).toLong()); return true }
            is Float, is Double -> { num(w, (v as Number).toDouble()); return true }
            is java.math.BigInteger, is java.math.BigDecimal -> { w.append("{\"t\":\"big\",\"s\":\"").append(v).append("\"}"); return true }
            is CharSequence -> { str(w, v.toString()); return true }
            is Enum<*> -> { str(w, v.name); return true }
            is Pair<*, *> -> { items(w, listOf(v.first, v.second), 2, "tuple"); return true }
            is Triple<*, *, *> -> { items(w, listOf(v.first, v.second, v.third), 3, "tuple"); return true }
            is IntRange, is LongRange, is CharRange -> { str(w, v.toString()); return true }
        }
        val c = v!!.javaClass
        if (c.isArray) {
            val n = java.lang.reflect.Array.getLength(v)
            val k = inUse(v)
            // Rows of a 2D array share one width, so the grid stays square.
            val nested = c.componentType.isArray
            var cols = -1
            if (nested && n > 0) {
                cols = 0
                for (i in 0 until k) { val row = java.lang.reflect.Array.get(v, i); if (row != null) cols = maxOf(cols, inUse(row)) }
            }
            w.append("{\"t\":\"list\",\"n\":").append(n).append(",\"i\":[")
            var i = 0
            while (i < k && i < 80) {
                if (i > 0) w.append(',')
                val x = java.lang.reflect.Array.get(v, i)
                if (nested && x != null) {
                    val m = java.lang.reflect.Array.getLength(x)
                    w.append("{\"t\":\"list\",\"n\":").append(m).append(",\"i\":[")
                    var j = 0
                    while (j < minOf(cols, m) && j < 80) { if (j > 0) w.append(','); if (!ser(w, java.lang.reflect.Array.get(x, j))) w.append("null"); j++ }
                    w.append("]}")
                } else if (!ser(w, x)) w.append("null")
                i++
            }
            w.append("]}")
            return true
        }
        if (v is Map<*, *>) {
            w.append("{\"t\":\"dict\",\"n\":").append(v.size).append(",\"k\":[")
            var k = 0
            for ((key, value) in v) {
                if (k == 80) break
                if (k++ > 0) w.append(',')
                w.append('[')
                if (!ser(w, key)) w.append("null")
                w.append(',')
                if (!ser(w, value)) w.append("null")
                w.append(']')
            }
            w.append("]}")
            return true
        }
        if (v is java.util.PriorityQueue<*>) { items(w, v, v.size, "list"); return true }
        if (v is Set<*>) { items(w, v, v.size, "set"); return true }
        if (v is kotlin.collections.ArrayDeque<*> || v is java.util.Deque<*> || (v is java.util.Queue<*> && v !is List<*>)) { val col = v as Collection<*>; items(w, col, col.size, "deque"); return true }
        if (v is Collection<*>) { items(w, v, v.size, "list"); return true }
        if (userClass(c)) return ref(w, v)
        return false
    }

    /* ── objects: by identity, so links between them can be drawn ── */
    private fun fieldValue(o: Any, f: java.lang.reflect.Field): Any? {
        try { f.isAccessible = true; return f.get(o) } catch (e: Throwable) { }
        // A sandbox that refuses setAccessible: Kotlin properties have public getters.
        val cap = f.name.replaceFirstChar { it.uppercaseChar() }
        for (g in listOf("get$cap", "is$cap", f.name)) {
            try { return o.javaClass.getMethod(g).invoke(o) } catch (e: Throwable) { }
        }
        throw NoSuchFieldException(f.name)
    }
    private fun ref(w: StringBuilder, o: Any): Boolean {
        val id = ids.getOrPut(o) { ++nextId }
        w.append("{\"t\":\"ref\",\"id\":").append(id).append('}')
        if (seen.containsKey(id) || seen.size >= MAXOBJ) return true
        seen[id] = ""
        val b = StringBuilder("{\"c\":")
        str(b, o.javaClass.simpleName)
        b.append(",\"f\":{")
        var first = true
        var k: Class<*>? = o.javaClass
        while (k != null && userClass(k)) {
            for (f in k.declaredFields) {
                if (java.lang.reflect.Modifier.isStatic(f.modifiers) || f.isSynthetic || f.name.contains('$')) continue
                try {
                    val t = StringBuilder()
                    if (!ser(t, fieldValue(o, f))) continue
                    if (!first) b.append(',')
                    first = false
                    str(b, f.name)
                    b.append(':').append(t)
                } catch (e: Throwable) { /* a field we may not read: leave it out */ }
            }
            k = k.superclass
        }
        b.append("}}")
        seen[id] = b.toString()
        return true
    }

    private fun emit(s: String) {
        if (!on) return
        events++; bytes += s.length
        if (events > MAXEV || bytes > MAXB) { on = false; err.print("\u001eNXT {\"e\":\"cap\"}\n"); err.flush(); return }
        err.print("\u001eNXT $s\n")
        err.flush()
    }
    private fun heapDelta(): String {
        val h = StringBuilder()
        for ((key, value) in seen) {
            if (value == lastObj[key]) continue
            lastObj[key] = value
            if (h.isNotEmpty()) h.append(',')
            h.append('"').append(key).append("\":").append(value)
        }
        seen.clear()
        return h.toString()
    }
    /** name/value pairs → name → JSON, leaving out what can't be drawn. */
    private fun vars(nv: Array<Any?>?): LinkedHashMap<String, String> {
        val m = LinkedHashMap<String, String>()
        if (nv == null) return m
        var i = 0
        while (i + 1 < nv.size) {
            val w = StringBuilder()
            try { if (ser(w, nv[i + 1])) m[nv[i] as String] = w.toString() } catch (e: Throwable) { /* skip */ }
            i += 2
        }
        return m
    }

    class F(fn: String, l: Int, nv: Array<Any?>?) {
        private val k = ++calls
        private var pend = -1
        private var line = l
        private val up = top
        private val last = HashMap<String, String>()
        private var retv: String? = null

        init {
            top = this
            if (on) {
                val ch = StringBuilder()
                for ((key, value) in vars(nv)) {
                    last[key] = value
                    if (ch.isNotEmpty()) ch.append(',')
                    ch.append('"').append(key).append("\":").append(value)
                }
                val ev = StringBuilder("{\"e\":\"call\",\"f\":")
                str(ev, fn)
                ev.append(",\"k\":").append(k).append(",\"d\":").append(depth).append(",\"l\":").append(l).append(",\"o\":").append(outn)
                if (ch.isNotEmpty()) ev.append(",\"v\":{").append(ch).append('}')
                val h = heapDelta()
                if (h.isNotEmpty()) ev.append(",\"h\":{").append(h).append('}')
                emit(ev.append('}').toString())
            }
            depth++
        }
        private fun flush(nv: Array<Any?>?, withVars: Boolean) {
            if (pend < 0) return
            val ch = StringBuilder()
            val gone = StringBuilder()
            if (withVars) {
                val now = vars(nv)
                for ((key, value) in now) {
                    if (value == last[key]) continue
                    last[key] = value
                    if (ch.isNotEmpty()) ch.append(',')
                    ch.append('"').append(key).append("\":").append(value)
                }
                val it = last.keys.iterator()
                while (it.hasNext()) {
                    val n = it.next()
                    if (now.containsKey(n)) continue
                    if (gone.isNotEmpty()) gone.append(',')
                    gone.append('"').append(n).append('"')
                    it.remove()
                }
            }
            val ev = StringBuilder("{\"e\":\"line\",\"l\":").append(pend).append(",\"k\":").append(k).append(",\"o\":").append(outn)
            if (ch.isNotEmpty()) ev.append(",\"v\":{").append(ch).append('}')
            if (gone.isNotEmpty()) ev.append(",\"x\":[").append(gone).append(']')
            val h = heapDelta()
            if (h.isNotEmpty()) ev.append(",\"h\":{").append(h).append('}')
            emit(ev.append('}').toString())
            pend = -1
        }
        /** Line l is about to run: the line before it has finished, so send it with the variables as they are now. */
        fun at(l: Int, nv: Array<Any?>?) {
            if (!on) return
            if (pend >= 0) flush(nv, true)
            pend = l
        }
        /** The top of a loop pass: send the loop line before the body starts. */
        fun head(nv: Array<Any?>?) { if (on && pend >= 0) flush(nv, true) }
        /** The end of a loop pass, before the loop moves on. */
        fun tail(l: Int, nv: Array<Any?>?): Boolean { at(l, nv); return true }
        fun end(nv: Array<Any?>?) { if (on && pend >= 0) { line = pend; flush(nv, true) } }
        fun <T> ret(v: T, nv: Array<Any?>?): T {
            if (on) {
                val w = StringBuilder()
                try { if (ser(w, v)) retv = w.toString() } catch (e: Throwable) { }
                if (pend >= 0) { line = pend; flush(nv, true) }
            }
            return v
        }
        /** An exception: reported once, on the line that was running in the call where it started. */
        fun exc(t: Throwable) {
            if (!reported.add(t)) return
            val ev = StringBuilder("{\"e\":\"exc\",\"k\":").append(k).append(",\"l\":").append(if (pend >= 0) pend else line).append(",\"m\":")
            str(ev, t.toString().replaceFirst(Regex("^(java\\.lang\\.|kotlin\\.)"), ""))
            ev.append(",\"o\":").append(outn).append('}')
            val was = on
            on = true
            events = minOf(events, MAXEV - 1)
            emit(ev.toString())
            on = was
            pend = -1 // that line did not finish
        }
        fun exit() {
            depth--
            top = up
            if (!on) return
            val l = if (pend >= 0) pend else line
            flush(null, false)
            val ev = StringBuilder("{\"e\":\"ret\",\"k\":").append(k).append(",\"l\":").append(l).append(",\"o\":").append(outn)
            if (retv != null) ev.append(",\"r\":").append(retv)
            val h = heapDelta()
            if (h.isNotEmpty()) ev.append(",\"h\":{").append(h).append('}')
            emit(ev.append('}').toString())
        }
    }
    fun call(fn: String, l: Int, nv: Array<Any?>?) = F(fn, l, nv)
}
