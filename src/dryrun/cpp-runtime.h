// NexoraGuru dry-run runtime for C++ (prepended to the student's program by
// src/dryrun/cpp.js). It writes the same JSON events as the Python tracer
// (format: src/dryrun/index.js) to stderr, after the marker "\x1eNXT ".
// Nothing here prints to stdout.
// Exact headers, not <bits/stdc++.h>: the judge swaps that one out on some
// compilers, and the runtime must build with GCC and Clang alike.
#include <algorithm>
#include <array>
#include <bitset>
#include <climits>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <deque>
#include <functional>
#include <iostream>
#include <iterator>
#include <list>
#include <map>
#include <numeric>
#include <optional>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <string_view>
#include <tuple>
#include <type_traits>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
#include <csignal>
#if __has_include(<unistd.h>)
#include <unistd.h>
#define __NX_POSIX 1
#endif

namespace __nx {
static bool busy = false;          // the runtime itself is working: its allocations are not the program's
static long long outn = 0;         // characters the program has printed
static long events = 0, bytes = 0;
static bool on = true;
static const long MAXEV = 3000, MAXB = 1500000, MAXOBJ = 300;
static int calls = 0;

/* ── allocations made with new, so only real objects are followed ── */
static const size_t TB = 1 << 17;
static const void* table[TB];
static const void* const TOMB = (const void*)1;
static size_t used = 0;
static size_t slot(const void* p) { return (size_t)(((uintptr_t)p >> 4) * 11400714819323198485ull) & (TB - 1); }
static void track(const void* p) {
  if (used > TB / 2) return;
  for (size_t i = slot(p);; i = (i + 1) & (TB - 1))
    if (table[i] == nullptr || table[i] == TOMB) { table[i] = p; used++; return; }
}
static void untrack(const void* p) {
  for (size_t i = slot(p), n = 0; table[i] != nullptr && n < TB; i = (i + 1) & (TB - 1), n++)
    if (table[i] == p) { table[i] = TOMB; return; }
}
static bool tracked(const void* p) {
  for (size_t i = slot(p), n = 0; table[i] != nullptr && n < TB; i = (i + 1) & (TB - 1), n++)
    if (table[i] == p) return true;
  return false;
}

/* ── JSON ── */
struct W {
  std::string s;
  void raw(const char* x) { s += x; }
  void str(const std::string& x) {
    s += '"';
    size_t n = 0;
    for (unsigned char c : x) {
      if (++n > 300) { s += "\xe2\x80\xa6"; break; }
      if (c == '"' || c == '\\') { s += '\\'; s += (char)c; }
      else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); s += b; }
      else s += (char)c;
    }
    s += '"';
  }
  template <class I> void integer(I v) {
    bool neg = v < 0;
    unsigned __int128 u = neg ? (unsigned __int128)(-(__int128)v) : (unsigned __int128)v;
    char b[48]; int k = 47; b[k] = 0;
    do { b[--k] = (char)('0' + (int)(u % 10)); u /= 10; } while (u);
    if (neg) b[--k] = '-';
    bool big = neg ? (unsigned __int128)(-(__int128)v) > ((unsigned __int128)1 << 53) : (unsigned __int128)v > ((unsigned __int128)1 << 53);
    if (big) { s += "{\"t\":\"big\",\"s\":\""; s += b + k; s += "\"}"; }
    else s += b + k;
  }
  void num(long double v) {
    if (std::isnan(v)) { s += "{\"t\":\"num\",\"s\":\"nan\"}"; return; }
    if (std::isinf(v)) { s += v > 0 ? "{\"t\":\"num\",\"s\":\"inf\"}" : "{\"t\":\"num\",\"s\":\"-inf\"}"; return; }
    char b[64]; snprintf(b, sizeof b, "%.10Lg", v); s += b;
  }
};

