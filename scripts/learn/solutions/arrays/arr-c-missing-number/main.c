#include <stdio.h>

int main(void) {
    long long n, sum = 0, x;
    scanf("%lld", &n);
    for (long long i = 0; i < n; i++) { scanf("%lld", &x); sum += x; }
    printf("%lld\n", n * (n + 1) / 2 - sum);       /* expected total minus actual total */
    return 0;
}
