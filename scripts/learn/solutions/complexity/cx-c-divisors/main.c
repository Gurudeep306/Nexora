#include <stdio.h>

int main(void) {
    long long n, cnt = 0;
    scanf("%lld", &n);
    for (long long i = 1; i * i <= n; i++)
        if (n % i == 0) cnt += (i * i == n) ? 1 : 2;   /* the pair (i, n/i) */
    printf("%lld\n", cnt);
    return 0;
}