/* ── type traits ── */
template <class T, class = void> struct has_fields : std::false_type {};
struct Obj;
template <class T> struct has_fields<T, std::void_t<decltype(__nx_fields(std::declval<const T&>(), std::declval<Obj&>()))>> : std::true_type {};
template <class T, class = void> struct iterable : std::false_type {};
template <class T> struct iterable<T, std::void_t<decltype(std::begin(std::declval<const T&>())), decltype(std::end(std::declval<const T&>()))>> : std::true_type {};
template <class T, class = void> struct mapped : std::false_type {};
template <class T> struct mapped<T, std::void_t<typename T::mapped_type, typename T::key_type>> : std::true_type {};
template <class T, class = void> struct keyed : std::false_type {};
template <class T> struct keyed<T, std::void_t<typename T::key_type>> : std::true_type {};
template <class T> struct is_pair : std::false_type {};
template <class A, class B> struct is_pair<std::pair<A, B>> : std::true_type {};
template <class T> struct is_tuple : std::false_type {};
template <class... A> struct is_tuple<std::tuple<A...>> : std::true_type {};
template <class T> struct is_deque : std::false_type {};
template <class T, class A> struct is_deque<std::deque<T, A>> : std::true_type {};
template <class T> struct is_stack : std::false_type {};
template <class T, class C> struct is_stack<std::stack<T, C>> : std::true_type {};
template <class T> struct is_queue : std::false_type {};
template <class T, class C> struct is_queue<std::queue<T, C>> : std::true_type {};
template <class T> struct is_pq : std::false_type {};
template <class T, class C, class P> struct is_pq<std::priority_queue<T, C, P>> : std::true_type {};
template <class T> struct is_bitset : std::false_type {};
template <size_t N> struct is_bitset<std::bitset<N>> : std::true_type {};
template <class T> struct is_optional : std::false_type {};
template <class T> struct is_optional<std::optional<T>> : std::true_type {};
template <class T> struct is_str : std::false_type {};
template <> struct is_str<std::string> : std::true_type {};
template <> struct is_str<std::string_view> : std::true_type {};

/** The container inside a stack, queue or priority_queue (its protected member c). */
template <class A> const typename A::container_type& inner(const A& a) {
  struct H : A { static const typename A::container_type& get(const A& x) { return x.*&H::c; } };
  return H::get(a);
}

template <class T> bool ser(W& w, const T& v);

/* ── objects: structs by address, so links between them can be drawn ── */
struct Obj {
  W* body;
  const char* c = "object";
  bool first = true;
  template <class T> void f(const char* name, const T& v) {
    W tmp;
    if (!ser(tmp, v)) return;
    body->s += first ? "" : ",";
    first = false;
    body->s += '"'; body->s += name; body->s += "\":"; body->s += tmp.s;
  }
};
static std::unordered_map<const void*, int>* ids;
static std::map<int, std::string>* seen;   // objects written in this event
static std::map<int, std::string>* lastObj;
static int nextId = 0;
template <class T> bool ref(W& w, const T& o) {
  if (!ids) { ids = new std::unordered_map<const void*, int>(); seen = new std::map<int, std::string>(); lastObj = new std::map<int, std::string>(); }
  const void* p = (const void*)&o;
  auto it = ids->find(p);
  int id = it == ids->end() ? ((*ids)[p] = ++nextId) : it->second;
  w.s += "{\"t\":\"ref\",\"id\":"; w.s += std::to_string(id); w.s += "}";
  if (seen->count(id) || (long)seen->size() >= MAXOBJ) return true;
  (*seen)[id] = "";
  W body; Obj ob{&body};
  __nx_fields(o, ob);
  (*seen)[id] = std::string("{\"c\":\"") + ob.c + "\",\"f\":{" + body.s + "}}";
  return true;
}

/* ── how much of a fixed array is in use: up to the last element that is not empty or zero ── */
template <class T> bool blank(const T& v) {
  if constexpr (std::is_arithmetic_v<T>) return v == 0;
  else if constexpr (std::is_pointer_v<T>) return v == nullptr;
  else if constexpr (std::is_array_v<T>) { for (const auto& x : v) if (!blank(x)) return false; return true; }
  else if constexpr (iterable<T>::value) return std::begin(v) == std::end(v);
  else return false;
}
template <class T, size_t N> size_t lastUsed(const T (&a)[N]) {
  size_t k = 0;
  for (size_t i = 0; i < N; i++) if (!blank(a[i])) k = i + 1;
  return k;
}
/** A big fixed array (int a[200005]) shows the part in use; one still all zeros shows its first 10. */
template <class T, size_t N> size_t inUse(const T (&a)[N]) {
  if (N <= 80) return N;
  size_t k = lastUsed(a);
  return k ? k : std::min<size_t>(N, 10);
}

template <class It> void items(W& w, It b, It e, size_t n, const char* t) {
  w.s += "{\"t\":\""; w.s += t; w.s += "\",\"n\":"; w.s += std::to_string(n); w.s += ",\"i\":[";
  size_t k = 0;
  for (; b != e && k < 80; ++b, ++k) {
    if (k) w.s += ',';
    if (!ser(w, *b)) w.s += "null";
  }
  w.s += "]}";
}

