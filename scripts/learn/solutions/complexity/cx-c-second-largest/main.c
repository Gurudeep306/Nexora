#include <stdio.h>
#include <limits.h>

int main(void) {
    int n, lg = 0;
    scanf("%d", &n);
    long long first = LLONG_MIN, second = LLONG_MIN, x;
    for (int i = 0; i < n; i++) {
        scanf("%lld", &x);
        if (x > first) { second = first; first = x; }
        else if (x > second) second = x;
    }
    while ((1LL << lg) < n) lg++;                 /* ceil(log2 n) */
    printf("%lld %d\n", second, n + lg - 2);
    return 0;
}
