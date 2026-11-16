
/* NexoraGuru dry-run runtime for Go (appended to the student's program by
   src/dryrun/go.js; its imports are added, aliased, on the package line).
   It writes the same JSON events as the Python tracer (format:
   src/dryrun/index.js) to stderr after the marker "\x1eNXT ". It never
   writes to stdout and starts no goroutines, so the program's output is
   exactly what it would be without it. */

var __nxOn = true
var __nxEvents, __nxBytes, __nxOut int64
var __nxCalls, __nxDepth, __nxNextID int
var __nxReported bool
var __nxIDs = map[uintptr]int{}
var __nxSeen = map[int]string{}
var __nxSeenOrder []int
var __nxLastObj = map[int]string{}

const __nxMaxEv = 3000
const __nxMaxB = 1500000
const __nxMaxObj = 300

/* ── output: counted, never changed ── */

// __nxCnt wraps fmt.Print / Println / Printf: same results, and the count.
func __nxCnt(n int, err error) (int, error) {
	__nxOut += int64(n)
	return n, err
}

type __nxCounter struct{ w *__nxos.File }

func (c __nxCounter) Write(p []byte) (int, error) {
	n, err := c.w.Write(p)
	__nxOut += int64(n)
	return n, err
}

// __nxW wraps os.Stdout where it is handed to a writer (bufio.NewWriter…).
func __nxW(f *__nxos.File) __nxio.Writer {
	if f == __nxos.Stdout {
		return __nxCounter{f}
	}
	return f
}

/* ── JSON ── */

func __nxStr(b *__nxstrings.Builder, s string) {
	b.WriteByte('"')
	n := 0
	for _, c := range s {
		n++
		if n > 300 {
			b.WriteString("…")
			break
		}
		switch {
		case c == '"' || c == '\\':
			b.WriteByte('\\')
			b.WriteRune(c)
		case c < 0x20:
			b.WriteString(__nxfmt.Sprintf("\\u%04x", c))
		default:
			b.WriteRune(c)
		}
	}
	b.WriteByte('"')
}

func __nxInt(b *__nxstrings.Builder, v int64) {
	if v > 9007199254740992 || v < -9007199254740992 {
		b.WriteString(`{"t":"big","s":"` + __nxstrconv.FormatInt(v, 10) + `"}`)
		return
	}
	b.WriteString(__nxstrconv.FormatInt(v, 10))
}

func __nxUint(b *__nxstrings.Builder, v uint64) {
	if v > 9007199254740992 {
		b.WriteString(`{"t":"big","s":"` + __nxstrconv.FormatUint(v, 10) + `"}`)
		return
	}
	b.WriteString(__nxstrconv.FormatUint(v, 10))
}

func __nxFloat(b *__nxstrings.Builder, v float64) {
	switch {
	case v != v:
		b.WriteString(`{"t":"num","s":"nan"}`)
	case v > 1.7e308:
		b.WriteString(`{"t":"num","s":"inf"}`)
	case v < -1.7e308:
		b.WriteString(`{"t":"num","s":"-inf"}`)
	case v == float64(int64(v)) && v < 1e15 && v > -1e15:
		b.WriteString(__nxstrconv.FormatInt(int64(v), 10))
	default:
		b.WriteString(__nxstrconv.FormatFloat(v, 'g', -1, 64))
	}
}

func __nxBlank(v __nxreflect.Value) bool {
	return !v.IsValid() || v.IsZero()
}

// A big array ([200005]int) shows the part in use; one still all zeros shows its first 10.
func __nxInUse(v __nxreflect.Value) int {
	n := v.Len()
	if n <= 80 {
		return n
	}
	k, lim := 0, n
	if lim > 10000 {
		lim = 10000
	}
	for i := 0; i < lim; i++ {
		if !__nxBlank(v.Index(i)) {
			k = i + 1
		}
	}
	if k == 0 {
		return 10
	}
	return k
}

