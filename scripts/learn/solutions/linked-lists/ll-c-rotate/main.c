#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);        /* k up to 1e9 — keep it 64-bit until reduced */
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

    /* close-the-ring walk */
    if (head && n > 0) {
        k %= n;                          /* rotating by n is a no-op */
        if (k != 0) {
            tail->next = head;           /* close the ring */
            struct Node *new_tail = head;
            for (long long i = 0; i < n - k - 1; i++) new_tail = new_tail->next;
            head = new_tail->next;       /* old next is the new head */
            new_tail->next = NULL;       /* cut */
        }
    }

    if (!head) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = head; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
