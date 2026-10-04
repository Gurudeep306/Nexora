#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int R, C;
    scanf("%d %d", &R, &C);
    long long *a = malloc(sizeof(long long) * R * C);      /* row-major: a[i*C + j] */
    for (int i = 0; i < R * C; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < C; i++)                            /* output row i = input column i */
        for (int j = 0; j < R; j++) printf("%lld%c", a[j * C + i], j + 1 == R ? '\n' : ' ');
    free(a);
    return 0;
}
