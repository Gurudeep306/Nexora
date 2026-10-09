#include <stdio.h>
#include <stdlib.h>

struct Node { long long v; struct Node *next; };

int main(void) {
    int n;
    long long x;
    scanf("%d %lld", &n, &x);
    struct Node *H = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        long long v;
        scanf("%lld", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        if (!H) H = nd; else tail->next = nd;
        tail = nd;
    }
    if (!H) {                            /* empty ring: x alone */
        printf("%lld\n", x);
        return 0;
    }
    tail->next = H;                      /* close the ring */

    /* One lap from H, examining pairs (a, b) INCLUDING the wrap pair (last, H).
       Insert into the FIRST qualifying pair: a <= x <= b, or the seam (a > b)
       with x >= a or x <= b. No pair qualifies (all equal) -> insert after H. */
    struct Node *nd = malloc(sizeof(struct Node));
    nd->v = x;
    nd->next = NULL;
    struct Node *a = H;
    int done = 0;
    for (int step = 0; step < n && !done; step++) {
        struct Node *b = a->next;
        int seam = a->v > b->v;
        if ((a->v <= x && x <= b->v) || (seam && (x >= a->v || x <= b->v))) {
            nd->next = b;
            a->next = nd;
            done = 1;
        }
        a = b;
    }
    if (!done) {                         /* all values equal: insert after H */
        nd->next = H->next;
        H->next = nd;
    }

    {
        static char outbuf[300000];
        int p = 0;
        struct Node *t = H;
        for (int i = 0; i < n + 1; i++) {
            if (i) outbuf[p++] = ' ';
            p += sprintf(outbuf + p, "%lld", t->v);
            t = t->next;
        }
        outbuf[p++] = '\n';
        fwrite(outbuf, 1, p, stdout);
    }
    return 0;
}
