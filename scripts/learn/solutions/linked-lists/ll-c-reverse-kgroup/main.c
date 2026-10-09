#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
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
    struct Node dummy;
    dummy.v = 0;
    dummy.next = head;
    struct Node *groupPrev = &dummy;
    for (;;) {
        /* PROBE: is there a full group of k after groupPrev? */
        struct Node *probe = groupPrev;
        for (int i = 0; i < k && probe; i++) probe = probe->next;
        if (!probe) break;                    /* partial group: leave as is */
        struct Node *groupHead = groupPrev->next; /* bookmark: becomes the tail */
        struct Node *prev = NULL, *cur = groupHead;
        for (int i = 0; i < k; i++) {         /* exactly k flips */
            struct Node *nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }
        groupPrev->next = prev;               /* front stitch */
        groupHead->next = cur;                /* back stitch */
        groupPrev = groupHead;                /* anchor -> this group's tail */
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
