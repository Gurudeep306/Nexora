#include <bits/stdc++.h>
using namespace std;

int main() {
    const long long MOD = 1000000007LL;
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        int k = n == 1 ? 0 : 64 - __builtin_clzll((unsigned long long)(n - 1));  // bit length of n-1
        long long r = 1, b = 3;
        for (; k; k >>= 1, b = b * b % MOD) if (k & 1) r = r * b % MOD;       // 3^k mod p
        printf("%lld\n", r);
    }
}
