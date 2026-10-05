#include <stdio.h>
#include <stdlib.h>

typedef struct { long long v; int pos; } Item;

static int cmp(const void *x, const void *y) {
    const Item *a = x, *b = y;
    if (a->v != b->v) return (a->v > b->v) - (a->v < b->v);
    return a->pos - b->pos;                          /* ties: earliest position first */
}

int main(void) {
    int n, q;
    scanf("%d", &n);
    Item *it = malloc(sizeof(Item) * n);
    for (int i = 0; i < n; i++) { scanf("%lld", &it[i].v); it[i].pos = i + 1; }
    qsort(it, n, sizeof(Item), cmp);
    scanf("%d", &q);
    while (q--) {
        long long x;
        scanf("%lld", &x);
        int lo = 0, hi = n;                          /* first index with v >= x */
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (it[mid].v < x) lo = mid + 1; else hi = mid;
        }
        printf("%d\n", lo < n && it[lo].v == x ? it[lo].pos : n);
    }
    free(it);
    return 0;
}
