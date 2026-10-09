#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

struct Node { long long v; struct Node *next; };

int main(void) {
    int n;
    long long x;
    scanf("%d %lld", &n, &x);
    struct Node dummy = {LLONG_MIN, NULL}; /* -inf sentinel: new-head case falls out */
    struct Node *tail = &dummy;
    for (int i = 0; i < n; i++) {
        long long v;
        scanf("%lld", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
    }
    /* walk to the first node NOT <= x; splice before it (equals: x goes AFTER) */
    struct Node *prev = &dummy;
    while (prev->next && prev->next->v <= x)
        prev = prev->next;
    struct Node *nd = malloc(sizeof(struct Node));
    nd->v = x;
    nd->next = prev->next;
    prev->next = nd;

    int first = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%lld", t->v);
    }
    putchar('\n');
    return 0;
}
