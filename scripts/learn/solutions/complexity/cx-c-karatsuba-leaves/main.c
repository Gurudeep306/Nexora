#include <stdio.h>

int main(void) {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        int k = 0;
        for (unsigned long long m = (unsigned long long)(n - 1); m; m >>= 1) k++;  /* bit length of n-1 */
        long long r = 1, b = 3;
        for (; k; k >>= 1, b = b * b % MOD) if (k & 1) r = r * b % MOD;         /* 3^k mod p */
        printf("%lld\n", r);
    }
    return 0;
}
