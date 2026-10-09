#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

/* read n fresh nodes; returns head, stores tail in *out_tail */
static struct Node *read_chain(int n, struct Node **out_tail) {
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
    *out_tail = tail;
    return head;
}

int main(void) {
    int na, nb, nc;
    scanf("%d %d %d", &na, &nb, &nc);

    struct Node *ta, *tb, *tc;
    struct Node *ha = read_chain(na, &ta);   /* A's own part */
    struct Node *hb = read_chain(nb, &tb);   /* B's own part */
    struct Node *hc = read_chain(nc, &tc);   /* shared tail: SAME nodes for both lists */
    if (ta) ta->next = hc;                   /* A = own + shared */
    if (tb) tb->next = hc;                   /* B = own + shared */
    struct Node *A = ha ? ha : hc;           /* A's full head (na = 0 -> shared head IS A) */
    struct Node *B = hb ? hb : hc;

    /* switch-partners walk: both routes reach the join after na + nb steps */
    struct Node *p = A, *q = B;
    while (p != q) {
        p = p ? p->next : B;
        q = q ? q->next : A;
    }

    int ans = -1;
    if (p) {                                 /* met on a real node: index along A */
        ans = 0;
        for (struct Node *t = A; t != p; t = t->next) ans++;
    }
    printf("%d\n", ans);
    return 0;
}
