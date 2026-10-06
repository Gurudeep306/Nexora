#include <stdio.h>
#define MOD 1000000007LL

int main(void) {
    long long n, total = 0;
    scanf("%lld", &n);
    for (long long d = 1; d <= n;) {
        long long q = n / d, e = n / q;
        long long x = d + e, y = e - d + 1;
        if (x % 2 == 0) x /= 2; else y /= 2;
        long long block = (x % MOD) * (y % MOD) % MOD;
        total = (total + (q % MOD) * block) % MOD;
        d = e + 1;
    }
    printf("%lld\n", total);
    return 0;
}
