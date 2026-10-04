#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int R, C, q;
    scanf("%d %d", &R, &C);
    long long *M = malloc(sizeof(long long) * R * C), x;
    for (int i = 0; i < R * C; i++) scanf("%lld", &M[i]);
    scanf("%d", &q);
    while (q--) {
        scanf("%lld", &x);
        int i = 0, j = C - 1, found = 0;           /* top-right corner */
        while (i < R && j >= 0) {
            long long v = M[i * C + j];
            if (v == x) { found = 1; break; }
            if (v > x) j--;                        /* the whole column is too big */
            else i++;                              /* the whole row is too small */
        }
        puts(found ? "YES" : "NO");
    }
    free(M);
    return 0;
}
