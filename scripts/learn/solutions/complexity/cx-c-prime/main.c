#include <stdio.h>

static int is_prime(long long n) {
    if (n < 2) return 0;
    if (n < 4) return 1;                          /* 2 and 3 */
    if (n % 2 == 0 || n % 3 == 0) return 0;
    for (long long i = 5; i * i <= n; i += 6)     /* candidates 6k - 1 and 6k + 1 */
        if (n % i == 0 || n % (i + 2) == 0) return 0;
    return 1;
}

int main(void) {
    int T;
    scanf("%d", &T);
    while (T--) {
        long long n;
        scanf("%lld", &n);
        puts(is_prime(n) ? "YES" : "NO");
    }
    return 0;
}
