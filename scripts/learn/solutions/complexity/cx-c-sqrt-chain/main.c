#include <stdio.h>
#include <math.h>

static long long isqrt_ll(long long n) {
    long long r = (long long)sqrt((double)n);         /* guess, may be off by one */
    while (r * r > n) r--;
    while ((r + 1) * (r + 1) <= n) r++;               /* now r^2 <= n < (r+1)^2 */
    return r;
}

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        int c = 0;
        scanf("%lld", &n);
        while (n >= 2) { n = isqrt_ll(n); c++; }
        printf("%d\n", c);
    }
    return 0;
}
