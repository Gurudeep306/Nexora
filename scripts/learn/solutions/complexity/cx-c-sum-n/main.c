#include <stdio.h>

int main(void) {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, x, y;
        scanf("%lld", &n);
        x = n;
        y = n + 1;
        if (x % 2 == 0) x /= 2; else y /= 2;          /* halve the even factor exactly */
        printf("%lld\n", (x % MOD) * (y % MOD) % MOD);
    }
    return 0;
}
