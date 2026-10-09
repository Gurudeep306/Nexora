#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    struct Node dummy;
    dummy.next = NULL;
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
    struct Node *anchor = &dummy;
    int doReverse = 1;
    while (anchor->next) {
        /* PROBE: count min(k, remaining) nodes of this group */
        struct Node *probe = anchor->next;
        int cnt = 1;
        while (cnt < k && probe->next) { probe = probe->next; cnt++; }
        if (doReverse) {
            struct Node *groupHead = anchor->next;
            struct Node *after = probe->next;   /* first node past the group */
            struct Node *prev = after;          /* seed: tail links onward directly */
            struct Node *cur = groupHead;
            while (cur != after) {
                struct Node *nxt = cur->next;
                cur->next = prev;
                prev = cur;
                cur = nxt;
            }
            anchor->next = prev;                /* prev == probe: group's new head */
            anchor = groupHead;                 /* original head is now the group's TAIL */
        } else {
            anchor = probe;                     /* skipped group's LAST node */
        }
        doReverse = !doReverse;
    }
    int first = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
