#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

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
    /* thread three dummy-headed chains in one walk */
    struct Node d[3];
    struct Node *t[3];
    for (int b = 0; b < 3; b++) { d[b].next = NULL; t[b] = &d[b]; }
    struct Node *cur = head;
    while (cur) {
        struct Node *nxt = cur->next;   /* save: cur is about to leave the input */
        int b = cur->v;
        t[b]->next = cur;               /* route to its chain's tail */
        t[b] = cur;
        cur = nxt;
    }
    t[2]->next = NULL;                  /* SEAL the last tail */
    /* concatenate the non-empty chains 0 -> 1 -> 2 */
    struct Node *res = NULL, *resTail = NULL;
    for (int b = 0; b < 3; b++) {
        if (!d[b].next) continue;
        if (!res) res = d[b].next;
        else resTail->next = d[b].next;
        resTail = t[b];
    }
    if (!res) { puts("EMPTY"); return 0; }
    resTail->next = NULL;               /* belt-and-braces seal */
    int first = 1;
    for (struct Node *x = res; x; x = x->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", x->v);
    }
    putchar('\n');
    return 0;
}
