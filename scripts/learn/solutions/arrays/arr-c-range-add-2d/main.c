#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int R, C, m;
    scanf("%d %d %d", &R, &C, &m);
    long long *M = malloc(sizeof(long long) * R * C);
    long long *D = calloc((size_t)(R + 1) * (C + 1), sizeof(long long));
#define DD(i, j) D[(size_t)(i) * (C + 1) + (j)]
    for (int i = 0; i < R * C; i++) scanf("%lld", &M[i]);
    while (m--) {
        int r1, c1, r2, c2;
        long long v;
        scanf("%d %d %d %d %lld", &r1, &c1, &r2, &c2, &v);
        DD(r1, c1) += v;                            /* four corner marks */
        DD(r1, c2 + 1) -= v;
        DD(r2 + 1, c1) -= v;
        DD(r2 + 1, c2 + 1) += v;
    }
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++) {
            if (i) DD(i, j) += DD(i - 1, j);        /* 2D prefix sum of the marks */
            if (j) DD(i, j) += DD(i, j - 1);
            if (i && j) DD(i, j) -= DD(i - 1, j - 1);
            printf("%lld%c", M[i * C + j] + DD(i, j), j + 1 == C ? '\n' : ' ');
        }
    free(M);
    free(D);
    return 0;
}
