#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    long long *a = malloc(sizeof(long long) * n);
    int *dq = malloc(sizeof(int) * n), head = 0, tail = 0;   /* deque of indices */
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < n; i++) {
        while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;   /* dominated forever */
        dq[tail++] = i;
        if (dq[head] <= i - k) head++;                           /* slid out of the window */
        if (i >= k - 1) printf("%lld%c", a[dq[head]], i + 1 == n ? '\n' : ' ');
    }
    free(a);
    free(dq);
    return 0;
}
