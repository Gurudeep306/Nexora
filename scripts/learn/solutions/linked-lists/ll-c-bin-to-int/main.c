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
    /* fold while walking: acc = acc*2 + bit (MSB first) */
    unsigned long long acc = 0;
    for (struct Node *t = head; t; t = t->next)
        acc = acc * 2 + (unsigned long long)t->v;
    printf("%llu\n", acc);
    return 0;
}
