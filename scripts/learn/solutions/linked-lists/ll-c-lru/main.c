#include <stdio.h>
#include <stdlib.h>

/* Hashmap key->node plus a DOUBLY linked list ordered by recency:
   head side = most recent, tail side = least recent. Both ops O(1).
   Keys are 0..100, so a direct-address table IS the hashmap. */
struct Node { int k, v; struct Node *prev, *next; };

static struct Node head = {0, 0, NULL, NULL};   /* sentinels: no null checks */
static struct Node tail = {0, 0, NULL, NULL};
static struct Node *mp[128];                    /* key -> node, or NULL */

static void unlinkNode(struct Node *nd) {
    nd->prev->next = nd->next;
    nd->next->prev = nd->prev;
}

static void pushFront(struct Node *nd) {        /* mark most recently used */
    nd->next = head.next;
    nd->prev = &head;
    head.next->prev = nd;
    head.next = nd;
}

int main(void) {
    int C, q;
    head.next = &tail;
    tail.prev = &head;
    scanf("%d %d", &C, &q);
    static char outbuf[1 << 20];
    int p = 0;
    int size = 0;
    char op[8];
    for (int t = 0; t < q; t++) {
        scanf("%7s", op);
        if (op[0] == 'g') {                     /* get k */
            int k;
            scanf("%d", &k);
            struct Node *nd = mp[k];
            if (!nd) {
                outbuf[p++] = '-'; outbuf[p++] = '1'; outbuf[p++] = '\n';
            } else {
                unlinkNode(nd);                 /* two writes — doubly or bust */
                pushFront(nd);
                p += sprintf(outbuf + p, "%d\n", nd->v);
            }
        } else {                                /* put k v */
            int k, v;
            scanf("%d %d", &k, &v);
            struct Node *nd = mp[k];
            if (nd) {                           /* update existing, mark recent */
                nd->v = v;
                unlinkNode(nd);
                pushFront(nd);
            } else {
                nd = malloc(sizeof(struct Node));
                nd->k = k; nd->v = v;
                mp[k] = nd;
                pushFront(nd);
                size++;
                if (size > C) {                 /* evict LEAST recently used */
                    struct Node *lru = tail.prev;
                    unlinkNode(lru);
                    mp[lru->k] = NULL;
                    free(lru);
                    size--;
                }
            }
        }
    }
    fwrite(outbuf, 1, p, stdout);
    return 0;
}
