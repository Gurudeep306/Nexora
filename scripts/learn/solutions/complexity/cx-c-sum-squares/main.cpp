#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        long long f[3] = {n, n + 1, 2 * n + 1};       // 2n+1 <= 2e18+1 fits in 64 bits
        if (f[0] % 2 == 0) f[0] /= 2; else f[1] /= 2;  // exact division by 2
        for (int i = 0; i < 3; i++)
            if (f[i] % 3 == 0) { f[i] /= 3; break; }   // exact division by 3
        long long r = 1;
        for (int i = 0; i < 3; i++) r = r * (f[i] % MOD) % MOD;
        printf("%lld\n", r);
    }
}
