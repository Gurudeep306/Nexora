#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
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
    /* dummy head absorbs m == 1 */
    struct Node dummy;
    dummy.v = 0;
    dummy.next = head;
    struct Node *anchor = &dummy;
    for (int i = 1; i < m; i++) anchor = anchor->next;   /* position m-1 */
    struct Node *rangeHead = anchor->next;               /* bookmark BEFORE flipping */
    struct Node *prev = NULL, *cur = rangeHead;
    for (int i = 0; i < k - m + 1; i++) {                /* exactly k-m+1 flips */
        struct Node *nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    anchor->next = prev;        /* front stitch */
    rangeHead->next = cur;      /* back stitch */

    int first = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
