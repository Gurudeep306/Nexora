#include <stdio.h>
#include <stdlib.h>

struct Node { long long c; int e; struct Node *next; };

static struct Node *read_poly(int n) {
    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < n; i++) {
        long long c;
        int e;
        scanf("%lld %d", &c, &e);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->c = c;
        nd->e = e;
        nd->next = NULL;
        if (!head) head = nd; else tail->next = nd;
        tail = nd;
    }
    return head;
}

int main(void) {
    int na, nb;
    scanf("%d %d", &na, &nb);
    struct Node *a = read_poly(na);
    struct Node *b = read_poly(nb);
    /* merge-walk on DESCENDING exponents; tie -> sum, drop if zero */
    struct Node dummy;
    dummy.next = NULL;
    struct Node *tail = &dummy;
    while (a && b) {
        long long c;
        int e;
        if (a->e > b->e) {
            c = a->c; e = a->e;
            a = a->next;
        } else if (b->e > a->e) {
            c = b->c; e = b->e;
            b = b->next;
        } else {
            c = a->c + b->c; e = a->e;   /* tie: sum the coefficients */
            a = a->next;
            b = b->next;
            if (c == 0) continue;        /* cancel-and-drop */
        }
        struct Node *nd = malloc(sizeof(struct Node));
        nd->c = c;
        nd->e = e;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
    }
    while (a) {
        struct Node *nd = malloc(sizeof(struct Node));
        nd->c = a->c; nd->e = a->e; nd->next = NULL;
        tail->next = nd;
        tail = nd;
        a = a->next;
    }
    while (b) {
        struct Node *nd = malloc(sizeof(struct Node));
        nd->c = b->c; nd->e = b->e; nd->next = NULL;
        tail->next = nd;
        tail = nd;
        b = b->next;
    }

    if (!dummy.next) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%lld %d", t->c, t->e);
    }
    putchar('\n');
    return 0;
}