func __nxSer(b *__nxstrings.Builder, v __nxreflect.Value, depth int) bool {
	if !v.IsValid() {
		b.WriteString("null")
		return true
	}
	if depth > 6 {
		b.WriteString(`{"t":"more"}`)
		return true
	}
	switch v.Kind() {
	case __nxreflect.Bool:
		if v.Bool() {
			b.WriteString("true")
		} else {
			b.WriteString("false")
		}
	case __nxreflect.Int, __nxreflect.Int8, __nxreflect.Int16, __nxreflect.Int32, __nxreflect.Int64:
		__nxInt(b, v.Int())
	case __nxreflect.Uint8:
		// A byte is almost always a character (s[i], []byte(s)): show it as one when printable.
		if c := v.Uint(); c >= 32 && c < 127 {
			__nxStr(b, string(rune(c)))
		} else {
			__nxUint(b, c)
		}
	case __nxreflect.Uint, __nxreflect.Uint16, __nxreflect.Uint32, __nxreflect.Uint64, __nxreflect.Uintptr:
		__nxUint(b, v.Uint())
	case __nxreflect.Float32, __nxreflect.Float64:
		__nxFloat(b, v.Float())
	case __nxreflect.Complex64, __nxreflect.Complex128:
		b.WriteString(`{"t":"str","s":"` + __nxfmt.Sprint(v.Complex()) + `"}`)
	case __nxreflect.String:
		__nxStr(b, v.String())
	case __nxreflect.Interface:
		if v.IsNil() {
			b.WriteString("null")
			return true
		}
		return __nxSer(b, v.Elem(), depth)
	case __nxreflect.Ptr:
		if v.IsNil() {
			b.WriteString("null")
			return true
		}
		e := v.Elem()
		if e.Kind() == __nxreflect.Struct {
			// Only the program's own types are drawn, not the library's (a bufio.Reader).
			if e.Type().PkgPath() != "main" {
				return false
			}
			return __nxRef(b, v)
		}
		// A pointer to an array (passed so a big array is not copied) or to a value.
		return __nxSer(b, e, depth)
	case __nxreflect.Slice, __nxreflect.Array:
		if v.Kind() == __nxreflect.Slice && v.IsNil() {
			b.WriteString(`{"t":"list","n":0,"i":[]}`)
			return true
		}
		n, k := v.Len(), __nxInUse(v)
		// Rows of a 2D array share one width, so the grid stays square.
		nested := false
		cols := -1
		ek := v.Type().Elem().Kind()
		if ek == __nxreflect.Slice || ek == __nxreflect.Array {
			nested = true
			cols = 0
			for i := 0; i < k && i < 80; i++ {
				if r := v.Index(i); r.Len() > 0 {
					if u := __nxInUse(r); u > cols {
						cols = u
					}
				}
			}
		}
		b.WriteString(`{"t":"list","n":` + __nxstrconv.Itoa(n) + `,"i":[`)
		for i := 0; i < k && i < 80; i++ {
			if i > 0 {
				b.WriteByte(',')
			}
			x := v.Index(i)
			if nested {
				m := x.Len()
				b.WriteString(`{"t":"list","n":` + __nxstrconv.Itoa(m) + `,"i":[`)
				for j := 0; j < cols && j < m && j < 80; j++ {
					if j > 0 {
						b.WriteByte(',')
					}
					if !__nxSer(b, x.Index(j), depth+2) {
						b.WriteString("null")
					}
				}
				b.WriteString("]}")
			} else if !__nxSer(b, x, depth+1) {
				b.WriteString("null")
			}
		}
		b.WriteString("]}")
	case __nxreflect.Map:
		if v.IsNil() {
			b.WriteString(`{"t":"dict","n":0,"k":[]}`)
			return true
		}
		keys := v.MapKeys()
		// Go visits a map in a random order; draw it sorted, so it does not jump about.
		__nxsort.Slice(keys, func(i, j int) bool { return __nxLess(keys[i], keys[j]) })
		b.WriteString(`{"t":"dict","n":` + __nxstrconv.Itoa(v.Len()) + `,"k":[`)
		for i, key := range keys {
			if i == 80 {
				break
			}
			if i > 0 {
				b.WriteByte(',')
			}
			b.WriteByte('[')
			if !__nxSer(b, key, depth+1) {
				b.WriteString("null")
			}
			b.WriteByte(',')
			if !__nxSer(b, v.MapIndex(key), depth+1) {
				b.WriteString("null")
			}
			b.WriteByte(']')
		}
		b.WriteString("]}")
	case __nxreflect.Struct:
		if p := v.Type().PkgPath(); p != "main" && p != "" {
			return false
		}
		// A small value record (a pair, an edge): its fields, the language's way.
		var t __nxstrings.Builder
		t.WriteString("{")
		ty := v.Type()
		for i := 0; i < v.NumField() && i < 6; i++ {
			if i > 0 {
				t.WriteString(", ")
			}
			t.WriteString(ty.Field(i).Name + ": " + __nxShort(v.Field(i)))
		}
		t.WriteString("}")
		b.WriteString(`{"t":"str","s":`)
		__nxStr(b, t.String())
		b.WriteString("}")
	default:
		return false
	}
	return true
}

