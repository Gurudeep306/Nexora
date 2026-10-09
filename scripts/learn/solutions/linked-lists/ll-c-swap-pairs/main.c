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

    /* swap adjacent NODES: dummy absorbs the head change */
    struct Node dummy = {0, NULL};
    dummy.next = head;
    struct Node *prev = &dummy;
    while (prev->next && prev->next->next) {   /* a full pair exists */
        struct Node *a = prev->next;
        struct Node *b = a->next;
        a->next = b->next;    /* a adopts the rest */
        b->next = a;          /* b points back at a */
        prev->next = b;       /* chain enters the pair through b */
        prev = a;             /* a is the pair's new tail */
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
