#include <stdio.h>

static int is_prime(long long n) {
    if (n < 2) return 0;
    if (n % 2 == 0) return n == 2;
    for (long long d = 3; d * d <= n; d += 2)
        if (n % d == 0) return 0;
    return 1;
}

int main(void) {
    int t;
    scanf("%d", &t);
    while (t--) {
        long long n;
        scanf("%lld", &n);
        puts(is_prime(n) ? "YES" : "NO");
    }
    return 0;
}
