#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Dummy head so add/delete never special-case the head, tail pointer so
   addAtTail is two writes, size counter so bad indexes die in O(1). */
struct Node { int v; struct Node *next; };

static struct Node dummy = {0, NULL};
static struct Node *tail = &dummy; /* tail == &dummy means the list is empty */
static int size = 0;

static int readInt(void) {
    int c = getchar(), s = 1, x = 0;
    while (c != '-' && (c < '0' || c > '9')) c = getchar();
    if (c == '-') { s = -1; c = getchar(); }
    while (c >= '0' && c <= '9') { x = x * 10 + (c - '0'); c = getchar(); }
    return s * x;
}

static void readWord(char *w) {
    int c = getchar();
    while (c <= 32 && c != EOF) c = getchar();
    while (c > 32 && c != EOF) *w++ = (char)c, c = getchar();
    *w = '\0';
}

static struct Node *nodeBefore(int i) { /* node whose next is position i */
    struct Node *cur = &dummy;
    int s;
    for (s = 0; s < i; s++) cur = cur->next;
    return cur;
}

int main(void) {
    int q = readInt();
    char op[24];
    static char outbuf[64 << 20];
    int p = 0;
    for (int t = 0; t < q; t++) {
        readWord(op);
        if (op[0] == 'g') {                 /* get i */
            int i = readInt();
            int r = -1;
            if (i >= 0 && i < size) {
                struct Node *cur = &dummy;
                int s;
                for (s = 0; s <= i; s++) cur = cur->next;
                r = cur->v;
            }
            p += sprintf(outbuf + p, "%d\n", r);
        } else if (op[5] == 'H') {          /* addAtHead v */
            int v = readInt();
            struct Node *nd = malloc(sizeof(struct Node));
            nd->v = v; nd->next = dummy.next;
            dummy.next = nd;
            if (size == 0) tail = nd;
            size++;
        } else if (op[5] == 'T') {          /* addAtTail v */
            int v = readInt();
            struct Node *nd = malloc(sizeof(struct Node));
            nd->v = v; nd->next = NULL;
            tail->next = nd;
            tail = nd;
            size++;
        } else if (op[0] == 'a') {          /* addAtIndex i v */
            int i = readInt(), v = readInt();
            if (i <= 0) {                   /* front (also covers negatives) */
                struct Node *nd = malloc(sizeof(struct Node));
                nd->v = v; nd->next = dummy.next;
                dummy.next = nd;
                if (size == 0) tail = nd;
                size++;
            } else if (i == size) {         /* append */
                struct Node *nd = malloc(sizeof(struct Node));
                nd->v = v; nd->next = NULL;
                tail->next = nd;
                tail = nd;
                size++;
            } else if (i < size) {          /* interior splice after node i-1 */
                struct Node *prev = nodeBefore(i);
                struct Node *nd = malloc(sizeof(struct Node));
                nd->v = v; nd->next = prev->next;
                prev->next = nd;
                size++;
            }                               /* i > size: ignored */
        } else {                            /* deleteAtIndex i */
            int i = readInt();
            struct Node *prev, *victim;
            if (i < 0 || i >= size) continue;
            prev = nodeBefore(i);
            victim = prev->next;
            prev->next = victim->next;
            if (victim == tail) tail = prev;
            free(victim);
            size--;
        }
    }
    fwrite(outbuf, 1, p, stdout);
    return 0;
}
