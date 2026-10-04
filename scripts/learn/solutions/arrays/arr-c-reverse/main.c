#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    for (int i = 0, j = n - 1; i < j; i++, j--) {
        long long t = a[i]; a[i] = a[j]; a[j] = t;
    }
    for (int i = 0; i < n; i++) printf("%lld%c", a[i], i + 1 == n ? '\n' : ' ');
    free(a);
    return 0;
}