func __nxShort(v __nxreflect.Value) string {
	switch v.Kind() {
	case __nxreflect.String:
		return __nxstrconv.Quote(v.String())
	case __nxreflect.Int, __nxreflect.Int8, __nxreflect.Int16, __nxreflect.Int32, __nxreflect.Int64:
		return __nxstrconv.FormatInt(v.Int(), 10)
	case __nxreflect.Uint, __nxreflect.Uint8, __nxreflect.Uint16, __nxreflect.Uint32, __nxreflect.Uint64:
		return __nxstrconv.FormatUint(v.Uint(), 10)
	case __nxreflect.Bool:
		return __nxstrconv.FormatBool(v.Bool())
	case __nxreflect.Float32, __nxreflect.Float64:
		return __nxstrconv.FormatFloat(v.Float(), 'g', 6, 64)
	case __nxreflect.Ptr, __nxreflect.Interface, __nxreflect.Map, __nxreflect.Slice:
		if v.IsNil() {
			return "nil"
		}
	}
	if v.Kind() == __nxreflect.Ptr {
		return "&" + v.Elem().Type().Name()
	}
	return v.Type().String()
}

func __nxLess(a, b __nxreflect.Value) bool {
	switch a.Kind() {
	case __nxreflect.Int, __nxreflect.Int8, __nxreflect.Int16, __nxreflect.Int32, __nxreflect.Int64:
		return a.Int() < b.Int()
	case __nxreflect.Uint, __nxreflect.Uint8, __nxreflect.Uint16, __nxreflect.Uint32, __nxreflect.Uint64:
		return a.Uint() < b.Uint()
	case __nxreflect.Float32, __nxreflect.Float64:
		return a.Float() < b.Float()
	case __nxreflect.String:
		return a.String() < b.String()
	}
	return __nxfmt.Sprint(a) < __nxfmt.Sprint(b)
}

/* ── objects: pointers to structs, by identity, so links can be drawn ── */

func __nxRef(b *__nxstrings.Builder, p __nxreflect.Value) bool {
	addr := p.Pointer()
	id, ok := __nxIDs[addr]
	if !ok {
		__nxNextID++
		id = __nxNextID
		__nxIDs[addr] = id
	}
	b.WriteString(`{"t":"ref","id":` + __nxstrconv.Itoa(id) + `}`)
	if _, done := __nxSeen[id]; done || len(__nxSeen) >= __nxMaxObj {
		return true
	}
	__nxSeen[id] = ""
	__nxSeenOrder = append(__nxSeenOrder, id)
	s := p.Elem()
	ty := s.Type()
	var o __nxstrings.Builder
	o.WriteString(`{"c":`)
	__nxStr(&o, ty.Name())
	o.WriteString(`,"f":{`)
	first := true
	for i := 0; i < s.NumField(); i++ {
		var t __nxstrings.Builder
		if !__nxSer(&t, s.Field(i), 1) {
			continue
		}
		if !first {
			o.WriteByte(',')
		}
		first = false
		__nxStr(&o, ty.Field(i).Name)
		o.WriteByte(':')
		o.WriteString(t.String())
	}
	o.WriteString("}}")
	__nxSeen[id] = o.String()
	return true
}

