#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int T, N = 2;
    if (scanf("%d", &T) != 1) return 0;
    int *q = malloc(sizeof(int) * T);
    for (int i = 0; i < T; i++) { scanf("%d", &q[i]); if (q[i] > N) N = q[i]; }
    char *composite = calloc(N + 1, 1);
    int *pi = malloc(sizeof(int) * (N + 1));
    composite[0] = composite[1] = 1;
    for (long long i = 2; i * i <= N; i++)
        if (!composite[i])
            for (long long j = i * i; j <= N; j += i) composite[j] = 1;   /* O(N log log N) */
    pi[0] = 0;
    for (int x = 1; x <= N; x++) pi[x] = pi[x - 1] + !composite[x];   /* prefix counts */
    for (int i = 0; i < T; i++) printf("%d\n", pi[q[i]]);
    free(q); free(composite); free(pi);
    return 0;
}
