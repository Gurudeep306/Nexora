#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

static void render(struct Node *head) {
    if (!head) { puts("EMPTY"); return; }
    int first = 1;
    for (struct Node *t = head; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
}

int main(void) {
    int n;
    scanf("%d", &n);
    struct Node *head = NULL, *inTail = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        if (!head) head = nd; else inTail->next = nd;
        inTail = nd;
    }
    /* thread two chains in one walk */
    struct Node dA, dB;
    dA.next = NULL; dB.next = NULL;
    struct Node *tA = &dA, *tB = &dB;
    struct Node *cur = head;
    int toA = 1;
    while (cur) {
        struct Node *nxt = cur->next;   /* save BEFORE threading rewrites cur->next */
        if (toA) { tA->next = cur; tA = cur; }
        else     { tB->next = cur; tB = cur; }
        toA = !toA;
        cur = nxt;
    }
    tA->next = NULL;                    /* SEAL both tails */
    tB->next = NULL;

    render(dA.next);
    render(dB.next);
    return 0;
}
