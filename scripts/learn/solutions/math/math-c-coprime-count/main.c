#include <stdio.h>

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n, m;
        scanf("%lld %lld", &n, &m);
        long long ps[12];
        int r = 0;
        for (long long d = 2; d * d <= m; d++)
            if (m % d == 0) {
                ps[r++] = d;
                while (m % d == 0) m /= d;
            }
        if (m > 1) ps[r++] = m;
        long long total = 0;
        for (int mask = 0; mask < (1 << r); mask++) {
            long long d = 1;
            int bits = 0;
            for (int i = 0; i < r; i++)
                if (mask >> i & 1) { d *= ps[i]; bits++; }
            total += (bits % 2 ? -1 : 1) * (n / d);
        }
        printf("%lld\n", total);
    }
    return 0;
}
