#include <stdio.h>

int main(void) {
    const long long M = 1000000007LL;
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long s = 0, p = 1, x;
    for (int i = 0; i < n; i++) {
        scanf("%lld", &x);
        long long r = ((x % M) + M) % M;   /* normalise negatives */
        s = (s + r) % M;
        p = p * r % M;
    }
    printf("%lld %lld\n", s, p);
    return 0;
}
