#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

static struct Node *read_list(int n) {
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
    return head;
}

int main(void) {
    int na, nb;
    scanf("%d %d", &na, &nb);
    struct Node *a = read_list(na);
    struct Node *b = read_list(nb);
    /* merge-walk with dedup against the RESULT tail */
    struct Node dummy;
    dummy.next = NULL;
    struct Node *tail = &dummy;
    int any = 0;
    while (a && b) {
        int v;
        if (a->v <= b->v) { v = a->v; a = a->next; }
        else              { v = b->v; b = b->next; }
        if (any && tail->v == v) continue;   /* dedup vs result tail */
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v; nd->next = NULL;
        tail->next = nd;
        tail = nd;
        any = 1;
    }
    while (a) {
        int v = a->v; a = a->next;
        if (any && tail->v == v) continue;
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v; nd->next = NULL;
        tail->next = nd;
        tail = nd;
        any = 1;
    }
    while (b) {
        int v = b->v; b = b->next;
        if (any && tail->v == v) continue;
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v; nd->next = NULL;
        tail->next = nd;
        tail = nd;
        any = 1;
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
