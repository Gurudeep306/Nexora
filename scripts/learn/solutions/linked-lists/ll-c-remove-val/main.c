#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n, x;
    scanf("%d %d", &n, &x);
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
    /* dummy head: walk with prev, unlink matching prev->next, do NOT advance prev */
    struct Node *prev = &dummy;
    while (prev->next) {
        if (prev->next->v == x) {
            struct Node *victim = prev->next;
            prev->next = victim->next;   /* unlink; prev stays put */
            free(victim);
        } else {
            prev = prev->next;           /* only advance when we KEEP the node */
        }
    }
    struct Node *head = dummy.next;      /* never return the original head */
    if (!head) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = head; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
