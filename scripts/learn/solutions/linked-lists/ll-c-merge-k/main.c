#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

static struct Node *read_list(int n) {
    struct Node dummy = {0, NULL}, *tail = &dummy;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        tail->next = nd;
        tail = nd;
    }
    return dummy.next;
}

static struct Node *merge(struct Node *a, struct Node *b) {
    struct Node dummy = {0, NULL}, *t = &dummy;
    while (a && b) {
        if (a->v <= b->v) { t->next = a; a = a->next; }
        else              { t->next = b; b = b->next; }
        t = t->next;
    }
    t->next = a ? a : b;
    return dummy.next;
}

int main(void) {
    int k;
    scanf("%d", &k);
    struct Node **lists = malloc(sizeof(struct Node *) * (size_t)(k > 0 ? k : 1));
    int m = 0;
    for (int i = 0; i < k; i++) {
        int ni;
        scanf("%d", &ni);
        struct Node *h = read_list(ni);
        if (h) lists[m++] = h;
    }

    /* divide & conquer pairwise merge: log K rounds, each touching every node once */
    while (m > 1) {
        int w = 0;
        for (int i = 0; i < m; i += 2)
            lists[w++] = (i + 1 < m) ? merge(lists[i], lists[i + 1]) : lists[i];
        m = w;
    }

    struct Node *head = m ? lists[0] : NULL;
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
