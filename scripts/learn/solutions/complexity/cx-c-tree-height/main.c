#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int *head = malloc(sizeof(int) * (n + 1)), *nxt = malloc(sizeof(int) * (n + 1));
    int *depth = calloc(n + 1, sizeof(int)), *stack = malloc(sizeof(int) * n);
    for (int i = 0; i <= n; i++) head[i] = -1;
    for (int i = 2; i <= n; i++) {
        int p;
        scanf("%d", &p);
        nxt[i] = head[p];                            /* prepend i to p's child list */
        head[p] = i;
    }
    int top = 0, best = 0;
    stack[top++] = 1;                                /* explicit stack: no recursion */
    while (top > 0) {
        int u = stack[--top];
        if (depth[u] > best) best = depth[u];
        for (int w = head[u]; w != -1; w = nxt[w]) {
            depth[w] = depth[u] + 1;
            stack[top++] = w;
        }
    }
    printf("%d\n", best);
    free(head); free(nxt); free(depth); free(stack);
    return 0;
}
