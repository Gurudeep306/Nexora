#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

int main(void) {
    int len, nth;
    scanf("%d %d", &len, &nth);
    struct Node *head = NULL, *tail = NULL;
    for (int i = 0; i < len; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        if (!head) head = nd; else tail->next = nd;
        tail = nd;
    }
    /* dummy head + gap n+1: second lands on the victim's predecessor */
    struct Node dummy;
    dummy.v = 0;
    dummy.next = head;
    struct Node *first = &dummy, *second = &dummy;
    for (int i = 0; i < nth + 1; i++) first = first->next;
    while (first) {
        first = first->next;
        second = second->next;
    }
    second->next = second->next->next;   /* skip over the victim */

    if (!dummy.next) { puts("EMPTY"); return 0; }
    int firstOut = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!firstOut) putchar(' ');
        firstOut = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
