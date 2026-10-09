#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n, x;
    scanf("%d %d", &n, &x);          /* |x| <= 1e9 fits in int */
    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        if (!head) head = nd; else tail->next = nd;
        tail = nd;
    }

    /* two dummy-headed chains: < x and >= x, appended in arrival order (stable) */
    struct Node less_d = {0, NULL}, geq_d = {0, NULL};
    struct Node *less = &less_d, *geq = &geq_d;
    for (struct Node *cur = head; cur; cur = cur->next) {
        if (cur->v < x) { less->next = cur; less = cur; }
        else            { geq->next = cur; geq = cur; }
    }
    geq->next = NULL;           /* SEAL the right chain */
    less->next = geq_d.next;    /* concatenate: one write */

    if (!less_d.next) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = less_d.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
