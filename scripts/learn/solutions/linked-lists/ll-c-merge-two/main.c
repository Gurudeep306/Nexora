#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

static struct Node *read_list(int n) {
    struct Node dummy = {0, NULL}, *tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
    }
    return dummy.next;
}

int main(void) {
    int na, nb;
    scanf("%d %d", &na, &nb);
    struct Node *a = read_list(na);
    struct Node *b = read_list(nb);

    /* merge by relinking: dummy + tail pointer */
    struct Node dummy = {0, NULL}, *tail = &dummy;
    while (a && b) {
        if (a->v <= b->v) { tail->next = a; a = a->next; }
        else              { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;   /* attach remainder whole */

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
