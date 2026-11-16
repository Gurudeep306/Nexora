/* NexoraGuru dry-run runtime for C (prepended to the student's program by
   src/dryrun/c.js). It writes the same JSON events as the Python tracer
   (format: src/dryrun/index.js) to stderr, after the marker "\x1eNXT ".
   Nothing here prints to stdout. C has no overloading, so every value comes
   with a type descriptor the instrumenter builds from its declaration;
   number leaves are picked with _Generic. */
#ifndef _DEFAULT_SOURCE
#define _DEFAULT_SOURCE 1
#endif
#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include <signal.h>
#if defined(__has_include)
#if __has_include(<unistd.h>)
#include <unistd.h>
#define __NX_POSIX 1
#endif
#endif

enum { __NX_SKIP, __NX_I, __NX_U, __NX_F, __NX_BOOL, __NX_CHAR, __NX_STR, __NX_CSTR, __NX_ARR, __NX_PARR, __NX_PTR, __NX_STRUCT };
typedef struct __nx_ty __nx_ty;
typedef struct __nx_fd { const char* name; size_t off; const __nx_ty* ty; } __nx_fd;
struct __nx_ty {
  int k;               /* kind */
  size_t n;            /* array: element count */
  size_t esz;          /* element (or value) size in bytes */
  const __nx_ty* elem; /* array / pointer: what is inside */
  const __nx_ty* (*lazy)(void); /* pointer to a struct: its descriptor */
  const char* name;    /* struct: its name */
  int nf;              /* struct: fields */
  const __nx_fd* f;
};
static const __nx_ty __nx_t_skip = {__NX_SKIP, 0, 0, 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_bool = {__NX_BOOL, 0, sizeof(_Bool), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_char = {__NX_CHAR, 0, 1, 0, 0, 0, 0, 0};
static __attribute__((unused)) const __nx_ty __nx_t_cstr = {__NX_CSTR, 0, 1, 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_i1 = {__NX_I, 0, 1, 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_u1 = {__NX_U, 0, 1, 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_i2 = {__NX_I, 0, sizeof(short), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_u2 = {__NX_U, 0, sizeof(short), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_i4 = {__NX_I, 0, sizeof(int), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_u4 = {__NX_U, 0, sizeof(int), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_il = {__NX_I, 0, sizeof(long), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_ul = {__NX_U, 0, sizeof(long), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_i8 = {__NX_I, 0, sizeof(long long), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_u8 = {__NX_U, 0, sizeof(long long), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_f4 = {__NX_F, 0, sizeof(float), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_f8 = {__NX_F, 0, sizeof(double), 0, 0, 0, 0, 0};
static const __nx_ty __nx_t_f16 = {__NX_F, 0, sizeof(long double), 0, 0, 0, 0, 0};
/* The descriptor of a number (or char, or bool) expression; anything else is left out. */
#define __NX_SC(x) _Generic((x), _Bool: &__nx_t_bool, char: &__nx_t_char, signed char: &__nx_t_i1, unsigned char: &__nx_t_u1, \
  short: &__nx_t_i2, unsigned short: &__nx_t_u2, int: &__nx_t_i4, unsigned int: &__nx_t_u4, long: &__nx_t_il, unsigned long: &__nx_t_ul, \
  long long: &__nx_t_i8, unsigned long long: &__nx_t_u8, float: &__nx_t_f4, double: &__nx_t_f8, long double: &__nx_t_f16, default: &__nx_t_skip)

static int __nx_on = 1;
static long __nx_events = 0, __nx_bytes = 0;
static long long __nx_outn = 0;
static int __nx_calls = 0, __nx_depth = 0;
#define __NX_MAXEV 3000
#define __NX_MAXB 1500000
#define __NX_MAXOBJ 300

/* ── blocks from malloc / calloc / realloc, so only real objects are followed ── */
#define __NX_TB (1 << 17)
typedef struct { const void* p; size_t n; } __nx_blk;
static __nx_blk __nx_table[__NX_TB];
static const void* const __nx_tomb = (const void*)1;
static size_t __nx_used = 0;
static __attribute__((unused)) size_t __nx_slot(const void* p) { return (size_t)((((uintptr_t)p) >> 4) * 11400714819323198485ull) & (__NX_TB - 1); }
static __attribute__((unused)) void __nx_track(const void* p, size_t n) {
  if (!p || __nx_used > __NX_TB / 2) return;
  for (size_t i = __nx_slot(p);; i = (i + 1) & (__NX_TB - 1))
    if (__nx_table[i].p == 0 || __nx_table[i].p == __nx_tomb) { __nx_table[i].p = p; __nx_table[i].n = n; __nx_used++; return; }
}
static __attribute__((unused)) void __nx_untrack(const void* p) {
  if (!p) return;
  for (size_t i = __nx_slot(p), c = 0; __nx_table[i].p != 0 && c < __NX_TB; i = (i + 1) & (__NX_TB - 1), c++)
    if (__nx_table[i].p == p) { __nx_table[i].p = __nx_tomb; return; }
}
/* Bytes known to start at p (a malloc'd block, or an array the program declared); 0 if unknown. */
#define __NX_RG 512
static struct { const void* p; size_t n; } __nx_arrays[__NX_RG];
static int __nx_arrayAt = 0;
static __attribute__((unused)) void __nx_register(const void* p, size_t n) {
  for (int i = 0; i < __NX_RG; i++) if (__nx_arrays[i].p == p) { __nx_arrays[i].n = n; return; }
  __nx_arrays[__nx_arrayAt].p = p; __nx_arrays[__nx_arrayAt].n = n; __nx_arrayAt = (__nx_arrayAt + 1) % __NX_RG;
}
static __attribute__((unused)) size_t __nx_known(const void* p) {
  if (!p) return 0;
  for (size_t i = __nx_slot(p), c = 0; __nx_table[i].p != 0 && c < __NX_TB; i = (i + 1) & (__NX_TB - 1), c++)
    if (__nx_table[i].p == p) return __nx_table[i].n;
  for (int i = 0; i < __NX_RG; i++) if (__nx_arrays[i].p == p) return __nx_arrays[i].n;
  return 0;
}

/* ── a growing string ── */
typedef struct { char* s; size_t n, cap; } __nx_w;
static __attribute__((unused)) void __nx_put(__nx_w* w, const char* s, size_t n) {
  if (w->n + n + 1 > w->cap) {
    size_t c = w->cap ? w->cap : 128;
    while (c < w->n + n + 1) c *= 2;
    char* t = (char*)realloc(w->s, c);
    if (!t) return;
    w->s = t; w->cap = c;
  }
  memcpy(w->s + w->n, s, n); w->n += n; w->s[w->n] = 0;
}
static __attribute__((unused)) void __nx_puts_(__nx_w* w, const char* s) { __nx_put(w, s, strlen(s)); }
static __attribute__((unused)) void __nx_str(__nx_w* w, const char* s, size_t max) {
  __nx_put(w, "\"", 1);
  size_t k = 0;
  for (size_t i = 0; i < max && s[i]; i++) {
    unsigned char c = (unsigned char)s[i];
    if (++k > 300) { __nx_puts_(w, "\xe2\x80\xa6"); break; }
    if (c == '"' || c == '\\') { char b[2] = {'\\', (char)c}; __nx_put(w, b, 2); }
    else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); __nx_puts_(w, b); }
    else __nx_put(w, (const char*)&c, 1);
  }
  __nx_put(w, "\"", 1);
}
static __attribute__((unused)) void __nx_int(__nx_w* w, long long v) {
  char b[48];
  if (v > 9007199254740992LL || v < -9007199254740992LL) { snprintf(b, sizeof b, "{\"t\":\"big\",\"s\":\"%lld\"}", v); }
  else snprintf(b, sizeof b, "%lld", v);
  __nx_puts_(w, b);
}
static __attribute__((unused)) void __nx_uint(__nx_w* w, unsigned long long v) {
  char b[48];
  if (v > 9007199254740992ULL) snprintf(b, sizeof b, "{\"t\":\"big\",\"s\":\"%llu\"}", v);
  else snprintf(b, sizeof b, "%llu", v);
  __nx_puts_(w, b);
}
static __attribute__((unused)) void __nx_num(__nx_w* w, long double v) {
  if (isnan(v)) { __nx_puts_(w, "{\"t\":\"num\",\"s\":\"nan\"}"); return; }
  if (isinf(v)) { __nx_puts_(w, v > 0 ? "{\"t\":\"num\",\"s\":\"inf\"}" : "{\"t\":\"num\",\"s\":\"-inf\"}"); return; }
  char b[64]; snprintf(b, sizeof b, "%.10Lg", v); __nx_puts_(w, b);
}

/* ── objects: structs by address ── */
#define __NX_IDS (1 << 16)
static struct { const void* p; int id; } __nx_ids[__NX_IDS];
static int __nx_nextId = 0;
static char* __nx_lastObj[__NX_IDS];
static int __nx_seenId[__NX_MAXOBJ];
static char* __nx_seenJs[__NX_MAXOBJ];
static int __nx_nseen = 0;
static __attribute__((unused)) int __nx_idOf(const void* p) {
  for (size_t i = __nx_slot(p) & (__NX_IDS - 1), c = 0; c < __NX_IDS; i = (i + 1) & (__NX_IDS - 1), c++) {
    if (__nx_ids[i].p == p) return __nx_ids[i].id;
    if (__nx_ids[i].p == 0) {
      if (__nx_nextId >= __NX_IDS - 1) return 0;
      __nx_ids[i].p = p; __nx_ids[i].id = ++__nx_nextId; return __nx_nextId;
    }
  }
  return 0;
}

static int __nx_ser(__nx_w* w, const void* p, const __nx_ty* t);

static __attribute__((unused)) int __nx_blank(const void* p, size_t n) {
  const unsigned char* c = (const unsigned char*)p;
  for (size_t i = 0; i < n; i++) if (c[i]) return 0;
  return 1;
}
/* Only the first 80 elements are ever shown, so only they are looked at (a sieve of 10^6 stays fast). */
static __attribute__((unused)) size_t __nx_lastUsed(const void* p, size_t n, size_t esz) {
  size_t k = 0;
  if (n > 80) n = 80;
  for (size_t i = 0; i < n; i++) if (!__nx_blank((const char*)p + i * esz, esz)) k = i + 1;
  return k;
}
/** A big fixed array (int a[200005]) shows the part in use; one still all zeros shows its first 10. */
static __attribute__((unused)) size_t __nx_inUse(const void* p, size_t n, size_t esz) {
  if (n <= 80) return n;
  size_t k = __nx_lastUsed(p, n, esz);
  return k ? k : (n < 10 ? n : 10);
}
static __attribute__((unused)) void __nx_list(__nx_w* w, const char* p, size_t n, const __nx_ty* e, size_t total) {
  char b[64];
  snprintf(b, sizeof b, "{\"t\":\"list\",\"n\":%zu,\"i\":[", total);
  __nx_puts_(w, b);
  for (size_t i = 0; i < n && i < 80; i++) {
    if (i) __nx_put(w, ",", 1);
    if (!__nx_ser(w, p + i * e->esz, e)) __nx_puts_(w, "null");
  }
  __nx_puts_(w, "]}");
}
static __attribute__((unused)) int __nx_ref(__nx_w* w, const void* p, const __nx_ty* t) {
  int id = __nx_idOf(p);
  if (!id) return 0;
  char b[48]; snprintf(b, sizeof b, "{\"t\":\"ref\",\"id\":%d}", id); __nx_puts_(w, b);
  for (int i = 0; i < __nx_nseen; i++) if (__nx_seenId[i] == id) return 1;
  if (__nx_nseen >= __NX_MAXOBJ) return 1;
  int slot = __nx_nseen++;
  __nx_seenId[slot] = id; __nx_seenJs[slot] = 0;
  __nx_w o = {0, 0, 0};
  __nx_puts_(&o, "{\"c\":");
  __nx_str(&o, t->name, 200);
  __nx_puts_(&o, ",\"f\":{");
  int first = 1;
  for (int i = 0; i < t->nf; i++) {
    __nx_w v = {0, 0, 0};
    if (__nx_ser(&v, (const char*)p + t->f[i].off, t->f[i].ty)) {
      if (!first) __nx_put(&o, ",", 1);
      first = 0;
      __nx_str(&o, t->f[i].name, 200);
      __nx_put(&o, ":", 1);
      __nx_put(&o, v.s, v.n);
    }
    free(v.s);
  }
  __nx_puts_(&o, "}}");
  __nx_seenJs[slot] = o.s;
  return 1;
}

static __attribute__((unused)) int __nx_ser(__nx_w* w, const void* p, const __nx_ty* t) {
  switch (t->k) {
    case __NX_BOOL: __nx_puts_(w, *(const _Bool*)p ? "true" : "false"); return 1;
    case __NX_CHAR: { char c = *(const char*)p; __nx_str(w, &c, c ? 1 : 0); return 1; }
    case __NX_I:
      switch (t->esz) {
        case 1: __nx_int(w, *(const signed char*)p); return 1;
        case 2: __nx_int(w, *(const short*)p); return 1;
        case 4: __nx_int(w, *(const int*)p); return 1;
        case 8: __nx_int(w, *(const long long*)p); return 1;
        default: return 0;
      }
    case __NX_U:
      switch (t->esz) {
        case 1: __nx_uint(w, *(const unsigned char*)p); return 1;
        case 2: __nx_uint(w, *(const unsigned short*)p); return 1;
        case 4: __nx_uint(w, *(const unsigned int*)p); return 1;
        case 8: __nx_uint(w, *(const unsigned long long*)p); return 1;
        default: return 0;
      }
    case __NX_F:
      if (t->esz == sizeof(float)) __nx_num(w, *(const float*)p);
      else if (t->esz == sizeof(double)) __nx_num(w, *(const double*)p);
      else __nx_num(w, *(const long double*)p);
      return 1;
    case __NX_STR: __nx_str(w, (const char*)p, t->n); return 1;
    case __NX_CSTR: {
      const char* s = *(const char* const*)p;
      if (!s) { __nx_puts_(w, "null"); return 1; }
      size_t n = __nx_known(s);
      if (!n) return 0;
      __nx_str(w, s, n);
      return 1;
    }
    case __NX_ARR: {
      const __nx_ty* e = t->elem;
      size_t k = __nx_inUse(p, t->n, e->esz);
      if (e->k == __NX_ARR && e->elem->k != __NX_STR) {
        /* Rows of a 2D array share one width, so the grid stays square. */
        size_t cols = e->n;
        if (e->n > 80) {
          cols = 0;
          for (size_t i = 0; i < k; i++) { size_t u = __nx_lastUsed((const char*)p + i * e->esz, e->n, e->elem->esz); if (u > cols) cols = u; }
          if (!cols) cols = 10;
        }
        char b[64]; snprintf(b, sizeof b, "{\"t\":\"list\",\"n\":%zu,\"i\":[", t->n); __nx_puts_(w, b);
        for (size_t i = 0; i < k && i < 80; i++) {
          if (i) __nx_put(w, ",", 1);
          __nx_list(w, (const char*)p + i * e->esz, cols, e->elem, e->n);
        }
        __nx_puts_(w, "]}");
        return 1;
      }
      __nx_list(w, (const char*)p, k, e, t->n);
      return 1;
    }
    case __NX_PARR: {
      /* A pointer used as an array: shown only when it points at a block or array whose size is known. */
      const char* q = *(const char* const*)p;
      if (!q) { __nx_puts_(w, "null"); return 1; }
      size_t bytes = __nx_known(q);
      if (!bytes || !t->elem || t->elem->k == __NX_SKIP || !t->elem->esz) return 0;
      size_t n = bytes / t->elem->esz;
      __nx_list(w, q, __nx_inUse(q, n, t->elem->esz), t->elem, n);
      return 1;
    }
    case __NX_PTR: {
      const char* q = *(const char* const*)p;
      if (!q) { __nx_puts_(w, "null"); return 1; }
      const __nx_ty* s = t->lazy ? t->lazy() : 0;
      if (!s) return 0;
      size_t bytes = __nx_known(q);
      if (!bytes) return 0;
      if (bytes < 2 * s->esz) return __nx_ref(w, q, s);
      /* A block of several structs: a list of them. */
      size_t n = bytes / s->esz;
      __nx_list(w, q, n, s, n);
      return 1;
    }
    case __NX_STRUCT: return __nx_ref(w, p, t);
    default: return 0;
  }
}

/* ── output: count what the program prints ── */
static __attribute__((unused)) int __nx_cnt(int n) { if (n > 0) __nx_outn += n; return n; }
static __attribute__((unused)) int __nx_cntf(FILE* f, int n) { if (f == stdout && n > 0) __nx_outn += n; return n; }
static __attribute__((unused)) int __nx_puts(const char* s) { int r = puts(s); if (r >= 0) __nx_outn += (long long)strlen(s) + 1; return r; }
static __attribute__((unused)) int __nx_putchar(int c) { int r = putchar(c); if (r != EOF) __nx_outn++; return r; }
static __attribute__((unused)) int __nx_fputs(const char* s, FILE* f) { int r = fputs(s, f); if (r >= 0 && f == stdout) __nx_outn += (long long)strlen(s); return r; }
static __attribute__((unused)) int __nx_fputc(int c, FILE* f) { int r = fputc(c, f); if (r != EOF && f == stdout) __nx_outn++; return r; }
static __attribute__((unused)) size_t __nx_fwrite(const void* b, size_t s, size_t n, FILE* f) { size_t r = fwrite(b, s, n, f); if (f == stdout) __nx_outn += (long long)(r * s); return r; }

/* ── events ── */
static __attribute__((unused)) void __nx_emit(const char* s) {
  if (!__nx_on) return;
  __nx_events++; __nx_bytes += (long)strlen(s);
  if (__nx_events > __NX_MAXEV || __nx_bytes > __NX_MAXB) { __nx_on = 0; fputs("\x1eNXT {\"e\":\"cap\"}\n", stderr); return; }
  fputs("\x1eNXT ", stderr); fputs(s, stderr); fputc('\n', stderr);
}
/** Objects that changed since they were last sent, as "id":{…},… */
static __attribute__((unused)) void __nx_heap(__nx_w* ev) {
  int any = 0;
  for (int i = 0; i < __nx_nseen; i++) {
    int id = __nx_seenId[i];
    char* js = __nx_seenJs[i];
    if (!js) continue;
    if (__nx_lastObj[id] && strcmp(__nx_lastObj[id], js) == 0) { free(js); continue; }
    free(__nx_lastObj[id]);
    __nx_lastObj[id] = js;
    __nx_puts_(ev, any ? "," : ",\"h\":{");
    any = 1;
    char b[32]; snprintf(b, sizeof b, "\"%d\":", id); __nx_puts_(ev, b);
    __nx_puts_(ev, js);
  }
  if (any) __nx_puts_(ev, "}");
  __nx_nseen = 0;
}

/* variables collected for one step */
typedef struct { const char* n; char* js; } __nx_var;
#define __NX_MAXV 96
static __nx_var __nx_now[__NX_MAXV];
static int __nx_nnow = 0;

typedef struct __nx_frame {
  int k, pend, line;
  struct __nx_frame* up;
  __nx_var* last; int nlast, caplast;
  char* ret;
} __nx_frame;
static __nx_frame* __nx_top = 0;

static __attribute__((unused)) void __nx_clear(void) { for (int i = 0; i < __nx_nnow; i++) free(__nx_now[i].js); __nx_nnow = 0; }
/** Add one variable to the step being collected; always 0, so it can sit in an expression. */
static __attribute__((unused)) int __nx_v(const char* name, const void* p, const __nx_ty* t) {
  if (!__nx_on || !t || t->k == __NX_SKIP) return 0;
  if (t->k == __NX_ARR) __nx_register(p, t->n * (t->elem ? t->elem->esz : 1));
  if (t->k == __NX_STR) __nx_register(p, t->n);
  __nx_w w = {0, 0, 0};
  if (!__nx_ser(&w, p, t)) { free(w.s); return 0; }
  for (int i = 0; i < __nx_nnow; i++) if (strcmp(__nx_now[i].n, name) == 0) { free(__nx_now[i].js); __nx_now[i].js = w.s; return 0; }
  if (__nx_nnow >= __NX_MAXV) { free(w.s); return 0; }
  __nx_now[__nx_nnow].n = name; __nx_now[__nx_nnow].js = w.s; __nx_nnow++;
  return 0;
}
static __attribute__((unused)) void __nx_remember(__nx_frame* f, const char* n, char* js) {
  for (int i = 0; i < f->nlast; i++) if (strcmp(f->last[i].n, n) == 0) { free(f->last[i].js); f->last[i].js = js; return; }
  if (f->nlast == f->caplast) {
    int c = f->caplast ? f->caplast * 2 : 16;
    __nx_var* t = (__nx_var*)realloc(f->last, sizeof(__nx_var) * (size_t)c);
    if (!t) { free(js); return; }
    f->last = t; f->caplast = c;
  }
  f->last[f->nlast].n = n; f->last[f->nlast].js = js; f->nlast++;
}

static __attribute__((unused)) void __nx_enter(__nx_frame* f, int line) {
  f->k = ++__nx_calls; f->pend = -1; f->line = line; f->up = __nx_top; f->last = 0; f->nlast = f->caplast = 0; f->ret = 0;
  __nx_top = f;
  __nx_clear();
}
static __attribute__((unused)) void __nx_called(__nx_frame* f, const char* fn) {
  if (__nx_on) {
    __nx_w ev = {0, 0, 0};
    char b[160];
    __nx_puts_(&ev, "{\"e\":\"call\",\"f\":");
    __nx_str(&ev, fn, 120);
    snprintf(b, sizeof b, ",\"k\":%d,\"d\":%d,\"l\":%d,\"o\":%lld", f->k, __nx_depth, f->line, __nx_outn);
    __nx_puts_(&ev, b);
    if (__nx_nnow) {
      __nx_puts_(&ev, ",\"v\":{");
      for (int i = 0; i < __nx_nnow; i++) {
        if (i) __nx_put(&ev, ",", 1);
        __nx_str(&ev, __nx_now[i].n, 200); __nx_put(&ev, ":", 1); __nx_puts_(&ev, __nx_now[i].js);
        __nx_remember(f, __nx_now[i].n, __nx_now[i].js);
        __nx_now[i].js = 0;
      }
      __nx_puts_(&ev, "}");
    }
    __nx_nnow = 0;
    __nx_heap(&ev);
    __nx_puts_(&ev, "}");
    __nx_emit(ev.s);
    free(ev.s);
  }
  __nx_depth++;
}
/** A step is due: start collecting the variables (1), or nothing to send yet (0). */
static __attribute__((unused)) int __nx_go(__nx_frame* f) {
  if (!__nx_on || f->pend < 0) return 0;
  __nx_clear();
  return 1;
}
/** Send the line that just finished, with the variables collected (only the changed ones). */
static __attribute__((unused)) int __nx_sendv(__nx_frame* f, int withVars) {
  if (f->pend < 0) { __nx_clear(); return 0; }
  __nx_w ev = {0, 0, 0};
  char b[128];
  snprintf(b, sizeof b, "{\"e\":\"line\",\"l\":%d,\"k\":%d,\"o\":%lld", f->pend, f->k, __nx_outn);
  __nx_puts_(&ev, b);
  int any = 0;
  for (int i = 0; i < __nx_nnow; i++) {
    int same = 0;
    for (int j = 0; j < f->nlast; j++) if (strcmp(f->last[j].n, __nx_now[i].n) == 0) { same = strcmp(f->last[j].js, __nx_now[i].js) == 0; break; }
    if (same) continue;
    __nx_puts_(&ev, any ? "," : ",\"v\":{");
    any = 1;
    __nx_str(&ev, __nx_now[i].n, 200); __nx_put(&ev, ":", 1); __nx_puts_(&ev, __nx_now[i].js);
  }
  if (any) __nx_puts_(&ev, "}");
  /* names gone out of scope */
  int gone = 0;
  for (int j = 0; withVars && j < f->nlast;) {
    int here = 0;
    for (int i = 0; i < __nx_nnow; i++) if (strcmp(f->last[j].n, __nx_now[i].n) == 0) { here = 1; break; }
    if (here) { j++; continue; }
    __nx_puts_(&ev, gone ? "," : ",\"x\":[");
    gone = 1;
    __nx_str(&ev, f->last[j].n, 200);
    free(f->last[j].js);
    f->last[j] = f->last[--f->nlast];
  }
  if (gone) __nx_puts_(&ev, "]");
  for (int i = 0; i < __nx_nnow; i++) { __nx_remember(f, __nx_now[i].n, __nx_now[i].js); __nx_now[i].js = 0; }
  __nx_nnow = 0;
  __nx_heap(&ev);
  __nx_puts_(&ev, "}");
  f->line = f->pend;
  f->pend = -1;
  __nx_emit(ev.s);
  free(ev.s);
  return 0;
}
static __attribute__((unused)) int __nx_send(__nx_frame* f) { return __nx_sendv(f, 1); }
/** The value a function returns (its descriptor comes from the return type). */
static __attribute__((unused)) int __nx_retv(__nx_frame* f, const void* p, const __nx_ty* t) {
  if (!__nx_on || !t || t->k == __NX_SKIP) return 0;
  __nx_w w = {0, 0, 0};
  if (__nx_ser(&w, p, t)) { free(f->ret); f->ret = w.s; } else free(w.s);
  return 0;
}
static __attribute__((unused)) int __nx_exit(__nx_frame* f) {
  __nx_depth--;
  __nx_top = f->up;
  if (__nx_on) {
    int l = f->pend >= 0 ? f->pend : f->line;
    if (f->pend >= 0) { __nx_clear(); __nx_sendv(f, 0); }
    __nx_w ev = {0, 0, 0};
    char b[128];
    snprintf(b, sizeof b, "{\"e\":\"ret\",\"k\":%d,\"l\":%d,\"o\":%lld", f->k, l, __nx_outn);
    __nx_puts_(&ev, b);
    if (f->ret) { __nx_puts_(&ev, ",\"r\":"); __nx_puts_(&ev, f->ret); }
    __nx_heap(&ev);
    __nx_puts_(&ev, "}");
    __nx_emit(ev.s);
    free(ev.s);
  }
  for (int i = 0; i < f->nlast; i++) free(f->last[i].js);
  free(f->last); free(f->ret);
  f->last = 0; f->nlast = f->caplast = 0; f->ret = 0;
  return 0;
}

#ifdef __NX_POSIX
/* A crash (bad index, null pointer, division by zero, a failed assert)
   stops the animation on the line that was running, with a plain reason. */
static __attribute__((unused)) void __nx_onSignal(int sig) {
  const char* m = sig == SIGSEGV ? "Segmentation fault: the program used memory it does not own (an index past the end, a null pointer, or recursion too deep)"
                : sig == SIGFPE  ? "Arithmetic error: division by zero"
                : sig == SIGABRT ? "Aborted: a failed check (assert)"
                                 : "The program crashed";
  if (__nx_top) {
    char b[512];
    int n = snprintf(b, sizeof b, "\x1eNXT {\"e\":\"exc\",\"k\":%d,\"l\":%d,\"m\":\"%s\",\"o\":%lld}\n", __nx_top->k, __nx_top->pend >= 0 ? __nx_top->pend : __nx_top->line, m, __nx_outn);
    if (n > 0) { ssize_t r = write(2, b, (size_t)n); (void)r; }
  }
  signal(sig, SIG_DFL);
  raise(sig);
}
static char __nx_alt[1 << 16];
__attribute__((constructor, unused)) static void __nx_signals(void) {
  stack_t ss;
  memset(&ss, 0, sizeof ss);
  ss.ss_sp = __nx_alt; ss.ss_size = sizeof __nx_alt;
  sigaltstack(&ss, 0);
  struct sigaction sa;
  memset(&sa, 0, sizeof sa);
  sa.sa_handler = __nx_onSignal;
  sa.sa_flags = SA_ONSTACK;
  sigaction(SIGSEGV, &sa, 0);
  sigaction(SIGFPE, &sa, 0);
  sigaction(SIGABRT, &sa, 0);
}
#endif

/* The program's own allocations are tracked; its output is counted. */
static __attribute__((unused)) void* __nx_malloc(size_t n) { void* p = malloc(n); __nx_track(p, n); return p; }
static __attribute__((unused)) void* __nx_calloc(size_t c, size_t n) { void* p = calloc(c, n); __nx_track(p, c * n); return p; }
static __attribute__((unused)) void* __nx_realloc(void* q, size_t n) { void* p = realloc(q, n); if (p) { __nx_untrack(q); __nx_track(p, n); } return p; }
static __attribute__((unused)) void __nx_free(void* p) { __nx_untrack(p); free(p); }
#define malloc(n) __nx_malloc(n)
#define calloc(c, n) __nx_calloc(c, n)
#define realloc(p, n) __nx_realloc(p, n)
#define free(p) __nx_free(p)
#undef putchar
#undef putc
#undef fputc
#define printf(...) __nx_cnt(printf(__VA_ARGS__))
#define fprintf(f, ...) __nx_cntf((f), fprintf((f), __VA_ARGS__))
#define puts(s) __nx_puts(s)
#define putchar(c) __nx_putchar(c)
#define fputs(s, f) __nx_fputs(s, f)
#define fputc(c, f) __nx_fputc(c, f)
#define putc(c, f) __nx_fputc(c, f)
#define fwrite(b, s, n, f) __nx_fwrite(b, s, n, f)