template <class T> bool ser(W& w, const T& v) {
  using D = std::remove_cv_t<std::remove_reference_t<T>>;
  if constexpr (std::is_same_v<D, bool>) w.raw(v ? "true" : "false");
  else if constexpr (std::is_same_v<D, char> || std::is_same_v<D, signed char> || std::is_same_v<D, unsigned char>) w.str(std::string(1, (char)v));
  else if constexpr (std::is_integral_v<D>) w.integer(v);
  else if constexpr (std::is_same_v<D, __int128> || std::is_same_v<D, unsigned __int128>) w.integer(v);
  else if constexpr (std::is_floating_point_v<D>) w.num((long double)v);
  else if constexpr (std::is_enum_v<D>) w.integer((long long)v);
  else if constexpr (is_str<D>::value) w.str(std::string(v));
  else if constexpr (std::is_array_v<D>) {
    using E = std::remove_cv_t<std::remove_extent_t<D>>;
    constexpr size_t N = std::extent_v<D>;
    if constexpr (std::is_same_v<E, char>) w.str(std::string(v, strnlen(v, N)));
    else {
      size_t k = inUse(v);
      // Rows of a 2D array share one width, so the grid stays square.
      if constexpr (std::is_array_v<E>) {
        constexpr size_t M = std::extent_v<E>;
        size_t cols = 0;
        if (M <= 80) cols = M;
        else {
          for (size_t i = 0; i < k; i++) cols = std::max(cols, lastUsed(v[i]));
          if (!cols) cols = std::min<size_t>(M, 10);
        }
        w.s += "{\"t\":\"list\",\"n\":" + std::to_string(N) + ",\"i\":[";
        for (size_t i = 0; i < k && i < 80; i++) {
          if (i) w.s += ',';
          w.s += "{\"t\":\"list\",\"n\":" + std::to_string(std::extent_v<E>) + ",\"i\":[";
          for (size_t j = 0; j < cols && j < 80; j++) { if (j) w.s += ','; if (!ser(w, v[i][j])) w.s += "null"; }
          w.s += "]}";
        }
        w.s += "]}";
      } else items(w, v, v + k, N, "list");
    }
  }
  else if constexpr (is_pair<D>::value) {
    w.s += "{\"t\":\"tuple\",\"n\":2,\"i\":[";
    if (!ser(w, v.first)) w.s += "null";
    w.s += ',';
    if (!ser(w, v.second)) w.s += "null";
    w.s += "]}";
  }
  else if constexpr (is_tuple<D>::value) {
    w.s += "{\"t\":\"tuple\",\"n\":" + std::to_string(std::tuple_size_v<D>) + ",\"i\":[";
    bool first = true;
    std::apply([&](const auto&... x) { ((w.s += first ? "" : ",", first = false, ser(w, x) || (w.s += "null", true)), ...); }, v);
    w.s += "]}";
  }
  else if constexpr (is_optional<D>::value) { if (!v) w.raw("null"); else if (!ser(w, *v)) w.raw("null"); }
  else if constexpr (is_bitset<D>::value) w.str(v.to_string());
  else if constexpr (is_stack<D>::value) { const auto& c = inner(v); items(w, c.begin(), c.end(), c.size(), "list"); }
  else if constexpr (is_queue<D>::value) { const auto& c = inner(v); items(w, c.begin(), c.end(), c.size(), "deque"); }
  else if constexpr (is_pq<D>::value) { const auto& c = inner(v); items(w, c.begin(), c.end(), c.size(), "list"); }
  else if constexpr (std::is_pointer_v<D>) {
    using P = std::remove_cv_t<std::remove_pointer_t<D>>;
    if (v == nullptr) { w.raw("null"); return true; }
    if constexpr (has_fields<P>::value) { if (!tracked((const void*)v)) return false; return ref(w, *v); }
    else return false;
  }
  else if constexpr (has_fields<D>::value) return ref(w, v);
  else if constexpr (mapped<D>::value) {
    w.s += "{\"t\":\"dict\",\"n\":" + std::to_string(v.size()) + ",\"k\":[";
    size_t k = 0;
    for (const auto& kv : v) {
      if (k == 80) break;
      if (k++) w.s += ',';
      w.s += '[';
      if (!ser(w, kv.first)) w.s += "null";
      w.s += ',';
      if (!ser(w, kv.second)) w.s += "null";
      w.s += ']';
    }
    w.s += "]}";
  }
  else if constexpr (keyed<D>::value) items(w, v.begin(), v.end(), v.size(), "set");
  else if constexpr (is_deque<D>::value) items(w, v.begin(), v.end(), v.size(), "deque");
  else if constexpr (iterable<D>::value) items(w, std::begin(v), std::end(v), (size_t)std::distance(std::begin(v), std::end(v)), "list");
  else return false;
  return true;
}

