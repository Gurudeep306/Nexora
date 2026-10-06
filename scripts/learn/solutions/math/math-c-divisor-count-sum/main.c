#include <stdio.h>

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long cnt = 1, sig = 1;
    for (long long d = 2; d * d <= n; d += (d == 2 ? 1 : 2)) {
        if (n % d) continue;
        int e = 0;
        long long term = 1, pw = 1;
        while (n % d == 0) { n /= d; e++; pw *= d; term += pw; }
        cnt *= e + 1;
        sig *= term;
    }
    if (n > 1) { cnt *= 2; sig *= n + 1; }
    printf("%lld %lld\n", cnt, sig);
    return 0;
}
