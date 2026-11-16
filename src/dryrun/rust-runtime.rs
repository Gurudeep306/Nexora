
/* NexoraGuru dry-run runtime for Rust (appended to the student's program by
   src/dryrun/rust.js). It writes the same JSON events as the Python tracer
   (format: src/dryrun/index.js) to stderr after the marker "\x1eNXT ".
   Values are read through the __NxS trait; a type it does not know falls
   back to its Debug text, or is left out — never a compile error. */
#[allow(dead_code, non_snake_case, non_upper_case_globals, unused)]
pub mod __nx_rt {
    use std::cell::{Cell, RefCell};
    use std::collections::{BTreeMap, BTreeSet, BinaryHeap, HashMap, HashSet, VecDeque};
    use std::fmt::Write as _;
    use std::io::Write as _;

    thread_local! {
        pub static ON: Cell<bool> = Cell::new(true);
        static EVENTS: Cell<u64> = Cell::new(0);
        static BYTES: Cell<u64> = Cell::new(0);
        pub static OUT: Cell<u64> = Cell::new(0);
        static CALLS: Cell<u64> = Cell::new(0);
        static DEPTH: Cell<u64> = Cell::new(0);
        static STACK: RefCell<Vec<(u64, i64)>> = RefCell::new(Vec::new());
        static IDS: RefCell<HashMap<usize, u64>> = RefCell::new(HashMap::new());
        static SEEN: RefCell<Vec<(u64, String)>> = RefCell::new(Vec::new());
        static LAST_OBJ: RefCell<HashMap<u64, String>> = RefCell::new(HashMap::new());
        static REPORTED: Cell<bool> = Cell::new(false);
    }
    const MAXEV: u64 = 3000;
    const MAXB: u64 = 1_500_000;
    const MAXOBJ: usize = 300;

    pub fn on() -> bool { ON.with(|c| c.get()) }
    pub fn count(n: usize) { OUT.with(|c| c.set(c.get() + n as u64)); }
    fn out() -> u64 { OUT.with(|c| c.get()) }

    pub fn jstr(w: &mut String, s: &str) {
        w.push('"');
        for (n, c) in s.chars().enumerate() {
            if n >= 300 { w.push('…'); break; }
            match c {
                '"' => w.push_str("\\\""),
                '\\' => w.push_str("\\\\"),
                c if (c as u32) < 0x20 => { let _ = write!(w, "\\u{:04x}", c as u32); }
                c => w.push(c),
            }
        }
        w.push('"');
    }
    fn jint(w: &mut String, v: i128) {
        if v > 9007199254740992 || v < -9007199254740992 { let _ = write!(w, "{{\"t\":\"big\",\"s\":\"{}\"}}", v); } else { let _ = write!(w, "{}", v); }
    }
    fn jfloat(w: &mut String, v: f64) {
        if v.is_nan() { w.push_str("{\"t\":\"num\",\"s\":\"nan\"}"); }
        else if v.is_infinite() { w.push_str(if v > 0.0 { "{\"t\":\"num\",\"s\":\"inf\"}" } else { "{\"t\":\"num\",\"s\":\"-inf\"}" }); }
        else if v == v.trunc() && v.abs() < 1e15 { let _ = write!(w, "{}", v as i64); }
        else { let _ = write!(w, "{}", v); }
    }