/* ── output: count what the program prints ── */
struct Count : std::streambuf {
  std::streambuf* in;
  int overflow(int c) override { if (c == EOF) return 0; outn++; return in->sputc((char)c); }
  std::streamsize xsputn(const char* s, std::streamsize n) override { outn += n; return in->sputn(s, n); }
  int sync() override { return in->pubsync(); }
};
static Count* count;
inline void hook() {
  bool b = busy; busy = true;
  if (!count) count = new Count();
  if (std::cout.rdbuf() != count) { count->in = std::cout.rdbuf(); std::cout.rdbuf(count); }
  busy = b;
}
struct Hook { Hook() { hook(); } };
static Hook hooked;

/* ── events ── */
static void emit(const std::string& s) {
  if (!on) return;
  events++; bytes += (long)s.size();
  if (events > MAXEV || bytes > MAXB) { on = false; fputs("\x1eNXT {\"e\":\"cap\"}\n", stderr); return; }
  fputs("\x1eNXT ", stderr); fputs(s.c_str(), stderr); fputc('\n', stderr);
}
/** Objects that changed since they were last sent. */
static std::string heapDelta() {
  std::string h;
  if (!seen) return h;
  for (auto& [id, js] : *seen) {
    auto it = lastObj->find(id);
    if (it != lastObj->end() && it->second == js) continue;
    (*lastObj)[id] = js;
    h += h.empty() ? "" : ",";
    h += "\"" + std::to_string(id) + "\":" + js;
  }
  seen->clear();
  return h;
}

struct V {
  std::vector<std::pair<std::string, std::string>> vars;
  template <class T> void operator()(const char* name, const T& v) {
    W w;
    if (!ser(w, v)) return;
    for (auto& p : vars) if (p.first == name) { p.second = w.s; return; }
    vars.emplace_back(name, w.s);
  }
};

static int depth = 0;
struct Frame;
static Frame* top = nullptr;   // the running call, for a crash report
struct Frame {
  int k, pend = -1, line;
  Frame* up = top;
  std::map<std::string, std::string> last;
  std::string retv;
  bool hasRet = false;
  template <class F> Frame(const char* fn, int l, F vars) : line(l) {
    k = ++calls;
    top = this;
    if (!on) { depth++; return; }
    bool b = busy; busy = true;
    V v; vars(v);
    std::string ch;
    for (auto& [n, js] : v.vars) { last[n] = js; ch += (ch.empty() ? "" : ",") + ("\"" + n + "\":" + js); }
    std::string ev = "{\"e\":\"call\",\"f\":\"" + std::string(fn) + "\",\"k\":" + std::to_string(k) + ",\"d\":" + std::to_string(depth) + ",\"l\":" + std::to_string(l) + ",\"o\":" + std::to_string(outn);
    if (!ch.empty()) ev += ",\"v\":{" + ch + "}";
    std::string h = heapDelta();
    if (!h.empty()) ev += ",\"h\":{" + h + "}";
    emit(ev + "}");
    depth++;
    busy = b;
  }
  void flush(V* v) {
    if (pend < 0) return;
    std::string ch, gone;
    if (v) {
      std::set<std::string> now;
      for (auto& [n, js] : v->vars) {
        now.insert(n);
        auto it = last.find(n);
        if (it != last.end() && it->second == js) continue;
        last[n] = js;
        ch += (ch.empty() ? "" : ",") + ("\"" + n + "\":" + js);
      }
      for (auto it = last.begin(); it != last.end();) {
        if (now.count(it->first)) { ++it; continue; }
        gone += (gone.empty() ? "\"" : ",\"") + it->first + "\"";
        it = last.erase(it);
      }
    }
    std::string ev = "{\"e\":\"line\",\"l\":" + std::to_string(pend) + ",\"k\":" + std::to_string(k) + ",\"o\":" + std::to_string(outn);
    if (!ch.empty()) ev += ",\"v\":{" + ch + "}";
    if (!gone.empty()) ev += ",\"x\":[" + gone + "]";
    std::string h = heapDelta();
    if (!h.empty()) ev += ",\"h\":{" + h + "}";
    emit(ev + "}");
    pend = -1;
  }
  /** Line `l` is about to run: the line before it has finished, so send it with the variables as they are now. */
  template <class F> void at(int l, F vars) {
    if (!on) return;
    bool b = busy; busy = true;
    if (pend >= 0) { V v; vars(v); flush(&v); }
    pend = l;
    busy = b;
  }
  /** The top of a loop pass: the loop's own update (j++) has run; send it before the body starts. */
  template <class F> void head(F vars) {
    if (!on || pend < 0) return;
    bool b = busy; busy = true;
    V v; vars(v); flush(&v);
    busy = b;
  }
  template <class F> void end(F vars) {
    if (!on || pend < 0) return;
    bool b = busy; busy = true;
    line = pend;
    V v; vars(v); flush(&v);
    busy = b;
  }
  /** The value being returned, once worked out; the return line is sent with the variables as they are then. */
  template <class T, class F> T&& ret(T&& v, F vars) {
    if (on) {
      bool b = busy; busy = true;
      W w;
      if (ser(w, v)) { retv = w.s; hasRet = true; }
      if (pend >= 0) { line = pend; V vv; vars(vv); flush(&vv); }
      busy = b;
    }
    return std::forward<T>(v);
  }
  ~Frame() {
    depth--;
    top = up;
    if (!on) return;
    bool b = busy; busy = true;
    int l = pend >= 0 ? pend : line;
    flush(nullptr);
    std::string ev = "{\"e\":\"ret\",\"k\":" + std::to_string(k) + ",\"l\":" + std::to_string(l) + ",\"o\":" + std::to_string(outn);
    if (hasRet) ev += ",\"r\":" + retv;
    std::string h = heapDelta();
    if (!h.empty()) ev += ",\"h\":{" + h + "}";
    emit(ev + "}");
    busy = b;
  }
};
#ifdef __NX_POSIX
/* A crash (bad index, null pointer, division by zero, a failed assert)
   stops the animation on the line that was running, with a plain reason. */
