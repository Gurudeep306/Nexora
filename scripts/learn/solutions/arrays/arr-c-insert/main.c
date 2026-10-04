#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, p;
    long long x;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * (n + 1));   /* one spare slot */
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    scanf("%d %lld", &p, &x);
    for (int i = n; i > p; i--) a[i] = a[i - 1];          /* shift right, from the end */
    a[p] = x;
    for (int i = 0; i <= n; i++) printf("%lld%c", a[i], i == n ? '\n' : ' ');
    free(a);
    return 0;
}