    /* ── the serializer ── */
    pub trait S {
        fn nx(&self, w: &mut String) -> bool;
        /** Zero / empty: used to find the part of a big array in use. */
        fn blank(&self) -> bool { false }
    }
    macro_rules! ints { ($($t:ty),*) => { $(impl S for $t { fn nx(&self, w: &mut String) -> bool { jint(w, *self as i128); true } fn blank(&self) -> bool { *self == 0 } })* } }
    ints!(i8, i16, i32, i64, i128, isize, u8, u16, u32, u64, u128, usize);
    impl S for f32 { fn nx(&self, w: &mut String) -> bool { jfloat(w, *self as f64); true } fn blank(&self) -> bool { *self == 0.0 } }
    impl S for f64 { fn nx(&self, w: &mut String) -> bool { jfloat(w, *self); true } fn blank(&self) -> bool { *self == 0.0 } }
    impl S for bool { fn nx(&self, w: &mut String) -> bool { w.push_str(if *self { "true" } else { "false" }); true } fn blank(&self) -> bool { !*self } }
    impl S for char { fn nx(&self, w: &mut String) -> bool { jstr(w, &self.to_string()); true } fn blank(&self) -> bool { *self == '\0' } }
    impl S for String { fn nx(&self, w: &mut String) -> bool { jstr(w, self); true } fn blank(&self) -> bool { self.is_empty() } }
    impl S for str { fn nx(&self, w: &mut String) -> bool { jstr(w, self); true } }
    impl S for () { fn nx(&self, w: &mut String) -> bool { false } }
    impl<T: S + ?Sized> S for &T { fn nx(&self, w: &mut String) -> bool { (**self).nx(w) } fn blank(&self) -> bool { (**self).blank() } }
    impl<T: S + ?Sized> S for &mut T { fn nx(&self, w: &mut String) -> bool { (**self).nx(w) } fn blank(&self) -> bool { (**self).blank() } }
    impl<T: S + ?Sized> S for Box<T> { fn nx(&self, w: &mut String) -> bool { (**self).nx(w) } fn blank(&self) -> bool { (**self).blank() } }
    impl<T: S + ?Sized> S for std::rc::Rc<T> { fn nx(&self, w: &mut String) -> bool { (**self).nx(w) } }
    impl<T: S> S for RefCell<T> {
        fn nx(&self, w: &mut String) -> bool { match self.try_borrow() { Ok(b) => b.nx(w), Err(_) => false } }
    }
    impl<T: S> S for Cell<T> where T: Copy { fn nx(&self, w: &mut String) -> bool { self.get().nx(w) } }
    impl<T: S> S for Option<T> {
        fn nx(&self, w: &mut String) -> bool { match self { None => { w.push_str("null"); true } Some(x) => x.nx(w) } }
        fn blank(&self) -> bool { self.is_none() }
    }
    impl<T: S> S for std::cmp::Reverse<T> { fn nx(&self, w: &mut String) -> bool { self.0.nx(w) } }

