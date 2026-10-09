#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

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
    /* dummy head (the head itself can be a victim); prev never enters a run. */
    struct Node *prev = &dummy;
    while (prev->next && prev->next->next) {
        if (prev->next->v == prev->next->next->v) {
            int dup = prev->next->v;               /* remember the run's value */
            while (prev->next && prev->next->v == dup) {
                struct Node *victim = prev->next;  /* unlink the WHOLE run */
                prev->next = victim->next;
                free(victim);
            }
            /* prev stays put: the new prev->next is unexamined */
        } else {
            prev = prev->next;                     /* unique so far, keep it */
        }
    }
    struct Node *head = dummy.next;
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
