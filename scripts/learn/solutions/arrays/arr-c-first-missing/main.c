#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    for (int i = 0; i < n; i++)
        while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] != a[i]) {
            long long h = a[i] - 1, t = a[h];       /* send a[i] to its home index */
            a[h] = a[i];
            a[i] = t;
        }
    int ans = n + 1;
    for (int i = 0; i < n; i++)
        if (a[i] != i + 1) { ans = i + 1; break; }
    printf("%d\n", ans);
    free(a);
    return 0;
}
