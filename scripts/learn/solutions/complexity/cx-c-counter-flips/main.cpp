#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        // sum over k of floor(n / 2^k) = 2n - popcount(n)
        printf("%lld\n", 2 * n - __builtin_popcountll(n));
    }
}
