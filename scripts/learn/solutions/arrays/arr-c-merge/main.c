#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, m;
    scanf("%d %d", &n, &m);
    long long *A = malloc(sizeof(long long) * n), *B = malloc(sizeof(long long) * m);
    for (int k = 0; k < n; k++) scanf("%lld", &A[k]);
    for (int k = 0; k < m; k++) scanf("%lld", &B[k]);
    int i = 0, j = 0, printed = 0, total = n + m;
    while (i < n || j < m) {
        long long v = (j >= m || (i < n && A[i] <= B[j])) ? A[i++] : B[j++];   /* ties: A first */
        printf("%lld%c", v, ++printed == total ? '\n' : ' ');
    }
    free(A);
    free(B);
    return 0;
}
