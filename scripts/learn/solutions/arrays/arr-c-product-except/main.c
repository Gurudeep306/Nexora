#include <stdio.h>
#include <stdlib.h>

int main(void) {
    const long long MOD = 1000000007LL;
    int n;
    scanf("%d", &n);
    long long *a = malloc(sizeof(long long) * n), *out = malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) { scanf("%lld", &a[i]); a[i] %= MOD; }
    long long pre = 1, suf = 1;
    for (int i = 0; i < n; i++) { out[i] = pre; pre = pre * a[i] % MOD; }   /* product left of i */
    for (int i = n - 1; i >= 0; i--) {                                      /* times product right of i */
        out[i] = out[i] * suf % MOD;
        suf = suf * a[i] % MOD;
    }
    for (int i = 0; i < n; i++) printf("%lld%c", out[i], i + 1 == n ? '\n' : ' ');
    free(a);
    free(out);
    return 0;
}
