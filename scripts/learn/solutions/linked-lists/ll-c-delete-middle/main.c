#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int n;
    scanf("%d", &n);
    struct Node dummy;
    dummy.next = NULL;
    struct Node *tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
    }
    /* one pass: slow trails fast, ending on the victim's PREDECESSOR */
    struct Node *slow = &dummy, *fast = &dummy;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    struct Node *victim = slow->next;   /* floor(n/2): second middle on even n */
    slow->next = victim->next;          /* bypass FIRST... */
    free(victim);                       /* ...then free */

    struct Node *head = dummy.next;
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
