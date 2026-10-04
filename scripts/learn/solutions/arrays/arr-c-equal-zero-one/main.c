#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, x;
    scanf("%d", &n);
    int *first = malloc(sizeof(int) * (2 * n + 1));   /* prefix value v stored at v + n */
    for (int i = 0; i <= 2 * n; i++) first[i] = -1;
    first[n] = 0;
    int p = 0, best = 0;
    for (int j = 1; j <= n; j++) {
        scanf("%d", &x);
        p += (x == 1 ? 1 : -1);                        /* count a 0 as -1 */
        if (first[p + n] >= 0) { if (j - first[p + n] > best) best = j - first[p + n]; }
        else first[p + n] = j;
    }
    printf("%d\n", best);
    free(first);
    return 0;
}
