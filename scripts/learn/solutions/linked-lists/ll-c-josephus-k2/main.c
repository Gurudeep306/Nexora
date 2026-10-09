#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        /* closed form for k=2: n = 2^m + l (0 <= l < 2^m) -> survivor 2l+1 */
        long long p = 1;
        while (p <= n / 2) p *= 2;    /* largest power of two <= n (no overflow) */
        long long l = n - p;
        printf("%lld\n", 2 * l + 1);
    }
    return 0;
}
