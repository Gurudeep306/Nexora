#include <stdio.h>

static long long gcd(long long a, long long b) {
    while (b) { long long t = a % b; a = b; b = t; }
    return a;
}

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, a, b;
        scanf("%lld %lld %lld", &n, &a, &b);
        long long l = a / gcd(a, b) * b;               /* lcm, divide first */
        printf("%lld\n", n / a + n / b - n / l);       /* inclusion-exclusion */
    }
    return 0;
}
