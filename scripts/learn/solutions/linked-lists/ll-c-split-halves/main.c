#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

static void emit(struct Node *h) {
    if (!h) { puts("EMPTY"); return; }
    int first = 1;
    for (struct Node *t = h; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
}

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
    /* split convention: slow=head, fast=head->next, while(fast && fast->next) */
    struct Node *slow = head;
    struct Node *fast = head ? head->next : NULL;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    struct Node *second = slow->next;
    slow->next = NULL;            /* THE CUT */

    emit(head);
    emit(second);
    return 0;
}
