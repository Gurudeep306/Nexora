#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int *a = malloc(sizeof(int) * n);
    char *isDup = calloc(n + 1, 1);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int found = 0;
    for (int i = 0; i < n; i++) {
        int v = abs(a[i]);                         /* the original value */
        if (a[v - 1] < 0) { isDup[v] = 1; found = 1; }   /* seen before */
        else a[v - 1] = -a[v - 1];                 /* mark v as seen */
    }
    if (!found) printf("-1\n");
    else {
        int first = 1;
        for (int v = 1; v <= n; v++)               /* ascending order for free */
            if (isDup[v]) { printf(first ? "%d" : " %d", v); first = 0; }
        printf("\n");
    }
    free(a);
    free(isDup);
    return 0;
}
