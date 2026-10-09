#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

/* The classic trick: given ONLY a pointer to the victim (never the tail),
   copy the successor's value forward and bypass the successor. */
static void deleteNode(struct Node *node) {
    struct Node *victim = node->next; /* the node we can actually unlink */
    node->v = victim->v;              /* steal its contents */
    node->next = victim->next;        /* bypass it */
    free(victim);                     /* must still be freed */
}

int main(void) {
    int n, idx;
    scanf("%d %d", &n, &idx);
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
    /* walk to position idx — in the interview you are HANDED this pointer */
    struct Node *node = head;
    for (int i = 0; i < idx; i++) node = node->next;

    deleteNode(node);

    int first = 1;
    for (struct Node *t = head; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
