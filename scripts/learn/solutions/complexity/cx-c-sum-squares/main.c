#include <stdio.h>

int main(void) {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, r = 1;
        scanf("%lld", &n);
        long long f[3];
        f[0] = n; f[1] = n + 1; f[2] = 2 * n + 1;
        if (f[0] % 2 == 0) f[0] /= 2; else f[1] /= 2;   /* exact division by 2 */
        for (int i = 0; i < 3; i++)
            if (f[i] % 3 == 0) { f[i] /= 3; break; }     /* exact division by 3 */
        for (int i = 0; i < 3; i++) r = r * (f[i] % MOD) % MOD;
        printf("%lld\n", r);
    }
    return 0;
}
