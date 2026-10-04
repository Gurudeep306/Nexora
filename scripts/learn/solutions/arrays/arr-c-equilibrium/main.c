#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), total = 0, left = 0;
    for (int i = 0; i < n; i++) { scanf("%lld", &a[i]); total += a[i]; }
    int ans = -1;
    for (int i = 0; i < n; i++) {             /* left = sum of a[0..i-1] */
        if (left == total - left - a[i]) { ans = i; break; }
        left += a[i];
    }
    printf("%d\n", ans);
    free(a);
    return 0;
}
