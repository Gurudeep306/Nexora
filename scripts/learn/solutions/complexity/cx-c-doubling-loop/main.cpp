#include <bits/stdc++.h>
using namespace std;

int main() {
    int T;
    scanf("%d", &T);
    while (T--) {
        unsigned long long n;
        scanf("%llu", &n);
        int L = 64 - __builtin_clzll(n);              // bit length of n (n >= 1)
        printf("%llu\n", (1ULL << L) - 1);            // 1 + 2 + ... + 2^(L-1)
    }
}
