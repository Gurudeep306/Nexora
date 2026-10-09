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
    /* fixed gap of n: send first ahead, then slide both */
    struct Node *first = head, *second = head;
    for (int i = 0; i < nth; i++) first = first->next;
    while (first) {
        first = first->next;
        second = second->next;
    }
    printf("%d\n", second->v);
    return 0;
}
