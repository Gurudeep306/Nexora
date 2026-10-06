#include <stdio.h>
#include <math.h>
#define M 1000000007LL

static long long tri(long long x) {
    long long a = x, b = x + 1;
    if (a % 2 == 0) a /= 2; else b /= 2;
    return (a % M) * (b % M) % M;
}

int main(void) {
    long long n;
    if (scanf("%lld", &n) != 1) return 0;
    long long r = (long long)sqrt((double)n);
    while (r * r > n) r--;
    while ((r + 1) * (r + 1) <= n) r++;
    long long s = 0;
    for (long long i = 1; i <= r; i++) {
        long long q = n / i;
        s = (s + i % M * (q % M) + tri(q)) % M;
    }
    s = ((s - r % M * tri(r)) % M + M) % M;
    printf("%lld\n", s);
    return 0;
}
