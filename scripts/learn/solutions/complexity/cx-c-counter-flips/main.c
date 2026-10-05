#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        printf("%lld\n", 2 * n - __builtin_popcountll((unsigned long long)n));  /* 2n - popcount(n) */
    }
    return 0;
}
