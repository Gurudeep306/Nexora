#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

/* Open-addressing map: prefix sum (long long) -> last node reaching it. */
#define HSIZE 131071
static long long hkeys[HSIZE];
static struct Node *hvals[HSIZE];
static char hused[HSIZE];

static unsigned long long mix(long long x) {
    unsigned long long u = (unsigned long long)x;
    u ^= u >> 33; u *= 0xff51afd7ed558ccdULL;
    u ^= u >> 33; u *= 0xc4ceb9fe1a85ec53ULL;
    u ^= u >> 33;
    return u;
}

static void hput(long long k, struct Node *v) {
    size_t i = (size_t)(mix(k) % HSIZE);
    while (hused[i] && hkeys[i] != k) i = (i + 1) % HSIZE;
    hused[i] = 1;
    hkeys[i] = k;
    hvals[i] = v;          /* LAST occurrence wins (overwrite) */
}

static struct Node *hget(long long k) {
    size_t i = (size_t)(mix(k) % HSIZE);
    while (hused[i] && hkeys[i] != k) i = (i + 1) % HSIZE;
    return hvals[i];
}

int main(void) {
    int n;
    scanf("%d", &n);
    struct Node dummy = {0, NULL};
    struct Node *tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
    }
    /* Pass 1: store the LAST node reaching each prefix sum (64-bit sums).
       Prefix 0 maps to the dummy, so a zero-sum prefix deletes from the head. */
    long long p = 0;
    hput(0, &dummy);
    for (struct Node *t = dummy.next; t; t = t->next) {
        p += t->v;
        hput(p, t);
    }
    /* Pass 2: at each node with prefix p, jump over everything up to seen[p]:
       everything between two equal prefix sums sums to zero. */
    p = 0;
    for (struct Node *t = &dummy; t; t = t->next) {
        p += t->v;                  /* dummy contributes 0 */
        t->next = hget(p)->next;
    }
    struct Node *head = dummy.next;
    if (!head) { puts("EMPTY"); return 0; }
    {
        static char outbuf[3000000];
        int q = 0, first = 1;
        for (struct Node *t = head; t; t = t->next) {
            if (!first) outbuf[q++] = ' ';
            first = 0;
            q += sprintf(outbuf + q, "%d", t->v);
        }
        outbuf[q++] = '\n';
        fwrite(outbuf, 1, q, stdout);
    }
    return 0;
}
