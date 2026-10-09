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

    if (head && head->next) {
        /* Phase 1: middle (next-next guard: slow = last node of first half) + cut */
        struct Node *slow = head, *fast = head;
        while (fast->next && fast->next->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        struct Node *second = slow->next;
        slow->next = NULL;             /* cut */

        /* Phase 2: reverse the second half — save before you sever */
        struct Node *prev = NULL, *cur = second;
        while (cur) {
            struct Node *nxt = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nxt;
        }
        second = prev;

        /* Phase 3: zip; the shorter-or-equal second chain drives the loop */
        struct Node *first = head;
        while (second) {
            struct Node *t1 = first->next;
            struct Node *t2 = second->next;   /* save BOTH before any write */
            first->next = second;
            second->next = t1;
            first = t1;
            second = t2;
        }
    }

    if (!head) { puts("EMPTY"); return 0; }
    int first_out = 1;
    for (struct Node *t = head; t; t = t->next) {
        if (!first_out) putchar(' ');
        first_out = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
