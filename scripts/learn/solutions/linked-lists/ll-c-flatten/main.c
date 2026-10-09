#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int *v = malloc(n * sizeof(int));
    int *nxt = malloc(n * sizeof(int));
    int *chd = malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d %d %d", &v[i], &nxt[i], &chd[i]);

    /* iterative DFS: the stack holds RETURN POINTS — what recursion holds on frames */
    int *stk = malloc((n + 1) * sizeof(int));
    int top = 0;
    int cur = 0; /* head is node 0 */
    int first = 1;
    while (cur != -1 || top > 0) {
        if (cur == -1) { cur = stk[--top]; continue; }
        if (!first) putchar(' ');
        first = 0;
        printf("%d", v[cur]);            /* preorder: settle THIS node first */
        if (chd[cur] != -1) {
            stk[top++] = nxt[cur];       /* resume here AFTER the child subtree */
            nxt[cur] = chd[cur];         /* splice the child in (explicit relink) */
            chd[cur] = -1;               /* detach: flattening destroys the hierarchy */
        }
        cur = nxt[cur];                  /* dive into child, or advance along the level */
    }
    putchar('\n');
    return 0;
}
