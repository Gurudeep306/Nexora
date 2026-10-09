#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n;
    scanf("%d", &n);
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

    /* insertion sort: dummy-headed sorted result, detach + scan + splice */
    struct Node dummy = {0, NULL};
    struct Node *cur = head;
    while (cur) {
        struct Node *nxt = cur->next;              /* save before cur leaves the input */
        struct Node *p = &dummy;
        while (p->next && p->next->v < cur->v)     /* strict < keeps it stable */
            p = p->next;
        cur->next = p->next;                       /* splice: two writes */
        p->next = cur;
        cur = nxt;
    }

    if (!dummy.next) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
