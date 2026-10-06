#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long u64;
typedef __uint128_t u128;

u64 mulmod(u64 a, u64 b, u64 m) { return (u128)a * b % m; }

u64 powmod(u64 a, u64 e, u64 m) {
    u64 r = 1;
    a %= m;
    while (e) {
        if (e & 1) r = mulmod(r, a, m);
        a = mulmod(a, a, m);
        e >>= 1;
    }
    return r;
}

bool isPrime(u64 n) {
    static const u64 bases[] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
    if (n < 2) return false;
    for (u64 p : bases) if (n % p == 0) return n == p;
    u64 d = n - 1;
    int r = 0;
    while (d % 2 == 0) { d /= 2; r++; }               // n - 1 = d * 2^r
    for (u64 a : bases) {
        u64 x = powmod(a, d, n);
        if (x == 1 || x == n - 1) continue;
        bool witness = true;
        for (int i = 1; i < r && witness; i++) {
            x = mulmod(x, x, n);
            if (x == n - 1) witness = false;
        }
        if (witness) return false;                    // a proves n composite
    }
    return true;
}

int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
        unsigned long long n;
        scanf("%llu", &n);
        puts(isPrime(n) ? "YES" : "NO");
    }
}