    /** Elements of a list; a big one (vec![0; 200005]) shows the part in use. */
    fn list<'a, T: S + 'a>(w: &mut String, t: &str, n: usize, it: impl Iterator<Item = &'a T> + Clone) -> bool {
        let mut k = n;
        if n > 80 {
            k = 0;
            for (i, x) in it.clone().take(10000).enumerate() { if !x.blank() { k = i + 1; } }
            if k == 0 { k = 10; }
        }
        let _ = write!(w, "{{\"t\":\"{}\",\"n\":{},\"i\":[", t, n);
        for (i, x) in it.take(k.min(80)).enumerate() {
            if i > 0 { w.push(','); }
            if !x.nx(w) { w.push_str("null"); }
        }
        w.push_str("]}");
        true
    }
    impl<T: S> S for [T] { fn nx(&self, w: &mut String) -> bool { list(w, "list", self.len(), self.iter()) } fn blank(&self) -> bool { self.is_empty() } }
    impl<T: S> S for Vec<T> { fn nx(&self, w: &mut String) -> bool { list(w, "list", self.len(), self.iter()) } fn blank(&self) -> bool { self.is_empty() } }
    impl<T: S, const N: usize> S for [T; N] { fn nx(&self, w: &mut String) -> bool { list(w, "list", N, self.iter()) } }
    impl<T: S> S for VecDeque<T> { fn nx(&self, w: &mut String) -> bool { list(w, "deque", self.len(), self.iter()) } fn blank(&self) -> bool { self.is_empty() } }
    // A BinaryHeap in its array order: the picture-picker draws the heap's tree from it.
    impl<T: S + Ord> S for BinaryHeap<T> { fn nx(&self, w: &mut String) -> bool { list(w, "list", self.len(), self.iter()) } }
    impl<T: S> S for BTreeSet<T> { fn nx(&self, w: &mut String) -> bool { list(w, "set", self.len(), self.iter()) } }
    impl<T: S + Ord> S for HashSet<T> {
        fn nx(&self, w: &mut String) -> bool { let mut v: Vec<&T> = self.iter().collect(); v.sort(); list(w, "set", v.len(), v.iter().map(|x| *x).collect::<Vec<_>>().iter()) }
    }
    fn dict<'a, K: S + 'a, V: S + 'a>(w: &mut String, n: usize, it: impl Iterator<Item = (&'a K, &'a V)>) -> bool {
        let _ = write!(w, "{{\"t\":\"dict\",\"n\":{},\"k\":[", n);
        for (i, (k, v)) in it.take(80).enumerate() {
            if i > 0 { w.push(','); }
            w.push('[');
            if !k.nx(w) { w.push_str("null"); }
            w.push(',');
            if !v.nx(w) { w.push_str("null"); }
            w.push(']');
        }
        w.push_str("]}");
        true
    }
    impl<K: S, V: S> S for BTreeMap<K, V> { fn nx(&self, w: &mut String) -> bool { dict(w, self.len(), self.iter()) } }
    // A HashMap is drawn sorted by key, so it does not jump about between steps.
    impl<K: S + Ord, V: S> S for HashMap<K, V> {
        fn nx(&self, w: &mut String) -> bool { let mut v: Vec<(&K, &V)> = self.iter().collect(); v.sort_by(|a, b| a.0.cmp(b.0)); dict(w, v.len(), v.into_iter()) }
    }
    macro_rules! tuples { ($( ($($n:tt $t:ident),+) )*) => { $(impl<$($t: S),+> S for ($($t,)+) {
        fn nx(&self, w: &mut String) -> bool {
            let mut n = 0; $( let _ = $n; n += 1; )+
            let _ = write!(w, "{{\"t\":\"tuple\",\"n\":{},\"i\":[", n);
            let mut first = true;
            $( if !first { w.push(','); } first = false; if !self.$n.nx(w) { w.push_str("null"); } )+
            w.push_str("]}"); true
        }
    })* } }
    tuples!((0 A) (0 A, 1 B) (0 A, 1 B, 2 C) (0 A, 1 B, 2 C, 3 D));

    /* ── autoref specialisation: S if the type has it, else Debug text, else nothing ── */
    pub struct W<'a, T: ?Sized>(pub &'a T);
    pub trait ViaS { fn nx_any(&self, w: &mut String) -> bool; }
    impl<'a, T: S + ?Sized> ViaS for &&W<'a, T> { fn nx_any(&self, w: &mut String) -> bool { self.0.nx(w) } }
    pub trait ViaDebug { fn nx_any(&self, w: &mut String) -> bool; }
    impl<'a, T: std::fmt::Debug + ?Sized> ViaDebug for &W<'a, T> {
        fn nx_any(&self, w: &mut String) -> bool {
            let s = format!("{:?}", self.0);
            if s.len() > 200 { return false; }
            // Iterators and input / output plumbing are not the program's data.
            const PLUMBING: [&str; 24] = ["Map {", "Split", "Chars", "CharIndices", "Bytes", "Peekable", "Lines", "Stdin", "Stdout", "Stderr", "BufWriter", "BufReader", "Iter", "IntoIter", "Rev", "Zip", "Enumerate", "Take", "Skip", "Filter", "StepBy", "Cloned", "Copied", "Range"];
            if PLUMBING.iter().any(|p| s.starts_with(p)) || s.contains("iter:") { return false; }
            w.push_str("{\"t\":\"str\",\"s\":"); jstr(w, &s); w.push('}'); true
        }
    }
    pub trait ViaNone { fn nx_any(&self, w: &mut String) -> bool; }
    impl<'a, T: ?Sized> ViaNone for W<'a, T> { fn nx_any(&self, _w: &mut String) -> bool { false } }

    /* ── objects (the program's own structs), by address, so links can be drawn ── */
    pub fn obj(addr: usize, class: &str, w: &mut String, fields: &dyn Fn() -> Vec<(&'static str, Option<String>)>) -> bool {
        let id = IDS.with(|m| { let mut m = m.borrow_mut(); let n = m.len() as u64 + 1; *m.entry(addr).or_insert(n) });
        let _ = write!(w, "{{\"t\":\"ref\",\"id\":{}}}", id);
        let fresh = SEEN.with(|s| { let s = s.borrow(); !s.iter().any(|(i, _)| *i == id) && s.len() < MAXOBJ });
        if !fresh { return true; }
        SEEN.with(|s| s.borrow_mut().push((id, String::new())));
        let mut o = String::from("{\"c\":");
        jstr(&mut o, class);
        o.push_str(",\"f\":{");
        let mut first = true;
        for (name, v) in fields() {
            if let Some(v) = v { if !first { o.push(','); } first = false; jstr(&mut o, name); o.push(':'); o.push_str(&v); }
        }
        o.push_str("}}");
        SEEN.with(|s| { for e in s.borrow_mut().iter_mut() { if e.0 == id { e.1 = o.clone(); } } });
        true
    }
    fn heap_delta() -> String {
        let seen: Vec<(u64, String)> = SEEN.with(|s| std::mem::take(&mut *s.borrow_mut()));
        let mut h = String::new();
        LAST_OBJ.with(|l| {
            let mut l = l.borrow_mut();
            for (id, s) in seen {
                if l.get(&id) == Some(&s) { continue; }
                if !h.is_empty() { h.push(','); }
                let _ = write!(h, "\"{}\":{}", id, s);
                l.insert(id, s);
            }
        });
        h
    }

    fn emit(s: &str) {
        if !on() { return; }
        let e = EVENTS.with(|c| { c.set(c.get() + 1); c.get() });
        let b = BYTES.with(|c| { c.set(c.get() + s.len() as u64); c.get() });
        let mut err = std::io::stderr().lock();
        if e > MAXEV || b > MAXB {
            ON.with(|c| c.set(false));
            let _ = err.write_all(b"\x1eNXT {\"e\":\"cap\"}\n");
            return;
        }
        let _ = err.write_all(format!("\x1eNXT {}\n", s).as_bytes());
    }

    pub type Vars<'a> = &'a [(&'static str, Option<String>)];

    pub struct F {
        k: u64,
        pend: Cell<i64>,
        line: Cell<i64>,
        last: RefCell<Vec<(&'static str, String)>>,
        retv: RefCell<Option<String>>,
    }
    impl F {
        pub fn call(fname: &str, l: i64, nv: Vars) -> F {
            let k = CALLS.with(|c| { c.set(c.get() + 1); c.get() });
            let f = F { k, pend: Cell::new(-1), line: Cell::new(l), last: RefCell::new(Vec::new()), retv: RefCell::new(None) };
            STACK.with(|s| s.borrow_mut().push((k, l)));
            if on() {
                let mut ch = String::new();
                for (n, v) in nv { if let Some(v) = v { f.last.borrow_mut().push((n, v.clone())); if !ch.is_empty() { ch.push(','); } jstr(&mut ch, n); ch.push(':'); ch.push_str(v); } }
                let mut ev = String::from("{\"e\":\"call\",\"f\":");
                jstr(&mut ev, fname);
                let _ = write!(ev, ",\"k\":{},\"d\":{},\"l\":{},\"o\":{}", k, DEPTH.with(|d| d.get()), l, out());
                if !ch.is_empty() { let _ = write!(ev, ",\"v\":{{{}}}", ch); }
                let h = heap_delta();
                if !h.is_empty() { let _ = write!(ev, ",\"h\":{{{}}}", h); }
                ev.push('}');
                emit(&ev);
            }
            DEPTH.with(|d| d.set(d.get() + 1));
            f
        }
        fn flush(&self, nv: Option<Vars>) {
            let pend = self.pend.get();
            if pend < 0 { return; }
            let mut ch = String::new();
            let mut gone = String::new();
            if let Some(nv) = nv {
                let mut last = self.last.borrow_mut();
                let mut now: Vec<(&'static str, String)> = Vec::new();
                for (n, v) in nv { if let Some(v) = v { now.retain(|(m, _)| m != n); now.push((n, v.clone())); } }
                for (n, v) in &now {
                    match last.iter_mut().find(|(m, _)| m == n) {
                        Some(e) if &e.1 == v => continue,
                        Some(e) => e.1 = v.clone(),
                        None => last.push((n, v.clone())),
                    }
                    if !ch.is_empty() { ch.push(','); }
                    jstr(&mut ch, n); ch.push(':'); ch.push_str(v);
                }
                last.retain(|(m, _)| {
                    let keep = now.iter().any(|(n, _)| n == m);
                    if !keep { if !gone.is_empty() { gone.push(','); } jstr(&mut gone, m); }
                    keep
                });
            }
            let mut ev = String::new();
            let _ = write!(ev, "{{\"e\":\"line\",\"l\":{},\"k\":{},\"o\":{}", pend, self.k, out());
            if !ch.is_empty() { let _ = write!(ev, ",\"v\":{{{}}}", ch); }
            if !gone.is_empty() { let _ = write!(ev, ",\"x\":[{}]", gone); }
            let h = heap_delta();
            if !h.is_empty() { let _ = write!(ev, ",\"h\":{{{}}}", h); }
            ev.push('}');
            emit(&ev);
            self.pend.set(-1);
        }
        /** Line l is about to run: the line before it has finished, so send it with the variables as they are now. */
        pub fn at(&self, l: i64, nv: Vars) {
            if !on() { return; }
            if self.pend.get() >= 0 { self.flush(Some(nv)); }
            self.pend.set(l);
            STACK.with(|s| { if let Some(t) = s.borrow_mut().iter_mut().rev().find(|e| e.0 == self.k) { t.1 = l; } });
        }
        /** The top of a loop pass: send the loop line before the body starts. */
        pub fn head(&self, nv: Vars) { if on() && self.pend.get() >= 0 { self.flush(Some(nv)); } }
        /** The end of a loop pass (a while loop's condition). */
        pub fn tail(&self, l: i64, nv: Vars) -> bool { self.at(l, nv); true }
        pub fn keep(&self, v: Option<String>) {
            if !on() { return; }
            *self.retv.borrow_mut() = v;
        }
    }
    impl Drop for F {
        fn drop(&mut self) {
            DEPTH.with(|d| d.set(d.get().saturating_sub(1)));
            STACK.with(|s| { let mut s = s.borrow_mut(); if let Some(p) = s.iter().rposition(|e| e.0 == self.k) { s.remove(p); } });
            if !on() { return; }
            let l = if self.pend.get() >= 0 { self.pend.get() } else { self.line.get() };
            self.flush(None);
            let mut ev = String::new();
            let _ = write!(ev, "{{\"e\":\"ret\",\"k\":{},\"l\":{},\"o\":{}", self.k, l, out());
            if let Some(r) = self.retv.borrow().as_ref() { let _ = write!(ev, ",\"r\":{}", r); }
            let h = heap_delta();
            if !h.is_empty() { let _ = write!(ev, ",\"h\":{{{}}}", h); }
            ev.push('}');
            emit(&ev);
        }
    }

    /** A panic is reported once, on its line, then Rust's own message is printed as before. */
    pub fn hook() {
        let prev = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            if !REPORTED.with(|r| r.replace(true)) {
                let k = STACK.with(|s| s.borrow().last().map(|e| e.0).unwrap_or(0));
                let line = info.location().map(|l| l.line() as i64).unwrap_or_else(|| STACK.with(|s| s.borrow().last().map(|e| e.1).unwrap_or(0)));
                let msg = info.payload().downcast_ref::<&str>().map(|s| s.to_string()).or_else(|| info.payload().downcast_ref::<String>().cloned()).unwrap_or_else(|| "panicked".to_string());
                let mut ev = String::new();
                let _ = write!(ev, "{{\"e\":\"exc\",\"k\":{},\"l\":{},\"m\":", k, line);
                jstr(&mut ev, &msg);
                let _ = write!(ev, ",\"o\":{}}}", out());
                let was = on();
                ON.with(|c| c.set(true));
                EVENTS.with(|c| if c.get() >= MAXEV { c.set(MAXEV - 1) });
                emit(&ev);
                ON.with(|c| c.set(was));
            }
            prev(info);
        }));
    }
}

#[macro_export]
#[doc(hidden)]
macro_rules! __nx_s {
    ($e:expr) => {{
        #[allow(unused_imports)]
        use $crate::__nx_rt::{ViaDebug as _, ViaNone as _, ViaS as _};
        let mut __w = String::new();
        if (&&&$crate::__nx_rt::W(&$e)).nx_any(&mut __w) { Some(__w) } else { None }
    }};
}
#[macro_export]
#[doc(hidden)]
macro_rules! __nx_println {
    () => {{ $crate::__nx_rt::count(1); println!() }};
    ($($t:tt)*) => {{ let __s = format!($($t)*); $crate::__nx_rt::count(__s.chars().count() + 1); println!("{}", __s) }};
}
#[macro_export]
#[doc(hidden)]
macro_rules! __nx_print {
    ($($t:tt)*) => {{ let __s = format!($($t)*); $crate::__nx_rt::count(__s.chars().count()); print!("{}", __s) }};
}
#[macro_export]
#[doc(hidden)]
macro_rules! __nx_writeln {
    ($w:expr) => {{ $crate::__nx_rt::count(1); writeln!($w) }};
    ($w:expr, $($t:tt)*) => {{ let __s = format!($($t)*); $crate::__nx_rt::count(__s.chars().count() + 1); writeln!($w, "{}", __s) }};
}
#[macro_export]
#[doc(hidden)]
macro_rules! __nx_write {
    ($w:expr, $($t:tt)*) => {{ let __s = format!($($t)*); $crate::__nx_rt::count(__s.chars().count()); write!($w, "{}", __s) }};
}
