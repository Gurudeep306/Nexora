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

static struct Node *rev(struct Node *head) { /* save before you sever */
    struct Node *prev = NULL, *cur = head;
    while (cur) {
        struct Node *nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}

int main(void) {
    int na, nb;
    scanf("%d %d", &na, &nb);
    struct Node *headA = read_list(na);
    struct Node *headB = read_list(nb);
    /* reverse both, stream the carry, reverse the result — all iterative */
    struct Node *a = rev(headA);
    struct Node *b = rev(headB);
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
    struct Node *res = rev(dummy.next);
    int first = 1;
    for (struct Node *t = res; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
