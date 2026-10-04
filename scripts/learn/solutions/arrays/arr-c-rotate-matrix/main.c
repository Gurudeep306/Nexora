#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int N;
    scanf("%d", &N);
    long long *a = malloc(sizeof(long long) * N * N);
#define A(i, j) a[(i) * N + (j)]
    for (int i = 0; i < N * N; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < N; i++)                                    /* transpose */
        for (int j = i + 1; j < N; j++) { long long t = A(i, j); A(i, j) = A(j, i); A(j, i) = t; }
    for (int i = 0; i < N; i++)                                    /* mirror each row */
        for (int l = 0, r = N - 1; l < r; l++, r--) { long long t = A(i, l); A(i, l) = A(i, r); A(i, r) = t; }
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) printf("%lld%c", A(i, j), j + 1 == N ? '\n' : ' ');
    free(a);
    return 0;
}
