#include <stdio.h>
#include <stdlib.h>

/* A small open-addressing hash map from long long keys to long long values. */
typedef struct { long long *keys, *vals; char *used; size_t cap; } Map;

static void map_init(Map *m, size_t want) {
    m->cap = 1;
    while (m->cap < 2 * want + 2) m->cap <<= 1;
    m->keys = malloc(sizeof(long long) * m->cap);
    m->vals = malloc(sizeof(long long) * m->cap);
    m->used = calloc(m->cap, 1);
}
static size_t map_slot(Map *m, long long k) {
    unsigned long long h = (unsigned long long)k * 0x9E3779B97F4A7C15ULL;
    size_t i = (size_t)(h >> 20) & (m->cap - 1);
    while (m->used[i] && m->keys[i] != k) i = (i + 1) & (m->cap - 1);   /* linear probing */
    return i;
}
/* Returns a pointer to the value for k, inserting `def` if k is new. */
static long long *map_get(Map *m, long long k, long long def) {
    size_t i = map_slot(m, k);
    if (!m->used[i]) { m->used[i] = 1; m->keys[i] = k; m->vals[i] = def; }
    return &m->vals[i];
}
static int map_has(Map *m, long long k) { return m->used[map_slot(m, k)]; }

int main(void) {
    int n;
    long long k, p = 0, count = 0, x;
    scanf("%d %lld", &n, &k);
    Map seen;
    map_init(&seen, n + 1);
    *map_get(&seen, 0, 0) = 1;                     /* the empty prefix */
    for (int i = 0; i < n; i++) {
        scanf("%lld", &x);
        p += x;
        if (map_has(&seen, p - k)) count += *map_get(&seen, p - k, 0);
        (*map_get(&seen, p, 0))++;
    }
    printf("%lld\n", count);
    return 0;
}