func __nxHeapDelta() string {
	var h __nxstrings.Builder
	for _, id := range __nxSeenOrder {
		s := __nxSeen[id]
		if __nxLastObj[id] == s {
			continue
		}
		__nxLastObj[id] = s
		if h.Len() > 0 {
			h.WriteByte(',')
		}
		h.WriteString(`"` + __nxstrconv.Itoa(id) + `":` + s)
	}
	__nxSeen = map[int]string{}
	__nxSeenOrder = __nxSeenOrder[:0]
	return h.String()
}

func __nxEmit(s string) {
	if !__nxOn {
		return
	}
	__nxEvents++
	__nxBytes += int64(len(s))
	if __nxEvents > __nxMaxEv || __nxBytes > __nxMaxB {
		__nxOn = false
		__nxos.Stderr.WriteString("\x1eNXT {\"e\":\"cap\"}\n")
		return
	}
	__nxos.Stderr.WriteString("\x1eNXT " + s + "\n")
}

type __nxKV struct{ k, v string }

// name/value pairs → name → JSON, leaving out what can't be drawn.
func __nxVars(nv []any) []__nxKV {
	out := make([]__nxKV, 0, len(nv)/2)
	for i := 0; i+1 < len(nv); i += 2 {
		name, _ := nv[i].(string)
		var b __nxstrings.Builder
		ok := func() (ok bool) {
			defer func() {
				if recover() != nil {
					ok = false
				}
			}()
			return __nxSer(&b, __nxreflect.ValueOf(nv[i+1]), 0)
		}()
		if ok {
			// A later name with the same spelling (a shadowing variable) wins.
			for j := range out {
				if out[j].k == name {
					out = append(out[:j], out[j+1:]...)
					break
				}
			}
			out = append(out, __nxKV{name, b.String()})
		}
	}
	return out
}

type __nxF struct {
	k, pend, line int
	last          map[string]string
	order         []string
	retv          string
	hasRet        bool
}

func __nxCall(fn string, l int, nv ...any) *__nxF {
	__nxCalls++
	f := &__nxF{k: __nxCalls, pend: -1, line: l, last: map[string]string{}}
	if __nxOn {
		var ch __nxstrings.Builder
		for _, kv := range __nxVars(nv) {
			f.last[kv.k] = kv.v
			f.order = append(f.order, kv.k)
			if ch.Len() > 0 {
				ch.WriteByte(',')
			}
			__nxStr(&ch, kv.k)
			ch.WriteString(":" + kv.v)
		}
		var ev __nxstrings.Builder
		ev.WriteString(`{"e":"call","f":`)
		__nxStr(&ev, fn)
		ev.WriteString(__nxfmt.Sprintf(`,"k":%d,"d":%d,"l":%d,"o":%d`, f.k, __nxDepth, l, __nxOut))
		if ch.Len() > 0 {
			ev.WriteString(`,"v":{` + ch.String() + "}")
		}
		if h := __nxHeapDelta(); h != "" {
			ev.WriteString(`,"h":{` + h + "}")
		}
		ev.WriteString("}")
		__nxEmit(ev.String())
	}
	__nxDepth++
	return f
}

