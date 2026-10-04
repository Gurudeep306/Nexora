#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int R, C;
    scanf("%d %d", &R, &C);
    long long *M = malloc(sizeof(long long) * R * C);
#define AT(i, j) M[(i) * C + (j)]
    for (int i = 0; i < R * C; i++) scanf("%lld", &M[i]);
    int row0 = 0, col0 = 0;
    for (int j = 0; j < C; j++) if (AT(0, j) == 0) row0 = 1;
    for (int i = 0; i < R; i++) if (AT(i, 0) == 0) col0 = 1;
    for (int i = 1; i < R; i++)
        for (int j = 1; j < C; j++)
            if (AT(i, j) == 0) { AT(i, 0) = 0; AT(0, j) = 0; }      /* flags */
    for (int i = 1; i < R; i++)
        for (int j = 1; j < C; j++)
            if (AT(i, 0) == 0 || AT(0, j) == 0) AT(i, j) = 0;
    if (row0) for (int j = 0; j < C; j++) AT(0, j) = 0;            /* the flag row/column last */
    if (col0) for (int i = 0; i < R; i++) AT(i, 0) = 0;
    for (int i = 0; i < R; i++)
        for (int j = 0; j < C; j++) printf("%lld%c", AT(i, j), j + 1 == C ? '\n' : ' ');
    free(M);
    return 0;
}
