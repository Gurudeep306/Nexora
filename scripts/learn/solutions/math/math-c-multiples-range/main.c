#include <stdio.h>

/* floor(a / b) for b > 0 (C '/' truncates toward zero) */
static long long floor_div(long long a, long long b) {
    long long q = a / b;
    if (a % b != 0 && a < 0) q--;
    return q;
}

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long L, R, k;
        scanf("%lld %lld %lld", &L, &R, &k);
        printf("%lld\n", floor_div(R, k) - floor_div(L - 1, k));
    }
    return 0;
}
