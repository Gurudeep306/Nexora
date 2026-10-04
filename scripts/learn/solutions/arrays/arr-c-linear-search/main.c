#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), x;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    scanf("%lld", &x);
    int ans = -1;
    for (int i = 0; i < n; i++)
        if (a[i] == x) { ans = i; break; }   /* first occurrence: stop here */
    printf("%d\n", ans);
    free(a);
    return 0;
}
