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
    /* stream the carry forward: a || b || carry absorbs ragged lengths and the final carry */
    int carry = 0;
    struct Node dummy;
    dummy.next = NULL;
    struct Node *tail = &dummy;
    while (a || b || carry) {
        int sum = carry;
        if (a) { sum += a->v; a = a->next; }
        if (b) { sum += b->v; b = b->next; }
        carry = sum / 10;
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = sum % 10;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
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
