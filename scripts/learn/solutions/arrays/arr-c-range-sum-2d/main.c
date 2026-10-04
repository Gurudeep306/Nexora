#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int R, C, q;
    scanf("%d %d %d", &R, &C, &q);
    long long *P = calloc((size_t)(R + 1) * (C + 1), sizeof(long long));
#define AT(i, j) P[(size_t)(i) * (C + 1) + (j)]
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++) {
            long long v;
            scanf("%lld", &v);
            AT(i + 1, j + 1) = v + AT(i, j + 1) + AT(i + 1, j) - AT(i, j);
        }
    while (q--) {
        int r1, c1, r2, c2;
        scanf("%d %d %d %d", &r1, &c1, &r2, &c2);
        printf("%lld\n", AT(r2 + 1, c2 + 1) - AT(r1, c2 + 1) - AT(r2 + 1, c1) + AT(r1, c1));
    }
    free(P);
    return 0;
}
