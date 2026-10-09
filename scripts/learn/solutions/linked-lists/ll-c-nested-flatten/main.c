#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Items encoded by index: lists[i] is a nested list; lists[0] is the root. */
struct Item { int isList; int v; int listIdx; };

struct List { struct Item *items; int n, cap; };

int main(void) {
    static char buf[1 << 20];
    if (!fgets(buf, sizeof(buf), stdin)) { puts("EMPTY"); return 0; }
    int len = strlen(buf);

    /* ---- parse into nested lists with an explicit parse stack (no recursion) ---- */
    int capLists = len / 2 + 2;
    struct List *lists = malloc(capLists * sizeof(struct List));
    int nLists = 0;
    lists[nLists].items = NULL; lists[nLists].n = 0; lists[nLists].cap = 0;
    nLists++;
    int *pstack = malloc((len + 2) * sizeof(int));
    int ptop = 0;
    pstack[ptop++] = 0;
    for (int i = 0; i < len; i++) {
        char c = buf[i];
        if (c == '[') {
            lists[nLists].items = NULL; lists[nLists].n = 0; lists[nLists].cap = 0;
            int idx = nLists++;
            struct List *par = &lists[pstack[ptop - 1]];
            if (par->n == par->cap) {
                par->cap = par->cap ? par->cap * 2 : 4;
                par->items = realloc(par->items, par->cap * sizeof(struct Item));
            }
            par->items[par->n].isList = 1;
            par->items[par->n].v = 0;
            par->items[par->n].listIdx = idx;
            par->n++;
            pstack[ptop++] = idx;
        } else if (c == ']') {
            ptop--;
        } else if (c == ',' || c == ' ' || c == '\n' || c == '\r' || c == '\t') {
            /* separator */
        } else {
            /* start of an integer, possibly negative */
            int j = i;
            while (j < len && ((buf[j] >= '0' && buf[j] <= '9') || buf[j] == '-')) j++;
            struct List *par = &lists[pstack[ptop - 1]];
            if (par->n == par->cap) {
                par->cap = par->cap ? par->cap * 2 : 4;
                par->items = realloc(par->items, par->cap * sizeof(struct Item));
            }
            par->items[par->n].isList = 0;
            par->items[par->n].v = atoi(buf + i);   /* atoi stops at non-digit */
            par->items[par->n].listIdx = -1;
            par->n++;
            i = j - 1;
        }
    }

    /* ---- flatten: pop an item; integer -> output; list -> push children in REVERSE ---- */
    int (*stk)[2] = malloc((len * 2 + 2) * sizeof(*stk));   /* (listIdx, childPos) */
    int top = 0;
    for (int k = lists[0].n - 1; k >= 0; k--) { stk[top][0] = 0; stk[top][1] = k; top++; }
    char *out = malloc((size_t)len * 8 + 16);
    int olen = 0;
    while (top > 0) {
        top--;
        struct Item it = lists[stk[top][0]].items[stk[top][1]];
        if (it.isList) {
            struct List *kids = &lists[it.listIdx];
            for (int k = kids->n - 1; k >= 0; k--) { stk[top][0] = it.listIdx; stk[top][1] = k; top++; }
        } else {
            if (olen > 0) out[olen++] = ' ';
            olen += sprintf(out + olen, "%d", it.v);
        }
    }
    if (olen == 0) puts("EMPTY");
    else { out[olen] = '\0'; puts(out); }
    return 0;
}
