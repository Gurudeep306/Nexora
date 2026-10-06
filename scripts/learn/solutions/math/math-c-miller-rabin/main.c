#include <stdio.h>

typedef unsigned long long u64;
typedef unsigned __int128 u128;

static u64 mulmod(u64 a, u64 b, u64 m) { return (u64)((u128)a * b % m); }

static u64 powmod(u64 a, u64 e, u64 m) {
    u64 r = 1;
    a %= m;
    while (e) {
        if (e & 1) r = mulmod(r, a, m);
        a = mulmod(a, a, m);
        e >>= 1;
    }
    return r;
}

static int is_prime(u64 n) {
    static const u64 bases[12] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
    if (n < 2) return 0;
    for (int i = 0; i < 12; i++) if (n % bases[i] == 0) return n == bases[i];
    u64 d = n - 1;
    int r = 0;
    while (d % 2 == 0) { d /= 2; r++; }
    for (int i = 0; i < 12; i++) {
        u64 x = powmod(bases[i], d, n);
        if (x == 1 || x == n - 1) continue;
        int witness = 1;
        for (int j = 1; j < r && witness; j++) {
            x = mulmod(x, x, n);
            if (x == n - 1) witness = 0;
        }
        if (witness) return 0;
    }
    return 1;
}

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        u64 n;
        scanf("%llu", &n);
        puts(is_prime(n) ? "YES" : "NO");
    }
    return 0;
}