static void onSignal(int sig) {
  const char* m = sig == SIGSEGV ? "Segmentation fault: the program used memory it does not own (an index past the end, a null pointer, or recursion too deep)"
                : sig == SIGFPE  ? "Arithmetic error: division by zero"
                : sig == SIGABRT ? "Aborted: a failed check (assert) or an exception nobody caught"
                                 : "The program crashed";
  if (top) {
    char b[512];
    int n = snprintf(b, sizeof b, "\x1eNXT {\"e\":\"exc\",\"k\":%d,\"l\":%d,\"m\":\"%s\",\"o\":%lld}\n", top->k, top->pend >= 0 ? top->pend : top->line, m, outn);
    if (n > 0) { ssize_t w = write(2, b, (size_t)n); (void)w; }
  }
  signal(sig, SIG_DFL);
  raise(sig);
}
struct Signals {
  Signals() {
    static char alt[1 << 16];
    stack_t ss{};
    ss.ss_sp = alt; ss.ss_size = sizeof alt;
    sigaltstack(&ss, nullptr);
    struct sigaction sa{};
    sa.sa_handler = onSignal;
    sa.sa_flags = SA_ONSTACK;
    sigaction(SIGSEGV, &sa, nullptr);
    sigaction(SIGFPE, &sa, nullptr);
    sigaction(SIGABRT, &sa, nullptr);
  }
};
static Signals signals;
#endif
}  // namespace __nx

void* operator new(size_t n) { void* p = malloc(n ? n : 1); if (!p) throw std::bad_alloc(); if (!__nx::busy) __nx::track(p); return p; }
void* operator new[](size_t n) { void* p = malloc(n ? n : 1); if (!p) throw std::bad_alloc(); if (!__nx::busy) __nx::track(p); return p; }
void operator delete(void* p) noexcept { if (p) { __nx::untrack(p); free(p); } }
void operator delete[](void* p) noexcept { if (p) { __nx::untrack(p); free(p); } }
void operator delete(void* p, size_t) noexcept { if (p) { __nx::untrack(p); free(p); } }
void operator delete[](void* p, size_t) noexcept { if (p) { __nx::untrack(p); free(p); } }

/* printf and friends count what they print; sync_with_stdio keeps the count on cout. */
inline int __nx_cnt(int n) { if (n > 0) __nx::outn += n; return n; }
inline int __nx_puts(const char* s) { int r = puts(s); if (r >= 0) __nx::outn += (long long)strlen(s) + 1; return r; }
inline int __nx_putchar(int c) { int r = putchar(c); if (r != EOF) __nx::outn++; return r; }
namespace std { using ::__nx_cnt; using ::__nx_puts; using ::__nx_putchar; }
#define printf(...) __nx_cnt(printf(__VA_ARGS__))
#define puts __nx_puts
#define putchar __nx_putchar
#define sync_with_stdio(...) sync_with_stdio(__VA_ARGS__), ::__nx::hook()
#line 1
