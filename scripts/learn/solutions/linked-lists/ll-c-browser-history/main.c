#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Cursor inside a DOUBLY linked list: back/forward are prev/next hops,
   and visit-unlinks-forward is O(1) with prev+next in hand. */
struct Node { char url[64]; struct Node *prev, *next; };

int main(void) {
    struct Node *cur = malloc(sizeof(struct Node));
    cur->prev = cur->next = NULL;
    scanf("%63s", cur->url);

    int q;
    scanf("%d", &q);
    static char outbuf[1 << 20];
    int p = 0;
    char op[16];
    for (int t = 0; t < q; t++) {
        scanf("%15s", op);
        if (op[0] == 'v') {                   /* visit url */
            struct Node *nd = malloc(sizeof(struct Node));
            nd->next = NULL;
            scanf("%63s", nd->url);
            nd->prev = cur;
            cur->next = nd;                   /* forward history simply dropped */
            cur = nd;                         /* (unreachable, no unlink needed) */
        } else if (op[0] == 'b') {            /* back k */
            int k;
            scanf("%d", &k);
            while (k-- && cur->prev) cur = cur->prev;
            p += sprintf(outbuf + p, "%s\n", cur->url);
        } else {                              /* forward k */
            int k;
            scanf("%d", &k);
            while (k-- && cur->next) cur = cur->next;
            p += sprintf(outbuf + p, "%s\n", cur->url);
        }
    }
    fwrite(outbuf, 1, p, stdout);
    return 0;
}