func (f *__nxF) flush(nv []any, withVars bool) {
	if f.pend < 0 {
		return
	}
	var ch, gone __nxstrings.Builder
	if withVars {
		now := __nxVars(nv)
		has := map[string]bool{}
		for _, kv := range now {
			has[kv.k] = true
			if f.last[kv.k] == kv.v {
				if _, ok := f.last[kv.k]; ok {
					continue
				}
			}
			if _, ok := f.last[kv.k]; !ok {
				f.order = append(f.order, kv.k)
			}
			f.last[kv.k] = kv.v
			if ch.Len() > 0 {
				ch.WriteByte(',')
			}
			__nxStr(&ch, kv.k)
			ch.WriteString(":" + kv.v)
		}
		keep := f.order[:0]
		for _, n := range f.order {
			if has[n] {
				keep = append(keep, n)
				continue
			}
			delete(f.last, n)
			if gone.Len() > 0 {
				gone.WriteByte(',')
			}
			__nxStr(&gone, n)
		}
		f.order = keep
	}
	var ev __nxstrings.Builder
	ev.WriteString(__nxfmt.Sprintf(`{"e":"line","l":%d,"k":%d,"o":%d`, f.pend, f.k, __nxOut))
	if ch.Len() > 0 {
		ev.WriteString(`,"v":{` + ch.String() + "}")
	}
	if gone.Len() > 0 {
		ev.WriteString(`,"x":[` + gone.String() + "]")
	}
	if h := __nxHeapDelta(); h != "" {
		ev.WriteString(`,"h":{` + h + "}")
	}
	ev.WriteString("}")
	__nxEmit(ev.String())
	f.pend = -1
}

// Line l is about to run: the line before it has finished, so send it with the variables as they are now.
func (f *__nxF) at(l int, nv ...any) {
	if !__nxOn {
		return
	}
	if f.pend >= 0 {
		f.flush(nv, true)
	}
	f.pend = l
}

// The top of a loop pass: send the loop line (its update has run) before the body starts.
func (f *__nxF) head(nv ...any) {
	if __nxOn && f.pend >= 0 {
		f.flush(nv, true)
	}
}

// The end of a loop pass, before the loop's own update runs.
func (f *__nxF) tail(l int, nv ...any) bool {
	f.at(l, nv...)
	return true
}

func (f *__nxF) end(nv ...any) {
	if __nxOn && f.pend >= 0 {
		f.line = f.pend
		f.flush(nv, true)
	}
}

// __nxRet notes the value a function returns, and passes it through unchanged.
func __nxRet[T any](f *__nxF, v T, nv ...any) T {
	if __nxOn {
		var b __nxstrings.Builder
		if __nxSer(&b, __nxreflect.ValueOf(&v).Elem(), 0) {
			f.retv, f.hasRet = b.String(), true
		}
		if f.pend >= 0 {
			f.line = f.pend
			f.flush(nv, true)
		}
	}
	return v
}

// __nxDone runs when a traced function ends (deferred): a panic is reported
// once, on the line that was running, and then goes on exactly as before.
func __nxDone(f *__nxF, r any) {
	if r != nil && !__nxReported {
		__nxReported = true
		line := f.line
		if f.pend >= 0 {
			line = f.pend
		}
		var ev __nxstrings.Builder
		ev.WriteString(__nxfmt.Sprintf(`{"e":"exc","k":%d,"l":%d,"m":`, f.k, line))
		__nxStr(&ev, __nxfmt.Sprint(r))
		ev.WriteString(__nxfmt.Sprintf(`,"o":%d}`, __nxOut))
		was := __nxOn
		__nxOn = true
		if __nxEvents >= __nxMaxEv {
			__nxEvents = __nxMaxEv - 1
		}
		__nxEmit(ev.String())
		__nxOn = was
		f.pend = -1 // that line did not finish
	}
	__nxDepth--
	if __nxOn {
		l := f.line
		if f.pend >= 0 {
			l = f.pend
		}
		f.flush(nil, false)
		var ev __nxstrings.Builder
		ev.WriteString(__nxfmt.Sprintf(`{"e":"ret","k":%d,"l":%d,"o":%d`, f.k, l, __nxOut))
		if f.hasRet {
			ev.WriteString(`,"r":` + f.retv)
		}
		if h := __nxHeapDelta(); h != "" {
			ev.WriteString(`,"h":{` + h + "}")
		}
		ev.WriteString("}")
		__nxEmit(ev.String())
	}
	if r != nil {
		panic(r)
	}
}
