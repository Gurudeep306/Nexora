#include <stdio.h>
#include <stdlib.h>

struct Node { int v; struct Node *next; };

/* tiny open-addressing hash set of ints (power-of-two table, linear probing) */
#define TSIZE (1u << 16)          /* > 2 * max distinct values (n <= 10^4) */
#define TMASK (TSIZE - 1)
static int tbl_keys[TSIZE];
static unsigned char tbl_used[TSIZE];

static unsigned hash_u(unsigned x) {
    x ^= x >> 16; x *= 0x7feb352du;
    x ^= x >> 15; x *= 0x846ca68bu;
    x ^= x >> 16;
    return x;
}

/* returns 1 if v was already present, else inserts and returns 0 */
static int seen_test_and_insert(int v) {
    unsigned i = hash_u((unsigned)v) & TMASK;
    while (tbl_used[i]) {
        if (tbl_keys[i] == v) return 1;
        i = (i + 1) & TMASK;
    }
    tbl_used[i] = 1;
    tbl_keys[i] = v;
    return 0;
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

    /* seen-set + dummy-headed prev-walk: unlink repeats, keep first occurrences */
    struct Node dummy = {0, NULL};
    dummy.next = head;
    struct Node *prev = &dummy;
    while (prev->next) {
        struct Node *cur = prev->next;
        if (seen_test_and_insert(cur->v)) {
            prev->next = cur->next;   /* unlink; prev stays */
        } else {
            prev = cur;               /* keep: cur becomes the new anchor */
        }
    }

    if (!dummy.next) { puts("EMPTY"); return 0; }
    int first = 1;
    for (struct Node *t = dummy.next; t; t = t->next) {
        if (!first) putchar(' ');
        first = 0;
        printf("%d", t->v);
    }
    putchar('\n');
    return 0;
}
