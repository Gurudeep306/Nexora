#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

/* Floyd: returns 1 if head's list cycles, sets *ent to the entrance. */
static int floyd(struct Node *head, struct Node **ent) {
    *ent = NULL;
    if (!head) return 0;
    struct Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {                 /* meeting point */
            struct Node *p = head;
            while (p != slow) { p = p->next; slow = slow->next; }
            *ent = p;                       /* entrance */
            return 1;
        }
    }
    return 0;
}

static int dist_to(struct Node *head, struct Node *target) { /* no looping */
    int d = 0;
    for (struct Node *p = head; p != target; p = p->next) d++;
    return d;
}

static struct Node **read_chain(int n, struct Node **head) {
    struct Node **arr = n > 0 ? malloc(n * sizeof(struct Node *)) : NULL;
    struct Node *tail = NULL;
    *head = NULL;
    for (int i = 0; i < n; i++) {
        int v;
        scanf("%d", &v);
        struct Node *nd = malloc(sizeof(struct Node));
        nd->v = v;
        nd->next = NULL;
        arr[i] = nd;
        if (!*head) *head = nd; else tail->next = nd;
        tail = nd;
    }
    return arr;
}

int main(void) {
    int na, nb, nc, pos;
    scanf("%d %d %d %d", &na, &nb, &nc, &pos);
    struct Node *headA, *headB, *sharedHead;
    struct Node **ownA = read_chain(na, &headA);
    struct Node **ownB = read_chain(nb, &headB);
    struct Node **shared = read_chain(nc, &sharedHead); /* built ONCE — both lists point in */
    /* head of each list: its own part, or the shared part when it has no own nodes */
    if (na == 0) headA = sharedHead;
    if (nb == 0) headB = sharedHead;
    /* join: each list = own part followed by the shared part */
    if (na > 0 && nc > 0) ownA[na - 1]->next = sharedHead;
    if (nb > 0 && nc > 0) ownB[nb - 1]->next = sharedHead;
    if (nc > 0 && pos >= 0) shared[nc - 1]->next = shared[pos];   /* cycle */

    struct Node *entA = NULL, *entB = NULL;
    int cycA = floyd(headA, &entA);
    int cycB = floyd(headB, &entB);

    int answer = -1;
    if (cycA != cycB) {
        answer = -1;                        /* exactly one cyclic: cannot intersect */
    } else if (!cycA) {
        /* both acyclic: length-align, walk in lockstep, compare POINTERS */
        int lenA = dist_to(headA, NULL), lenB = dist_to(headB, NULL);
        struct Node *a = headA, *b = headB;
        int idx = 0;
        for (int d = lenA - lenB; d > 0; d--) { a = a->next; idx++; }
        for (int d = lenB - lenA; d > 0; d--) b = b->next;
        while (a != b) { a = a->next; b = b->next; idx++; }
        if (a) answer = idx;                /* both null -> -1 */
    } else if (entA == entB) {
        /* same entrance: the Y happens BEFORE the cycle — aligned walk bounded by it */
        int dA = dist_to(headA, entA), dB = dist_to(headB, entB);
        struct Node *a = headA, *b = headB;
        int idx = 0;
        for (int d = dA - dB; d > 0; d--) { a = a->next; idx++; }
        for (int d = dB - dA; d > 0; d--) b = b->next;
        while (a != b && a != entA) { a = a->next; b = b->next; idx++; }
        answer = (a == b) ? idx : dA;
    } else {
        /* different entrances: intersect iff B's entrance lies on A's cycle */
        struct Node *q = entA;
        int found = 0;
        do {
            if (q == entB) { found = 1; break; }
            q = q->next;
        } while (q != entA);
        if (found) answer = dist_to(headA, entA);   /* first shared node IS A's entrance */
    }
    printf("%d\n", answer);
    return 0;
}
