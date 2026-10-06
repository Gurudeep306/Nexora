#include <stdio.h>

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        long long a, b, m;
        scanf("%lld %lld %lld", &a, &b, &m);
        a = (a % m + m) % m;
        b = (b % m + m) % m;
        long long r = (long long)((__int128)a * b % m);   /* GCC/Clang 128-bit type */
        printf("%lld\n", r);
    }
    return 0;
}
