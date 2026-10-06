#include <stdio.h>
#define M 1000000007LL

int main(void) {
    int q;
    if (scanf("%d", &q) != 1) return 0;
    while (q--) {
        unsigned long long n;
        scanf("%llu", &n);
        long long a = 0, b = 1;
        for (int bit = 63; bit >= 0; bit--) {
            long long c = a * ((2 * b - a + M) % M) % M;
            long long d = (a * a + b * b) % M;
            if ((n >> bit) & 1ULL) { a = d; b = (c + d) % M; }
            else { a = c; b = d; }
        }
        printf("%lld\n", a);
    }
    return 0;
}
